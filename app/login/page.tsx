'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.trim() || !password) {
      setError('Email aur password dono bharein')
      setLoading(false)
      return
    }

    const { error: err } = await signIn(email.trim(), password)

    if (err) {
      if (err.message.toLowerCase().includes('email not confirmed')) {
        setError('Pehle email verify karein. Inbox check karein.')
      } else if (err.message.toLowerCase().includes('invalid login')) {
        setError('Email ya password galat hai')
      } else {
        setError(err.message)
      }
      setLoading(false)
      return
    }

    // Purana business ID clear karo (naye user ke liye)
    localStorage.removeItem('current_business_id')

    const params = new URLSearchParams(window.location.search)
    const nextPath = params.get('next') || '/'
    window.location.href = nextPath
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">
          Dukaan Manager Pro
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Apne account me login karein
        </p>

        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
              autoComplete="email"
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
                placeholder="••••••••"
                autoComplete="current-password"
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

          <div className="text-right">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-xs text-blue-600 font-medium"
            >
              Password bhool gaye?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Naya account?{' '}
          <Link href="/signup" className="text-blue-600 font-medium">
            Sign up karein
          </Link>
        </div>
      </div>
    </main>
  )
}
