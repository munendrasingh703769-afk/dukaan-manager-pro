'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Product = { 
  id: string; name: string; selling_price: number; tax_percentage: number; uom: string;
  inventory_stock: { quantity: number; warehouse_id: string }[];
}
type Warehouse = { id: string; name: string; }

export default function ProviderSalesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // POS States
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [cashPaid, setCashPaid] = useState<number | ''>('');
  const [onlinePaid, setOnlinePaid] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice Modal State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  // Fetch Data
  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    // 1. Fetch Business Details (For Invoice)
    const { data: biz } = await supabase.from('businesses').select('*').eq('id', activeId).single();
    if (biz) setBusinessData(biz);

    // 2. Fetch Warehouses
    const { data: whData } = await supabase.from('warehouses').select('id, name').eq('business_id', activeId);
    if (whData && whData.length > 0) {
      setWarehouses(whData);
      setSelectedWarehouse(whData[0].id);
    }

    // 3. Fetch Products with Inventory Stock
    const { data: prodData } = await supabase
      .from('products')
      .select(`*, inventory_stock(quantity, warehouse_id)`)
      .eq('business_id', activeId)
      .eq('is_online', true) // POS me bhi abhi online products hi le rahe hain, chahe toh isko hata dein
      .order('name', { ascending: true });

    if (prodData) setProducts(prodData as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // Get Stock for specific warehouse
  const getStock = (product: Product) => {
    if (!selectedWarehouse) return 0;
    const stockRecord = product.inventory_stock?.find(s => s.warehouse_id === selectedWarehouse);
    return stockRecord ? stockRecord.quantity : 0;
  };

  // --- CART LOGIC ---
  const addToCart = (product: Product) => {
    const availableStock = getStock(product);
    if (availableStock <= 0) return alert("Out of stock in this warehouse!");

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= availableStock) return alert(`Only ${availableStock} items available.`);
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, newQty: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const availableStock = getStock(product);

    if (newQty > availableStock) return alert(`Only ${availableStock} items available.`);
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

  // --- HANDLE SAVE SALE ---
  const handleSaveSale = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (dueAmount > 0 && !customerPhone) return alert("Please enter phone number for due payments.");
    if (!selectedWarehouse) return alert("Please select a warehouse.");

    setSaving(true);
    try {
      // 1. Insert into Sales table
      const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
        business_id: activeId,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
        invoice_no: `INV-${Date.now()}`,
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

      // 3. Deduct Stock using RPC (Atomic Update)
      for (const item of cart) {
        const { error: rpcError } = await supabase.rpc('adjust_stock', {
          p_business_id: activeId,
          p_product_id: item.id,
          p_warehouse_id: selectedWarehouse,
          p_quantity: -item.qty, // 👈 Minus karke bhej rahe hain stock out ke liye
          p_movement_type: 'SALE_OUT',
          p_reference_id: saleData.id,
          p_notes: `Sold via POS, Invoice: ${saleData.invoice_no}`
        });
        if (rpcError) console.error("Stock update failed for:", item.name, rpcError);
      }

      // 4. Set Completed Sale Data and Open Invoice Modal
      setCompletedSale({
        ...saleData,
        items: cart
      });
      setIsInvoiceOpen(true);

      // 5. Reset Cart
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCashPaid('');
      setOnlinePaid('');
      fetchData(); // Refresh products (stock update)

    } catch (error: any) {
      alert("Error saving sale: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading POS...</div>;
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 max-w-7xl mx-auto pb-10">
      
      {/* LEFT: PRODUCT LIST */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Header & Warehouse Selector */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-gray-800 text-lg">Select Products</h2>
            <select 
              value={selectedWarehouse} 
              onChange={e => { setSelectedWarehouse(e.target.value); setCart([]); }} // Change warehouse resets cart
              className="p-2 border border-blue-200 rounded-lg text-sm bg-blue-50 text-blue-800 font-bold outline-none"
            >
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Search products by name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="p-2.5 border rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
          {filteredProducts.map(p => {
            const stock = getStock(p);
            return (
              <div 
                key={p.id} 
                onClick={() => addToCart(p)}
                className={`bg-white border p-3 rounded-xl cursor-pointer transition flex flex-col justify-between ${stock > 0 ? 'border-gray-200 hover:border-blue-400 hover:shadow-md' : 'border-red-100 opacity-60 bg-red-50'}`}
              >
                <div>
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-2">{p.name}</h4>
                  <p className={`text-[10px] mt-1 font-bold ${stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>Stock: {stock} {p.uom}</p>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-black text-blue-600 text-sm">₹{p.selling_price}</span>
                  {stock > 0 && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded">+ Add</span>}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center py-10">No products found.</p>}
        </div>
      </div>

      {/* RIGHT: CART & BILLING */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">Current Bill</h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Tap on products to add them here.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h4>
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

      {/* ================= INVOICE MODAL ================= */}
      {isInvoiceOpen && completedSale && businessData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[999] print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="text-center mb-4 print:hidden">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">✅</div>
              <h2 className="text-xl font-black text-gray-800">Sale Successful!</h2>
            </div>

            {/* Printable Area */}
            <div id="printable-invoice" className="overflow-y-auto border p-4 rounded-xl flex-1 text-sm bg-gray-50">
              <div className="text-center border-b pb-3 mb-3">
                <h1 className="text-xl font-black uppercase">{businessData.name}</h1>
                <p className="text-xs text-gray-600">{businessData.address}</p>
                <p className="text-xs text-gray-600">Phone: {businessData.phone}</p>
                {businessData.gst_number && <p className="text-xs text-gray-600 font-bold">GSTIN: {businessData.gst_number}</p>}
              </div>

              <div className="flex justify-between text-xs mb-3">
                <div>
                  <p className="font-bold">Customer:</p>
                  <p>{completedSale.customer_name}</p>
                  <p>{completedSale.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p><b>Invoice:</b> {completedSale.invoice_no}</p>
                  <p><b>Date:</b> {new Date(completedSale.sale_date).toLocaleDateString()}</p>
                </div>
              </div>

              <table className="w-full text-left mb-3 text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-center">{item.qty}</td>
                      <td className="py-1 text-right">₹{item.selling_price}</td>
                      <td className="py-1 text-right font-bold">₹{(item.selling_price * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end text-xs">
                <div className="w-1/2 space-y-1">
                  <div className="flex justify-between"><span>Subtotal:</span><span>₹{completedSale.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>GST:</span><span>₹{completedSale.total_gst.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1"><span>Grand Total:</span><span>₹{completedSale.total_amount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Paid:</span><span>₹{completedSale.paid_amount.toFixed(2)}</span></div>
                  {completedSale.due_amount > 0 && <div className="flex justify-between text-red-600 font-bold"><span>Due:</span><span>₹{completedSale.due_amount.toFixed(2)}</span></div>}
                </div>
              </div>
              
              <div className="text-center text-[10px] text-gray-500 mt-6 border-t pt-2">
                <p>Thank you for your business!</p>
                <p>Generated by VyapaarSetu</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 print:hidden">
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-md">🖨️ Print / PDF</button>
              <button onClick={() => setIsInvoiceOpen(false)} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}