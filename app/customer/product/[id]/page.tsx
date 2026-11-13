'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProductDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (id) {
      fetchProduct(id as string)
    }
  }, [id])

  async function fetchProduct(productId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (data) {
      setProduct(data)
      // Set first image as default selected image
      if (data.image_urls && data.image_urls.length > 0) {
        setSelectedImage(data.image_urls[0])
      }
    }
    setLoading(false)
  }

  async function handleAddToCart() {
    setAddingToCart(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert("Please login to add items to cart")
        router.push('/login')
        return
      }

      // Check if item already in cart
      const { data: existingCart } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()

      if (existingCart) {
        // Update quantity
        await supabase
          .from('cart')
          .update({ quantity: existingCart.quantity + quantity })
          .eq('id', existingCart.id)
      } else {
        // Insert new item
        await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: quantity,
            price: product.selling_price
          })
      }
      
      alert("Added to cart successfully!")
      router.push('/customer/cart')

    } catch (error: any) {
      console.error(error)
      alert("Error adding to cart: " + error.message)
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading product details...</div>
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Product not found</h2>
        <Link href="/customer/explore" className="text-blue-600 hover:underline">Go back to shop</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500 flex gap-2">
          <Link href="/customer/explore" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium line-clamp-1">{product.name}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Image Section */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-gray-100">
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center p-4">
              {selectedImage ? (
                <img src={selectedImage} alt={product.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-gray-400">No Image Available</span>
              )}
            </div>
            
            {/* Thumbnail Gallery - FIXED TYPES HERE */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.image_urls?.map((img: string, index: number) => (
                <button 
                  key={index} 
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 ${selectedImage === img ? 'border-blue-600' : 'border-gray-200'}`}
                >
                  <img src={img} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Details Section */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-2">
              {product.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            
            <div className="flex items-end gap-3 mb-6">
              <p className="text-3xl font-bold text-gray-900">₹{product.selling_price}</p>
              {product.mrp > product.selling_price && (
                <>
                  <p className="text-lg text-gray-400 line-through">₹{product.mrp}</p>
                  <p className="text-sm font-bold text-green-600 mb-1">
                    {Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)}% OFF
                  </p>
                </>
              )}
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">
                {product.stock > 0 ? (
                  <span className="text-green-600 font-medium">In Stock ({product.stock} {product.unit})</span>
                ) : (
                  <span className="text-red-600 font-medium">Out of Stock</span>
                )}
              </p>
              {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock > 0 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-gray-50 text-gray-600">-</button>
                    <span className="px-4 py-2 border-x border-gray-300 font-medium">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-4 py-2 hover:bg-gray-50 text-gray-600">+</button>
                  </div>
                </div>

                <button 
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingToCart ? 'Adding...' : '🛒 Add to Cart'}
                </button>
              </div>
            )}

            {/* Description */}
            <div className="mt-auto pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Product Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description || 'No description available for this product.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}