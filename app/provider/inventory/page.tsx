'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

const STANDARD_UNITS = ['Pcs', 'Kg', 'Gram', 'Litre', 'ml', 'Meter', 'Feet', 'Box', 'Packet', 'Bag', 'Roll', 'Set', 'Dozen'];

type Warehouse = { id: string; name: string; }
type Category = { id: string; name: string; icon: string; }
type Supplier = { id: string; name: string; }
type Product = {
  id: string; name: string; sku: string | null; brand: string | null;
  category: string; purchase_price: number; selling_price: number;
  mrp: number | null; tax_percentage: number | null; uom: string;
  min_stock: number | null; image_urls: string[] | null; is_online: boolean;
  inventory_stock: { quantity: number; warehouse_id: string }[];
  attributes: any;
}
type PurchaseItem = { product_id: string; product_name: string; qty: number; rate: number; total: number; }

export default function ProviderInventoryPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases'>('inventory');
  const [filterType, setFilterType] = useState<'all' | 'low_stock'>('all');

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [oldStockInWh, setOldStockInWh] = useState<number>(0);

  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', brand: '', category: '', purchase_price: '', selling_price: '', mrp: '', stock: '', 
    tax_percentage: '' as string | number, uom: 'Pcs', min_stock: '' as string | number, 
    image_urls: [] as string[], is_online: true, warehouse_id: '',
    attributes: {} as Record<string, string> // 👈 Naya Dynamic Attributes
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [billNo, setBillNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);

  // 🧠 SMART DYNAMIC FIELDS LOGIC
  const getDynamicFields = (categoryName: string) => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('fashion') || cat.includes('cloth')) {
      return [{ key: 'size', label: 'Size (S/M/L/XL)' }, { key: 'color', label: 'Color' }, { key: 'material', label: 'Material (Cotton/Silk)' }];
    } else if (cat.includes('shoe') || cat.includes('footwear')) {
      return [{ key: 'size', label: 'Shoe Size (UK/IND)' }, { key: 'color', label: 'Color' }, { key: 'type', label: 'Type (Sneaker/Formal)' }];
    } else if (cat.includes('electronic') || cat.includes('mobile') || cat.includes('computer')) {
      return [{ key: 'model', label: 'Model Number' }, { key: 'warranty', label: 'Warranty (e.g. 1 Year)' }, { key: 'power', label: 'Power (e.g. 65W)' }];
    } else if (cat.includes('grocery') || cat.includes('food')) {
      return [{ key: 'weight', label: 'Net Weight' }, { key: 'expiry', label: 'Expiry Date' }, { key: 'type', label: 'Type (Organic/Regular)' }];
    } else {
      return [{ key: 'brand', label: 'Brand Name' }, { key: 'warranty', label: 'Warranty (Optional)' }];
    }
  };

  const currentDynamicFields = getDynamicFields(newProduct.category);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      let { data: whData } = await supabase.from('warehouses').select('*').eq('business_id', activeId);
      if (!whData || whData.length === 0) {
        const { data: newWh, error: whError } = await supabase.from('warehouses').insert([{ business_id: activeId, name: 'Main Store', is_default: true }]).select();
        if (whError) throw new Error("Could not create warehouse: " + whError.message);
        whData = newWh;
      }
      if (whData && whData.length > 0) {
        setWarehouses(whData);
        setSelectedWarehouse(whData[0].id);
        setNewProduct(prev => ({ ...prev, warehouse_id: whData[0].id }));
      }

      const { data: catData } = await supabase.from('shop_categories').select('*').eq('is_active', true);
      if (catData && catData.length > 0) {
        setCategories(catData);
        setNewProduct(prev => {
          if (!prev.category) return { ...prev, category: catData[0].name };
          return prev;
        });
      }

      const { data: supData } = await supabase.from('suppliers').select('id, name').eq('business_id', activeId);
      if (supData) setSuppliers(supData);

      const { data: prodData } = await supabase.from('products').select(`*, inventory_stock(quantity, warehouse_id)`).eq('business_id', activeId).order('created_at', { ascending: false });
      if (prodData) setProducts(prodData as any);

      const { data: purData } = await supabase.from('purchases').select(`*, purchase_items(*), warehouses(name)`).eq('business_id', activeId).order('created_at', { ascending: false });
      if (purData) setPurchases(purData);

    } catch (err: any) {
      alert("Fetch Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const handleEditClick = (prod: Product) => {
    const stockRecord = prod.inventory_stock.find(s => s.warehouse_id === warehouses[0]?.id);
    const currentStock = stockRecord ? stockRecord.quantity : 0;

    setEditProductId(prod.id);
    setOldStockInWh(currentStock);
    setNewProduct({
      name: prod.name, sku: prod.sku || '', brand: prod.brand || '', category: prod.category,
      purchase_price: prod.purchase_price.toString(), selling_price: prod.selling_price.toString(),
      mrp: prod.mrp ? prod.mrp.toString() : '', stock: currentStock.toString(),
      tax_percentage: prod.tax_percentage !== null ? prod.tax_percentage : '', 
      uom: prod.uom, min_stock: prod.min_stock !== null ? prod.min_stock : '', 
      image_urls: prod.image_urls || [], is_online: prod.is_online, 
      warehouse_id: warehouses[0]?.id || '',
      attributes: prod.attributes || {} // Load existing attributes
    });
    setIsItemModalOpen(true);
  };

  const handleAddClick = () => {
    setEditProductId(null);
    setOldStockInWh(0);
    setNewProduct({
      name: '', sku: '', brand: '', category: categories[0]?.name || '', 
      purchase_price: '', selling_price: '', mrp: '', stock: '', 
      tax_percentage: '', uom: 'Pcs', min_stock: '', 
      image_urls: [], is_online: true, warehouse_id: warehouses[0]?.id || '',
      attributes: {}
    });
    setIsItemModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.selling_price) return alert("Product Name and Selling Price are required.");
    if (!newProduct.warehouse_id) return alert("Warehouse is missing. Please refresh.");

    setSavingItem(true);
    try {
      const payload = {
        business_id: activeId, name: newProduct.name, sku: newProduct.sku, brand: newProduct.brand,
        category: newProduct.category, purchase_price: Number(newProduct.purchase_price) || 0,
        selling_price: Number(newProduct.selling_price), mrp: newProduct.mrp ? Number(newProduct.mrp) : null,
        tax_percentage: newProduct.tax_percentage !== '' ? Number(newProduct.tax_percentage) : null, 
        uom: newProduct.uom,
        min_stock: newProduct.min_stock !== '' ? Number(newProduct.min_stock) : null, 
        image_urls: newProduct.image_urls, is_online: newProduct.is_online,
        attributes: newProduct.attributes // 👈 Save JSON attributes
      };

      if (editProductId) {
        const { error: prodError } = await supabase.from('products').update(payload).eq('id', editProductId);
        if (prodError) throw prodError;

        const newStock = Number(newProduct.stock) || 0;
        const delta = newStock - oldStockInWh;
        if (delta !== 0) {
          await supabase.rpc('adjust_stock', {
            p_business_id: activeId, p_product_id: editProductId, p_warehouse_id: newProduct.warehouse_id,
            p_quantity: delta, p_movement_type: 'MANUAL_EDIT', p_notes: 'Stock adjusted from edit form'
          });
        }
      } else {
        const { data: prodData, error: prodError } = await supabase.from('products').insert([payload]).select().single();
        if (prodError) throw prodError;

        const initialStock = Number(newProduct.stock) || 0;
        if (initialStock > 0) {
          await supabase.rpc('adjust_stock', {
            p_business_id: activeId, p_product_id: prodData.id, p_warehouse_id: newProduct.warehouse_id,
            p_quantity: initialStock, p_movement_type: 'INITIAL_STOCK'
          });
        }
      }
      setIsItemModalOpen(false);
      fetchData();
    } catch (error: any) { alert("Save Error: " + error.message); } finally { setSavingItem(false); }
  };
  
  // ... Image Upload logic (same as before) ...
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeId) return;
    setUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) continue;
        const fileName = `prod-${activeId}-${Date.now()}-${i}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('business-assets').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
      setNewProduct(prev => ({ ...prev, image_urls: [...prev.image_urls, ...uploadedUrls] }));
    } catch (error: any) { alert("Upload Error: " + error.message); } finally { setUploading(false); }
  };

  const toggleOnlineStatus = async (id: string, currentStatus: boolean) => {
    setProducts(products.map(p => p.id === id ? { ...p, is_online: !currentStatus } : p));
    await supabase.from('products').update({ is_online: !currentStatus }).eq('id', id);
  };

  // ... Purchase Functions (same as before) ...
  const handleAddPurchaseItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = purchaseItems.find(i => i.product_id === productId);
    if (existing) {
      setPurchaseItems(purchaseItems.map(i => i.product_id === productId ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.rate } : i));
    } else {
      setPurchaseItems([...purchaseItems, { product_id: product.id, product_name: product.name, qty: 1, rate: product.purchase_price, total: product.purchase_price }]);
    }
  };

  const handleUpdatePurchaseItem = (index: number, field: 'qty'|'rate', value: number) => {
    const newItems = [...purchaseItems];
    newItems[index][field] = value;
    newItems[index].total = newItems[index].qty * newItems[index].rate;
    setPurchaseItems(newItems);
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplier || !selectedWarehouse) return alert("Select Supplier and Warehouse");
    if (purchaseItems.length === 0) return alert("Add items to purchase");
    setSavingPurchase(true);
    try {
      const subTotal = purchaseItems.reduce((acc, curr) => acc + curr.total, 0);
      const grandTotal = subTotal - discount;
      const dueAmount = grandTotal - cashPaid;

      const { data: purData, error: purError } = await supabase.from('purchases').insert([{
        business_id: activeId, supplier_id: selectedSupplier, warehouse_id: selectedWarehouse,
        bill_no: billNo || `PUR-${Date.now()}`, purchase_date: new Date().toISOString(),
        subtotal: subTotal, discount: discount, total_amount: grandTotal, paid_amount: cashPaid, due_amount: dueAmount,
        status: 'pending'
      }]).select().single();
      if (purError) throw purError;

      const purchaseItemsData = purchaseItems.map(i => ({
        purchase_id: purData.id, business_id: activeId, product_id: i.product_id, product_name: i.product_name,
        qty: i.qty, price: i.rate, total: i.total
      }));
      await supabase.from('purchase_items').insert(purchaseItemsData);

      alert("Bill Saved (Pending). Click 'Receive' when goods arrive.");
      setPurchaseItems([]); setBillNo(''); setDiscount(0); setCashPaid(0);
      fetchData();
    } catch (error: any) { alert("Error: " + error.message); } finally { setSavingPurchase(false); }
  };

  const handleReceiveStock = async (purchaseId: string, warehouseId: string) => {
    if (!confirm("Kya maal godown me aa gaya hai? Stock add ho jayega.")) return;
    try {
      const { data: itemsData } = await supabase.from('purchase_items').select('*').eq('purchase_id', purchaseId);
      if (!itemsData) return;
      for (const item of itemsData) {
        await supabase.rpc('adjust_stock', {
          p_business_id: activeId, p_product_id: item.product_id, p_warehouse_id: warehouseId,
          p_quantity: item.qty, p_movement_type: 'PURCHASE_IN', p_reference_id: purchaseId
        });
      }
      await supabase.from('purchases').update({ status: 'received' }).eq('id', purchaseId);
      alert("Stock successfully added!"); fetchData();
    } catch (error: any) { alert("Error: " + error.message); }
  };

  // ... Stats (same as before) ...
  const stats = useMemo(() => {
    let totalStockValue = 0; let lowStockCount = 0;
    products.forEach(p => {
      const totalQty = p.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      totalStockValue += (totalQty * p.purchase_price);
      if (totalQty > 0 && totalQty <= (p.min_stock || 0)) lowStockCount++;
    });
    return { totalStockValue, lowStockCount, totalItems: products.length };
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const totalQty = p.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
    if (filterType === 'low_stock') return matchesSearch && totalQty > 0 && totalQty <= (p.min_stock || 0);
    return matchesSearch;
  });

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading...</div>;
  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* HEADER & TABS */}
      {/* ... (paste same header & tabs from previous code) ... */}

      {/* ================= TAB: INVENTORY ================= */}
      {activeTab === 'inventory' && (
        <>
          {/* ... (paste same stats & search bar) ... */}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              // ... (paste same product card logic) ...
            })}
          </div>
        </>
      )}

      {/* ================= TAB: PURCHASES ================= */}
      {activeTab === 'purchases' && (
        // ... (paste same purchase tab logic) ...
      )}

      {/* ================= ADD / EDIT ITEM MODAL (DYNAMIC FIELDS) ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-gray-800">{editProductId ? 'Edit Item' : 'Create Item'}</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* LEFT COLUMN */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600">Item Name *</label>
                  <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600">SKU</label>
                    <input type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 border rounded-xl mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value, attributes: {}})} className="w-full p-3 border rounded-xl mt-1 bg-white">
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* 🧠 DYNAMIC FIELDS RENDER HERE */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-800 uppercase">Category Specific Details</p>
                  {currentDynamicFields.map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-bold text-gray-600">{field.label}</label>
                      <input 
                        type="text" 
                        value={newProduct.attributes[field.key] || ''} 
                        onChange={(e) => setNewProduct({
                          ...newProduct, 
                          attributes: { ...newProduct.attributes, [field.key]: e.target.value }
                        })} 
                        className="w-full p-3 border rounded-xl mt-1 text-sm bg-white" 
                        placeholder={`Enter ${field.label}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Item Photos</label>
                  <div className="grid grid-cols-4 gap-2">
                    {newProduct.image_urls.map((url, idx) => (<div key={idx} className="relative aspect-square rounded-lg overflow-hidden border"><img src={url} alt="img" className="w-full h-full object-cover" /><button onClick={() => setNewProduct(prev => ({...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx)}))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">✕</button></div>))}
                    {newProduct.image_urls.length < 4 && (<button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50"><span className="text-xl">📷</span><span className="text-[9px] font-bold mt-1">{uploading ? '...' : 'Add'}</span></button>)}
                  </div>
                  <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
              </div>
              
              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Purchase (₹)</label><input type="number" value={newProduct.purchase_price} onChange={e => setNewProduct({...newProduct, purchase_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">MRP (₹)</label><input type="number" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-blue-600 uppercase">Selling (₹) *</label><input type="number" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm font-bold" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-600">UOM</label><select value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} className="w-full p-3 border rounded-xl mt-1 bg-white">{STANDARD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Warehouse *</label>
                    <select value={newProduct.warehouse_id} onChange={e => setNewProduct({...newProduct, warehouse_id: e.target.value})} className="w-full p-3 border rounded-xl mt-1 bg-blue-50 font-bold text-blue-800">
                      {warehouses.length === 0 ? <option value="">(Fetching...)</option> : warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs font-bold text-gray-600">Stock</label><input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Min Alert</label><input type="number" value={newProduct.min_stock} onChange={e => setNewProduct({...newProduct, min_stock: e.target.value})} className="w-full p-3 border rounded-xl mt-1" placeholder="0" /></div>
                  <div><label className="text-xs font-bold text-gray-600">GST %</label><input type="number" value={newProduct.tax_percentage} onChange={e => setNewProduct({...newProduct, tax_percentage: e.target.value})} className="w-full p-3 border rounded-xl mt-1" placeholder="0" /></div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl flex items-center justify-between border border-blue-100">
                  <div><p className="text-sm font-bold text-blue-900">Online Store</p></div>
                  <input type="checkbox" checked={newProduct.is_online} onChange={e => setNewProduct({...newProduct, is_online: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t">
              <button onClick={() => setIsItemModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleSaveProduct} disabled={savingItem || uploading} className="flex-[2] bg-blue-600 py-3 rounded-xl font-bold text-white shadow-md disabled:opacity-50">
                {savingItem ? 'Saving...' : (editProductId ? 'Update Item' : 'Save Item')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}