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
    <main className="p-4">
      <div className="flex justify-between items-center">
        <Link href="/sales/list" className="text-blue-600 text-sm">
          ← Back
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/sales/${id}/invoice`}
            className="rounded bg-blue-600 px-3 py-1 text-white text-sm"
          >
            Print Invoice
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-red-600 px-3 py-1 text-white text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-xl font-bold">
        Sale {detail.invoice_no || '(No Invoice)'}
      </h1>
      <p className="text-sm text-gray-500">
        {new Date(detail.sale_date).toLocaleString('en-IN')}
      </p>

      <div className="mt-4 rounded border p-3 bg-gray-50">
        <div className="font-semibold">Customer</div>
        <div className="text-sm mt-1">Name: {detail.customer_name}</div>
        <div className="text-sm">Phone: {detail.customer_phone}</div>
        <div className="text-sm">Address: {detail.customer_address}</div>
      </div>

      <div className="mt-4">
        <div className="font-semibold mb-2">Items</div>
        <div className="space-y-2">
          {detail.items.length === 0 ? (
            <p className="text-sm text-gray-500">Koi item nahi.</p>
          ) : (
            detail.items.map((it) => (
              <div key={it.id} className="rounded border p-2 bg-white">
                <div className="flex justify-between">
                  <span className="font-medium">{it.product_name}</span>
                  <span>₹{it.line_total.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {it.qty} x ₹{it.price} + GST {it.gst_percent}%
                  {it.hsn_code ? ` | HSN: ${it.hsn_code}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded border p-3 bg-gray-50 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>₹{detail.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between mt-1"><span>GST</span><span>₹{detail.gst_amount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-1"><span>Discount</span><span>₹{detail.discount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-2 font-bold"><span>Total</span><span>₹{detail.total_amount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-2 text-green-700"><span>Cash Paid</span><span>₹{detail.cash_amount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-1 text-blue-700"><span>Online Paid</span><span>₹{detail.online_amount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-1"><span>Total Paid</span><span>₹{detail.paid_amount.toFixed(2)}</span></div>
        <div className="flex justify-between mt-2 font-bold text-red-600"><span>Due</span><span>₹{detail.due_amount.toFixed(2)}</span></div>
      </div>

      {detail.notes && (
        <div className="mt-4 rounded border p-3 bg-yellow-50">
          <div className="text-xs font-semibold">Notes</div>
          <div className="text-sm mt-1">{detail.notes}</div>
        </div>
      )}
    </main>
  )
}
