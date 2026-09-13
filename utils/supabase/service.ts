//NEVER EVER EVER IMPORT INTO A CLIENT ACESSIBLE PLACE
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const createServiceClient = () =>
  createSupabaseClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false },
  });