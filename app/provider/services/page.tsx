'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Service = { id: string; name: string; price: number; description: string; category_id: string; subcategory_id: string; is_active: boolean; }
type Category = { id: string; name: string; icon: string; }
type Subcategory = { id: string; category_id: string; name: string; }

export default function ProviderServicesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  // Edit State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form States
  const [newService, setNewService] = useState({
    name: '', price: '', description: '', category_id: '', subcategory_id: ''
  });
  const [customReq, setCustomReq] = useState({ requested_name: '', description: '' });

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId).order('created_at', { ascending: false });
    if (servData) setServices(servData);

    const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true).order('name');
    if (catData) setCategories(catData);

    const { data: subData } = await supabase.from('service_subcategories').select('*').eq('is_active', true).order('name');
    if (subData) setSubcategories(subData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- OPEN EDIT MODAL ---
  const openEditModal = (service: Service) => {
    setEditingServiceId(service.id);
    setNewService({
      name: service.name,
      price: service.price.toString(),
      description: service.description || '',
      category_id: service.category_id || '',
      subcategory_id: service.subcategory_id || ''
    });
    setIsServiceModalOpen(true);
  };

  // --- OPEN ADD MODAL ---
  const openAddModal = () => {
    setEditingServiceId(null);
    setNewService({ name: '', price: '', description: '', category_id: '', subcategory_id: '' });
    setIsServiceModalOpen(true);
  };

  // --- SAVE SERVICE (ADD or EDIT) ---
  const handleSaveService = async () => {
    if (!newService.name || !newService.price || !newService.category_id) return alert("Name, Price and Category are required");
    
    setSaving(true);
    const payload = {
      name: newService.name,
      price: Number(newService.price),
      description: newService.description,
      category_id: newService.category_id,
      subcategory_id: newService.subcategory_id || null,
    };

    if (editingServiceId) {
      // Update existing service
      const { error } = await supabase.from('services').update(payload).eq('id', editingServiceId);
      if (!error) {
        setIsServiceModalOpen(false);
        fetchData();
      } else alert("Error updating: " + error.message);
    } else {
      // Insert new service
      const { error } = await supabase.from('services').insert([{ ...payload, business_id: activeId, is_active: true }]);
      if (!error) {
        setIsServiceModalOpen(false);
        fetchData();
      } else alert("Error adding: " + error.message);
    }
    setSaving(false);
  };

  // --- TOGGLE STATUS (Pause/Activate) ---
  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('services').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      setServices(services.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    } else {
      alert("Error updating status: " + error.message);
    }
  };

  // --- REQUEST CUSTOM SERVICE ---
  const handleRequestCustom = async () => {
    if (!customReq.requested_name) return alert("Service name required");
    
    setSaving(true);
    const { error } = await supabase.from('custom_service_requests').insert([{
      business_id: activeId,
      requested_name: customReq.requested_name,
      description: customReq.description,
      status: 'pending'
    }]);

    if (!error) {
      alert("Request Sent! Admin will review it soon.");
      setIsCustomModalOpen(false);
      setCustomReq({ requested_name: '', description: '' });
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Services...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Services</h1>
          <p className="text-sm text-gray-500">Manage the services you offer to customers</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setIsCustomModalOpen(true)} className="flex-1 md:flex-none bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition">
            + Custom Request
          </button>
          <button onClick={openAddModal} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition">
            + Add Service
          </button>
        </div>
      </div>

      {/* SERVICES LIST */}
      {services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🧰</div>
          <p className="text-gray-800 font-bold text-lg">Aapne abhi tak koi service add nahi ki hai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const category = categories.find(c => c.id === service.category_id);
            return (
              <div key={service.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${service.is_active ? 'border-gray-100' : 'border-red-200 opacity-75'} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800">{service.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${service.is_active ? 'text-green-700 bg-green-50 border-green-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                      {service.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-semibold bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 mb-2">
                    {category ? `${category.icon} ${category.name}` : 'Uncategorized'}
                  </p>
                  <p className="text-2xl font-black text-purple-600 mt-2">₹{service.price}</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{service.description || 'No description provided.'}</p>
                </div>
                
                {/* ACTION BUTTONS */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => openEditModal(service)} className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-100 transition">✏️ Edit</button>
                  <button onClick={() => toggleServiceStatus(service.id, service.is_active)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${service.is_active ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                    {service.is_active ? '⏸️ Pause' : '▶️ Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD/EDIT SERVICE MODAL ================= */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">{editingServiceId ? 'Edit Service' : 'Add New Service'}</h2>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Category *</label>
              <select 
                value={newService.category_id} 
                onChange={e => setNewService({...newService, category_id: e.target.value, subcategory_id: ''})} 
                className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Category --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {newService.category_id && (
              <div>
                <label className="text-sm font-bold text-gray-700">Subcategory (Optional)</label>
                <select 
                  value={newService.subcategory_id} 
                  onChange={e => setNewService({...newService, subcategory_id: e.target.value})} 
                  className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Subcategory --</option>
                  {subcategories.filter(s => s.category_id === newService.category_id).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-gray-700">Service Name *</label>
              <input type="text" placeholder="e.g. AC Gas Filling" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Charges (₹) *</label>
              <input type="number" placeholder="e.g. 500" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
              <textarea placeholder="Details about the service..." value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsServiceModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleSaveService} disabled={saving} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM SERVICE REQUEST MODAL ================= */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Request Custom Service</h2>
            <p className="text-xs text-gray-500 mb-2">Agar aapki service list me nahi hai, toh yahan request bhejein. Admin approve karenge.</p>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Service Name *</label>
              <input type="text" placeholder="e.g. Server Rack Installation" value={customReq.requested_name} onChange={e => setCustomReq({...customReq, requested_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Description / Details</label>
              <textarea placeholder="Describe what you will do..." value={customReq.description} onChange={e => setCustomReq({...customReq, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" rows={3}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsCustomModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleRequestCustom} disabled={saving} className="flex-1 bg-orange-500 py-3 rounded-xl font-bold text-white hover:bg-orange-600 shadow-md transition disabled:opacity-50">
                {saving ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}