'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Plan = {
  id: string
  plan_code: string
  plan_name: string
  plan_tier: string
  duration_days: number
  price: number
  max_workers: number
  max_businesses: number
  display_order: number
}

export default function PricingPage() {
  const supabase = createClient()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<'basic' | 'standard' | 'premium' | 'enterprise'>('basic')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      setPlans((data ?? []) as Plan[])
      setLoading(false)
    }
    load()
  }, [])

  const tierPlans = plans.filter((p) => p.plan_tier === selectedTier)

  const tierInfo = {
    basic: { name: 'Basic', desc: '1 business, 2 workers — chhoti dukaan ke liye' },
    standard: { name: 'Standard', desc: '2 businesses, 5 workers — badhti dukaan ke liye' },
    premium: { name: 'Premium', desc: '5 businesses, 15 workers — bade business ke liye' },
    enterprise: { name: 'Enterprise', desc: '10 businesses, 30 workers — multi-business ke liye' },
  }

  if (loading) return <main className="p-4">Loading...</main>

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <Link href="/" className="text-blue-600 text-sm">← Home</Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Apna Plan Chuno</h1>
          <p className="mt-2 text-gray-600">
            15 din ka free trial khatam hone ke baad, apna plan choose karein
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {(['basic', 'standard', 'premium', 'enterprise'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`rounded-full px-5 py-2 text-sm font-medium ${
                selectedTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              {tierInfo[tier].name}
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">{tierInfo[selectedTier].desc}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {tierPlans.map((plan) => {
            const months = Math.round(plan.duration_days / 30)
            const perMonth = Math.round(plan.price / months)
            return (
              <div
                key={plan.id}
                className={`rounded-2xl bg-white p-6 shadow ${
                  months === 12 ? 'border-2 border-blue-600' : ''
                }`}
              >
                {months === 12 && (
                  <div className="mb-3 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                    SABSE SASTA
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {months === 1 ? '1 Mahina' : months === 3 ? '3 Mahine' : '1 Saal'}
                </h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="ml-1 text-sm text-gray-500">
                    /{months === 1 ? 'month' : months === 3 ? '3m' : 'year'}
                  </span>
                </div>
                {months > 1 && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    ₹{perMonth}/month
                  </p>
                )}
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li>✅ {plan.max_workers} workers</li>
                  <li>✅ {plan.max_businesses} business{plan.max_businesses > 1 ? 'es' : ''}</li>
                  <li>✅ Unlimited bills</li>
                  <li>✅ GST invoice</li>
                  <li>✅ Stock management</li>
                  <li>✅ Reports</li>
                </ul>
                <button
                  type="button"
                  onClick={() => alert('Payment gateway agle phase me add hoga.')}
                  className="mt-6 w-full rounded bg-blue-600 px-4 py-3 text-white font-medium"
                >
                  Ye Plan Chuno
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">Saare Plans ki Tulna</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Feature</th>
                  <th className="p-2 text-center">Basic</th>
                  <th className="p-2 text-center">Standard</th>
                  <th className="p-2 text-center">Premium</th>
                  <th className="p-2 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-2">Workers</td>
                  <td className="p-2 text-center">2</td>
                  <td className="p-2 text-center">5</td>
                  <td className="p-2 text-center">15</td>
                  <td className="p-2 text-center">30</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">Businesses</td>
                  <td className="p-2 text-center">1</td>
                  <td className="p-2 text-center">2</td>
                  <td className="p-2 text-center">5</td>
                  <td className="p-2 text-center">10</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">GST Invoice</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">Stock Management</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">Reports</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">Multi-Branch</td>
                  <td className="p-2 text-center">❌</td>
                  <td className="p-2 text-center">❌</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">CA Access</td>
                  <td className="p-2 text-center">❌</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                  <td className="p-2 text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          * Payment gateway next phase me aayega. Abhi test mode me sab free.
        </p>
      </div>
    </main>
  )
}
