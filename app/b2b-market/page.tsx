"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function B2BSupplyMarketPage() {
  const supabase = createClient();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [tab, setTab] = useState<"ORDER" | "MY_ORDERS" | "INCOMING" | "AREA">("ORDER");
  const [myBiz, setMyBiz] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [orderQtyMap, setOrderQtyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Area & Role Settings
  const [bizType, setBizType] = useState("retail_provider");
  const [colony, setColony] = useState("");
  const [areaLocality, setAreaLocality] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let { data: biz } = await supabase.from("businesses").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
    if (biz) {
      setMyBiz(biz);
      setBizType(biz.business_type || "retail_provider");
      setColony(biz.colony || "");
      setAreaLocality(biz.area_locality || "");
      setCity(biz.city || "");
      setPincode(biz.pincode || "");

      // If I am Owner/Wholesaler -> Show Factory Bulk items from Manufacturers
      // If I am Provider/Dukaandar -> Show Wholesale items from Owners/Wholesalers
      const targetSellerType = biz.business_type === "wholesaler_owner" ? "manufacturer" : "wholesaler_owner";
      const { data: sellers } = await supabase.from("businesses").select("id, name, area_locality, city").eq("business_type", targetSellerType);
      const sellerIds = (sellers || []).map((s) => s.id);

      if (sellerIds.length > 0) {
        const { data: prods } = await supabase.from("products").select("*").in("business_id", sellerIds).eq("show_in_b2b", true).gt("stock", 0);
        const enriched = (prods || []).map((p) => ({
          ...p,
          seller: sellers?.find((s) => s.id === p.business_id)
        }));
        setCatalog(enriched);
      } else {
        setCatalog([]);
      }

      const { data: sent } = await supabase.from("b2b_orders").select("*").eq("buyer_business_id", biz.id).order("created_at", { ascending: false });
      if (sent) setMyOrders(sent);

      const { data: rec } = await supabase.from("b2b_orders").select("*").eq("seller_business_id", biz.id).order("created_at", { ascending: false });
      if (rec) setIncomingOrders(rec);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePlaceB2BOrder = async (item: any) => {
    if (!myBiz?.id) return;
    const isOwnerBuying = myBiz.business_type === "wholesaler_owner";
    const unitRate = isOwnerBuying ? Number(item.factory_price || item.purchase_price) : Number(item.wholesale_price || item.selling_price);
    const minQ = isOwnerBuying ? Number(item.min_bulk_qty || 50) : Number(item.min_wholesale_qty || 10);
    const qty = Number(orderQtyMap[item.id] || minQ);

    if (qty < minQ) return alert(lang === "hi" ? `⚠️ कम से कम ${minQ} मात्रा ऑर्डर करनी होगी!` : `⚠️ Minimum order quantity is ${minQ}!`);
    if (qty > Number(item.stock)) return alert(`⚠️ केवल ${item.stock} स्टॉक उपलब्ध है!`);

    setSaving(true);
    try {
      const total = Number((qty * unitRate).toFixed(2));
      const orderNo = `B2B-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("b2b_orders").insert([{
        order_no: orderNo,
        order_tier: isOwnerBuying ? "OWNER_TO_MANUFACTURER" : "PROVIDER_TO_OWNER",
        buyer_business_id: myBiz.id,
        seller_business_id: item.business_id,
        buyer_name: myBiz.name,
        buyer_phone: myBiz.phone || "",
        buyer_address: `${myBiz.colony || ""} ${myBiz.area_locality || ""} ${myBiz.city || ""}`.trim(),
        items: [{ product_id: item.id, name: item.name, qty, rate: unitRate, total }],
        total_amount: total,
        status: "PENDING"
      }]);
      if (error) throw error;

      await supabase.from("notifications").insert([{
        business_id: item.business_id,
        title: isOwnerBuying ? "📦 New Wholesaler Bulk Order" : "🛒 New Retailer Wholesale Order",
        message: `${myBiz.name} ने ${item.name} (${qty} Qty) का ऑर्डर भेजा है (₹${total})`
      }]);

      alert(lang === "hi" ? `✅ ऑर्डर (${orderNo}) सीधे सप्लायर को भेज दिया गया!` : `✅ Order (${orderNo}) placed successfully!`);
      await loadData();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBiz?.id) return;
    setSaving(true);
    await supabase.from("businesses").update({
      business_type: bizType, colony: colony.trim(), area_locality: areaLocality.trim(), city: city.trim(), pincode: pincode.trim()
    }).eq("id", myBiz.id);
    alert(lang === "hi" ? "✅ आपका रोल और एरिया/कॉलोनी सेव हो गया!" : "✅ Business Role & Area Saved!");
    await loadData();
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Supply Chain Hub...</div>;

  const isWholesaler = bizType === "wholesaler_owner";

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase">{isWholesaler ? "Wholesaler / Owner Mode" : "Provider / Retail Store Mode"}</p>
            <h1 className="text-base font-black">{lang === "hi" ? "🔗 B2B थोक खरीद व एरिया सेटअप" : "🔗 B2B Supply & Area Setup"}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold">{lang === "hi" ? "English" : "हिंदी"}</button>
            <Link href={isWholesaler ? "/owner" : "/provider"} className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold">← Back</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-4 gap-1.5 bg-white p-1.5 rounded-2xl shadow-sm border">
          <button onClick={() => setTab("ORDER")} className={`py-2 rounded-xl text-[11px] font-extrabold ${tab === "ORDER" ? "bg-blue-600 text-white" : "text-slate-600"}`}>{isWholesaler ? "🏭 Factory माल" : "🏢 Thok माल"}</button>
          <button onClick={() => setTab("MY_ORDERS")} className={`py-2 rounded-xl text-[11px] font-extrabold ${tab === "MY_ORDERS" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>📦 मेरे ऑर्डर ({myOrders.length})</button>
          <button onClick={() => setTab("INCOMING")} className={`py-2 rounded-xl text-[11px] font-extrabold ${tab === "INCOMING" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>📥 आए ऑर्डर ({incomingOrders.length})</button>
          <button onClick={() => setTab("AREA")} className={`py-2 rounded-xl text-[11px] font-extrabold ${tab === "AREA" ? "bg-amber-600 text-white" : "text-slate-600"}`}>📍 एरिया/रोल</button>
        </div>

        {tab === "ORDER" && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-xs text-blue-900 font-semibold">
              {isWholesaler
                ? "🔒 आपको सीधे Manufacturing Companies के Private Factory Bulk Rates दिख रहे हैं।"
                : "🔒 आपको रजिस्टर्ड Owners / Wholesalers के Private Wholesale Rates दिख रहे हैं (ग्राहकों को यह रेट नहीं दिखता)।"}
            </div>
            {catalog.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border text-center space-y-2">
                <p className="text-xs text-slate-500 font-bold">अभी इस लेवल का कोई थोक/फैक्ट्री कैटलॉग उपलब्ध नहीं है।</p>
                <p className="text-[11px] text-slate-400">पहले "📍 एरिया/रोल" टैब में अपना सही Role (Provider या Wholesaler Owner) चुनें।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catalog.map((item) => {
                  const rate = isWholesaler ? Number(item.factory_price || item.purchase_price) : Number(item.wholesale_price || item.selling_price);
                  const minQ = isWholesaler ? Number(item.min_bulk_qty || 50) : Number(item.min_wholesale_qty || 10);
                  const curQ = orderQtyMap[item.id] ?? minQ;
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{item.seller?.name || "Supplier"} • {item.seller?.city || ""}</span>
                          <h3 className="font-extrabold text-sm text-slate-800 mt-1">{item.name}</h3>
                          <p className="text-[11px] text-slate-500">Min Order: <b>{minQ}</b> • Available: <b>{item.stock}</b></p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-700 block">{isWholesaler ? "Factory Rate" : "Wholesale Rate"}</span>
                          <span className="text-base font-black text-emerald-700">₹{rate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <input type="number" min={minQ} max={item.stock} value={curQ} onChange={(e) => setOrderQtyMap({ ...orderQtyMap, [item.id]: Number(e.target.value) })} className="w-24 p-2 border rounded-xl text-xs font-bold" />
                        <button disabled={saving} onClick={() => handlePlaceB2BOrder(item)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold">
                          🛒 Order (₹{(curQ * rate).toFixed(0)})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "MY_ORDERS" && (
          <div className="space-y-2.5">
            {myOrders.length === 0 ? <p className="bg-white p-8 rounded-2xl text-center text-xs text-slate-400">आपने अभी कोई B2B ऑर्डर नहीं किया है।</p> : myOrders.map((o) => (
              <div key={o.id} className="bg-white p-3.5 rounded-2xl border flex justify-between items-center">
                <div>
                  <p className="font-extrabold text-xs text-blue-700">{o.order_no}</p>
                  <p className="text-xs text-slate-700 mt-0.5">{(o.items || []).map((i: any) => `${i.name} × ${i.qty}`).join(", ")}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">{o.status}</span>
                </div>
                <span className="font-black text-sm text-slate-900">₹{o.total_amount}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "INCOMING" && (
          <div className="space-y-2.5">
            {incomingOrders.length === 0 ? <p className="bg-white p-8 rounded-2xl text-center text-xs text-slate-400">अभी कोई इनकमिंग थोक ऑर्डर नहीं आया है।</p> : incomingOrders.map((o) => (
              <div key={o.id} className="bg-white p-3.5 rounded-2xl border space-y-2">
                <div className="flex justify-between">
                  <span className="font-extrabold text-xs text-indigo-700">{o.order_no} • {o.buyer_name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{o.status}</span>
                </div>
                <p className="text-xs text-slate-600">{(o.items || []).map((i: any) => `${i.name} × ${i.qty}`).join(", ")} — <b>₹{o.total_amount}</b></p>
                <div className="flex gap-2">
                  {o.status === "PENDING" && <button onClick={async () => { await supabase.from("b2b_orders").update({ status: "ACCEPTED" }).eq("id", o.id); loadData(); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">Accept</button>}
                  {o.status === "ACCEPTED" && <button onClick={async () => { await supabase.from("b2b_orders").update({ status: "DISPATCHED" }).eq("id", o.id); loadData(); }} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">Dispatch</button>}
                  {o.status === "DISPATCHED" && <button onClick={async () => { await supabase.from("b2b_orders").update({ status: "DELIVERED" }).eq("id", o.id); loadData(); }} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Delivered</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "AREA" && (
          <form onSubmit={handleSaveArea} className="bg-white p-4 rounded-2xl border space-y-3 max-w-lg mx-auto">
            <h2 className="text-sm font-extrabold text-slate-800">📍 अपना बिज़नेस रोल व एरिया / कॉलोनी सेट करें</h2>
            <p className="text-[11px] text-slate-500">यही कॉलोनी, एरिया और पिनकोड ग्राहक को सबसे पहले पास की दुकान/सर्विस दिखाने के लिए उपयोग होगा।</p>
            <div>
              <label className="text-xs font-bold text-slate-700">आपका बिज़नेस लेवल (Role)</label>
              <select value={bizType} onChange={(e) => setBizType(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs mt-1 bg-white">
                <option value="retail_provider">🏪 Provider / Retail Store (ग्राहक को बिक्री व सर्विस + Owner से थोक खरीद)</option>
                <option value="wholesaler_owner">🏢 Owner / Wholesaler (Provider को थोक सप्लाई + Factory से Bulk खरीद)</option>
                <option value="manufacturer">🏭 Manufacturing Company (Factory Bulk Production)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Colony / Mohalla (जैसे: राजेंद्र नगर)" value={colony} onChange={(e) => setColony(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
              <input placeholder="Area / Locality (जैसे: इज्जतनगर)" value={areaLocality} onChange={(e) => setAreaLocality(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="City (जैसे: Bareilly)" value={city} onChange={(e) => setCity(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
              <input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
            </div>
            <button disabled={saving} className="w-full py-3 bg-amber-600 text-white rounded-xl font-extrabold text-xs shadow-sm">
              {saving ? "Saving..." : "✅ Save Area & Role"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}