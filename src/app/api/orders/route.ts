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

interface PurchaseCreate {
  title: string;
  requestor: string;
  category: string;
  items: ItemData[];
  vendor: string;
  reason?: string;
}

function parsePurchases(rawPurchases: any[] | null): PurchaseCreate[] {
  if (!rawPurchases) return [];

  return rawPurchases.map((row) => ({
    title: row.requestName,
    requestor: row.requestor,
    category: row.catagory,
    items: row.items.map((item: any) => ({
      id: item.id,
      ItemName: item.ItemName,
      ItemCost: item.ItemCost,
      ItemQuantity: item.ItemQuantity,
      ItemLink: item.ItemLink,
    })),
    vendor: row.vendor,
    reason: row.reason ?? undefined,
  }));
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: purchases, error } = await supabase.from("purchases").select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsed: PurchaseCreate[] = parsePurchases(purchases);

  return NextResponse.json({ parsed }, { status: 200 });
}