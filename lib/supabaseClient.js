import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project → Settings → API
// Put them in a `.env.local` file (never commit that file):
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
