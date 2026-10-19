'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 1. Email par OTP bhejna
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true } 
    })

    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  // 2. OTP verify karna
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email'
    })

    if (error) {
      setError("Galat OTP ya OTP expire ho gaya hai. Kripya check karein.")
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single()

    // Agar naya user hai ya role nahi hai, toh password set karwao
    if (!userData || !userData.role) {
      router.push('/set-password') 
    } else {
      if (userData.role === 'customer') router.push('/customer')
      else if (userData.role === 'provider') router.push('/provider')
      else router.push('/owner')
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-white">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl font-extrabold italic mx-auto mb-4 shadow-sm">
            V
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to VyapaarSetu</h1>
          <p className="mt-2 text-sm text-gray-500">
            {step === 'email' 
              ? 'Apna email daalein, hum aapko ek secure OTP bhejenge.' 
              : 'Aapke email par aaya hua 6-digit OTP yahan daalein.'}
          </p>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-medium text-center">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition" placeholder="aap@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-white font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 transition">
              {loading ? 'Sending OTP...' : 'Send Login OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Enter OTP</label>
              <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full rounded-xl border border-gray-300 p-3 text-center text-2xl tracking-[0.5em] font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition" placeholder="••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-white font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50 transition">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <div className="text-center mt-4">
                <button type="button" onClick={() => setStep('email')} className="text-sm text-gray-500 font-medium hover:text-emerald-600">
                  Email change karni hai?
                </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-100 pt-6">
          Naya account?{' '}
          <Link href="/signup" className="text-emerald-600 font-bold hover:underline">
            Sign up karein
          </Link>
        </div>
      </div>
    </main>
  )
}