'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = params.get('next') || '/'
      const type = params.get('type')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      if (type === 'recovery') {
        router.replace('/reset-password')
      } else {
        router.replace(next)
      }
    }
    handle()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <p className="text-gray-600">Verifying...</p>
    </main>
  )
}
