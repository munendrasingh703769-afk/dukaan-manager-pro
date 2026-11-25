"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ManufacturerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [tab, setTab] = useState<"PRODUCTS" | "ORDERS" | "SERVICE">("PRODUCTS");
  const [biz, setBiz] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulk Product Form
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Grocery & Food / खाद्य सामग्री");
  const [pUnit, setPUnit] = useState("Carton / पेटी");
  const [factoryPrice, setFactoryPrice] = useState("");
  const [minBulkQty, setMinBulkQty] = useState("50");
  const [stockQty, setStockQty] = useState("500");

  // Book Provider Service Form
  const [selectedProvId, setSelectedProvId] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceDate, setServiceDate] = useState("");

  const loadManufacturerData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    let { data: mBiz } = await supabase.from("businesses").select("*").eq("owner_id", user.id).eq("business_type", "manufacturer").maybeSingle();
    if (!mBiz) {
      const { data: anyBiz } = await supabase.from("businesses").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
      if (anyBiz) {
        mBiz = anyBiz;
      } else {
        const { data: created } = await supabase.from("businesses").insert([{
          owner_id: user.id, name: user.user_metadata?.full_name ? `${user.user_metadata.full_name} Manufacturing` : "Manufacturing Unit",
          business_type: "manufacturer", email: user.email, city: "Bareilly"
        }]).select().single();
        mBiz = created;
      }
    }
    setBiz(mBiz);

    if (mBiz?.id) {
      const { data: pList } = await supabase.from("products").select("*").eq("business_id", mBiz.id).order("created_at", { ascending: false });
      if (pList) setProducts(pList);

      const { data: oList } = await supabase.from("b2b_orders").select("*").eq("seller_business_id", mBiz.id).order("created_at", { ascending: false });
      if (oList) setOrders(oList);
    }

    const { data: provList } = await supabase.from("businesses").select("id, name, phone, area_locality, colony, city, is_online").neq("business_type", "manufacturer").limit(30);
    if (provList) setProviders(provList);
    setLoading(false);
  };

  useEffect(() => { loadManufacturerData(); }, []);

  const handleAddBulkProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz?.id || !pName.trim() || !factoryPrice) return;
    setSaving(true);
    try {
      const fPrice = Number(factoryPrice);
      const { error } = await supabase.from("products").insert([{
        business_id: biz.id,
        name: `${pName.trim()} (${pUnit})`,
        category: pCategory,
        purchase_price: fPrice,
        factory_price: fPrice,
        min_bulk_qty: Number(minBulkQty) || 50,
        wholesale_price: Math.round(fPrice * 1.12),
        selling_price: Math.round(fPrice * 1.25),
        stock: Number(stockQty) || 100,
        show_in_b2b: true,
        show_to_customer: false
      }]);
      if (error) throw error;
      alert(lang === "hi" ? "✅ फैक्ट्री बल्क प्रोडक्ट लिस्ट हो गया (केवल Wholesaler/Owner को दिखेगा)!" : "✅ Factory Bulk Product Listed!");
      setPName(""); setFactoryPrice("");
      await loadManufacturerData();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("b2b_orders").update({ status }).eq("id", orderId);
    await loadManufacturerData();
  };

  const handleBookProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvId || !serviceDesc.trim()) return alert("प्रोवाइडर और काम का विवरण चुनें");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("bookings").insert([{
        business_id: selectedProvId,
        customer_id: user?.id,
        customer_name: `${biz?.name || "Factory"} (Manufacturer)`,
        customer_phone: biz?.phone || "",
        service_name: `Factory Service: ${serviceDesc.trim()}`,
        booking_date: serviceDate || new Date().toISOString().slice(0, 10),
        status: "pending",
        total_amount: 0
      }]);
      await supabase.from("notifications").insert([{
        business_id: selectedProvId,
        title: "🏭 Factory Service Request",
        message: `${biz?.name || "Manufacturing Unit"} ने सर्विस बुक की है: ${serviceDesc.trim()}`
      }]);
      alert(lang === "hi" ? "✅ सर्विस प्रोवाइडर को बुकिंग और नोटिफिकेशन भेज दिया गया!" : "✅ Service Booked & Provider Notified!");
      setServiceDesc(""); setSelectedProvId("");
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-indigo-700">Loading Manufacturing Hub...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase">🏭 Manufacturing Unit</span>
            <h1 className="text-lg font-black mt-1">{biz?.name || "Manufacturing Dashboard"}</h1>
            <p className="text-[11px] text-slate-300">{biz?.area_locality || biz?.city || "B2B Factory Hub"} • Private Factory Pricing</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1.5 bg-white/15 rounded-full text-xs font-bold">{lang === "hi" ? "English" : "हिंदी"}</button>
            <Link href="/owner" className="px-3 py-1.5 bg-emerald-600 rounded-full text-xs font-bold">Owner Hub</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border shadow-sm">
            <p className="text-[11px] text-slate-500 font-bold">{lang === "hi" ? "बल्क प्रोडक्ट्स" : "Bulk Products"}</p>
            <p className="text-xl font-black text-indigo-700">{products.length}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border shadow-sm">
            <p className="text-[11px] text-slate-500 font-bold">{lang === "hi" ? "थोक ऑर्डर" : "Wholesaler Orders"}</p>
            <p className="text-xl font-black text-emerald-700">{orders.length}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border shadow-sm">
            <p className="text-[11px] text-slate-500 font-bold">{lang === "hi" ? "उपलब्ध प्रोवाइडर" : "Service Providers"}</p>
            <p className="text-xl font-black text-amber-600">{providers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl shadow-sm border">
          <button onClick={() => setTab("PRODUCTS")} className={`py-2.5 rounded-xl text-xs font-extrabold ${tab === "PRODUCTS" ? "bg-indigo-700 text-white" : "text-slate-600"}`}>{lang === "hi" ? "📦 फैक्ट्री माल लिस्ट" : "📦 Bulk Catalog"}</button>
          <button onClick={() => setTab("ORDERS")} className={`py-2.5 rounded-xl text-xs font-extrabold ${tab === "ORDERS" ? "bg-emerald-700 text-white" : "text-slate-600"}`}>{lang === "hi" ? `🚚 थोक ऑर्डर (${orders.length})` : `🚚 Bulk Orders (${orders.length})`}</button>
          <button onClick={() => setTab("SERVICE")} className={`py-2.5 rounded-xl text-xs font-extrabold ${tab === "SERVICE" ? "bg-amber-600 text-white" : "text-slate-600"}`}>{lang === "hi" ? "🛠️ सर्विस बुक करें" : "🛠️ Book Service"}</button>
        </div>

        {tab === "PRODUCTS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleAddBulkProduct} className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
              <h2 className="text-sm font-extrabold text-slate-800">{lang === "hi" ? "➕ नया बल्क प्रोडक्ट जोड़ें" : "➕ Add Factory Bulk Item"}</h2>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl font-semibold">🔒 यह फैक्ट्री रेट केवल वेरिफाइड Owner/Wholesaler को दिखेगी।</p>
              <input placeholder={lang === "hi" ? "प्रोडक्ट नाम (जैसे: रिफाइंड ऑयल 15L / नमकीन पेटी) *" : "Product Name *"} value={pName} onChange={(e) => setPName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
              <div className="grid grid-cols-2 gap-2">
                <select value={pCategory} onChange={(e) => setPCategory(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white">
                  <option>Grocery & Food / खाद्य सामग्री</option><option>Sweets & Namkeen / मिठाई</option><option>Electronics / इलेक्ट्रॉनिक्स</option><option>Hardware & Parts / हार्डवेयर</option><option>Packaging & Raw Material</option>
                </select>
                <select value={pUnit} onChange={(e) => setPUnit(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white">
                  <option>Carton / पेटी</option><option>Bag / बोरी (50 Kg)</option><option>Box / डिब्बा</option><option>Lot (100 Pcs)</option><option>Quintal / क्विंटल</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] font-bold text-slate-600">Factory Rate ₹ *</label><input type="number" placeholder="₹" value={factoryPrice} onChange={(e) => setFactoryPrice(e.target.value)} className="w-full p-2 border rounded-xl text-xs mt-0.5" required /></div>
                <div><label className="text-[10px] font-bold text-slate-600">Min Order Qty *</label><input type="number" value={minBulkQty} onChange={(e) => setMinBulkQty(e.target.value)} className="w-full p-2 border rounded-xl text-xs mt-0.5" required /></div>
                <div><label className="text-[10px] font-bold text-slate-600">Factory Stock</label><input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full p-2 border rounded-xl text-xs mt-0.5" /></div>
              </div>
              <button disabled={saving} className="w-full py-3 bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-sm">{saving ? "Saving..." : (lang === "hi" ? "✅ फैक्ट्री रेट लिस्ट करें" : "✅ Publish Factory Rate")}</button>
            </form>

            <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2.5">
              <h2 className="text-sm font-extrabold text-slate-800 border-b pb-2">{lang === "hi" ? `📋 फैक्ट्री बल्क कैटलॉग (${products.length})` : `📋 Factory Catalog (${products.length})`}</h2>
              {products.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">अभी कोई बल्क प्रोडक्ट नहीं जोड़ा गया है</p> : products.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500">Min Order: <b>{item.min_bulk_qty}</b> • Stock: <b>{item.stock}</b></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold block">Factory Rate</span>
                    <span className="font-black text-sm text-indigo-700">₹{item.factory_price || item.purchase_price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "ORDERS" && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <h2 className="text-sm font-extrabold text-slate-800">{lang === "hi" ? "🚚 Wholesaler / Owner से आए बल्क ऑर्डर" : "🚚 Incoming Wholesaler Bulk Orders"}</h2>
            {orders.length === 0 ? <p className="text-xs text-slate-400 text-center py-10">अभी तक किसी थोक व्यापारी का ऑर्डर नहीं आया है।</p> : orders.map((o) => (
              <div key={o.id} className="p-3.5 bg-slate-50 rounded-xl border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-indigo-700">{o.order_no} • {o.buyer_name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">{o.status}</span>
                </div>
                <p className="text-xs text-slate-600">{(o.items || []).map((i: any) => `${i.name} × ${i.qty}`).join(", ")}</p>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-black text-sm text-emerald-700">₹{o.total_amount}</span>
                  <div className="flex gap-1.5">
                    {o.status === "PENDING" && <button onClick={() => updateOrderStatus(o.id, "ACCEPTED")} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold">Accept</button>}
                    {o.status === "ACCEPTED" && <button onClick={() => updateOrderStatus(o.id, "DISPATCHED")} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold">Dispatch</button>}
                    {o.status === "DISPATCHED" && <button onClick={() => updateOrderStatus(o.id, "DELIVERED")} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold">Delivered</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "SERVICE" && (
          <form onSubmit={handleBookProvider} className="bg-white p-4 rounded-2xl shadow-sm border space-y-3 max-w-lg mx-auto">
            <h2 className="text-sm font-extrabold text-slate-800">{lang === "hi" ? "🛠️ फैक्ट्री के लिए Service Provider बुक करें" : "🛠️ Book Service Provider for Factory"}</h2>
            <p className="text-xs text-slate-500">{lang === "hi" ? "मशीन रिपेयर, इलेक्ट्रिकल, प्लंबिंग, CCTV या ट्रांसपोर्ट के लिए प्रोवाइडर चुनें:" : "Select verified provider for plant/machinery service:"}</p>
            <select value={selectedProvId} onChange={(e) => setSelectedProvId(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-white" required>
              <option value="">{lang === "hi" ? "-- प्रोवाइडर चुनें --" : "-- Select Provider --"}</option>
              {providers.map((pr) => (
                <option key={pr.id} value={pr.id}>{pr.name} ({pr.area_locality || pr.colony || pr.city || "Local"})</option>
              ))}
            </select>
            <input placeholder={lang === "hi" ? "काम का विवरण (जैसे: 3-Phase मोटर रिपेयर / CCTV सर्विस) *" : "Service details *"} value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            <button disabled={saving} className="w-full py-3 bg-amber-600 text-white rounded-xl font-extrabold text-xs shadow-sm">{saving ? "Booking..." : (lang === "hi" ? "📲 सर्विस प्रोवाइडर को बुक करें" : "📲 Book Service Provider")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
