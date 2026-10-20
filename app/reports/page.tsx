 'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'
import Link from 'next/link';

type Product = {
  id: string
  name: string
  category: string | null
  sku: string | null
  hsn_code: string | null
  unit: string | null
  purchase_price: number | null
  selling_price: number | null
  stock_qty: number | null
  low_stock_limit: number | null
  gst_percent: number | null
  created_at: string
}

type Movement = {
  id: string
  product_id: string
  movement_type: string
  quantity: number
  note: string | null
  created_at: string
  product_name?: string
  unit?: string | null
}

const movementLabels: Record<string, string> = {
  stock_in: 'Old Stock In',
  stock_out: 'Old Stock Out',
  purchase_in: 'Purchase Received',
  sales_return: 'Sales Return',
  adjustment_in: 'Adjustment In',
  sale_out: 'Sale',
  purchase_return: 'Purchase Return',
  damage_out: 'Damage',
  expiry_out: 'Expiry',
  adjustment_out: 'Adjustment Out',
}

const inTypes = ['stock_in', 'purchase_in', 'sales_return', 'adjustment_in']
const outTypes = ['stock_out', 'sale_out', 'purchase_return', 'damage_out', 'expiry_out', 'adjustment_out']

let BUSINESS_ID = ''

export default function ProductsPage() {
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])

  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState<Permissions>({})
  const [permChecked, setPermChecked] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [sku, setSku] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [lowStockLimit, setLowStockLimit] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [saving, setSaving] = useState(false)

  const [movementProduct, setMovementProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState('purchase_in')
  const [movementQty, setMovementQty] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [movementSaving, setMovementSaving] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', bizId())
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }
    setProducts((data ?? []) as Product[])
  }
  async function loadMovementHistory() {
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, product_id, movement_type, quantity, note, created_at')
      .eq('business_id', bizId())
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setHistoryLoading(false)
      return
    }

    const rows = (data ?? []) as Movement[]
    const productIds = [...new Set(rows.map((item) => item.product_id))]
    let productMap: Record<string, { name: string; unit: string | null }> = {}

    if (productIds.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('business_id', bizId())
        .in('id', productIds)

      if (!productError) {
        productMap = Object.fromEntries(
          (productData ?? []).map((product) => [
            product.id,
            { name: product.name, unit: product.unit },
          ])
        )
      }
    }

    const finalRows = rows.map((item) => ({
      ...item,
      product_name: productMap[item.product_id]?.name ?? 'Unknown Product',
      unit: productMap[item.product_id]?.unit ?? null,
    }))

    setMovements(finalRows)
    setHistoryLoading(false)
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    await loadProducts()
    await loadMovementHistory()
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    loadPerms()
  }, [])

  async function loadPerms() {
    const bid = bizId()
    if (!bid) return setPermChecked(true)
    const p = await getUserPermissions(bid)
    setPerms(p)
    setPermChecked(true)
  }

  function resetForm() {
    setEditingProduct(null)
    setName('')
    setCategory('')
    setSku('')
    setHsnCode('')
    setUnit('pcs')
    setPurchasePrice('')
    setSellingPrice('')
    setStockQty('')
    setLowStockLimit('')
    setGstPercent('')
  }

  function openAddForm() {
    resetForm()
    setShowForm(true)
    setMessage('')
    setError('')
  }

  function openEditForm(product: Product) {
    setEditingProduct(product)
    setName(product.name ?? '')
    setCategory(product.category ?? '')
    setSku(product.sku ?? '')
    setHsnCode(product.hsn_code ?? '')
    setUnit(product.unit ?? 'pcs')
    setPurchasePrice(product.purchase_price != null ? String(product.purchase_price) : '')
    setSellingPrice(product.selling_price != null ? String(product.selling_price) : '')
    setStockQty(product.stock_qty != null ? String(product.stock_qty) : '')
    setLowStockLimit(product.low_stock_limit != null ? String(product.low_stock_limit) : '')
    setGstPercent(product.gst_percent != null ? String(product.gst_percent) : '')
    setShowForm(true)
    setMessage('')
    setError('')
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Product name is required.')

    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      sku: sku.trim() || null,
      hsn_code: hsnCode.trim() || null,
      unit: unit.trim() || 'pcs',
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      stock_qty: Number(stockQty) || 0,
      low_stock_limit: Number(lowStockLimit) || 0,
      gst_percent: Number(gstPercent) || 0,
    }

    let result
    if (editingProduct) {
      result = await supabase.from('products').update(payload).eq('id', editingProduct.id)
    } else {
      result = await supabase.from('products').insert({ ...payload, business_id: bizId() })
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(editingProduct ? 'Product updated successfully.' : 'Product added successfully.')
    setShowForm(false)
    resetForm()
    await loadProducts()
    setSaving(false)
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return
    setError('')
    setMessage('')
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) return setError(error.message)
    setMessage('Product deleted successfully.')
    await loadProducts()
    await loadMovementHistory()
  }

  async function deleteMovement(movement: Movement) {
    if (!window.confirm('Delete this movement? Stock bhi adjust ho jayega.')) return
    setError('')
    setMessage('')

    const { data: prod } = await supabase.from('products').select('id, stock_qty').eq('business_id', bizId()).eq('id', movement.product_id).single()
    if (!prod) return setError('Product not found')

    const isIn = ['purchase_in', 'sales_return', 'adjustment_in'].includes(movement.movement_type)
    const reverseQty = isIn ? -Number(movement.quantity) : Number(movement.quantity)
    const newStock = Number(prod.stock_qty || 0) + reverseQty

    const { error: updErr } = await supabase.from('products').update({ stock_qty: newStock }).eq('id', movement.product_id)
    if (updErr) return setError(updErr.message)

    const { error: delErr } = await supabase.from('stock_movements').delete().eq('id', movement.id)
    if (delErr) return setError(delErr.message)

    setMessage('Stock movement deleted.')
    await loadProducts()
    await loadMovementHistory()
  }

  function openMovement(product: Product) {
    setMovementProduct(product)
    setMovementType('purchase_in')
    setMovementQty('')
    setMovementNote('')
    setError('')
    setMessage('')
  }

  async function saveMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!movementProduct) return

    const qty = Number(movementQty)
    if (!qty || qty <= 0) return setError('Quantity must be greater than 0.')

    const isOut = outTypes.includes(movementType)
    const currentStock = Number(movementProduct.stock_qty ?? 0)

    if (isOut && qty > currentStock) {
      return setError(`Stock available only ${currentStock} ${movementProduct.unit ?? ''}.`)
    }

    setMovementSaving(true)
    setError('')
    setMessage('')

    const { error } = await supabase.rpc('add_stock_movement', {
      p_product_id: movementProduct.id,
      p_movement_type: movementType,
      p_quantity: qty,
      p_note: movementNote.trim() || null,
    })

    if (error) {
      setError(error.message)
      setMovementSaving(false)
      return
    }

    setMessage(`${movementLabels[movementType] ?? movementType} saved successfully.`)
    setMovementProduct(null)
    await loadProducts()
    await loadMovementHistory()
    setMovementSaving(false)
  }

  function getMovementSign(type: string) {
    return inTypes.includes(type) ? '+' : '-'
  }

  function getMovementClass(type: string) {
    return inTypes.includes(type) ? 'text-emerald-600' : 'text-rose-600'
  }

  if (permChecked && !hasPermission(perms, 'products_view')) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-8 max-w-md text-center shadow-xl">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-500">Aapko Products & Stock ka access nahi hai. Owner se permission maangein.</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-700 transition">Go to Dashboard</Link>
        </div>
      </main>
    )
  }
  // Calculate Summary Stats
  const totalProducts = products.length
  const lowStockCount = products.filter(p => Number(p.stock_qty ?? 0) <= Number(p.low_stock_limit ?? 0) && Number(p.low_stock_limit ?? 0) > 0).length
  const totalValue = products.reduce((acc, p) => acc + (Number(p.stock_qty ?? 0) * Number(p.purchase_price ?? 0)), 0)

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-slate-500 text-xl font-bold bg-slate-100 p-2 rounded-full w-9 h-9 flex items-center justify-center">←</Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Products & Stock</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">Manage your inventory</p>
          </div>
        </div>
        <button onClick={loadAll} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95 transition">Refresh</button>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Alerts */}
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
        {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">{message}</div>}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 shadow-lg text-white">
            <p className="text-xs text-indigo-100 font-medium mb-1">Total Products</p>
            <p className="text-3xl font-black">{totalProducts}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-1">Total Stock Value</p>
            <p className="text-3xl font-black text-slate-800">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-1">Low Stock Items</p>
            <p className="text-3xl font-black text-rose-500">{lowStockCount}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button onClick={openAddForm} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition flex items-center gap-2">
            <span>+</span> Add Product
          </button>
          <button onClick={() => setShowProductPicker(true)} className="bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-orange-600 active:scale-95 transition flex items-center gap-2">
            <span>⚖️</span> Adjust Stock
          </button>
        </div>

        {/* Modals (Forms) */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
              </div>
              <form onSubmit={saveProduct} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-2">
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Product Name *</label>
                   <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Wireless Mouse" required />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
                   <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Electronics" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">SKU</label>
                   <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="WM-001" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">HSN Code</label>
                   <input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1234" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Unit</label>
                   <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="pcs/kg" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Purchase Price (₹)</label>
                   <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Selling Price (₹)</label>
                   <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Opening Stock</label>
                   <input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">Low Stock Alert</label>
                   <input type="number" value={lowStockLimit} onChange={(e) => setLowStockLimit(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-600 mb-1 block">GST %</label>
                   <input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-emerald-700 transition">
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Movement Modal */}
        {movementProduct && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Stock Movement</h2>
                  <p className="text-xs text-slate-500">{movementProduct.name} (Current: {movementProduct.stock_qty} {movementProduct.unit})</p>
                </div>
                <button onClick={() => setMovementProduct(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
              </div>
              <form onSubmit={saveMovement} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Movement Type</label>
                  <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none">
                    <optgroup label="Stock In (Adds to inventory)">
                      <option value="purchase_in">Purchase Received</option>
                      <option value="sales_return">Sales Return</option>
                      <option value="adjustment_in">Adjustment In</option>
                    </optgroup>
                    <optgroup label="Stock Out (Removes from inventory)">
                      <option value="sale_out">Sale</option>
                      <option value="purchase_return">Purchase Return</option>
                      <option value="damage_out">Damage</option>
                      <option value="expiry_out">Expiry</option>
                      <option value="adjustment_out">Adjustment Out</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Quantity</label>
                  <input type="number" min="0.01" step="0.01" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter quantity" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Note (Optional)</label>
                  <input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Reason or reference" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMovementProduct(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl">Cancel</button>
                  <button type="submit" disabled={movementSaving} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md">
                    {movementSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Product Picker Modal */}
        {showProductPicker && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b bg-slate-50">
                <h2 className="font-bold text-slate-800">Select Product to Adjust</h2>
                <button onClick={() => setShowProductPicker(false)} className="text-slate-400 text-2xl">&times;</button>
              </div>
              <div className="p-3 max-h-[60vh] overflow-y-auto space-y-2">
                {products.map(p => (
                  <button key={p.id} onClick={() => { openMovement(p); setShowProductPicker(false); }} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex justify-between items-center">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">Qty: {p.stock_qty}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🔥 PRODUCT LIST TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Product List</h2>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{products.length} Items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 font-semibold">Product Details</th>
                  <th className="p-4 font-semibold">SKU / HSN</th>
                  <th className="p-4 font-semibold text-right">Purchase</th>
                  <th className="p-4 font-semibold text-right">Selling</th>
                  <th className="p-4 font-semibold text-center">Stock</th>
                  <th className="p-4 font-semibold text-center">GST</th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const stock = Number(product.stock_qty ?? 0)
                  const lowLimit = Number(product.low_stock_limit ?? 0)
                  const isLow = lowLimit > 0 && stock <= lowLimit

                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-base">{product.name}</div>
                        {product.category && <div className="text-xs text-indigo-600 font-medium mt-0.5">{product.category}</div>}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        <div>SKU: {product.sku || '-'}</div>
                        <div>HSN: {product.hsn_code || '-'}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-slate-700">
                        ₹{Number(product.purchase_price ?? 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-700">
                        ₹{Number(product.selling_price ?? 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                          {stock} {product.unit}
                        </span>
                        {isLow && <div className="text-[9px] text-rose-500 font-bold mt-1">LOW STOCK</div>}
                      </td>
                      <td className="p-4 text-center text-slate-600 text-xs">
                        {Number(product.gst_percent ?? 0)}%
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openMovement(product)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg transition" title="Adjust Stock">⚖️</button>
                          <button onClick={() => openEditForm(product)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition" title="Edit">✏️</button>
                          <button onClick={() => deleteProduct(product)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔥 STOCK MOVEMENT HISTORY TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Stock Movement History</h2>
            <button onClick={loadMovementHistory} className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">Refresh History</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4 font-semibold">Date & Time</th>
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold text-center">Qty</th>
                  <th className="p-4 font-semibold">Note</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(movement.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {movement.product_name}
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-medium">
                      {movementLabels[movement.movement_type] ?? movement.movement_type}
                    </td>
                    <td className={`p-4 font-black text-center text-base ${getMovementClass(movement.movement_type)}`}>
                      {getMovementSign(movement.movement_type)}{movement.quantity} <span className="text-[10px] font-medium">{movement.unit}</span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs max-w-[150px] truncate">
                      {movement.note || '-'}
                    </td>
                    <td className="p-4 text-center">
                      {!['purchase_in', 'sale_out'].includes(movement.movement_type) && (
                        <button onClick={() => deleteMovement(movement)} className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}