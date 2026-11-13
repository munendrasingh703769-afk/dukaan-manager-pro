'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminAffiliateProductsPage() {
  const supabase = createClient()
  
  const [products, setProducts] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Form State
  const [newProduct, setNewProduct] = useState({
    partner_id: '',
    name: '',
    external_product_id: '',
    price: '',
    image_url: '',
    external_url: '',
    availability: 'In Stock'
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    
    // Fetch Partners for dropdown
    const { data: partnerData } = await supabase.from('affiliate_partners').select('id, name')
    if (partnerData) setPartners(partnerData)

    // Fetch Affiliate Products
    const { data: productData } = await supabase
      .from('affiliate_products')
      .select(`*, affiliate_partners ( name )`)
      .order('created_at', { ascending: false })
    if (productData) setProducts(productData)

    setLoading(false)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaveLoading(true)

    const { error } = await supabase.from('affiliate_products').insert({
      partner_id: newProduct.partner_id,
      name: newProduct.name,
      external_product_id: newProduct.external_product_id || `SKU-${Date.now()}`,
      price: Number(newProduct.price),
      image_url: newProduct.image_url,
      external_url: newProduct.external_url,
      availability: newProduct.availability,
      currency: '₹'
    })

    if (error) {
      alert("Error adding product: " + error.message)
    } else {
      alert("Affiliate Product added successfully!")
      setIsAdding(false)
      setNewProduct({ partner_id: '', name: '', external_product_id: '', price: '', image_url: '', external_url: '', availability: 'In Stock' })
      fetchData() // Refresh list
    }
    setSaveLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Affiliate Products</h1>
            <p className="text-sm text-gray-500">Manually add Amazon/Flipkart products to the store.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Affiliate Product
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-4 font-medium">Product Details</th>
                  <th className="p-4 font-medium">Partner</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No affiliate products added yet.</td></tr>
                ) : (
                  products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-gray-400 text-xs">No Img</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{p.external_product_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-700">
                        {p.affiliate_partners?.name || 'Unknown'}
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        ₹{p.price}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.availability === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.availability}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <a href={p.external_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View Link</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add Product Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg my-8 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Add Affiliate Product</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Partner *</label>
                <select required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.partner_id} onChange={(e) => setNewProduct({...newProduct, partner_id: e.target.value})}>
                  <option value="">-- Choose Partner --</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {partners.length === 0 && <p className="text-xs text-red-500 mt-1">Please add a partner first in "Affiliate Management".</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input required type="number" step="0.01" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (Optional)</label>
                  <input type="text" placeholder="Auto-generated if empty" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.external_product_id} onChange={(e) => setNewProduct({...newProduct, external_product_id: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                <input required type="url" placeholder="https://..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Link (Buy Now URL) *</label>
                <input required type="url" placeholder="https://amzn.to/..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.external_url} onChange={(e) => setNewProduct({...newProduct, external_url: e.target.value})} />
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={saveLoading || partners.length === 0} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm disabled:opacity-50">{saveLoading ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}