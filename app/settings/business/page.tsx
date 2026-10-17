'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'

type Business = {
  id: string
  name: string
  owner_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gst_number: string | null
  gst_type: string | null
  pan_number: string | null
  logo_url: string | null
  tagline: string | null
  terms: string | null
  invoice_prefix: string | null
}

let BUSINESS_ID = ''

export default function BusinessSettingsPage() {
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }

  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState<Permissions>({})
  const [permChecked, setPermChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [gstType, setGstType] = useState('regular')
  const [panNumber, setPanNumber] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [terms, setTerms] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('')

  async function loadPerms() {
    const bid = bizId()
    if (!bid) {
      setPermChecked(true)
      return
    }
    const p = await getUserPermissions(bid)
    setPerms(p)
    setPermChecked(true)
  }

  async function loadBusiness() {
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', BUSINESS_ID)
      .single()

    if (err || !data) {
      setError(err?.message || 'Business not found')
      setLoading(false)
      return
    }

    const b = data as Business
    setName(b.name || '')
    setOwnerName(b.owner_name || '')
    setPhone(b.phone || '')
    setEmail(b.email || '')
    setWebsite(b.website || '')
    setAddress(b.address || '')
    setCity(b.city || '')
    setState(b.state || '')
    setPincode(b.pincode || '')
    setGstNumber(b.gst_number || '')
    setGstType(b.gst_type || 'regular')
    setPanNumber(b.pan_number || '')
    setLogoUrl(b.logo_url || '')
    setTagline(b.tagline || '')
    setTerms(b.terms || '')
    setInvoicePrefix(b.invoice_prefix || '')

    setLoading(false)
  }

  useEffect(() => {
    loadBusiness()
    loadPerms()
  }, [])

  async function saveBusiness() {
    if (!name.trim()) {
      alert('Business name required')
      return
    }
    setSaving(true)
    setMessage('')
    setError('')

    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        gst_number: gstNumber.trim() || null,
        gst_type: gstType,
        pan_number: panNumber.trim() || null,
        logo_url: logoUrl.trim() || null,
        tagline: tagline.trim() || null,
        terms: terms.trim() || null,
        invoice_prefix: invoicePrefix.trim() || null,
      })
      .eq('id', BUSINESS_ID)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setMessage('Business details saved successfully.')
    setSaving(false)

    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  if (permChecked && !hasPermission(perms, 'settings_view')) {
    return (
      <main className="p-4 flex items-center justify-center min-h-screen">
        <div className="rounded-2xl bg-white border-2 border-red-300 p-6 max-w-md text-center shadow">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aapko Settings ka access nahi hai. Owner se permission maangein.
          </p>
          <Link href="/settings" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
            ← Settings
          </Link>
        </div>
      </main>
    )
  }

  if (loading) {
    return <main className="p-4">Loading...</main>
  }

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Business Profile</h1>
        <Link href="/settings" className="text-blue-600 text-sm font-medium">
          ← Settings
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        Ye info har invoice pe automatic aayegi. Ek baar bharo, hamesha use karo.
      </p>

      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-green-700 text-sm">
          {message}
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Business Info</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Shree Krishna Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Ram Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: aap@example.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Tagline (invoice pe dikhega)</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Kirana aur General Store"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: www.aapki.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Main Bazaar, Gali No 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Bareilly"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: Uttar Pradesh"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Pincode</label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: 243001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: https://...logo link"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">GST & Tax Info</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">GST Number</label>
            <input
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: 24AAAAA0000A1Z5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">GST Type</label>
            <select
              value={gstType}
              onChange={(e) => setGstType(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="regular">Regular</option>
              <option value="composition">Composition</option>
              <option value="unregistered">Unregistered</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">PAN Number</label>
            <input
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: ABCDE1234F"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Prefix</label>
            <input
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              placeholder="jaise: INV ya BILL"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Terms & Conditions</h2>
        <div className="mt-4">
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={5}
            className="w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
            placeholder="Goods once sold will not be taken back. Subject to jurisdiction."
          />
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={saveBusiness}
        className="mt-8 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium shadow-sm hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Business Details'}
      </button>
    </main>
  )
}