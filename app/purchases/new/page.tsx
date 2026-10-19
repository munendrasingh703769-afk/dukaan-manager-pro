'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function NewPurchasePage() {
  const router = useRouter()
  const supabase = createClient()
  const activeId = getCurrentBusinessId()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [billPhoto, setBillPhoto] = useState<File | null>(null)
  const [items, setItems] = useState<any[]>([{ product_id: '', name: '', qty: 1, rate: 0, oldStock: 0, oldAvgCost: 0 }])

  useEffect(() => {
    if (!activeId) return
    async function fetchData() {
      setLoading(true)
      const [ { data: suppData }, { data: prodData } ] = await Promise.all([
        supabase.from('suppliers').select('id, name, phone').eq('business_id', activeId),
        supabase.from('products').select('id, name, stock_qty, avg_cost_price').eq('business_id', activeId)
      ])
      if (suppData) setSuppliers(suppData)
      if (prodData) setProducts(prodData)
      setLoading(false)
    }
    fetchData()
  }, [activeId, supabase])

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id === value)
      if (selectedProd) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          name: selectedProd.name,
          oldStock: Number(selectedProd.stock_qty) || 0,
          oldAvgCost: Number(selectedProd.avg_cost_price) || 0
        }
      }
    } else {
      newItems[index][field] = value
    }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { product_id: '', name: '', qty: 1, rate: 0, oldStock: 0, oldAvgCost: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const grandTotal = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.rate)), 0)

  // 🔥 Save Purchase & Calculate Average Cost
  const handleSave = async () => {
    if (items.length === 0 || !items[0].product_id) return alert('Kripya kam se kam ek product select karein')

    setSaving(true)
    let uploadedPhotoUrl = ''

    // 1. Upload Photo if exists
    if (billPhoto) {
      const fileExt = billPhoto.name.split('.').pop()
      const fileName = `bill_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bills')
        .upload(fileName, billPhoto)
        
      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message)
        setSaving(false)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage.from('bills').getPublicUrl(fileName)
      uploadedPhotoUrl = publicUrl
    }

    // 2. Insert Purchase
    const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').insert({
      business_id: activeId,
      supplier_id: supplierId || null,
      invoice_no: invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
      total_amount: grandTotal,
      bill_photo_url: uploadedPhotoUrl
    }).select().single()

    if (purchaseError) {
      alert('Error: ' + purchaseError.message)
      setSaving(false)
      return
    }

    // 3. Insert Purchase Items & Update Product Stock + Avg Cost
    const purchaseItemsData = items.map(item => ({
      purchase_id: purchaseData.id,
      product_id: item.product_id,
      product_name: item.name,
      quantity: Number(item.qty),
      rate: Number(item.rate),
      total: Number(item.qty) * Number(item.rate)
    }))
    await supabase.from('purchase_items').insert(purchaseItemsData)

    for (let item of items) {
      const addedQty = Number(item.qty)
      const newRate = Number(item.rate)
      
      // 🔥 Weighted Average Cost Formula
      // (Purana Stock * Purana Cost) + (Naya Stock * Naya Cost) / Total Naya Stock
      const oldStockVal = item.oldStock * item.oldAvgCost
      const newStockVal = addedQty * newRate
      const totalStock = item.oldStock + addedQty
      const newAvgCost = totalStock > 0 ? (oldStockVal + newStockVal) / totalStock : newRate

      await supabase.from('products').update({ 
        stock_qty: totalStock,
        avg_cost_price: newAvgCost
      }).eq('id', item.product_id)

      // Log Stock Movement
      await supabase.from('stock_movements').insert({
        business_id: activeId,
        product_id: item.product_id,
        quantity: addedQty,
        type: 'purchase',
        reference_id: purchaseData.id
      })
    }

    alert('Purchase saved & Stock updated!')
    router.push('/reports') // Ya jahan aap purchase history dekhna chahte hain
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-indigo-600 font-bold">Loading Form...</p></div>
  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <Link href="/owner" className="text-gray-500 text-xl font-bold">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Add Purchase (Stock In)</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        
        {/* Supplier Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Invoice Number (Optional)</label>
            <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Bill No." className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* Bill Photo Upload */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-sm font-bold text-gray-800 mb-2">Bill Photo (Optional)</label>
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-xl p-4 text-center cursor-pointer hover:bg-indigo-100 transition">
            <span className="text-3xl">📸</span>
            <p className="text-xs text-indigo-600 font-bold mt-2">{billPhoto ? billPhoto.name : 'Take Photo or Upload Bill'}</p>
          </div>
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files) setBillPhoto(e.target.files[0]) }} />
        </div>

        {/* Items List */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Products (Stock In)</h2>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                {items.length > 1 && <button onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-6 h-6 rounded-full text-xs font-bold border border-red-200">✕</button>}
                
                <select value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm font-medium mb-2 outline-none">
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock_qty})</option>)}
                </select>

                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-gray-500">Qty</label>
                    <input type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-gray-500">Purchase Rate (₹)</label>
                    <input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="w-full mt-3 bg-indigo-50 text-indigo-600 font-bold py-2 rounded-lg text-sm border border-indigo-100">+ Add Another Product</button>
        </div>

        {/* Total Summary */}
        <div className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-xl p-4 shadow-lg text-white">
          <div className="flex justify-between items-center">
            <p className="font-bold text-gray-300">Total Purchase Amount</p>
            <p className="text-2xl font-black text-emerald-400">₹{grandTotal.toFixed(2)}</p>
          </div>
        </div>

      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-white border-t border-gray-200 p-4 z-50">
        <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition">
          {saving ? 'Saving Purchase...' : 'Save & Add to Stock'}
        </button>
      </div>

    </main>
  )
}