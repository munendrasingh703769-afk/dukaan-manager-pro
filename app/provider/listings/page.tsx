'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessId } from '@/lib/business';

const MARKETPLACE_MODULES: Record<string, string[]> = {
  'Property Marketplace': ['House / Villa', 'Flat / Apartment', 'Room / PG / Hostel', 'Shop / Showroom', 'Office Space', 'Warehouse / Godown', 'Residential Plot', 'Agricultural Land', 'Farmhouse / Building'],
  'Vehicle Marketplace': ['Bike / Scooter', 'Car / SUV', 'Commercial Vehicle', 'Tractor / Farm Vehicle', 'E-Rickshaw / Auto', 'Spare Parts'],
  'Rental Marketplace': ['House / Flat on Rent', 'Shop / Office on Rent', 'Vehicle on Rent', 'Electronics / Camera Rent', 'Event / Tent / DJ Rent', 'Tools / Machinery Rent'],
  'Used & New Products': ['Mobiles & Tablets', 'Electronics & Appliances', 'Furniture & Home Decor', 'Fashion & Accessories', 'Books & Sports', 'Industrial Goods'],
  'Agriculture Marketplace': ['Tractors & Implements', 'Seeds & Fertilizers', 'Crops & Grains', 'Dairy & Livestock', 'Irrigation Equipment'],
  'Business Buy/Sell': ['Running Shop for Sale', 'Franchise Opportunity', 'Partnership / Investment', 'Factory / Plant'],
  'Jobs & Opportunities': ['Full-Time Job', 'Part-Time / Delivery', 'Technician / Skilled Labor', 'Sales & Marketing', 'Work From Home'],
  'Travel & Tourism': ['Tour Packages', 'Taxi / Outstation Cab', 'Hotel / Homestay', 'Bus / Ticket Assistance'],
  'Education & Learning': ['Coaching / Tuition', 'Computer & IT Courses', 'Skill Training', 'Competitive Exam Prep'],
  'Healthcare & Wellness': ['Clinic / Doctor Consultation', 'Diagnostic / Lab Test', 'Physiotherapy / Home Care', 'Yoga & Fitness'],
  'Events & Wedding': ['Wedding Planner', 'Catering Service', 'Photography & Video', 'Tent, Lighting & Decoration'],
  'Professional & Business Services': ['CA / GST / Tax Filing', 'Legal & Documentation', 'Digital Marketing & Web', 'Printing & Branding'],
  'Financial & Insurance': ['Loan Assistance (Subject to Eligibility)', 'Health & Life Insurance', 'Vehicle Insurance', 'Mutual Fund / Investment Advisory'],
  'Food, Grocery & Daily Needs': ['Tiffin / Homemade Food', 'Catering / Bulk Order', 'Organic & Dairy Products', 'Bakery & Sweets'],
  'Logistics & Transport': ['Mini Truck / Tempo', 'Packers & Movers', 'Courier & Parcel', 'Cold Storage / Warehouse'],
  'Waste & Recycling': ['Scrap / Kabadi Pickup', 'E-Waste Recycling', 'Plastic & Paper Bulk', 'Industrial Scrap'],
  'Pets & Animal Services': ['Pet Grooming & Care', 'Pet Food & Accessories', 'Veterinary Consultation', 'Pet Adoption / Boarding'],
  'Government & Documentation': ['PAN / Passport / DL Assistance', 'Income / Caste / Domicile Cert', 'MSME / Udyam Registration', 'FSSAI / Trade License'],
  'Emergency & On-Demand': ['24x7 Ambulance / Medical', 'Towing & Roadside Help', '24x7 Plumber / Electrician', 'Locksmith / Key Maker'],
  'Local Community & Classified': ['Lost & Found', 'Community Announcements', 'Exchange / Barter', 'General Classified'],
};

const LISTING_TYPES = ['For Sale', 'For Rent', 'For Lease', 'Wanted to Buy', 'Wanted on Rent', 'Exchange'];

export default function ProviderListingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [listings, setListings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries'>('listings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    module_name: 'Property Marketplace',
    category_name: 'House / Villa',
    listing_type: 'For Sale',
    title: '',
    description: '',
    price: '',
    is_negotiable: true,
    city: '',
    area_locality: '',
    pincode: '',
    contact_phone: '',
    image_urls: [] as string[],
    video_url: '',
    area_size: '',
    bedrooms: '',
    furnishing: '',
    deposit: '',
    min_period: '',
    extra_info: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !activeId) { setLoading(false); return; }

    let query = supabase.from('marketplace_listings').select('*').order('created_at', { ascending: false });
    if (activeId) query = query.eq('business_id', activeId);
    else if (user) query = query.eq('seller_user_id', user.id);

    const { data: listData } = await query;
    setListings(listData || []);

    let inqQuery = supabase.from('marketplace_inquiries').select('*, marketplace_listings(title)').order('created_at', { ascending: false });
    if (activeId) inqQuery = inqQuery.eq('business_id', activeId);
    else if (user) inqQuery = inqQuery.eq('seller_user_id', user.id);

    const { data: inqData } = await inqQuery;
    setInquiries(inqData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  const handleMultiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `marketplace/${activeId || 'user'}/${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        if (data?.publicUrl) uploaded.push(data.publicUrl);
      }
      setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, ...uploaded] }));
    } catch (err: any) {
      alert('Photo upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm({
      module_name: 'Property Marketplace',
      category_name: MARKETPLACE_MODULES['Property Marketplace'],
      listing_type: 'For Sale',
      title: '', description: '', price: '', is_negotiable: true,
      city: '', area_locality: '', pincode: '', contact_phone: '',
      image_urls: [], video_url: '', area_size: '', bedrooms: '', furnishing: '', deposit: '', min_period: '', extra_info: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    const d = item.details_json || {};
    setForm({
      module_name: item.module_name || 'Property Marketplace',
      category_name: item.category_name || '',
      listing_type: item.listing_type || 'For Sale',
      title: item.title || '',
      description: item.description || '',
      price: item.price != null ? String(item.price) : '',
      is_negotiable: !!item.is_negotiable,
      city: item.city || '',
      area_locality: item.area_locality || '',
      pincode: item.pincode || '',
      contact_phone: item.contact_phone || '',
      image_urls: Array.isArray(item.image_urls) ? item.image_urls : [],
      video_url: item.video_url || '',
      area_size: d.area_size || '',
      bedrooms: d.bedrooms || '',
      furnishing: d.furnishing || '',
      deposit: d.deposit || '',
      min_period: d.min_period || '',
      extra_info: d.extra_info || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price) return alert('Title aur Price zaroori hai');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      business_id: activeId || null,
      seller_user_id: user?.id || null,
      seller_type: 'provider',
      module_name: form.module_name,
      category_name: form.category_name,
      listing_type: form.listing_type,
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      currency: 'INR',
      is_negotiable: form.is_negotiable,
      city: form.city.trim(),
      area_locality: form.area_locality.trim(),
      pincode: form.pincode.trim(),
      contact_phone: form.contact_phone.trim(),
      image_urls: form.image_urls,
      video_url: form.video_url.trim() || null,
      status: 'active',
      details_json: {
        area_size: form.area_size,
        bedrooms: form.bedrooms,
        furnishing: form.furnishing,
        deposit: form.deposit,
        min_period: form.min_period,
        extra_info: form.extra_info,
      },
    };

    if (editingId) {
      const { error } = await supabase.from('marketplace_listings').update(payload).eq('id', editingId);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('marketplace_listings').insert([payload]);
      if (error) alert(error.message);
    }
    setSaving(false);
    setIsModalOpen(false);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('marketplace_listings').update({ status, availability_status: status === 'active' ? 'Available' : status }).eq('id', id);
    fetchData();
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Kya aap is listing ko delete karna chahte hain?')) return;
    await supabase.from('marketplace_listings').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">Loading My Listings...</div>;

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900">My Marketplace Listings</h1>
          <p className="text-xs text-slate-500">Property, Vehicle, Rental, Jobs & All-in-One Buy/Sell</p>
        </div>
        <button onClick={openNewModal} className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow">
          + Add New Listing
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('listings')} className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold ${activeTab === 'listings' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-700'}`}>
          Listings ({listings.length})
        </button>
        <button onClick={() => setActiveTab('inquiries')} className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold ${activeTab === 'inquiries' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-700'}`}>
          Customer Inquiries ({inquiries.length})
        </button>
      </div>

      {activeTab === 'listings' ? (
        listings.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-dashed text-center space-y-2">
            <p className="font-bold text-slate-700 text-sm">Abhi tak koi listing nahi dali gayi hai</p>
            <button onClick={openNewModal} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">+ Post First Listing</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-40 bg-slate-100 flex items-center justify-center">
                    {item.image_urls?.[0] ? (
                      <img src={item.image_urls} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">No Image</span>
                    )}
                    <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">{item.listing_type}</span>
                    <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">{item.status}</span>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="text-[10px] font-extrabold text-indigo-600">{item.module_name} • {item.category_name}</p>
                    <h3 className="font-black text-slate-900 text-sm">{item.title}</h3>
                    <p className="text-lg font-black text-emerald-700">₹{item.price} {item.is_negotiable && <span className="text-[10px] text-slate-500 font-semibold">(Negotiable)</span>}</p>
                    <p className="text-[11px] text-slate-500">{[item.area_locality, item.city, item.pincode].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border-t flex flex-wrap gap-1.5">
                  <button onClick={() => openEditModal(item)} className="px-3 py-1.5 bg-white border rounded-lg text-[11px] font-bold">Edit</button>
                  <button onClick={() => updateStatus(item.id, item.status === 'active' ? 'paused' : 'active')} className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold">
                    {item.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => updateStatus(item.id, 'sold')} className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold">Mark Sold/Rented</button>
                  <button onClick={() => deleteListing(item.id)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border text-center text-xs font-bold text-slate-500">Abhi koi customer inquiry nahi aayi hai</div>
          ) : (
            inquiries.map((inq) => (
              <div key={inq.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-black text-slate-900">{inq.customer_name} ({inq.customer_phone})</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded">{inq.inquiry_type}</span>
                </div>
                <p className="font-bold text-indigo-700">Listing: {inq.marketplace_listings?.title || 'Listing'}</p>
                {inq.preferred_date && <p className="text-slate-600">Visit Date: {inq.preferred_date}</p>}
                {inq.message && <p className="text-slate-700 bg-slate-50 p-2 rounded-lg">{inq.message}</p>}
                <a href={`tel:${inq.customer_phone}`} className="inline-block mt-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold">Call Customer</a>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-black text-base text-slate-900">{editingId ? 'Edit Listing' : 'Add New Marketplace Listing'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">X</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Marketplace Module *</label>
                <select value={form.module_name} onChange={(e) => setForm({ ...form, module_name: e.target.value, category_name: MARKETPLACE_MODULES[e.target.value]?.[0] || '' })} className="w-full p-2.5 border rounded-xl text-xs bg-white mt-1">
                  {Object.keys(MARKETPLACE_MODULES).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700">Subcategory *</label>
                <select value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs bg-white mt-1">
                  {(MARKETPLACE_MODULES[form.module_name] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Listing Type *</label>
                <select value={form.listing_type} onChange={(e) => setForm({ ...form, listing_type: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs bg-white mt-1">
                  {LISTING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700">Price / Rent (₹) *</label>
                <input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 15000" className="w-full p-2.5 border rounded-xl text-xs mt-1" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={form.is_negotiable} onChange={(e) => setForm({ ...form, is_negotiable: e.target.checked })} />
              Price is Negotiable
            </label>

            <input required placeholder="Listing Title (e.g. 2 BHK Independent House for Rent) *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Upload Multiple Photos</label>
              <input type="file" multiple accept="image/*" onChange={handleMultiPhotoUpload} disabled={uploading} className="w-full text-xs" />
              {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Photos upload ho rahi hain...</p>}
              {form.image_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-2">
                  {form.image_urls.map((u, idx) => (
                    <img key={idx} src={u} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input placeholder="City *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Area / Colony" value={form.area_locality} onChange={(e) => setForm({ ...form, area_locality: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Contact Mobile *" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Video Link (Optional)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Area/Size (e.g. 1200 sq.ft / 2022 Model)" value={form.area_size} onChange={(e) => setForm({ ...form, area_size: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
              <input placeholder="Deposit / Advance (Optional)" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} className="p-2.5 border rounded-xl text-xs" />
            </div>

            <textarea rows={3} placeholder="Full Description, Amenities, Terms..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs" />

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving || uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold">
                {saving ? 'Saving...' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
