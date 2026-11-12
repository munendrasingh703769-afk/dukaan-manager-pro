'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PartnerDealsPage() {
  const supabase = createClient()
  
  // States for Data and UI
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter States
  const [selectedPartner, setSelectedPartner] = useState<string>('all')
  const [partnersList, setPartnersList] = useState<any[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    
    // 1. Fetch active partners for the filter dropdown
    const { data: partners } = await supabase
      .from('affiliate_partners')
      .select('id, name')
      .eq('is_active', true)
      
    if (partners) setPartnersList(partners)

    // 2. Fetch products
    await fetchProducts()
  }

  async function fetchProducts() {
    setLoading(true)
    
    // Base query: Get products and join with partner name
    let query = supabase
      .from('affiliate_products')
      .select(`
        id, name, price, currency, image_url, external_url, availability,
        affiliate_partners ( name, logo_url )
      `)

    // Apply Partner Filter if selected
    if (selectedPartner !== 'all') {
      query = query.eq('partner_id', selectedPartner)
    }

    // Apply Search Filter if typed
    if (searchQuery.trim() !== '') {
      query = query.ilike('name', `%${searchQuery}%`)
    }

    const { data, error } = await query.limit(50) // Pagination limit

    if (data) {
      setProducts(data)
    }
    setLoading(false)
  }

  // Trigger search when user types (or partner changes)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts()
    }, 500) // 500ms debounce to save database calls

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedPartner])

  // ... (UI Part will come in next message)
  // ... (Pichla code yahan khatam ho raha hoga fetchProducts function ke baad)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 1. Affiliate Disclosure Banner (Yeh zaroori hai) */}
      <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
        <p className="text-xs text-blue-800 font-medium">
          ℹ️ <strong>Affiliate Disclosure:</strong> VyapaarSetu earns a commission when you buy through these links. Purchases are completed on the partner's platform.
        </p>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Partner Deals & Offers</h1>
        <p className="text-sm text-gray-500 mb-4">Discover products from our trusted partners</p>

        {/* 2. Filters & Search Section */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search products (e.g., Mobile, Shoes)..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Partner Dropdown Filter */}
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
          >
            <option value="all">All Partners</option>
            {partnersList.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Products Grid */}
        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-lg h-64 border border-gray-100"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          // No Products Found
          <div className="text-center py-20 bg-white rounded-lg border border-gray-100">
            <p className="text-gray-500 font-medium">No products found.</p>
            <p className="text-sm text-gray-400 mt-1">Try changing your search or filters.</p>
          </div>
        ) : (
          // Product Cards
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                
                {/* Image Section */}
                <div className="relative h-40 bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={product.image_url || '/placeholder.png'}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                  {/* Source Badge */}
                  <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                    {product.affiliate_partners?.name || 'Partner'}
                  </span>
                </div>

                {/* Details Section */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{product.availability || 'In Stock'}</p>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-lg font-bold text-gray-900">
                      {product.currency || '₹'} {product.price}
                    </p>
                    
                    {/* Buy Now Button (Opens External Link) */}
                    <a
                      href={product.external_url || product.affiliate_url_base || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block w-full text-center bg-blue-600 text-white text-sm font-medium py-2 rounded hover:bg-blue-700 transition"
                    >
                      Buy Now
                    </a>
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