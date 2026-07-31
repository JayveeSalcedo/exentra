import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Fallback placeholders so the app doesn't crash at module load time.
// Real requests will still fail, but the UI will render and show a proper error.
const url = supabaseUrl ?? 'https://placeholder.supabase.co'
const key = supabaseAnonKey ?? 'placeholder-key'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Exentra] Missing Supabase env vars.\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file ' +
    'and that you restarted the dev server after adding them.'
  )
}

export const supabase = createClient(url, key)
