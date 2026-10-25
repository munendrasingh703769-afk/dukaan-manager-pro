'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Sale = {
  id: string
  invoice_no: string
  total_amount: number
  payment_method: string
  created_at: string
  customer_name?: string
}

export default function TodaySalesPage() {
  const supabase = createClient()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    async function fetchTodaySales() {
      const bid = getCurrentBusinessId()
      if (!bid) return setLoading(false)

      // 1. Aaj ki date nikaalo (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0]

      // 2. Sales fetch karo (aaj ki date se >=)
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*')
        .eq('business_id', bid)
        .gte('created_at', today)
        .order('created_at', { ascending: false })

      if (salesData && salesData.length > 0) {
        // 3. Customer ka naam nikaalne ke liye separate fetch (to avoid join errors)
        const customerIds = [...new Set(salesData.map(s => s.customer_id).filter(Boolean))]
        let customerMap: Record<string, string> = {}
        
        if (customerIds.length > 0) {
          const { data: custData } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds)
            
          if (custData) {
            custData.forEach(c => { customerMap[c.id] = c.name })
          }
        }

        // 4. Data format karo
        const formattedSales = salesData.map(s => ({
          ...s,
          customer_name: s.customer_id ? (customerMap[s.customer_id] || 'Unknown') : 'Walk-in Customer'
        }))

        setSales(formattedSales)
        
        // 5. Total calculate karo
        const total = formattedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
        setTotalAmount(total)
      }
      
      setLoading(false)
    }

    fetchTodaySales()
  }, [])
  if (loading) {
    return <main className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></main>
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white px-4 py-4 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Today's Sales</h1>
          <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link href="/owner" className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition">← Back</Link>
      </header>

      <div className="p-4 max-w-md mx-auto">
        
        {/* Total Summary Card */}
        <div className="bg-[#1e1e24] text-white p-5 rounded-2xl shadow-lg mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">Total Today</p>
            <p className="text-3xl font-black">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl text-2xl">📈</div>
        </div>

        {/* Sales List */}
        <h2 className="text-sm font-bold text-slate-800 mb-3 ml-1">All Transactions ({sales.length})</h2>
        
        {sales.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
            <span className="text-4xl mb-3 block">🛒</span>
            <p className="text-slate-500 text-sm font-medium">Aaj abhi tak koi sale nahi hui hai.</p>
            <Link href="/sales" className="mt-4 inline-block bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl">Make New Sale</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
                    {sale.customer_name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{sale.customer_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Inv: {sale.invoice_no}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-800">₹{Number(sale.total_amount).toLocaleString('en-IN')}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase">{sale.payment_method || 'Cash'}</span>
                    <span className="text-[10px] text-slate-400">{new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}