import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://ugwyq1thxdkf1kmccbgl.supabase.co',
    'sb_publishable_o1kBw1gVWo61KKd6o7iIIW_yWda70EC'
  )
}
