'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check karo ki user verify hua hai ya nahi
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login') // Agar direct aaya hai bina OTP ke
      }
    }
    checkUser()
  }, [router, supabase])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return setError('Passwords match nahi kar rahe hain')
    if (password.length < 6) return setError('Password kam se kam 6 characters ka hona chahiye')

    setLoading(true)
    setError('')

    // Supabase me password update karo
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      alert('Password successfully set ho gaya! Welcome to VyapaarSetu.')
      
      // Role check karke dashboard par bhejo
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single()

      if (userData?.role === 'customer') router.push('/customer')
      else if (userData?.role === 'provider') router.push('/provider')
      else router.push('/owner')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Create New Password</h1>
        <p className="mt-1 text-sm text-gray-600">Apne account ko secure karne ke liye naya password banayein.</p>

        {error && <div className="mt-4 rounded border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border p-2" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded border p-2" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded bg-emerald-600 px-4 py-3 text-white font-bold disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Password & Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}