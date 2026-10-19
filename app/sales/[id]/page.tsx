'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bizId } from '@/lib/business'

type Item = {
  id: string
  product_name: string
  hsn_code: string | null
  qty: number
  price: number
  gst_percent: number
  line_total: number
}

type Detail = {
  id: string
  invoice_no: string | null
  created_at: string
  sale_date: string
  customer_name: string
  customer_phone: string
  customer_address: string
  subtotal: number
  gst_amount: number
  discount: number
  total_amount: number
  cash_amount: number
  online_amount: number
  paid_amount: number
  due_amount: number
  notes: string
  items: Item[]
}

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const { data: s, error: sErr } = await supabase
      .from('sales')
      .select('*')
      .eq('business_id', bizId())
      .eq('id', id)
      .single()

    if (sErr || !s) {
      setError(sErr?.message || 'Sale not found')
      setLoading(false)
      return
    }

    let cName = '-'
    let cPhone = '-'
    let cAddress = '-'

    if (s.customer_id) {
      const { data: c } = await supabase
        .from('customers')
        .select('name, phone, address')
      .eq('business_id', bizId())
        .eq('id', s.customer_id)
        .single()
      if (c) {
        cName = c.name || '-'
        cPhone = c.phone || '-'
        cAddress = c.address || '-'
      }
    }

    const { data: itemData } = await supabase
      .from('sale_items')
      .select('id, product_name, hsn_code, qty, price, gst_percent, line_total')
      .eq('sale_id', id)

    setDetail({
      id: s.id,
      invoice_no: s.invoice_no,
      created_at: s.created_at,
      sale_date: s.sale_date,
      customer_name: cName,
      customer_phone: cPhone,
      customer_address: cAddress,
      subtotal: Number(s.subtotal || 0),
      gst_amount: Number(s.total_gst || 0),
      discount: Number(s.discount || 0),
      total_amount: Number(s.total_amount || 0),
      cash_amount: Number(s.cash_amount || 0),
      online_amount: Number(s.online_amount || 0),
      paid_amount: Number(s.paid_amount || 0),
      due_amount: Number(s.due_amount || 0),
      notes: s.notes || '',
      items: (itemData ?? []).map((i: any) => ({
        id: i.id,
        product_name: i.product_name || '-',
        hsn_code: i.hsn_code || null,
        qty: Number(i.qty || 0),
        price: Number(i.price || 0),
        gst_percent: Number(i.gst_percent || 0),
        line_total: Number(i.line_total || 0),
      })),
    })
    setLoading(false)
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  async function handleDelete() {
    if (!confirm('Delete this sale?')) return
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) { alert(error.message); return }
    router.push('/sales/list')
  }

  if (loading) return <main className="p-4">Loading...</main>
  if (error) return <main className="p-4 text-red-600">{error}</main>
  if (!detail) return <main className="p-4">Not found</main>

    return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans print:p-0 print:bg-white">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 shadow-sm print:shadow-none print:border-none">
        
        {/* Top Border */}
        <div className="h-1.5 w-full bg-slate-800 print:hidden"></div>

        <div className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-light text-slate-800 tracking-tight">INVOICE</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">#{sale.invoice_no}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-800">{business?.name || 'My Shop'}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed ml-auto">{business?.address}</p>
              <p className="text-xs text-slate-500 mt-1">{business?.phone}</p>
            </div>
          </div>

          <div className="flex justify-between border-t border-b border-gray-200 py-6 mb-8">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Invoice To</p>
              <p className="text-sm font-bold text-slate-800">{sale.customers?.name || 'Walk-in'}</p>
              <p className="text-xs text-slate-500 mt-1">{sale.customers?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Date</p>
              <p className="text-sm font-semibold text-slate-800">{new Date(sale.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-bold text-xs uppercase">Description</th>
                <th className="text-right py-3 px-4 font-bold text-xs uppercase">Qty</th>
                <th className="text-right py-3 px-4 font-bold text-xs uppercase">Rate</th>
                <th className="text-right py-3 px-4 font-bold text-xs uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium text-slate-800">{item.product_name}</td>
                  <td className="text-right py-4 px-4 text-slate-600">{item.quantity}</td>
                  <td className="text-right py-4 px-4 text-slate-600">₹{item.rate}</td>
                  <td className="text-right py-4 px-4 font-semibold text-slate-800">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="w-full sm:w-1/2 ml-auto">
            <div className="flex justify-between py-2 text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{sale.total_amount}</span>
            </div>
            <div className="flex justify-between py-2 text-sm text-slate-600 border-b border-gray-200">
              <span>Tax</span>
              <span>₹0</span>
            </div>
            <div className="flex justify-between py-4 text-lg font-bold text-slate-800">
              <span>Total</span>
              <span>₹{sale.total_amount}</span>
            </div>
            <div className="flex justify-between py-1 text-xs text-slate-500">
              <span>Paid</span>
              <span>₹{sale.paid_amount}</span>
            </div>
            {sale.due_amount > 0 && (
              <div className="flex justify-between py-1 text-sm font-bold text-red-600">
                <span>Balance Due</span>
                <span>₹{sale.due_amount}</span>
              </div>
            )}
          </div>

          <div className="mt-16 text-center text-xs text-slate-400">
            <p>Thank you for your business.</p>
          </div>
        </div>
      </div>
    </main>
  )