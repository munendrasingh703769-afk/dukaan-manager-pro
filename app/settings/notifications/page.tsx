'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function NotificationsPage() {
  // In a real app, these would be fetched/saved from a database
  const [lowStock, setLowStock] = useState(true)
  const [udhaar, setUdhaar] = useState(true)
  const [whatsapp, setWhatsapp] = useState(false)
  const [msg, setMsg] = useState('')

  function save() {
    setMsg('Notification preferences saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      
      {msg && <div className="mb-4 text-green-600 text-sm font-medium">{msg}</div>}

      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-6">
        
        {/* Low Stock */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Low Stock Alerts</p>
            <p className="text-xs text-gray-500">Jab product khatam hone ko ho, alert mile.</p>
          </div>
          <input 
            type="checkbox" 
            checked={lowStock} 
            onChange={(e) => setLowStock(e.target.checked)}
            className="w-5 h-5 accent-blue-600" 
          />
        </div>

        {/* Udhaar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Udhaar Reminders</p>
            <p className="text-xs text-gray-500">Customers ka udhaar yaad dilane ke liye.</p>
          </div>
          <input 
            type="checkbox" 
            checked={udhaar} 
            onChange={(e) => setUdhaar(e.target.checked)}
            className="w-5 h-5 accent-blue-600" 
          />
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">WhatsApp Integration</p>
            <p className="text-xs text-gray-500">Bill aur reminder seedha WhatsApp par bhejein.</p>
          </div>
          <input 
            type="checkbox" 
            checked={whatsapp} 
            onChange={(e) => setWhatsapp(e.target.checked)}
            className="w-5 h-5 accent-blue-600" 
          />
        </div>

      </div>

      <button onClick={save} className="mt-6 w-full rounded-xl bg-green-600 px-4 py-3 text-white font-medium shadow-sm">
        Save Preferences
      </button>
    </main>
  )
}