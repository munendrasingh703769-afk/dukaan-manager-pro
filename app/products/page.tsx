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

const inTypes = [
  'stock_in',
  'purchase_in',
  'sales_return',
  'adjustment_in',
]

const outTypes = [
  'stock_out',
  'sale_out',
  'purchase_return',
  'damage_out',
  'expiry_out',
  'adjustment_out',
]

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
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null)

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

  const [movementProduct, setMovementProduct] =
    useState<Product | null>(null)

  const [movementType, setMovementType] =
    useState('purchase_in')

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
      .select(
        'id, product_id, movement_type, quantity, note, created_at'
      )
      .eq('business_id', bizId())
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setHistoryLoading(false)
      return
    }

    const rows = (data ?? []) as Movement[]

    const productIds = [
      ...new Set(rows.map((item) => item.product_id)),
    ]

    let productMap: Record<
      string,
      { name: string; unit: string | null }
    > = {}

    if (productIds.length > 0) {
      const { data: productData, error: productError } =
        await supabase
          .from('products')
          .select('id, name, unit')
      .eq('business_id', bizId())
          .in('id', productIds)

      if (productError) {
        setError(productError.message)
      } else {
        productMap = Object.fromEntries(
          (productData ?? []).map((product) => [
            product.id,
            {
              name: product.name,
              unit: product.unit,
            },
          ])
        )
      }
    }

    const finalRows = rows.map((item) => ({
      ...item,
      product_name:
        productMap[item.product_id]?.name ??
        'Unknown Product',
      unit:
        productMap[item.product_id]?.unit ?? null,
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
    if (!bid) {
      setPermChecked(true)
      return
    }
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

    setPurchasePrice(
      product.purchase_price != null
        ? String(product.purchase_price)
        : ''
    )

    setSellingPrice(
      product.selling_price != null
        ? String(product.selling_price)
        : ''
    )

    setStockQty(
      product.stock_qty != null
        ? String(product.stock_qty)
        : ''
    )

    setLowStockLimit(
      product.low_stock_limit != null
        ? String(product.low_stock_limit)
        : ''
    )

    setGstPercent(
      product.gst_percent != null
        ? String(product.gst_percent)
        : ''
    )

    setShowForm(true)
    setMessage('')
    setError('')
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError('Product name is required.')
      return
    }

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
      result = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
    } else {
      result = await supabase
        .from('products')
        .insert({ ...payload, business_id: bizId() })
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(
      editingProduct
        ? 'Product updated successfully.'
        : 'Product added successfully.'
    )

    setShowForm(false)
    resetForm()

    await loadProducts()

    setSaving(false)
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Product deleted successfully.')

    await loadProducts()
    await loadMovementHistory()
  }
  async function deleteMovement(movement: Movement) {
    const confirmed = window.confirm(
      'Delete this movement? Stock bhi adjust ho jayega.'
    )
    if (!confirmed) return

    setError('')
    setMessage('')

    const { data: prod } = await supabase
      .from('products')
      .select('id, stock_qty')
      .eq('business_id', bizId())
      .eq('id', movement.product_id)
      .single()

    if (!prod) {
      setError('Product not found')
      return
    }

    const isIn = ['purchase_in', 'sales_return', 'adjustment_in'].includes(
      movement.movement_type
    )
    const reverseQty = isIn
      ? -Number(movement.quantity)
      : Number(movement.quantity)
    const newStock = Number(prod.stock_qty || 0) + reverseQty

    const { error: updErr } = await supabase
      .from('products')
      .update({ stock_qty: newStock })
      .eq('id', movement.product_id)

    if (updErr) {
      setError(updErr.message)
      return
    }

    const { error: delErr } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', movement.id)

    if (delErr) {
      setError(delErr.message)
      return
    }

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

    if (!qty || qty <= 0) {
      setError('Quantity must be greater than 0.')
      return
    }

    const isOut = outTypes.includes(movementType)

    const currentStock = Number(
      movementProduct.stock_qty ?? 0
    )

    if (isOut && qty > currentStock) {
      setError(
        `Stock available only ${currentStock} ${
          movementProduct.unit ?? ''
        }.`
      )
      return
    }

    setMovementSaving(true)
    setError('')
    setMessage('')

    const { error } = await supabase.rpc(
      'add_stock_movement',
      {
        p_product_id: movementProduct.id,
        p_movement_type: movementType,
        p_quantity: qty,
        p_note: movementNote.trim() || null,
      }
    )

    if (error) {
      setError(error.message)
      setMovementSaving(false)
      return
    }

    setMessage(
      `${
        movementLabels[movementType] ?? movementType
      } saved successfully.`
    )

    setMovementProduct(null)

    await loadProducts()
    await loadMovementHistory()

    setMovementSaving(false)
  }

  function getMovementSign(type: string) {
    if (inTypes.includes(type)) {
      return '+'
    }

    return '-'
  }

  function getMovementClass(type: string) {
    if (inTypes.includes(type)) {
      return 'text-green-600'
    }

    return 'text-red-600'
  }

  if (permChecked && !hasPermission(perms, 'products_view')) {
    return (
      <main className="p-4 flex items-center justify-center min-h-screen">
        <div className="rounded-2xl bg-white border-2 border-red-300 p-6 max-w-md text-center shadow">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aapko Products & Stock ka access nahi hai. Owner se permission maangein.
          </p>
          <Link href="/" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
             Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Products & Stock
            </h1>

            <p className="mt-1 text-gray-600">
              Products, stock and movement history
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white"
            >
              Refresh
            </button>

            <button
              onClick={openAddForm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              + Add Product
            </button>
          <button
            onClick={() => setShowProductPicker(true)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
          >
            Adjust Stock
          </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        {showProductPicker && (
        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Select Product</h2>
            <button
              onClick={() => setShowProductPicker(false)}
              className="text-sm text-gray-600"
            >
              Close
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  openMovement(p)
                  setShowProductPicker(false)
                }}
                className="w-full rounded-lg border p-3 text-left hover:bg-gray-50"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  Stock: {p.stock_qty} {p.unit || ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingProduct
                  ? 'Edit Product'
                  : 'Add Product'}
              </h2>

              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="rounded-lg bg-gray-200 px-3 py-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={saveProduct}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Name *"
                className="rounded-lg border p-3"
              />

              <input
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                placeholder="Category"
                className="rounded-lg border p-3"
              />

              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU"
                className="rounded-lg border p-3"
              />

              <input
                value={hsnCode}
                onChange={(e) =>
                  setHsnCode(e.target.value)
                }
                placeholder="HSN Code"
                className="rounded-lg border p-3"
              />

              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit (pcs/kg/litre)"
                className="rounded-lg border p-3"
              />

              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) =>
                  setPurchasePrice(e.target.value)
                }
                placeholder="Purchase Price"
                className="rounded-lg border p-3"
              />

              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(e.target.value)
                }
                placeholder="Selling Price"
                className="rounded-lg border p-3"
              />

              <input
                type="number"
                step="0.01"
                value={stockQty}
                onChange={(e) =>
                  setStockQty(e.target.value)
                }
                placeholder="Opening Stock"
                className="rounded-lg border p-3"
              />

              <input
                type="number"
                step="0.01"
                value={lowStockLimit}
                onChange={(e) =>
                  setLowStockLimit(e.target.value)
                }
                placeholder="Low Stock Limit"
                className="rounded-lg border p-3"
              />

              <input
                type="number"
                step="0.01"
                value={gstPercent}
                onChange={(e) =>
                  setGstPercent(e.target.value)
                }
                placeholder="GST %"
                className="rounded-lg border p-3"
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                      ? 'Update Product'
                      : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        )}

        {movementProduct && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow">
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                Stock Movement
              </h2>

              <p className="mt-1 text-gray-600">
                {movementProduct.name} — Current Stock:{' '}
                <strong>
                  {movementProduct.stock_qty ?? 0}{' '}
                  {movementProduct.unit ?? ''}
                </strong>
              </p>
            </div>

            <form
              onSubmit={saveMovement}
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              <select
                value={movementType}
                onChange={(e) =>
                  setMovementType(e.target.value)
                }
                className="rounded-lg border p-3"
              >
                <optgroup label="Stock In">
                  <option value="purchase_in">
                    Purchase Received
                  </option>

                  <option value="sales_return">
                    Sales Return
                  </option>

                  <option value="adjustment_in">
                    Adjustment In
                  </option>
                </optgroup>

                <optgroup label="Stock Out">
                  <option value="sale_out">
                    Sale
                  </option>

                  <option value="purchase_return">
                    Purchase Return
                  </option>

                  <option value="damage_out">
                    Damage
                  </option>

                  <option value="expiry_out">
                    Expiry
                  </option>

                  <option value="adjustment_out">
                    Adjustment Out
                  </option>
                </optgroup>
              </select>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={movementQty}
                onChange={(e) =>
                  setMovementQty(e.target.value)
                }
                placeholder="Quantity"
                className="rounded-lg border p-3"
              />

              <input
                value={movementNote}
                onChange={(e) =>
                  setMovementNote(e.target.value)
                }
                placeholder="Note"
                className="rounded-lg border p-3"
              />

              <div className="flex gap-2 md:col-span-3">
                <button
                  type="submit"
                  disabled={movementSaving}
                  className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  {movementSaving
                    ? 'Saving...'
                    : 'Save Movement'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMovementProduct(null)
                  }
                  className="rounded-lg bg-gray-200 px-5 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="mb-8 rounded-2xl bg-white shadow">
          <div className="border-b p-4">
            <h2 className="text-lg font-bold">
              Product List
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-gray-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-gray-500">
              No products found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">HSN</th>
                    <th className="p-3">Purchase</th>
                    <th className="p-3">Selling</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">GST</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => {
                    const stock =
                      Number(product.stock_qty ?? 0)

                    const lowLimit =
                      Number(
                        product.low_stock_limit ?? 0
                      )

                    const isLow =
                      lowLimit > 0 &&
                      stock <= lowLimit

                    return (
                      <tr
                        key={product.id}
                        className="border-t"
                      >
                        <td className="p-3">
                          <div className="font-medium">
                            {product.name}
                          </div>

                          {product.category && (
                            <div className="text-xs text-gray-500">
                              {product.category}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          {product.sku || '-'}
                        </td>

                        <td className="p-3">
                          {product.hsn_code || '-'}
                        </td>

                        <td className="p-3">
                          ₹
                          {Number(
                            product.purchase_price ?? 0
                          ).toFixed(2)}
                        </td>

                        <td className="p-3">
                          ₹
                          {Number(
                            product.selling_price ?? 0
                          ).toFixed(2)}
                        </td>

                        <td className="p-3">
                          <span
                            className={
                              isLow
                                ? 'font-bold text-red-600'
                                : 'font-medium'
                            }
                          >
                            {stock}{' '}
                            {product.unit ?? ''}
                          </span>

                          {isLow && (
                            <div className="text-xs text-red-600">
                              Low Stock
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          {Number(
                            product.gst_percent ?? 0
                          )}
                          %
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                openMovement(product)
                              }
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white"
                            >
                              Stock
                            </button>

                            <button
                              onClick={() =>
                                openEditForm(product)
                              }
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteProduct(product)
                              }
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-bold">
                Stock Movement History
              </h2>

              <p className="text-sm text-gray-500">
                Latest 100 stock movements
              </p>
            </div>

            <button
              onClick={loadMovementHistory}
              className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white"
            >
              Refresh History
            </button>
          </div>

          {historyLoading ? (
            <div className="p-6 text-gray-500">
              Loading history...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-gray-500">
              No stock movement history found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Movement</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Note</th>
              <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-t"
                    >
                      <td className="p-3 whitespace-nowrap">
                        {new Date(
                          movement.created_at
                        ).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 font-medium">
                        {movement.product_name}
                      </td>

                      <td className="p-3">
                        {movementLabels[
                          movement.movement_type
                        ] ?? movement.movement_type}
                      </td>

                      <td
                        className={`p-3 font-bold ${getMovementClass(
                          movement.movement_type
                        )}`}
                      >
                        {getMovementSign(
                          movement.movement_type
                        )}
                        {movement.quantity}{' '}
                        {movement.unit ?? ''}
                      </td>

                      <td className="p-3 text-gray-600">
                        {movement.note || '-'}
                      </td>
              <td className="p-3">
                {!['purchase_in', 'sale_out'].includes(movement.movement_type) && (
                  <button
                    type="button"
                    onClick={() => deleteMovement(movement)}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Delete
                  </button>
                )}
              </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
