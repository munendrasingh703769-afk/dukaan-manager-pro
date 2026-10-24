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

      // 1. Current Business ID nikalo
      let bid = getCurrentBusinessId()

      // 2. Agar localStorage me nahi hai, toh database se fetch karo
      if (!bid) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .single()

        if (biz) {
          bid = biz.id
          setCurrentBusinessId(bid)
        }
      }

      if (!bid) {
        setError('Business not found. Please create a business first.')
        setLoading(false)
        return
      }

      // 3. Workers fetch karo (business_members table se)
      const { data, error: err } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', bid)

      if (err) {
        // Agar business_members table nahi hai, toh khaali list dikhao
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <button 
            onClick={() => alert('Add Worker feature coming soon!')}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Add Worker
          </button>
        </div>

        {workers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Koi worker nahi hai. Naya worker add karne ke liye upar button dabayein.
          </p>
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => (
              <div key={worker.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                <div>
                  <p className="text-sm font-bold text-gray-900">{worker.name || worker.email || 'Worker'}</p>
                  <p className="text-xs text-gray-500">{worker.role || 'Staff'}</p>
                </div>
                <button className="text-red-500 text-xs font-medium hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}