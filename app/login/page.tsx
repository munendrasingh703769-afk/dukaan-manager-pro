'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client' // 🔥 Role check ke liye add kiya

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
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

    // 🔥 NAYA LOGIC: Role check karke sahi dashboard par bhejo
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Maan lo role 'users' table mein hai
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
      
      const params = new URLSearchParams(window.location.search)
      const nextPath = params.get('next')

      if (nextPath) {
        router.push(nextPath) // Agar kisi specific link se aaye hain
      } else if (userData?.role === 'customer') {
        router.push('/customer') // Customer Dashboard
      } else {
        router.push('/owner') // Business/Owner Dashboard
      }
    } else {
      // Fallback
      router.push('/owner') 
    }
    
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        
        {/* 🔥 SPELLING FIX YAHAN HAI */}
        <h1 className="text-2xl font-bold text-gray-900">
          VyapaarSetu
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Apne account me login ka rein
        </p>

        {error && (
          <div className="mt-4 rounded border-red-300 bg-red-50 p-3 text-sm text-red-700">
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
            <div className="text-right mt-2">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-xs text-blue-600 font-medium"
              >
                Password bhool gaye?
              </button>
            </div>
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