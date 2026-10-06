import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When no Supabase credentials are configured the app runs in local demo mode
// (see store.js), so `supabase` is null there.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isLocalMode = !supabase
