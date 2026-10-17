'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const UPI_ID = '9808651905@ybl'
const WHATSAPP_NUMBER = '919808651905'

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

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const planCodeParam = params.plan as string

  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (err || !data) {
        setError('Plans load nahi hue')
        setLoading(false)
        return
      }

      const allPlans = data as Plan[]
      setPlans(allPlans)

      // Pehle plan_code param dekho, warna pehla plan
      const fromParam = allPlans.find((p) => p.plan_code === planCodeParam)
      setSelected(fromParam || allPlans[0] || null)
      setLoading(false)
    }
    load()
  }, [planCodeParam])

  function choosePlan(code: string) {
    const p = plans.find((x) => x.plan_code === code)
    if (p) setSelected(p)
    router.replace(`/pay/${code}`)
  }

  if (loading) return <main className="p-4">Loading...</main>
  if (error || !selected) return <main className="p-4 text-red-600">{error || 'Not found'}</main>

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent('VyaparSetu')}&am=${selected.price}&cu=INR&tn=${encodeURIComponent(selected.plan_name)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`
  const waText = encodeURIComponent(
    `Namaste! Maine ${selected.plan_name} (₹${selected.price}) ka payment kiya hai. Screenshot bhej raha hu.`
  )

  const basicPlans = plans.filter((p) => p.plan_tier === 'basic')
  const standardPlans = plans.filter((p) => p.plan_tier === 'standard')
  const premiumPlans = plans.filter((p) => p.plan_tier === 'premium')
  const enterprisePlans = plans.filter((p) => p.plan_tier === 'enterprise')

  const groups = [
    { name: 'Basic', plans: basicPlans },
    { name: 'Standard', plans: standardPlans },
    { name: 'Premium', plans: premiumPlans },
    { name: 'Enterprise', plans: enterprisePlans },
  ]

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-md">
        <Link href="/pricing" className="text-blue-600 text-sm">← Plans</Link>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Apna Plan Chuno</h2>
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="text-xs font-bold text-gray-500 uppercase mt-2">{g.name}</div>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {g.plans.map((p) => {
                    const months = Math.round(p.duration_days / 30)
                    const label = months === 1 ? '1M' : months === 3 ? '3M' : '1Y'
                    const isSel = selected.id === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => choosePlan(p.plan_code)}
                        className={`rounded border p-2 text-xs ${
                          isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
                        }`}
                      >
                        <div className="font-bold">{label}</div>
                        <div>₹{p.price}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-gray-900">Payment Karein</h1>
          <p className="mt-1 text-sm text-gray-600">{selected.plan_name}</p>

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-center">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-3xl font-bold text-blue-700 mt-1">₹{selected.price}</div>
            <div className="text-xs text-gray-500 mt-1">
              {selected.duration_days === 30 ? '1 Month' : selected.duration_days === 90 ? '3 Months' : '1 Year'} • {selected.max_workers} workers • {selected.max_businesses} business{selected.max_businesses > 1 ? 'es' : ''}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">
              QR Scan karein — kisi bhi UPI app se
            </div>
            <img
              src={qrUrl}
              alt="UPI QR"
              className="mx-auto rounded-lg border"
              style={{ maxWidth: '260px' }}
            />
          </div>

          <div className="mt-6 rounded-lg border bg-gray-50 p-3">
            <div className="text-xs text-gray-600 mb-1">Ya UPI ID par bhejein:</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-sm">{UPI_ID}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(UPI_ID)
                  alert('UPI ID copied!')
                }}
                className="rounded bg-gray-800 px-3 py-1 text-xs text-white"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Payment ke baad — Screenshot bhejein
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-green-600 px-4 py-3 text-center text-white font-medium"
            >
              📱 WhatsApp pe Screenshot Bhejein
            </a>
          </div>

          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
            <b>Note:</b> Payment ke 10 minute ke andar aapka plan activate ho jayega.
            WhatsApp pe screenshot bhejna zaroori hai.
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Payment ke baad koi problem ho to WhatsApp karein: +91 98086 51905
        </p>
      </div>
    </main>
  )
}
