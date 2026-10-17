'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function BankSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  useEffect(() => {
    async function load() {
      const bid = getCurrentBusinessId()
      if (!bid) return setLoading(false)
      const { data } = await supabase.from('businesses').select('bank_name, bank_branch, bank_account, ifsc_code, upi_id').eq('id', bid).single()
      if (data) {
        setBankName(data.bank_name || '')
        setBankBranch(data.bank_branch || '')
        setBankAccount(data.bank_account || '')
        setIfscCode(data.ifsc_code || '')
        setUpiId(data.upi_id || '')
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
      bank_name: bankName || null,
      bank_branch: bankBranch || null,
      bank_account: bankAccount || null,
      ifsc_code: ifscCode.toUpperCase() || null,
      upi_id: upiId || null,
    }).eq('id', bid)
    setMsg('Bank Details Saved!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <main className="p-4">Loading...</main>

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bank & UPI</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      {msg && <div className="mb-4 text-green-600 text-sm font-medium">{msg}</div>}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <div><label className="block text-sm font-medium">Bank Name</label><input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="ICICI Bank" /></div>
        <div><label className="block text-sm font-medium">Branch</label><input value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="Bareilly Main" /></div>
        <div><label className="block text-sm font-medium">Account Number</label><input value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="1234567890" /></div>
        <div><label className="block text-sm font-medium">IFSC Code</label><input value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase" placeholder="ICIC0001234" /></div>
        <div><label className="block text-sm font-medium">UPI ID</label><input value={upiId} onChange={e => setUpiId(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="aapna@upi" /></div>
      </div>
      <button onClick={save} disabled={saving} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium">
        {saving ? 'Saving...' : 'Save Bank Details'}
      </button>
    </main>
  )
}