'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function GSTSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [gstNumber, setGstNumber] = useState('')
  const [gstType, setGstType] = useState('regular')
  const [panNumber, setPanNumber] = useState('')

  useEffect(() => {
    async function load() {
      const bid = getCurrentBusinessId()
      if (!bid) return setLoading(false)
      const { data } = await supabase.from('businesses').select('gst_number, gst_type, pan_number').eq('id', bid).single()
      if (data) {
        setGstNumber(data.gst_number || '')
        setGstType(data.gst_type || 'regular')
        setPanNumber(data.pan_number || '')
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
      gst_number: gstNumber.toUpperCase() || null,
      gst_type: gstType,
      pan_number: panNumber.toUpperCase() || null,
    }).eq('id', bid)
    setMsg('GST Details Saved!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <main className="p-4">Loading...</main>

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">GST & Tax</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      {msg && <div className="mb-4 text-green-600 text-sm font-medium">{msg}</div>}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium">GST Number</label>
          <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase" placeholder="24AAAAA0000A1Z5" />
        </div>
        <div>
          <label className="block text-sm font-medium">GST Type</label>
          <select value={gstType} onChange={e => setGstType(e.target.value)} className="mt-1 w-full rounded-lg border p-2">
            <option value="regular">Regular</option>
            <option value="composition">Composition</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">PAN Number</label>
          <input value={panNumber} onChange={e => setPanNumber(e.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase" placeholder="ABCDE1234F" />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium">
        {saving ? 'Saving...' : 'Save GST Details'}
      </button>
    </main>
  )
}