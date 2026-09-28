import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";
import { escapeSlack, postSlackThreadReply } from "@/lib/slack";

export interface PurchaseDelete {
  id: string | number;
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let body: PurchaseDelete;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid Input: body is not valid JSON" }, { status: 400 });
  }

  const purchaseID = Number(body?.id);
  if (!Number.isFinite(purchaseID)) {
    return NextResponse.json(
      { error: `Invalid Input: id must be a number, got ${JSON.stringify(body?.id)}` },
      { status: 400 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Auth Error - Access Denied" }, { status: 401 });
  }

  const { data: purchase, error: fetchError } = await supabase
    .from("purchases")
    .select("*")
    .eq("purchaseID", purchaseID)
    .maybeSingle();

  if (fetchError) {
    if (fetchError.code === "42501") {
      return NextResponse.json({ error: "Auth Error - Access Denied" }, { status: 403 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!purchase) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const threadTs: string | null = purchase["slack-thread-id"] ?? null;

  const { data: deleted, error: deleteError } = await supabase
    .from("purchases")
    .delete()
    .eq("purchaseID", purchaseID)
    .select("purchaseID");

  if (deleteError) {
    if (deleteError.code === "42501") {
      return NextResponse.json({ error: "Auth Error - Access Denied" }, { status: 403 });
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Auth Error - Access Denied" }, { status: 403 });
  }

  try {
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("name, slack_userid")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userError) {
      console.error("Failed to look up deleting user:", userError.message);
    }

    const userMention = userRow?.slack_userid
      ? `<@${userRow.slack_userid.trim()}>`
      : escapeSlack(userRow?.name ?? "Unknown user");

    await postSlackThreadReply(`${userMention} has deleted this order.`, threadTs);
  } catch (err) {
    console.error("Slack notification failed:", err);
  }

  return NextResponse.json({ message: "Success" }, { status: 200 });
}