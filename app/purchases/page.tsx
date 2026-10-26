'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Supplier = { id: string; name: string; phone: string; gmail: string; pan_no: string; address: string; gstin: string }
type Product = { id: string; name: string; hsn_code: string; purchase_price: number; gst_percent: number; stock_qty: number; unit: string }
type Item = { product_id: string; name: string; qty: number; purchase_price: number; gst_percent: number; unit: string }

export default function PurchasesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Item[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  
  // Payment States
  const [cashAmount, setCashAmount] = useState('')
  const [onlineAmount, setOnlineAmount] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBill, setShowBill] = useState(false)
  const [savedData, setSavedData] = useState<any>(null)

  // Quick Add Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  
  // New Supplier State
  const [newSupName, setNewSupName] = useState('')
  const [newSupPhone, setNewSupPhone] = useState('')
  const [newSupGmail, setNewSupGmail] = useState('')
  const [newSupPanNo, setNewSupPanNo] = useState('')
  const [newSupAddress, setNewSupAddress] = useState('')
  const [newSupGstin, setNewSupGstin] = useState('')
  
  // New Product State
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdGst, setNewProdGst] = useState('0')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const bid = getCurrentBusinessId()
    if (!bid) {
      setLoading(false)
      return
    }

    const [supRes, prodRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('business_id', bid).order('name'),
      supabase.from('products').select('*').eq('business_id', bid).order('name')
    ])

    if (supRes.data) setSuppliers(supRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    setLoading(false)
  }

  async function addQuickSupplier() {
    if (!newSupName) return alert('Name required')
    const bid = getCurrentBusinessId()
    const { data, error } = await supabase.from('suppliers').insert({
      business_id: bid, 
      name: newSupName, 
      phone: newSupPhone,
      gmail: newSupGmail,
      pan_no: newSupPanNo,
      address: newSupAddress,
      gstin: newSupGstin,
    }).select().single()
    
    if (!error && data) {
      setSuppliers([...suppliers, data])
      setSupplierId(data.id)
      setShowSupplierModal(false)
      setNewSupName(''); setNewSupPhone('');
setNewSupGmail('');
setNewSupPanNo('');
setNewSupAddress(''); setNewSupGstin('');
    } else { alert('Error adding supplier: ' + error?.message) }
  }

  async function addQuickProduct() {
    if (!newProdName || !newProdPrice) return alert('Name and Price required')
    const bid = getCurrentBusinessId()
    const { data, error } = await supabase.from('products').insert({
      business_id: bid, name: newProdName, purchase_price: Number(newProdPrice), gst_percent: Number(newProdGst), unit: 'PCS'
    }).select().single()
    if (!error && data) {
      setProducts([...products, data])
      setShowProductModal(false)
      setNewProdName(''); setNewProdPrice(''); setNewProdGst('0')
    } else { alert('Error adding product') }
  }
  function addItem() {
    setItems([...items, { product_id: '', name: '', qty: 1, purchase_price: 0, gst_percent: 0, unit: 'PCS' }])
  }

  function updateItem(index: number, field: keyof Item, value: any) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'product_id') {
      const prod = products.find(p => p.id === value)
      if (prod) {
        newItems[index].name = prod.name
        newItems[index].purchase_price = prod.purchase_price || 0
        newItems[index].gst_percent = prod.gst_percent || 0
        newItems[index].unit = prod.unit || 'PCS'
      }
    }
    setItems(newItems)
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  // --- CALCULATIONS ---
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.purchase_price), 0)
  const totalGst = items.reduce((sum, item) => sum + ((item.qty * item.purchase_price) * item.gst_percent) / 100, 0)
  
  const discountInput = Number(discount) || 0
  const discountAmount = discountType === 'percent' ? ((subtotal + totalGst) * discountInput) / 100 : discountInput
  
  const grandTotal = Math.max(0, subtotal + totalGst - discountAmount)
  
  const cashNum = Number(cashAmount) || 0
  const onlineNum = Number(onlineAmount) || 0
  const totalPaid = cashNum + onlineNum
  const dueAmount = Math.max(0, grandTotal - totalPaid)

  async function savePurchase() {
    if (!supplierId) return alert('Select supplier')
    if (items.length === 0) return alert('Add items')
    if (items.some(i => !i.product_id)) return alert('Select product for all items')

    setSaving(true)
    const bid = getCurrentBusinessId()

    try {
      const { data: purchase, error: purErr } = await supabase.from('purchases').insert({
        business_id: bid,
        supplier_id: supplierId,
        invoice_no: invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
        purchase_date: purchaseDate,
        subtotal: subtotal,
        total_gst: totalGst,
        discount: discountAmount,
        total_amount: grandTotal,
        paid_amount: totalPaid,
        due_amount: dueAmount,
        payment_method: totalPaid === 0 ? 'credit' : (cashNum > 0 && onlineNum > 0 ? 'split' : (cashNum > 0 ? 'cash' : 'online'))
      }).select().single()

      if (purErr) throw purErr

      for (const item of items) {
        await supabase.from('purchase_items').insert({
          purchase_id: purchase.id,
          product_id: item.product_id,
          qty: item.qty,
          purchase_price: item.purchase_price,
          gst_percent: item.gst_percent,
          total_amount: (item.qty * item.purchase_price) * (1 + item.gst_percent / 100)
        })

        // Stock update
        await supabase.rpc('add_stock_movement', {
          p_business_id: bid,
          p_product_id: item.product_id,
          p_movement_type: 'purchase_in',
          p_quantity: item.qty,
          p_note: `Purchased via ${purchase.invoice_no}`
        })
      }

      setSavedData({
        ...purchase,
        supplierName: suppliers.find(s => s.id === supplierId)?.name,
        supplierPhone: suppliers.find(s => s.id === supplierId)?.phone,
        supplierAddress: suppliers.find(s => s.id === supplierId)?.address,
        supplierGstin: suppliers.find(s => s.id === supplierId)?.gstin,
        items: items,
        discountAmount,
        discountType
      })
      setShowBill(true)

    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>
  return (
    <main className="p-4 max-w-md mx-auto pb-24">
      {/* PRINT BILL VIEW */}
      {showBill && savedData ? (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-4">
          <div className="flex justify-between mb-4 no-print">
            <button onClick={() => { setShowBill(false); router.push('/owner') }} className="text-blue-600 font-bold">← Back</button>
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Print / Save PDF</button>
          </div>

          <div className="border-2 border-black p-4 max-w-2xl mx-auto text-black text-sm">
            <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-black text-blue-800">Purchase Invoice</h1>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold border border-black px-2 py-1 inline-block">PURCHASE BILL</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b-2 border-black pb-4 mb-4">
              <div>
                <h3 className="font-bold underline mb-1">Supplier Detail</h3>
                <p className="font-bold">{savedData.supplierName}</p>
                <p>Phone: {savedData.supplierPhone || '-'}</p>
                <p>Address: {savedData.supplierAddress || '-'}</p>
                <p>GSTIN: {savedData.supplierGstin || '-'}</p>
              </div>
              <div className="text-right">
                <p><span className="font-bold">Invoice No:</span> {savedData.invoice_no}</p>
                <p><span className="font-bold">Date:</span> {new Date(savedData.purchase_date).toLocaleDateString('en-IN')}</p>
                <p><span className="font-bold">Due Amount:</span> ₹{savedData.due_amount.toFixed(2)}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-black mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1">Sr.</th>
                  <th className="border border-black p-1 text-left">Product</th>
                  <th className="border border-black p-1">Qty</th>
                  <th className="border border-black p-1">Rate</th>
                  <th className="border border-black p-1">GST%</th>
                  <th className="border border-black p-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {savedData.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-black p-1 text-center">{i + 1}</td>
                    <td className="border border-black p-1">{item.name}</td>
                    <td className="border border-black p-1 text-center">{item.qty} {item.unit}</td>
                    <td className="border border-black p-1 text-right">₹{item.purchase_price.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center">{item.gst_percent}%</td>
                    <td className="border border-black p-1 text-right">₹{(item.qty * item.purchase_price).toFixed(2)}</td>
                  </tr>
                ))}
                <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">Subtotal</td><td className="border border-black p-1 text-right font-bold">₹{savedData.subtotal.toFixed(2)}</td></tr>
                <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">GST</td><td className="border border-black p-1 text-right font-bold">₹{savedData.total_gst.toFixed(2)}</td></tr>
                {savedData.discountAmount > 0 && (
                  <tr><td colSpan={5} className="border border-black p-1 text-right font-bold text-red-600">Discount {savedData.discountType === 'percent' ? `(${savedData.discount}%)` : ''}</td><td className="border border-black p-1 text-right font-bold text-red-600">- ₹{savedData.discountAmount.toFixed(2)}</td></tr>
                )}
                <tr className="bg-gray-100"><td colSpan={5} className="border border-black p-1 text-right font-black">Grand Total</td><td className="border border-black p-1 text-right font-black">₹{savedData.total_amount.toFixed(2)}</td></tr>
              </tbody>
            </table>
            <div className="mt-8 flex justify-between"><p>Supplier Signature</p><p>Authorized Signatory</p></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">New Purchase</h1>
            <Link href="/owner" className="text-blue-600 text-sm">← Dashboard</Link>
          </div>

          <div className="space-y-4 bg-white p-4 rounded-xl border shadow-sm">
            {/* Supplier */}
            <div>
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-700">Supplier</label>
                <button onClick={() => setShowSupplierModal(true)} className="text-xs text-blue-600 font-bold">+ New</button>
              </div>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm bg-slate-50">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Invoice & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Invoice No.</label>
                <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Auto if empty" className="w-full mt-1 p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Date</label>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" />
              </div>
            </div>
            {/* Items List */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-800">Items</label>
                <div className="flex gap-2">
                  <button onClick={() => setShowProductModal(true)} className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md">+ New Prod</button>
                  <button onClick={addItem} className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-md">+ Add Item</button>
                </div>
              </div>
              
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg mb-3 border border-slate-200 relative">
                  <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold">×</button>
                  <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="w-full p-2 border rounded-md text-sm mb-2">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Qty</label>
                      <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">Rate (₹)</label>
                      <input type="number" value={item.purchase_price} onChange={e => updateItem(idx, 'purchase_price', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500">GST (%)</label>
                      <input type="number" value={item.gst_percent} onChange={e => updateItem(idx, 'gst_percent', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div className="border-t pt-3">
              <label className="text-xs font-bold text-slate-700">Discount</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="0" />
                <select value={discountType} onChange={e => setDiscountType(e.target.value as 'flat'|'percent')} className="p-2 border rounded-lg text-sm bg-slate-50 font-bold w-20">
                  <option value="flat">₹</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            {/* Payment Inputs */}
            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Cash Amount</label>
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Online Amount</label>
                <input type="number" value={onlineAmount} onChange={e => setOnlineAmount(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" placeholder="0" />
              </div>
            </div>

            {/* CALCULATION BREAKDOWN (JAISA SALES ME HAI) */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-200 mt-2">
              <div className="flex justify-between text-slate-600"><span>Subtotal:</span> <span className="font-medium text-slate-800">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>GST:</span> <span className="font-medium text-slate-800">₹{totalGst.toFixed(2)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span> <span className="font-medium">- ₹{discountAmount.toFixed(2)}</span></div>}
              
              <div className="flex justify-between font-bold text-base text-slate-900 border-t pt-2 mt-2"><span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span></div>
              
              <div className="flex justify-between text-emerald-600"><span>Cash Paid:</span> <span className="font-medium">₹{cashNum.toFixed(2)}</span></div>
              <div className="flex justify-between text-blue-600"><span>Online Paid:</span> <span className="font-medium">₹{onlineNum.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-slate-700"><span>Total Paid:</span> <span>₹{totalPaid.toFixed(2)}</span></div>
              
              {dueAmount > 0 ? (
                <div className="flex justify-between font-bold text-red-600 border-t border-red-200 pt-2 mt-2 bg-red-50 p-2 rounded-lg">
                  <span>Due Amount:</span> <span>₹{dueAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-emerald-600 border-t border-emerald-200 pt-2 mt-2 bg-emerald-50 p-2 rounded-lg">
                  <span>Due Amount:</span> <span>₹0.00 (Paid)</span>
                </div>
              )}
            </div>

            <button onClick={savePurchase} disabled={saving} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-4">
              {saving ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </>
      )}

      {/* MODALS FOR QUICK ADD */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold mb-4 text-lg">Add New Supplier</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Supplier Name *</label>
                <input value={newSupName} onChange={e => setNewSupName(e.target.value)} placeholder="e.g. Sharma Traders" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Phone</label>
                <input value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} placeholder="9876543210" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Address</label>
                <input value={newSupAddress} onChange={e => setNewSupAddress(e.target.value)} placeholder="City / Area" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">GSTIN</label>
                <input value={newSupGstin} onChange={e => setNewSupGstin(e.target.value)} placeholder="GST Number" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowSupplierModal(false)} className="flex-1 bg-gray-100 py-2.5 rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={addQuickSupplier} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold mb-4 text-lg">Add New Product</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Product Name *</label>
                <input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="e.g. Router" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Purchase Price *</label>
                <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="0" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">GST %</label>
                <input type="number" value={newProdGst} onChange={e => setNewProdGst(e.target.value)} placeholder="0" className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowProductModal(false)} className="flex-1 bg-gray-100 py-2.5 rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={addQuickProduct} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}