'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login') // Agar login nahi hai
        return
      }

      // User ka role check karo
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()

      if (userData?.role === 'customer') {
        router.replace('/customer') // Customer dashboard
      } else {
        router.replace('/owner') // Business Owner dashboard
      }
    }
    checkUser()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-4xl font-extrabold text-emerald-600 italic animate-pulse">V</div>
      <p className="text-gray-500 text-sm mt-2">Loading VyapaarSetu...</p>
    </div>
  )
}