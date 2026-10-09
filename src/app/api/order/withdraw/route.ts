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

    const { itemID, approvalRole } = body;
    if (!itemID || !approvalRole) {
        return NextResponse.json({ error: "Missing itemID or approvalRole" }, { status: 400 });
    }

    const { data: purchase, error: fetchError } = await supabase
        .from("purchases")
        .select("*")
        .eq("purchaseID", itemID)
        .maybeSingle();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!purchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status !== "needsAproval" && purchase.status !== "needsApproval" && purchase.status !== "approved") {
        return NextResponse.json({ error: "Approvals can't be withdrawn at this stage" }, { status: 409 });
    }

    const approvers: any[] = Array.isArray(purchase.approvers) ? purchase.approvers : [];
    const index = approvers.findIndex((a) => a.requiredRole === approvalRole);

    if (index === -1) {
        return NextResponse.json({ error: "Approval slot not found" }, { status: 404 });
    }

    const slot = approvers[index];

    if (!slot.approved) {
        return NextResponse.json({ error: "Not currently approved" }, { status: 409 });
    }
    if (String(slot.approver ?? "").trim() !== authData.user.id) {
        return NextResponse.json({ error: "Only the original approver can withdraw" }, { status: 403 });
    }

    const updatedApprovers = approvers.map((a, i) =>
        i === index ? { ...a, approved: false, approver: "" } : a
    );

    const newStatus = purchase.status === "approved" ? "needsAproval" : purchase.status;

    const { data: updated, error: updateError } = await supabase
        .from("purchases")
        .update({
            approvers: updatedApprovers,
            status: newStatus,
        })
        .eq("purchaseID", itemID)
        .select();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!updated || updated.length === 0) {
        return NextResponse.json({ error: "Purchase changed, try again" }, { status: 409 });
    }

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