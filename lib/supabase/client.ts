import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://agyoxbweubvsvhbovbqi.supabase.co',
    'sb_publishable_ltgvMwwPib7S2ZVr4vK4WA_aqN8IqaH'
  )
}
