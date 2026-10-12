'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'

function numberToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (n: number): string => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')
  const three = (n: number): string => n < 100 ? two(n) : a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '')
  const whole = Math.floor(num)
  const paise = Math.round((num - whole) * 100)
  let r = ''
  const cr = Math.floor(whole / 10000000)
  const lk = Math.floor((whole % 10000000) / 100000)
  const th = Math.floor((whole % 100000) / 1000)
  const rem = whole % 1000
  if (cr > 0) r += three(cr) + ' Crore '
  if (lk > 0) r += three(lk) + ' Lakh '
  if (th > 0) r += three(th) + ' Thousand '
  if (rem > 0) r += three(rem)
  r = (r.trim() || 'Zero') + ' Rupees'
  if (paise > 0) r += ' and ' + two(paise) + ' Paise'
  return r + ' Only'
}

let BUSINESS_ID = ''

export default function SaleInvoicePage() {
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const params = useParams()
  const supabase = createClient()
  const id = params.id as string

  const [biz, setBiz] = useState<any>(null)
  const [sale, setSale] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    const { data: b } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', BUSINESS_ID)
      .single()

    const { data: s, error: sErr } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single()

    if (sErr || !s) {
      setError(sErr?.message || 'Sale not found')
      setLoading(false)
      return
    }

    let c: any = null
    if (s.customer_id) {
      const { data: cd } = await supabase
        .from('customers')
        .select('*')
        .eq('id', s.customer_id)
        .single()
      c = cd
    }

    const { data: it } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', id)

    setBiz(b || {})
    setSale(s)
    setCustomer(c)
    setItems(it || [])
    setLoading(false)
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  if (loading) return <main className="p-4">Loading...</main>
  if (error) return <main className="p-4 text-red-600">{error}</main>
  if (!sale) return <main className="p-4">Not found</main>

  const s = sale
  const subtotal = Number(s.subtotal || 0)
  const totalGst = Number(s.total_gst || 0)
  const cgst = Number(s.cgst_amount || 0)
  const sgst = Number(s.sgst_amount || 0)
  const igst = Number(s.igst_amount || 0)
  const discount = Number(s.discount || 0)
  const total = Number(s.total_amount || 0)
  const roundingAmount = Number(s.rounding_amount || 0)
  const roundedTotal = Number(s.rounded_total || total)
  const isIGST = igst > 0

  const upiLink = biz?.upi_id
    ? `upi://pay?pa=${biz.upi_id}&pn=${encodeURIComponent(biz.name || '')}&am=${total.toFixed(2)}&cu=INR`
    : ''
  const qrUrl = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiLink)}`
    : ''

  return (
    <main className="p-4 bg-gray-100 min-h-screen">
      <div className="no-print mb-4 flex justify-between">
        <Link href={`/sales/${id}`} className="text-blue-600 text-sm">
          ← Back
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-blue-600 px-4 py-2 text-white text-sm"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="bg-white mx-auto p-6 border-2 border-black text-xs" style={{ maxWidth: '800px' }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-blue-900">
              {biz?.name || 'Business Name'}
            </h1>
            {biz?.tagline && (
              <div className="bg-teal-700 text-white px-2 py-1 mt-1 inline-block text-xs font-semibold">
                {biz.tagline}
              </div>
            )}
            <div className="mt-2 text-xs leading-5">
              {biz?.address && <div>{biz.address}</div>}
              <div>
                {biz?.city && <span>{biz.city}</span>}
                {biz?.state && <span>, {biz.state}</span>}
                {biz?.pincode && <span> - {biz.pincode}</span>}
              </div>
              {biz?.phone && <div>Tel: {biz.phone}</div>}
              {biz?.email && <div>Email: {biz.email}</div>}
              {biz?.website && <div>Web: {biz.website}</div>}
            </div>
          </div>
          {biz?.logo_url && (
            <div className="ml-4">
              <img src={biz.logo_url} alt="Logo" style={{ maxHeight: '80px' }} />
            </div>
          )}
        </div>

        <div className="flex border-b-2 border-black">
          <div className="flex-1 p-2 border-r-2 border-black">
            <div className="font-bold">PAN: {biz?.pan_number || '-'}</div>
          </div>
          <div className="flex-2 p-2 text-center">
            <div className="text-lg font-bold">{s?.invoice_type || "TAX INVOICE"}</div>
          </div>
          <div className="flex-1 p-2 border-l-2 border-black text-right">
            <div className="font-bold text-xs">ORIGINAL FOR RECIPIENT</div>
          </div>
        </div>

        <div className="flex border-b-2 border-black">
          <div className="w-1/2 p-2 border-r-2 border-black">
            <div className="font-bold mb-1">Customer Detail</div>
            <div className="grid grid-cols-3 gap-1">
              <div className="font-semibold">M/s</div>
              <div className="col-span-2">{customer?.name || '-'}</div>
              <div className="font-semibold">Address</div>
              <div className="col-span-2">{customer?.address || '-'}</div>
              <div className="font-semibold">Phone</div>
              <div className="col-span-2">{customer?.phone || '-'}</div>
              <div className="font-semibold">GSTIN</div>
              <div className="col-span-2">{customer?.gst_number || '-'}</div>
              <div className="font-semibold">Email</div>
              <div className="col-span-2">{customer?.email || '-'}</div>
              <div className="font-semibold">Place of Supply</div>
              <div className="col-span-2">{customer?.state || s.place_of_supply || '-'}</div>
            </div>
          </div>
          <div className="w-1/2 p-2">
            <div className="grid grid-cols-2 gap-y-1 gap-x-2">
              <div className="font-semibold">Invoice No.</div>
              <div>{s.invoice_no || '-'}</div>
              <div className="font-semibold">Invoice Date</div>
              <div>{new Date(s.sale_date).toLocaleDateString('en-IN')}</div>
              <div className="font-semibold">Payment Method</div>
              <div>{(s.payment_method || 'cash').toUpperCase()}</div>
              <div className="font-semibold">Due Amount</div>
              <div>₹ {Number(s.due_amount || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Sr. No.</th>
              <th className="border border-black p-1 text-left">Name of Product / Service</th>
              <th className="border border-black p-1 text-left">HSN / SAC</th>
              <th className="border border-black p-1 text-right">Qty</th>
              <th className="border border-black p-1 text-right">Rate</th>
              <th className="border border-black p-1 text-right">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td className="border border-black p-1">{i + 1}</td>
                <td className="border border-black p-1">{it.product_name}</td>
                <td className="border border-black p-1">{it.hsn_code || '-'}</td>
                <td className="border border-black p-1 text-right">{it.qty} {it.unit || 'NOS'}</td>
                <td className="border border-black p-1 text-right">{Number(it.price).toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{Number(it.taxable_amount || it.qty * it.price).toFixed(2)}</td>
              </tr>
            ))}
            {(!s?.invoice_type || s?.invoice_type === 'Tax Invoice') ? (
          isIGST ? (
              <tr>
                <td className="border border-black p-1" colSpan={5}><span className="font-semibold">IGST ({items[0]?.gst_percent || 0}%)</span></td>
                <td className="border border-black p-1 text-right">{igst.toFixed(2)}</td>
              </tr>
            ) : (
              <>
                <tr>
                  <td className="border border-black p-1" colSpan={5}><span className="font-semibold">CGST ({items[0]?.gst_percent ? items[0].gst_percent / 2 : 0}%)</span></td>
                  <td className="border border-black p-1 text-right">{cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={5}><span className="font-semibold">SGST ({items[0]?.gst_percent ? items[0].gst_percent / 2 : 0}%)</span></td>
                  <td className="border border-black p-1 text-right">{sgst.toFixed(2)}</td>
                </tr>
    </>)) : (
      <tr>
        <td colSpan={6} className="border border-black p-1 text-center font-semibold">
          {s?.invoice_type === 'Bill of Supply' ? "Composition taxable person, not eligible to collect tax" : "Tax not applicable"}
        </td>
      </tr>
    )}
            <tr className="font-bold">
              <td className="border border-black p-1 text-right" colSpan={3}>Total</td>
              <td className="border border-black p-1 text-right">
                {items.reduce((a, b) => a + Number(b.qty || 0), 0)}
              </td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1 text-right">₹ {total.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-right" colSpan={5}>Round Off</td>
              <td className="border border-black p-1 text-right">
                ₹ {roundingAmount >= 0 ? '+' : ''}{roundingAmount.toFixed(2)}
              </td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td className="border border-black p-1 text-right" colSpan={5}>Rounded Total</td>
              <td className="border border-black p-1 text-right">₹ {roundedTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-2 border-r-2 border-b-2 border-black p-2">
          <div className="font-semibold">Total in words</div>
          <div className="font-bold">{numberToWords(roundedTotal)}</div>
        </div>

        <div className="flex border-2 border-black border-t-0">
          <div className="w-1/2 p-2 border-r-2 border-black">
            <div className="font-bold text-center bg-gray-100 py-1 mb-1">Bank Details</div>
            <div className="grid grid-cols-3 gap-1">
              <div className="font-semibold">Name</div>
              <div className="col-span-2">{biz?.bank_name || '-'}</div>
              <div className="font-semibold">Branch</div>
              <div className="col-span-2">{biz?.bank_branch || '-'}</div>
              <div className="font-semibold">Acc. Number</div>
              <div className="col-span-2">{biz?.bank_account || '-'}</div>
              <div className="font-semibold">IFSC</div>
              <div className="col-span-2">{biz?.ifsc_code || '-'}</div>
              <div className="font-semibold">UPI ID</div>
              <div className="col-span-2">{biz?.upi_id || '-'}</div>
            </div>
          </div>
          <div className="w-1/2 p-2 text-center">
            {qrUrl && (
              <>
                <img src={qrUrl} alt="UPI QR" style={{ maxHeight: '140px' }} className="mx-auto" />
                <div className="font-bold mt-1">Pay using UPI</div>
              </>
            )}
          </div>
        </div>

        <div className="border-2 border-black border-t-0 p-2">
          <div className="font-bold bg-gray-100 text-center py-1">Terms and Conditions</div>
          <div className="whitespace-pre-line mt-1">
            {biz?.terms || 'Goods once sold will not be taken back.'}
          </div>
        </div>

        <div className="flex border-2 border-black border-t-0">
          <div className="w-1/2 p-4 border-r-2 border-black">
            <div className="font-bold">Customer Signature</div>
          </div>
          <div className="w-1/2 p-4 text-center">
            <div className="font-bold">For {biz?.name || 'Business'}</div>
            <div className="mt-8 text-xs">Authorised Signatory</div>
          </div>
        </div>

        <div className="text-center mt-3 font-semibold">
          Thank you for shopping with us!
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; background: white !important; }
        }
      `}</style>
    </main>
  )
}
