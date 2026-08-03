import { createClient } from '../../../../utils/supabase/server'
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

function parsePurchases(rawPurchases: any[] | null): PurchaseData[] {
  if (!rawPurchases) return [];
  return rawPurchases.map((row) => ({
    id: row.purchaseID,
    title: row.requestName,
    cost: row.cost,
    requestor: row.requestor,
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
    approvers: row.approvers.map((approver: any) => ({
      approved: approver.approved,
      approverName: approver.approverName,
      requiredRole: approver.requiredRole,
      approverPicture: approver.approverPicture,
    })),
  }));
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: purchases, error } = await supabase.from("purchases").select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsed: PurchaseData[] = parsePurchases(purchases);

  return NextResponse.json({ parsed }, { status: 200 });
}