import { createClient } from '@/lib/supabase/client'

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password kam se kam 8 character ka hona chahiye'
  if (!/[A-Z]/.test(password)) return 'Ek capital letter (A-Z) zaroori hai'
  if (!/[a-z]/.test(password)) return 'Ek small letter (a-z) zaroori hai'
  if (!/[0-9]/.test(password)) return 'Ek number (0-9) zaroori hai'
  return null
}
