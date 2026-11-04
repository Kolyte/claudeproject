import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function publicConfigValid() {
  if (!url || !key || url.includes('your-project') || key.includes('your-publishable')) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return false
    if (key.startsWith('sb_secret_')) return false
    if (key.startsWith('eyJ') && JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') return false
    return true
  } catch { return false }
}

export const supabase = publicConfigValid() ? createClient(url!, key!) : null
