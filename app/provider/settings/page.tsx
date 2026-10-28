'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

export default function ProviderSettingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    gst_number: '',
    invoice_prefix: 'INV-',
    terms: 'Service warranty of 1 month on repairs.',
    website: '',
    upi_id: '',
    opening_time: '09:00',
    closing_time: '19:00',
    service_radius_km: 5
  });

  const fetchSettings = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data } = await supabase.from('businesses').select('*').eq('id', activeId).single();
    if (data) {
      setSettings({
        gst_number: data.gst_number || '',
        invoice_prefix: data.invoice_prefix || 'INV-',
        terms: data.terms || '',
        website: data.website || '',
        upi_id: data.upi_id || '',
        opening_time: data.opening_time || '09:00',
        closing_time: data.closing_time || '19:00',
        service_radius_km: data.service_radius_km || 5
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, [activeId]);

  const handleSave = async () => {
    if (!activeId) return;
    setSaving(true);

    const { error } = await supabase.from('businesses').update({
      gst_number: settings.gst_number,
      invoice_prefix: settings.invoice_prefix,
      terms: settings.terms,
      website: settings.website,
      upi_id: settings.upi_id,
      opening_time: settings.opening_time,
      closing_time: settings.closing_time,
      service_radius_km: settings.service_radius_km
    }).eq('id', activeId);

    if (!error) {
      alert("Settings Saved Successfully!");
    } else {
      alert("Error saving settings: " + error.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Settings...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Business Settings</h1>
        <p className="text-sm text-gray-500">Manage your billing, invoices, and account</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Tax & Invoice Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700">GST Number</label>
            <input type="text" placeholder="e.g. 22AAAAA0000A1Z5" value={settings.gst_number} onChange={e => setSettings({...settings, gst_number: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Invoice Prefix</label>
            <input type="text" placeholder="e.g. INV-" value={settings.invoice_prefix} onChange={e => setSettings({...settings, invoice_prefix: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">Default Terms & Conditions</label>
          <textarea rows={3} value={settings.terms} onChange={e => setSettings({...settings, terms: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Payment & Web</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700">UPI ID (For payments)</label>
            <input type="text" placeholder="e.g. shop@upi" value={settings.upi_id} onChange={e => setSettings({...settings, upi_id: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Website Link (Optional)</label>
            <input type="text" placeholder="e.g. www.myshop.com" value={settings.website} onChange={e => setSettings({...settings, website: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* 👇 NAYA SECTION: Working Hours & Service Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Working Hours & Service Area</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700">Opening Time</label>
            <input type="time" value={settings.opening_time} onChange={e => setSettings({...settings, opening_time: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Closing Time</label>
            <input type="time" value={settings.closing_time} onChange={e => setSettings({...settings, closing_time: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">Service Radius (KM)</label>
          <input type="number" value={settings.service_radius_km} onChange={e => setSettings({...settings, service_radius_km: Number(e.target.value)})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Aap kitne kilometer tak service provide karte hain?</p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>

      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4 mt-8">
        <h2 className="text-lg font-bold text-red-800 border-b border-red-200 pb-2">Account Security</h2>
        <p className="text-sm text-red-600">Logging out will end your current session on this device.</p>
        <button onClick={handleLogout} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-red-700 transition">
          Logout from Account
        </button>
      </div>

    </div>
  );
}