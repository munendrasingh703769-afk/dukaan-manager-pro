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

  const [entryType, setEntryType] = useState<"PURCHASE" | "RETURN" | "DAMAGE">("PURCHASE");
  const [editPur, setEditPur] = useState<any | null>(null);
  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [supplierName, setSupplierName] = useState("");
  const [category, setCategory] = useState("Grocery / किराना");
  const [productId, setProductId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [reason, setReason] = useState("");

  const categories = ["Grocery / किराना", "Sweets & Dairy / मिठाई", "Electronics / इलेक्ट्रॉनिक्स", "Spare Parts / हार्डवेयर", "Garments / कपड़ा", "General Store / अन्य"];
  const units = ["Pcs", "Kg", "Gram", "Packet", "Box", "Litre", "Dozen"];

  const fetchData = async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true);
    const { data: prodData } = await supabase.from("products").select("*").eq("business_id", activeId).order("name");
    if (prodData) setProducts(prodData);
    const { data: purData } = await supabase.from("purchases").select("*, purchase_items(id, product_id, product_name, qty, price, total)").eq("business_id", activeId).order("created_at", { ascending: false }).limit(30);
    if (purData) setPurchases(purData);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, [activeId]);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) { setCost(String(p.purchase_price || "")); setSellPrice(String(p.selling_price || "")); }
  };
  const getPrefixType = (b: string) => b?.startsWith("RET-") ? "RETURN" : b?.startsWith("DMG-") ? "DAMAGE" : "PURCHASE";

  const startEdit = (p: any) => {
    const it = p.purchase_items?.[0];
    if (!it) return;
    setEditPur(p); setEntryType(getPrefixType(p.bill_no)); setMode("EXISTING");
    setProductId(it.product_id); setQty(String(it.qty)); setCost(String(it.price));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditPur(null); setProductId(""); setQty("1"); setCost(""); setSellPrice(""); setReason(""); };

  const handleDeletePurchase = async (p: any) => {
    if (!confirm(lang === "hi" ? "क्या आप वाकई यह एंट्री हटाना चाहते हैं? स्टॉक अपने आप एडजस्ट होगा।" : "Delete this entry? Stock will auto-adjust.")) return;
    setSaving(true);
    const pType = getPrefixType(p.bill_no);
    try {
      for (const it of p.purchase_items || []) {
        if (it.product_id) {
          const { data: fp } = await supabase.from("products").select("stock").eq("id", it.product_id).maybeSingle();
          const cur = Number(fp?.stock || 0);
          const newStk = pType === "PURCHASE" ? Math.max(0, cur - Number(it.qty || 0)) : cur + Number(it.qty || 0);
          await supabase.from("products").update({ stock: newStk }).eq("id", it.product_id);
        }
      }
      await supabase.from("purchase_items").delete().eq("purchase_id", p.id);
      await supabase.from("purchases").delete().eq("id", p.id);
      await fetchData();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = Number(qty), numCost = Number(cost || 0);
    if (!activeId || numQty <= 0) return;
    setSaving(true);
    const totalAmount = Number((numQty * numCost).toFixed(2));
    try {
      if (editPur) {
        const oldIt = editPur.purchase_items?.[0], oldQty = Number(oldIt?.qty || 0), targetId = oldIt?.product_id;
        const pType = getPrefixType(editPur.bill_no);
        await supabase.from("purchases").update({ subtotal: totalAmount, total_amount: totalAmount, paid_amount: totalAmount }).eq("id", editPur.id);
        if (oldIt?.id) await supabase.from("purchase_items").update({ qty: numQty, price: numCost, total: totalAmount }).eq("id", oldIt.id);
        if (targetId) {
          const { data: fp } = await supabase.from("products").select("stock").eq("id", targetId).maybeSingle();
          const cur = Number(fp?.stock || 0);
          const adj = pType === "PURCHASE" ? Math.max(0, cur - oldQty + numQty) : Math.max(0, cur + oldQty - numQty);
          await supabase.from("products").update({ stock: adj }).eq("id", targetId);
        }
        alert(lang === "hi" ? "✅ एंट्री और स्टॉक दोनों सुधर गए!" : "✅ Entry & Stock Updated!");
        cancelEdit(); await fetchData(); setSaving(false); return;
      }

      let targetProdId = productId, targetProdName = "";
      if (entryType === "PURCHASE" && mode === "NEW") {
        if (!newItemName.trim()) { alert(lang === "hi" ? "नए आइटम का नाम लिखें" : "Enter item name"); setSaving(false); return; }
        const cleanName = `${newItemName.trim()} (${unit})`;
        const { data: cp, error: cErr } = await supabase.from("products").insert([{ business_id: activeId, name: cleanName, category, purchase_price: numCost, selling_price: Number(sellPrice) || numCost, stock: 0, tax_percentage: 0 }]).select("id, name").single();
        if (cErr) throw cErr;
        targetProdId = cp.id; targetProdName = cp.name;
      } else {
        if (!productId) { alert(lang === "hi" ? "कृपया आइटम चुनें" : "Select a product"); setSaving(false); return; }
        targetProdName = products.find((x) => x.id === productId)?.name || "Item";
      }

      const { data: fp } = await supabase.from("products").select("stock").eq("id", targetProdId).single();
      const curStock = Number(fp?.stock || 0);
      if (entryType !== "PURCHASE" && numQty > curStock) {
        alert(lang === "hi" ? `⚠️ उपलब्ध स्टॉक (${curStock}) से ज़्यादा नहीं घटा सकते!` : `⚠️ Exceeds stock (${curStock})!`);
        setSaving(false); return;
      }

      const prefix = entryType === "RETURN" ? "RET" : entryType === "DAMAGE" ? "DMG" : "PUR";
      const tag = reason.trim() || supplierName.trim();
      const billNo = `${prefix}-${Date.now().toString().slice(-6)}${tag ? ` (${tag})` : ""}`;
      const { data: pd, error: pErr } = await supabase.from("purchases").insert([{ business_id: activeId, supplier_id: null, bill_no: billNo, purchase_date: new Date().toISOString(), subtotal: totalAmount, total_amount: totalAmount, paid_amount: totalAmount, due_amount: 0 }]).select().single();
      if (pErr) throw pErr;

      await supabase.from("purchase_items").insert([{ purchase_id: pd.id, business_id: activeId, product_id: targetProdId, product_name: targetProdName, qty: numQty, price: numCost, total: totalAmount }]);
      const updatedStock = entryType === "PURCHASE" ? curStock + numQty : Math.max(0, curStock - numQty);
      await supabase.from("products").update({ stock: updatedStock, ...(entryType === "PURCHASE" && numCost > 0 ? { purchase_price: numCost } : {}), ...(entryType === "PURCHASE" && sellPrice ? { selling_price: Number(sellPrice) } : {}) }).eq("id", targetProdId);

      alert(lang === "hi" ? `✅ रिकॉर्ड सेव! नया स्टॉक: ${updatedStock}` : `✅ Recorded! Stock: ${updatedStock}`);
      setProductId(""); setNewItemName(""); setQty("1"); setCost(""); setSellPrice(""); setReason("");
      await fetchData();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">{lang === "hi" ? "स्टॉक खाता लोड हो रहा है..." : "Loading Stock Ledger..."}</div>;
  const lowStockItems = products.filter((x) => Number(x.stock || 0) <= 5);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-extrabold text-gray-800">{lang === "hi" ? "📦 खरीद, वापसी व खराब माल" : "Purchase, Return & Damage"}</h1>
          <p className="text-xs text-gray-500">{lang === "hi" ? "Stock In (+), Return (-) व Damage (-)" : "All Stock In, Return & Wastage"}</p>
        </div>
        <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full">{lang === "hi" ? "English" : "हिंदी"}</button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
          <p className="text-xs font-extrabold text-amber-800 mb-1">{lang === "hi" ? `🔔 कम स्टॉक चेतावनी (${lowStockItems.length}):` : `🔔 Low Stock (${lowStockItems.length}):`}</p>
          <div className="flex flex-wrap gap-1.5">
            {lowStockItems.slice(0, 6).map((item) => (
              <span key={item.id} onClick={() => { setEntryType("PURCHASE"); setMode("EXISTING"); handleProductChange(item.id); }} className="text-[11px] bg-white border border-amber-300 px-2 py-0.5 rounded-lg font-bold text-amber-900 cursor-pointer">{item.name}: {item.stock}</span>
            ))}
          </div>
        </div>
      )}

      {!editPur && (
        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl shadow-sm border">
          <button type="button" onClick={() => { setEntryType("PURCHASE"); setProductId(""); }} className={`py-2.5 rounded-xl text-xs font-extrabold ${entryType === "PURCHASE" ? "bg-blue-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "📥 खरीद (+)" : "📥 Purchase (+)"}</button>
          <button type="button" onClick={() => { setEntryType("RETURN"); setMode("EXISTING"); setProductId(""); }} className={`py-2.5 rounded-xl text-xs font-extrabold ${entryType === "RETURN" ? "bg-amber-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "↩️ वापसी (-)" : "↩️ Return (-)"}</button>
          <button type="button" onClick={() => { setEntryType("DAMAGE"); setMode("EXISTING"); setProductId(""); }} className={`py-2.5 rounded-xl text-xs font-extrabold ${entryType === "DAMAGE" ? "bg-rose-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "⚠️ खराब (-)" : "⚠️ Damage (-)"}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className={`p-5 rounded-2xl shadow-sm border-2 space-y-3.5 ${editPur ? "bg-amber-50 border-amber-400" : "bg-white border-gray-100"}`}>
          {editPur ? (
            <div className="flex justify-between items-center bg-amber-100 px-3 py-2 rounded-xl text-xs font-bold text-amber-900">
              <span>✏️ {lang === "hi" ? `सुधार: ${editPur.bill_no}` : `Edit: ${editPur.bill_no}`}</span>
              <button type="button" onClick={cancelEdit} className="text-red-600 underline">{lang === "hi" ? "रद्द" : "Cancel"}</button>
            </div>
          ) : entryType === "PURCHASE" && (
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setMode("EXISTING")} className={`py-2 rounded-lg text-xs font-bold ${mode === "EXISTING" ? "bg-blue-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "📋 पुराना आइटम" : "📋 Existing"}</button>
              <button type="button" onClick={() => setMode("NEW")} className={`py-2 rounded-lg text-xs font-bold ${mode === "NEW" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "➕ नया आइटम" : "➕ New Item"}</button>
            </div>
          )}

          {!editPur && entryType === "PURCHASE" && (
            <>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm bg-white">{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input type="text" placeholder={lang === "hi" ? "सप्लायर का नाम (वैकल्पिक)" : "Supplier Name (Optional)"} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm bg-white" />
            </>
          )}

          {entryType === "PURCHASE" && mode === "NEW" && !editPur ? (
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder={lang === "hi" ? "नया आइटम नाम *" : "Item Name *"} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="col-span-2 p-2.5 border rounded-xl text-sm bg-white" required />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="p-2.5 border rounded-xl text-sm bg-white">{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
            </div>
          ) : (
            <select value={productId} onChange={(e) => handleProductChange(e.target.value)} disabled={!!editPur} className="w-full p-2.5 border rounded-xl text-sm bg-white disabled:bg-slate-100" required>
              <option value="">{lang === "hi" ? "-- सामान चुनें --" : "-- Choose Product --"}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({lang === "hi" ? "स्टॉक" : "Stock"}: {p.stock})</option>)}
            </select>
          )}

          {entryType !== "PURCHASE" && !editPur && (
            <input type="text" placeholder={lang === "hi" ? "कारण लिखें (Expired / टूटा / वापसी)" : "Reason (Expired / Broken / Return)"} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm bg-white" />
          )}

          <div className="grid grid-cols-3 gap-2">
            <input type="number" step="any" min="0.01" placeholder="Qty *" value={qty} onChange={(e) => setQty(e.target.value)} className="p-2.5 border rounded-xl text-sm bg-white" required />
            <input type="number" step="any" min="0" placeholder={lang === "hi" ? "रेट ₹ *" : "Rate ₹ *"} value={cost} onChange={(e) => setCost(e.target.value)} className="p-2.5 border rounded-xl text-sm bg-white" required />
            {entryType === "PURCHASE" && <input type="number" step="any" min="0" placeholder={lang === "hi" ? "बिक्री ₹" : "Sell ₹"} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="p-2.5 border rounded-xl text-sm bg-white" />}
          </div>

          <div className="bg-slate-100 p-3 rounded-xl flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">{lang === "hi" ? "कुल वैल्यू:" : "Total Value:"}</span>
            <span className="text-base font-extrabold text-slate-900">₹{(Number(qty || 0) * Number(cost || 0)).toFixed(2)}</span>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm disabled:opacity-50">{saving ? (lang === "hi" ? "सेव हो रहा है..." : "Saving...") : (lang === "hi" ? "✅ रिकॉर्ड सेव करें" : "✅ Save Record")}</button>
        </form>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-extrabold text-gray-800 mb-3 border-b pb-2">{lang === "hi" ? `📜 स्टॉक इतिहास (${purchases.length})` : `📜 Stock History (${purchases.length})`}</h2>
          {purchases.length === 0 ? <p className="text-xs text-gray-400 text-center py-10">{lang === "hi" ? "कोई रिकॉर्ड नहीं है" : "No records yet"}</p> : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {purchases.map((p) => {
                const pType = getPrefixType(p.bill_no);
                return (
                  <div key={p.id} className="p-3 rounded-xl border bg-slate-50 flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white ${pType === "DAMAGE" ? "bg-rose-600" : pType === "RETURN" ? "bg-amber-600" : "bg-blue-600"}`}>{pType}</span>
                      <p className="font-bold text-gray-800 text-xs mt-1">{p.bill_no}</p>
                      {p.purchase_items?.map((it: any, idx: number) => <p key={idx} className="text-xs text-slate-800 font-semibold mt-0.5">• {it.product_name}: {pType === "PURCHASE" ? `+${it.qty}` : `-${it.qty}`} × ₹{it.price}</p>)}
                      <p className="text-[11px] text-gray-400 mt-1">{new Date(p.purchase_date || p.created_at).toLocaleString("en-IN")}</p>
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => startEdit(p)} className="text-[11px] bg-white text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-300">✏️ Edit</button>
                        <button type="button" onClick={() => handleDeletePurchase(p)} className="text-[11px] bg-white text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-300">🗑️ Delete</button>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-emerald-700">₹{p.total_amount}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
