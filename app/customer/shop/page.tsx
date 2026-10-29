'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerShopPage() {
  const supabase = createClient();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Cart Count State
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Check cart items count from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.length);

    const fetchData = async () => {
      const { data: cats } = await supabase.from('shop_categories').select('*').eq('is_active', true);
      if (cats) setCategories(cats);

      const { data: prods } = await supabase.from('products').select(`*, businesses!inner(name, city, id)`).gt('stock', 0);
      if (prods) setProducts(prods);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const addToCart = (product: any) => {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if item already exists
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    setCartCount(cart.length);
    alert(`${product.name} added to cart!`);
  };

  const filteredProducts = selectedCat 
    ? products.filter(p => p.category === selectedCat) 
    : products;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Shopping Store</h1>
          <Link href="/customer/cart" className="bg-indigo-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
            🛒 Cart ({cartCount})
          </Link>
        </div>
        <input type="text" placeholder="Search for Medicines, Clothes, Toys..." className="w-full p-3 bg-gray-100 rounded-xl outline-none text-sm font-medium" />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto p-4 no-scrollbar">
        <button onClick={() => setSelectedCat(null)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${!selectedCat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>All Products</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCat(c.name)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 ${selectedCat === c.name ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        {loading ? <p className="col-span-2 text-center text-indigo-600 font-bold">Loading Products...</p> : 
         filteredProducts.length === 0 ? <p className="col-span-2 text-center text-gray-500 font-bold py-10">Is category me abhi koi product nahi hai.</p> :
         filteredProducts.map(prod => (
          <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="h-32 bg-gray-50 flex items-center justify-center text-gray-400">
              {prod.name.charAt(0)}
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{prod.name}</h3>
                <p className="text-xs text-gray-500 mt-1 truncate">{prod.businesses?.name}</p>
              </div>
              <div className="mt-2">
                <p className="text-lg font-black text-gray-800">₹{prod.selling_price}</p>
                <p className="text-[10px] text-green-600 font-bold mb-2">In Stock ({prod.stock})</p>
                <button onClick={() => addToCart(prod)} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs active:scale-95 transition">Add to Cart</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}