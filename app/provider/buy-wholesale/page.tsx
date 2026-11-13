'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProviderWholesalePage() {
  const supabase = createClient()
  
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchCategories()
    fetchWholesaleProducts()
  }, [])

  async function fetchCategories() {
    // Business market ki categories fetch karo
    const { data } = await supabase
      .from('commerce_categories')
      .select('*')
      .eq('market', 'business')
      .eq('is_active', true)
      
    if (data) setCategories(data)
  }

  async function fetchWholesaleProducts() {
    setLoading(true)
    
    // 🔥 STRICT B2B FILTER: Sirf Business, Manufacturer, aur Supplier ka maal
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`id, title, price, currency, image_urls, seller_type, stock_qty, category_id`)
      .eq('status', 'active')
      .in('seller_type', ['business', 'manufacturer', 'supplier'])
      
    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency || '₹',
        image: item.image_urls?.[0] || '',
        seller_type: item.seller_type,
        stock_qty: item.stock_qty,
        category_id: item.category_id,
        // Yahan humne link /customer/checkout rakha hai, aap isko provider ke checkout se replace kar sakte ho baad me
        action_link: `/customer/checkout/${item.id}` 
      }))
      setProducts(formatted)
    }
    setLoading(false)
  }

  // Filter Logic
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // ... (UI Part will come in next message)
  // ... (Part 1 ka code yahan khatam hua hoga)

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* B2B Header */}
      <div className="bg-slate-900 text-white pt-8 pb-8 px-4 border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-2">
                🏭 Wholesale B2B Market
              </h1>
              <p className="text-slate-300">Buy directly from Manufacturers, Suppliers & Wholesalers in bulk.</p>
            </div>
            
            {/* Search Bar */}
            <div className="w-full md:w-96 relative">
              <input
                type="text"
                placeholder="Search raw materials, tools, machinery..."
                className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute right-4 top-3 text-gray-400">🔍</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Categories Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition border ${selectedCategory === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition border ${selectedCategory === cat.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid (B2B Style) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-xl h-72 border border-gray-200"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-lg">No wholesale products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition group">
                
                {/* Image & Seller Badge */}
                <div className="relative h-48 bg-gray-50 flex items-center justify-center p-3 border-b border-gray-100">
                  <img
                    src={product.image || '/placeholder.png'}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                  />
                  {/* Seller Type Badge */}
                  <span className="absolute top-0 right-0 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                    {product.seller_type}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-2" title={product.title}>
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        Bulk Available
                      </span>
                      <span className={`text-xs font-medium ${product.stock_qty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Wholesale Price</p>
                        <p className="text-xl font-extrabold text-slate-900">
                          {product.currency} {product.price}
                        </p>
                      </div>
                    </div>
                    
                    <Link
                      href={product.action_link}
                      className="block w-full text-center bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-blue-700 transition"
                    >
                      Order Wholesale
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}