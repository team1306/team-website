import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'
import { recalculateCategorySpent } from "@/lib/budget";
import { currency, escapeSlack, getCost, buildSlackBlocks, updateSlackMessage } from "@/lib/slack";

export interface RequestInfo {
  id: string;
  status: string;
}

interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body: RequestInfo = await request.json();
    const { id, status } = body;

    const { data, error } = await supabase
      .from('purchases')
      .update({
        status: status
      })
      .eq('purchaseID', id)
      .select();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No purchase found with that id' }, { status: 404 });
    }

    const budgetError = await recalculateCategorySpent(data.map((row) => row.catagory));
    if (budgetError) {
      console.error('Failed to update budget spent:', budgetError);
    }

    const purchase = data[0] as Record<string, any>;
    const threadTs: string | null = purchase["slack-thread-id"] ?? null;

    if (threadTs) {
      try {
        const items = (purchase.items ?? []) as ItemData[];
        const title = String(purchase.requestName ?? "Purchase Request");
        const vendor = String(purchase.vendor ?? "");
        const category = String(purchase.catagory ?? "");
        const cost = purchase.cost !== undefined && purchase.cost !== null
          ? Number(purchase.cost)
          : getCost(items);

        const { data: userRow } = await supabase
          .from('users')
          .select('name, slack_userid')
          .eq('user_id', purchase.requestor)
          .maybeSingle();

        const requesterMention = userRow?.slack_userid
          ? `<@${userRow.slack_userid.trim()}>`
          : escapeSlack(userRow?.name ?? "Unknown user");

        const requestedDate = new Date(Number(id) * 1000).toLocaleDateString("en-US", {
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
          status,
          expidited: String(purchase.expidited ?? "NULL"),
        });

        await updateSlackMessage(
          threadTs,
          blocks,
          `Purchase request: ${title} (${currency.format(cost)})`
        );
      } catch (err) {
        console.error("Slack main message update failed:", err);
      }
    }

    return NextResponse.json({
      status: 200,
      ...(budgetError ? { budgetWarning: budgetError } : {}),
    });

  } catch (err) {
    console.error('Unhandled error in /api/setStatus:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}