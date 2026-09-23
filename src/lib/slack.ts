export interface SlackItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
}

export const MAX_ITEM_ROWS = 38;

export const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function escapeSlack(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function getCost(items: SlackItemData[]): number {
    return items.reduce((total, item) => total + item.ItemCost * item.ItemQuantity, 0);
}

const STATUS_LABELS: Record<string, { status: string; ordering: string }> = {
    needsAproval: { status: "Needs Approval", ordering: "Awaiting Approval" },
    aproved: { status: "Approved", ordering: "Ready to Order" },
    ordered: { status: "Ordered", ordering: "Order Placed" },
    recived: { status: "Received", ordering: "Complete" },
    denied: { status: "Denied", ordering: "Cancelled" },
};

function labelsForStatus(status: string): { status: string; ordering: string } {
    if (STATUS_LABELS[status]) return STATUS_LABELS[status];
    const fallback = status.charAt(0).toUpperCase() + status.slice(1);
    return { status: fallback, ordering: fallback };
}

export function buildSlackBlocks(params: {
    title: string;
    requesterMention: string;
    requestedDate: string;
    items: SlackItemData[];
    totalCost: number;
    vendor: string;
    category: string;
    status: string;
}) {
    const { title, requesterMention, requestedDate, items, totalCost, vendor, category, status } = params;
    const { status: statusLabel, ordering: orderingLabel } = labelsForStatus(status);

    const shownItems = items.slice(0, MAX_ITEM_ROWS);
    const hiddenCount = items.length - shownItems.length;

    const itemBlocks = shownItems.map((item, index) => {
        const block: any = {
            type: "section",
            fields: [
                { type: "mrkdwn", text: `*${escapeSlack(item.ItemName)}* ×${item.ItemQuantity}` },
                { type: "mrkdwn", text: `*${currency.format(item.ItemCost * item.ItemQuantity)}*` },
            ],
        };

        if (item.ItemLink && isHttpUrl(item.ItemLink)) {
            block.accessory = {
                type: "button",
                text: { type: "plain_text", text: "Open Link" },
                url: item.ItemLink,
                action_id: `open_item_${index + 1}`,
            };
        }
        return block;
    });

    if (hiddenCount > 0) {
        itemBlocks.push({
            type: "context",
            elements: [{ type: "mrkdwn", text: `+${hiddenCount} more item${hiddenCount === 1 ? "" : "s"} not shown` }],
        } as any);
    }

    return [
        { type: "markdown", text: `# ${title}` },
        {
            type: "section",
            text: { type: "mrkdwn", text: `*Requested By* ${requesterMention} on ${requestedDate}` },
        },
        { type: "divider" },
        ...itemBlocks,
        { type: "markdown", text: `### Total Cost: ${currency.format(totalCost)}` },
        { type: "divider" },
        {
            type: "section",
            fields: [
                { type: "mrkdwn", text: `*Status*\n${statusLabel}` },
                { type: "mrkdwn", text: `*Ordering*\n${orderingLabel}` },
            ],
        },
        {
            type: "section",
            fields: [
                { type: "mrkdwn", text: `*Vendor*\n${escapeSlack(vendor)}` },
                { type: "mrkdwn", text: `*Budget*\n${escapeSlack(category)}` },
            ],
        },
    ];
}

export async function postSlackMessage(blocks: any[], fallbackText: string): Promise<string | null> {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!token || !channel) {
        console.error("Slack not configured: missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
        return null;
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
                text: fallbackText,
                blocks,
                unfurl_links: false,
            }),
        });

        const data = await res.json();
        if (!data.ok) {
            console.error("Slack API error:", data.error, data.response_metadata?.messages);
            return null;
        }
        return data.ts as string;
    } catch (err) {
        console.error("Failed to post Slack message:", err);
        return null;
    }
}

export async function updateSlackMessage(ts: string, blocks: any[], fallbackText: string): Promise<boolean> {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!token || !channel) {
        console.error("Slack not configured: missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID");
        return false;
    }

    try {
        const res = await fetch("https://slack.com/api/chat.update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                channel,
                ts,
                text: fallbackText,
                blocks,
            }),
        });

        const data = await res.json();
        if (!data.ok) {
            console.error("Slack API error:", data.error, data.response_metadata?.messages);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Failed to update Slack message:", err);
        return false;
    }
}

export async function postSlackThreadReply(text: string, threadTs: string | null): Promise<void> {
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