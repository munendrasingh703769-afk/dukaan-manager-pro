'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'
import { signOut } from '@/lib/auth'

type BusinessInfo = {
  name: string
  owner_name: string | null
  city: string | null
  state: string | null
}

type SettingsCard = {
  title: string
  desc: string
  emoji: string
  href: string | null
  bg: string
}

const CARDS: SettingsCard[] = [
  { title: 'Business Profile', desc: 'Shop details, address and GST info.', emoji: '🏢', href: '/settings/business', bg: 'bg-blue-100 text-blue-700' },
  { title: 'GST & Tax', desc: 'GST settings, HSN codes and tax config.', emoji: '📋', href: '/settings/gst', bg: 'bg-purple-100 text-purple-700' },
  { title: 'Invoice & Print', desc: 'Invoice format, print settings and templates.', emoji: '🖨️', href: '/settings/invoice', bg: 'bg-teal-100 text-teal-700' },
  { title: 'Bank & UPI', desc: 'Bank details and UPI configuration.', emoji: '🏦', href: '/settings/bank', bg: 'bg-indigo-100 text-indigo-700' },
  { title: 'Users & Permissions', desc: 'Manage staff, roles and access rights.', emoji: '👥', href: '/settings/workers', bg: 'bg-violet-100 text-violet-700' },
  { title: 'Notifications', desc: 'Alerts, reminders and app notifications.', emoji: '🔔', href: '/settings/notifications', bg: 'bg-red-100 text-red-700' },
  { title: 'Data Backup', desc: 'Backup your data and restore when needed.', emoji: '☁️', href: '/settings/backup', bg: 'bg-green-100 text-green-700' },
  { title: 'Offline Sync', desc: 'Sync data between offline and online mode.', emoji: '🔄', href: null, bg: 'bg-cyan-100 text-cyan-700' },
  { title: 'Financial Year', desc: 'Set and manage your financial year.', emoji: '📅', href: '/settings/financial-year', bg: 'bg-amber-100 text-amber-700' },
  { title: 'Payment Methods', desc: 'Cash, UPI, Card and other payment options.', emoji: '💳', href: '/settings/payment-methods', bg: 'bg-emerald-100 text-emerald-700' },
  { title: 'Referral Program', desc: 'Invite friends and earn rewards.', emoji: '🎁', href: '/settings/referral', bg: 'bg-pink-100 text-pink-700' },
  { title: 'Help & Support', desc: 'FAQs, contact us and app assistance.', emoji: '🎧', href: null, bg: 'bg-sky-100 text-sky-700' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    loadBusiness()
  }, [])

  async function loadBusiness() {
    const businessId = getCurrentBusinessId()
    if (!businessId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('businesses')
      .select('name, owner_name, city, state')
      .eq('id', businessId)
      .single()

    if (data) setBusiness(data as BusinessInfo)
    setLoading(false)
  }

  function handleComingSoon(title: string) {
    alert(title + ' — Coming soon!')
  }

  async function handleLogout() {
    if (!confirm('Logout karein?')) return
    setLoggingOut(true)
    localStorage.removeItem('current_business_id')
    await signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <main className="p-4">Loading...</main>
  }

  return (
    <main className="p-4 pb-24">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">⚙️</span>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <p className="text-gray-500 text-sm mb-4">
        Manage your business and app preferences
      </p>

      {business && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-2xl">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{business.name}</p>
            {business.owner_name && (
              <p className="text-sm text-gray-600 truncate">👤 {business.owner_name}</p>
            )}
            {(business.city || business.state) && (
              <p className="text-sm text-gray-600 truncate">
                📍 {[business.city, business.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <Link
            href="/settings/business"
            className="rounded-lg border border-blue-600 text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap"
          >
            ✏️ Edit
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) => {
          const Inner = (
            <div className="rounded-xl border border-gray-200 bg-white p-3 h-full flex flex-col">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${card.bg}`}>
                {card.emoji}
              </div>
              <p className="mt-2 font-semibold text-gray-900 text-sm leading-tight">
                {card.title}
              </p>
              <p className="mt-1 text-xs text-gray-500 leading-snug flex-1">
                {card.desc}
              </p>
            </div>
          )

          return card.href ? (
            <Link key={card.title} href={card.href} className="block">
              {Inner}
            </Link>
          ) : (
            <button
              key={card.title}
              type="button"
              onClick={() => handleComingSoon(card.title)}
              className="block text-left w-full"
            >
              {Inner}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-8 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-medium"
      >
        {loggingOut ? 'Logging out...' : '🚪 Logout'}
      </button>
    </main>
  )
}