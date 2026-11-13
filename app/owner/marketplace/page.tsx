'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OwnerMarketplacePage() {
  const supabase = createClient()
  
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Form State (Defaults set for Owner/Business)
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    stock_qty: '', 
    seller_type: 'business', 
    image_url: '' 
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { 
        setUser(user)
        fetchMyListings(user.id) 
      } else { 
        setLoading(false) 
      }
    }
    init()
  }, [])

  async function fetchMyListings(userId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false })
      
    if (data) setListings(data)
    setLoading(false)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return alert("Please login first")
    setSaveLoading(true)
    
    const imageUrlsArray = newProduct.image_url ? [newProduct.image_url] : []
    
    const { error } = await supabase.from('marketplace_listings').insert({
      seller_user_id: user.id, 
      title: newProduct.title, 
      description: newProduct.description,
      price: Number(newProduct.price), 
      stock_qty: Number(newProduct.stock_qty),
      seller_type: newProduct.seller_type, 
      image_urls: imageUrlsArray, 
      status: 'active'
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Product listed successfully!")
      setIsAdding(false)
      setNewProduct({ title: '', description: '', price: '', stock_qty: '', seller_type: 'business', image_url: '' })
      fetchMyListings(user.id)
    }
    setSaveLoading(false)
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await supabase.from('marketplace_listings').update({ status: newStatus }).eq('id', id)
    if (user) fetchMyListings(user.id)
  }

  if (!user && !loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-600">Please login to access the Owner Panel.</p></div>
  }

  // ... (UI Part will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Marketplace</h1>
          <p className="text-sm text-gray-500">Manage your wholesale, manufacturing, and business products.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + Add New Product
        </button>
      </div>

      {/* Product Listings Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Loading your products...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium text-lg">You haven't listed any products yet.</p>
          <button onClick={() => setIsAdding(true)} className="mt-4 text-blue-600 font-medium hover:underline">
            Click here to add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              
              {/* Image Section */}
              <div className="h-40 bg-gray-100 flex items-center justify-center p-2 relative">
                {item.image_urls?.[0] ? (
                  <img 
                    src={item.image_urls[0]} 
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">No Image</span>
                )}
                <span className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold rounded shadow-sm ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status.toUpperCase()}
                </span>
              </div>

              {/* Details Section */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2" title={item.title}>{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1 capitalize">{item.seller_type}</p>
                
                <div className="mt-auto pt-4 flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                    <p className="text-xs text-gray-500">Stock: {item.stock_qty}</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(item.id, item.status)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${item.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  >
                    {item.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg my-8 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Add New Product</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
                <input 
                  required type="text" placeholder="e.g. Heavy Duty Drill Machine"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input 
                    required type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input 
                    required type="number" min="0" placeholder="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newProduct.stock_qty} onChange={(e) => setNewProduct({...newProduct, stock_qty: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newProduct.seller_type} onChange={(e) => setNewProduct({...newProduct, seller_type: e.target.value})}
                >
                  <option value="business">Business / Shop Owner</option>
                  <option value="manufacturer">Manufacturer Direct</option>
                  <option value="supplier">Authorized Supplier</option>
                  <option value="shop">Local Shop</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                <input 
                  type="url" placeholder="https://example.com/image.jpg"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  rows={3} placeholder="Product details, specifications..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                ></textarea>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button 
                  type="button" onClick={() => setIsAdding(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={saveLoading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}