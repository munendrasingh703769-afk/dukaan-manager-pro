"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentBusinessId } from "@/lib/business";

export default function ProviderPurchasesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [supplierName, setSupplierName] = useState("");
  const [category, setCategory] = useState("Grocery / किराना");
  const [productId, setProductId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const categories = ["Grocery / किराना", "Sweets & Dairy / मिठाई", "Electronics / इलेक्ट्रॉनिक्स", "Spare Parts / हार्डवेयर", "Garments / कपड़ा", "General Store / अन्य"];
  const units = ["Pcs", "Kg", "Gram", "Packet", "Box", "Litre", "Dozen"];

  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);
    const { data: prodData } = await supabase.from("products").select("*").eq("business_id", activeId).order("name");
    if (prodData) setProducts(prodData);

    const { data: purData } = await supabase
      .from("purchases")
      .select("*, purchase_items(product_name, qty, price, total)")
      .eq("business_id", activeId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (purData) setPurchases(purData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setCost(String(p.purchase_price || ""));
      setSellPrice(String(p.selling_price || ""));
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(qty);
    const numCost = Number(cost);
    if (!activeId || numQty <= 0 || numCost < 0) {
      alert(lang === "hi" ? "कृपया सही मात्रा और खरीद रेट डालें" : "Please enter valid quantity and cost price");
      return;
    }
    if (mode === "EXISTING" && !productId) {
      alert(lang === "hi" ? "कृपया लिस्ट से आइटम चुनें" : "Please select a product");
      return;
    }
    if (mode === "NEW" && !newItemName.trim()) {
      alert(lang === "hi" ? "कृपया नए आइटम का नाम लिखें" : "Please enter new item name");
      return;
    }

    setSaving(true);
    const totalAmount = Number((numQty * numCost).toFixed(2));
    try {
      let targetProdId = productId;
      let targetProdName = "";

      if (mode === "NEW") {
        const cleanName = `${newItemName.trim()} (${unit})`;
        const { data: createdProd, error: cErr } = await supabase.from("products").insert([{
          business_id: activeId,
          name: cleanName,
          category,
          purchase_price: numCost,
          selling_price: Number(sellPrice) || numCost,
          stock: 0,
          tax_percentage: 0
        }]).select("id, name").single();
        if (cErr) throw cErr;
        targetProdId = createdProd.id;
        targetProdName = createdProd.name;
      } else {
        const found = products.find((x) => x.id === productId);
        targetProdName = found?.name || "Item";
      }

      const { data: purchaseData, error: purError } = await supabase.from("purchases").insert([{
        business_id: activeId,
        supplier_id: null,
        bill_no: `PUR-${Date.now().toString().slice(-6)}${supplierName ? ` (${supplierName.trim()})` : ""}`,
        purchase_date: new Date().toISOString(),
        subtotal: totalAmount,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        due_amount: 0
      }]).select().single();
      if (purError) throw purError;

      const { error: itemError } = await supabase.from("purchase_items").insert([{
        purchase_id: purchaseData.id,
        business_id: activeId,
        product_id: targetProdId,
        product_name: targetProdName,
        qty: numQty,
        price: numCost,
        total: totalAmount
      }]);
      if (itemError) throw itemError;

      // Fresh stock read from DB to prevent any calculation mismatch
      const { data: freshProd } = await supabase.from("products").select("stock").eq("id", targetProdId).single();
      const updatedStock = Number(freshProd?.stock || 0) + numQty;
      await supabase.from("products").update({
        stock: updatedStock,
        purchase_price: numCost,
        ...(sellPrice ? { selling_price: Number(sellPrice) } : {})
      }).eq("id", targetProdId);

      alert(lang === "hi" ? `✅ खरीद दर्ज हो गई! नया स्टॉक: ${updatedStock}` : `✅ Purchase Recorded! Updated Stock: ${updatedStock}`);
      setProductId(""); setNewItemName(""); setQty("1"); setCost(""); setSellPrice("");
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">{lang === "hi" ? "खरीद खाता लोड हो रहा है..." : "Loading Purchases..."}</div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-20">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-extrabold text-gray-800">{lang === "hi" ? "📦 माल खरीद व स्टॉक एंट्री" : "Purchases (Stock In)"}</h1>
          <p className="text-xs text-gray-500">{lang === "hi" ? "किराना, मिठाई, इलेक्ट्रॉनिक्स व सभी सामान का स्टॉक जोड़ें" : "Grocery, Sweets, Electronics & All Stock In"}</p>
        </div>
        <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full">
          {lang === "hi" ? "English" : "हिंदी"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form onSubmit={handleAddPurchase} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3.5">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setMode("EXISTING")} className={`py-2 rounded-lg text-xs font-bold ${mode === "EXISTING" ? "bg-blue-600 text-white" : "text-slate-600"}`}>
              {lang === "hi" ? "📋 पुराना आइटम चुनें" : "📋 Existing Item"}
            </button>
            <button type="button" onClick={() => setMode("NEW")} className={`py-2 rounded-lg text-xs font-bold ${mode === "NEW" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
              {lang === "hi" ? "➕ नया आइटम जोड़ें" : "➕ Add New Item"}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "व्यापार कैटेगरी (Business Type)" : "Business Category"}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm bg-white">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "सप्लायर / थोक व्यापारी का नाम (वैकल्पिक)" : "Supplier Name (Optional)"}</label>
            <input type="text" placeholder={lang === "hi" ? "जैसे: शर्मा किराना / वर्मा इलेक्ट्रॉनिक्स" : "e.g. Sharma Wholesale"} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm" />
          </div>

          {mode === "EXISTING" ? (
            <div>
              <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "सामान चुनें *" : "Select Product *"}</label>
              <select value={productId} onChange={(e) => handleProductChange(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm bg-white" required>
                <option value="">{lang === "hi" ? "-- आइटम चुनें --" : "-- Choose Product --"}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({lang === "hi" ? "बचा स्टॉक" : "Stock"}: {p.stock})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "नए सामान का नाम *" : "New Item Name *"}</label>
                <input type="text" placeholder={lang === "hi" ? "जैसे: काजू कतली / चीनी / LED बल्ब" : "e.g. Sugar / Kaju Katli"} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm" required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "इकाई (Unit)" : "Unit"}</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm bg-white">
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "मात्रा (Qty) *" : "Quantity *"}</label>
              <input type="number" step="any" min="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "खरीद रेट (₹) *" : "Buy Rate (₹) *"}</label>
              <input type="number" step="any" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">{lang === "hi" ? "बिक्री रेट (₹)" : "Sell Rate (₹)"}</label>
              <input type="number" step="any" min="0" placeholder="Optional" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="w-full p-2.5 border rounded-xl mt-1 text-sm" />
            </div>
          </div>

          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">{lang === "hi" ? "कुल खरीद रकम:" : "Total Purchase Amount:"}</span>
            <span className="text-lg font-extrabold text-blue-700">₹{(Number(qty || 0) * Number(cost || 0)).toFixed(2)}</span>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm disabled:opacity-50">
            {saving ? (lang === "hi" ? "सेव हो रहा है..." : "Saving...") : (lang === "hi" ? "✅ खरीद दर्ज करें और स्टॉक बढ़ाएं" : "✅ Record Purchase & Add Stock")}
          </button>
        </form>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-extrabold text-gray-800 mb-3 border-b pb-2">
            {lang === "hi" ? `📜 खरीद इतिहास (${purchases.length})` : `📜 Purchase History (${purchases.length})`}
          </h2>
          {purchases.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">{lang === "hi" ? "अभी तक कोई खरीद रिकॉर्ड नहीं है" : "No recent purchases"}</p>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
              {purchases.map((p) => (
                <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800 text-xs">{p.bill_no}</p>
                    {p.purchase_items?.map((it: any, idx: number) => (
                      <p key={idx} className="text-xs text-blue-700 font-semibold mt-0.5">
                        • {it.product_name}: {it.qty} × ₹{it.price}
                      </p>
                    ))}
                    <p className="text-[11px] text-gray-400 mt-1">{new Date(p.purchase_date || p.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <span className="font-extrabold text-sm text-emerald-700">₹{p.total_amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}