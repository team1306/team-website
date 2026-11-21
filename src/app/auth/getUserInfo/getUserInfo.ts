'use server'

import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

interface UserData {
    id: string;
    name: string;
    role: string;
    profilePicture: string;
    slack_userid: string;
}

export async function getUserInfo(): Promise<UserData> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("users")
        .select("name, role, picture, slack_userid")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        const { data: created, error: insertError } = await supabase
            .from("users")
            .insert({
                user_id: user.id,
                name: user.user_metadata?.name,
                role: "student",
                picture: user.user_metadata?.picture,
                slack_userid: user.user_metadata?.sub,
            })
            .select("name, role, picture, slack_userid")
            .single();
        if (insertError) throw insertError;
        return {
            id: user.id,
            name: created.name,
            role: created.role,
            profilePicture: created.picture,
            slack_userid: created.slack_userid,
        };
    }

    return {
        id: user.id,
        name: data?.name ?? user.user_metadata?.name ?? "Unknown",
        role: data?.role ?? "unknown",
        profilePicture: data?.picture ?? user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? "",
        slack_userid: data?.slack_userid ?? user.user_metadata?.sub ?? "",
    };
}