'use client'

import { createClient } from '@/lib/supabase/client'

// Worker ka permission check karo
export async function getUserPermissions(businessId: string): Promise<Permissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  // 🚀 SMART FIX: Pehle check karo ki kya yeh user business ka direct owner hai?
  if (businessId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single()
      
    // Agar owner hai, toh use seedha full access do (bina table me dekhe)
    if (biz && biz.owner_id === user.id) {
      return OWNER_PERMISSIONS
    }
  }

  // Agar owner nahi hai, toh business_members table check karo
  const { data: member } = await supabase
    .from('business_members')
    .select('role, permissions')
    .eq('business_id', businessId || '')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return {}

  if (member.role === 'owner') return OWNER_PERMISSIONS

  return (member.permissions || {}) as Permissions
}

// Single permission check
export function hasPermission(perms: Permissions, key: string): boolean {
  if (!perms) return false;
  // Agar "all" true hai toh matlab yeh owner hai
  if (perms.all === true) return true;
  
  return perms[key] === true
}