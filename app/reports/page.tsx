'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 🔥 Hardcoded data hata diya hai, ab yeh khali array hai
const stockHistory: any[] = [] 

export default function ReportsPage() {
  const router = useRouter()

  // Edit button click hone par form khulega (baad mein)
  const handleEdit = (id: string, type: string) => {
    alert(`Editing ${type} entry for ID: ${id}. Form will open here.`)
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 text-xl font-bold">←</Link>
          <h1 className="text-lg font-bold text-gray-900">Stock Management</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Top Summary Card - Ab yeh 0 dikhayega */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
          <p className="text-xs font-medium text-blue-100 mb-1">Total Items in Stock</p>
          <h2 className="text-3xl font-bold">0</h2>
          <div className="flex justify-between mt-4 border-t border-blue-500/50 pt-3">
            <div>
              <p className="text-[10px] text-blue-200">Total Stock Value</p>
              <p className="text-sm font-bold">₹0</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-200">Low Stock Items</p>
              <p className="text-sm font-bold text-yellow-300">0 Items</p>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Stock History</h3>

          {/* 🔥 Empty State: Agar koi data nahi hai toh yeh dikhega */}
          {stockHistory.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-3">
                📦
              </div>
              <p className="text-sm font-bold text-gray-800">No Stock History</p>
              <p className="text-xs text-gray-500 mt-1">Jab aap purchase ya sale karenge, toh entries yahan dikhengi.</p>
            </div>
          ) : (
            // Agar data aayega (future me), toh yeh list banegi
            stockHistory.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    item.type === 'purchase' ? 'bg-blue-50 text-blue-600' : 
                    item.type === 'sale' ? 'bg-orange-50 text-orange-600' : 
                    item.type === 'return' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {item.type === 'purchase' ? '🚚' : item.type === 'sale' ? '🛒' : item.type === 'return' ? '↩️' : '📉'}
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">
                      {item.type === 'purchase' ? 'Purchase (Add)' : item.type === 'sale' ? 'Sale' : item.type === 'return' ? 'Return' : 'Demise (Loss)'}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      <span className="font-semibold">{item.partyName}</span> • {item.qty} {item.productName}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1">{item.date} • {item.time}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <p className={`text-base font-black ${item.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.stockChange}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">₹{item.amount}</p>
                  
                  <button 
                    onClick={() => handleEdit(item.id, item.type)} 
                    className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded mt-1"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}