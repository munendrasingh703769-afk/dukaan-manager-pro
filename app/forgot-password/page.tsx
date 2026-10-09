'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email daalein')
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
          <div className="text-5xl">📧</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Email Check Karein
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Humne <b>{email}</b> pe password reset ka link bheja hai.
            Inbox (ya spam) check karein.
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
        <h1 className="text-2xl font-bold text-gray-900">
          Password Bhool Gaye?
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Apna email daalein — reset link bhejenge
        </p>

        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="aap@example.com"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? 'Bhej rahe hain...' : 'Reset Link Bhejein'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="text-blue-600 font-medium">
            ← Wapas Login
          </Link>
        </div>
      </div>
    </main>
  )
}
