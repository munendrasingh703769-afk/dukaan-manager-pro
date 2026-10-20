'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
type SaleItem = {
  id: string;
  product_name: string;
  hsn_code: string | null;
  qty: number;
  price_per_unit: number;
  total_price: number;
  tax_percentage: number | null;
}

type Sale = {
  id: string;
  invoice_no: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: number;
  tax_total: number;
  discount: number;
  discount_percent: number;
  manual_tax: number;
  total_amount: number;
  cash_amount: number;
  online_amount: number;
  paid_amount: number;
  due_amount: number;
  notes: string | null;
  items: SaleItem[];
}

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [role, setRole] = useState<string | null>(null)
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

        const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
        setRole(userData?.role || null)
      }
      
      const { data, error: err } = await supabase
        .from('sales')
        .select('*')
        .eq('id', params.id)
        .single()
        
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      let itemsQuery = supabase.from('sale_items').select('id, product_name, hsn_code, qty, price_per_unit, total_price, tax_percentage').eq('sale_id', params.id)
      
      const { data: itemsData } = await itemsQuery
      
      const itemsList = itemsData || []
      
      const mappedItems = itemsList.map((i: any) => ({
        id: i.id,
        product_name: i.product_name || '',
        hsn_code: i.hsn_code || '',
        qty: Number(i.qty) || 0,
        price_per_unit: Number(i.price_per_unit) || 0,
        total_price: Number(i.total_price) || 0,
        tax_percentage: Number(i.tax_percentage) || 0,
      }))

      setItems(mappedItems)

      setSale({
        id: data.id,
        invoice_no: data.invoice_no,
        created_at: data.created_at,
        customer_name: data.customer_name || 'Walk-in',
        customer_phone: data.customer_phone || '',
        customer_address: data.customer_address || '',
        subtotal: Number(data.subtotal) || 0,
        tax_total: Number(data.tax_total) || 0,
        discount: Number(data.discount) || 0,
        discount_percent: Number(data.discount_percent) || 0,
        manual_tax: Number(data.manual_tax) || 0,
        total_amount: Number(data.total_amount) || 0,
        cash_amount: Number(data.cash_amount) || 0,
        online_amount: Number(data.online_amount) || 0,
        paid_amount: Number(data.paid_amount) || 0,
        due_amount: Number(data.due_amount) || 0,
        notes: data.notes || '',
        items: mappedItems,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) return
    
    try {
      const { error } = await supabase.from('sales').delete().eq('id', params.id)
      if (error) throw error
      router.push('/sales')
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Convert Number to Words (Aapke logic ke hisaab se)
  const numberToWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    if ((num = num.toString().replace(/[\, ]/g,'')).match(/[^0-9]/g)) return 'Invalid number';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
    return str;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="animate-pulse text-indigo-600 font-bold">Loading Invoice...</p></div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">{error}</div>
  if (!sale) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">Sale not found</div>

  return (
    <main className="min-h-screen bg-slate-100 pb-20 font-sans print:bg-white">
      
      {/* Header (Print me nahi dikhega) */}
      <header className="bg-white px-4 py-4 sticky top-0 z-50 border-b border-gray-200 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 text-xl font-bold">←</button>
          <h1 className="text-lg font-bold text-slate-800">Invoice Details</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={handleDelete} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-bold border border-red-100 active:scale-95 transition">Delete</button>
           <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md active:scale-95 transition flex items-center gap-2">
             🖨️ Print
           </button>
        </div>
      </header>

      {/* Invoice Paper Design */}
      <div className="p-3 sm:p-6 max-w-md mx-auto mt-2 print:p-0 print:mt-0">
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl print:shadow-none print:rounded-none">
          
          {/* Gradient Header Section */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 text-white relative">
            <div className="absolute top-0 right-0 text-9xl opacity-10 -mt-4 -mr-4">🧾</div>
            
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">VyapaarSetu</h2>
                <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold mt-1">Tax Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/30">INV: {sale.invoice_no}</p>
                <p className="text-[10px] text-indigo-100 mt-2 font-semibold">{new Date(sale.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-end">
               <div>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">Grand Total</p>
                  <p className="text-3xl font-black mt-1">₹{sale.total_amount.toFixed(2)}</p>
               </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6">
            
            {/* Customer Info */}
            <div className="flex justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Billed To</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{sale.customer_name}</p>
                <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                {sale.customer_address && <p className="text-xs text-gray-500 mt-0.5">{sale.customer_address}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Payment Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${sale.due_amount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {sale.due_amount > 0 ? 'CREDIT' : 'PAID'}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3 mb-6">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Items List</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.product_name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {item.qty} x ₹{item.price_per_unit} {item.tax_percentage > 0 && `(GST: ${item.tax_percentage}%)`}
                    </p>
                    {item.hsn_code && <p className="text-[9px] text-gray-400">HSN: {item.hsn_code}</p>}
                  </div>
                  <p className="text-sm font-black text-gray-800">₹{item.total_price}</p>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="font-bold text-gray-800">₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Discount {sale.discount_percent > 0 ? `(${sale.discount_percent}%)` : ''}</span>
                  <span className="font-bold text-red-500">- ₹{sale.discount.toFixed(2)}</span>
                </div>
              )}
              {(sale.tax_total > 0 || sale.manual_tax > 0) && (
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Tax</span>
                  <span className="font-bold text-gray-800">₹{(sale.tax_total + sale.manual_tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-300">
                <span className="font-black text-gray-900 text-sm uppercase">Total</span>
                <span className="font-black text-indigo-600 text-lg">₹{sale.total_amount.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium italic mt-1 text-right capitalize">{numberToWords(sale.total_amount)}</p>
            </div>

            {/* Payment Details */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-indigo-900 font-medium">Paid Amount</span>
                <span className="font-bold text-indigo-900">₹{sale.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-indigo-700 font-medium">Mode</span>
                <span className="font-bold text-indigo-800 uppercase">
                  {sale.cash_amount > 0 && sale.online_amount > 0 ? 'Cash + Online' : sale.cash_amount > 0 ? 'Cash' : 'Online'}
                </span>
              </div>
              {sale.due_amount > 0 && (
                <div className="flex justify-between text-xs pt-2 border-t border-indigo-200 mt-1">
                  <span className="text-red-600 font-bold">Due (Udhaar)</span>
                  <span className="font-black text-red-600">₹{sale.due_amount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="mb-6">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Notes</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">{sale.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-8 pt-4 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800">Thank you for your business!</p>
              <p className="text-[10px] text-gray-400 mt-1">Powered by <span className="font-bold text-indigo-500">VyapaarSetu</span></p>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}