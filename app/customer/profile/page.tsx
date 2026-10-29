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
  const [profile, setProfile] = useState({ full_name: '', phone: '', address: '', email: '' });

  // Stats (Counts)
  const [stats, setStats] = useState({ orders: 0, rides: 0, bookings: 0 });

  const fetchProfileAndStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Fetch Profile
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
          email: user.email || ''
        });
      }

      // 2. Fetch Counts for Activities
      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', user.id);
      const { count: rideCount } = await supabase.from('ride_bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id);
      const { count: bookingCount } = await supabase.from('service_bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id);

      setStats({
        orders: orderCount || 0,
        rides: rideCount || 0,
        bookings: bookingCount || 0
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfileAndStats(); }, [supabase]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* 🟣 Premium Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-b-[2.5rem] pt-12 pb-16 px-6 shadow-xl relative">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h1 className="text-xl font-bold text-white">My Profile</h1>
          <button onClick={handleLogout} className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-lg text-xs font-bold">Logout</button>
        </div>
        
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
          <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl text-indigo-600 font-black">
            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-14 space-y-6">
        
        {/* 👤 Personal Details Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Personal Details</h2>
          
          <div>
            <label className="text-xs font-bold text-gray-600">Full Name</label>
            <input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">Phone Number</label>
            <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">Saved Address</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} rows={2} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"></textarea>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-50 text-sm">
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>

        {/* 📦 My Activities (Hub) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-lg font-bold text-gray-800 border-b p-5">My Activities</h2>
          
          <div className="divide-y divide-gray-100">
            
            {/* My Orders */}
            <Link href="/customer/orders" className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl">🛍️</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">My Shop Orders</p>
                  <p className="text-xs text-gray-500">Grocery, Medicines, Clothes etc.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-lg">{stats.orders}</span>
                <span className="text-gray-400">›</span>
              </div>
            </Link>

            {/* My Rides */}
            <Link href="/customer/my-rides" className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">🏍️</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">My Rides & Parcels</p>
                  <p className="text-xs text-gray-500">Bike, Auto, Car and Deliveries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">{stats.rides}</span>
                <span className="text-gray-400">›</span>
              </div>
            </Link>

            {/* My Service Bookings */}
            <Link href="/customer/bookings" className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">🛠️</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">My Service Bookings</p>
                  <p className="text-xs text-gray-500">AC Repair, Plumber, Cleaning etc.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">{stats.bookings}</span>
                <span className="text-gray-400">›</span>
              </div>
            </Link>

            {/* My Quotes */}
            <Link href="/customer/requests" className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">📄</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">My Estimate Requests</p>
                  <p className="text-xs text-gray-500">Quotes requested from providers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">›</span>
              </div>
            </Link>

          </div>
        </div>

      </div>

      {/* 📱 Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pt-3 pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40">
        <Link href="/customer" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/customer/shop" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🛒</span>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link href="/customer/explore" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🛠️</span>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link href="/customer/rides" className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl">🏍️</span>
          <span className="text-[10px] font-medium">Rides</span>
        </Link>
        <Link href="/customer/profile" className="flex flex-col items-center gap-1 text-indigo-600">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">👤</div>
          <span className="text-[10px] font-bold">Profile</span>
        </Link>
      </nav>

    </div>
  );
}