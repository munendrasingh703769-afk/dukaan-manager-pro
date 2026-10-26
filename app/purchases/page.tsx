'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

// --- TYPES ---
type Supplier = { id: string; name: string; state: string; }
type Product = { id: string; name: string; purchase_price: number; tax_percentage: number; }
type PurchaseItem = { product_id: string; product_name: string; qty: number; rate: number; tax_percentage: number; total: number; }

export default function NewPurchasePage() {
  const router = useRouter();
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  // --- DATA STATES ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessState, setBusinessState] = useState<string>("Maharashtra");

  // --- FORM STATES ---
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [isOutsideIndia, setIsOutsideIndia] = useState<boolean>(false);
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  // --- CHARGES & PAYMENT STATES ---
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [transportCharge, setTransportCharge] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [onlinePaid, setOnlinePaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // --- MODAL STATES ---
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // --- NEW SUPPLIER FORM STATE ---
  const [newSupplier, setNewSupplier] = useState({
    name: "", owner_name: "", phone: "", email: "", gstin: "", state: "", address: "", opening_balance: 0
  });

  // --- NEW PRODUCT FORM STATE ---
  const [newProduct, setNewProduct] = useState({
    name: "", category: "", sku: "", hsn_code: "", unit: "pcs", purchase_price: 0, selling_price: 0, stock: 0, low_stock_limit: 0, tax_percentage: 0
  });

  // --- CALCULATIONS ---
  const calculations = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + item.total, 0);
    
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const isInterState = isOutsideIndia || (supplier && supplier.state !== businessState);
    
    const totalTax = items.reduce((acc, item) => acc + (item.total * (item.tax_percentage / 100)), 0);
    const flatDiscount = discountType === "percent" ? (subTotal * (discount / 100)) : discount;
    const grandTotal = subTotal + totalTax + transportCharge + otherCharges - flatDiscount;
    
    const totalPaid = Number(cashPaid) + Number(onlinePaid);
    const dueAmount = grandTotal - totalPaid;

    return { subTotal, totalTax, flatDiscount, grandTotal, totalPaid, dueAmount, isInterState };
  }, [items, discount, discountType, transportCharge, otherCharges, cashPaid, onlinePaid, selectedSupplier, suppliers, businessState, isOutsideIndia]);
  // --- FETCH DATA ---
  const fetchData = async () => {
    if (!activeId) return;
    
    const { data: supData } = await supabase.from('suppliers').select('*').eq('business_id', activeId);
    if (supData) setSuppliers(supData);

    const { data: prodData } = await supabase.from('products').select('*').eq('business_id', activeId);
    if (prodData) setProducts(prodData);
  };

  useEffect(() => {
    fetchData();
  }, [activeId]);

  // --- ITEM LOGIC ---
  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = items.find(i => i.product_id === productId);
    if (existingItem) {
      setItems(items.map(i => 
        i.product_id === productId ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.rate } : i
      ));
    } else {
      setItems([...items, {
        product_id: product.id, product_name: product.name, qty: 1,
        rate: product.purchase_price || 0, tax_percentage: product.tax_percentage || 0,
        total: product.purchase_price || 0
      }]);
    }
  };

  const handleUpdateItem = (index: number, field: "qty" | "rate", value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    newItems[index].total = newItems[index].qty * newItems[index].rate;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- SAVE SUPPLIER ---
  const handleSaveSupplier = async () => {
    if (!newSupplier.name) return alert("Business Name required");
    if (!activeId) return alert("Business ID not found");
    
    const supplierToSave = {
      name: newSupplier.name,
      owner_name: newSupplier.owner_name,
      phone: newSupplier.phone,
      email: newSupplier.email,
      state: newSupplier.state,
      address: newSupplier.address,
      opening_balance: newSupplier.opening_balance,
      business_id: activeId,
      gstin: newSupplier.gstin 
    };

    const { data, error } = await supabase.from('suppliers').insert([supplierToSave]).select();
    
    if (!error && data) {
      setSuppliers([...suppliers, data[0]]);
      setSelectedSupplier(data[0].id);
      setIsSupplierModalOpen(false);
      setNewSupplier({ name: "", owner_name: "", phone: "", email: "", gstin: "", state: "", address: "", opening_balance: 0 });
    } else {
      alert("Error saving supplier: " + error?.message);
    }
  };

  // --- SAVE PRODUCT ---
  const handleSaveProduct = async () => {
    if (!newProduct.name) return alert("Product Name required");
    if (!activeId) return alert("Business ID not found");
    
    const productToSave = {
      name: newProduct.name,
      category: newProduct.category,
      sku: newProduct.sku,
      hsn_code: newProduct.hsn_code,
      unit: newProduct.unit,
      purchase_price: newProduct.purchase_price,
      selling_price: newProduct.selling_price,
      low_stock_limit: newProduct.low_stock_limit,
      stock: newProduct.stock,
      tax_percentage: newProduct.tax_percentage,
      business_id: activeId,
    };

    const { data, error } = await supabase.from('products').insert([productToSave]).select();
    
    if (!error && data) {
      setProducts([...products, data[0]]);
      handleAddItem(data[0].id);
      setIsProductModalOpen(false);
      setNewProduct({ name: "", category: "", sku: "", hsn_code: "", unit: "pcs", purchase_price: 0, selling_price: 0, stock: 0, low_stock_limit: 0, tax_percentage: 0 });
    } else {
      alert("Error saving product: " + error?.message);
    }
  };

    // --- SAVE PURCHASE (FINAL) ---
  const handleSavePurchase = async () => {
    if (!selectedSupplier) return alert("Please select a supplier");
    if (items.length === 0) return alert("Please add items");
    if (!activeId) return alert("Business ID not found");

    try {
      // 1. Main Purchase Bill save karo
      const purchasePayload = {
        business_id: activeId,
        supplier_id: selectedSupplier,
        invoice_no: invoiceNo || `PUR-${Date.now()}`, // Agar khali hai toh auto-generate
        date: date,
        sub_total: calculations.subTotal,
        tax_amount: calculations.totalTax,
        discount: calculations.flatDiscount,
        transport_charge: transportCharge,
        other_charges: otherCharges,
        grand_total: calculations.grandTotal,
        paid_amount: calculations.totalPaid,
        due_amount: calculations.dueAmount,
        cash_paid: cashPaid,
        online_paid: onlinePaid,
        notes: notes,
        is_outside_india: isOutsideIndia
      };

      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([purchasePayload])
        .select()
        .single();

      if (purchaseError) throw new Error(purchaseError.message);

      // 2. Saare Items save karo
      const purchaseItemsToInsert = items.map(item => ({
        purchase_id: purchaseData.id,
        business_id: activeId,
        product_id: item.product_id,
        qty: item.qty,
        rate: item.rate,
        tax_percentage: item.tax_percentage,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItemsToInsert);

      if (itemsError) throw new Error(itemsError.message);

      // 3. Stock Update karo (RPC Call)
      // Note: Yahan apne RPC function ke parameters apne database ke hisaab se check kar lena.
      for (const item of items) {
        const { error: rpcError } = await supabase.rpc('add_stock_movement', {
          p_product_id: item.product_id,
          p_quantity: item.qty,
          p_type: 'purchase',
          p_reference_id: purchaseData.id
        });
        
        if (rpcError) console.error("Stock update failed for item: ", item.product_name, rpcError);
      }

      // 4. Success Message aur Redirect
      alert("Purchase Saved Successfully! Stock updated & Supplier Balance added.");
      router.push('/purchases'); // Purchase list page par wapas bhej dega

    } catch (error: any) {
      alert("Error saving purchase: " + error.message);
    }
  };
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">New Purchase</h1>
        <Link href="/owner" className="text-blue-600 font-medium text-sm">← Dashboard</Link>
      </div>

      <div className="border rounded-xl p-4 space-y-4 shadow-sm">
        
        {/* SUPPLIER & OUTSIDE INDIA */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-600">Supplier</label>
            <button onClick={() => setIsSupplierModalOpen(true)} className="text-blue-600 text-sm font-semibold">+ New</button>
          </div>
          <select 
            value={selectedSupplier} 
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={isOutsideIndia} onChange={(e) => setIsOutsideIndia(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Outside India (International Supplier)</span>
          </label>
        </div>

        {/* INVOICE & DATE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Invoice No.</label>
            <input type="text" placeholder="Auto if empty" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full p-3 border rounded-lg mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded-lg mt-1" />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* ITEMS SECTION */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-md font-bold text-gray-800">Items</label>
            <div className="flex gap-2">
              <button onClick={() => setIsProductModalOpen(true)} className="text-sm bg-gray-100 px-3 py-1 rounded-md font-semibold">+ New Prod</button>
              <select onChange={(e) => handleAddItem(e.target.value)} value="" className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md font-semibold outline-none">
                <option value="">+ Add Item</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border">
              <span className="flex-1 text-sm font-medium truncate">{item.product_name}</span>
              <input type="number" value={item.qty} onChange={(e) => handleUpdateItem(index, "qty", Number(e.target.value))} className="w-16 p-1 border rounded text-center text-sm" />
              <span className="text-xs text-gray-500">x ₹</span>
              <input type="number" value={item.rate} onChange={(e) => handleUpdateItem(index, "rate", Number(e.target.value))} className="w-20 p-1 border rounded text-right text-sm" />
              <span className="text-sm font-bold w-20 text-right">₹{item.total.toFixed(2)}</span>
              <button onClick={() => handleRemoveItem(index)} className="text-red-500 font-bold px-1">×</button>
            </div>
          ))}
        </div>

        <hr className="border-gray-200" />

        {/* DISCOUNT, TRANSPORT & OTHER CHARGES */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Discount</label>
            <div className="flex gap-1 mt-1">
              <input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")} className="p-2 border rounded-lg bg-gray-50">
                <option value="flat">₹</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Transport Charge</label>
            <input type="number" value={transportCharge || ""} onChange={(e) => setTransportCharge(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" placeholder="₹" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-semibold text-gray-600">Other Charges (Packing, Loading, etc.)</label>
            <input type="number" value={otherCharges || ""} onChange={(e) => setOtherCharges(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1" placeholder="₹" />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* PAYMENT DETAILS */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Cash Amount</label>
            <input type="number" value={cashPaid || ""} onChange={(e) => setCashPaid(Number(e.target.value))} className="w-full p-3 border rounded-lg mt-1" placeholder="Cash" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Online Amount (UPI/Bank)</label>
            <input type="number" value={onlinePaid || ""} onChange={(e) => setOnlinePaid(Number(e.target.value))} className="w-full p-3 border rounded-lg mt-1" placeholder="UPI/Bank/Card" />
          </div>

          <div className={`p-4 rounded-lg flex justify-between items-center border ${calculations.dueAmount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <span className={`font-bold ${calculations.dueAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>Due Amount (Baki)</span>
            <span className={`text-xl font-bold ${calculations.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{calculations.dueAmount.toFixed(2)}</span>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-600">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 border rounded-lg mt-1" placeholder="Notes" />
          </div>
        </div>

        {/* SUMMARY CARD */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700 mt-4">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{calculations.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST {calculations.isInterState ? "(IGST)" : "(CGST+SGST)"}</span><span>₹{calculations.totalTax.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>- ₹{calculations.flatDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-black border-t pt-2 mt-2"><span>Grand Total</span><span>₹{calculations.grandTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-green-600 font-medium"><span>Cash Paid</span><span>₹{cashPaid.toFixed(2)}</span></div>
          <div className="flex justify-between text-blue-600 font-medium"><span>Online Paid</span><span>₹{onlinePaid.toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-2"><span>Total Paid</span><span>₹{calculations.totalPaid.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-black"><span>Due</span><span>₹{calculations.dueAmount.toFixed(2)}</span></div>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <button onClick={handleSavePurchase} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition">
        Save Purchase
      </button>

      {/* ================= MODALS ================= */}
      
      {/* SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto space-y-3">
            <h2 className="text-xl font-bold">Add New Supplier</h2>
            <input type="text" placeholder="Business Name *" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Owner Name" value={newSupplier.owner_name} onChange={e => setNewSupplier({...newSupplier, owner_name: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="email" placeholder="Gmail (Optional)" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="w-full p-3 border rounded-lg" />
            <select value={newSupplier.gstin} onChange={e => setNewSupplier({...newSupplier, gstin: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50">
              <option value="">Unregistered (None)</option>
              <option value="registered">Registered GSTIN</option>
            </select>
            <select value={newSupplier.state} onChange={e => setNewSupplier({...newSupplier, state: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50">
              <option value="">Select State</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
              <option value="Gujarat">Gujarat</option>
            </select>
            <input type="text" placeholder="Address" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="number" placeholder="Opening Balance (Purana Udhaar)" value={newSupplier.opening_balance || ''} onChange={e => setNewSupplier({...newSupplier, opening_balance: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />
            
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsSupplierModalOpen(false)} className="flex-1 bg-gray-200 py-3 rounded-lg font-bold text-gray-700">Cancel</button>
              <button onClick={handleSaveSupplier} className="flex-1 bg-blue-600 py-3 rounded-lg font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto space-y-3 relative">
            <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 bg-gray-100 rounded p-1 font-bold">✕</button>
            <h2 className="text-xl font-bold">Add Product</h2>
            <input type="text" placeholder="Product Name *" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="SKU" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="HSN Code" value={newProduct.hsn_code} onChange={e => setNewProduct({...newProduct, hsn_code: e.target.value})} className="w-full p-3 border rounded-lg" />
            <input type="text" placeholder="Unit (pcs, kg, etc)" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50" />
            <input type="number" placeholder="Purchase Price" value={newProduct.purchase_price || ''} onChange={e => setNewProduct({...newProduct, purchase_price: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />
            <input type="number" placeholder="Selling Price" value={newProduct.selling_price || ''} onChange={e => setNewProduct({...newProduct, selling_price: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />
            <input type="number" placeholder="Opening Stock" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />
            <input type="number" placeholder="Low Stock Limit" value={newProduct.low_stock_limit || ''} onChange={e => setNewProduct({...newProduct, low_stock_limit: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />
            <input type="number" placeholder="GST %" value={newProduct.tax_percentage || ''} onChange={e => setNewProduct({...newProduct, tax_percentage: Number(e.target.value)})} className="w-full p-3 border rounded-lg" />

            <button onClick={handleSaveProduct} className="w-full bg-green-600 py-3 rounded-lg font-bold text-white mt-2">Save Product</button>
          </div>
        </div>
      )}

    </div>
  );
}