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

export interface OrderData {
  id: string;
  title?: string;
  cost?: number;
  requestor?: string;
  category?: string;
  status?: string;
  items?: ItemData[];
  vendor?: string;
  reason?: string;
  clearApprovers?: boolean;
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

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const body: OrderData = await request.json();
  const { id, title, cost, requestor, category, status, items, vendor, reason, clearApprovers } = body;

  if (id === undefined || id === null) {
    return NextResponse.json({ error: 'id not found' }, { status: 400 });
  }

  const updateObj: Record<string, unknown> = {};

  if (title !== undefined) updateObj.requestName = title;
  if (requestor !== undefined) updateObj.requestor = requestor;
  if (category !== undefined) updateObj.catagory = category;
  if (status !== undefined) updateObj.status = status;
  if (vendor !== undefined) updateObj.vendor = vendor;
  if (reason !== undefined) updateObj.reason = reason;

  if(clearApprovers == true && items){
    updateObj.approvers = generateApprovers(items);
  }

  if (items !== undefined) {
    updateObj.items = items;
    updateObj.cost = cost !== undefined ? cost : getCost(items);
    updateObj.approvers = generateApprovers(items);
  } else if (cost !== undefined) {
    updateObj.cost = cost;
  }

  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json({ error: 'no updates found' }, { status: 400 });
  }

  const { error } = await supabase
    .from('purchases')
    .update(updateObj)
    .eq('purchaseID', id);

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