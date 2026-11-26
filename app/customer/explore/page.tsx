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

  const [detailItem, setDetailItem] = useState<any>(null);
  const [bookingItem, setBookingItem] = useState<any>(null);
  const [bookingMode, setBookingMode] = useState<"book" | "quote">("book");

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [bookDate, setBookDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bookTime, setBookTime] = useState("10:00 AM");
  const [notes, setNotes] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);

  const [rateBiz, setRateBiz] = useState<any>(null);
  const [rateStars, setRateStars] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [reviewsList, setReviewsList] = useState<any[]>([]);

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

      const [catsRes, subsRes, bizRes, profRes, revRes, servRes] = await Promise.all([
        supabase.from("service_categories").select("*").eq("is_active", true).not("name", "ilike", "%loan%").not("name", "ilike", "%taxi%").not("name", "ilike", "%ride%").not("name", "ilike", "%rental%").order("name"),
        supabase.from("service_subcategories").select("*").eq("is_active", true),
        supabase.from("businesses").select("*"),
        supabase.from("profiles").select("id, full_name, phone, colony, area_locality, city, pincode"),
        supabase.from("provider_reviews").select("*"),
        supabase.from("services").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      ]);

      const cats = catsRes.data || [];
      const subs = subsRes.data || [];
      const bizList = bizRes.data || [];
      const allProfiles = profRes.data || [];
      const allReviews = revRes.data || [];
      const rawServs = servRes.data || [];

      setCategories(cats);
      setReviewsList(allReviews);

      const servs = rawServs.map((sv: any) => {
        const b = bizList.find((x: any) => x.id === sv.business_id) || null;
        const ownerProf = b ? allProfiles.find((pr: any) => pr.id === b.owner_id) || null : null;
        const bizRevs = allReviews.filter((r: any) => r.business_id === sv.business_id);
        const avgRating = bizRevs.length > 0
          ? (bizRevs.reduce((sum: number, r: any) => sum + Number(r.rating || 5), 0) / bizRevs.length).toFixed(1)
          : null;
        return {
          ...sv,
          service_categories: cats.find((c: any) => c.id === sv.category_id) || null,
          service_subcategories: subs.find((sb: any) => sb.id === sv.subcategory_id) || null,
          businesses: b ? { ...b, owner_profile: ownerProf, avgRating, reviewCount: bizRevs.length } : null,
        };
      });

      const getTier = (b: any) => {
        if (!b || !prof) return 4;
        if (prof.pincode && b.pincode === prof.pincode) return 1;
        if ((prof.colony && b.colony === prof.colony) || (prof.area_locality && b.area_locality === prof.area_locality)) return 2;
        if (prof.city && b.city === prof.city) return 3;
        return 4;
      };
      setServices([...servs].sort((a, b) => getTier(a.businesses) - getTier(b.businesses)));
      setLoading(false);
    })();
  }, []);

  const openActionModal = (srv: any, mode: "book" | "quote") => {
    setDetailItem(null);
    setBookingMode(mode);
    setBookingItem(srv);
  };

  const handleBookOrQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingItem || !custName.trim() || !custPhone.trim()) {
      return alert("Kripya naam aur mobile number zaroor bharein");
    }
    setBookingSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (bookingMode === "quote") {
        const { error } = await supabase.from("quotations").insert([{
          business_id: bookingItem.business_id,
          customer_id: user?.id || null,
          customer_name: custName.trim(),
          customer_phone: custPhone.trim(),
          customer_address: custAddress.trim(),
          service_name: bookingItem.name,
          description: notes.trim() || `Quote requested for ${bookingItem.name}`,
          status: "pending",
        }]);
        if (error) throw error;

        await supabase.from("notifications").insert([{
          business_id: bookingItem.business_id,
          title: "💬 New Quote Request",
          message: `${custName.trim()} (${custPhone.trim()}) ne "${bookingItem.name}" ke liye rate/quote manga hai.`,
        }]);

        alert("✅ Quote Request bhej di gayi hai! Provider jald hi aapko rate bhejenge.");
      } else {
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
          status: "pending",
        }]);
        if (error) throw error;

        await supabase.from("notifications").insert([{
          business_id: bookingItem.business_id,
          title: "🔔 New Service Booking",
          message: `${custName.trim()} (${custPhone.trim()}) ne "${bookingItem.name}" book kiya hai!`,
        }]);

        alert("✅ Booking confirm ho gayi hai! Provider ko aapki jaankari bhej di gayi hai.");
      }

      setBookingItem(null);
      setNotes("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setBookingSaving(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateBiz?.id) return;
    setBookingSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newRev, error } = await supabase.from("provider_reviews").insert([{
        business_id: rateBiz.id,
        customer_id: user?.id || null,
        customer_name: custName || userProfile?.full_name || "Customer",
        rating: rateStars,
        comment: rateComment.trim(),
      }]).select().single();
      if (error) throw error;
      if (newRev) setReviewsList((prev) => [newRev, ...prev]);
      alert("✅ Aapki rating save ho gayi hai!");
      setRateBiz(null);
      setRateComment("");
      setRateStars(5);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setBookingSaving(false);
    }
  };

  const filtered = services.filter((s) => {
    const catName = s.service_categories?.name || "";
    const subName = s.service_subcategories?.name || "";
    const matchCat = !selectedCat || s.category_id === selectedCat || catName.toLowerCase().includes(selectedCat.toLowerCase());
    const q = search.trim().toLowerCase();
    const matchQ = !q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.businesses?.name?.toLowerCase().includes(q) || catName.toLowerCase().includes(q) || subName.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-20 bg-white border-b p-3 shadow-sm space-y-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedCat ? (
              <button onClick={() => setSelectedCat("")} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-800">← सभी सेवाएं</button>
            ) : (
              <Link href="/customer" className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-800">← Home</Link>
            )}
            <h1 className="text-base font-black text-slate-900">
              {categories.find((c) => c.id === selectedCat)?.name || selectedCat || "All Services"}
            </h1>
          </div>
          <Link href="/customer/bookings" className="text-xs font-extrabold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">My Bookings</Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 प्लंबर, कारपेंटर, AC या सर्विस खोजें..." className="w-full p-2.5 border rounded-xl text-xs bg-slate-50" />
        </div>

        <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCat("")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${!selectedCat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
            All ({services.length})
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setSelectedCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${selectedCat === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {c.image_url && <img src={c.image_url} alt="" className="w-4 h-4 rounded-full object-cover inline mr-1.5" />}{c.name}{c.image_url && <img src={c.image_url} alt="" className="w-4 h-4 rounded-full object-cover inline mr-1.5" />}{c.name}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center py-16 font-bold text-blue-600 text-sm">सर्विसेज लोड हो रही हैं...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center space-y-3">
            <p className="text-sm font-extrabold text-slate-700">इस फिल्टर में अभी कोई सर्विस उपलब्ध नहीं है</p>
            <button onClick={() => { setSelectedCat(""); setSearch(""); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-extrabold">सभी सेवाएं देखें ({services.length})</button>
          </div>
        ) : (
          filtered.map((srv) => {
            const b = srv.businesses;
            const liveRevs = b ? reviewsList.filter((r: any) => r.business_id === b.id) : [];
            const liveAvg = liveRevs.length > 0 ? (liveRevs.reduce((acc: number, r: any) => acc + Number(r.rating || 5), 0) / liveRevs.length).toFixed(1) : null;

            return (
              <div key={srv.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="relative h-44 bg-slate-100 flex items-center justify-center">
                  {srv.image_url ? (
                    <img src={srv.image_url} alt={srv.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      {srv.service_categories?.image_url ? <img src={srv.service_categories.image_url} alt={srv.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-400">No Photo</span>}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold bg-white/95 text-blue-700 px-2.5 py-1 rounded-lg shadow-sm">
                    {srv.service_categories?.name || "Service"}
                  </span>
                  {liveAvg && (
                    <span className="absolute top-3 right-3 text-[11px] font-black bg-amber-400 text-slate-900 px-2.5 py-1 rounded-lg shadow-sm">
                      ⭐ {liveAvg} ({liveRevs.length})
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h2 className="text-base font-black text-slate-900">{srv.name}</h2>
                      {b && <p className="text-xs font-bold text-indigo-700 mt-0.5">🏢 {b.shop_name || b.name || b.owner_profile?.full_name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-emerald-700 block">
                        {srv.pricing_type === "Inspection Required" && Number(srv.price) === 0 ? "On Inspection" : `₹${srv.price}`}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">{srv.pricing_type || "Starting From"}</span>
                    </div>
                  </div>

                  {srv.description && <p className="text-xs text-slate-600 line-clamp-2">{srv.description}</p>}
                  {(srv.service_area || b?.city) && (
                    <p className="text-[11px] text-slate-500">📍 {srv.service_area || [b?.area_locality, b?.city].filter(Boolean).join(", ")}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={() => setDetailItem(srv)} className="py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-extrabold border border-slate-200">
                      👁️ View Details
                    </button>
                    <button onClick={() => openActionModal(srv, "book")} className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="relative h-52 bg-slate-100 flex items-center justify-center">
              {detailItem.image_url ? (
                <img src={detailItem.image_url} alt={detailItem.name} className="w-full h-full object-cover" />
              ) : detailItem.service_categories?.image_url ? (<img src={detailItem.service_categories.image_url} alt={detailItem.name} className="w-full h-full object-cover" />) : (<span className="text-xs font-bold text-slate-400">No Photo</span>)}
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 bg-white/90 text-slate-900 w-8 h-8 rounded-full font-black shadow">✕</button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                    {detailItem.service_categories?.name} {detailItem.service_subcategories ? `• ${detailItem.service_subcategories.name}` : ""}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{detailItem.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-700 block">
                    {detailItem.pricing_type === "Inspection Required" && Number(detailItem.price) === 0 ? "On Inspection" : `₹${detailItem.price}`}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{detailItem.pricing_type || "Starting From"}</span>
                </div>
              </div>

              {detailItem.description && <p className="text-xs text-slate-700 leading-relaxed">{detailItem.description}</p>}

              {detailItem.whats_included && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <p className="text-xs font-extrabold text-emerald-800">✅ What's Included:</p>
                  <p className="text-xs text-emerald-900 mt-1">{detailItem.whats_included}</p>
                </div>
              )}

              {detailItem.whats_not_included && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                  <p className="text-xs font-extrabold text-red-800">❌ What's Not Included:</p>
                  <p className="text-xs text-red-900 mt-1">{detailItem.whats_not_included}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 text-xs">
                <p className="font-black text-slate-800">🏢 Provider: {detailItem.businesses?.shop_name || detailItem.businesses?.name || "Verified Provider"}</p>
                {(detailItem.service_area || detailItem.businesses?.city) && (
                  <p className="text-slate-600">📍 Area: {detailItem.service_area || detailItem.businesses?.city}</p>
                )}
                {detailItem.availability_text && <p className="text-slate-600">🕒 Timing: {detailItem.availability_text}</p>}
                {(detailItem.businesses?.phone || detailItem.businesses?.owner_profile?.phone) && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-bold text-slate-800">{detailItem.businesses?.phone || detailItem.businesses?.owner_profile?.phone}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setRateBiz(detailItem.businesses); setDetailItem(null); }} className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold">⭐ Rate</button>
                      <a href={`tel:${detailItem.businesses?.phone || detailItem.businesses?.owner_profile?.phone}`} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold">📞 Call</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button onClick={() => openActionModal(detailItem, "quote")} className="py-3 bg-amber-500 text-slate-900 rounded-xl text-xs font-black shadow-sm">
                  💬 Request Quote
                </button>
                <button onClick={() => openActionModal(detailItem, "book")} className="py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOK NOW / REQUEST QUOTE MODAL */}
      {bookingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBookOrQuote} className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">
                {bookingMode === "quote" ? `💬 Request Quote: ${bookingItem.name}` : `Book: ${bookingItem.name} (₹${bookingItem.price})`}
              </h3>
              <button type="button" onClick={() => setBookingItem(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <input placeholder="आपका नाम *" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <input placeholder="आपका मोबाइल नंबर *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            <input placeholder="आपका पूरा पता (House / Area / Pincode) *" value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            {bookingMode === "book" && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
                <input placeholder="Time (e.g. 10:00 AM)" value={bookTime} onChange={(e) => setBookTime(e.target.value)} className="p-2.5 border rounded-xl text-xs" />
              </div>
            )}
            <textarea placeholder={bookingMode === "quote" ? "अपनी ज़रूरत लिखें ताकि सही रेट मिल सके..." : "काम का विवरण (Optional)"} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" rows={2} />
            <button disabled={bookingSaving} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">
              {bookingSaving ? "Sending..." : bookingMode === "quote" ? "✅ Send Quote Request" : "✅ Confirm Booking"}
            </button>
          </form>
        </div>
      )}

      {/* RATING MODAL */}
      {rateBiz && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitRating} className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">Rate: {rateBiz.shop_name || rateBiz.name}</h3>
              <button type="button" onClick={() => setRateBiz(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((st) => (
                <button key={st} type="button" onClick={() => setRateStars(st)} className={`text-2xl ${st <= rateStars ? "text-amber-400 scale-110" : "text-slate-300"}`}>★</button>
              ))}
            </div>
            <input placeholder="अपना अनुभव लिखें..." value={rateComment} onChange={(e) => setRateComment(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            <button disabled={bookingSaving} className="w-full py-2.5 bg-amber-500 text-slate-900 rounded-xl text-xs font-black">
              {bookingSaving ? "Saving..." : "⭐ Submit Rating"}
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
