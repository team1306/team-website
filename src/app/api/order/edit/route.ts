import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'
import { recalculateCategorySpent } from "@/lib/budget";
import { currency, escapeSlack, getCost, buildSlackBlocks, updateSlackMessage, postSlackThreadReply } from "@/lib/slack";

interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
}

export interface OrderData {
  id: string;
  title?: string;
  cost?: number;
  requestor?: string;
  category?: string;
  status?: string;
  items?: ItemData[];
  vendor?: string;
  reason?: string;
  clearApprovers?: boolean;
  expidited?: string;
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

function diffItems(oldItems: ItemData[], newItems: ItemData[]): string[] {
  const oldMap = new Map(oldItems.map((item) => [item.id, item]));
  const newMap = new Map(newItems.map((item) => [item.id, item]));
  const lines: string[] = [];

  for (const item of newItems) {
    const old = oldMap.get(item.id);
    const name = escapeSlack(item.ItemName);

    if (!old) {
      lines.push(`Added ${name} (qty ${item.ItemQuantity}, ${currency.format(item.ItemCost)})`);
      continue;
    }

    const changes: string[] = [];
    if (old.ItemName !== item.ItemName) {
      changes.push(`name "${escapeSlack(old.ItemName)}" → "${name}"`);
    }
    if (old.ItemQuantity !== item.ItemQuantity) {
      changes.push(`qty ${old.ItemQuantity} → ${item.ItemQuantity}`);
    }
    if (old.ItemCost !== item.ItemCost) {
      changes.push(`cost ${currency.format(old.ItemCost)} → ${currency.format(item.ItemCost)}`);
    }
    if (old.ItemLink !== item.ItemLink) {
      changes.push(`link updated`);
    }

    if (changes.length > 0) {
      lines.push(`Edited ${name}: ${changes.join(", ")}`);
    }
  }

  for (const item of oldItems) {
    if (!newMap.has(item.id)) {
      lines.push(`Removed ${escapeSlack(item.ItemName)}`);
    }
  }

  return lines;
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const body: OrderData = await request.json();
  const { id, title, cost, requestor, category, status, items, vendor, reason, clearApprovers, expidited } = body;

  if (id === undefined || id === null) {
    return NextResponse.json({ error: 'id not found' }, { status: 400 });
  }

  const updateObj: Record<string, unknown> = {};

  if (title !== undefined) updateObj.requestName = title;
  if (requestor !== undefined) updateObj.requestor = requestor;
  if (category !== undefined) updateObj.catagory = category;
  if (status !== undefined) updateObj.status = status;
  if (vendor !== undefined) updateObj.vendor = vendor;
  if (reason !== undefined) updateObj.reason = reason;
  if (expidited !== undefined) updateObj.expidited = expidited;

  if (clearApprovers == true && items) {
    updateObj.approvers = generateApprovers(items);
  }

  if (items !== undefined) {
    updateObj.items = items;
    updateObj.cost = cost !== undefined ? cost : getCost(items);
    if (clearApprovers) {
      updateObj.approvers = generateApprovers(items);
    }
  } else if (cost !== undefined) {
    updateObj.cost = cost;
  }

  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json({ error: 'no updates found' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('purchases')
    .select('catagory, requestName, vendor, reason, status, cost, expidited, items, requestor, "slack-thread-id"')
    .eq('purchaseID', id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'No purchase found with that id' }, { status: 404 });
  }

  const previousCategory: string | null = existing.catagory ?? null;

  if (typeof category === 'string' && category !== previousCategory) {
    const { data: budgetRow, error: budgetError } = await supabase
      .from('budget')
      .select('categoryID, enabled')
      .eq('categoryID', category)
      .maybeSingle();

    if (budgetError) {
      return NextResponse.json({ error: budgetError.message }, { status: 500 });
    }

    if (!budgetRow) {
      return NextResponse.json({ error: 'Unknown budget category' }, { status: 400 });
    }

    if (!budgetRow.enabled) {
      return NextResponse.json({ error: 'Budget category is disabled' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('purchases')
    .update(updateObj)
    .eq('purchaseID', id);

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'Auth Error - Acess Denied' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const affectsSpending =
    updateObj.status !== undefined ||
    updateObj.catagory !== undefined ||
    updateObj.cost !== undefined;

  let budgetWarning: string | null = null;
  if (affectsSpending) {
    const currentCategory =
      typeof updateObj.catagory === 'string' ? updateObj.catagory : previousCategory;

    budgetWarning = await recalculateCategorySpent([previousCategory, currentCategory]);
    if (budgetWarning) {
      console.error('Failed to update budget spent:', budgetWarning);
    }
  }

  const threadTs: string | null = (existing as any)["slack-thread-id"] ?? null;

  try {
    let cachedEditorMention: string | null = null;

    async function getEditorMention(): Promise<string> {
      if (cachedEditorMention) return cachedEditorMention;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (userId) {
        const { data: userRow } = await supabase
          .from('users')
          .select('name, slack_userid')
          .eq('user_id', userId)
          .maybeSingle();

        const slackUserId = userRow?.slack_userid?.trim() || null;
        cachedEditorMention = slackUserId ? `<@${slackUserId}>` : escapeSlack(userRow?.name ?? "Someone");
      } else {
        cachedEditorMention = "Someone";
      }

      return cachedEditorMention;
    }

    const expiditeChanged = updateObj.expidited !== undefined && updateObj.expidited !== existing.expidited;
    const expiditeTransition = expiditeChanged ? String(updateObj.expidited) : null;

    if (expiditeTransition === "requested") {
      const mention = await getEditorMention();
      await postSlackThreadReply(`${mention} has requested this order to be expedited @Andrew.`, threadTs);
    } else if (expiditeTransition === "approved") {
      const mention = await getEditorMention();
      await postSlackThreadReply(`${mention} has expedited this order.`, threadTs);
    } else if (expiditeTransition === "rejected") {
      const mention = await getEditorMention();
      await postSlackThreadReply(`${mention} has marked this order as expedited rejected.`, threadTs);
    }

    const statusChanged = updateObj.status !== undefined && updateObj.status !== existing.status;
    const statusTransition = statusChanged ? String(updateObj.status) : null;
    const statusReasonText = reason !== undefined ? reason : existing.reason;

    if (statusTransition === "rejected") {
      const mention = await getEditorMention();
      const message = statusReasonText
        ? `${mention} rejected this order: ${escapeSlack(String(statusReasonText))}`
        : `${mention} rejected this order.`;
      await postSlackThreadReply(message, threadTs);
    } else if (statusTransition === "onHold") {
      const mention = await getEditorMention();
      const message = statusReasonText
        ? `${mention} put this order on hold: ${escapeSlack(String(statusReasonText))}`
        : `${mention} put this order on hold.`;
      await postSlackThreadReply(message, threadTs);
    } else if (statusTransition === "recived") {
      const mention = await getEditorMention();
      const message = statusReasonText
        ? `${mention} marked this order as received: ${escapeSlack(String(statusReasonText))}`
        : `${mention} marked this order as received.`;
      await postSlackThreadReply(message, threadTs);
    }

    const bullets: string[] = [];

    if (updateObj.requestName !== undefined && updateObj.requestName !== existing.requestName) {
      bullets.push(`Order Name: ${escapeSlack(String(updateObj.requestName))}`);
    }
    if (updateObj.catagory !== undefined && updateObj.catagory !== existing.catagory) {
      bullets.push(`Budget Category: ${escapeSlack(String(updateObj.catagory))}`);
    }
    if (updateObj.vendor !== undefined && updateObj.vendor !== existing.vendor) {
      bullets.push(`Vendor: ${escapeSlack(String(updateObj.vendor))}`);
    }
    if (updateObj.reason !== undefined && updateObj.reason !== existing.reason && statusTransition === null) {
      bullets.push(`Reason: ${escapeSlack(String(updateObj.reason))}`);
    }
    if (updateObj.expidited !== undefined && updateObj.expidited !== existing.expidited && expiditeTransition === null) {
      bullets.push(`Expedited: ${escapeSlack(String(updateObj.expidited))}`);
    }
    if (updateObj.cost !== undefined && updateObj.items === undefined && updateObj.cost !== existing.cost) {
      bullets.push(`Cost: ${currency.format(Number(updateObj.cost))}`);
    }
    if (updateObj.items !== undefined) {
      const newItems = updateObj.items as ItemData[];
      const oldItems = (existing.items ?? []) as ItemData[];
      const itemLines = diffItems(oldItems, newItems);
      bullets.push(...itemLines);
    }

    if (bullets.length > 0) {
      const editorMention = await getEditorMention();
      const orderName = escapeSlack(String(updateObj.requestName ?? existing.requestName ?? "this order"));

      const message = [
        `${editorMention} edited ${orderName},`,
        ...bullets.map((bullet) => `• ${bullet}`),
      ].join("\n");

      await postSlackThreadReply(message, threadTs);
    }
  } catch (err) {
    console.error("Slack thread notification failed:", err);
  }

  if (threadTs) {
    try {
      const mergedItems = (updateObj.items ?? existing.items ?? []) as ItemData[];
      const mergedCost = updateObj.cost !== undefined ? Number(updateObj.cost) : Number(existing.cost ?? getCost(mergedItems));
      const mergedTitle = String(updateObj.requestName ?? existing.requestName ?? "Purchase Request");
      const mergedVendor = String(updateObj.vendor ?? existing.vendor ?? "");
      const mergedCategory = String(updateObj.catagory ?? existing.catagory ?? "");
      const mergedStatus = String(updateObj.status ?? existing.status ?? "needsAproval");
      const mergedExpidited = String(updateObj.expidited ?? existing.expidited ?? "NULL");

      const { data: userRow } = await supabase
        .from('users')
        .select('name, slack_userid')
        .eq('user_id', existing.requestor)
        .maybeSingle();

      const requesterMention = userRow?.slack_userid
        ? `<@${userRow.slack_userid.trim()}>`
        : escapeSlack(userRow?.name ?? "Unknown user");

      const requestedDate = new Date(Number(id) * 1000).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
      });

      const blocks = buildSlackBlocks({
        title: mergedTitle,
        requesterMention,
        requestedDate,
        items: mergedItems,
        totalCost: mergedCost,
        vendor: mergedVendor,
        category: mergedCategory,
        status: mergedStatus,
        expidited: mergedExpidited,
      });

      await updateSlackMessage(
        threadTs,
        blocks,
        `Purchase request: ${mergedTitle} (${currency.format(mergedCost)})`
      );
    } catch (err) {
      console.error("Slack main message update failed:", err);
    }
  }

  return NextResponse.json(
    { message: 'Success', ...(budgetWarning ? { budgetWarning } : {}) },
    { status: 200 }
  );
}