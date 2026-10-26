'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Supplier = { id: string; name: string; state: string; gst_type: string; gstin: string; phone: string; address: string }
type Product = { id: string; name: string; hsn_code: string; purchase_price: number; gst_percent: number; stock_qty: number; unit: string }
type Item = { product_id: string; name: string; qty: number; purchase_price: number; gst_percent: number; unit: string }

export default function PurchasesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Item[]>([])
  
  // Business State (For GST Logic)
  const [myBusinessState, setMyBusinessState] = useState('')

  // Form States
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [transportCharge, setTransportCharge] = useState('')
  
  const [cashAmount, setCashAmount] = useState('')
  const [onlineAmount, setOnlineAmount] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBill, setShowBill] = useState(false)
  const [savedData, setSavedData] = useState<any>(null)

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  
  // New Supplier State
  const [newSupBizName, setNewSupBizName] = useState('')
  const [newSupOwnerName, setNewSupOwnerName] = useState('')
  const [newSupPhone, setNewSupPhone] = useState('')
  const [newSupEmail, setNewSupEmail] = useState('')
  const [newSupGstType, setNewSupGstType] = useState('unregistered')
  const [newSupGstin, setNewSupGstin] = useState('')
  const [newSupState, setNewSupState] = useState('')
  const [newSupAddress, setNewSupAddress] = useState('')
  const [newSupOpeningBalance, setNewSupOpeningBalance] = useState('')

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

    // 1. Fetch Business Details (State for GST)
    const { data: biz } = await supabase.from('businesses').select('state').eq('id', bid).single()
    if (biz) setMyBusinessState(biz.state || '')

    // 2. Fetch Suppliers & Products
    const [supRes, prodRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('business_id', bid).order('name'),
      supabase.from('products').select('*').eq('business_id', bid).order('name')
    ])

    if (supRes.data) setSuppliers(supRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    setLoading(false)
  }

  // --- CALCULATIONS & TAX LOGIC ---
  const selectedSupplier = suppliers.find(s => s.id === supplierId)
  
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.purchase_price), 0)
  const totalGst = items.reduce((sum, item) => sum + ((item.qty * item.purchase_price) * item.gst_percent) / 100, 0)
  
  const discountInput = Number(discount) || 0
  const discountAmount = discountType === 'percent' ? ((subtotal + totalGst) * discountInput) / 100 : discountInput
  
  const transportNum = Number(transportCharge) || 0
  const grandTotal = Math.max(0, subtotal + totalGst - discountAmount + transportNum)
  
  const cashNum = Number(cashAmount) || 0
  const onlineNum = Number(onlineAmount) || 0
  const totalPaid = cashNum + onlineNum
  const dueAmount = Math.max(0, grandTotal - totalPaid)

  // 🚀 DYNAMIC TAX LOGIC (No Hardcoding)
  let cgst = 0, sgst = 0, igst = 0;
  if (selectedSupplier && myBusinessState) {
    if (selectedSupplier.state === myBusinessState) {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
      igst = 0;
    } else {
      cgst = 0;
      sgst = 0;
      igst = totalGst;
    }
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
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        discount: discountAmount,
        transport_charge: transportNum,
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
        supplierName: selectedSupplier?.name,
        supplierState: selectedSupplier?.state,
        supplierGstin: selectedSupplier?.gstin,
        items: items,
        discountAmount, discountType, cgst, sgst, igst, transportNum
      })
      setShowBill(true)

    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addQuickSupplier() {
    if (!newSupBizName) return alert('Business Name required')
    const bid = getCurrentBusinessId()
    const { data, error } = await supabase.from('suppliers').insert({
      business_id: bid, 
      name: newSupBizName, 
      owner_name: newSupOwnerName,
      phone: newSupPhone,
      email: newSupEmail,
      gst_type: newSupGstType,
      gstin: newSupGstin,
      state: newSupState,
      address: newSupAddress,
      opening_balance: Number(newSupOpeningBalance) || 0,
      current_balance: Number(newSupOpeningBalance) || 0
    }).select().single()
    
    if (!error && data) {
      setSuppliers([...suppliers, data])
      setSupplierId(data.id)
      setShowSupplierModal(false)
      // Reset fields...
    } else { alert('Error: ' + error?.message) }
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
    } else { alert('Error adding product') }
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
                <p>State: {savedData.supplierState || '-'}</p>
                <p>GSTIN: {savedData.supplierGstin || 'Unregistered'}</p>
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
                {savedData.cgst > 0 && <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">CGST</td><td className="border border-black p-1 text-right font-bold">₹{savedData.cgst.toFixed(2)}</td></tr>}
                {savedData.sgst > 0 && <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">SGST</td><td className="border border-black p-1 text-right font-bold">₹{savedData.sgst.toFixed(2)}</td></tr>}
                {savedData.igst > 0 && <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">IGST</td><td className="border border-black p-1 text-right font-bold">₹{savedData.igst.toFixed(2)}</td></tr>}
                {savedData.discountAmount > 0 && (
                  <tr><td colSpan={5} className="border border-black p-1 text-right font-bold text-red-600">Discount {savedData.discountType === 'percent' ? `(${savedData.discount}%)` : ''}</td><td className="border border-black p-1 text-right font-bold text-red-600">- ₹{savedData.discountAmount.toFixed(2)}</td></tr>
                )}
                {savedData.transportNum > 0 && <tr><td colSpan={5} className="border border-black p-1 text-right font-bold">Transport</td><td className="border border-black p-1 text-right font-bold">₹{savedData.transportNum.toFixed(2)}</td></tr>}
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

            <div className="border-t pt-3 grid grid-cols-2 gap-3">
               <div>
                <label className="text-xs font-bold text-slate-700">Discount</label>
                <div className="flex gap-1 mt-1">
                  <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="0" />
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as 'flat'|'percent')} className="p-2 border rounded-lg text-sm bg-slate-50 font-bold">
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Transport Charge</label>
                <input type="number" value={transportCharge} onChange={e => setTransportCharge(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" placeholder="0" />
              </div>
            </div>

            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Cash Paid</label>
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Online Paid</label>
                <input type="number" value={onlineAmount} onChange={e => setOnlineAmount(e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" placeholder="0" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-200 mt-2">
              <div className="flex justify-between text-slate-600"><span>Subtotal:</span> <span className="font-medium text-slate-800">₹{subtotal.toFixed(2)}</span></div>
              {cgst > 0 && <div className="flex justify-between text-slate-600"><span>CGST:</span> <span className="font-medium text-slate-800">₹{cgst.toFixed(2)}</span></div>}
              {sgst > 0 && <div className="flex justify-between text-slate-600"><span>SGST:</span> <span className="font-medium text-slate-800">₹{sgst.toFixed(2)}</span></div>}
              {igst > 0 && <div className="flex justify-between text-slate-600"><span>IGST:</span> <span className="font-medium text-slate-800">₹{igst.toFixed(2)}</span></div>}
              {transportNum > 0 && <div className="flex justify-between text-slate-600"><span>Transport:</span> <span className="font-medium text-slate-800">₹{transportNum.toFixed(2)}</span></div>}
              {discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span> <span className="font-medium">- ₹{discountAmount.toFixed(2)}</span></div>}
              
              <div className="flex justify-between font-bold text-base text-slate-900 border-t pt-2 mt-2"><span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Total Paid:</span> <span className="font-medium">₹{totalPaid.toFixed(2)}</span></div>
              
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

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-4 text-lg">Add New Supplier</h3>
            <div className="space-y-3">
              <input value={newSupBizName} onChange={e => setNewSupBizName(e.target.value)} placeholder="Business Name *" className="w-full p-2 border rounded-lg text-sm" />
              <input value={newSupOwnerName} onChange={e => setNewSupOwnerName(e.target.value)} placeholder="Owner Name" className="w-full p-2 border rounded-lg text-sm" />
              <input value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} placeholder="Phone" className="w-full p-2 border rounded-lg text-sm" />
              <input value={newSupEmail} onChange={e => setNewSupEmail(e.target.value)} placeholder="Gmail (Optional)" className="w-full p-2 border rounded-lg text-sm" />
              
              <select value={newSupGstType} onChange={e => setNewSupGstType(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                <option value="unregistered">Unregistered (None)</option>
                <option value="registered">Registered (Regular)</option>
              </select>
              
              {newSupGstType === 'registered' && (
                <input value={newSupGstin} onChange={e => setNewSupGstin(e.target.value)} placeholder="GSTIN" className="w-full p-2 border rounded-lg text-sm" />
              )}

              <select value={newSupState} onChange={e => setNewSupState(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                <option value="">Select State</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Delhi">Delhi</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Bihar">Bihar</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
                <option value="Gujarat">Gujarat</option>
                <option value="West Bengal">West Bengal</option>
              </select>

              <input value={newSupAddress} onChange={e => setNewSupAddress(e.target.value)} placeholder="Address" className="w-full p-2 border rounded-lg text-sm" />
              <input type="number" value={newSupOpeningBalance} onChange={e => setNewSupOpeningBalance(e.target.value)} placeholder="Opening Balance (Purana Udhaar)" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowSupplierModal(false)} className="flex-1 bg-gray-100 py-2.5 rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={addQuickSupplier} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-5 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold mb-4 text-lg">Add New Product</h3>
            <div className="space-y-3">
              <input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="Product Name *" className="w-full p-2 border rounded-lg text-sm" />
              <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="Purchase Price *" className="w-full p-2 border rounded-lg text-sm" />
              <input type="number" value={newProdGst} onChange={e => setNewProdGst(e.target.value)} placeholder="GST %" className="w-full p-2 border rounded-lg text-sm" />
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
