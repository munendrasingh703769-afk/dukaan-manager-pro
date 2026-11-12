'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Supplier = { id: string; name: string; }
type Product = { id: string; name: string; purchase_price: number; uom: string; }
type Warehouse = { id: string; name: string; }
type PurchaseItem = { product_id: string; product_name: string; qty: number; rate: number; total: number; }

export default function ProviderPurchasesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [billNo, setBillNo] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);

  // Fetch Data
  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data: supData } = await supabase.from('suppliers').select('id, name').eq('business_id', activeId);
    if (supData) setSuppliers(supData);

    const { data: whData } = await supabase.from('warehouses').select('id, name').eq('business_id', activeId);
    if (whData) {
      setWarehouses(whData);
      if (whData.length > 0) setSelectedWarehouse(whData[0].id);
    }

    // Products fetch karte waqt uom bhi layenge
    const { data: prodData } = await supabase.from('products').select('id, name, purchase_price, uom').eq('business_id', activeId);
    if (prodData) setProducts(prodData);

    // Fetch Recent Purchases with items
    const { data: purData } = await supabase
      .from('purchases')
      .select(`*, purchase_items(*)`)
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });
    if (purData) setPurchases(purData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- ITEM LOGIC ---
  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      setItems(items.map(i => i.product_id === productId ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.rate } : i));
    } else {
      setItems([...items, {
        product_id: product.id, product_name: product.name, qty: 1, rate: product.purchase_price, total: product.purchase_price
      }]);
    }
  };

  const handleUpdateItem = (index: number, field: 'qty'|'rate', value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    newItems[index].total = newItems[index].qty * newItems[index].rate;
    setItems(newItems);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  // --- CALCULATIONS ---
  const calculations = useMemo(() => {
    const subTotal = items.reduce((acc, curr) => acc + curr.total, 0);
    const grandTotal = subTotal - discount;
    const dueAmount = grandTotal - cashPaid;
    return { subTotal, grandTotal, dueAmount };
  }, [items, discount, cashPaid]);

  // --- SAVE PURCHASE (Bill Only) ---
  const handleSavePurchase = async () => {
    if (!selectedSupplier || !selectedWarehouse) return alert("Please select Supplier and Warehouse");
    if (items.length === 0) return alert("Please add at least one item");
    
    setSaving(true);
    try {
      // 1. Save Purchase Main
      const { data: purData, error: purError } = await supabase.from('purchases').insert([{
        business_id: activeId,
        supplier_id: selectedSupplier,
        warehouse_id: selectedWarehouse,
        bill_no: billNo || `PUR-${Date.now()}`,
        purchase_date: new Date().toISOString(),
        subtotal: calculations.subTotal,
        discount: discount,
        total_amount: calculations.grandTotal,
        paid_amount: cashPaid,
        due_amount: calculations.dueAmount,
        status: 'pending' // 👈 Abhi stock add NAHI hoga
      }]).select().single();

      if (purError) throw purError;

      // 2. Save Purchase Items
      const purchaseItems = items.map(i => ({
        purchase_id: purData.id,
        business_id: activeId,
        product_id: i.product_id,
        product_name: i.product_name,
        qty: i.qty,
        price: i.rate,
        total: i.total
      }));
      const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems);
      if (itemsError) throw itemsError;

      alert("Purchase Bill Saved! Status: Pending. Click 'Receive' when goods arrive.");
      setItems([]);
      setBillNo('');
      setDiscount(0);
      setCashPaid(0);
      fetchData();

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- RECEIVE STOCK (Godown me aane par) ---
  const handleReceiveStock = async (purchaseId: string, warehouseId: string) => {
    if (!confirm("Kya maal godown me aa gaya hai? Stock add ho jayega.")) return;
    
    try {
      // 1. Fetch that purchase's items
      const { data: itemsData } = await supabase.from('purchase_items').select('*').eq('purchase_id', purchaseId);
      if (!itemsData) return;

      // 2. Loop and add stock via RPC
      for (const item of itemsData) {
        await supabase.rpc('adjust_stock', {
          p_business_id: activeId,
          p_product_id: item.product_id,
          p_warehouse_id: warehouseId,
          p_quantity: item.qty,
          p_movement_type: 'PURCHASE_IN',
          p_reference_id: purchaseId,
          p_notes: `Received against bill: ${purchaseId.slice(0,6)}`
        });
      }

      // 3. Update Purchase status to 'received'
      await supabase.from('purchases').update({ status: 'received' }).eq('id', purchaseId);
      
      alert("Stock successfully added to inventory!");
      fetchData();
    } catch (error: any) {
      alert("Error receiving stock: " + error.message);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Purchases...</div>;
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Purchases (Stock In)</h1>
          <p className="text-sm text-gray-500">Add supplier bills and receive stock into godown</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: CREATE BILL FORM */}
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
            <select onChange={(e) => { handleAddItem(e.target.value); e.target.value = ""; }} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
              <option value="">+ Select Product to Add</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Selected Items */}
          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                <span className="flex-1 text-xs font-bold truncate">{item.product_name}</span>
                <input type="number" value={item.qty} onChange={e => handleUpdateItem(idx, 'qty', Number(e.target.value))} className="w-12 p-1 border rounded text-center text-xs" />
                <input type="number" value={item.rate} onChange={e => handleUpdateItem(idx, 'rate', Number(e.target.value))} className="w-16 p-1 border rounded text-right text-xs" />
                <button onClick={() => removeItem(idx)} className="text-red-500 font-bold px-1">&times;</button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Discount (₹)</label>
              <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Cash Paid (₹)</label>
              <input type="number" value={cashPaid || ''} onChange={e => setCashPaid(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
            <span className="font-bold text-blue-900 text-sm">Total Bill:</span>
            <span className="text-xl font-black text-blue-700">₹{calculations.grandTotal}</span>
          </div>

          <button onClick={handleSavePurchase} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Bill (Status: Pending)'}
          </button>
        </div>

        {/* RIGHT: PURCHASE HISTORY & RECEIVE BUTTON */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Purchase History</h2>
          
          <div className="space-y-3">
            {purchases.map(purchase => (
              <div key={purchase.id} className={`p-4 rounded-xl border ${purchase.status === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Bill: {purchase.bill_no}</h3>
                    <p className="text-xs text-gray-500">{new Date(purchase.purchase_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-gray-900">₹{purchase.total_amount}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${purchase.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-200 text-orange-800'}`}>
                      {purchase.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-200/50 pt-2 mt-2">
                   <p className="text-xs text-gray-600">{purchase.purchase_items?.length || 0} items in this bill</p>
                   
                   {/* 👇 RECEIVE STOCK BUTTON */}
                   {purchase.status === 'pending' && (
                     <button 
                       onClick={() => handleReceiveStock(purchase.id, purchase.warehouse_id)}
                       className="bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm hover:bg-green-700 transition"
                     >
                       ✅ Receive Stock in Godown
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}