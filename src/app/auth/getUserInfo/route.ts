'use server'

import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
}

export async function getUserInfo(): Promise<UserData> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("users")
        .select("name, role")
        .eq("user_id", user.id)
        .single();

    if (error) throw error;

    return {
        id: user.id,
        name: data?.name ?? user.user_metadata?.name ?? "Unknown",
        role: data?.role ?? "unknown",
        profilePicture: user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? "",
    };
}