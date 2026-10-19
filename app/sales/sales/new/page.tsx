'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function NewSalePage() {
  const router = useRouter()
  const supabase = createClient()
  const activeId = getCurrentBusinessId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Database data
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Form State
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [items, setItems] = useState<any[]>([{ product_id: '', name: '', qty: 1, rate: 0, stock: 0 }])
  const [discount, setDiscount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)

  // Fetch Customers and Products
  useEffect(() => {
    if (!activeId) return
    async function fetchData() {
      setLoading(true)
      const [ { data: custData }, { data: prodData } ] = await Promise.all([
        supabase.from('customers').select('id, name, phone').eq('business_id', activeId),
        supabase.from('products').select('id, name, selling_price, stock_qty').eq('business_id', activeId)
      ])
      if (custData) setCustomers(custData)
      if (prodData) setProducts(prodData)
      setLoading(false)
    }
    fetchData()
  }, [activeId, supabase])

  // Handle Item Changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id === value)
      if (selectedProd) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          name: selectedProd.name,
          rate: selectedProd.selling_price,
          stock: selectedProd.stock_qty
        }
      }
    } else {
      newItems[index][field] = value
    }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { product_id: '', name: '', qty: 1, rate: 0, stock: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  // 🔥 Auto Calculations
  const subTotal = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.rate)), 0)
  const grandTotal = subTotal - Number(discount)
  const dueAmount = grandTotal - Number(paidAmount)

  // Save Bill
  const handleSave = async () => {
    if (items.length === 0 || !items[0].product_id) return alert('Kripya kam se kam ek product select karein')
    if (items.some(i => i.qty > i.stock)) return alert('Kuch products ka stock kam hai!')

    setSaving(true)
    const invoiceNo = `INV-${new Date().getTime().toString().slice(-6)}`

    // 1. Insert into Sales
    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      business_id: activeId,
      customer_id: customerId || null,
      invoice_no: invoiceNo,
      total_amount: grandTotal,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      status: dueAmount > 0 ? 'credit' : 'paid'
    }).select().single()

    if (saleError) {
      alert('Error: ' + saleError.message)
      setSaving(false)
      return
    }

    // 2. Insert into Sale Items
    const saleItemsData = items.map(item => ({
      sale_id: saleData.id,
      product_id: item.product_id,
      product_name: item.name,
      quantity: Number(item.qty),
      rate: Number(item.rate),
      total: Number(item.qty) * Number(item.rate)
    }))
    await supabase.from('sale_items').insert(saleItemsData)

    // 3. Update Stock & Log Movement
    for (let item of items) {
      const prod = products.find(p => p.id === item.product_id)
      if (prod) {
        // Stock kam karo
        await supabase.from('products').update({ stock_qty: prod.stock_qty - Number(item.qty) }).eq('id', prod.id)
        // Movement log karo
        await supabase.from('stock_movements').insert({
          business_id: activeId,
          product_id: prod.id,
          quantity: Number(item.qty),
          type: 'sale',
          reference_id: saleData.id
        })
      }
    }

    alert('Bill saved successfully!')
    router.push('/sales') // History page par bhej do
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-blue-600 font-bold">Loading Form...</p></div>
  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <Link href="/owner" className="text-gray-500 text-xl font-bold">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Create New Bill (Sale)</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        
        {/* Customer Select */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-sm font-bold text-gray-800 mb-2">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Walk-in Customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </select>
        </div>

        {/* Items List */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Add Products</h2>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                {items.length > 1 && <button onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-6 h-6 rounded-full text-xs font-bold border border-red-200">✕</button>}
                
                <select value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm font-medium mb-2 outline-none">
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id} disabled={p.stock_qty <= 0}>{p.name} (Stock: {p.stock_qty})</option>)}
                </select>

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="text-[10px] text-gray-500">Qty</label>
                    <input type="number" min="1" max={item.stock} value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[10px] text-gray-500">Rate (₹)</label>
                    <input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="w-1/3 text-right flex flex-col justify-end pb-2">
                    <p className="text-sm font-bold text-gray-800">₹{Number(item.qty) * Number(item.rate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="w-full mt-3 bg-blue-50 text-blue-600 font-bold py-2 rounded-lg text-sm border border-blue-100">+ Add Another Product</button>
        </div>

        {/* Payment & Calculation */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex gap-3">
             <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Discount (₹)</label>
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" />
             </div>
             <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="udhaar">Udhaar (Credit)</option>
                </select>
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Amount Received (₹)</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
            <p className="text-[10px] text-gray-500 mt-1">Agar pura paisa mila hai, toh same amount yahan likhein.</p>
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg text-white">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><p>Subtotal</p><p>₹{subTotal.toFixed(2)}</p></div>
            {discount > 0 && <div className="flex justify-between text-red-400"><p>Discount</p><p>- ₹{discount}</p></div>}
            
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between items-center">
              <p className="font-bold text-gray-300">Grand Total</p>
              <p className="text-xl font-black text-emerald-400">₹{grandTotal.toFixed(2)}</p>
            </div>
            {dueAmount > 0 && (
              <div className="flex justify-between text-orange-400 font-bold mt-1">
                <p>Baki (Udhaar)</p><p>₹{dueAmount.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-white border-t border-gray-200 p-4 z-50">
        <button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition">
          {saving ? 'Saving Bill...' : 'Save Bill & Update Stock'}
        </button>
      </div>

    </main>
  )
}