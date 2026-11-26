'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessId } from '@/lib/business';

type Service = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  image_url: string | null;
  pricing_type: string | null;
  service_area: string | null;
  availability_text: string | null;
  whats_included: string | null;
  whats_not_included: string | null;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  image_url?: string | null;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
};

export default function ProviderServicesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedFilterCat, setSelectedFilterCat] = useState('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [newService, setNewService] = useState({
    name: '',
    price: '',
    pricing_type: 'Starting From',
    description: '',
    category_id: '',
    subcategory_id: '',
    image_url: '',
    service_area: '',
    availability_text: 'Mon - Sun, 9:00 AM - 8:00 PM',
    whats_included: '',
    whats_not_included: '',
  });

  const [customReq, setCustomReq] = useState({
    requested_name: '',
    description: '',
  });

  const fetchData = async () => {
    if (!activeId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [servRes, catRes, subRes, bookRes] = await Promise.all([
      supabase.from('services').select('*').eq('business_id', activeId).order('created_at', { ascending: false }),
      supabase.from('service_categories').select('*').eq('is_active', true).order('name'),
      supabase.from('service_subcategories').select('*').eq('is_active', true).order('name'),
      supabase.from('service_bookings').select('id, service_id').eq('business_id', activeId),
    ]);

    if (servRes.data) setServices(servRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);

    if (bookRes.data) {
      const counts: Record<string, number> = {};
      bookRes.data.forEach((b: any) => {
        if (b.service_id) counts[b.service_id] = (counts[b.service_id] || 0) + 1;
      });
      setBookingCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `services/${activeId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        setNewService((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      }
    } catch (err: any) {
      alert('Photo upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (service: Service) => {
    setEditingServiceId(service.id);
    setNewService({
      name: service.name || '',
      price: service.price != null ? service.price.toString() : '',
      pricing_type: service.pricing_type || 'Starting From',
      description: service.description || '',
      category_id: service.category_id || '',
      subcategory_id: service.subcategory_id || '',
      image_url: service.image_url || '',
      service_area: service.service_area || '',
      availability_text: service.availability_text || 'Mon - Sun, 9:00 AM - 8:00 PM',
      whats_included: service.whats_included || '',
      whats_not_included: service.whats_not_included || '',
    });
    setIsServiceModalOpen(true);
  };

  const openAddModal = () => {
    setEditingServiceId(null);
    setNewService({
      name: '',
      price: '',
      pricing_type: 'Starting From',
      description: '',
      category_id: '',
      subcategory_id: '',
      image_url: '',
      service_area: '',
      availability_text: 'Mon - Sun, 9:00 AM - 8:00 PM',
      whats_included: '',
      whats_not_included: '',
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!newService.name.trim() || !newService.category_id) {
      return alert('Service Name aur Category zaroori hai');
    }
    if (newService.pricing_type !== 'Inspection Required' && !newService.price) {
      return alert('Price daalna zaroori hai');
    }

    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();

    const payload = {
      name: newService.name.trim(),
      price: Number(newService.price || 0),
      pricing_type: newService.pricing_type,
      description: newService.description.trim() || null,
      category_id: newService.category_id,
      subcategory_id: newService.subcategory_id || null,
      image_url: newService.image_url.trim() || null,
      service_area: newService.service_area.trim() || null,
      availability_text: newService.availability_text.trim() || null,
      whats_included: newService.whats_included.trim() || null,
      whats_not_included: newService.whats_not_included.trim() || null,
    };

    if (editingServiceId) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingServiceId)
        .eq('business_id', activeId);

      if (!error) {
        setIsServiceModalOpen(false);
        fetchData();
      } else {
        alert('Error updating: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('services').insert([
        {
          ...payload,
          business_id: activeId,
          provider_id: authData?.user?.id || null,
          is_active: true,
        },
      ]);

      if (!error) {
        setIsServiceModalOpen(false);
        fetchData();
      } else {
        alert('Error adding: ' + error.message);
      }
    }
    setSaving(false);
  };

  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !currentStatus })
      .eq('id', id)
      .eq('business_id', activeId);

    if (!error) {
      setServices(services.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s)));
    } else {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`Kya aap "${name}" service ko permanently delete karna chahte hain?`)) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('business_id', activeId);

    if (!error) {
      setServices(services.filter((s) => s.id !== id));
    } else {
      alert('Delete error: ' + error.message);
    }
  };

  const handleRequestCustom = async () => {
    if (!customReq.requested_name.trim()) return alert('Service name required');

    setSaving(true);
    const { error } = await supabase.from('custom_service_requests').insert([
      {
        business_id: activeId,
        requested_name: customReq.requested_name.trim(),
        description: customReq.description.trim(),
        status: 'pending',
      },
    ]);

    if (!error) {
      alert('Request Sent! Admin will review it soon.');
      setIsCustomModalOpen(false);
      setCustomReq({ requested_name: '', description: '' });
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const filteredServices = selectedFilterCat
    ? services.filter((s) => s.category_id === selectedFilterCat)
    : services;

  if (loading) {
    return <div className="text-center py-20 font-bold text-blue-600">Loading Manage Services...</div>;
  }

  return (
    <div className="space-y-5 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-800">My Services / Manage Services</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Apni services photo, price aur area ke saath add karein — ye seedha Customer App me live dikhengi.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="flex-1 md:flex-none bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
          >
            + Custom Category
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-blue-700 transition"
          >
            + Add New Service
          </button>
        </div>
      </div>

      {/* CATEGORY FILTER BAR */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFilterCat('')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              selectedFilterCat === ''
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            All ({services.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedFilterCat(cat.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                selectedFilterCat === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat.image_url && {cat.image_url && <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover inline mr-1.5" />}{cat.name}{cat.image_url && <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover inline mr-1.5" />}{cat.name}
            </button>
          ))}
        </div>
      )}

      {/* SERVICES LIST */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-gray-300 px-4">
          <div className="text-4xl mb-3">🛠️</div>
          <p className="text-gray-800 font-bold text-base">Abhi tak koi service add nahi ki gayi hai</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            "+ Add New Service" par click karke apni pehli service photo aur price ke saath publish karein.
          </p>
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow"
          >
            + Add First Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const category = categories.find((c) => c.id === service.category_id);
            const subcategory = subcategories.find((s) => s.id === service.subcategory_id);
            const count = bookingCounts[service.id] || 0;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col justify-between ${
                  service.is_active ? 'border-gray-100' : 'border-red-200 opacity-80'
                }`}
              >
                <div>
                  <div className="relative h-40 bg-slate-100 w-full flex items-center justify-center overflow-hidden">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        {category?.image_url ? <img src={category.image_url} alt={service.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">No Photo Uploaded</span>}
                        <p className="text-[10px] text-gray-400 font-semibold mt-1">No Photo Uploaded</p>
                      </div>
                    )}
                    <span
                      className={`absolute top-2.5 right-2.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm ${
                        service.is_active ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {service.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    <span className="absolute bottom-2.5 left-2.5 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      📅 {count} Bookings
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        {category ? category.name : 'Uncategorized'}
                      </span>
                      {subcategory && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                          {subcategory.name}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-gray-900">{service.name}</h3>

                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-emerald-700">
                        {service.pricing_type === 'Inspection Required' && Number(service.price) === 0
                          ? 'On Inspection'
                          : `₹${service.price}`}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        ({service.pricing_type || 'Starting From'})
                      </span>
                    </div>

                    {service.description && <p className="text-xs text-gray-600 line-clamp-2">{service.description}</p>}
                    {service.service_area && (
                      <p className="text-[11px] text-gray-500">
                        📍 <span className="font-semibold">Area:</span> {service.service_area}
                      </p>
                    )}
                    {service.availability_text && (
                      <p className="text-[11px] text-gray-500">
                        🕒 <span className="font-semibold">Timing:</span> {service.availability_text}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(service)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleServiceStatus(service.id, service.is_active)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      service.is_active
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {service.is_active ? '⏸ Pause' : '▶️ Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id, service.name)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h2 className="text-lg font-black text-gray-800">
                {editingServiceId ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-gray-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Service Photo</label>
              {newService.image_url && (
                <div className="relative h-36 w-full rounded-xl overflow-hidden border">
                  <img src={newService.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setNewService({ ...newService, image_url: '' })} className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">Remove</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="w-full text-xs text-gray-600" />
              {uploading && <p className="text-xs text-blue-600 font-bold">Photo upload ho rahi hai...</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">Category *</label>
              <select
                value={newService.category_id}
                onChange={(e) => setNewService({ ...newService, category_id: e.target.value, subcategory_id: '' })}
                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1 bg-white"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {newService.category_id && (
              <div>
                <label className="text-xs font-bold text-gray-700">Subcategory</label>
                <select
                  value={newService.subcategory_id}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const subObj = subcategories.find((s) => s.id === subId);
                    setNewService({ ...newService, subcategory_id: subId, name: newService.name || (subObj ? subObj.name : '') });
                  }}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1 bg-white"
                >
                  <option value="">-- Select Subcategory --</option>
                  {subcategories.filter((s) => s.category_id === newService.category_id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700">Service Title *</label>
              <input type="text" placeholder="e.g. Split AC Gas Refill" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Pricing Type *</label>
                <select value={newService.pricing_type} onChange={(e) => setNewService({ ...newService, pricing_type: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1 bg-white">
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Starting From">Starting From</option>
                  <option value="Inspection Required">Inspection Required</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Price (₹) *</label>
                <input type="number" placeholder="e.g. 499" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Service Area</label>
                <input type="text" placeholder="e.g. Bareilly" value={newService.service_area} onChange={(e) => setNewService({ ...newService, service_area: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Timing</label>
                <input type="text" placeholder="9 AM - 8 PM" value={newService.availability_text} onChange={(e) => setNewService({ ...newService, availability_text: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">Description</label>
              <textarea placeholder="Service details..." value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} className="w-full p-2.5 text-sm border border-gray-300 rounded-xl mt-1" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-emerald-700">✅ Included</label>
                <textarea placeholder="Kya shamil hai..." value={newService.whats_included} onChange={(e) => setNewService({ ...newService, whats_included: e.target.value })} className="w-full p-2 text-xs border border-gray-300 rounded-xl mt-1" rows={2} />
              </div>
              <div>
                <label className="text-xs font-bold text-red-700">❌ Not Included</label>
                <textarea placeholder="Kya alag lagega..." value={newService.whats_not_included} onChange={(e) => setNewService({ ...newService, whats_not_included: e.target.value })} className="w-full p-2 text-xs border border-gray-300 rounded-xl mt-1" rows={2} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsServiceModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-xs text-gray-700">Cancel</button>
              <button type="button" onClick={handleSaveService} disabled={saving || uploading} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-xs text-white shadow-md disabled:opacity-50">
                {saving ? 'Saving...' : 'Publish Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-black text-gray-800">Request New Category</h2>
            <div>
              <label className="text-xs font-bold text-gray-700">Category / Service Name *</label>
              <input type="text" placeholder="e.g. Solar Panel Cleaning" value={customReq.requested_name} onChange={(e) => setCustomReq({ ...customReq, requested_name: e.target.value })} className="w-full p-3 text-sm border border-gray-300 rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">Description</label>
              <textarea placeholder="Details..." value={customReq.description} onChange={(e) => setCustomReq({ ...customReq, description: e.target.value })} className="w-full p-3 text-sm border border-gray-300 rounded-xl mt-1" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsCustomModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-xs text-gray-700">Cancel</button>
              <button type="button" onClick={handleRequestCustom} disabled={saving} className="flex-1 bg-orange-500 py-3 rounded-xl font-bold text-xs text-white shadow-md">
                {saving ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
