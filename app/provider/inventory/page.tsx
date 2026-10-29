'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Product = {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  tax_percentage: number;
}

export default function ProviderInventoryPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', purchase_price: '', selling_price: '', stock: '', tax_percentage: 18
  });

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);
    
    // 1. Fetch Products
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });
    if (prodData) setProducts(prodData as any);

    // 2. Fetch Shop Categories (Medicines, Fashion, etc.)
    const { data: catData } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (catData) {
      setShopCategories(catData);
      // Default category set karein pehli category
      if (catData.length > 0 && !newProduct.category) {
        setNewProduct(prev => ({ ...prev, category: catData[0].name }));
      }
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- ADD PRODUCT ---
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.selling_price) return alert("Name & Selling Price required");
    if (!activeId) return alert("Business ID missing");

    const { error } = await supabase.from('products').insert([{
      business_id: activeId,
      name: newProduct.name,
      category: newProduct.category,
      purchase_price: Number(newProduct.purchase_price) || 0,
      selling_price: Number(newProduct.selling_price),
      stock: Number(newProduct.stock) || 0,
      tax_percentage: Number(newProduct.tax_percentage),
      unit: 'pcs'
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewProduct({ name: '', category: shopCategories[0]?.name || '', purchase_price: '', selling_price: '', stock: '', tax_percentage: 18 });
      fetchData();
    } else {
      alert("Error adding product: " + error.message);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Inventory...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventory & Products</h1>
          <p className="text-sm text-gray-500">Manage your shop products and spare parts</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition"
        >
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-800 font-bold text-lg">Aapka inventory khali hai.</p>
          <p className="text-gray-500 text-sm mt-1">Naye products add karne ke liye upar button dabayein.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">{product.category}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${product.stock > 5 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  Stock: {product.stock}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
              
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-0.5">Selling Price</p>
                  <p className="font-bold text-gray-800">₹{product.selling_price}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-0.5">GST</p>
                  <p className="font-bold text-gray-800">{product.tax_percentage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= ADD PRODUCT MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Product</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-gray-700">Product Name *</label>
                <input type="text" placeholder="e.g. Paracetamol 500mg" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                    {shopCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Opening Stock</label>
                  <input type="number" placeholder="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">Selling Price (₹) *</label>
                  <input type="number" placeholder="0" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">GST (%)</label>
                  <select value={newProduct.tax_percentage} onChange={e => setNewProduct({...newProduct, tax_percentage: Number(e.target.value)})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleAddProduct} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-md transition">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}