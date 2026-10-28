'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Product = { id: string; name: string; purchase_price: number; stock: number; }

export default function ProviderPurchasesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [supplierName, setSupplierName] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [cost, setCost] = useState<number | ''>('')

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    // Fetch Products (for dropdown)
    const { data: prodData } = await supabase.from('products').select('*').eq('business_id', activeId);
    if (prodData) setProducts(prodData as any);

    // Fetch Recent Purchases (history)
    const { data: purData } = await supabase
      .from('purchases')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (purData) setPurchases(purData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // Auto-fill cost when product is selected
  const handleProductChange = (id: string) => {
    setProductId(id);
    const selectedProd = products.find(p => p.id === id);
    if (selectedProd) setCost(selectedProd.purchase_price);
  };

  // --- SAVE PURCHASE & UPDATE STOCK ---
  const handleAddPurchase = async () => {
    if (!productId || !qty || !cost) return alert("Please fill all fields");
    if (!activeId) return;

    setSaving(true);
    const totalAmount = Number(qty) * Number(cost);

    try {
      // 1. Insert into purchases table
      const { data: purchaseData, error: purError } = await supabase.from('purchases').insert([{
        business_id: activeId,
        supplier_id: null, // Baad me hum supplier table se link karenge
        bill_no: `PUR-${Date.now()}`,
        purchase_date: new Date().toISOString(),
        subtotal: totalAmount,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        due_amount: 0
      }]).select().single();

      if (purError) throw purError;

      // 2. Insert into purchase_items
      const { error: itemError } = await supabase.from('purchase_items').insert([{
        purchase_id: purchaseData.id,
        business_id: activeId,
        product_id: productId,
        product_name: products.find(p => p.id === productId)?.name,
        qty: Number(qty),
        price: Number(cost),
        total: totalAmount
      }]);

      if (itemError) throw itemError;

      // 3. Update Stock in products table
      const currentStock = products.find(p => p.id === productId)?.stock || 0;
      await supabase.from('products').update({ stock: currentStock + Number(qty) }).eq('id', productId);

      alert("Purchase Recorded! Stock Updated.");
      setProductId('');
      setQty(1);
      setCost('');
      fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Purchases...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Purchases (Stock In)</h1>
          <p className="text-sm text-gray-500">Buy new spare parts & increase stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* NEW PURCHASE FORM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">New Purchase Entry</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Supplier Name (Optional)</label>
              <input type="text" placeholder="e.g. Delhi Spare Parts" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Select Product *</label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">-- Choose Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-gray-700">Quantity *</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Cost Price (₹) *</label>
                <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-bold">Total Purchase Amount:</span>
                <span className="text-xl font-black text-blue-600">₹{(Number(qty) * Number(cost || 0)).toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleAddPurchase} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Record Purchase & Add Stock'}
            </button>
          </div>
        </div>

        {/* RECENT PURCHASES HISTORY */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Recent Purchases</h2>
          
          {purchases.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No recent purchases.</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{p.bill_no}</p>
                    <p className="text-xs text-gray-500">{new Date(p.purchase_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">₹{p.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}