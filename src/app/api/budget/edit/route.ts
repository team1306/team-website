import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { createServiceClient } from "../../../../../utils/supabase/service";
import { cookies } from "next/headers";
import { recalculateCategorySpent } from "@/lib/budget";

const PHASES = ["Offseason", "Season", "Champs"];

export interface BudgetEditData {
    categoryID: string;
    categoryName?: string;
    categoryPhase?: string;
    categoryBudget?: number;
    enabled?: boolean;
}

export async function PATCH(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body: BudgetEditData = await request.json();
    const { categoryID, categoryName, categoryPhase, categoryBudget, enabled } = body;

    if (!categoryID) {
        return NextResponse.json({ error: "categoryID not found" }, { status: 400 });
    }

    const updateObj: Record<string, unknown> = {};

    if (categoryName !== undefined) {
        const trimmed = String(categoryName).trim();
        if (!trimmed) {
            return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
        }
        updateObj.categoryName = trimmed;
    }

    if (categoryPhase !== undefined) {
        if (!PHASES.includes(categoryPhase)) {
            return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
        }
        updateObj.categoryPhase = categoryPhase;
    }

    if (categoryBudget !== undefined) {
        const parsed = Number(categoryBudget);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return NextResponse.json({ error: "Invalid budget amount" }, { status: 400 });
        }
        updateObj.categoryBudget = parsed;
    }

    if (enabled !== undefined) {
        if (typeof enabled !== "boolean") {
            return NextResponse.json({ error: "Invalid enabled value" }, { status: 400 });
        }
        updateObj.enabled = enabled;
    }

    if (Object.keys(updateObj).length === 0) {
        return NextResponse.json({ error: "no updates found" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("budget")
        .select()
        .eq("categoryID", categoryID)
        .maybeSingle();

    if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing) {
        return NextResponse.json({ error: "No budget category found with that id" }, { status: 404 });
    }

    const newName = (updateObj.categoryName as string | undefined) ?? existing.categoryName;
    const newPhase = (updateObj.categoryPhase as string | undefined) ?? existing.categoryPhase;
    const newID = `${newPhase}-${newName}`;
    const idChanged = newID !== categoryID;

    if (idChanged) {
        if (!process.env.SUPABASE_SECRET_KEY) {
            return NextResponse.json(
                { error: "Renaming a category requires SUPABASE_SECRET_KEY to be set" },
                { status: 500 }
            );
        }

        const { data: clash, error: clashError } = await supabase
            .from("budget")
            .select("categoryID")
            .eq("categoryID", newID)
            .maybeSingle();

        if (clashError) {
            return NextResponse.json({ error: clashError.message }, { status: 500 });
        }

        if (clash) {
            return NextResponse.json({ error: "A category with that name and phase already exists" }, { status: 409 });
        }

        updateObj.categoryID = newID;
    }

    const { data: updated, error } = await supabase
        .from("budget")
        .update(updateObj)
        .eq("categoryID", categoryID)
        .select();

    if (error) {
        if (error.code === "42501") {
            return NextResponse.json({ error: "Auth Error - Acess Denied" }, { status: 403 });
        }
        if (error.code === "23505") {
            return NextResponse.json({ error: "A category with that name and phase already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
        return NextResponse.json({ error: "Auth Error - Acess Denied" }, { status: 403 });
    }

    let budgetWarning: string | null = null;

    if (idChanged) {
        const service = createServiceClient();

        const { error: moveError } = await service
            .from("purchases")
            .update({ catagory: newID })
            .eq("catagory", categoryID);

        if (moveError) {
            await service
                .from("budget")
                .update({
                    categoryID: existing.categoryID,
                    categoryName: existing.categoryName,
                    categoryPhase: existing.categoryPhase,
                    categoryBudget: existing.categoryBudget,
                    enabled: existing.enabled,
                })
                .eq("categoryID", newID);

            return NextResponse.json(
                { error: "Failed to move existing orders to the renamed category, change was reverted" },
                { status: 500 }
            );
        }

        budgetWarning = await recalculateCategorySpent([newID]);
        if (budgetWarning) {
            console.error("Failed to update budget spent:", budgetWarning);
        }
    }

    return NextResponse.json(
        { message: "Success", category: updated[0], ...(budgetWarning ? { budgetWarning } : {}) },
        { status: 200 }
    );
}