import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'

interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
}

export interface PurchaseCreate {
  title: string;
  requestor: string;
  category: string;
  items: ItemData[];
  vendor: string;
}

const MAX_ITEM_ROWS = 38;

function getCost(items: ItemData[]): number {
  return items.reduce((total, item) => total + item.ItemCost * item.ItemQuantity, 0);
}

function generateApprovers(items: ItemData[]) {
  if (getCost(items) > 250) {
    return ([
      { approverName: "", approverPicture: "", requiredRole: "studentLead", approved: false },
      { approverName: "", approverPicture: "", requiredRole: "mentorLead", approved: false },
      { approverName: "", approverPicture: "", requiredRole: "president", approved: false },
    ]);
  }
  else {
    return ([
      { approverName: "", approverPicture: "", requiredRole: "studentLead", approved: false },
      { approverName: "", approverPicture: "", requiredRole: "mentor", approved: false },
    ]);
  }
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildSlackBlocks(params: {
  title: string;
  requesterMention: string;
  requestedDate: string;
  items: ItemData[];
  totalCost: number;
  vendor: string;
  category: string;
}) {
  const { title, requesterMention, requestedDate, items, totalCost, vendor, category } = params;

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
        { type: "mrkdwn", text: "*Status*\nNeeds Approval" },
        { type: "mrkdwn", text: "*Ordering*\nAwaiting Approval" },
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

async function postSlackMessage(blocks: any[], fallbackText: string): Promise<string | null> {
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

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const body: PurchaseCreate = await request.json();
  const { title, requestor, category, items, vendor } = body;

  if (!title || !requestor || !category || !vendor || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
  }

  const purchaseID = Math.floor(Date.now() / 1000);
  const totalCost = getCost(items);

  const { error } = await supabase.from('purchases').insert({
    purchaseID: purchaseID,
    requestName: title,
    cost: totalCost,
    requestor: requestor,
    catagory: category,
    status: 'needsAproval',
    items: items,
    approvers: generateApprovers(items),
    vendor: vendor,
    reason: "",
  })

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'Auth Error - Acess Denied' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('name, slack_userid')
      .eq('user_id', requestor)
      .maybeSingle();

    if (userError) {
      console.error("Failed to look up requestor:", userError.message);
    }

    const requesterMention = userRow?.slack_userid
      ? `<@${userRow.slack_userid.trim()}>`
      : escapeSlack(userRow?.name ?? "Unknown user");

    const requestedDate = new Date(purchaseID * 1000).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
    });

    const blocks = buildSlackBlocks({
      title,
      requesterMention,
      requestedDate,
      items,
      totalCost,
      vendor,
      category,
    });

    const ts = await postSlackMessage(
      blocks,
      `New purchase request: ${title} (${currency.format(totalCost)})`
    );

    if (ts) {
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ 'slack-thread-id': ts })
        .eq('purchaseID', purchaseID);

      if (updateError) {
        console.error("Failed to save slack-thread-id:", updateError.message);
      }
    }
  } catch (err) {
    console.error("Slack notification failed:", err);
  }

  return NextResponse.json({ message: 'Success' }, { status: 200 });
}