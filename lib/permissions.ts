'use client'

import { createClient } from '@/lib/supabase/client'

// Type definition me 'all' aur index signature dono add kar diye hain
export type Permissions = {
  all?: boolean;
  sales_view?: boolean;
  sales_create?: boolean;
  sales_edit?: boolean;
  sales_delete?: boolean;
  purchase_view?: boolean;
  purchase_create?: boolean;
  purchase_edit?: boolean;
  purchase_delete?: boolean;
  products_view?: boolean;
  products_create?: boolean;
  products_edit?: boolean;
  products_delete?: boolean;
  customers_view?: boolean;
  customers_create?: boolean;
  customers_edit?: boolean;
  customers_delete?: boolean;
  reports_view?: boolean;
  settings_view?: boolean;
  settings_edit?: boolean;
  [key: string]: boolean | undefined;
}

// Default permissions (owner ke liye sab true)
export const OWNER_PERMISSIONS: Permissions = {
  all: true,
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

// Function to get user permissions
export async function getUserPermissions(businessId: string): Promise<Permissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return {}

  // 1. Check if the user is the direct owner of this business
  if (businessId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single()
      
    if (biz && biz.owner_id === user.id) {
      return OWNER_PERMISSIONS
    }
  }

  // 2. If not owner, check the business_members table for staff permissions
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

// Function to check a specific permission
export function hasPermission(perms: Permissions | null | undefined, key: string): boolean {
  if (!perms) return false;
  if (perms.all === true) return true;
  return perms[key] === true;
}