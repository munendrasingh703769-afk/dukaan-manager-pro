'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // 👁️ Password show/hide state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // 2. Fetch User Role from Profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', data.user.id)
      .single()

    // 3. Welcome Message
    alert('Welcome back to VyapaarSetu!')

    // 4. Role-based Redirect (Admin Fix Added)
    if (profile?.user_type === 'admin') {
      router.push('/admin')
    } 
    else if (profile?.user_type === 'customer') {
      router.push('/customer')
    } 
    else if (profile?.user_type === 'service_provider' || profile?.user_type === 'provider') {
      router.push('/provider')
    } 
    else if (profile?.user_type === 'owner' || profile?.user_type === 'business' || profile?.user_type === 'manufacturer') {
      router.push('/owner')
    } 
    else {
      // Default fallback if role is missing or unknown
      router.push('/customer') 
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center text-2xl italic mx-auto mb-3 shadow-lg">V</div>
          <h1 className="text-2xl font-black text-slate-800">Welcome Back</h1>
          <p className="text-sm text-slate-500">Login to your VyapaarSetu account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-xl text-center font-medium border border-red-100">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Email */}
          <div>
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full mt-1 p-3 border rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" 
              placeholder="name@gmail.com" 
            />
          </div>

          {/* Password with Show/Hide Toggle */}
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 font-bold hover:underline">Forgot?</Link>
            </div>
            <div className="relative mt-1">
              <input 
                required 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-3 border rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition pr-12" 
                placeholder="••••••••" 
              />
              {/* 👁️ Show/Hide Button */}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
              >
                {showPassword ? (
                  // Eye Slash Icon (Hide)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Eye Icon (Show)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Naya account banayein? <Link href="/signup" className="text-emerald-600 font-bold hover:underline">Sign Up</Link>
        </p>

      </div>
    </main>
  )
}