import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'
import { currency, escapeSlack, getCost, buildSlackBlocks, postSlackMessage } from "@/lib/slack";

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
      status: 'needsAproval',
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