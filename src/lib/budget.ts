import { createServiceClient } from "../../utils/supabase/service";

export async function recalculateCategorySpent(
  categoryIDs: Array<string | null | undefined>
): Promise<string | null> {
  const ids = Array.from(new Set(categoryIDs.filter((id): id is string => !!id)));
  if (ids.length === 0) return null;

  const service = createServiceClient();
  const errors: string[] = [];

  for (const id of ids) {
    const { error } = await service.rpc("recalculate_category_spent", {
      p_category_id: id,
    });
    if (error) errors.push(error.message);
  }

  return errors.length > 0 ? errors.join("; ") : null;
}
