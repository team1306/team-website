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
const MAX_ORDERS_PER_MESSAGE = 45;
const MAX_TITLE_LENGTH = 150;
const MAX_BODY_LENGTH = 200;

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

function escapeMrkdwn(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getRemainingApprovers(approvers: ApproverEntry[] | null): string[] {
    if (!Array.isArray(approvers)) return [];

    return approvers
        .filter((entry) => !entry.approved)
        .map((entry) => formatRole(entry.requiredRole));
}

function buildOrderCard(order: PendingOrder) {
    const requires =
        order.remaining.length > 0
            ? `Requires: ${order.remaining.join(", ")}`
            : "Awaiting final approval";

    return {
        type: "card",
        block_id: `order_${order.id}`.slice(0, 255),
        title: {
            type: "mrkdwn",
            text: truncate(escapeMrkdwn(order.name), MAX_TITLE_LENGTH),
        },
        body: {
            type: "mrkdwn",
            text: truncate(escapeMrkdwn(requires), MAX_BODY_LENGTH),
        },
    };
}

function buildBlocks(orders: PendingOrder[]) {
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `@channel, Orders that have been approved will be purchased in ${PURCHASE_DELAY_HOURS} hours.`,
            },
        },
        { type: "divider" },
        ...orders.map(buildOrderCard),
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
        const details = Array.isArray(data.response_metadata?.messages)
            ? data.response_metadata.messages.join("; ")
            : "";
        throw new Error(
            `Slack error: ${data.error}${details ? ` (${details})` : ""}`
        );
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

    for (let i = 0; i < pending.length; i += MAX_ORDERS_PER_MESSAGE) {
        await postToSlack(
            token,
            channel,
            pending.slice(i, i + MAX_ORDERS_PER_MESSAGE)
        );
        messages += 1;
    }

    return { orders: pending.length, messages };
}