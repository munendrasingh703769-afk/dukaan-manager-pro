'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Form States
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod')
  const [utrNumber, setUtrNumber] = useState('') // For UPI tracking

  // Aapka UPI ID yahan daalo
  const MY_UPI_ID = 'munendrasingh703769-1@okaxis'; 

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('profiles').select('phone, address').eq('id', user.id).single()
        if (profile) {
          if (profile.phone) setPhone(profile.phone)
          if (profile.address) setAddress(profile.address)
        }
      } else {
        router.push('/login')
      }
      fetchProduct(id as string)
    }
    init()
  }, [id, router, supabase])

  async function fetchProduct(productId: string) {
    setLoading(true)
    const { data } = await supabase.from('marketplace_listings').select('*').eq('id', productId).single()
    if (data) setProduct(data)
    setLoading(false)
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !product) return
    
    if (quantity > product.stock_qty) {
      return alert("Not enough stock available!")
    }

    if (paymentMethod === 'upi' && !utrNumber) {
      return alert("Please enter the UPI Transaction ID (UTR) after paying.")
    }

    setPlacingOrder(true)

    try {
      const totalAmount = product.price * quantity

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('marketplace_orders')
        .insert({
          buyer_user_id: user.id,
          total_amount: totalAmount,
          status: 'pending',
          payment_method: paymentMethod,
          payment_reference: paymentMethod === 'upi' ? utrNumber : null
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Create Order Item
      const { error: itemError } = await supabase
        .from('marketplace_order_items')
        .insert({
          order_id: order.id,
          listing_id: product.id,
          seller_user_id: product.seller_user_id,
          quantity: quantity,
          unit_price: product.price,
          status: 'pending'
        })

      if (itemError) throw itemError

      // 3. Update Stock
      const newStock = product.stock_qty - quantity
      await supabase
        .from('marketplace_listings')
        .update({ 
          stock_qty: newStock,
          status: newStock === 0 ? 'out_of_stock' : 'active'
        })
        .eq('id', product.id)

      alert("Order placed successfully! Seller will contact you soon.")
      router.push('/customer/marketplace-orders')

    } catch (error: any) {
      alert("Error placing order: " + error.message)
    } finally {
      setPlacingOrder(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Product not found.</div>

  const totalAmount = product.price * quantity
  const upiLink = `upi://pay?pa=${MY_UPI_ID}&pn=VyapaarSetu&am=${totalAmount}&cu=INR`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
          <p className="text-sm text-gray-500">Complete your order details below.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Side: Form */}
          <div className="w-full lg:w-3/5 space-y-6">
            
            {/* Shipping Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Shipping Information</h2>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" disabled value={user?.user_metadata?.full_name || 'Customer'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input required type="tel" placeholder="e.g. 9876543210" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label>
                  <textarea required rows={3} placeholder="House No, Building, Street, Area, City, Pincode" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Payment Method</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border-2 text-center transition ${paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-2xl block mb-1">💵</span>
                  <span className="font-bold text-sm text-gray-800">Cash on Delivery</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-4 rounded-xl border-2 text-center transition ${paymentMethod === 'upi' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-2xl block mb-1">📱</span>
                  <span className="font-bold text-sm text-gray-800">Direct UPI</span>
                </button>
              </div>

              {/* UPI Section */}
              {paymentMethod === 'upi' && (
                <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-xl text-center">
                  <p className="text-sm text-gray-700 font-medium mb-2">Scan to pay <strong>₹{totalAmount}</strong></p>
                  <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto w-40 h-40 border-2 border-white rounded-lg shadow-sm mb-2" />
                  <p className="text-xs text-gray-500 mb-3">UPI ID: <span className="font-bold text-gray-800 select-all">{MY_UPI_ID}</span></p>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter UTR / Transaction ID *</label>
                    <input required type="text" placeholder="12-digit UTR Number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="w-full lg:w-2/5">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                  {product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.title} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-xs">No Image</span>}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 line-clamp-2 text-sm">{product.title}</h3>
                  <p className="font-bold text-gray-900 mt-1">₹{product.price}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center border border-gray-300 rounded-lg w-32">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-gray-50 text-gray-600">-</button>
                  <span className="px-4 py-2 border-x border-gray-300 font-medium w-full text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => Math.min(product.stock_qty, q + 1))} className="px-4 py-2 hover:bg-gray-50 text-gray-600">+</button>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({quantity} items)</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-lg">
                  <span>Total</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {placingOrder ? 'Processing...' : paymentMethod === 'cod' ? 'Place COD Order' : 'Confirm UPI Order'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}