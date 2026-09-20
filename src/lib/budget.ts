import { createServiceClient } from "../../utils/supabase/service";

const SPENT_STATUSES = ["purchased", "recived"];

export async function recalculateCategorySpent(
  categoryIDs: Array<string | null | undefined>
): Promise<string | null> {
  const ids = Array.from(new Set(categoryIDs.filter((id): id is string => !!id)));
  if (ids.length === 0) return null;

  const service = createServiceClient();
  const errors: string[] = [];

  for (const id of ids) {
    const { data, error } = await service
      .from("purchases")
      .select("cost")
      .eq("catagory", id)
      .in("status", SPENT_STATUSES);

    if (error) {
      errors.push(error.message);
      continue;
    }

    const cents = (data ?? []).reduce(
      (sum, row) => sum + Math.round(Number(row.cost ?? 0) * 100),
      0
    );

    const { error: updateError } = await service
      .from("budget")
      .update({ categorySpent: cents / 100 })
      .eq("categoryID", id);

    if (updateError) errors.push(updateError.message);
  }

  return errors.length > 0 ? errors.join("; ") : null;
}