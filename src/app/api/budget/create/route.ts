import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'

interface ItemData {
    catagoryName: string;
    catagoryPhase: string;
    catagoryBudget: number;
    enabled?: boolean;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const body: ItemData = await request.json();
    const { catagoryName, catagoryPhase, catagoryBudget, enabled } = body;

    if (!catagoryName || !catagoryPhase || !catagoryBudget) {
        return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
    }

    const { error } = await supabase.from('budget').insert({
        categoryID: (catagoryName + "-" + catagoryBudget),
        categoryName: catagoryName,
        categoryPhase: catagoryPhase,
        categoryBudget: catagoryBudget,
        categorySpent: 0.00,
        enabled: enabled,
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