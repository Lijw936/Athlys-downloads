import { createClient } from "@supabase/supabase-js";

// Pinned Supabase client used by Auth and the Realtime WebSocket in the Android WebView.
window.supabase = Object.assign(window.supabase || {}, { createClient });
