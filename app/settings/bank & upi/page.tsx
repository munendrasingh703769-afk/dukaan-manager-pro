'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function BankSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  useEffect(() => {
    loadBankDetails()
  }, [])

  async function loadBankDetails() {
    const businessId = getCurrentBusinessId()
    if (!businessId) {
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('businesses')
      .select('bank_name, bank_branch, bank_account, ifsc_code, upi_id')
      .eq('id', businessId)
      .single()

    if (data) {
      setBankName(data.bank_name || '')
      setBankBranch(data.bank_branch || '')
      setBankAccount(data.bank_account || '')
      setIfscCode(data.ifsc_code || '')
      setUpiId(data.upi_id || '')
    }
    setLoading(false)
  }

  async function saveBankDetails() {
    const businessId = getCurrentBusinessId()
    if (!businessId) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error: err } = await supabase
      .from('businesses')
      .update({
        bank_name: bankName.trim() || null,
        bank_branch: bankBranch.trim() || null,
        bank_account: bankAccount.trim() || null,
        ifsc_code: ifscCode.trim().toUpperCase() || null,
        upi_id: upiId.trim() || null,
      })
      .eq('id', businessId)

    if (err) {
      setError(err.message)
    } else {
      setMessage('Bank details saved successfully!')
    }
    setSaving(false)
  }

  if (loading) return <main className="p-4">Loading...</main>

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bank & UPI</h1>
        <Link href="/settings" className="text-blue-600 text-sm font-medium">
          ← Settings
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Ye details aapke invoice/bill ke neeche print hongi.
      </p>

      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
      {message && <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-700 text-sm">{message}</div>}

      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank Name</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="jaise: ICICI Bank" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Branch</label>
          <input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="jaise: Bareilly Main" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Number</label>
          <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="jaise: 1234567890" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
          <input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="mt-1 w-full rounded-lg border p-2 uppercase" placeholder="jaise: ICIC0001234" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">UPI ID</label>
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="jaise: aapna@upi" />
        </div>
      </div>

      <button type="button" disabled={saving} onClick={saveBankDetails} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium shadow-sm disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Bank Details'}
      </button>
    </main>
  )
}