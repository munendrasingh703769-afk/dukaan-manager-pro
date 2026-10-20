'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ReportsPage() {
  const supabase = createClient()
  const activeId = getCurrentBusinessId()

  const [loading, setLoading] = useState(true)
  const [stockHistory, setStockHistory] = useState<any[]>([])
  const [totalStock, setTotalStock] = useState(0)
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    if (activeId) {
      fetchStockData()
    }
  }, [activeId])

  async function fetchStockData() {
    setLoading(true)
    
    // 1. Total Stock aur Value calculate karne ke liye products fetch karo
    const { data: productsData } = await supabase
      .from('products')
      .select('stock_qty, avg_cost_price')
      .eq('business_id', activeId)

    if (productsData) {
      let stock = 0
      let value = 0
      productsData.forEach(p => {
        stock += Number(p.stock_qty || 0)
        value += (Number(p.stock_qty || 0) * Number(p.avg_cost_price || 0))
      })
      setTotalStock(stock)
      setTotalValue(value)
    }

    // 2. Stock History fetch karo (Stock Movements table se)
    const { data: historyData } = await supabase
      .from('stock_movements')
      .select('*, products(name)')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false })

    if (historyData) {
      setStockHistory(historyData)
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <Link href="/owner" className="text-gray-500 text-xl font-bold">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Stock Management</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Top Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
          <p className="text-xs font-medium text-blue-100 mb-1">Total Items in Stock</p>
          <h2 className="text-3xl font-bold">{totalStock}</h2>
          <div className="flex justify-between mt-4 border-t border-blue-500/50 pt-3">
            <div>
              <p className="text-[10px] text-blue-200">Total Stock Value</p>
              <p className="text-sm font-bold">₹{totalValue.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-200">Status</p>
              <p className="text-sm font-bold text-green-300">{totalStock > 0 ? 'Active' : 'Empty'}</p>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Stock History</h3>

          {loading ? (
            <p className="text-center text-gray-500 py-6 animate-pulse">Loading history...</p>
          ) : stockHistory.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-3">
                📦
              </div>
              <p className="text-sm font-bold text-gray-800">No Stock History</p>
              <p className="text-xs text-gray-500 mt-1">Jab aap purchase ya sale karenge, toh entries yahan dikhengi.</p>
            </div>
          ) : (
            stockHistory.map((item) => {
              const isPositive = item.type === 'purchase'
              const stockChange = isPositive ? `+${item.quantity}` : `-${item.quantity}`
              
              return (
                <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      item.type === 'purchase' ? 'bg-blue-50 text-blue-600' : 
                      item.type === 'sale' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {item.type === 'purchase' ? '🚚' : item.type === 'sale' ? '🛒' : '📉'}
                    </div>
                    
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">
                        {item.type === 'purchase' ? 'Purchase (Add)' : item.type === 'sale' ? 'Sale' : 'Adjustment'}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {item.products?.name || 'Unknown Product'}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-base font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stockChange}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}