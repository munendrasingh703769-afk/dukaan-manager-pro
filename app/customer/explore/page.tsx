"use client";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ServicesHubContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("category") || "";
  const initialQ = searchParams.get("q") || "";

  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(initialCat);
  const [search, setSearch] = useState<string>(initialQ);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [bookingItem, setBookingItem] = useState<any>(null);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [bookDate, setBookDate] = useState(() => new Date().toISOString().split("T"));
  const [bookTime, setBookTime] = useState("10:00 AM");
  const [notes, setNotes] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      let prof: any = null;
      if (user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        prof = p;
        setUserProfile(p);
        if (p) {
          setCustName(p.full_name || "");
          setCustPhone(p.phone || "");
          setCustAddress([p.colony, p.area_locality, p.city, p.pincode].filter(Boolean).join(", "));
        }
      }

      const { data: cats } = await supabase.from("service_categories").select("*").order("name");
      if (cats) setCategories(cats);

      const { data: bizList } = await supabase.from("businesses").select("*");
      const { data: rawServs } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (rawServs) {
        const servs = rawServs.map((sv: any) => ({
          ...sv,
          service_categories: (cats || []).find((c: any) => c.id === sv.category_id) || null,
          businesses: (bizList || []).find((b: any) => b.id === sv.business_id) || null
        }));
        const getTier = (b: any) => {
          if (!b || !prof) return 4;
          if (prof.pincode && b.pincode === prof.pincode) return 1;
          if ((prof.colony && b.colony === prof.colony) || (prof.area_locality && b.area_locality === prof.area_locality)) return 2;
          if (prof.city && b.city === prof.city) return 3;
          return 4;
        };
        setServices([...servs].sort((a, b) => getTier(a.businesses) - getTier(b.businesses)));
      }
      setLoading(false);
    })();
  }, []);

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingItem || !custName.trim() || !custPhone.trim()) return alert("कृपया नाम और मोबाइल नंबर डालें");
    setBookingSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("service_bookings").insert([{
        business_id: bookingItem.business_id,
        service_id: bookingItem.id,
        customer_id: user?.id || null,
        customer_name: custName.trim(),
        customer_phone: custPhone.trim(),
        customer_address: custAddress.trim(),
        service_name: bookingItem.name,
        booking_date: bookDate,
        booking_time: bookTime,
        total_amount: Number(bookingItem.price || 0),
        notes: notes.trim(),
        status: "pending"
      }]);
      if (error) throw error;

      await supabase.from("notifications").insert([{
        business_id: bookingItem.business_id,
        title: "📅 New Service Booking",
        message: `${custName.trim()} (${custPhone.trim()}) ने ${bookingItem.name} बुक किया है।`
      }]);

      alert("✅ बुकिंग सफल! प्रोवाइडर को आपका नाम, नंबर और पता भेज दिया गया है।");
      setBookingItem(null);
      setNotes("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setBookingSaving(false);
    }
  };

  const filtered = services.filter((s) => {
    const catName = s.service_categories?.name || "";
    const matchCat = !selectedCat || s.category_id === selectedCat || catName.toLowerCase().includes(selectedCat.toLowerCase()) || selectedCat.toLowerCase().includes(catName.toLowerCase());
    const q = search.trim().toLowerCase();
    const matchQ = !q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.businesses?.name?.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-20 bg-white border-b p-3 shadow-sm space-y-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedCat ? (
              <button onClick={() => setSelectedCat("")} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-800">← सभी कैटेगरी</button>
            ) : (
              <Link href="/customer" className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-800">← Home</Link>
            )}
            <h1 className="text-base font-black text-slate-900">{selectedCat ? selectedCat : "🛠️ All Services"}</h1>
          </div>
          <Link href="/customer/bookings" className="text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">My Bookings</Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 सर्विस, कारपेंटर, AC या प्रोवाइडर खोजें..." className="w-full p-2.5 border rounded-xl text-xs bg-slate-50" />
        </div>

        <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCat("")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${!selectedCat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
            All ({services.length})
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setSelectedCat(c.name)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${selectedCat.toLowerCase() === c.name.toLowerCase() ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center py-16 font-bold text-blue-600 text-sm">सर्विसेज़ लोड हो रही हैं...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center space-y-3">
            <p className="text-sm font-extrabold text-slate-700">इस फ़िल्टर में अभी कोई सर्विस नहीं मिली।</p>
            <button onClick={() => { setSelectedCat(""); setSearch(""); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold">सभी सर्विसेज़ देखें ({services.length})</button>
          </div>
        ) : (
          filtered.map((srv) => {
            const b = srv.businesses;
            const addr = [b?.address, b?.colony, b?.area_locality, b?.city, b?.pincode].filter(Boolean).join(", ");
            return (
              <div key={srv.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{srv.service_categories?.name || "Service"}</span>
                    <h2 className="text-base font-black text-slate-900 mt-1">{srv.name}</h2>
                    {srv.description && <p className="text-xs text-slate-500 mt-0.5">{srv.description}</p>}
                  </div>
                  <span className="text-lg font-black text-emerald-700">₹{srv.price}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="font-extrabold text-slate-800">🏪 Provider: {b?.name || "Verified Provider"}</p>
                  {addr && <p className="text-slate-600 text-[11px]">📍 {addr}</p>}
                  {b?.phone && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-slate-700">📱 {b.phone}</span>
                      <a href={`tel:${b.phone}`} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-extrabold">📞 Call Provider</a>
                    </div>
                  )}
                </div>

                <button onClick={() => setBookingItem(srv)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm">
                  📅 Book Service Now
                </button>
              </div>
            );
          })
        )}
      </div>

      {bookingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBookService} className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">📅 Book: {bookingItem.name} (₹{bookingItem.price})</h3>
              <button type="button" onClick={() => setBookingItem(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <input placeholder="आपका नाम *" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <input placeholder="आपका मोबाइल नंबर *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <input placeholder="आपका पूरा पता (House / Colony / Area / Pincode) *" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
              <input placeholder="Time (e.g. 10:00 AM)" value={bookTime} onChange={(e) => setBookTime(e.target.value)} className="p-2.5 border rounded-xl text-xs" />
            </div>
            <input placeholder="काम का विवरण (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            <button disabled={bookingSaving} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">
              {bookingSaving ? "Booking..." : "✅ Confirm Booking"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function CustomerServicesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-blue-600">Loading Services...</div>}>
      <ServicesHubContent />
    </Suspense>
  );
}
