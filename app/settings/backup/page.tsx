'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function BackupPage() {
  const supabase = createClient()
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState('')

  async function downloadBackup() {
    const bid = getCurrentBusinessId()
    if (!bid) return
    setDownloading(true)
    setMsg('')
    try {
      const [customers, products, sales] = await Promise.all([
        supabase.from('customers').select('*').eq('business_id', bid),
        supabase.from('products').select('*').eq('business_id', bid),
        supabase.from('sales').select('*').eq('business_id', bid),
      ])
      const backupData = {
        backup_date: new Date().toISOString(),
        business_id: bid,
        customers: customers.data || [],
        products: products.data || [],
        sales: sales.data || [],
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchorNode = document.createElement('a')
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `VyaparSetu_Backup_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
      setMsg('Backup file downloaded successfully!')
    } catch (err: any) {
      setMsg('Backup failed: ' + err.message)
    }
    setDownloading(false)
  }

  return (
    <main className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Data Backup</h1>
        <Link href="/settings" className="text-blue-600 text-sm">← Settings</Link>
      </div>
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        <div className="text-6xl mb-4">☁️</div>
        <h2 className="text-lg font-semibold mb-2">Backup Your Data</h2>
        <p className="text-sm text-gray-600 mb-6">Apne dukaan ka poora data ek file me download karein.</p>
        {msg && <div className="mb-4 text-sm font-medium text-blue-600">{msg}</div>}
        <button onClick={downloadBackup} disabled={downloading} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-medium shadow-sm disabled:opacity-50">
          {downloading ? 'Preparing...' : '⬇️ Download Backup (JSON)'}
        </button>
      </div>
    </main>
  )
}