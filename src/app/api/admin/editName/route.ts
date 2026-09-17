import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uuid, name } = body;

    if (!uuid || typeof uuid !== "string") {
      return Response.json({ error: "Missing or invalid uuid" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Missing or invalid name" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("user_id", uuid)
      .select("user_id, name")
      .single();

    if (error) {
      console.error("Failed to update name:", error);
      return Response.json({ error: error.message }, { status: 403 });
    }

    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}