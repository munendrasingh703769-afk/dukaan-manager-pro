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
  const [showPassword, setShowPassword] = useState(false)
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

    // Strict Account & Role Verification (Zero Data Leak)
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('id, user_type, is_deleted')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profError || !profile || profile.is_deleted) {
      await supabase.auth.signOut();
      setError('Aapka active account nahi bana hai. Kripya pehle Sign Up karein.');
      setLoading(false);
      return;
    }

    const role = (profile.user_type || '').toLowerCase().trim();

    if (role === 'admin' || role === 'super_admin') {
      if ((data.user.email || '').toLowerCase() !== "munendrasingh703769@gmail.com") {
        await supabase.auth.signOut();
        setError('Unauthorized Admin access blocked.');
        setLoading(false);
        return;
      }
      router.push('/admin');
    } else if (role === 'customer') {
      router.push('/customer');
    } else if (role === 'service_provider' || role === 'provider') {
      router.push('/provider');
    } else if (role === 'owner' || role === 'shop_owner') {
      router.push('/owner');
    } else if (role === 'manufacturer') {
      router.push('/manufacturer');
    } else {
      await supabase.auth.signOut();
      setError('Account role verify nahi hua. Kripya sahi role ke saath Sign Up karein.');
      setLoading(false);
      return;
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
          <div className="relative mt-1">
          <input
              required 
            type={showPassword ? "text" : "password"}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full mt-1 p-3 border rounded-xl text-sm focus:border-emerald-500 outline-none" 
              placeholder="••••••••" 
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{showPassword ? "Hide" : "Show"}</button>
          </div>
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