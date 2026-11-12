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
}
type PurchaseItem = { product_id: string; product_name: string; qty: number; rate: number; total: number; }

export default function ProviderInventoryPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases'>('inventory');
  const [filterType, setFilterType] = useState<'all' | 'low_stock'>('all');

  // --- INVENTORY STATES ---
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

  // No Hardcoding - Defaults are explicitly numbers or empty
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', brand: '', category: '', 
    purchase_price: '', selling_price: '', mrp: '', stock: '', 
    tax_percentage: '' as string | number, // Empty initially
    uom: 'Pcs', 
    min_stock: '' as string | number,     // Empty initially
    image_urls: [] as string[], is_online: true, warehouse_id: ''
  });

  // --- PURCHASE STATES ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [billNo, setBillNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    try {
      // 1. Fetch Warehouses (Auto-create if empty)
      let { data: whData } = await supabase.from('warehouses').select('*').eq('business_id', activeId);
      
      if (!whData || whData.length === 0) {
        // Create default warehouse
        const { data: newWh, error: whError } = await supabase.from('warehouses').insert([{ 
          business_id: activeId, name: 'Main Store', is_default: true 
        }]).select();
        
        if (whError) throw new Error("Could not create warehouse: " + whError.message);
        whData = newWh;
      }

      if (whData && whData.length > 0) {
        setWarehouses(whData);
        setSelectedWarehouse(whData[0].id);
        setNewProduct(prev => ({ ...prev, warehouse_id: whData[0].id }));
      }

      // 2. Fetch Categories
      const { data: catData } = await supabase.from('shop_categories').select('*').eq('is_active', true);
      if (catData && catData.length > 0) {
        setCategories(catData);
        setNewProduct(prev => {
          if (!prev.category) return { ...prev, category: catData[0].name };
          return prev;
        });
      }

      // 3. Fetch Suppliers
      const { data: supData } = await supabase.from('suppliers').select('id, name').eq('business_id', activeId);
      if (supData) setSuppliers(supData);

      // 4. Fetch Products
      const { data: prodData } = await supabase.from('products').select(`*, inventory_stock(quantity, warehouse_id)`).eq('business_id', activeId).order('created_at', { ascending: false });
      if (prodData) setProducts(prodData as any);

      // 5. Fetch Purchases
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
      name: prod.name, 
      sku: prod.sku || '', 
      brand: prod.brand || '', 
      category: prod.category,
      purchase_price: prod.purchase_price.toString(), 
      selling_price: prod.selling_price.toString(),
      mrp: prod.mrp ? prod.mrp.toString() : '', 
      stock: currentStock.toString(),
      tax_percentage: prod.tax_percentage !== null ? prod.tax_percentage : '', 
      uom: prod.uom, 
      min_stock: prod.min_stock !== null ? prod.min_stock : '', 
      image_urls: prod.image_urls || [], 
      is_online: prod.is_online, 
      warehouse_id: warehouses[0]?.id || ''
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
      image_urls: [], is_online: true, warehouse_id: warehouses[0]?.id || ''
    });
    setIsItemModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.selling_price) {
      return alert("Product Name and Selling Price are required.");
    }
    if (!newProduct.warehouse_id) {
      return alert("Warehouse is missing. Please refresh the page.");
    }

    setSavingItem(true);
    try {
      const payload = {
        business_id: activeId, 
        name: newProduct.name, 
        sku: newProduct.sku, 
        brand: newProduct.brand,
        category: newProduct.category, 
        purchase_price: Number(newProduct.purchase_price) || 0,
        selling_price: Number(newProduct.selling_price), 
        mrp: newProduct.mrp ? Number(newProduct.mrp) : null,
        tax_percentage: newProduct.tax_percentage !== '' ? Number(newProduct.tax_percentage) : null, 
        uom: newProduct.uom,
        min_stock: newProduct.min_stock !== '' ? Number(newProduct.min_stock) : null, 
        image_urls: newProduct.image_urls, 
        is_online: newProduct.is_online,
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
    } catch (error: any) { 
      alert("Save Error: " + error.message); 
    } finally { 
      setSavingItem(false); 
    }
  };

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

  const stats = useMemo(() => {
    let totalStockValue = 0; let lowStockCount = 0;
    products.forEach(p => {
      const totalQty = p.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      totalStockValue += (totalQty * p.purchase_price);
      
      // Safe Check for Min Stock
      const minAlert = p.min_stock || 0;
      if (totalQty > 0 && totalQty <= minAlert) lowStockCount++;
    });
    return { totalStockValue, lowStockCount, totalItems: products.length };
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const totalQty = p.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
    const minAlert = p.min_stock || 0;
    
    if (filterType === 'low_stock') return matchesSearch && totalQty > 0 && totalQty <= minAlert;
    return matchesSearch;
  });

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading...</div>;
  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="text-blue-600">📦</span> Universal Inventory</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('inventory')} className={`flex-1 md:px-8 py-2 font-bold rounded-lg text-sm transition ${activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Inventory</button>
          <button onClick={() => setActiveTab('purchases')} className={`flex-1 md:px-8 py-2 font-bold rounded-lg text-sm transition ${activeTab === 'purchases' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Purchases</button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/provider/inventory/stock-movement" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition flex items-center gap-2">
          📊 View Stock History & Transfer
        </Link>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => setFilterType('all')} className={`cursor-pointer transition p-4 rounded-2xl border ${filterType === 'all' ? 'bg-blue-100 border-blue-300' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Stock Value</p>
              <h3 className="text-2xl font-black text-blue-900">₹{stats.totalStockValue.toLocaleString('en-IN')}</h3>
            </div>
            
            <div onClick={() => setFilterType('all')} className={`cursor-pointer transition p-4 rounded-2xl border ${filterType === 'all' ? 'bg-green-100 border-green-300' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}>
              <p className="text-xs text-green-600 font-bold uppercase mb-1">Active Items</p>
              <h3 className="text-2xl font-black text-green-900">{stats.totalItems}</h3>
            </div>

            <div onClick={() => setFilterType('low_stock')} className={`cursor-pointer transition p-4 rounded-2xl border ${filterType === 'low_stock' ? 'bg-red-100 border-red-300' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}>
              <p className="text-xs text-red-600 font-bold uppercase mb-1">Low Stock Alerts</p>
              <h3 className="text-2xl font-black text-red-900">{stats.lowStockCount}</h3>
            </div>

            <div onClick={() => alert(`Your Warehouses:\n${warehouses.map(w => w.name).join(', ')}`)} className="cursor-pointer transition p-4 rounded-2xl border bg-purple-50 border-purple-100 hover:bg-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase mb-1">Warehouses</p>
                <h3 className="text-2xl font-black text-purple-900">{warehouses.length}</h3>
              </div>
              <span className="text-3xl">🏢</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 bg-white p-2 rounded-xl border border-gray-200 flex items-center shadow-sm">
              <span className="text-gray-400 pl-2">🔍</span>
              <input type="text" placeholder="Search by name or SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent outline-none text-sm px-3 text-gray-700" />
            </div>
            <button onClick={handleAddClick} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition">+ Add New Item</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const totalQty = product.inventory_stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
              const isLowStock = totalQty > 0 && totalQty <= (product.min_stock || 0);
              const coverImage = product.image_urls?.[0];

              return (
                <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                  
                  {/* Always Visible Edit Button */}
                  <div className="absolute top-2 left-2 z-10">
                    <button onClick={() => handleEditClick(product)} className="bg-blue-50 border border-blue-200 shadow-sm px-2 py-1 rounded-lg text-blue-700 font-bold text-[10px] flex items-center gap-1">
                      ✏️ Edit
                    </button>
                  </div>
                  
                  <div className="absolute top-2 right-2 z-10">
                    <button onClick={() => toggleOnlineStatus(product.id, product.is_online)} className={`w-8 h-4 rounded-full relative transition-colors ${product.is_online ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${product.is_online ? 'right-0.5' : 'left-0.5'}`}></span>
                    </button>
                  </div>

                  <div className="h-32 bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border relative mt-4">
                    {coverImage ? <img src={coverImage} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-4xl text-gray-300 font-black">{product.name.charAt(0)}</span>}
                    {product.sku && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">{product.sku}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-blue-600 font-bold uppercase truncate">{product.category}</p>
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-1 mt-1"><span className="text-sm font-black text-gray-900">₹{product.selling_price}</span><span className="text-[10px] text-gray-500">/ {product.uom}</span></div>
                  </div>
                  <div className={`mt-3 pt-2 border-t flex justify-between items-center text-xs font-bold ${isLowStock ? 'border-red-100 text-red-600' : 'border-gray-100 text-gray-600'}`}>
                    <span>{totalQty} {product.uom} In Stock</span>
                    {isLowStock && <span className="bg-red-100 px-1.5 py-0.5 rounded text-[9px]">LOW</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {activeTab === 'purchases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
            <h2 className="text-lg font-bold text-blue-800 border-b pb-2">Create New Purchase</h2>
            <div>
              <label className="text-xs font-bold text-gray-600">Supplier</label>
              <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full p-2 border rounded-lg mt-1 bg-gray-50">
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Receiving Godown (Warehouse)</label>
              <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="w-full p-2 border rounded-lg mt-1 bg-blue-50 text-blue-800 font-bold">
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Bill No (Optional)</label>
              <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="Auto-generated if empty" className="w-full p-2 border rounded-lg mt-1 text-sm" />
            </div>
            <div className="border-t pt-3">
              <label className="text-xs font-bold text-gray-600 mb-1 block">Add Items</label>
              <select onChange={(e) => { handleAddPurchaseItem(e.target.value); e.target.value = ""; }} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                <option value="">+ Select Product to Add</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                  <span className="flex-1 text-xs font-bold truncate">{item.product_name}</span>
                  <input type="number" value={item.qty} onChange={e => handleUpdatePurchaseItem(idx, 'qty', Number(e.target.value))} className="w-12 p-1 border rounded text-center text-xs" />
                  <input type="number" value={item.rate} onChange={e => handleUpdatePurchaseItem(idx, 'rate', Number(e.target.value))} className="w-16 p-1 border rounded text-right text-xs" />
                  <button onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-1">&times;</button>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Discount (₹)</label><input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Cash Paid (₹)</label><input type="number" value={cashPaid || ''} onChange={e => setCashPaid(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" /></div>
            </div>
            <button onClick={handleSavePurchase} disabled={savingPurchase} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
              {savingPurchase ? 'Saving...' : 'Save Bill (Pending)'}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Purchase History</h2>
            <div className="space-y-3">
              {purchases.map(purchase => (
                <div key={purchase.id} className={`p-4 rounded-xl border ${purchase.status === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Bill: {purchase.bill_no}</h3>
                      <p className="text-xs text-gray-500">{new Date(purchase.purchase_date).toLocaleDateString()} • Godown: {purchase.warehouses?.name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-gray-900">₹{purchase.total_amount}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${purchase.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-200 text-orange-800'}`}>{purchase.status.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200/50 pt-2 mt-2">
                    <p className="text-xs text-gray-600">{purchase.purchase_items?.length || 0} items</p>
                    {purchase.status === 'pending' && (
                      <button onClick={() => handleReceiveStock(purchase.id, purchase.warehouse_id)} className="bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm hover:bg-green-700 transition">✅ Receive Stock</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT ITEM MODAL ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-gray-800">{editProductId ? 'Edit Item' : 'Create Item'}</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-600">Item Name *</label><input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-600">SKU</label><input type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Brand</label><input type="text" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full p-3 border rounded-xl mt-1" /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-600">Category</label><select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 border rounded-xl mt-1 bg-white">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Item Photos</label>
                  <div className="grid grid-cols-4 gap-2">
                    {newProduct.image_urls.map((url, idx) => (<div key={idx} className="relative aspect-square rounded-lg overflow-hidden border"><img src={url} alt="img" className="w-full h-full object-cover" /><button onClick={() => setNewProduct(prev => ({...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx)}))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">✕</button></div>))}
                    {newProduct.image_urls.length < 4 && (<button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50"><span className="text-xl">📷</span><span className="text-[9px] font-bold mt-1">{uploading ? '...' : 'Add'}</span></button>)}
                  </div>
                  <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border">
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">Purchase (₹)</label><input type="number" value={newProduct.purchase_price} onChange={e => setNewProduct({...newProduct, purchase_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-gray-500 uppercase">MRP (₹)</label><input type="number" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-blue-600 uppercase">Selling (₹) *</label><input type="number" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} className="w-full p-2 border rounded-lg mt-1 text-sm font-bold" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-600">UOM</label><select value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} className="w-full p-3 border rounded-xl mt-1 bg-white">{STANDARD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  {/* 👇 Warehouse Dropdown with Error handling */}
                  <div>
                    <label className="text-xs font-bold text-gray-600">Warehouse *</label>
                    <select 
                      value={newProduct.warehouse_id} 
                      onChange={e => setNewProduct({...newProduct, warehouse_id: e.target.value})} 
                      className="w-full p-3 border rounded-xl mt-1 bg-blue-50 font-bold text-blue-800"
                    >
                      {warehouses.length === 0 ? (
                        <option value="">(Fetching Warehouse...)</option>
                      ) : (
                        warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                      )}
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