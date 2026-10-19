'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Password reset ke liye OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false } // Sirf purane users ke liye
    })

    if (error) setError(error.message)
    else setStep('otp')
    
    setLoading(false)
  }

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
      setError("Galat OTP. Kripya check karein.")
    } else {
      // OTP sahi hai, ab naya password banane bhejo
      router.push('/set-password')
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="mt-1 text-sm text-gray-600">
            {step === 'email' ? 'Apna registered email daalein.' : 'Email par aaya hua OTP daalein.'}
          </p>
        </div>

        {error && <div className="mb-4 rounded border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="aap@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-bold">
              {loading ? 'Sending...' : 'Send Reset OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
              <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1 w-full rounded-lg border p-3 text-center text-2xl tracking-widest font-bold" placeholder="123456" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-bold">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Wapas Login par jayein
          </Link>
        </div>
      </div>
    </main>
  )
}