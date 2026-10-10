'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'
import { signOut } from '@/lib/auth'

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
  bank_name: string | null
  bank_branch: string | null
  bank_account: string | null
  ifsc_code: string | null
  upi_id: string | null
  terms: string | null
  invoice_prefix: string | null
  business_code: string | null
  referred_by_code: string | null
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
  const [bankName, setBankName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')
  const [terms, setTerms] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [myReferralCode, setMyReferralCode] = useState('')
  const [referredBy, setReferredBy] = useState<{ code: string; name: string } | null>(null)
  const [myReferrals, setMyReferrals] = useState<Array<{ name: string; code: string }>>([])

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
    setBankName(b.bank_name || '')
    setBankBranch(b.bank_branch || '')
    setBankAccount(b.bank_account || '')
    setIfscCode(b.ifsc_code || '')
    setUpiId(b.upi_id || '')
    setTerms(b.terms || '')
    setInvoicePrefix(b.invoice_prefix || '')

    // Aapka referral code set karo
    setMyReferralCode(b.business_code || '')

    // Agar referral code use kiya hai to referrer dhundho
    if (b.referred_by_code) {
      const { data: referrer } = await supabase
        .from('businesses')
        .select('name, business_code')
        .eq('business_code', b.referred_by_code)
        .maybeSingle()
      if (referrer) {
        setReferredBy({
          code: referrer.business_code || '',
          name: referrer.name || 'Unknown',
        })
      }
    }

    // Aapke code se aaye log dhundho
    if (b.business_code) {
      const { data: refs } = await supabase
        .from('businesses')
        .select('name, business_code')
        .eq('referred_by_code', b.business_code)
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
        bank_name: bankName.trim() || null,
        bank_branch: bankBranch.trim() || null,
        bank_account: bankAccount.trim() || null,
        ifsc_code: ifscCode.trim() || null,
        upi_id: upiId.trim() || null,
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

    // Page refresh — taaki updated data turant dikhe
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
          <Link href="/" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
            ← Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (loading) {
    return <main className="p-4">Loading...</main>
  }

  return (
    <main className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Business Settings</h1>
        <Link href="/" className="text-blue-600 text-sm">
          ← Home
        </Link>
      </div>

      <p className="mt-1 text-sm text-gray-600">
        Ye info har invoice pe automatic aayegi. Ek baar bharo, hamesha use karo.
      </p>

      {error && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-green-700">
          {message}
        </div>
      )}

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="text-lg font-semibold">Business Info</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Business Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Shree Krishna Store"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Owner Name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Ram Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: aap@example.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Tagline (invoice pe dikhega)</label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Kirana aur General Store"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: www.aapki.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Main Bazaar, Gali No 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Bareilly"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">State</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Uttar Pradesh"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Pincode</label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: 243001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Logo URL</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: https://...logo link"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="text-lg font-semibold">GST & Tax Info</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">GST Number</label>
            <input
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: 24AAAAA0000A1Z5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">GST Type</label>
            <select
              value={gstType}
              onChange={(e) => setGstType(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="regular">Regular</option>
              <option value="composition">Composition</option>
              <option value="unregistered">Unregistered</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">PAN Number</label>
            <input
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: ABCDE1234F"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Invoice Prefix</label>
            <input
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: INV ya BILL"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="text-lg font-semibold">Bank Details</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Bank Name</label>
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: ICICI Bank"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Branch</label>
            <input
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: Bareilly Main"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Account Number</label>
            <input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: 1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">IFSC Code</label>
            <input
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: ICIC0001234"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">UPI ID</label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="jaise: aapna@upi"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="text-lg font-semibold">Terms & Conditions</h2>
        <div className="mt-4">
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={5}
            className="w-full rounded border p-2"
            placeholder="Goods once sold will not be taken back. Subject to jurisdiction."
          />
        </div>
      </div>

      {myReferralCode && (
        <div className="mt-6 rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
          <h2 className="text-lg font-semibold text-purple-900">
            🎁 Referral Program
          </h2>

          <div className="mt-4">
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
          </div>

          <div className="mt-4 rounded border border-purple-200 bg-white p-3">
            {referredBy ? (
              <p className="text-sm text-gray-800">
                ✅ Aapne use kiya:{' '}
                <span className="font-mono font-bold">{referredBy.code}</span>{' '}
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
      )}

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-base font-semibold text-blue-900">
          👥 Manage Workers
        </h2>
        <p className="mt-1 text-xs text-blue-700">
          Workers ko invite karein aur permissions set karein.
        </p>
        <Link
          href="/settings/workers"
          className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Open Workers Page →
        </Link>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={saveBusiness}
        className="mt-6 w-full rounded bg-green-600 px-4 py-3 text-white"
      >
        {saving ? 'Saving...' : 'Save Business Details'}
      </button>

      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-base font-semibold text-red-800">
          🚪 Logout
        </h2>
        <p className="mt-1 text-xs text-red-600">
          Apne account se logout karein. Aapka data safe rahega.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Logout karein?')) return
            localStorage.removeItem('current_business_id')
            await signOut()
            window.location.href = '/login'
          }}
          className="mt-3 w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </div>
    </main>
  )
}
