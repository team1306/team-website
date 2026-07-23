import { NextRequest, NextResponse } from "next/server";
import { createClient } from '../../../../utils/supabase/server'
import { cookies } from 'next/headers'

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

function getCost(items: ItemData[]): number {
  return items.reduce((total, item) => total + item.ItemCost * item.ItemQuantity, 0);
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

  const { error } = await supabase.from('purchases').insert({
    purchaseID: (Math.floor(Date.now() / 1000)),
    requestName: title,
    cost: getCost(items),
    requestor: requestor,
    catagory: category,
    status: 'needsAproval',
    items: items,
    approvers: generateApprovers(items),
    vendor: vendor,
    reason: "",
  })

  if (!error) {
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  }
  else {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'Auth Error - Acess Denied' }, { status: 403 });
    }
    else {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}