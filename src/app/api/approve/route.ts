import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

export interface Approver {
  approved: boolean;
  approverName: string;
  requiredRole: string;
  approverPicture: string;
}

export interface PurchaseCreate {
  itemID: string;
  approvalRole: string;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const body: PurchaseCreate = await request.json();
  const { itemID, approvalRole } = body;

  const { data: purchase, error: fetchError } = await supabase
    .from("purchases")
    .select("status, approvers")
    .eq("purchaseID", itemID)
    .single();

  if (fetchError || !purchase) {
    return NextResponse.json({ error: "Purchase not found"}, { status: 404 });
  }

  if (purchase.status !== "needsAproval") {
    return NextResponse.json({ status: 400 });
  }

  const approvers = purchase.approvers as Approver[];

  const pendingApproval = approvers.find(
    (a) => a.requiredRole === approvalRole && !a.approved
  );

  if (!pendingApproval) {
    return NextResponse.json({ error: `role not suitable"` },{ status: 400 });
  }

  const updatedApprovers = approvers.map((a) =>
    a.requiredRole === approvalRole && !a.approved
      ? { ...a, approved: true }
      : a
  );

  const allApproved = updatedApprovers.every((a) => a.approved);

  const { data: updated, error: updateError } = await supabase
    .from("purchases")
    .update({
      approvers: updatedApprovers,
      status: allApproved ? "aproved" : "needsAproval",
    })
    .eq("purchaseID", itemID)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating purchase:", updateError);
    return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
  }

  return NextResponse.json({ purchase: updated }, { status: 200 });
}