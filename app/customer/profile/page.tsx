'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
    email: ''
  });

  // --- FETCH CUSTOMER PROFILE ---
  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
          email: user.email || ''
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  // --- SAVE PROFILE ---
  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        user_type: 'customer'
      });

      if (!error) alert("Profile Updated Successfully!");
      else alert("Error: " + error.message);
    }
    setSaving(false);
  };

  // --- LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Profile...</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 bg-gray-50 min-h-screen">
      
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
        <Link href="/customer" className="text-sm font-bold text-blue-600">← Back Home</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Avatar Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-24 relative flex justify-center">
          <div className="absolute -bottom-10 w-20 h-20 bg-white rounded-full border-4 border-white flex items-center justify-center text-3xl font-bold text-blue-600 shadow-md">
            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
          </div>
        </div>

        <div className="p-6 pt-14 space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700">Full Name</label>
            <input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Phone Number</label>
            <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your 10-digit number" />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Email (Read Only)</label>
            <input type="email" value={profile.email} disabled className="w-full p-3 border border-gray-200 rounded-xl mt-1 bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Delivery Address</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} rows={2} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your home/office address"></textarea>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50 mt-4">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          <hr className="border-gray-200 my-4" />

          <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}