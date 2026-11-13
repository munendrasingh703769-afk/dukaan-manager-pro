'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OwnerMarketplacePage() {
  const supabase = createClient()
  
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [uploading, setUploading] = useState(false) // For Photo upload
  const [user, setUser] = useState<any>(null)

  // Add Product Form State (Added Description)
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    description: '',
    price: '', 
    stock_qty: '', 
    seller_type: 'business', 
    image_url: '' 
  })

  // Promote States
  const [isPromoting, setIsPromoting] = useState(false)
  const [promotingProduct, setPromotingProduct] = useState<any>(null)
  const [promoDays, setPromoDays] = useState(7)
  const [promoBudget, setPromoBudget] = useState(500)

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

  // 🔥 Function to Upload Photo to Supabase Storage
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      // Upload to 'product-images' bucket
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      
      // Save URL in state
      setNewProduct(prev => ({ ...prev, image_url: data.publicUrl }));
      
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return alert("Please login first")
    setSaveLoading(true)
    
    const imageUrlsArray = newProduct.image_url ? [newProduct.image_url] : []
    
    const { error } = await supabase.from('marketplace_listings').insert({
      seller_user_id: user.id, 
      title: newProduct.title, 
      description: newProduct.description, // Added Description
      price: Number(newProduct.price), 
      stock_qty: Number(newProduct.stock_qty),
      seller_type: newProduct.seller_type, 
      image_urls: imageUrlsArray, 
      status: 'active'
    })

    if (error) alert("Error: " + error.message)
    else {
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

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !promotingProduct) return
    setSaveLoading(true)

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + promoDays)

    const { error } = await supabase.from('sponsored_listings').insert({
      listing_id: promotingProduct.id,
      seller_user_id: user.id,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      daily_budget: Number(promoBudget),
      status: 'active'
    })

    if (error) alert("Error: " + error.message)
    else {
      alert(`Product successfully promoted for ${promoDays} days!`)
      setIsPromoting(false)
      setPromotingProduct(null)
    }
    setSaveLoading(false)
  }

  if (!user && !loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-600">Please login to access the Owner Panel.</p></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Marketplace</h1>
          <p className="text-sm text-gray-500">Manage your wholesale and business products.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          + Add New Product
        </button>
      </div>

      {/* Product Listings Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Loading your products...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium text-lg">You haven't listed any products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              
              <div className="h-40 bg-gray-100 flex items-center justify-center p-2 relative">
                {item.image_urls?.[0] ? (
                  <img src={item.image_urls[0]} alt={item.title} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-sm">No Image</span>
                )}
                <span className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold rounded shadow-sm ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status.toUpperCase()}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2" title={item.title}>{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1 capitalize">{item.seller_type}</p>
                
                <div className="mt-auto pt-4">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                      <p className="text-xs text-gray-500">Stock: {item.stock_qty}</p>
                    </div>
                    <button onClick={() => toggleStatus(item.id, item.status)} className={`text-xs px-2 py-1 rounded-md font-medium transition ${item.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {item.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                  <button onClick={() => { setPromotingProduct(item); setIsPromoting(true); }} className="w-full bg-yellow-400 text-yellow-900 text-sm font-bold py-2 rounded-lg hover:bg-yellow-500 transition">
                    ⭐ Promote Product
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD PRODUCT MODAL (With Photo Upload & Description) */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg my-8 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Add New Product</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})} />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input required type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty *</label>
                  <input required type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.stock_qty} onChange={(e) => setNewProduct({...newProduct, stock_qty: e.target.value})} />
                </div>
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.seller_type} onChange={(e) => setNewProduct({...newProduct, seller_type: e.target.value})}>
                  <option value="business">Business / Shop Owner</option>
                  <option value="manufacturer">Manufacturer Direct</option>
                  <option value="supplier">Authorized Supplier</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Details / Description</label>
                <textarea rows={3} placeholder="Write product features, material, etc." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Photo</label>
                <div className="flex items-center gap-4">
                  {newProduct.image_url && (
                    <img src={newProduct.image_url} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {uploading && <p className="text-xs text-blue-600 mt-1">Uploading photo, please wait...</p>}
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={saveLoading || uploading} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm disabled:opacity-50">{saveLoading ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTE MODAL (Same as before) */}
      {isPromoting && promotingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-yellow-50">
              <h3 className="font-bold text-yellow-800">⭐ Promote Product</h3>
              <button onClick={() => setIsPromoting(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handlePromote} className="p-5 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                {promotingProduct.image_urls?.[0] && <img src={promotingProduct.image_urls[0]} className="w-12 h-12 object-cover rounded" />}
                <div>
                  <p className="font-bold text-sm">{promotingProduct.title}</p>
                  <p className="text-xs text-gray-500">₹{promotingProduct.price}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Duration (Days)</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={promoDays} onChange={(e) => setPromoDays(Number(e.target.value))}>
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget (₹)</label>
                <input type="number" required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={promoBudget} onChange={(e) => setPromoBudget(Number(e.target.value))} />
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800">
                <p>Total Estimated Cost: <strong>₹{promoDays * promoBudget}</strong></p>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsPromoting(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={saveLoading} className="flex-1 bg-yellow-400 text-yellow-900 font-bold py-2 rounded-md text-sm disabled:opacity-50">{saveLoading ? 'Processing...' : 'Pay & Promote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}