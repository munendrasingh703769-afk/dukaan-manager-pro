'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'

type Customer = {
  id: string
  name: string
  phone: string | null
  address: string | null
  gst_number: string | null
  state: string | null
}

type Product = {
  id: string
  name: string
  selling_price: number
  gst_percent: number
  stock_qty: number
  hsn_code: string | null
}

type SaleItem = {
  product_id: string
  product_name: string
  hsn_code: string
  unit: string
  quantity: number
  price: number
  gst_percent: number
}

let BUSINESS_ID = ''

export default function SalesPage() {
  const router = useRouter()
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const supabase = createClient()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [customerId, setCustomerId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [discount, setDiscount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [onlineAmount, setOnlineAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<SaleItem[]>([
    { product_id: '', product_name: '', hsn_code: '', unit: 'PCS', quantity: 0, price: 0, gst_percent: 0 },
  ])

  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerGst, setCustomerGst] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [businessState, setBusinessState] = useState('')
  const [perms, setPerms] = useState<Permissions>({})
  const [permChecked, setPermChecked] = useState(false)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  async function loadBizState() {
    const supabase = createClient()
    const bid = bizId()
    if (!bid) return
    const { data } = await supabase
      .from('businesses')
      .select('state')
      .eq('id', bid)
      .maybeSingle()
    if (data?.state) setBusinessState(data.state)
  }

  async function loadData() {
    setMessage('')
    const { data: custData, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone, address, gst_number, state')
      .eq('business_id', bizId())
      .order('name')

    if (custErr) {
      setMessage('Customer Error: ' + custErr.message)
      return
    }

    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('id, name, selling_price, gst_percent, stock_qty, hsn_code')
      .eq('business_id', bizId())
      .order('name')

    if (prodErr) {
      setMessage('Product Error: ' + prodErr.message)
      return
    }

    setCustomers(custData ?? [])
    setProducts(prodData ?? [])

    // Auto invoice number generate karo
    const { data: bizData } = await supabase
      .from('businesses')
      .select('invoice_prefix')
      .eq('id', BUSINESS_ID)
      .single()

    const prefix = bizData?.invoice_prefix?.trim() || 'INV'

    const { data: lastSale } = await supabase
      .from('sales')
      .select('invoice_no')
      .eq('business_id', bizId())
      .not('invoice_no', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextNum = 1
    if (lastSale?.invoice_no) {
      const match = String(lastSale.invoice_no).match(/(\d+)\s*$/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }

    const generated = `${prefix}-${String(nextNum).padStart(3, '0')}`
    setInvoiceNumber(generated)
  }

  useEffect(() => {
    loadData()
    loadPerms()
    loadBizState()
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

  function updateItem(index: number, field: keyof SaleItem, value: any) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { product_id: '', product_name: '', hsn_code: '', unit: 'PCS', quantity: 0, price: 0, gst_percent: 0 },
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
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  }, [items])

  const gstAmount = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.quantity * item.price * item.gst_percent) / 100,
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

  async function saveCustomer() {
    if (!customerName.trim()) {
      alert('Customer name required')
      return
    }
    setCustomerSaving(true)
    const payload = {
      name: customerName.trim(),
      phone: customerPhone.trim() || null,
      address: customerAddress.trim() || null,
      gst_number: customerGst.trim().toUpperCase() || null,
      state: customerState.trim() || null,
      email: customerEmail.trim() || null,
    }

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingCustomer.id)
      if (error) {
        alert(error.message)
        setCustomerSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert({ ...payload, business_id: bizId() })
      if (error) {
        alert(error.message)
        setCustomerSaving(false)
        return
      }
    }

    setCustomerSaving(false)
    setShowCustomerForm(false)
    setEditingCustomer(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setCustomerGst('')
    setCustomerState('')
    setCustomerEmail('')
    await loadData()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }
    if (customerId === id) setCustomerId('')
    await loadData()
  }

  async function saveSale() {
    if (!customerId) {
      alert('Customer select karo (ya + New se naya banao).')
      return
    }
    if (items.length === 0) {
      alert('Kam se kam 1 product add karo.')
      return
    }

    const subtotalVal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    )
    const taxableAmount = Math.max(0, subtotalVal - discountNum)
    const gstRateAmount = items.reduce(
      (sum, item) => sum + (item.quantity * item.price * item.gst_percent) / 100,
      0
    )
    const totalAmount = Math.max(0, taxableAmount + gstRateAmount)
    const dueAmountVal = Math.max(0, totalAmount - paidAmountNum)

    // IGST vs CGST+SGST decide karo
    let customerState = ''
    if (customerId) {
      const { data: cData } = await supabase
        .from('customers')
        .select('state')
        .eq('id', customerId)
        .maybeSingle()
      if (cData?.state) customerState = cData.state
    }
    const useIGST = businessState && customerState && businessState.toLowerCase().trim() !== customerState.toLowerCase().trim()

    const { data: sale, error } = await supabase
      .from('sales')
      .insert({
        business_id: bizId(),
        customer_id: customerId || null,
        invoice_no: invoiceNumber || null,
        sale_date: new Date().toISOString(),
        subtotal: subtotalVal,
        discount: discountNum,
        taxable_amount: taxableAmount,
        cgst_amount: useIGST ? 0 : gstRateAmount / 2,
        sgst_amount: useIGST ? 0 : gstRateAmount / 2,
        igst_amount: useIGST ? gstRateAmount : 0,
        total_gst: gstRateAmount,
        total_amount: totalAmount,
        paid_amount: paidAmountNum,
        cash_amount: cashNum,
        online_amount: onlineNum,
        due_amount: dueAmountVal,
        payment_method: getPaymentMethod(),
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) {
      alert(error.message)
      return
    }

    for (const item of items) {
      if (!item.product_id && !item.product_name.trim()) {
        continue
      }
      let pid = item.product_id
      if (!pid && item.product_name.trim()) {
        const existing = products.find(
          (p) => p.name.toLowerCase() === item.product_name.trim().toLowerCase()
        )
        if (existing) {
          pid = existing.id
        }
      }

      const lineTotal =
        item.quantity * item.price * (1 + item.gst_percent / 100)

      const { error: itemError } = await supabase.from('sale_items').insert({
        sale_id: sale.id,
        product_id: pid || null,
        product_name: item.product_name || '',
        hsn_code: item.hsn_code || null,
        unit: item.unit || 'PCS',
        qty: item.quantity,
        price: item.price,
        discount: 0,
        taxable_amount: item.quantity * item.price,
        gst_percent: item.gst_percent,
        cgst_amount: useIGST ? 0 : (item.quantity * item.price * item.gst_percent) / 200,
        sgst_amount: useIGST ? 0 : (item.quantity * item.price * item.gst_percent) / 200,
        igst_amount: useIGST ? (item.quantity * item.price * item.gst_percent) / 100 : 0,
        line_total: lineTotal,
      })

      if (itemError) {
        alert(itemError.message)
        return
      }

      if (pid) {
        const { error: stockError } = await supabase.rpc('add_stock_movement', {
          p_product_id: pid,
          p_movement_type: 'sale_out',
          p_quantity: item.quantity,
          p_note: invoiceNumber || 'Sale',
        })

        if (stockError) {
          alert(stockError.message)
          return
        }
      }
    }

    alert('Sale saved successfully.')
    router.push('/sales/list')
    router.refresh()
    setItems([
      { product_id: '', product_name: '', hsn_code: '', unit: 'PCS', quantity: 0, price: 0, gst_percent: 0 },
    ])
    setDiscount('')
    setCashAmount('')
    setOnlineAmount('')
    setNotes('')
    setInvoiceNumber('')
    setCustomerId('')
    await loadData()
  }

  if (permChecked && !hasPermission(perms, 'sales_view')) {
    return (
      <main className="p-4 flex items-center justify-center min-h-screen">
        <div className="rounded-2xl bg-white border-2 border-red-300 p-6 max-w-md text-center shadow">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aapko Sales page ka access nahi hai. Owner se permission maangein.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sale</h1>
        <div className="flex gap-3">
          <Link href="/sales/list" className="text-blue-600 text-sm">
            View List →
          </Link>
          <Link href="/" className="text-blue-600 text-sm">
            ← Home
          </Link>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {message}
        </div>
      )}

      <div className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Sale Summary</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Customer</label>
              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(null)
                  setCustomerName('')
                  setCustomerPhone('')
                  setCustomerAddress('')
                  setShowCustomerForm(true)
                }}
                className="text-sm text-blue-600"
              >
                + New
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomerSearch('')
                setShowCustomerPicker(true)
              }}
              className="mt-1 w-full rounded border p-2 text-left bg-white"
            >
              {customerId
                ? customers.find((x) => x.id === customerId)?.name || 'Select Customer'
                : 'Select Customer'}
            </button>

            {showCustomerPicker && (
              <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 pt-16">
                <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Customer Chuno</h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomerPicker(false)}
                      className="text-gray-600 text-xl"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="mb-3 w-full rounded border p-2"
                    placeholder="Naam / phone / GST se dhundo..."
                    autoFocus
                  />

                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {customers
                      .filter((c) => {
                        const q = customerSearch.toLowerCase().trim()
                        if (!q) return true
                        const name = (c.name || '').toLowerCase()
                        const phone = (c.phone || '').replace(/\D/g, '')
                        const gst = (c.gst_number || '').toLowerCase()
                        const phoneQ = q.replace(/\D/g, '')
                        return (
                          name.includes(q) ||
                          gst.includes(q) ||
                          (phoneQ && phone.includes(phoneQ))
                        )
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id)
                            setShowCustomerPicker(false)
                          }}
                          className="w-full rounded border p-3 text-left hover:bg-gray-50"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.phone || 'no phone'}
                            {c.gst_number ? ` • GST: ${c.gst_number}` : ''}
                          </div>
                        </button>
                      ))}
                    {customers.filter((c) => {
                      const q = customerSearch.toLowerCase().trim()
                      if (!q) return true
                      const name = (c.name || '').toLowerCase()
                      const phone = (c.phone || '').replace(/\D/g, '')
                      const gst = (c.gst_number || '').toLowerCase()
                      const phoneQ = q.replace(/\D/g, '')
                      return (
                        name.includes(q) ||
                        gst.includes(q) ||
                        (phoneQ && phone.includes(phoneQ))
                      )
                    }).length === 0 && (
                      <p className="p-3 text-center text-sm text-gray-500">
                        Koi customer nahi mila
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {customerId && (
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const c = customers.find((x) => x.id === customerId)
                    if (c) {
                      setEditingCustomer(c)
                      setCustomerName(c.name)
                      setCustomerPhone(c.phone || '')
                      setCustomerAddress(c.address || '')
                      setShowCustomerForm(true)
                    }
                  }}
                  className="text-sm text-blue-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCustomer(customerId)}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            )}

            {showCustomerForm && (
              <div className="mt-3 rounded border p-3 bg-gray-50">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Customer name"
                />
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Phone"
                />
                <input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Address"
                />
                <input
                  value={customerGst}
                  onChange={(e) => setCustomerGst(e.target.value.toUpperCase())}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="GSTIN (optional)"
                />
                <input
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="State (e.g. Uttar Pradesh)"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mb-2 w-full rounded border p-2"
                  placeholder="Email (optional)"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={customerSaving}
                    onClick={saveCustomer}
                    className="rounded bg-blue-600 px-4 py-2 text-white"
                  >
                    {customerSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerForm(false)
                      setEditingCustomer(null)
                      setCustomerName('')
                      setCustomerPhone('')
                      setCustomerAddress('')
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
        <h2 className="text-lg font-semibold">Sale Items</h2>

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
              <select
                value={item.product_id || '__custom__'}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '__custom__') {
                    setItems((current) =>
                      current.map((it, i) =>
                        i === index
                          ? { ...it, product_id: '', product_name: '' }
                          : it
                      )
                    )
                    return
                  }
                  if (val === '__service__') {
                    setItems((current) =>
                      current.map((it, i) =>
                        i === index
                          ? {
                              ...it,
                              product_id: '',
                              product_name: 'Service',
                              unit: 'SERVICE',
                              price: 0,
                              gst_percent: 18,
                              hsn_code: '9987',
                            }
                          : it
                      )
                    )
                    return
                  }
                  const prod = products.find((p) => p.id === val)
                  if (prod) {
                    setItems((current) =>
                      current.map((it, i) =>
                        i === index
                          ? {
                              ...it,
                              product_id: prod.id,
                              product_name: prod.name,
                              hsn_code: prod.hsn_code || '',
                              unit: prod.unit || 'PCS',
                              price: prod.selling_price || 0,
                              gst_percent: prod.gst_percent || 0,
                            }
                          : it
                      )
                    )
                  }
                }}
                className="rounded border p-2"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__service__">🔧 Service (Repair / Labour)</option>
                <option value="__custom__">➕ Custom Product</option>
              </select>

              <input
                type="text"
                value={item.unit}
                onChange={(e) => updateItem(index, 'unit', e.target.value.toUpperCase())}
                className="rounded border p-2"
                placeholder="Unit"
                list={`unit-sale-${index}`}
              />
              <datalist id={`unit-sale-${index}`}>
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
                value={item.price === 0 ? '' : item.price}
                onChange={(e) =>
                  updateItem(
                    index,
                    'price',
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

      <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
        <div className="flex justify-between items-center">
          <span className="text-base font-medium text-red-700">
            Due Amount (Baki)
          </span>
          <span className="text-2xl font-bold text-red-700">
            ₹{dueAmount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-4">
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
        onClick={saveSale}
        className="mt-6 w-full rounded bg-green-600 px-4 py-3 text-white"
      >
        {saving ? 'Saving...' : 'Save Sale'}
      </button>
    </main>
  )
}
