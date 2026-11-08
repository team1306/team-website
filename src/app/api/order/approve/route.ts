import { approvalErrorStatus } from "@/lib/approvalErrors";
import { isAmazonVendor } from "@/lib/orderPolicy";
import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";
import { currency, getCost, buildSlackBlocks, updateSlackMessage } from "@/lib/slack";

export interface Approver {
    approved: boolean;
    approver: string;
    requiredRole: string;
}

export interface PurchaseApprove {
    itemID: string;
    approvalRole: string;
}

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
}

const FINAL_APPROVAL_RECIPIENT = "<@U07CRE78LKC>";

function escapeSlack(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatRole(role: string): string {
    return role.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function withArticle(phrase: string): string {
    return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

function getNextPurchaseDate(): string {
    const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })
    );
    const dayOfWeek = today.getDay();

    const daysUntilMonday = ((1 - dayOfWeek + 7) % 7) || 0;
    const daysUntilThursday = ((4 - dayOfWeek + 7) % 7) || 0;

    const soonest = Math.min(daysUntilMonday, daysUntilThursday);

    const result = new Date(today);
    result.setDate(today.getDate() + soonest);

    const mm = String(result.getMonth() + 1).padStart(2, "0");
    const dd = String(result.getDate()).padStart(2, "0");
    const yy = String(result.getFullYear()).slice(-2);

    return `${mm}/${dd}/${yy}`;
}

async function postSlackThreadReply(text: string, threadTs: string | null): Promise<void> {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!token || !channel) {
        console.error("Slack not configured: missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
        return;
    }

    if (!threadTs) {
        console.error("No slack-thread-id on this purchase, skipping Slack message");
        return;
    }

    try {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                channel,
                text,
                thread_ts: threadTs,
                unfurl_links: false,
            }),
        });

        const data = await res.json();
        if (!data.ok) {
            console.error("Slack API error:", data.error, data.response_metadata?.messages);
        }
    } catch (err) {
        console.error("Failed to post Slack reply:", err);
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let body: PurchaseApprove;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { itemID, approvalRole } = body ?? {};
    if (!itemID || typeof approvalRole !== "string" || !approvalRole.trim()) {
        return NextResponse.json({ error: "Missing itemID or approvalRole" }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const approverUserId = authData?.user?.id;

    if (authError || !approverUserId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: updated, error: updateError } = await supabase.rpc("change_purchase_approval", {
        p_item_id: String(itemID),
        p_approval_role: approvalRole,
        p_approved: true,
    });

    if (updateError) {
        const status = approvalErrorStatus(updateError.code);
        return NextResponse.json({ error: updateError.message }, { status });
    }

    const purchase = updated;
    const newStatus = purchase.status;
    const allApproved = newStatus === "approved";

    after(async () => {
        try {
            const threadTs: string | null = purchase["slack-thread-id"] ?? null;

            const { data: userRow, error: userError } = await supabase
                .from("users")
                .select("name, slack_userid")
                .eq("user_id", approverUserId)
                .maybeSingle();

            if (userError) {
                console.error("Failed to look up approver:", userError.message);
            }

            const slackUserId = userRow?.slack_userid?.trim() || null;
            const approverMention = slackUserId
                ? `<@${slackUserId}>`
                : escapeSlack(userRow?.name ?? "Someone");

            const orderName = escapeSlack(purchase.requestName ?? "this order");
            const roleText = withArticle(formatRole(approvalRole));

            await postSlackThreadReply(
                `${approverMention} has approved ${orderName} as ${roleText}.`,
                threadTs
            );

            if (allApproved) {
                const isExpidited = purchase.expidited === "approved";

                const finalMessage = isAmazonVendor(String(purchase.vendor ?? ""))
                    ? `This order has been approved and can be ordered now, ${FINAL_APPROVAL_RECIPIENT}`
                    : isExpidited
                    ? `This order has been expedited and can be ordered now ${FINAL_APPROVAL_RECIPIENT}`
                    : `This order has been approved, It can be ordered on ${getNextPurchaseDate()}`;

                await postSlackThreadReply(finalMessage, threadTs);
            }

            if (threadTs) {
                const items = (purchase.items ?? []) as ItemData[];
                const title = String(purchase.requestName ?? "Purchase Request");
                const vendor = String(purchase.vendor ?? "");
                const category = String(purchase.catagory ?? "");
                const cost = purchase.cost !== undefined && purchase.cost !== null
                    ? Number(purchase.cost)
                    : getCost(items);

                const { data: requestorRow } = await supabase
                    .from("users")
                    .select("name, slack_userid")
                    .eq("user_id", purchase.requestor)
                    .maybeSingle();

                const requesterMention = requestorRow?.slack_userid
                    ? `<@${requestorRow.slack_userid.trim()}>`
                    : escapeSlack(requestorRow?.name ?? "Unknown user");

                const requestedDate = new Date(Number(itemID) * 1000).toLocaleDateString("en-US", {
                    timeZone: "America/Chicago",

      });

                const blocks = buildSlackBlocks({
                    title,
                    requesterMention,
                    requestedDate,
                    items,
                    totalCost: cost,
                    vendor,
                    category,
                    status: newStatus,
                    expidited: String(purchase.expidited ?? "NULL"),
                });

                await updateSlackMessage(
                    threadTs,
                    blocks,
                    `Purchase request: ${title} (${currency.format(cost)})`
                );
            }
        } catch (err) {
            console.error("Slack notification failed:", err);
        }
    });

    return NextResponse.json({ purchase: updated }, { status: 200 });
}
