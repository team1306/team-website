import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";

export interface Approver {
    approved: boolean;
    approverName: string;
    requiredRole: string;
    approverPicture: string;
}

export interface PurchaseCreate {
    itemID: string;
    approvalRole: string;
    approverName: string;
    approverPicture?: string;
}

const FINAL_APPROVAL_RECIPIENT = "@Andrew";

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
    // Anchor "today" to America/Chicago rather than the server's local timezone,
    // matching the timeZone: "America/Chicago" pattern used elsewhere in this codebase.
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

    const body: PurchaseCreate = await request.json();
    const { itemID, approvalRole, approverName, approverPicture } = body;

    const { data: purchase, error: fetchError } = await supabase
        .from("purchases")
        .select('status, approvers, requestName, expidited, "slack-thread-id"')
        .eq("purchaseID", itemID)
        .single();

    if (fetchError || !purchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "needsAproval") {
        return NextResponse.json({ status: 400 });
    }

    const approvers = purchase.approvers as Approver[];

    const pendingApproval = approvers.find(
        (a) => a.requiredRole === approvalRole && !a.approved
    );

    if (!pendingApproval) {
        return NextResponse.json({ error: `role not suitable"` }, { status: 400 });
    }

    const updatedApprovers = approvers.map((a) =>
        a.requiredRole === approvalRole && !a.approved
            ? { ...a, approved: true, approverName: approverName ?? "", approverPicture: approverPicture ?? "" }
            : a
    );

    const allApproved = updatedApprovers.every((a) => a.approved);

    const { data: updated, error: updateError } = await supabase
        .from("purchases")
        .update({
            approvers: updatedApprovers,
            status: allApproved ? "approved" : "needsAproval",
        })
        .eq("purchaseID", itemID)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
    }

    try {
        const threadTs: string | null = (purchase as any)["slack-thread-id"] ?? null;

        let slackUserId: string | null = null;
        const { data: authData } = await supabase.auth.getUser();
        const approverUserId = authData?.user?.id;

        if (approverUserId) {
            const { data: userRow, error: userError } = await supabase
                .from("users")
                .select("slack_userid")
                .eq("user_id", approverUserId)
                .maybeSingle();

            if (userError) {
            }
            slackUserId = userRow?.slack_userid?.trim() || null;
        }

        const approverMention = slackUserId
            ? `<@${slackUserId}>`
            : escapeSlack(approverName || "Someone");

        const orderName = escapeSlack(purchase.requestName ?? "this order");
        const roleText = withArticle(formatRole(approvalRole));

        await postSlackThreadReply(
            `${approverMention} has approved ${orderName} as ${roleText}.`,
            threadTs
        );

        if (allApproved) {
            const isExpidited = purchase.expidited === "approved";

            const finalMessage = isExpidited
                ? `This order has been approved and expedited, ${FINAL_APPROVAL_RECIPIENT}. It can be ordered now.`
                : `This order has been approved, ${FINAL_APPROVAL_RECIPIENT}. Next purchasing day: ${getNextPurchaseDate()}.`;

            await postSlackThreadReply(finalMessage, threadTs);
        }
    } catch (err) {
    }

    return NextResponse.json({ purchase: updated }, { status: 200 });
}