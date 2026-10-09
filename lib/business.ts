'use client'

const STORAGE_KEY = 'current_business_id'

export function getCurrentBusinessId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setCurrentBusinessId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, id)
  window.dispatchEvent(new Event('business-changed'))
}

export function clearCurrentBusinessId() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}


export function bizId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('current_business_id') || ''
}
