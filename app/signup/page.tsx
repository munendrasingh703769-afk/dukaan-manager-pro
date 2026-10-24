'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Form Data
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [referral, setReferral] = useState('')
  
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  
  // Role State
  const [role, setRole] = useState('shopkeeper')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')

  // STEP 1: Send OTP (Check if email exists)
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !fullName) return setError('Name and Email are required')
    
    setLoading(true)
    setError('')
    
    // Check if email exists in database
    const { data: exists } = await supabase.rpc('check_user_exists', { email_input: email })
    
    if (exists) {
      setError('Yeh email pehle se registered hai. Kripya Login karein.')
      setLoading(false)
      return
    }

    // Send OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })

    if (otpError) {
      setError(otpError.message)
    } else {
      setMessage('OTP sent to your email!')
      setStep(2)
    }
    setLoading(false)
  }

  // STEP 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otp) return setError('Please enter OTP')
    
    setLoading(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })

    if (verifyError) {
      setError(verifyError.message)
    } else {
      setStep(3)
    }
    setLoading(false)
  }

  // STEP 3: Set Password
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setError('Password must be at least 6 characters')
    
    setLoading(true)
    const { error: passError } = await supabase.auth.updateUser({ password })

    if (passError) {
      setError(passError.message)
    } else {
      setStep(4)
    }
    setLoading(false)
  }

  // STEP 4: Save Role & Business Details
  async function handleFinishSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setError('Session expired. Please try again.')

    // 1. Update Profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      address: address,
      referral_code: referral,
      user_type: role
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // 2. Create Business (Only if not customer)
    if (role !== 'customer') {
      const { error: bizError } = await supabase.from('businesses').insert({
        name: businessName,
        owner_name: fullName,
        phone: phone,
        owner_id: user.id
      })
      
      if (bizError) {
        setError("Business creation failed: " + bizError.message)
        setLoading(false)
        return
      }
    }

    // 3. Redirect based on role
    setMessage('Account created successfully! Welcome to VyapaarSetu.')
    setTimeout(() => {
      if (role === 'customer') router.push('/customer') // Customer Dashboard
      else if (role === 'service_provider') router.push('/services') // Provider Dashboard
      else router.push('/owner') // Shopkeeper/B2B Dashboard
    }, 1500)
    
    setLoading(false)
  }
  return (
    <main className="min-h-screen bg-slate-50 p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800">VyapaarSetu</h1>
          <p className="text-sm text-slate-500">Create your account</p>
        </div>

        {error && <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-lg text-center font-medium">{error}</div>}
        {message && <div className="mb-4 text-xs bg-green-50 text-green-600 p-3 rounded-lg text-center font-medium">{message}</div>}

        {/* STEP 1: Details */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Munendra Singh" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="name@gmail.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Bareilly, UP" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Referral Code (Optional)</label>
              <input type="text" value={referral} onChange={e => setReferral(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="e.g. DUK4427" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-emerald-700">
              {loading ? 'Sending OTP...' : 'Generate OTP'}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-slate-600 text-center">We sent a 6-digit code to <b>{email}</b></p>
            <input required type="text" value={otp} onChange={e => setOtp(e.target.value)} className="w-full p-3 border rounded-xl text-center text-xl tracking-widest font-bold outline-none focus:border-blue-500" placeholder="123456" maxLength={6} />
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-emerald-700">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* STEP 3: Password */}
        {step === 3 && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <p className="text-sm text-slate-600 text-center mb-4">Email verified! Create a secure password.</p>
            <div>
              <label className="text-xs font-bold text-slate-700">New Password *</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Min 6 characters" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-emerald-700">
              {loading ? 'Saving...' : 'Set Password'}
            </button>
          </form>
        )}
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm bg-white outline-none focus:border-blue-500">
                <option value="shopkeeper">🏪 Dukaandaar (Shopkeeper)</option>
                <option value="business">🏭 Business / Manufacturer (B2B)</option>
                <option value="service_provider">🔧 Online Service Provider</option>
                <option value="customer">🛒 Customer (Aam Grahak)</option> {/* <--- YEH WAPAS ADD KAR DO */}
              </select>
        {/* STEP 4: Role & Business Details */}
        {step === 4 && (
          <form onSubmit={handleFinishSetup} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Select Your Role *</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm bg-white outline-none focus:border-blue-500">
                <option value="shopkeeper">🏪 Dukaandaar (Shopkeeper)</option>
                <option value="business">🏭 Business / Manufacturer (B2B)</option>
                <option value="service_provider">🔧 Online Service Provider</option>
                <option value="customer">🛒 Customer (Aam Grahak)</option>
              </select>
            </div>

            {/* Business Details only show if not a customer */}
            {role !== 'customer' && (
              <div className="bg-slate-50 p-3 rounded-xl space-y-3 mt-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">Business / Shop Details:</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Business Name *</label>
                  <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder={role === 'service_provider' ? "e.g. Ram Electrician Services" : "e.g. Shree Ram Kirana"} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 p-2.5 border rounded-xl text-sm outline-none focus:border-blue-500" placeholder="9876543210" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-blue-700">
              {loading ? 'Creating Account...' : 'Finish & Go to Dashboard'}
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Login</Link>
          </p>
        )}

      </div>
    </main>
  )
}