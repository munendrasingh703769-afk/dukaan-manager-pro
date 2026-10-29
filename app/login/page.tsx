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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Welcome Message
    alert('Welcome back to VyapaarSetu!')

    // Role check karke redirect karo
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', data.user.id)
      .single()

    if (profile?.user_type === 'customer') {
      router.push('/customer')
    } else if (profile?.user_type === 'service_provider') {
      router.push('/provider') // 👈 Yahan /provider kar diya hai taaki 404 na aaye
    } else {
      router.push('/owner')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center text-2xl italic mx-auto mb-3 shadow-lg">V</div>
          <h1 className="text-2xl font-black text-slate-800">Welcome Back</h1>
          <p className="text-sm text-slate-500">Login to your VyapaarSetu account</p>
        </div>

        {error && <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-xl text-center font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full mt-1 p-3 border rounded-xl text-sm focus:border-emerald-500 outline-none" 
              placeholder="name@gmail.com" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 font-bold hover:underline">Forgot?</Link>
            </div>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full mt-1 p-3 border rounded-xl text-sm focus:border-emerald-500 outline-none" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          Naya account banayein? <Link href="/signup" className="text-emerald-600 font-bold hover:underline">Sign Up</Link>
        </p>

      </div>
    </main>
  )
}