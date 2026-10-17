'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function PaymentMethodsPage() {
  const [cash, setCash] = useState(true)
  const [upi, setUpi] = useState(true)
  const [card, setCard] = useState(false)
  const [udhaar, setUdhaar] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('payment_methods')
    if (saved) {
      const parsed = JSON.parse(saved)
      setCash(parsed.cash ?? true)
      setUpi(parsed.upi ?? true)
      setCard(parsed.card ?? false)
      setUdhaar(parsed.udhaar ?? true)
    }
  }, [])

  function save() {
    localStorage.setItem('payment_methods', JSON.stringify({ cash, upi, card, udhaar }))
    setMsg('Payment methods saved successfully!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      <p className="text-sm text-gray-600 mb-6">Select karein ki aapki dukaan kaunse payment modes accept karti hai.</p>
      {msg && <div className="mb-4 text-green-600 text-sm font-medium">{msg}</div>}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-gray-900">💵 Cash</p><p className="text-xs text-gray-500">Nakad paisa</p></div>
          <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="w-5 h-5 accent-blue-600" />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-gray-900">📱 UPI / Online</p><p className="text-xs text-gray-500">PhonePe, GPay</p></div>
          <input type="checkbox" checked={upi} onChange={(e) => setUpi(e.target.checked)} className="w-5 h-5 accent-blue-600" />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-gray-900">💳 Debit / Credit Card</p><p className="text-xs text-gray-500">Card swipe</p></div>
          <input type="checkbox" checked={card} onChange={(e) => setCard(e.target.checked)} className="w-5 h-5 accent-blue-600" />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-gray-900">📒 Udhaar / Credit</p><p className="text-xs text-gray-500">Baad me paisa dena hai</p></div>
          <input type="checkbox" checked={udhaar} onChange={(e) => setUdhaar(e.target.checked)} className="w-5 h-5 accent-blue-600" />
        </div>
      </div>
      <button onClick={save} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium shadow-sm">Save Payment Methods</button>
    </main>
  )
}