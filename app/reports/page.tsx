'use client'
import Link from 'next/link'

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-500 text-xl font-bold">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Reports & Management</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3">📊 Stock Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Sale (Auto deducts from stock) */}
            <Link href="/sales" className="bg-emerald-50 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-emerald-100">
              <span className="text-2xl">🛒</span>
              <p className="text-xs font-bold text-emerald-900">New Sale</p>
              <p className="text-[9px] text-emerald-700 text-center">Auto deducts stock</p>
            </Link>

            {/* Purchase (Adds to stock) */}
            <Link href="/purchases" className="bg-blue-50 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-blue-100">
              <span className="text-2xl">🚚</span>
              <p className="text-xs font-bold text-blue-900">New Purchase</p>
              <p className="text-[9px] text-blue-700 text-center">Adds stock</p>
            </Link>

            {/* Return (Refund/Customer return) */}
            <Link href="/returns" className="bg-orange-50 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-orange-100">
              <span className="text-2xl">↩️</span>
              <p className="text-xs font-bold text-orange-900">Sales Return</p>
              <p className="text-[9px] text-orange-700 text-center">Customer ne wapas kiya</p>
            </Link>

            {/* Demise (Damage/Loss) */}
            <Link href="/demise" className="bg-red-50 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-red-100">
              <span className="text-2xl">📉</span>
              <p className="text-xs font-bold text-red-900">Demise / Loss</p>
              <p className="text-[9px] text-red-700 text-center">Stock kharab hona</p>
            </Link>

          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-3">✏️ Edit & Corrections</h2>
          <Link href="/sales/edit" className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-xl text-gray-600">📝</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Edit Past Entries</p>
                <p className="text-[10px] text-gray-500">Correct mistakes in sales/purchases</p>
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </Link>
        </div>

      </div>
    </main>
  )
}