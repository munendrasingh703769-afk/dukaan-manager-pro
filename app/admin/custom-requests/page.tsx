'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ADMIN_PASSWORD = 'Munnendra@2026'

export default function AdminCustomRequestsPage() {
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const [requests, setRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval Modal State
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [approving, setApproving] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    
    // 1. Fetch Pending Custom Requests + Business Name
    const { data: reqData } = await supabase
      .from('custom_service_requests')
      .select(`*, businesses(name, owner_name)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (reqData) setRequests(reqData);

    // 2. Fetch Categories for Approval dropdown
    const { data: catData } = await supabase.from('service_categories').select('*').eq('is_active', true).order('name');
    if (catData) setCategories(catData);

    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) fetchRequests();
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert("Invalid Password");
  };

  // --- APPROVE REQUEST ---
  const handleApprove = async () => {
    if (!selectedCatId) return alert("Please select a category to map this service.");
    setApproving(true);

    try {
      // 1. Create a new service in 'services' table for the provider
      const { error: serviceError } = await supabase.from('services').insert([{
        business_id: selectedReq.business_id,
        name: selectedReq.requested_name,
        description: selectedReq.description,
        category_id: selectedCatId,
        price: 0, // Provider can update price later
        is_active: true
      }]);

      if (serviceError) throw serviceError;

      // 2. Update request status to approved
      const { error: reqError } = await supabase
        .from('custom_service_requests')
        .update({ status: 'approved' })
        .eq('id', selectedReq.id);

      if (reqError) throw reqError;

      alert("Request Approved & Service Added!");
      setSelectedReq(null);
      setSelectedCatId('');
      fetchRequests();

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setApproving(false);
    }
  };

  // --- REJECT REQUEST ---
  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    
    const { error } = await supabase
      .from('custom_service_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (!error) fetchRequests();
    else alert(error.message);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">Admin Login</h1>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl" />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Custom Service Requests</h1>
            <p className="text-sm text-gray-500">Review and approve services requested by providers</p>
          </div>
          <Link href="/admin" className="text-sm font-bold text-blue-600">← Back to Admin</Link>
        </div>

        {loading ? (
          <p className="text-center text-blue-600 font-bold py-10">Loading Requests...</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-800 font-bold text-lg">Koi nayi custom request pending nahi hai.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{req.requested_name}</h3>
                    <p className="text-xs text-blue-600 font-semibold bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                      {req.businesses?.name} ({req.businesses?.owner_name})
                    </p>
                  </div>
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold uppercase">Pending</span>
                </div>
                
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                  "{req.description || 'No description provided.'}"
                </p>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleReject(req.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition text-sm">Reject</button>
                  <button onClick={() => setSelectedReq(req)} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold shadow-md hover:bg-green-700 transition text-sm">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= APPROVE MODAL ================= */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Approve Service</h2>
            <p className="text-sm text-gray-600">Service: <b>{selectedReq.requested_name}</b></p>
            
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <label className="text-sm font-bold text-blue-900">Map to Category *</label>
              <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="w-full p-3 border border-blue-200 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select Category --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <p className="text-xs text-blue-600 mt-1">Ye service kis main category ke andar dikhegi?</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedReq(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleApprove} disabled={approving} className="flex-1 bg-green-600 py-3 rounded-xl font-bold text-white shadow-md hover:bg-green-700 disabled:opacity-50">
                {approving ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}