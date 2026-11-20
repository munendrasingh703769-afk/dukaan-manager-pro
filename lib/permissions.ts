'use client'

import { createClient } from '@/lib/supabase/client'
import { getSubscriptionDetails } from '@/lib/planLimits'

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
  is_expired?: boolean;
  [key: string]: boolean | undefined;
}

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
  is_expired: false,
}

export const EXPIRED_LOCKED_PERMISSIONS: Permissions = {
  all: false,
  sales_view: true,
  sales_create: false,
  sales_edit: false,
  sales_delete: false,
  purchase_view: true,
  purchase_create: false,
  purchase_edit: false,
  purchase_delete: false,
  products_view: true,
  products_create: false,
  products_edit: false,
  products_delete: false,
  customers_view: true,
  customers_create: false,
  customers_edit: false,
  customers_delete: false,
  reports_view: false,
  settings_view: true,
  settings_edit: false,
  is_expired: true,
}

export async function getUserPermissions(businessId: string): Promise<Permissions> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return {}

  if (businessId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single()

    if (biz && biz.owner_id === user.id) {
      const sub = await getSubscriptionDetails(supabase, user.id, 'owner')
      if (sub.isExpired) {
        return EXPIRED_LOCKED_PERMISSIONS
      }
      return OWNER_PERMISSIONS
    }
  }

  const { data: member } = await supabase
    .from('business_members')
    .select('role, permissions')
    .eq('business_id', businessId || '')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return {}

  if (member.role === 'owner') {
    const sub = await getSubscriptionDetails(supabase, user.id, 'owner')
    return sub.isExpired ? EXPIRED_LOCKED_PERMISSIONS : OWNER_PERMISSIONS
  }

  return (member.permissions || {}) as Permissions
}

export function hasPermission(perms: Permissions | null | undefined, key: string): boolean {
  if (!perms) return false;
  if (perms.is_expired) return false;
  if (perms.all === true) return true;
  return perms[key] === true;
}
