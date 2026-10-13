import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://supabase.co',
    'sb_publishable_o1kBw1gVWo61KKd6o7iIIW_yWda70EC'
  )
}
