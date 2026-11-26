'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const LISTING_TYPES = ['All', 'For Sale', 'For Rent', 'For Lease', 'Wanted to Buy', 'Wanted on Rent', 'Exchange'];

export default function CustomerMarketplacePage() {
  const supabase = createClient();

  const [listings, setListings] = useState<any[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [cityFilter, setCityFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'low' | 'high'>('latest');
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);

  const [detailItem, setDetailItem] = useState<any>(null);
  const [inquiryItem, setInquiryItem] = useState<any>(null);
  const [inquiryType, setInquiryType] = useState('General Inquiry');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [postUploading, setPostUploading] = useState(false);
  const [postForm, setPostForm] = useState({
    module_name: "Property Marketplace",
    category_name: "House / Villa",
    listing_type: "For Sale",
    title: "",
    price: "",
    city: "",
    area_locality: "",
    pincode: "",
    contact_phone: "",
    description: "",
    image_urls: [] as string[],
  });

  const handlePostPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = "marketplace/customer/" + Date.now() + "." + ext;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (data?.publicUrl) setPostForm((p) => ({ ...p, image_urls: [data.publicUrl] }));
    } catch (err: any) {
      alert("Upload error: " + err.message);
    } finally {
      setPostUploading(false);
    }
  };

  const handleCustomerPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.price) return alert("Title aur Price zaroori hai");
    setPostSaving(true);
    try {
      const { data, error } = await supabase.from("marketplace_listings").insert([{
        seller_user_id: userId,
        seller_type: "customer",
        module_name: postForm.module_name,
        category_name: postForm.category_name,
        listing_type: postForm.listing_type,
        title: postForm.title.trim(),
        price: Number(postForm.price),
        currency: "INR",
        is_negotiable: true,
        city: postForm.city.trim(),
        area_locality: postForm.area_locality.trim(),
        pincode: postForm.pincode.trim(),
        contact_phone: (postForm.contact_phone || custPhone).trim(),
        description: postForm.description.trim(),
        image_urls: postForm.image_urls,
        status: "active",
      }]).select().single();
      if (error) throw error;
      if (data) setListings((prev) => [data, ...prev]);
      alert("Aapki listing live publish ho gayi hai!");
      setIsPostOpen(false);
      setPostForm({ ...postForm, title: "", price: "", description: "", image_urls: [] });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPostSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
        if (prof) {
          setCustName(prof.full_name || '');
          setCustPhone(prof.phone || '');
        }
        const { data: favs } = await supabase.from('marketplace_favourites').select('listing_id').eq('user_id', user.id);
        if (favs) setFavIds(favs.map((f: any) => f.listing_id));
      }

      const { data: listData } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setListings(listData || []);
      setLoading(false);
    })();
  }, []);

  const toggleFav = async (listingId: string) => {
    if (!userId) return alert('Pehle login karein');
    if (favIds.includes(listingId)) {
      await supabase.from('marketplace_favourites').delete().eq('user_id', userId).eq('listing_id', listingId);
      setFavIds(favIds.filter((id) => id !== listingId));
    } else {
      await supabase.from('marketplace_favourites').insert([{ user_id: userId, listing_id: listingId }]);
      setFavIds([...favIds, listingId]);
    }
  };

  const openInquiry = (item: any, type: string) => {
    setDetailItem(null);
    setInquiryItem(item);
    setInquiryType(type);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryItem || !custName.trim() || !custPhone.trim()) return alert('Naam aur mobile number zaroori hai');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('marketplace_inquiries').insert([{
        listing_id: inquiryItem.id,
        seller_user_id: inquiryItem.seller_user_id || null,
        business_id: inquiryItem.business_id || null,
        customer_id: userId,
        customer_name: custName.trim(),
        customer_phone: custPhone.trim(),
        inquiry_type: inquiryType,
        preferred_date: visitDate || null,
        message: message.trim() || `${inquiryType} for ${inquiryItem.title}`,
        status: 'pending',
      }]);
      if (error) throw error;

      if (inquiryItem.business_id) {
        await supabase.from('notifications').insert([{
          business_id: inquiryItem.business_id,
          title: `New ${inquiryType}`,
          message: `${custName.trim()} (${custPhone.trim()}) ne "${inquiryItem.title}" ke liye ${inquiryType} bheji hai.`,
        }]);
      }

      alert('Aapka request owner ko bhej diya gaya hai!');
      setInquiryItem(null);
      setMessage('');
      setVisitDate('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = (item: any) => {
    const text = `${item.title} - ₹${item.price} (${item.listing_type}) on VyapaarSetu`;
    if (navigator.share) {
      navigator.share({ title: item.title, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text} - ${window.location.href}`);
      alert('Listing link copy ho gaya hai!');
    }
  };

  const modules = ['All', ...Array.from(new Set(listings.map((l) => l.module_name).filter(Boolean)))];

  const filtered = listings
    .filter((item) => {
      if (showOnlyFavs && !favIds.includes(item.id)) return false;
      if (selectedModule !== 'All' && item.module_name !== selectedModule) return false;
      if (selectedType !== 'All' && item.listing_type !== selectedType) return false;
      if (cityFilter.trim()) {
        const loc = `${item.city || ''} ${item.area_locality || ''} ${item.pincode || ''}`.toLowerCase();
        if (!loc.includes(cityFilter.trim().toLowerCase())) return false;
      }
      if (minPrice && Number(item.price) < Number(minPrice)) return false;
      if (maxPrice && Number(item.price) > Number(maxPrice)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${item.title || ''} ${item.description || ''} ${item.category_name || ''} ${item.module_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'low') return Number(a.price) - Number(b.price);
      if (sortBy === 'high') return Number(b.price) - Number(a.price);
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-20 bg-white border-b p-3 shadow-sm space-y-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/customer" className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-extrabold text-slate-800">← Home</Link>
            <h1 className="text-base font-black text-slate-900">VyapaarSetu Marketplace</h1>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setIsPostOpen(true)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 text-white shadow-sm">+ Post Ad</button>
            <button onClick={() => setShowOnlyFavs(!showOnlyFavs)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${showOnlyFavs ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}>
            Saved ({favIds.length})
          </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Property, Car, Bike, Job, Rent khojein..." className="p-2.5 border rounded-xl text-xs bg-slate-50" />
          <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="City, Area ya Pincode..." className="p-2.5 border rounded-xl text-xs bg-slate-50" />
          <div className="grid grid-cols-3 gap-1.5">
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₹" className="p-2 border rounded-xl text-xs bg-slate-50" />
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹" className="p-2 border rounded-xl text-xs bg-slate-50" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-2 border rounded-xl text-xs bg-white">
              <option value="latest">Latest</option>
              <option value="low">Price Low</option>
              <option value="high">Price High</option>
            </select>
          </div>
        </div>

        <div className="max-w-4xl mx-auto flex gap-1.5 overflow-x-auto pb-1">
          {LISTING_TYPES.map((t) => (
            <button key={t} onClick={() => setSelectedType(t)} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold ${selectedType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="max-w-4xl mx-auto flex gap-1.5 overflow-x-auto pb-1">
          {modules.map((m) => (
            <button key={m} onClick={() => setSelectedModule(m)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${selectedModule === m ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
              {m}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          <p className="text-center py-16 font-bold text-blue-600 text-sm">Listings load ho rahi hain...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border text-center space-y-2">
            <p className="font-bold text-slate-700 text-sm">Is filter me abhi koi listing nahi mili</p>
            <button onClick={() => { setSelectedModule('All'); setSelectedType('All'); setSearch(''); setCityFilter(''); setMinPrice(''); setMaxPrice(''); setShowOnlyFavs(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const isFav = favIds.includes(item.id);
              return (
                <div key={item.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="relative h-48 bg-slate-100 flex items-center justify-center">
                      {item.image_urls?.[0] ? (
                        <img src={item.image_urls[0]} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No Image Available</span>
                      )}
                      <span className="absolute top-2.5 left-2.5 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">{item.listing_type}</span>
                      <button onClick={() => toggleFav(item.id)} className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-black shadow ${isFav ? 'bg-rose-600 text-white' : 'bg-white/90 text-slate-800'}`}>
                        {isFav ? 'Saved' : 'Save'}
                      </button>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <p className="text-[10px] font-extrabold text-indigo-600">{item.module_name} • {item.category_name}</p>
                      <h2 className="font-black text-slate-900 text-base">{item.title}</h2>
                      <p className="text-xl font-black text-emerald-700">
                        ₹{item.price} {item.is_negotiable && <span className="text-[10px] text-slate-500 font-semibold">(Negotiable)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{[item.area_locality, item.city, item.pincode].filter(Boolean).join(', ')}</p>
                      {item.description && <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border-t grid grid-cols-2 gap-2">
                    <button onClick={() => setDetailItem(item)} className="py-2.5 bg-white border rounded-xl text-xs font-extrabold text-slate-800">View Details</button>
                    <button onClick={() => openInquiry(item, 'General Inquiry')} className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold">Contact / Inquiry</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="relative h-52 bg-slate-100 flex items-center justify-center">
              {detailItem.image_urls?.[0] ? (
                <img src={detailItem.image_urls[0]} alt={detailItem.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-slate-400">No Image</span>
              )}
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 bg-white text-slate-900 w-8 h-8 rounded-full font-black shadow">X</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{detailItem.module_name} • {detailItem.listing_type}</span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{detailItem.title}</h2>
                </div>
                <p className="text-xl font-black text-emerald-700">₹{detailItem.price}</p>
              </div>

              {detailItem.image_urls?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {detailItem.image_urls.map((img: string, i: number) => (
                    <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-xl border shrink-0" />
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">Location: {[detailItem.area_locality, detailItem.city, detailItem.pincode].filter(Boolean).join(', ')}</p>
              {detailItem.details_json?.area_size && <p className="text-xs text-slate-700">Size / Model: {detailItem.details_json.area_size}</p>}
              {detailItem.details_json?.deposit && <p className="text-xs text-slate-700">Security Deposit: ₹{detailItem.details_json.deposit}</p>}
              {detailItem.video_url && (
                <a href={detailItem.video_url} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-blue-600 underline">Watch Listing Video</a>
              )}
              {detailItem.description && <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">{detailItem.description}</p>}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => openInquiry(detailItem, 'Schedule Visit')} className="py-2.5 bg-amber-500 text-slate-900 rounded-xl text-xs font-black">Schedule Visit</button>
                <button onClick={() => openInquiry(detailItem, 'Request Callback')} className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black">Request Callback</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {detailItem.contact_phone && (
                  <a href={`tel:${detailItem.contact_phone}`} className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center">Call Owner</a>
                )}
                <button onClick={() => handleShare(detailItem)} className="py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">Share</button>
                <button onClick={() => openInquiry(detailItem, 'Report Listing')} className="py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold">Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inquiryItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleInquirySubmit} className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">{inquiryType}: {inquiryItem.title}</h3>
              <button type="button" onClick={() => setInquiryItem(null)} className="text-slate-400 font-bold">X</button>
            </div>
            <input required placeholder="Aapka Naam *" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            <input required placeholder="Mobile Number *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            {inquiryType === 'Schedule Visit' && (
              <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" required />
            )}
            <textarea rows={3} placeholder="Apna message / sawal likhein..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
            <button disabled={submitting} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">
              {submitting ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}
      {isPostOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <form onSubmit={handleCustomerPostSubmit} className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">Post Property / Vehicle / Item</h3>
              <button type="button" onClick={() => setIsPostOpen(false)} className="text-slate-400 font-bold">X</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={postForm.module_name} onChange={(e) => setPostForm({ ...postForm, module_name: e.target.value })} className="p-2.5 border rounded-xl text-xs bg-white">
                <option value="Property Marketplace">Property</option>
                <option value="Vehicle Marketplace">Vehicle</option>
                <option value="Rental Marketplace">Rental</option>
                <option value="Used & New Products">Buy / Sell Item</option>
                <option value="Agriculture Marketplace">Agriculture</option>
                <option value="Local Community & Classified">Classified</option>
              </select>
              <select value={postForm.listing_type} onChange={(e) => setPostForm({ ...postForm, listing_type: e.target.value })} className="p-2.5 border rounded-xl text-xs bg-white">
                <option value="For Sale">For Sale</option>
                <option value="For Rent">For Rent</option>
                <option value="For Lease">For Lease</option>
                <option value="Wanted to Buy">Wanted to Buy</option>
                <option value="Exchange">Exchange</option>
              </select>
            </div>
            <input required placeholder="Title (e.g. Honda Shine 2022 / 2 BHK Flat) *" value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" placeholder="Price / Rent (₹) *" value={postForm.price} onChange={(e) => setPostForm({ ...postForm, price: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input required placeholder="Contact Mobile *" value={postForm.contact_phone || custPhone} onChange={(e) => setPostForm({ ...postForm, contact_phone: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="City *" value={postForm.city} onChange={(e) => setPostForm({ ...postForm, city: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Area" value={postForm.area_locality} onChange={(e) => setPostForm({ ...postForm, area_locality: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Pincode" value={postForm.pincode} onChange={(e) => setPostForm({ ...postForm, pincode: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Upload Photo</label>
              <input type="file" accept="image/*" onChange={handlePostPhoto} disabled={postUploading} className="w-full text-xs" />
              {postUploading && <p className="text-xs text-blue-600 font-bold mt-1">Photo upload ho rahi hai...</p>}
              {postForm.image_urls[0] && <img src={postForm.image_urls[0]} alt="" className="w-20 h-20 object-cover rounded-xl mt-2 border" />}
            </div>
            <textarea rows={2} placeholder="Details / Condition..." value={postForm.description} onChange={(e) => setPostForm({ ...postForm, description: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />
            <button disabled={postSaving || postUploading} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">
              {postSaving ? "Publishing..." : "Publish Listing Now"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
