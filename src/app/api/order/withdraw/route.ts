import { approvalErrorStatus } from "@/lib/approvalErrors";
import { createClient } from '../../../../../utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from "next/server";
import { recalculateCategorySpent } from "@/lib/budget";
import { currency, escapeSlack, getCost, buildSlackBlocks, updateSlackMessage, postSlackThreadReply } from "@/lib/slack";

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
}

export async function POST(request: Request) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { itemID?: string; approvalRole?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { itemID, approvalRole } = body ?? {};
    if (!itemID || typeof approvalRole !== "string" || !approvalRole.trim()) {
        return NextResponse.json({ error: "Missing itemID or approvalRole" }, { status: 400 });
    }

    const { data: purchase, error: updateError } = await supabase.rpc("change_purchase_approval", {
        p_item_id: String(itemID),
        p_approval_role: approvalRole,
        p_approved: false,
    });

    if (updateError) {
        return NextResponse.json(
            { error: updateError.message },
            { status: approvalErrorStatus(updateError.code) }
        );
    }
    const newStatus = purchase.status;

    const budgetError = await recalculateCategorySpent([purchase.catagory]);
    if (budgetError) {
        console.error('Failed to update budget spent:', budgetError);
    }

    const threadTs: string | null = purchase["slack-thread-id"] ?? null;

    if (threadTs) {
        try {
            const { data: approverUser } = await supabase
                .from('users')
                .select('name, slack_userid')
                .eq('user_id', authData.user.id)
                .maybeSingle();

            const approverMention = approverUser?.slack_userid
                ? `<@${approverUser.slack_userid.trim()}>`
                : escapeSlack(approverUser?.name ?? "An approver");

            const { data: requestorUser } = await supabase
                .from('users')
                .select('name, slack_userid')
                .eq('user_id', purchase.requestor)
                .maybeSingle();

            const requesterMention = requestorUser?.slack_userid
                ? `<@${requestorUser.slack_userid.trim()}>`
                : escapeSlack(requestorUser?.name ?? "Unknown user");

            const items = (purchase.items ?? []) as ItemData[];
            const title = String(purchase.requestName ?? "Purchase Request");
            const vendor = String(purchase.vendor ?? "");
            const category = String(purchase.catagory ?? "");
            const cost = purchase.cost !== undefined && purchase.cost !== null
                ? Number(purchase.cost)
                : getCost(items);

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

            await postSlackThreadReply(
                `${approverMention} has withdrawn their approval.`,
                threadTs
            );
        } catch (err) {
            console.error("Slack message update failed:", err);
        }
    }

    return NextResponse.json({ success: true });
}