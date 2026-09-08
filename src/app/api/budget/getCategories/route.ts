import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";

interface CategoryData {
  categoryID: string;
  categoryName: string;
  categoryPhase: string;
  categoryBudget: number;
  categorySpent: number;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.from("budget").select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categories: CategoryData[] = data.map((row) => ({
    categoryID: row.categoryID,
    categoryName: row.categoryName,
    categoryPhase: row.categoryPhase,
    categoryBudget: row.categoryBudget,
    categorySpent: row.categorySpent,
    enabled: row.enabled,
  }));

  return NextResponse.json(categories);
}