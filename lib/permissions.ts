'use client'

import { createClient } from '@/lib/supabase/client'

export type Permissions = {
  [key: string]: boolean | undefined
}

// Default permissions (owner ke liye sab true)
export const OWNER_PERMISSIONS: Permissions = {
  sales_view: true,
  sales_create: true,
  sales_edit: true,
  sales_delete: true,
  purchase_view: true,
  purchase_create: true,
  purchase_edit: true,
  purchase_delete: true,
  products_view: true,
  products_create: true,
  products_edit: true,
  products_delete: true,
  customers_view: true,
  customers_create: true,
  customers_edit: true,
  customers_delete: true,
  reports_view: true,
  settings_view: true,
  settings_edit: true,
}

// Worker ka permission check karo
export async function getUserPermissions(businessId: string): Promise<Permissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: member } = await supabase
    .from('business_members')
    .select('role, permissions')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return {}

  // Owner ko sab permission
  if (member.role === 'owner') return OWNER_PERMISSIONS

  return (member.permissions || {}) as Permissions
}

// Single permission check
export function hasPermission(perms: Permissions, key: string): boolean {
  return perms[key] === true
}
