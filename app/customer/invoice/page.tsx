'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function numToWords(num: number): string {
  const n = Math.round(num);
  if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eightieth', 'Ninety'];
  const conv = (x: number): string => {
    if (x < 20) return a[x];
    if (x < 100) return b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
    if (x < 1000) return a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + conv(x % 100) : '');
    if (x < 100000) return conv(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + conv(x % 1000) : '');
    if (x < 10000000) return conv(Math.floor(x / 100000)) + ' Lakh' + (x % 100000 ? ' ' + conv(x % 100000) : '');
    return conv(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + conv(x % 10000000) : '');
  };
  return conv(n);
}
function InvoiceContent() {
  const supabase = createClient();
  const params = useSearchParams();
  const type = params.get('type') || 'order';
  const id = params.get('id') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = user ? await supabase.from('profiles').select('*').eq('id', user.id).single() : { data: null };
      if (type === 'booking') {
        const { data: b } = await supabase.from('service_bookings').select('*, services:service_id(*)').eq('id', id).single();
        const { data: biz } = b?.services?.business_id ? await supabase.from('businesses').select('*').eq('id', b.services.business_id).single() : { data: null };
        if (b) {
          const amt = Number(b.total_amount || b.amount || b.services?.price || 0);
          setData({
            invNo: 'SRV-' + String(b.id).slice(0, 6).toUpperCase(),
            date: new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            biz: biz || {},
            cust: prof || {},
            address: b.address || prof?.address || 'India',
            items: [{ name: b.services?.name || b.service_name || 'Service Charge', hsn: '9987', rate: amt, qty: 1, gst: 0, total: amt }]
          });
        }
      } else {
        const { data: o } = await supabase.from('orders').select('*').eq('id', id).single();
        if (o) {
          const rawItems = Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items : [{ product_name: 'Order Items', price: o.total_amount || 0, quantity: 1 }];
          setData({
            invNo: 'INV-' + String(o.id).slice(0, 6).toUpperCase(),
            date: new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            biz: o.business_id ? (await supabase.from('businesses').select('*').eq('id', o.business_id).single()).data || {} : {},
            cust: prof || {},
            address: o.shipping_address || prof?.address || 'India',
            items: rawItems.map((it: any) => {
              const rate = Number(it.price || it.unit_price || 0);
              const qty = Number(it.quantity || 1);
              const gst = Number(it.gst_percent || 0);
              const base = rate * qty;
              return { name: it.product_name || it.name || 'Item', hsn: it.hsn_code || '—', rate, qty, gst, taxAmt: base * (gst / 100), total: base * (1 + gst / 100) };
            })
          });
        }
      }
      setLoading(false);
    };
    if (id) load();
  }, [id, type]);

  if (loading) return <div className="p-10 text-center font-bold text-slate-600">Generating Tax Invoice...</div>;
  if (!data) return <div className="p-10 text-center text-red-600 font-bold">Invoice not found.</div>;

  const subTotal = data.items.reduce((s: number, x: any) => s + x.rate * x.qty, 0);
  const taxTotal = data.items.reduce((s: number, x: any) => s + (x.taxAmt || 0), 0);
  const grandTotal = subTotal + taxTotal;
  const totalQty = data.items.reduce((s: number, x: any) => s + x.qty, 0);
  const upiLink = data.biz?.upi_id ? `upi://pay?pa=${data.biz.upi_id}&pn=${encodeURIComponent(data.biz.name || 'Store')}&am=${grandTotal.toFixed(2)}&cu=INR` : '';
  return (
    <div className="min-h-screen bg-slate-100 pb-12 print:bg-white print:pb-0">
      <div className="max-w-3xl mx-auto p-3 flex justify-between items-center print:hidden">
        <Link href={type === 'booking' ? '/customer/bookings' : '/customer/orders'} className="text-xs font-bold bg-white px-3 py-2 rounded-xl border shadow-sm">← Back</Link>
        <button onClick={() => window.print()} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow">🖨️ Print / Save PDF</button>
      </div>

      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 shadow-md border border-slate-200 text-slate-900 text-xs print:shadow-none print:border-0">
        <div className="flex justify-between items-start border-b pb-4">
          <div className="max-w-[65%]">
            <p className="text-blue-700 font-black text-sm tracking-wide uppercase">TAX INVOICE</p>
            <h1 className="text-lg font-black mt-0.5">{data.biz?.name || 'VyapaarSetu Partner'}</h1>
            {data.biz?.gstin && <p className="font-bold text-slate-700">GSTIN {data.biz.gstin}</p>}
            <p className="text-slate-600 mt-0.5">{data.biz?.address || data.biz?.city || 'India'}</p>
            <p className="text-slate-600 mt-0.5">Mobile {data.biz?.phone || '—'} {data.biz?.email ? `• Email ${data.biz.email}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase">ORIGINAL FOR RECIPIENT</p>
            <div className="mt-2 inline-block bg-slate-900 text-white font-black px-3 py-1.5 rounded-lg text-sm tracking-wider">
              {(data.biz?.name || 'VS').slice(0, 12).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 py-3 border-b text-[11px]">
          <div><span className="text-slate-500">Invoice #:</span> <strong className="font-black">{data.invNo}</strong></div>
          <div><span className="text-slate-500">Invoice Date:</span> <strong>{data.date}</strong></div>
          <div><span className="text-slate-500">Due Date:</span> <strong>{data.date}</strong></div>
        </div>

        <div className="grid grid-cols-3 gap-3 py-3 border-b text-[11px]">
          <div>
            <p className="text-slate-500">Customer Details:</p>
            <p className="font-black text-xs mt-0.5">{data.cust?.full_name || 'Customer'}</p>
            <p className="text-slate-700">Ph: {data.cust?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Billing address:</p>
            <p className="font-semibold text-slate-800 mt-0.5">{data.address}</p>
          </div>
          <div>
            <p className="text-slate-500">Shipping address:</p>
            <p className="font-semibold text-slate-800 mt-0.5">{data.address}</p>
          </div>
        </div>

        <div className="py-2 border-b text-[11px]">
          <span className="text-slate-500">Place of Supply:</span> <strong>{data.biz?.state || '09-UTTARPRADESH'}</strong>
        </div>

        <table className="w-full mt-3 border-collapse text-[11px]">
          <thead>
            <tr className="border-y-2 border-slate-800 text-left font-black">
              <th className="py-2 pr-2">#</th>
              <th className="py-2">Item / Service</th>
              <th className="py-2 text-right">Rate/Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Taxable Value</th>
              <th className="py-2 text-right">Tax Amount</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.items.map((it: any, idx: number) => (
              <tr key={idx}>
                <td className="py-2.5 pr-2 align-top">{idx + 1}</td>
                <td className="py-2.5 align-top">
                  <p className="font-bold text-slate-900">{it.name}</p>
                  <p className="text-[10px] text-slate-500">HSN/SAC: {it.hsn}</p>
                </td>
                <td className="py-2.5 text-right align-top">{it.rate.toFixed(2)}</td>
                <td className="py-2.5 text-right align-top">{it.qty}</td>
                <td className="py-2.5 text-right align-top">{(it.rate * it.qty).toFixed(2)}</td>
                <td className="py-2.5 text-right align-top">{(it.taxAmt || 0).toFixed(2)} ({it.gst}%)</td>
                <td className="py-2.5 text-right font-bold align-top">{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t-2 border-slate-800 mt-3 pt-2 flex justify-end">
          <div className="w-64 space-y-1 text-[11px]">
            <div className="flex justify-between"><span>Taxable Amount</span><strong>₹{subTotal.toFixed(2)}</strong></div>
            <div className="flex justify-between"><span>Total Tax (GST)</span><strong>₹{taxTotal.toFixed(2)}</strong></div>
            <div className="flex justify-between text-sm font-black border-t pt-1"><span>Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="border-y border-slate-300 py-2 my-3 flex flex-wrap justify-between text-[10px] text-slate-700">
          <span>Total Items / Qty : {data.items.length} / {totalQty.toFixed(3)}</span>
          <span>Total amount (in words): <strong>INR {numToWords(grandTotal)} Only.</strong></span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 items-start text-[11px]">
          <div>
            <p className="font-black mb-1">Pay using UPI:</p>
            {upiLink ? (
              <img src={`https://qrserver.com{encodeURIComponent(upiLink)}`} alt="UPI QR" className="w-24 h-24 border p-1 rounded" />
            ) : <p className="text-[10px] text-slate-400">UPI ID: {data.biz?.upi_id || 'Pay at Counter'}</p>}
          </div>
          <div>
            <p className="font-black mb-1">Bank Details:</p>
            <p>Bank: <strong>{data.biz?.bank_name || '—'}</strong></p>
            <p>Account #: <strong>{data.biz?.account_number || '—'}</strong></p>
            <p>IFSC: <strong>{data.biz?.ifsc_code || '—'}</strong></p>
            <p>Branch: <strong>{data.biz?.branch || data.biz?.city || '—'}</strong></p>
          </div>
          <div className="text-right flex flex-col items-end justify-between h-24">
            <p className="text-[10px] font-bold">For {data.biz?.name || 'VyapaarSetu Partner'}</p>
            <div className="w-16 h-16 rounded-full border-2 border-indigo-700 text-indigo-700 flex items-center justify-center text-[9px] font-black rotate-[-12deg]">
              VERIFIED
            </div>
            <p className="text-[10px] font-bold">Authorized Signatory</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t text-[10px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">Notes: Thank you for the Business</p>
          <p className="font-bold text-slate-800">Terms and Conditions:</p>
          <p>1. Goods once sold cannot be taken back or exchanged.</p>
          <p>2. Subject to local Jurisdiction.</p>
          <p className="pt-3 text-slate-400">Page 1 / 1 • This is a digitally signed document.</p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerInvoicePage() {
  return <Suspense fallback={<div className="p-10 text-center">Loading Invoice...</div>}><InvoiceContent /></Suspense>;
}
