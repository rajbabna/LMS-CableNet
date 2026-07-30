// ===========================================================
// Fill these in with YOUR Supabase project's values.
// Find them in Supabase dashboard → Project Settings → API.
// The "anon public" key is safe to expose in client-side code —
// that's what it's designed for. Never put the "service_role" key here.
// ===========================================================
const SUPABASE_URL = "https://mantjzpfhikezztonrga.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t5GiOxBzTlWkRDR0pS0f0g_L1JhYfI0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
