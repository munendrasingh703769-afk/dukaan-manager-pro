'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Worker = {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
};

export default function ProviderTeamPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', role: 'Technician' });

  const fetchWorkers = async () => {
    if (!activeId) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('provider_workers')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });

    if (data) setWorkers(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchWorkers(); }, [activeId]);

  // --- ADD WORKER ---
  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.phone) return alert("Name & Phone required");
    if (!activeId) return alert("Business ID missing");

    const { error } = await supabase.from('provider_workers').insert([{
      business_id: activeId,
      name: newWorker.name,
      phone: newWorker.phone,
      role: newWorker.role,
      status: 'active'
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewWorker({ name: '', phone: '', role: 'Technician' });
      fetchWorkers();
    } else {
      alert("Error adding worker: " + error.message);
    }
  };

  // --- TOGGLE STATUS ---
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('provider_workers').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setWorkers(workers.map(w => w.id === id ? { ...w, status: newStatus } : w));
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Team...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Team Management</h1>
          <p className="text-sm text-gray-500">Manage your technicians and helpers</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition"
        >
          + Add Worker
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-800 font-bold text-lg">Aapne abhi tak koi worker add nahi kiya hai.</p>
          <p className="text-gray-500 text-sm mt-1">Kisi ko bhi add karne ke liye upar button dabayein.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold">
                    {worker.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{worker.name}</h3>
                    <p className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {worker.role}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${worker.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl flex items-center gap-2">
                <span>📞</span> {worker.phone}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">Status: {worker.status}</span>
                <button 
                  onClick={() => toggleStatus(worker.id, worker.status)} 
                  className="text-xs font-bold text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  {worker.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= ADD WORKER MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Worker</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Worker Name *</label>
                <input type="text" placeholder="e.g. Ramesh" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-700">Phone Number *</label>
                <input type="tel" placeholder="e.g. 9876543210" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-700">Role / Skill *</label>
                <select value={newWorker.role} onChange={e => setNewWorker({...newWorker, role: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="Technician">Technician (AC, Fridge, etc.)</option>
                  <option value="Plumber">Plumber</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Helper">Helper</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleAddWorker} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white hover:bg-blue-700 shadow-md transition">Save Worker</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}