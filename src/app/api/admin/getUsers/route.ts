import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";

interface UserData {
  id: string;
  name: string;
  role: string;
  profilePicture: string;
  slack_userid: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from('users')
      .select('user_id, name, role, picture, slack_userid');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users: UserData[] = (data ?? []).map((row) => ({
      id: row.user_id,
      name: row.name,
      role: row.role,
      profilePicture: row.picture ?? '',
      slack_userid: row.slack_userid ?? '',
    }));

    return Response.json(users);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}