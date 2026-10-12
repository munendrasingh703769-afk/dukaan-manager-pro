'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, validatePassword } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
export const dynamic = 'force-dynamic'
export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteBusinessName, setInviteBusinessName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('invite')
    if (token) {
      setInviteToken(token)
      localStorage.setItem('invite_token', token)
      loadInvite(token)
    }
  }, [searchParams])

  async function loadInvite(token: string) {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('business_invites')
        .select('email, business_id, role, status')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle()

      if (data) {
        if (data.email) {
          setEmail(data.email)
          setInviteEmail(data.email)
        }
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', data.business_id)
          .maybeSingle()
        if (biz) setInviteBusinessName(biz.name || '')
      }
    } catch (e) {
      console.error('Invite load error:', e)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Poora naam bharein')
      return
    }
    if (!email.trim()) {
      setError('Email bharein')
      return
    }
    if (password !== confirmPassword) {
      setError('Dono password match nahi kar rahe')
      return
    }
    const pwErr = validatePassword(password)
    if (pwErr) {
      setError(pwErr)
      return
    }

    setLoading(true)
    // Referral code metadata me daalo
    if (referralCode.trim()) {
      localStorage.setItem('ref_code', referralCode.trim().toUpperCase())
    }
    const { error: err } = await signUp(email.trim(), password, fullName.trim())

    if (err) {
      if (err.message.toLowerCase().includes('already registered')) {
        setError('Ye email pehle se registered hai. Login karein.')
      } else {
        setError(err.message)
      }
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
          <div className="text-5xl">📧</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Email Verify Karein
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Humne aapke email <b>{email}</b> pe ek verification link bheja hai.
            Inbox (ya spam) check karein aur link pe click karein.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Verify karne ke baad login karein.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded bg-blue-600 px-6 py-3 text-white"
          >
            Login Page pe jaayein
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        {inviteToken && (
          <div className="mb-4 rounded-lg bg-purple-50 border border-purple-200 p-3">
            <div className="text-sm font-bold text-purple-900">
              🎉 Aapko invite kiya gaya hai!
            </div>
            {inviteBusinessName && (
              <div className="text-xs text-purple-700 mt-1">
                Business: <b>{inviteBusinessName}</b>
              </div>
            )}
            <div className="text-xs text-purple-600 mt-1">
              Signup karein — aapko automatically is business me add kar diya jayega.
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900">
          Dukaan Manager Pro
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Naya account banayein
        </p>

        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Poora Naam
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Ram Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 w-full rounded border p-2 ${inviteToken ? 'bg-gray-100' : ''}`}
              placeholder="aap@example.com"
              autoComplete="email"
              readOnly={!!inviteToken}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2 pr-14"
                placeholder="8+ chars, 1 capital, 1 number"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Kam se kam 8 character, 1 capital, 1 small, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2 pr-14"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium"
              >
                {showConfirm ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {!inviteToken && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
              <label className="block text-sm font-medium text-purple-900">
                Referral Code (optional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded border p-2 font-mono"
                placeholder="jaise: BKK5735"
              />
              <p className="mt-1 text-xs text-purple-700">
                🎁 Dost ka code daalein — dono ko 1 mahina free!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-green-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Pehle se account?{' '}
          <Link href="/login" className="text-blue-600 font-medium">
            Login karein
          </Link>
        </div>
      </div>
    </main>
  )
}
