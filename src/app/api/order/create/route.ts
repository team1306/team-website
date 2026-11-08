import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'
import { currency, escapeSlack, getCost, buildSlackBlocks, postSlackMessage } from "@/lib/slack";

import { canApproveCategory } from "@/lib/orderApproval";

interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
}

export interface PurchaseCreate {
  title: string;
  category: string;
  items: ItemData[];
  vendor: string;
}

function generateApprovers(items: ItemData[]) {
  if (getCost(items) > 250) {
    return ([
      { approved: false, approver: "", requiredRole: "studentLead" },
      { approved: false, approver: "", requiredRole: "mentorLead" },
      { approved: false, approver: "", requiredRole: "president" },
    ]);
  }
  else {
    return ([
      { approved: false, approver: "", requiredRole: "studentLead" },
      { approved: false, approver: "", requiredRole: "mentor" },
    ]);
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const body: PurchaseCreate = await request.json();
  const { title, category, items, vendor } = body;

  if (!title || !category || !vendor || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
  }

  if (typeof vendor !== 'string' || !vendor.trim() || /^other(?:\s*-\s*)?$/i.test(vendor.trim())) {
    return NextResponse.json({ error: 'Enter the vendor name' }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const requestor = authData.user.id;

  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', authData.user.id)
    .single();

  if (requesterError || !requester) {
    return NextResponse.json({ error: 'Unable to load requester role' }, { status: 500 });
  }

  const purchaseID = Math.floor(Date.now() / 1000);
  const totalCost = getCost(items);
  // Apply self-approvals directly so no approval replies are posted to Slack.
  const approvers = generateApprovers(items).map((entry) =>
    requester.role !== 'teamAdministrator' &&
    canApproveCategory(requester.role, entry.requiredRole, totalCost > 250)
      ? { ...entry, approved: true, approver: authData.user.id }
      : entry
  );
  const status = approvers.every((entry) => entry.approved) ? 'approved' : 'needsAproval';

  const { error } = await supabase.from('purchases').insert({
    purchaseID: purchaseID,
    requestName: title,
    cost: totalCost,
    requestor: requestor,
    catagory: category,
    status,
    items: items,
    approvers,
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
      status,
      expidited: 'NULL',
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
