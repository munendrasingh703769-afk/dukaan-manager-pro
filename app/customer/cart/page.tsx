'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerCartPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const updateQty = (id: string, change: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + change;
        return { ...item, qty: newQty > 0 ? newQty : 1 };
      }
      return item;
    });
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.selling_price * item.qty), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login to place order");
      router.push('/login');
      return;
    }

    // For simplicity, hum pehle product ke business_id ko order me save kar rahe hain
    const mainBusinessId = cart[0].business_id;

    // 1. Create Order
    const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
      customer_id: user.id,
      business_id: mainBusinessId,
      total_amount: calculateTotal(),
      status: 'pending'
    }]).select().single();

    if (orderError) {
      alert("Error creating order: " + orderError.message);
      setLoading(false);
      return;
    }

    // 2. Create Order Items
    const orderItems = cart.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      product_name: item.name,
      qty: item.qty,
      price: item.selling_price,
      total: item.selling_price * item.qty
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (!itemsError) {
      alert("Order Placed Successfully! 🎉");
      localStorage.removeItem('cart');
      router.push('/customer/bookings'); // Fhilhal bookings page par bhej rahe hain
    } else {
      alert("Error saving items: " + itemsError.message);
    }
    setLoading(false);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <span className="text-6xl mb-4">🛒</span>
        <h2 className="text-xl font-bold text-gray-800">Your Cart is Empty</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">Add some products to continue shopping.</p>
        <Link href="/customer/shop" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">
          Go to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">My Cart</h1>
        <Link href="/customer/shop" className="text-sm font-bold text-indigo-600">← Continue Shopping</Link>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {cart.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400">
              {item.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.businesses?.name}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="font-black text-gray-800">₹{item.selling_price}</p>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-white rounded shadow-sm font-bold">-</button>
                  <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-white rounded shadow-sm font-bold">+</button>
                </div>
              </div>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-red-500 self-start p-1 text-lg">✕</button>
          </div>
        ))}
      </div>

      {/* Checkout Summary */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Total Amount</p>
            <p className="text-2xl font-black text-gray-800">₹{calculateTotal()}</p>
          </div>
          <button onClick={handleCheckout} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}