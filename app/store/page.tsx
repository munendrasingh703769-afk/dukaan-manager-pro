'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function UnifiedStorePage() {
  const supabase = createClient()
  
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'affiliate' | 'internal'>('all')

  useEffect(() => {
    fetchUnifiedProducts()
  }, [])

  async function fetchUnifiedProducts() {
    setLoading(true)
    
    const [
      { data: affiliateData },
      { data: internalData }
    ] = await Promise.all([
      supabase.from('affiliate_products')
        .select(`id, name, price, currency, image_url, external_url, partner_id, availability, affiliate_partners(name)`),
      
      supabase.from('marketplace_listings')
        .select(`id, title, price, currency, image_urls, seller_type, stock_qty`)
        .eq('status', 'active')
    ])

    // Affiliate Data Format
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
      raw_data: item
    }))

    // Internal Data Format
    const formattedInternal = (internalData || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency || '₹',
      image: item.image_urls?.[0] || '',
      source_type: 'internal',
      source_label: `Local ${item.seller_type}`,
      action_link: `/customer/product/${item.id}`,
      availability: item.stock_qty > 0 ? 'In Stock' : 'Out of Stock',
      raw_data: item
    }))

    setProducts([...formattedAffiliate, ...formattedInternal])
    setLoading(false)
  }

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = activeFilter === 'all' || p.source_type === activeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header & Banner */}
      <div className="bg-blue-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">VyapaarSetu Store</h1>
          <p className="text-blue-200 mb-6">Discover products from top brands and local businesses.</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <input
              type="text"
              placeholder="Search for electronics, groceries, machinery..."
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute right-4 top-3 text-gray-400">🔍</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        
        {/* Source Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            All Products
          </button>
          <button 
            onClick={() => setActiveFilter('affiliate')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeFilter === 'affiliate' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            External Partners
          </button>
          <button 
            onClick={() => setActiveFilter('internal')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeFilter === 'internal' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            Local Sellers & Manufacturers
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
            <p className="text-gray-500 text-lg">No products found matching your search.</p>
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
                  {/* Source Identification Badge */}
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
                    
                    {/* Action Button */}
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