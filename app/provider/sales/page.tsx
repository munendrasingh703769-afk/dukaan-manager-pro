'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Product = { id: string; name: string; selling_price: number; stock: number; tax_percentage: number; }

export default function ProviderSalesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Billing State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [cashPaid, setCashPaid] = useState<number | ''>('');
  const [onlinePaid, setOnlinePaid] = useState<number | ''>('');

  const fetchProducts = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', activeId)
      .gt('stock', 0) // Sirf wo products jinka stock 0 se zyada hai
      .order('name', { ascending: true });

    if (data) setProducts(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [activeId]);

  // --- CART LOGIC ---
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) return alert(`Only ${product.stock} items available in stock.`);
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, newQty: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (newQty > product.stock) return alert(`Only ${product.stock} items available.`);
    if (newQty < 1) return removeFromCart(id);
    
    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  // --- CALCULATIONS ---
  const subTotal = cart.reduce((acc, item) => acc + (item.selling_price * item.qty), 0);
  const totalGst = cart.reduce((acc, item) => acc + ((item.selling_price * item.qty) * (item.tax_percentage / 100)), 0);
  const grandTotal = subTotal + totalGst;
  const totalPaid = Number(cashPaid || 0) + Number(onlinePaid || 0);
  const dueAmount = grandTotal - totalPaid;

  // --- SAVE SALE ---
  const handleSaveSale = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (dueAmount > 0 && !customerPhone) return alert("Please enter phone number for due payments.");
    if (!activeId) return;

    setSaving(true);
    try {
      // 1. Insert into Sales
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        business_id: activeId,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
        invoice_no: `SALE-${Date.now()}`,
        sale_date: new Date().toISOString(),
        subtotal: subTotal,
        total_gst: totalGst,
        total_amount: grandTotal,
        paid_amount: totalPaid,
        due_amount: dueAmount,
        cash_amount: Number(cashPaid || 0),
        online_amount: Number(onlinePaid || 0),
        payment_method: totalPaid > 0 ? 'split' : 'unpaid',
        status: 'completed'
      }]).select().single();

      if (saleError) throw saleError;

      // 2. Insert into Sale Items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        business_id: activeId,
        product_id: item.id,
        product_name: item.name,
        qty: item.qty,
        price: item.selling_price,
        gst_percent: item.tax_percentage,
        total: item.selling_price * item.qty
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // 3. Deduct Stock
      for (const item of cart) {
        const { error: stockError } = await supabase.rpc('decrease_stock', { p_product_id: item.id, p_qty: item.qty });
        // Agar RPC nahi hai, toh direct update karein
        if (stockError) {
           await supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.id);
        }
      }

      alert("Sale Successful! Stock Deducted.");
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCashPaid('');
      setOnlinePaid('');
      fetchProducts();

    } catch (error: any) {
      alert("Error saving sale: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading POS...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
      
      {/* LEFT: PRODUCT LIST */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Select Products</h2>
          <input type="text" placeholder="Search..." className="p-2 border rounded-lg text-sm w-40" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
          {products.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)}
              className="bg-white border border-gray-200 p-3 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{p.name}</h4>
                <p className="text-[10px] text-gray-500 mt-1">Stock: {p.stock}</p>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="font-black text-blue-600 text-sm">₹{p.selling_price}</span>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded">+ Add</span>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center py-10">No products in stock.</p>}
        </div>
      </div>

      {/* RIGHT: CART & BILLING */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">Current Bill</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Tap on products to add them here.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800">{item.name}</h4>
                  <p className="text-xs text-gray-500">₹{item.selling_price} x {item.qty}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center font-bold">-</button>
                  <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center font-bold">+</button>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-2 text-xs font-bold">✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BILLING SUMMARY */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
          
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="p-2 border rounded-lg text-sm" />
            <input type="tel" placeholder="Phone *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="p-2 border rounded-lg text-sm" />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST</span><span>₹{totalGst.toFixed(2)}</span></div>
            <div className="flex justify-between font-black text-lg text-gray-800 pt-2 border-t border-gray-300">
              <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-600">Cash</label>
              <input type="number" value={cashPaid} onChange={e => setCashPaid(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" placeholder="₹0" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600">Online</label>
              <input type="number" value={onlinePaid} onChange={e => setOnlinePaid(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" placeholder="₹0" />
            </div>
          </div>

          {dueAmount > 0 && (
            <div className="bg-red-50 p-2 rounded-lg text-center">
              <p className="text-xs text-red-600 font-bold">Due: ₹{dueAmount.toFixed(2)}</p>
            </div>
          )}

          <button onClick={handleSaveSale} disabled={saving || cart.length === 0} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-700 transition disabled:opacity-50">
            {saving ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}