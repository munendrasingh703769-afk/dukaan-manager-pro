'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Referrer = { code: string; name: string }

export default function ReferralPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [myReferralCode, setMyReferralCode] = useState('')
  const [referredBy, setReferredBy] = useState<Referrer | null>(null)
  const [myReferrals, setMyReferrals] = useState<Array<{ name: string; code: string }>>([])

  useEffect(() => {
    loadReferralData()
  }, [])

  async function loadReferralData() {
    const businessId = getCurrentBusinessId()
    if (!businessId) {
      setLoading(false)
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('business_code, referred_by_code')
      .eq('id', businessId)
      .single()

    if (!business) {
      setLoading(false)
      return
    }

    setMyReferralCode(business.business_code || '')

    if (business.referred_by_code) {
      const { data: referrer } = await supabase
        .from('businesses')
        .select('name, business_code')
        .eq('business_code', business.referred_by_code)
        .maybeSingle()
      if (referrer) {
        setReferredBy({
          code: referrer.business_code || '',
          name: referrer.name || 'Unknown',
        })
      }
    }

    if (business.business_code) {
      const { data: refs } = await supabase
        .from('businesses')
        .select('name, business_code')
        .eq('referred_by_code', business.business_code)
      if (refs && refs.length > 0) {
        setMyReferrals(
          refs.map((r: any) => ({
            name: r.name || 'Untitled',
            code: r.business_code || '',
          }))
        )
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <main className="p-4">Loading...</main>
  }

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🎁 Referral Program</h1>
        <Link href="/business" className="text-blue-600 text-sm">
          ← Business Profile
        </Link>
      </div>

      <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
        <label className="block text-sm font-medium text-purple-800">
          Aapka Code
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-lg border-2 border-purple-400 bg-white px-4 py-2 font-mono font-bold text-purple-900">
            {myReferralCode}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(myReferralCode)
              alert('Code copied: ' + myReferralCode)
            }}
            className="rounded bg-purple-600 px-3 py-2 text-sm text-white"
          >
            📋 Copy
          </button>
          <button
            type="button"
            onClick={() => {
              const msg = `Dukaan Manager Pro try karein! GST bill, stock, udhaar sab manage hota hai.\n\nSignup link: ${window.location.origin}/signup\nReferral code: ${myReferralCode}\n\nDono ko 1 mahina FREE milega!`
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
            }}
            className="rounded bg-green-600 px-3 py-2 text-sm text-white"
          >
            📱 Share
          </button>
        </div>
        <p className="mt-2 text-xs text-purple-700">
          💰 Dost ko bhejein — jab wo plan kharide, dono ko 1 mahina free milega!
        </p>

        <div className="mt-4 rounded border border-purple-200 bg-white p-3">
          {referredBy ? (
            <p className="text-sm text-gray-800">
              ✅ Aapne use kiya: <span className="font-mono font-bold">{referredBy.code}</span>{' '}
              ({referredBy.name})
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              ❌ Aapne kisi ka referral code use nahi kiya
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-purple-800">
            📊 Aapke code se aaye: {myReferrals.length} log
          </p>
          {myReferrals.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {myReferrals.map((r, i) => (
                <li key={i} className="rounded bg-white px-3 py-1">
                  • {r.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}