"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/business";

function numberToWords(num: number): string {
  const n = Math.round(num);
  if (n === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const conv = (x: number): string => {
    if (x < 20) return a[x];
    if (x < 100) return b[Math.floor(x / 10)] + (x % 10 ? " " + a[x % 10] : "");
    if (x < 1000) return a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + conv(x % 100) : "");
    if (x < 100000) return conv(Math.floor(x / 1000)) + " Thousand" + (x % 1000 ? " " + conv(x % 1000) : "");
    if (x < 10000000) return conv(Math.floor(x / 100000)) + " Lakh" + (x % 100000 ? " " + conv(x % 100000) : "");
    return String(x);
  };
  return "INR " + conv(n) + " Rupees Only";
}

export default function ProviderSalesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const [biz, setBiz] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isGstBill, setIsGstBill] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountVal, setDiscountVal] = useState("");
  const [cashPaid, setCashPaid] = useState("");
  const [onlinePaid, setOnlinePaid] = useState("");

  const [srvName, setSrvName] = useState("");
  const [srvPrice, setSrvPrice] = useState("");
  const [srvGst, setSrvGst] = useState("18");

  const [cart, setCart] = useState<any[]>([]);
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null);

  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);
    const { data: bData } = await supabase.from("businesses").select("*").eq("id", activeId).maybeSingle();
    if (bData) setBiz(bData);
    const { data: pData } = await supabase.from("products").select("*").eq("business_id", activeId).gt("stock", 0).order("name");
    if (pData) setProducts(pData);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, [activeId]);

  const addProductToCart = (p: any) => {
    const ex = cart.find((x) => x.id === p.id && !x.isService);
    if (ex) {
      if (ex.qty + 1 > Number(p.stock)) return alert(`⚠️ केवल ${p.stock} स्टॉक उपलब्ध है!`);
      setCart(cart.map((x) => (x.id === p.id && !x.isService ? { ...x, qty: x.qty + 1 } : x)));
    } else {
      setCart([...cart, { id: p.id, name: p.name, hsn: p.hsn_code || "8517", price: Number(p.selling_price), gst: Number(p.tax_percentage || 18), qty: 1, maxStock: Number(p.stock), isService: false }]);
    }
  };

  const addServiceToCart = () => {
    if (!srvName.trim() || !srvPrice) return alert("सर्विस का नाम और चार्ज डालें");
    setCart([...cart, { id: "SRV-" + Date.now(), name: srvName.trim(), hsn: "9987", price: Number(srvPrice), gst: Number(srvGst), qty: 1, maxStock: 9999, isService: true }]);
    setSrvName(""); setSrvPrice("");
  };

  const updateQty = (id: string, q: number) => {
    if (q < 1) return setCart(cart.filter((x) => x.id !== id));
    const item = cart.find((x) => x.id === id);
    if (item && !item.isService && q > item.maxStock) return alert(`⚠️ केवल ${item.maxStock} स्टॉक उपलब्ध है!`);
    setCart(cart.map((x) => (x.id === id ? { ...x, qty: q } : x)));
  };

  const rawSubTotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const discountAmount = discountVal ? (discountType === "PERCENT" ? (rawSubTotal * Number(discountVal)) / 100 : Number(discountVal)) : 0;
  const taxableTotal = Math.max(0, rawSubTotal - discountAmount);
  const discountRatio = rawSubTotal > 0 ? taxableTotal / rawSubTotal : 1;
  const totalGst = isGstBill ? cart.reduce((s, x) => s + x.price * x.qty * discountRatio * (x.gst / 100), 0) : 0;
  const grandTotal = Number((taxableTotal + totalGst).toFixed(2));
  const totalPaid = Number(cashPaid || 0) + Number(onlinePaid || 0);
  const dueAmount = Math.max(0, Number((grandTotal - totalPaid).toFixed(2)));

  const handleSaveSale = async () => {
    if (cart.length === 0) return alert("बिल में कम से कम 1 आइटम या सर्विस जोड़ें!");
    if (dueAmount > 0 && !customerPhone.trim()) return alert("उधार/बकाया बिल के लिए ग्राहक का मोबाइल नंबर ज़रूरी है!");
    if (!activeId) return;
    setSaving(true);
    try {
      const invNo = `INV-${Date.now().toString().slice(-6)}`;
      const saleDate = new Date().toISOString();
      const { data: saleData, error: sErr } = await supabase.from("sales").insert([{
        business_id: activeId, customer_name: customerName.trim() || "Walk-in Customer", customer_phone: customerPhone.trim(),
        invoice_no: invNo, sale_date: saleDate, subtotal: taxableTotal, total_gst: totalGst,
        total_amount: grandTotal, paid_amount: totalPaid, due_amount: dueAmount,
        cash_amount: Number(cashPaid || 0), online_amount: Number(onlinePaid || 0),
        payment_method: totalPaid >= grandTotal ? "paid" : totalPaid > 0 ? "split" : "unpaid", status: "completed"
      }]).select().single();
      if (sErr) throw sErr;

      const saleItems = cart.map((x) => {
        const itemTaxable = x.price * x.qty * discountRatio;
        const itemTax = isGstBill ? itemTaxable * (x.gst / 100) : 0;
        return {
          sale_id: saleData.id, business_id: activeId, product_id: x.isService ? null : x.id,
          product_name: x.name, qty: x.qty, price: x.price, gst_percent: isGstBill ? x.gst : 0,
          total: Number((itemTaxable + itemTax).toFixed(2))
        };
      });
      await supabase.from("sale_items").insert(saleItems);

      // Auto-deduct fresh stock from DB for physical products
      for (const x of cart) {
        if (!x.isService) {
          const { data: fp } = await supabase.from("products").select("stock").eq("id", x.id).single();
          const newStk = Math.max(0, Number(fp?.stock || 0) - x.qty);
          await supabase.from("products").update({ stock: newStk }).eq("id", x.id);
        }
      }

      setGeneratedInvoice({
        invNo, saleDate, isGstBill, customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim(), customerAddress: customerAddress.trim(),
        items: cart, rawSubTotal, discountAmount, taxableTotal, totalGst, grandTotal, totalPaid, dueAmount, discountRatio
      });
      setCart([]); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setDiscountVal(""); setCashPaid(""); setOnlinePaid("");
      await fetchData();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Billing System...</div>;

  if (generatedInvoice) {
    const inv = generatedInvoice;
    const upiId = biz?.upi_id || "vyapaarsetu@upi";
    const qrUrl = `https://qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${biz?.name || "Store"}&am=${inv.grandTotal}&cu=INR`)}`;//qrserver.com{encodeURIComponent(`upi://pay?pa=${upiId}&pn=${biz?.name || "Store"}&am=${inv.grandTotal}&cu=INR`)}`;
    return (
      <div className="max-w-3xl mx-auto pb-20 space-y-4">
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border print:hidden">
          <button onClick={() => setGeneratedInvoice(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">← नया बिल बनाएं</button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold">🖨️ Print / Save PDF</button>
            {inv.customerPhone && (
              <a href={`https://wa.me{inv.customerPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`*${biz?.name || "VyapaarSetu"} - ${inv.isGstBill ? "TAX INVOICE" : "BILL"}*\nInvoice: ${inv.invNo}\nCustomer: ${inv.customerName}\nTotal: ₹${inv.grandTotal}\nPaid: ₹${inv.totalPaid} | Due: ₹${inv.dueAmount}\nThank you!`)}`} target="_blank" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">📲 WhatsApp</a>
            )}
          </div>
        </div>

        <div id="printable-invoice" className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm text-slate-900 text-xs">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
            <div>
              <p className="text-sm font-extrabold text-blue-800 uppercase">{inv.isGstBill ? "TAX INVOICE" : "BILL OF SUPPLY (NON-GST)"}</p>
              <h1 className="text-lg font-black mt-0.5">{biz?.name || "VyapaarSetu Business"}</h1>
              {biz?.gstin && <p className="font-bold">GSTIN: {biz.gstin}</p>}
              <p className="text-slate-600 max-w-xs">{biz?.address || "Bareilly, Uttar Pradesh"}</p>
              <p className="text-slate-600">Mobile: {biz?.phone || "-"} | Email: {biz?.email || "-"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold border px-2 py-0.5 rounded uppercase">Original For Recipient</span>
              <p className="font-extrabold text-sm mt-2">Invoice #: {inv.invNo}</p>
              <p>Date: {new Date(inv.saleDate).toLocaleDateString("en-IN")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-300">
            <div>
              <p className="font-bold text-slate-500">Customer Details:</p>
              <p className="font-extrabold text-sm">{inv.customerName}</p>
              {inv.customerPhone && <p>Ph: {inv.customerPhone}</p>}
              {inv.customerAddress && <p>{inv.customerAddress}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-500">Payment Summary:</p>
              <p>Paid: <span className="font-bold text-emerald-700">₹{inv.totalPaid.toFixed(2)}</span></p>
              <p>Balance Due: <span className="font-bold text-rose-600">₹{inv.dueAmount.toFixed(2)}</span></p>
            </div>
          </div>

          <table className="w-full border-collapse my-3 text-left">
            <thead>
              <tr className="border-y-2 border-slate-800 bg-slate-100 text-[11px]">
                <th className="py-1.5 px-1">#</th>
                <th className="py-1.5 px-1">Item / Service</th>
                <th className="py-1.5 px-1 text-right">Rate</th>
                <th className="py-1.5 px-1 text-right">Qty</th>
                <th className="py-1.5 px-1 text-right">Taxable</th>
                {inv.isGstBill && <th className="py-1.5 px-1 text-right">GST</th>}
                <th className="py-1.5 px-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it: any, idx: number) => {
                const txVal = it.price * it.qty * inv.discountRatio;
                const txAmt = inv.isGstBill ? txVal * (it.gst / 100) : 0;
                return (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-1.5 px-1">{idx + 1}</td>
                    <td className="py-1.5 px-1 font-bold">{it.name}<span className="block text-[10px] font-normal text-slate-500">HSN/SAC: {it.hsn}</span></td>
                    <td className="py-1.5 px-1 text-right">₹{it.price.toFixed(2)}</td>
                    <td className="py-1.5 px-1 text-right">{it.qty}</td>
                    <td className="py-1.5 px-1 text-right">₹{txVal.toFixed(2)}</td>
                    {inv.isGstBill && <td className="py-1.5 px-1 text-right">₹{txAmt.toFixed(2)} ({it.gst}%)</td>}
                    <td className="py-1.5 px-1 text-right font-bold">₹{(txVal + txAmt).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-start border-t-2 border-slate-800 pt-2">
            <div className="max-w-[55%]">
              <p className="text-[11px] font-bold">Total amount (in words):</p>
              <p className="italic text-slate-700">{numberToWords(inv.grandTotal)}</p>
            </div>
            <div className="text-right space-y-0.5">
              <p>Subtotal: ₹{inv.rawSubTotal.toFixed(2)}</p>
              {inv.discountAmount > 0 && <p className="text-emerald-700">Discount: - ₹{inv.discountAmount.toFixed(2)}</p>}
              {inv.isGstBill && <p>Total GST: ₹{inv.totalGst.toFixed(2)}</p>}
              <p className="text-base font-black border-t border-slate-400 pt-1">Total: ₹{inv.grandTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-300 items-center">
            <div>
              <p className="font-bold mb-1">Pay using UPI:</p>
              <img src={qrUrl} alt="UPI QR" className="w-24 h-24 border p-1 rounded" />
            </div>
            <div>
              <p className="font-bold">Bank Details:</p>
              <p>Bank: {biz?.bank_name || "HDFC / SBI"}</p>
              <p>A/c #: {biz?.account_no || "Update in Profile"}</p>
              <p>IFSC: {biz?.ifsc_code || "-"}</p>
            </div>
            <div className="text-right self-end">
              <p className="font-bold mb-6">For {biz?.name || "Business"}</p>
              <p className="border-t border-slate-400 inline-block pt-1 font-bold">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t text-[10px] text-slate-500">
            <p className="font-bold text-slate-700">Terms and Conditions:</p>
            <p>1. Goods once sold cannot be taken back or exchanged. 2. Subject to local jurisdiction.</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredProds = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24">
      <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">🧾 GST / Non-GST Billing & Tax Invoice</h1>
          <p className="text-xs text-slate-500">Products + Services + Auto Stock Deduction + Discount</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => setIsGstBill(true)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${isGstBill ? "bg-blue-600 text-white" : "text-slate-600"}`}>GST Invoice</button>
          <button type="button" onClick={() => setIsGstBill(false)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${!isGstBill ? "bg-emerald-600 text-white" : "text-slate-600"}`}>Non-GST Bill</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2.5">
            <h2 className="text-xs font-extrabold text-blue-700 uppercase">🛠️ Add Service / Labour Charge</h2>
            <div className="grid grid-cols-4 gap-2">
              <input placeholder="Service Name (e.g. AC Repair)" value={srvName} onChange={(e) => setSrvName(e.target.value)} className="col-span-2 p-2 border rounded-xl text-xs" />
              <input type="number" placeholder="Charge ₹" value={srvPrice} onChange={(e) => setSrvPrice(e.target.value)} className="p-2 border rounded-xl text-xs" />
              {isGstBill ? (
                <select value={srvGst} onChange={(e) => setSrvGst(e.target.value)} className="p-2 border rounded-xl text-xs bg-white">
                  <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                </select>
              ) : (
                <button type="button" onClick={addServiceToCart} className="bg-blue-600 text-white rounded-xl text-xs font-bold">+ Add</button>
              )}
            </div>
            {isGstBill && <button type="button" onClick={addServiceToCart} className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">+ बिल में सर्विस जोड़ें</button>}
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase">📦 Select Stock Products</h2>
              <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-1.5 border rounded-lg text-xs w-32" />
            </div>
            {filteredProds.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">स्टॉक में कोई प्रोडक्ट नहीं है। पहले Purchases से स्टॉक जोड़ें।</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredProds.map((p) => (
                  <div key={p.id} onClick={() => addProductToCart(p)} className="p-2.5 border rounded-xl hover:border-blue-500 cursor-pointer bg-slate-50">
                    <p className="font-bold text-xs text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-[10px] text-slate-500">Stock: {p.stock} {isGstBill ? `• GST ${p.tax_percentage || 18}%` : ""}</p>
                    <p className="font-extrabold text-xs text-blue-600 mt-1">₹{p.selling_price}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800 border-b pb-2">Current Bill ({cart.length} items)</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">ऊपर से सर्विस या प्रोडक्ट चुनें</p> : cart.map((c) => (
              <div key={c.id} className="flex justify-between items-center border-b pb-1.5 text-xs">
                <div>
                  <p className="font-bold">{c.name} {c.isService && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Service</span>}</p>
                  <p className="text-slate-500">₹{c.price} × {c.qty} {isGstBill ? `(+${c.gst}% GST)` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => updateQty(c.id, c.qty - 1)} className="w-6 h-6 bg-slate-100 rounded font-bold">-</button>
                  <span className="font-bold w-4 text-center">{c.qty}</span>
                  <button type="button" onClick={() => updateQty(c.id, c.qty + 1)} className="w-6 h-6 bg-slate-100 rounded font-bold">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="p-2 border rounded-xl text-xs" />
            <input placeholder="Phone *" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="p-2 border rounded-xl text-xs" />
          </div>
          <input placeholder="Billing Address (Optional)" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full p-2 border rounded-xl text-xs" />

          <div className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-2 rounded-xl">
            <span className="text-xs font-bold text-slate-700">Discount:</span>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="p-1.5 border rounded-lg text-xs bg-white">
              <option value="FLAT">₹ Flat</option><option value="PERCENT">% Percent</option>
            </select>
            <input type="number" placeholder="0" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)} className="p-1.5 border rounded-lg text-xs bg-white" />
          </div>

          <div className="text-xs space-y-1 border-t pt-2">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{rawSubTotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount:</span><span>- ₹{discountAmount.toFixed(2)}</span></div>}
            {isGstBill && <div className="flex justify-between"><span>GST:</span><span>₹{totalGst.toFixed(2)}</span></div>}
            <div className="flex justify-between text-base font-black border-t pt-1"><span>Grand Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Cash Paid ₹" value={cashPaid} onChange={(e) => setCashPaid(e.target.value)} className="p-2 border rounded-xl text-xs" />
            <input type="number" placeholder="Online / UPI Paid ₹" value={onlinePaid} onChange={(e) => setOnlinePaid(e.target.value)} className="p-2 border rounded-xl text-xs" />
          </div>
          {dueAmount > 0 && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl">Balance Due (उधार): ₹{dueAmount.toFixed(2)}</p>}

          <button type="button" onClick={handleSaveSale} disabled={saving || cart.length === 0} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-extrabold text-sm shadow-sm disabled:opacity-50">
            {saving ? "Generating Invoice..." : "✅ Generate Tax Invoice & Deduct Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}