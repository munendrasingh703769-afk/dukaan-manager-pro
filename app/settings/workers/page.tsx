'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, setCurrentBusinessId } from '@/lib/business'

export default function WorkersPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workers, setWorkers] = useState<any[]>([])

  useEffect(() => {
    loadWorkers()
  }, [])

  async function loadWorkers() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // 1. Business ID check
      let bid: string | null = getCurrentBusinessId()

      if (!bid) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .single()

        if (biz && biz.id) {
          bid = biz.id as string
          setCurrentBusinessId(biz.id as string)
        }
      }

      if (!bid) {
        setError('Business not found. Please create a business first.')
        setLoading(false)
        return
      }

      const businessId: string = bid

      // 2. Workers fetch karo, par OWNER ko chhod do
      const { data, error: err } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', businessId)
        .neq('role', 'owner') // <--- Owner ko list se hataya

      if (err) {
        setWorkers([])
      } else if (data) {
        setWorkers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <main className="p-4 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></main>
  }

  return (
    <main className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        </div>
        <Link href="/settings" className="text-blue-600 text-sm font-medium">
          ← Settings
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Flex wrap lagaya taaki button text ko na kaate */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <button 
            onClick={() => alert('Add Worker feature coming soon!')}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Add Worker
          </button>
        </div>

        {workers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl">
            Koi worker nahi hai. Naya worker add karne ke liye upar button dabayein.
          </p>
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => (
              <div key={worker.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                <div>
                  {/* Agar name nahi hai toh email ya user_id dikhayega */}
                  <p className="text-sm font-bold text-gray-900">
                    {worker.name || worker.email || `User ID: ${worker.user_id?.slice(0, 5)}...`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{worker.role || 'Staff'}</p>
                </div>
                <button 
                  onClick={() => alert('Remove feature coming soon!')}
                  className="text-red-500 text-xs font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}