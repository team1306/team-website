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
    if (!user || (user.is_anonymous && process.env.NODE_ENV !== "development")) throw new Error("Not authenticated");
    // Local anonymous sessions can exercise approval controls without elevating
    // anonymous users outside the development environment.
    const localAnonymousRole = user.is_anonymous && process.env.NODE_ENV === "development"
        ? "studentLead"
        : null;

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
        if (insertError) {
            // A database trigger or another request may have created the profile
            // after the initial read. Resolve that unique-key race by reading it
            // again instead of failing the newly signed-in user.
            if (insertError.code !== "23505") throw insertError;

            const { data: existing, error: retryError } = await supabase
                .from("users")
                .select("name, role, picture, slack_userid")
                .eq("user_id", user.id)
                .maybeSingle();

            if (retryError) throw retryError;
            if (existing) {
                return {
                    id: user.id,
                    name: existing.name ?? user.user_metadata?.name ?? "Unknown",
                    role: localAnonymousRole ?? existing.role ?? "unknown",
                    profilePicture: existing.picture ?? user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? "",
                    slack_userid: existing.slack_userid ?? user.user_metadata?.sub ?? "",
                };
            }

            // Anonymous test sessions share the same default display name. The
            // users table requires unique names, so retry with a stable suffix
            // when another test profile already claimed that name.
            const baseName = user.user_metadata?.name?.trim() || "User";
            const { data: uniquelyNamed, error: retryInsertError } = await supabase
                .from("users")
                .insert({
                    user_id: user.id,
                    name: `${baseName} ${user.id.slice(0, 6)}`,
                    role: "student",
                    picture: user.user_metadata?.picture,
                    slack_userid: user.user_metadata?.sub,
                })
                .select("name, role, picture, slack_userid")
                .single();

            if (retryInsertError) throw retryInsertError;

            return {
                id: user.id,
                name: uniquelyNamed.name,
                role: localAnonymousRole ?? uniquelyNamed.role,
                profilePicture: uniquelyNamed.picture ?? user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? "",
                slack_userid: uniquelyNamed.slack_userid ?? user.user_metadata?.sub ?? "",
            };
        }
        return {
            id: user.id,
            name: created.name,
            role: localAnonymousRole ?? created.role,
            profilePicture: created.picture,
            slack_userid: created.slack_userid,
        };
    }

    return {
        id: user.id,
        name: data?.name ?? user.user_metadata?.name ?? "Unknown",
        role: localAnonymousRole ?? data?.role ?? "unknown",
        profilePicture: data?.picture ?? user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? "",
        slack_userid: data?.slack_userid ?? user.user_metadata?.sub ?? "",
    };
}
