'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'

type Supplier = {
  id: string
  name: string
  phone: string | null
  address: string | null
}

type Product = {
  id: string
  name: string
  purchase_price: number
  gst_percent: number
  stock_qty: number
}

type PurchaseItem = {
  product_id: string
  product_name: string
  unit: string
  quantity: number
  purchase_price: number
  gst_percent: number
}

let BUSINESS_ID = ''

export default function PurchasesPage() {
  const router = useRouter()
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const supabase = createClient()
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [perms, setPerms] = useState<Permissions>({})
  const [permChecked, setPermChecked] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [discount, setDiscount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [onlineAmount, setOnlineAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<PurchaseItem[]>([
    { product_id: '', product_name: '', unit: 'PCS', quantity: 0, purchase_price: 0, gst_percent: 0 },
  ])

  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [supplierAddress, setSupplierAddress] = useState('')
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')

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

  async function loadData() {
    setMessage('')
    const { data: supplierData, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, phone, address')
      .eq('business_id', bizId())
      .order('name')

    if (supplierError) {
      setMessage('Supplier Error: ' + supplierError.message)
      return
    }

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, purchase_price, gst_percent, stock_qty')
      .eq('business_id', bizId())
      .order('name')

    if (productError) {
      setMessage('Product Error: ' + productError.message)
      return
    }

    setSuppliers(supplierData ?? [])
    setProducts(productData ?? [])
  }

  useEffect(() => {
    loadData()
    loadPerms()
  }, [])

  function updateItem(index: number, field: keyof PurchaseItem, value: any) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { product_id: '', product_name: '', unit: 'PCS', quantity: 0, purchase_price: 0, gst_percent: 0 },
    ])
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current
      return current.filter((_, i) => i !== index)
    })
  }

  const discountNum = Number(discount) || 0
  const cashNum = Number(cashAmount) || 0
  const onlineNum = Number(onlineAmount) || 0
  const paidAmountNum = cashNum + onlineNum

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.purchase_price, 0)
  }, [items])

  const gstAmount = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.quantity * item.purchase_price * item.gst_percent) / 100,
      0
    )
  }, [items])

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + gstAmount - discountNum)
  }, [subtotal, gstAmount, discountNum])

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmountNum)
  }, [grandTotal, paidAmountNum])

  function getPaymentMethod() {
    if (cashNum > 0 && onlineNum > 0) return 'split'
    if (onlineNum > 0) return 'online'
    return 'cash'
  }

  async function saveSupplier() {
    if (!supplierName.trim()) {
      alert('Supplier name required')
      return
    }
    setSupplierSaving(true)
    const payload = {
      name: supplierName.trim(),
      phone: supplierPhone.trim() || null,
      address: supplierAddress.trim() || null,
    }

    if (editingSupplier) {
      const { error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', editingSupplier.id)
      if (error) {
        alert(error.message)
        setSupplierSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('suppliers')
        .insert({ ...payload, business_id: bizId() })
      if (error) {
        alert(error.message)
        setSupplierSaving(false)
        return
      }
    }

    setSupplierSaving(false)
    setShowSupplierForm(false)
    setEditingSupplier(null)
    setSupplierName('')
    setSupplierPhone('')
    setSupplierAddress('')
    await loadData()
  }

  async function deleteSupplier(id: string) {
    if (!confirm('Delete this supplier?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    if (supplierId === id) setSupplierId('')
    await loadData()
  }

  async function savePurchase() {
    if (items.length === 0) {
      alert('Kam se kam 1 product add karo.')
      return
    }

    const subtotalVal = items.reduce(
      (sum, item) => sum + item.quantity * item.purchase_price,
      0
    )
    const taxableAmount = Math.max(0, subtotalVal - discountNum)
    const gstRateAmount = items.reduce(
      (sum, item) => sum + (item.quantity * item.purchase_price * item.gst_percent) / 100,
      0
    )
    const totalAmount = Math.max(0, taxableAmount + gstRateAmount)
    const dueAmountVal = Math.max(0, totalAmount - paidAmountNum)

    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        business_id: bizId(),
        supplier_id: supplierId || null,
        bill_no: invoiceNumber || null,
        subtotal: subtotalVal,
        discount: discountNum,
        taxable_amount: taxableAmount,
        cgst_amount: gstRateAmount / 2,
        sgst_amount: gstRateAmount / 2,
        igst_amount: 0,
        total_gst: gstRateAmount,
        total_amount: totalAmount,
        paid_amount: paidAmountNum,
        cash_amount: cashNum,
        online_amount: onlineNum,
        due_amount: dueAmountVal,
        payment_method: getPaymentMethod(),
      })
      .select('id')
      .single()

    if (error) {
      alert(error.message)
      return
    }

    for (const item of items) {
      let pid = item.product_id
      if (!pid && item.product_name.trim()) {
        const existing = products.find(
          (p) => p.name.toLowerCase() === item.product_name.trim().toLowerCase()
        )
        if (existing) {
          pid = existing.id
        } else {
          const { data: newP, error: newPErr } = await supabase
            .from('products')
            .insert({
              business_id: bizId(),
              name: item.product_name.trim(),
              purchase_price: item.purchase_price,
              selling_price: 0,
              stock_qty: 0,
              gst_percent: item.gst_percent,
              unit: item.unit,
              low_stock_limit: 0,
            })
            .select('id')
            .single()
          if (newPErr) {
            alert('Product create: ' + newPErr.message)
            return
          }
          pid = newP.id
        }
      }

      const lineTotal =
        item.quantity * item.purchase_price * (1 + item.gst_percent / 100)

      const { error: itemError } = await supabase.from('purchase_items').insert({
        purchase_id: purchase.id,
        product_id: pid || null,
        product_name: item.product_name || '',
        qty: item.quantity,
        price: item.purchase_price,
        discount: 0,
        taxable_amount: item.quantity * item.purchase_price,
        gst_percent: item.gst_percent,
        cgst_amount: (item.quantity * item.purchase_price * item.gst_percent) / 200,
        sgst_amount: (item.quantity * item.purchase_price * item.gst_percent) / 200,
        igst_amount: 0,
        line_total: lineTotal,
      })

      if (itemError) {
        alert(itemError.message)
        return
      }

      if (pid) {
        const { error: stockError } = await supabase.rpc('add_stock_movement', {
          p_product_id: pid,
          p_movement_type: 'purchase_in',
          p_quantity: item.quantity,
          p_note: invoiceNumber || 'Purchase',
        })

        if (stockError) {
          alert(stockError.message)
          return
        }
      }
    }

    alert('Purchase saved successfully.')
    router.push('/purchases/list')
    router.refresh()
    setItems([
      { product_id: '', product_name: '', unit: 'PCS', quantity: 0, purchase_price: 0, gst_percent: 0 },
    ])
    setDiscount('')
    setCashAmount('')
    setOnlineAmount('')
    setNotes('')
    setInvoiceNumber('')
    setSupplierId('')
    await loadData()
  }

  if (permChecked && !hasPermission(perms, 'purchase_view')) {
    return (
      <main className="p-4 flex items-center justify-center min-h-screen">
        <div className="rounded-2xl bg-white border-2 border-red-300 p-6 max-w-md text-center shadow">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aapko Purchase ka access nahi hai. Owner se permission maangein.
          </p>
          <Link href="/" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
            ← Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase</h1>
        <Link href="/purchases/list" className="text-blue-600 text-sm">
          View List →
        </Link>
      </div>

      {message && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {message}
        </div>
      )}

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Purchase Summary</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Supplier</label>
              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null)
                  setSupplierName('')
                  setSupplierPhone('')
                  setSupplierAddress('')
                  setShowSupplierForm(true)
                }}
                className="text-sm text-blue-600"
              >
                + New
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSupplierSearch('')
                setShowSupplierPicker(true)
              }}
              className="mt-1 w-full rounded border p-2 text-left bg-white"
            >
              {supplierId
                ? suppliers.find((x) => x.id === supplierId)?.name || 'Select Supplier'
                : 'Select Supplier'}
            </button>

            {showSupplierPicker && (
              <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 pt-16">
                <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Supplier Chuno</h3>
                    <button
                      type="button"
                      onClick={() => setShowSupplierPicker(false)}
                      className="text-gray-600 text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="mb-3 w-full rounded border p-2"
                    placeholder="Naam / phone / GST se dhundo..."
                    autoFocus
                  />

                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {suppliers
                      .filter((s) => {
                        const q = supplierSearch.toLowerCase().trim()
                        if (!q) return true
                        const name = (s.name || '').toLowerCase()
                        const phone = (s.phone || '').replace(/\D/g, '')
                        const gst = ((s as any).gst_number || '').toLowerCase()
                        const phoneQ = q.replace(/\D/g, '')
                        return (
                          name.includes(q) ||
                          gst.includes(q) ||
                          (phoneQ && phone.includes(phoneQ))
                        )
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSupplierId(s.id)
                            setShowSupplierPicker(false)
                          }}
                          className="w-full rounded border p-3 text-left hover:bg-gray-50"
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500">
                            {s.phone || 'no phone'}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {supplierId && (
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const s = suppliers.find((x) => x.id === supplierId)
                    if (s) {
                      setEditingSupplier(s)
                      setSupplierName(s.name)
                      setSupplierPhone(s.phone || '')
                      setSupplierAddress(s.address || '')
                      setShowSupplierForm(true)
                    }
                  }}
                  className="text-sm text-blue-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteSupplier(supplierId)}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            )}

            {showSupplierForm && (
              <div className="mt-3 rounded border p-3 bg-gray-50">
                <input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Supplier name"
                />
                <input
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Phone"
                />
                <input
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Address"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={supplierSaving}
                    onClick={saveSupplier}
                    className="rounded bg-blue-600 px-4 py-2 text-white"
                  >
                    {supplierSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupplierForm(false)
                      setEditingSupplier(null)
                      setSupplierName('')
                      setSupplierPhone('')
                      setSupplierAddress('')
                    }}
                    className="rounded bg-gray-300 px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Invoice Number</label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Invoice number"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Purchase Items</h2>

        <div className="mt-3 grid grid-cols-6 gap-2 text-sm font-semibold">
          <div>Product</div>
          <div>Unit</div>
          <div>Qty</div>
          <div>Price</div>
          <div>GST%</div>
          <div>Action</div>
        </div>

        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-6 gap-2">
              <input
                type="text"
                value={item.product_name}
                onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                className="rounded border p-2"
                placeholder="Product name"
                list={`products-${index}`}
              />
              <datalist id={`products-${index}`}>
                {products.map((product) => (
                  <option key={product.id} value={product.name} />
                ))}
              </datalist>

              <input
                type="text"
                value={item.unit}
                onChange={(e) => updateItem(index, 'unit', e.target.value.toUpperCase())}
                className="rounded border p-2"
                placeholder="Unit"
                list={`unit-purchase-${index}`}
              />
              <datalist id={`unit-purchase-${index}`}>
                <option value="PCS" />
                <option value="KG" />
                <option value="GM" />
                <option value="LTR" />
                <option value="ML" />
                <option value="BOX" />
                <option value="PKT" />
                <option value="DOZEN" />
                <option value="SQFT" />
                <option value="SQM" />
                <option value="MTR" />
                <option value="CM" />
                <option value="MM" />
                <option value="FT" />
                <option value="INCH" />
                <option value="BAG" />
                <option value="SET" />
                <option value="PAIR" />
                <option value="ROLL" />
                <option value="BUNDLE" />
                <option value="NOS" />
                <option value="SERVICE" />
              </datalist>

              <input
                type="number"
                min="0"
                value={item.quantity === 0 ? '' : item.quantity}
                onChange={(e) =>
                  updateItem(
                    index,
                    'quantity',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                className="rounded border p-2"
                placeholder="Qty"
              />

              <input
                type="number"
                min="0"
                value={item.purchase_price === 0 ? '' : item.purchase_price}
                onChange={(e) =>
                  updateItem(
                    index,
                    'purchase_price',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                className="rounded border p-2"
                placeholder="Price"
              />

              <input
                type="number"
                min="0"
                value={item.gst_percent === 0 ? '' : item.gst_percent}
                onChange={(e) =>
                  updateItem(
                    index,
                    'gst_percent',
                    e.target.value === '' ? 0 : Number(e.target.value)
                  )
                }
                className="rounded border p-2"
                placeholder="GST%"
              />

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded bg-red-600 px-2 py-2 text-white text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          + Add Item
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Discount</label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Cash Amount</label>
          <input
            type="number"
            min="0"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="Cash"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Online Amount (UPI/Bank)</label>
          <input
            type="number"
            min="0"
            value={onlineAmount}
            onChange={(e) => setOnlineAmount(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="UPI/Bank/Card"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
        <div className="flex justify-between items-center">
          <span className="text-base font-medium text-red-700">Due Amount (Baki)</span>
          <input
            type="number"
            min="0"
            value={dueAmount === 0 ? '' : dueAmount}
            onChange={(e) => {
              const newDue = e.target.value === '' ? 0 : Number(e.target.value)
              const newPaid = Math.max(0, grandTotal - newDue)
              const remaining = newPaid - onlineNum
              if (remaining >= 0) {
                setCashAmount(remaining === 0 ? '' : String(remaining))
              } else {
                setCashAmount('')
                setOnlineAmount(newPaid === 0 ? '' : String(newPaid))
              }
            }}
            className="w-32 rounded border-2 border-red-400 bg-white p-2 text-right text-xl font-bold text-red-700"
            placeholder="0"
          />
        </div>
      </div>

        <label className="block text-sm font-medium">Notes</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="Notes"
        />
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>GST</span>
          <span>₹{gstAmount.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>Discount</span>
          <span>₹{discountNum.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between font-bold">
          <span>Grand Total</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between text-green-700">
          <span>Cash Paid</span>
          <span>₹{cashNum.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-blue-700">
          <span>Online Paid</span>
          <span>₹{onlineNum.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Total Paid</span>
          <span>₹{paidAmountNum.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between font-bold">
          <span>Due</span>
          <span>₹{dueAmount.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={savePurchase}
        className="mt-6 w-full rounded bg-green-600 px-4 py-3 text-white"
      >
        {saving ? 'Saving...' : 'Save Purchase'}
      </button>
    </main>
  )
}
