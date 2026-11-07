'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Product = {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  mrp: number | null;
  stock: number;
  tax_percentage: number;
  image_url: string | null;
  is_online: boolean;
  description: string | null;
}

export default function ProviderInventoryPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '', category: '', purchase_price: '', selling_price: '', mrp: '', stock: '', tax_percentage: 18, image_url: '', description: '', is_online: true
  });

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);
    
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });
    if (prodData) setProducts(prodData as any);

    const { data: catData } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (catData) {
      setShopCategories(catData);
      if (catData.length > 0 && !newProduct.category) {
        setNewProduct(prev => ({ ...prev, category: catData[0].name }));
      }
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // 📸 Image Upload Logic
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;

    if (file.size > 5 * 1024 * 1024) return alert("File size 5MB se kam honi chahiye.");

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `prod-${activeId}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from('business-assets').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(fileName);
      setNewProduct({ ...newProduct, image_url: publicUrl });
      
    } catch (error: any) {
      alert("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- TOGGLE ONLINE / OFFLINE ---
  const toggleOnlineStatus = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setProducts(products.map(p => p.id === id ? { ...p, is_online: !currentStatus } : p));
    
    const { error } = await supabase.from('products').update({ is_online: !currentStatus }).eq('id', id);
    if (error) {
      alert("Error updating status: " + error.message);
      fetchData(); // Revert if error
    }
  };

  // --- ADD PRODUCT ---
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.selling_price) return alert("Name & Selling Price required");
    if (!activeId) return alert("Business ID missing");

    setSaving(true);
    const { error } = await supabase.from('products').insert([{
      business_id: activeId,
      name: newProduct.name,
      category: newProduct.category,
      purchase_price: Number(newProduct.purchase_price) || 0,
      selling_price: Number(newProduct.selling_price),
      mrp: Number(newProduct.mrp) || null,
      stock: Number(newProduct.stock) || 0,
      tax_percentage: Number(newProduct.tax_percentage),
      image_url: newProduct.image_url,
      description: newProduct.description,
      is_online: newProduct.is_online,
      unit: 'pcs'
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewProduct({ name: '', category: shopCategories[0]?.name || '', purchase_price: '', selling_price: '', mrp: '', stock: '', tax_percentage: 18, image_url: '', description: '', is_online: true });
      fetchData();
    } else {
      alert("Error adding product: " + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Inventory...</div>;
  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventory & Products</h1>
          <p className="text-sm text-gray-500">Manage shop products & online visibility</p>
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
          {products.map((product) => {
            const discount = (product.mrp && product.mrp > product.selling_price) 
              ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) 
              : 0;

            return (
              <div key={product.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${product.is_online ? 'border-gray-100' : 'border-red-200 bg-red-50/30'} flex flex-col justify-between`}>
                <div>
                  {/* Image & Online Toggle */}
                  <div className="flex gap-3 mb-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-2xl font-bold text-gray-400">{product.name.charAt(0)}</span>
                      )}
                      
                      {discount > 0 && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-base font-black text-gray-900">₹{product.selling_price}</p>
                        {product.mrp && product.mrp > product.selling_price && (
                          <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
                        )}
                      </div>
                    </div>

                    {/* Online Toggle Switch */}
                    <div className="flex flex-col items-center">
                      <span className={`text-[9px] font-bold mb-1 ${product.is_online ? 'text-green-600' : 'text-red-600'}`}>
                        {product.is_online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <button 
                        onClick={() => toggleOnlineStatus(product.id, product.is_online)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${product.is_online ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${product.is_online ? 'right-0.5' : 'left-0.5'}`}></span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Stock Details */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <span>Stock: <b className={product.stock > 5 ? 'text-green-600' : 'text-red-500'}>{product.stock}</b></span>
                  <span>GST: {product.tax_percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD PRODUCT MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Product</h2>
            
            <div className="space-y-3">
              
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition" onClick={() => fileInputRef.current?.click()}>
                {newProduct.image_url ? (
                  <img src={newProduct.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-lg shadow-sm mb-2" />
                ) : (
                  <span className="text-3xl mb-1">📷</span>
                )}
                <p className="text-xs font-bold text-blue-600">{uploading ? 'Uploading...' : 'Click to Upload Photo'}</p>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              </div>

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
                  <label className="text-sm font-bold text-gray-700">MRP (₹)</label>
                  <input type="number" placeholder="Original Price" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Selling Price (₹) *</label>
                  <input type="number" placeholder="After Discount" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
                <textarea placeholder="Product details..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
              </div>

              {/* Visibility Toggle in Form */}
              <div className="bg-blue-50 p-3 rounded-xl flex items-center justify-between border border-blue-100">
                <div>
                  <p className="text-sm font-bold text-blue-900">Show Online to Customers</p>
                  <p className="text-[10px] text-blue-600">Agar off karenge, toh customer ko nahi dikhega.</p>
                </div>
                <input type="checkbox" checked={newProduct.is_online} onChange={e => setNewProduct({...newProduct, is_online: e.target.checked})} className="w-5 h-5 accent-blue-600" />
              </div>

            </div>

            <div className="flex gap-3 pt-6 mt-4 border-t border-gray-100">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleAddProduct} disabled={saving || uploading} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}