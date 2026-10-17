'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function InvoiceSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [prefix, setPrefix] = useState('')
  const [terms, setTerms] = useState('')

  useEffect(() => {
    async function load() {
      const bid = getCurrentBusinessId()
      if (!bid) return setLoading(false)
      const { data } = await supabase.from('businesses').select('invoice_prefix, terms').eq('id', bid).single()
      if (data) {
        setPrefix(data.invoice_prefix || '')
        setTerms(data.terms || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    const bid = getCurrentBusinessId()
    if (!bid) return
    setSaving(true)
    await supabase.from('businesses').update({
      invoice_prefix: prefix || null,
      terms: terms || null,
    }).eq('id', bid)
    setMsg('Invoice Details Saved!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <main className="p-4">Loading...</main>

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Invoice & Print</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      {msg && <div className="mb-4 text-green-600 text-sm font-medium">{msg}</div>}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium">Invoice Prefix</label>
          <input value={prefix} onChange={e => setPrefix(e.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase" placeholder="INV / BILL" />
          <p className="text-xs text-gray-500 mt-1">Ye bill number ke aage lagega (jaise: INV-001)</p>
        </div>
        <div>
          <label className="block text-sm font-medium">Terms & Conditions (Bill pe print hoga)</label>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-2" placeholder="Goods once sold will not be taken back..." />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium">
        {saving ? 'Saving...' : 'Save Invoice Settings'}
      </button>
    </main>
  )
}