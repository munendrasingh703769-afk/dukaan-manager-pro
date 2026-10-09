'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validatePassword } from '@/lib/auth'

export default function ResetPasswordPage() {
  const supabase = createClient()

  useEffect(() => {
    async function exchange() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
    }
    exchange()
  }, [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Dono password match nahi kar rahe')
      return
    }

    const pwErr = validatePassword(password)
    if (pwErr) {
      setError(pwErr)
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })

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
          <div className="text-5xl">✅</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Password Update Ho Gaya
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Ab naye password se login karein
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded bg-green-600 px-6 py-3 text-white"
          >
            Login Karein
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">
          Naya Password Banayein
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Kam se kam 8 character, 1 capital, 1 number
        </p>

        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Naya Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2 pr-14"
                placeholder="••••••••"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Password Update Karein'}
          </button>
        </form>
      </div>
    </main>
  )
}
