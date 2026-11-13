'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function UnifiedStorePage() {
  const supabase = createClient()
  
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'affiliate' | 'internal'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchCategories()
    fetchUnifiedProducts()
  }, [])

  async function fetchCategories() {
    // Sirf consumer categories fetch karo
    const { data } = await supabase
      .from('commerce_categories')
      .select('*')
      .eq('market', 'consumer')
      .eq('is_active', true)
      
    if (data) setCategories(data)
  }

  async function fetchUnifiedProducts() {
    setLoading(true)
    
    const [
      { data: affiliateData },
      { data: internalData }
    ] = await Promise.all([
      // 1. Fetch Affiliate Products
      supabase.from('affiliate_products')
        .select(`id, name, price, currency, image_url, external_url, partner_id, availability, category_id, affiliate_partners(name)`),
      
      // 2. Fetch Internal Marketplace Listings (STRICTLY RETAIL / SHOP ONLY)
      supabase.from('marketplace_listings')
        .select(`id, title, price, currency, image_urls, seller_type, stock_qty, category_id`)
        .eq('status', 'active')
        .eq('seller_type', 'shop') // 🔥 YEH SABSE IMPORTANT HAI: Sirf dukaan wale ka maal dikhega
    ])

    // Format Affiliate
    const formattedAffiliate = (affiliateData || []).map((item: any) => ({
      id: item.id,
      title: item.name,
      price: item.price,
      currency: item.currency || '₹',
      image: item.image_url,
      source_type: 'affiliate',
      source_label: item.affiliate_partners?.name || 'Partner',
      action_link: item.external_url,
      availability: item.availability || 'In Stock',
      category_id: item.category_id
    }))

    // Format Internal (Retail)
    const formattedInternal = (internalData || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency || '₹',
      image: item.image_urls?.[0] || '',
      source_type: 'internal',
      source_label: 'Local Shop',
      action_link: `/customer/product/${item.id}`,
      availability: item.stock_qty > 0 ? 'In Stock' : 'Out of Stock',
      category_id: item.category_id
    }))

    setProducts([...formattedAffiliate, ...formattedInternal])
    setLoading(false)
  }

  // Client-side Filtering
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = activeFilter === 'all' || p.source_type === activeFilter
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
    return matchesSearch && matchesType && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header & Banner */}
      <div className="bg-blue-900 text-white pt-8 pb-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">VyapaarSetu Store</h1>
          <p className="text-blue-200 mb-6">Shop everyday essentials from top brands and local shops.</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <input
              type="text"
              placeholder="Search for products, brands, and more..."
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute right-4 top-3 text-gray-400">🔍</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${selectedCategory === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${selectedCategory === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Source Filters */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4">
          <span className="text-sm text-gray-500 font-medium mr-2">Filter by Source:</span>
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${activeFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveFilter('affiliate')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${activeFilter === 'affiliate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Partner Deals
          </button>
          <button 
            onClick={() => setActiveFilter('internal')}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${activeFilter === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Local Shops
          </button>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-xl h-64 border border-gray-100"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition">
                
                {/* Image & Badge */}
                <div className="relative h-48 bg-gray-50 flex items-center justify-center p-3">
                  <img
                    src={product.image || '/placeholder.png'}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain"
                  />
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded shadow-sm ${
                    product.source_type === 'affiliate' ? 'bg-black/80 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {product.source_label}
                  </span>
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2" title={product.title}>
                      {product.title}
                    </h3>
                    <p className={`text-xs mt-1 font-medium ${product.availability === 'In Stock' ? 'text-green-600' : 'text-red-500'}`}>
                      {product.availability}
                    </p>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-lg font-bold text-gray-900">
                      {product.currency} {product.price}
                    </p>
                    
                    {product.source_type === 'affiliate' ? (
                      <a
                        href={product.action_link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-full text-center bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Buy Now
                      </a>
                    ) : (
                      <Link
                        href={product.action_link}
                        className="mt-2 block w-full text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        View Details
                      </Link>
                    )}
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