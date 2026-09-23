import { createClient } from '../../../../../utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from "next/server";

interface ItemData {
  id: string;
  ItemName: string;
  ItemCost: number;
  ItemQuantity: number;
  ItemLink: string;
}

interface Approver {
  approved: boolean;
  approverName: string;
  requiredRole: string;
  approverPicture: string;
}

interface PurchaseData {
  id: string;
  title: string;
  cost: number;
  requestor: string;
  catagory: string;
  requestedDate: string;
  status: string;
  items: ItemData[];
  vendor: string;
  reason: string;
  approvers: Approver[];
  expidited: string;
}

function parsePurchases(
  rawPurchases: any[] | null,
  userNames: Map<string, string>,
  userPictures: Map<string, string>
): PurchaseData[] {
  if (!rawPurchases) return [];
  return rawPurchases.map((row) => ({
    id: row.purchaseID,
    title: row.requestName,
    cost: row.cost,
    requestor: userNames.get(String(row.requestor).trim()) ?? row.requestor,
    catagory: row.catagory,
    expidited: row.expidited,
    requestedDate: new Date(Number(row.purchaseID) * 1000).toISOString(),
    status: row.status,
    items: row.items.map((item: any) => ({
      id: item.id,
      ItemName: item.ItemName,
      ItemCost: item.ItemCost,
      ItemQuantity: item.ItemQuantity,
      ItemLink: item.ItemLink,
    })),
    vendor: row.vendor,
    reason: row.reason ?? "",
    approvers: row.approvers.map((approver: any) => {
      const approverId = approver.approver ? String(approver.approver).trim() : "";
      return {
        approved: approver.approved,
        approverName: approverId ? userNames.get(approverId) ?? approver.approver : "",
        requiredRole: approver.requiredRole,
        approverPicture: approverId ? userPictures.get(approverId) ?? "" : "",
      };
    }),
  }));
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [purchasesRes, usersRes] = await Promise.all([
    supabase.from("purchases").select(),
    supabase.from("users").select("user_id, name, picture"),
  ]);

  if (purchasesRes.error) {
    return NextResponse.json({ error: purchasesRes.error.message }, { status: 500 });
  }

  if (usersRes.error) {
    console.error("Failed to load users:", usersRes.error.message);
  }

  const userNames = new Map<string, string>(
    (usersRes.data ?? []).map((u) => [String(u.user_id), u.name])
  );
  const userPictures = new Map<string, string>(
    (usersRes.data ?? []).map((u) => [String(u.user_id), u.picture ?? ""])
  );

  const parsed: PurchaseData[] = parsePurchases(purchasesRes.data, userNames, userPictures);

  return NextResponse.json({ parsed }, { status: 200 });
}