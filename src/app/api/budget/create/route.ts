import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from 'next/headers'

interface ItemData {
    categoryName: string;
    categoryPhase: string;
    categoryBudget: number;
    enabled?: boolean;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const body: ItemData = await request.json();
    const { categoryName, categoryPhase, categoryBudget, enabled } = body;

    if (!categoryName || !categoryPhase || !categoryBudget) {
        return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
    }

    const { error } = await supabase.from('budget').insert({
        categoryID: (categoryPhase + "-" + categoryName),
        categoryName: categoryName,
        categoryPhase: categoryPhase,
        categoryBudget: categoryBudget,
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