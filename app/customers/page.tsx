'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId, bizId } from '@/lib/business'
import { getUserPermissions, hasPermission, Permissions } from '@/lib/permissions'

type Customer = {
  id: string
  name: string
  phone: string | null
  address: string | null
  gst_number: string | null
  opening_due: number | null
}

type CustomerForm = {
  name: string
  phone: string
  address: string
  gst_number: string
  opening_due: string
}

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  address: '',
  gst_number: '',
  opening_due: '0',
}

let BUSINESS_ID = ''

export default function CustomersPage() {
  if (typeof window !== 'undefined' && !BUSINESS_ID) {
    BUSINESS_ID = getCurrentBusinessId() || 'fc98ba38-bf25-4268-98ba-aad43ecfa6d3'
  }
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState<Permissions>({})
  const [permChecked, setPermChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function loadCustomers() {
    const supabase = createClient()

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, address, gst_number, opening_due')
      .eq('business_id', bizId())
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setCustomers(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
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

  function updateField(field: keyof CustomerForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openAddForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id)

    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      gst_number: customer.gst_number ?? '',
      opening_due: String(customer.opening_due ?? 0),
    })

    setShowForm(true)
    setError('')
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Customer name is required.')
      return
    }

    const supabase = createClient()

    setSaving(true)
    setError('')

    const customerData = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      gst_number: form.gst_number.trim() || null,
      opening_due: Number(form.opening_due) || 0,
    }

    if (editingId) {
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingId)

      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert({ ...customerData, business_id: bizId() })

      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    closeForm()
    await loadCustomers()
  }

  async function deleteCustomer(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this customer?'
    )

    if (!confirmed) {
      return
    }

    const supabase = createClient()

    setError('')

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    await loadCustomers()
  }

  if (permChecked && !hasPermission(perms, 'customers_view')) {
    return (
      <main className="p-4 flex items-center justify-center min-h-screen">
        <div className="rounded-2xl bg-white border-2 border-red-300 p-6 max-w-md text-center shadow">
          <div className="text-5xl">🚫</div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aapko Customers ka access nahi hai. Owner se permission maangein.
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customers
            </h1>

            <p className="text-gray-600">
              Manage your customers.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            + Add Customer
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
            Error: {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingId ? 'Edit Customer' : 'Add Customer'}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Customer Name *
                </label>

                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-lg border p-3"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Phone
                </label>

                <input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-lg border p-3"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Address
                </label>

                <input
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full rounded-lg border p-3"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  GST Number
                </label>

                <input
                  value={form.gst_number}
                  onChange={(e) =>
                    updateField('gst_number', e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                  placeholder="Enter GST number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Opening Due
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_due}
                  onChange={(e) =>
                    updateField('opening_due', e.target.value)
                  }
                  className="w-full rounded-lg border p-3"
                  placeholder="0"
                />
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Customer'
                      : 'Save Customer'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg bg-gray-200 px-5 py-3 font-medium text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-6 shadow">
            Loading customers...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Address</th>
                  <th className="p-3 text-left">GST Number</th>
                  <th className="p-3 text-left">Opening Due</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t">
                    <td className="p-3 font-medium">
                      {customer.name}
                    </td>

                    <td className="p-3">
                      {customer.phone || '-'}
                    </td>

                    <td className="p-3">
                      {customer.address || '-'}
                    </td>

                    <td className="p-3">
                      {customer.gst_number || '-'}
                    </td>

                    <td className="p-3">
                      ₹{customer.opening_due ?? 0}
                    </td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(customer)}
                          className="rounded bg-blue-100 px-3 py-1 text-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCustomer(customer.id)}
                          className="rounded bg-red-100 px-3 py-1 text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {customers.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No customers found.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
