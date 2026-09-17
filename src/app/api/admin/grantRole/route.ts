import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const VALID_ROLES = [
    "teamAdministrator",
    "programDirector",
    "president",
    "treasurer",
    "mentorLead",
    "mentor",
    "studentLead",
    "student",
];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uuid, role } = body;

        if (!uuid || typeof uuid !== "string") {
            return Response.json({ error: "Missing or invalid uuid" }, { status: 400 });
        }

        if (!role || !VALID_ROLES.includes(role)) {
            return Response.json({ error: "Missing or invalid role" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log("Auth check:", authData, authError);

        const { data, error } = await supabase
            .from("users")
            .update({ role })
            .eq("user_id", uuid)
            .select("user_id, name, role")
            .single();

        if (error) {
            console.error("Failed to update role:", error);
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