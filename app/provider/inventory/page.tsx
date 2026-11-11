'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

// Standard Units (Dynamic dropdown ke liye)
const STANDARD_UNITS = ['Pcs', 'Kg', 'Gram', 'Litre', 'ml', 'Meter', 'Feet', 'Box', 'Packet', 'Bag', 'Roll', 'Set', 'Dozen'];

type Warehouse = { id: string; name: string; }
type Category = { id: string; name: string; icon: string; }

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  category: string;
  purchase_price: number;
  selling_price: number;
  mrp: number | null;
  tax_percentage: number;
  uom: string;
  min_stock: number;
  max_stock: number;
  image_urls: string[] | null;
  is_online: boolean;
  description: string | null;
  inventory_stock: { quantity: number; warehouse_id: string }[];
}

export default function ProviderInventoryPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Upload States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', barcode: '', brand: '', category: '', 
    purchase_price: '', selling_price: '', mrp: '', stock: '', 
    tax_percentage: 18, uom: 'Pcs', min_stock: 5, max_stock: 100, 
    image_urls: [] as string[], description: '', is_online: true,
    warehouse_id: '' // Kis godown me stock add karna hai
  });

  // 1. Fetch Data (Categories, Warehouses, Products with Stock)
  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);
    
    // Fetch Categories & Warehouses
    const { data: catData } = await supabase.from('shop_categories').select('*').eq('is_active', true);
    if (catData) {
      setCategories(catData);
      if (catData.length > 0 && !newProduct.category) {
        setNewProduct(prev => ({ ...prev, category: catData[0].name }));
      }
    }

    const { data: whData } = await supabase.from('warehouses').select('*').eq('business_id', activeId);
    if (whData) {
      setWarehouses(whData);
      if (whData.length > 0 && !newProduct.warehouse_id) {
        setNewProduct(prev => ({ ...prev, warehouse_id: whData[0].id }));
      }
    }

    // Fetch Products with joined Inventory Stock
    const { data: prodData } = await supabase
      .from('products')
      .select(`*, inventory_stock(quantity, warehouse_id)`)
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });
      
    if (prodData) setProducts(prodData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // 📸 Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeId) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) continue; // 5MB limit

        const fileExt = file.name.split('.').pop();
        const fileName = `prod-${activeId}-${Date.now()}-${i}.${fileExt}`;

        const { error } = await supabase.storage.from('business-assets').upload(fileName, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
      setNewProduct(prev => ({ ...prev, image_urls: [...prev.image_urls, ...uploadedUrls] }));
    } catch (error: any) {
      alert("Error uploading images: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- TOGGLE ONLINE / OFFLINE ---
  const toggleOnlineStatus = async (id: string, currentStatus: boolean) => {
    setProducts(products.map(p => p.id === id ? { ...p, is_online: !currentStatus } : p));
    await supabase.from('products').update({ is_online: !currentStatus }).eq('id', id);
  };

  // --- SAVE PRODUCT & INITIAL STOCK (Using RPC) ---
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.selling_price || !newProduct.warehouse_id) {
      return alert("Name, Selling Price, and Warehouse are required.");
    }

    setSaving(true);
    try {
      // 1. Insert Product
      const { data: prodData, error: prodError } = await supabase.from('products').insert([{
        business_id: activeId,
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        brand: newProduct.brand,
        category: newProduct.category,
        purchase_price: Number(newProduct.purchase_price) || 0,
        selling_price: Number(newProduct.selling_price),
        mrp: Number(newProduct.mrp) || null,
        tax_percentage: Number(newProduct.tax_percentage),
        uom: newProduct.uom,
        min_stock: Number(newProduct.min_stock),
        max_stock: Number(newProduct.max_stock),
        image_urls: newProduct.image_urls,
        description: newProduct.description,
        is_online: newProduct.is_online,
      }]).select().single();

      if (prodError) throw prodError;

      // 2. Add Initial Stock using RPC (Atomic update)
      if (Number(newProduct.stock) > 0) {
        const { error: rpcError } = await supabase.rpc('adjust_stock', {
          p_business_id: activeId,
          p_product_id: prodData.id,
          p_warehouse_id: newProduct.warehouse_id,
          p_quantity: Number(newProduct.stock),
          p_movement_type: 'INITIAL_STOCK',
          p_notes: 'Opening stock added during product creation'
        });
        if (rpcError) throw rpcError;
      }

      setIsModalOpen(false);
      setNewProduct({ name: '', sku: '', barcode: '', brand: '', category: categories[0]?.name || '', purchase_price: '', selling_price: '', mrp: '', stock: '', tax_percentage: 18, uom: 'Pcs', min_stock: 5, max_stock: 100, image_urls: [], description: '', is_online: true, warehouse_id: warehouses[0]?.id || '' });
      fetchData();

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate Stats
  const stats = useMemo(() => {
    let totalStockValue = 0;
    let lowStockCount = 0;
    
    products.forEach(p => {
      // Total stock across all warehouses for this product
      const totalQty = p.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      totalStockValue += (totalQty * p.purchase_price);
      if (totalQty > 0 && totalQty <= p.min_stock) lowStockCount++;
    });

    return { totalStockValue, lowStockCount, totalItems: products.length };
  }, [products]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Advanced Inventory...</div>;
  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* 1. HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-blue-600">📦</span> Universal Inventory
          </h1>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          <button className="flex-1 md:px-6 py-2 bg-white text-blue-600 font-bold rounded-lg shadow-sm text-sm">Inventory</button>
          <button className="flex-1 md:px-6 py-2 text-gray-500 font-medium text-sm hover:text-gray-800">Purchases</button>
          <button className="flex-1 md:px-6 py-2 text-gray-500 font-medium text-sm hover:text-gray-800">Reports</button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Stock Value</p>
          <h3 className="text-2xl font-black text-blue-900">₹{stats.totalStockValue.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
          <p className="text-xs text-green-600 font-bold uppercase mb-1">Active Items</p>
          <h3 className="text-2xl font-black text-green-900">{stats.totalItems}</h3>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
          <p className="text-xs text-red-600 font-bold uppercase mb-1">Low Stock Alerts</p>
          <h3 className="text-2xl font-black text-red-900">{stats.lowStockCount}</h3>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-600 font-bold uppercase mb-1">Warehouses</p>
            <h3 className="text-2xl font-black text-purple-900">{warehouses.length}</h3>
          </div>
          <span className="text-3xl">🏢</span>
        </div>
      </div>

      {/* 3. TOOLBAR & SEARCH */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 bg-white p-2 rounded-xl border border-gray-200 flex items-center shadow-sm">
          <span className="text-gray-400 pl-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search by product name or SKU..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm px-3 text-gray-700 font-medium" 
          />
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2">
          <span className="text-lg">+</span> Add New Item
        </button>
      </div>

      {/* 4. PRODUCT GRID */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-800 font-bold text-lg">Koi item nahi mila.</p>
          <p className="text-gray-500 text-sm mt-1">Naya item add karne ke liye upar button dabayein.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const totalQty = product.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
            const isLowStock = totalQty > 0 && totalQty <= product.min_stock;
            const coverImage = product.image_urls?.[0];

            return (
              <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                
                {/* Online Toggle Switch */}
                <div className="absolute top-2 right-2 z-10">
                  <button 
                    onClick={() => toggleOnlineStatus(product.id, product.is_online)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${product.is_online ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${product.is_online ? 'right-0.5' : 'left-0.5'}`}></span>
                  </button>
                </div>

                {/* Image */}
                <div className="h-32 bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-gray-100 relative">
                  {coverImage ? (
                    <img src={coverImage} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-gray-300 font-black">{product.name.charAt(0)}</span>
                  )}
                  {product.sku && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">{product.sku}</span>}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <p className="text-[10px] text-blue-600 font-bold uppercase truncate">{product.category}</p>
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{product.name}</h3>
                  
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm font-black text-gray-900">₹{product.selling_price}</span>
                    <span className="text-[10px] text-gray-500 font-medium">/ {product.uom}</span>
                  </div>
                </div>

                {/* Stock Footer */}
                <div className={`mt-3 pt-2 border-t flex justify-between items-center text-xs font-bold ${isLowStock ? 'border-red-100 text-red-600' : 'border-gray-100 text-gray-600'}`}>
                  <span>{totalQty} {product.uom} In Stock</span>
                  {isLowStock && <span className="bg-red-100 px-1.5 py-0.5 rounded text-[9px]">LOW</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ================= ADVANCED ADD ITEM MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-gray-800">Create Universal Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Side: Basic & Images */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600">Item Name *</label>
                  <input type="text" placeholder="e.g. Havells 2.5mm Wire" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:border-blue-500 font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600">SKU / Code</label>
                    <input type="text" placeholder="e.g. HV-WR-25" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Brand</label>
                    <input type="text" placeholder="e.g. Havells" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600">Category</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:border-blue-500">
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Item Photos</label>
                  <div className="grid grid-cols-4 gap-2">
                    {newProduct.image_urls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={url} alt="img" className="w-full h-full object-cover" />
                        <button onClick={() => setNewProduct(prev => ({...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx)}))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl-lg">✕</button>
                      </div>
                    ))}
                    {newProduct.image_urls.length < 4 && (
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50">
                        <span className="text-xl">📷</span>
                        <span className="text-[9px] font-bold mt-1">{uploading ? '...' : 'Add'}</span>
                      </button>
                    )}
                  </div>
                  <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
              </div>

              {/* Right Side: Pricing, Stock & Units */}
              <div className="space-y-4">
                
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Purchase (₹)</label>
                    <input type="number" placeholder="0" value={newProduct.purchase_price} onChange={e => setNewProduct({...newProduct, purchase_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">MRP (₹)</label>
                    <input type="number" placeholder="0" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full p-2 border rounded-lg mt-1 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 uppercase">Selling (₹) *</label>
                    <input type="number" placeholder="0" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 outline-none text-sm font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Unit of Measure (UOM)</label>
                    <select value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white">
                      {STANDARD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Warehouse *</label>
                    <select value={newProduct.warehouse_id} onChange={e => setNewProduct({...newProduct, warehouse_id: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-blue-50 text-blue-800 font-bold">
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Opening Stock</label>
                    <input type="number" placeholder="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Min Alert</label>
                    <input type="number" placeholder="5" value={newProduct.min_stock} onChange={e => setNewProduct({...newProduct, min_stock: Number(e.target.value)})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">GST %</label>
                    <input type="number" placeholder="18" value={newProduct.tax_percentage} onChange={e => setNewProduct({...newProduct, tax_percentage: Number(e.target.value)})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none" />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl flex items-center justify-between border border-blue-100 mt-2">
                  <div>
                    <p className="text-sm font-bold text-blue-900">Online Store</p>
                    <p className="text-[10px] text-blue-600">Show to customers</p>
                  </div>
                  <input type="checkbox" checked={newProduct.is_online} onChange={e => setNewProduct({...newProduct, is_online: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                </div>

              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleAddProduct} disabled={saving || uploading} className="flex-[2] bg-blue-600 py-3.5 rounded-xl font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50">
                {saving ? 'Saving to Database...' : 'Save Item & Add Stock'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}