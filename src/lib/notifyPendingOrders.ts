"use server";

import { createServiceClient } from "../../utils/supabase/service";

interface ApproverEntry {
    approved: boolean;
    approver: string;
    requiredRole: string;
}

interface PurchaseRow {
    purchaseID: string;
    requestName: string;
    status: string;
    approvers: ApproverEntry[] | null;
}

interface PendingOrder {
    id: string;
    name: string;
    remaining: string[];
}

const PENDING_STATUS = "needsAproval";
const PURCHASE_DELAY_HOURS = 24;
const MAX_CALLOUTS_PER_MESSAGE = 45;

const ROLE_LABELS: Record<string, string> = {
    mentorLead: "Lead Mentor",
};

function formatRole(role: string): string {
    if (ROLE_LABELS[role]) return ROLE_LABELS[role];

    return role
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

function getRemainingApprovers(approvers: ApproverEntry[] | null): string[] {
    if (!Array.isArray(approvers)) return [];

    return approvers
        .filter((entry) => !entry.approved)
        .map((entry) => formatRole(entry.requiredRole));
}

function buildCallout(order: PendingOrder) {
    return {
        type: "callout",
        block_id: `order_callout_${order.id}`,
        background_color: "orange",
        child_blocks: [
            {
                type: "rich_text",
                block_id: `order_header_${order.id}`,
                elements: [
                    {
                        type: "rich_text_header",
                        level: 2,
                        elements: [
                            {
                                type: "text",
                                text: order.name,
                                style: { bold: true },
                            },
                        ],
                    },
                ],
            },
            {
                type: "section",
                block_id: `order_body_${order.id}`,
                text: {
                    type: "mrkdwn",
                    text:
                        order.remaining.length > 0
                            ? `Requires: ${order.remaining.join(", ")}`
                            : "Awaiting final approval",
                },
            },
        ],
    };
}

function buildBlocks(orders: PendingOrder[]) {
    return [
        {
            type: "markdown",
            text: `<!channel>, Orders that have been approved will be purchased in ${PURCHASE_DELAY_HOURS} hours.`,
        },
        { type: "divider" },
        ...orders.map(buildCallout),
    ];
}

async function postToSlack(
    token: string,
    channel: string,
    orders: PendingOrder[]
) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            channel,
            text: `${orders.length} order(s) still awaiting approval`,
            blocks: buildBlocks(orders),
        }),
    });

    const data = await res.json();

    if (!data.ok) {
        throw new Error(`Slack error: ${data.error}`);
    }
}

export async function notifyPendingOrders() {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!token || !channel) {
        throw new Error("Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from("purchases")
        .select('"purchaseID", "requestName", status, approvers')
        .eq("status", PENDING_STATUS)
        .order("purchaseID", { ascending: true });

    if (error) {
        throw new Error(`Failed to load purchases: ${error.message}`);
    }

    const pending: PendingOrder[] = ((data ?? []) as unknown as PurchaseRow[]).map(
        (row) => ({
            id: row.purchaseID,
            name: row.requestName,
            remaining: getRemainingApprovers(row.approvers),
        })
    );

    if (pending.length === 0) {
        return { orders: 0, messages: 0 };
    }

    let messages = 0;

    for (let i = 0; i < pending.length; i += MAX_CALLOUTS_PER_MESSAGE) {
        await postToSlack(
            token,
            channel,
            pending.slice(i, i + MAX_CALLOUTS_PER_MESSAGE)
        );
        messages += 1;
    }

    return { orders: pending.length, messages };
}