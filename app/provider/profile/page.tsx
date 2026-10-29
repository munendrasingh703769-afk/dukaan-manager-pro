'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    name: '',
    owner_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    logo_url: ''
  });

  // --- FETCH PROFILE ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const activeId = getCurrentBusinessId();
        
        if (!activeId) {
          setErrorMsg("Aapka account login nahi hai. Kripya logout karke dobara login karein.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.from('businesses').select('*').eq('id', activeId).single();
        
        if (error) throw new Error("Database error: " + error.message);

        if (data) {
          setProfile({
            name: data.name || '',
            owner_name: data.owner_name || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            pincode: data.pincode || '',
            logo_url: data.logo_url || ''
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load profile.");
      } finally {
        setLoading(false); // Chahe error aaye ya na aaye, loader 100% band hoga
      }
    };

    fetchProfile();
  }, [supabase]);

  // --- UPLOAD IMAGE ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const activeId = getCurrentBusinessId();
    if (!activeId) return alert("User not logged in");

    if (file.size > 5 * 1024 * 1024) return alert("File size 5MB se kam honi chahiye.");

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      setProfile({ ...profile, logo_url: publicUrl });

      await supabase.from('businesses').update({ logo_url: publicUrl }).eq('id', activeId);
      
    } catch (error: any) {
      alert("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // --- SAVE PROFILE ---
  const handleSave = async () => {
    if (!profile.name) return alert("Business Name required");
    const activeId = getCurrentBusinessId();
    if (!activeId) return;

    setSaving(true);

    const { error } = await supabase.from('businesses').update({
      name: profile.name,
      owner_name: profile.owner_name,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      pincode: profile.pincode
    }).eq('id', activeId);

    if (!error) {
      alert("Profile Updated Successfully!");
    } else {
      alert("Error updating profile: " + error.message);
    }
    setSaving(false);
  };

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-bold text-blue-600">Loading Profile...</p>
      </div>
    );
  }

  // --- ERROR SCREEN ---
  if (errorMsg) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-red-50 p-6 rounded-2xl border border-red-200 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-red-800 mb-2">Oops! Kuch galat ho gaya.</h2>
        <p className="text-red-600 font-medium max-w-md">{errorMsg}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold">Try Again</button>
      </div>
    );
  }

  // --- MAIN PROFILE UI ---
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">My Profile & Settings</h1>
        <p className="text-sm text-gray-500">Update your business details and photo</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* COVER & PROFILE PHOTO */}
        <div className="h-32 bg-gradient-to-r from-blue-900 to-indigo-800 relative">
          <div className="absolute -bottom-12 left-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 bg-white rounded-2xl shadow-md border-4 border-white flex items-center justify-center overflow-hidden cursor-pointer relative group"
            >
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-400">🏪</span>
              )}
              
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
                {uploading ? '...' : 'CHANGE'}
              </div>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <p className="text-xs text-gray-500 mt-2 text-center font-medium">Click to upload</p>
          </div>
        </div>

        {/* FORM */}
        <div className="p-6 pt-16 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Business / Shop Name *</label>
              <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Owner Name</label>
              <input type="text" value={profile.owner_name} onChange={e => setProfile({...profile, owner_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Phone Number</label>
              <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">City</label>
              <input type="text" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">State</label>
              <input type="text" value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Pincode</label>
              <input type="text" value={profile.pincode} onChange={e => setProfile({...profile, pincode: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Full Address</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} rows={2} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      </div>

    </div>
  );
}