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

function generateApprovers(totalCost: number, requestorId: string, requestorRole: string | null) {
  const isTierTwo = totalCost > 250;
  const mentorRole = isTierTwo ? "mentorLead" : "mentor";
  const requiredRoles = isTierTwo
    ? ["studentLead", mentorRole, "president"]
    : ["studentLead", mentorRole];

  let approvalRole = requestorRole;
  if (requestorRole === "president" && !isTierTwo) {
    approvalRole = "studentLead";
  } else if (requestorRole === "mentorLead" || requestorRole === "programDirector") {
    approvalRole = mentorRole;
  }

  return requiredRoles.map((requiredRole) => {
    const approved = requiredRole === approvalRole;
    return { approved, approver: approved ? requestorId : "", requiredRole };
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const body: PurchaseCreate = await request.json();
  const { title, requestor, category, items, vendor } = body;

  if (!title || !requestor || !category || !vendor || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const requestorId = authData?.user?.id;
  if (authError || !requestorId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (requestor !== requestorId) {
    return NextResponse.json({ error: 'Requestor must match the signed-in user' }, { status: 403 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('role, name, slack_userid')
    .eq('user_id', requestorId)
    .maybeSingle();

  if (userError) {
    console.error("Failed to look up requestor:", userError.message);
    return NextResponse.json({ error: 'Failed to look up requestor' }, { status: 500 });
  }

  const purchaseID = Math.floor(Date.now() / 1000);
  const totalCost = getCost(items);

  const { error } = await supabase.from('purchases').insert({
    purchaseID: purchaseID,
    requestName: title,
    cost: totalCost,
    requestor: requestorId,
    catagory: category,
    status: 'needsAproval',
    items: items,
    approvers: generateApprovers(totalCost, requestorId, userRow?.role ?? null),
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