import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers';
import { buildSlackBlocks, updateSlackMessage } from "@/lib/slack";
import { recalculateCategorySpent } from "@/lib/budget";

interface ItemData {
    id: string;
    ItemName: string;
    ItemCost: number;
    ItemQuantity: number;
    ItemLink: string;
    ordered?: boolean;
}

interface OrderUpdate {
    id: string;
    orderedItemIds: string[];
    feeShare?: number;
    orderNumber?: string;
}

export interface BulkPurchaseData {
    orders: OrderUpdate[];
}

function escapeSlack(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPurchasedBlocks(purchaserMention: string, orderName: string, orderNumber?: string) {
    const blocks: any[] = [
        {
            type: "section",
            text: { type: "mrkdwn", text: `${purchaserMention} has marked ${orderName} as purchased.` },
        },
    ];

    if (orderNumber) {
        blocks.push(
            { type: "divider" },
            { type: "markdown", text: `\n\n> Order ID: \`${orderNumber}\`` },
        );
    }

    return blocks;
}

async function postSlackThreadReply(blocks: any[], fallbackText: string, threadTs: string | null): Promise<void> {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!token || !channel) {
        return;
    }

    if (!threadTs) {
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
                text: fallbackText,
                blocks,
                thread_ts: threadTs,
                unfurl_links: false,
            }),
        });

        const data = await res.json();
    } catch (err) {
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body: BulkPurchaseData = await request.json();
    const updates = body.orders ?? [];

    if (updates.length === 0) {
        return NextResponse.json({ error: 'no orders provided' }, { status: 400 });
    }

    const ids = updates.map((update) => update.id);

    const { data: existingOrders, error: fetchError } = await supabase
        .from('purchases')
        .select('purchaseID, catagory, items, status, requestName, "slack-thread-id"')
        .in('purchaseID', ids);

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const existingById = new Map((existingOrders ?? []).map((order) => [order.purchaseID, order]));
    let purchaserMention = "Someone";
    try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
            const { data: userRow } = await supabase
                .from('users')
                .select('name, slack_userid')
                .eq('user_id', userId)
                .maybeSingle();

            const slackUserId = userRow?.slack_userid?.trim() || null;
            purchaserMention = slackUserId ? `<@${slackUserId}>` : escapeSlack(userRow?.name ?? "Someone");
        }
    } catch (err) {
        console.error("Failed to look up purchaser for Slack notification:", err);
    }

    const results: { id: string; status: string }[] = [];
    const errors: { id: string; error: string }[] = [];
    const touchedCategories: (string | null)[] = [];
    const newlyPurchased: { threadTs: string | null; orderName: string; orderNumber?: string }[] = [];

    for (const update of updates) {
        const existing = existingById.get(update.id);
        if (!existing || existing.status !== 'approved') {
            errors.push({ id: update.id, error: existing ? 'Order must be approved before purchasing' : 'Order not found' });
            continue;
        }
        const orderedSet = new Set(update.orderedItemIds);

        const items: ItemData[] = (existing.items ?? []).map((item: ItemData) => ({
            ...item,
            ordered: orderedSet.has(item.id) ? true : item.ordered ?? false,
        }));

        const allOrdered = items.length > 0 && items.every((item) => item.ordered);
        const itemsCost = items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0);
        const fee = update.feeShare ?? 0;

        const updateObj: Record<string, unknown> = {
            items,
            cost: itemsCost + fee,
        };

        if (allOrdered) {
            updateObj.status = 'purchased';
        }

        if (update.orderNumber !== undefined) {
            updateObj.vendorOrderNumber = update.orderNumber;
        }

        const { data: changed, error } = await supabase
            .from('purchases')
            .update(updateObj)
            .eq('purchaseID', update.id)
            .eq('status', 'approved')
            .select();

        if (error) {
            errors.push({ id: update.id, error: error.code === '42501' ? 'Auth Error - Acess Denied' : error.message });
            continue;
        }

        if (!changed || changed.length !== 1) {
            errors.push({ id: update.id, error: 'Order was not updated. It may no longer be approved or you may not have access.' });
            continue;
        }

        const purchase = changed[0];
        const threadTs = purchase["slack-thread-id"];
        if (threadTs) {
            try {
                const { data: requester } = await supabase.from('users')
                    .select('name, slack_userid').eq('user_id', purchase.requestor).maybeSingle();
                await updateSlackMessage(threadTs, buildSlackBlocks({
                    title: purchase.requestName ?? 'Purchase Request',
                    requesterMention: requester?.slack_userid ? `<@${requester.slack_userid.trim()}>` : escapeSlack(requester?.name ?? 'Unknown user'),
                    requestedDate: new Date(Number(update.id) * 1000).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
                    items: purchase.items,
                    totalCost: Number(purchase.cost),
                    vendor: purchase.vendor ?? '',
                    category: purchase.catagory ?? '',
                    status: purchase.status,
                    expidited: purchase.expidited ?? 'NULL',
                }), `Purchase request: ${purchase.requestName} (${purchase.status})`);
            } catch (error) {
                console.error('Failed to refresh purchased order Slack card:', error);
            }
        }

        touchedCategories.push(existing.catagory ?? null);
        results.push({ id: update.id, status: allOrdered ? 'purchased' : existing.status });

        if (allOrdered && existing.status !== 'purchased') {
            newlyPurchased.push({
                threadTs: (existing as any)["slack-thread-id"] ?? null,
                orderName: existing.requestName ?? "order",
                orderNumber: update.orderNumber,
            });
        }
    }

    try {
        for (const order of newlyPurchased) {
            const orderName = escapeSlack(order.orderName);
            const blocks = buildPurchasedBlocks(purchaserMention, orderName, order.orderNumber);
            await postSlackThreadReply(blocks, `${purchaserMention} has marked ${orderName} as purchased.`, order.threadTs);
        }
    } catch (err) {
    }

    const budgetWarning = await recalculateCategorySpent(touchedCategories);

    return NextResponse.json(
        {
            results: updates.map(update => {
                const failure = errors.find(result => result.id === update.id);
                return failure ? { ...failure, success: false } : { ...results.find(result => result.id === update.id), success: true };
            }),
            updated: results,
            ...(errors.length > 0 ? { errors } : {}),
            ...(budgetWarning ? { budgetWarning } : {}),
        },
        { status: errors.length > 0 ? 409 : 200 }
    );
}