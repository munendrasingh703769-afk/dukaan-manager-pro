'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WorkerDashboard() {
  const supabase = createClient();

  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // OTP & Photo States
  const [otpInput, setOtpInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch all workers (Demo login)
  const fetchWorkers = async () => {
    const { data } = await supabase.from('provider_workers').select('*').eq('status', 'active');
    if (data) setWorkers(data);
    setLoading(false);
  };

  // 2. Fetch jobs assigned to the selected worker
  const fetchJobs = async (workerId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('service_bookings')
      .select(`
        *,
        services:service_id (name, price)
      `)
      .eq('assigned_worker_id', workerId)
      .order('created_at', { ascending: false });
      
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => { fetchWorkers(); }, []);

  const handleLogin = (worker: any) => {
    setSelectedWorker(worker);
    fetchJobs(worker.id);
  };

  // 3. Update Job Status (Start Job)
  const startJob = async (jobId: string) => {
    const { error } = await supabase.from('service_bookings').update({ status: 'in_progress' }).eq('id', jobId);
    if (!error) {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'in_progress' } : j));
    } else {
      alert("Error starting job: " + error.message);
    }
  };

  // 4. Upload Job Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `job-${jobId}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from('business-assets').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(fileName);
      
      setUploadedPhotos(prev => [...prev, publicUrl]);
      alert("Photo Uploaded Successfully!");
    } catch (error: any) {
      alert("Error uploading photo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 5. Complete Job with OTP
  const handleCompleteJob = async (job: any) => {
    if (uploadedPhotos.length === 0) return alert("Please upload at least one job photo before completing.");
    if (!otpInput) return alert("Please ask the customer for the OTP.");

    if (otpInput !== job.completion_otp) {
      return alert("Invalid OTP! Please ask the customer for the correct 4-digit OTP.");
    }

    const { error } = await supabase.from('service_bookings').update({
      status: 'completed',
      job_photos: uploadedPhotos
    }).eq('id', job.id);

    if (!error) {
      alert("Job Completed Successfully! 🎉");
      setOtpInput('');
      setUploadedPhotos([]);
      fetchJobs(selectedWorker.id);
    } else {
      alert("Error: " + error.message);
    }
  };

  // --- LOGIN SCREEN ---
  if (!selectedWorker) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">👷‍♂️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Worker Login</h1>
          <p className="text-sm text-gray-500 mb-6">Select your name to see assigned jobs</p>
          
          {loading ? (
            <p className="text-sm text-blue-600 font-bold">Loading workers...</p>
          ) : workers.length === 0 ? (
            <p className="text-sm text-red-500 font-bold">No active workers found. Ask owner to add you.</p>
          ) : (
            <div className="space-y-2">
              {workers.map(w => (
                <button key={w.id} onClick={() => handleLogin(w)} className="w-full bg-gray-50 hover:bg-blue-50 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl transition flex items-center justify-between px-4">
                  <span>{w.name}</span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{w.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- WORKER DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      <header className="bg-blue-900 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wider font-bold">Worker App</p>
            <h1 className="text-lg font-bold">{selectedWorker.name} ({selectedWorker.role})</h1>
          </div>
          <button onClick={() => setSelectedWorker(null)} className="bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold">Logout</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4 mt-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-lg">My Assigned Jobs</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{jobs.length} Total</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 font-bold py-10">Loading Jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">☕</div>
            <p className="text-gray-800 font-bold">Aaj koi kaam nahi hai.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                
                <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{job.services?.name || 'Service'}</h3>
                    <p className="text-sm text-green-700 font-bold bg-green-50 inline-block px-2 py-0.5 rounded mt-1">₹{job.services?.price || 0}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                    job.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                    job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 
                    job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex gap-3 text-sm text-gray-700">
                    <span className="text-lg">👤</span>
                    <div>
                      <p className="font-bold">{job.customer_name}</p>
                      <a href={`tel:${job.customer_phone}`} className="text-blue-600 font-semibold text-xs">📞 {job.customer_phone}</a>
                    </div>
                  </div>

                  {job.notes && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-orange-800">
                      <b>Note:</b> {job.notes}
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="pt-2">
                    {job.status === 'accepted' && (
                      <button onClick={() => startJob(job.id)} className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-yellow-600 transition">
                        Start Job (On the Way)
                      </button>
                    )}
                    
                    {/* COMPLETE JOB WITH PHOTO + OTP */}
                    {job.status === 'in_progress' && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 mt-2">
                        <p className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2">Complete Job</p>
                        
                        {/* Photo Upload */}
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">Upload Job Photo (Before/After) *</label>
                          <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, job.id)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700" />
                          {uploading && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                          {uploadedPhotos.length > 0 && <p className="text-xs text-green-600 font-bold mt-1">✓ {uploadedPhotos.length} photo(s) uploaded</p>}
                        </div>

                        {/* OTP Input */}
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">Customer OTP *</label>
                          <input 
                            type="text" 
                            placeholder="Enter 4-digit OTP" 
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold tracking-widest outline-none focus:ring-2 focus:ring-green-500"
                            maxLength={4}
                          />
                        </div>

                        <button onClick={() => handleCompleteJob(job)} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition">
                          Verify OTP & Complete
                        </button>
                      </div>
                    )}
                    
                    {job.status === 'completed' && (
                      <div className="text-center p-2 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-green-700 font-bold text-sm">✓ Job Completed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}