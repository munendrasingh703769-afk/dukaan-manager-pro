'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Warehouse = { id: string; name: string; }
type Product = { id: string; name: string; uom: string; inventory_stock: { quantity: number; warehouse_id: string }[]; }
type LedgerEntry = {
  id: string; movement_type: string; quantity: number; notes: string; created_at: string;
  products: { name: string; uom: string }; warehouses: { name: string };
}

export default function StockMovementPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [activeTab, setActiveTab] = useState<'history' | 'transfer' | 'damage'>('history');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // --- TRANSFER FORM STATES ---
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [transferProd, setTransferProd] = useState('');
  const [transferQty, setTransferQty] = useState<number | ''>('');
  
  // --- DAMAGE FORM STATES ---
  const [damageWh, setDamageWh] = useState('');
  const [damageProd, setDamageProd] = useState('');
  const [damageQty, setDamageQty] = useState<number | ''>('');
  const [damageNotes, setDamageNotes] = useState('');

  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    // 1. Fetch Warehouses
    const { data: whData } = await supabase.from('warehouses').select('*').eq('business_id', activeId);
    if (whData) {
      setWarehouses(whData);
      if (whData.length > 0) {
        setFromWh(whData[0].id);
        setDamageWh(whData[0].id);
        if (whData.length > 1) setToWh(whData[1].id);
      }
    }

    // 2. Fetch Products with Stock
    const { data: prodData } = await supabase.from('products').select(`*, inventory_stock(quantity, warehouse_id)`).eq('business_id', activeId);
    if (prodData) setProducts(prodData as any);

    // 3. Fetch Ledger History
    const { data: ledgerData } = await supabase
      .from('stock_ledger')
      .select(`*, products(name, uom), warehouses(name)`)
      .eq('business_id', activeId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (ledgerData) setLedger(ledgerData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- HANDLE TRANSFER ---
  const handleTransfer = async () => {
    if (fromWh === toWh) return alert("From and To warehouse cannot be same.");
    if (!transferProd || !transferQty || transferQty <= 0) return alert("Please fill all fields.");
    
    // Check stock in From Warehouse
    const prod = products.find(p => p.id === transferProd);
    const stockInFromWh = prod?.inventory_stock.find(s => s.warehouse_id === fromWh)?.quantity || 0;
    if (transferQty > stockInFromWh) return alert(`Not enough stock in source warehouse. Available: ${stockInFromWh}`);

    setProcessing(true);
    try {
      // 1. Deduct from 'From' warehouse
      await supabase.rpc('adjust_stock', {
        p_business_id: activeId, p_product_id: transferProd, p_warehouse_id: fromWh,
        p_quantity: -transferQty, p_movement_type: 'TRANSFER_OUT', p_notes: `Transferred to another warehouse`
      });

      // 2. Add to 'To' warehouse
      await supabase.rpc('adjust_stock', {
        p_business_id: activeId, p_product_id: transferProd, p_warehouse_id: toWh,
        p_quantity: transferQty, p_movement_type: 'TRANSFER_IN', p_notes: `Received from another warehouse`
      });

      alert("Stock Transferred Successfully!");
      setTransferQty('');
      fetchData();
      setActiveTab('history');
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- HANDLE DAMAGE ---
  const handleDamage = async () => {
    if (!damageProd || !damageQty || damageQty <= 0) return alert("Please fill all fields.");
    
    const prod = products.find(p => p.id === damageProd);
    const stock = prod?.inventory_stock.find(s => s.warehouse_id === damageWh)?.quantity || 0;
    if (damageQty > stock) return alert(`Not enough stock. Available: ${stock}`);

    setProcessing(true);
    try {
      await supabase.rpc('adjust_stock', {
        p_business_id: activeId, p_product_id: damageProd, p_warehouse_id: damageWh,
        p_quantity: -damageQty, p_movement_type: 'DAMAGE', p_notes: damageNotes || 'Damaged/Lost stock'
      });

      alert("Damage/Loss Recorded & Stock Deducted!");
      setDamageQty('');
      setDamageNotes('');
      fetchData();
      setActiveTab('history');
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading History...</div>;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">📊 Stock Movement</h1>
          <p className="text-sm text-gray-500">View history, transfer stock or report damage</p>
        </div>
        <Link href="/provider/inventory" className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition">
          ← Back to Inventory
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Ledger History</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition ${activeTab === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Stock Transfer</button>
        <button onClick={() => setActiveTab('damage')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition ${activeTab === 'damage' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Damage / Loss</button>
      </div>

      {/* ================= TAB 1: HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {ledger.length === 0 ? (
              <p className="p-10 text-center text-gray-500">No stock movements recorded yet.</p>
            ) : (
              ledger.map(entry => {
                const isIn = entry.quantity > 0;
                return (
                  <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${isIn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isIn ? '↓' : '↑'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{entry.products?.name}</h4>
                        <p className="text-xs text-gray-500">
                          {entry.movement_type.replace('_', ' ')} • {entry.warehouses?.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-lg ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                        {isIn ? '+' : ''}{entry.quantity} <span className="text-xs text-gray-500 font-medium">{entry.products?.uom}</span>
                      </p>
                      {entry.notes && <p className="text-[10px] text-gray-400 max-w-[150px] truncate">{entry.notes}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}      {/* ================= TAB 2: TRANSFER ================= */}
      {activeTab === 'transfer' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-bold text-blue-800 border-b pb-2">Transfer Stock (Godown to Shop)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600">From Warehouse</label>
              <select value={fromWh} onChange={e => setFromWh(e.target.value)} className="w-full p-3 border rounded-xl mt-1 bg-gray-50 text-sm">
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">To Warehouse</label>
              <select value={toWh} onChange={e => setToWh(e.target.value)} className="w-full p-3 border rounded-xl mt-1 bg-blue-50 text-blue-800 font-bold text-sm">
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Select Product</label>
            <select value={transferProd} onChange={e => setTransferProd(e.target.value)} className="w-full p-3 border rounded-xl mt-1 bg-white text-sm">
              <option value="">-- Select Product --</option>
              {products.map(p => {
                const stock = p.inventory_stock.find(s => s.warehouse_id === fromWh)?.quantity || 0;
                return <option key={p.id} value={p.id} disabled={stock <= 0}>{p.name} (Stock in source: {stock} {p.uom})</option>
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Quantity to Transfer</label>
            <input type="number" value={transferQty} onChange={e => setTransferQty(Number(e.target.value))} className="w-full p-3 border rounded-xl mt-1 outline-none text-sm" placeholder="e.g. 10" />
          </div>

          <button onClick={handleTransfer} disabled={processing} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition mt-2 disabled:opacity-50">
            {processing ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      )}

      {/* ================= TAB 3: DAMAGE ================= */}
      {activeTab === 'damage' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-bold text-red-800 border-b pb-2">Report Damage / Lost Stock</h2>
          
          <div>
            <label className="text-xs font-bold text-gray-600">Warehouse</label>
            <select value={damageWh} onChange={e => setDamageWh(e.target.value)} className="w-full p-3 border rounded-xl mt-1 bg-gray-50 text-sm">
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Select Product</label>
            <select value={damageProd} onChange={e => setDamageProd(e.target.value)} className="w-full p-3 border rounded-xl mt-1 bg-white text-sm">
              <option value="">-- Select Product --</option>
              {products.map(p => {
                const stock = p.inventory_stock.find(s => s.warehouse_id === damageWh)?.quantity || 0;
                return <option key={p.id} value={p.id} disabled={stock <= 0}>{p.name} (Stock: {stock} {p.uom})</option>
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Quantity Damaged</label>
            <input type="number" value={damageQty} onChange={e => setDamageQty(Number(e.target.value))} className="w-full p-3 border rounded-xl mt-1 outline-none text-sm" placeholder="e.g. 2" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Reason / Notes</label>
            <input type="text" value={damageNotes} onChange={e => setDamageNotes(e.target.value)} className="w-full p-3 border rounded-xl mt-1 outline-none text-sm" placeholder="e.g. Broken during transport" />
          </div>

          <button onClick={handleDamage} disabled={processing} className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-red-700 transition mt-2 disabled:opacity-50">
            {processing ? 'Processing...' : 'Deduct Damaged Stock'}
          </button>
        </div>
      )}

    </div>
  );
}