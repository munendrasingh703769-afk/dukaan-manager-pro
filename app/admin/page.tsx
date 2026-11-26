'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const PLAN_OPTIONS = [
  { code: 'BASIC_1M', label: 'Basic Plan (30 Days)', days: 30, price: 299 },
  { code: 'STANDARD_1M', label: 'Standard Plan (30 Days)', days: 30, price: 599 },
  { code: 'PREMIUM_1M', label: 'Premium Plan (30 Days)', days: 30, price: 999 },
  { code: 'ENTERPRISE_1M', label: 'Enterprise Plan (30 Days)', days: 30, price: 1999 },
  { code: 'BASIC_1Y', label: 'Basic Plan (365 Days / 1 Year)', days: 365, price: 2999 },
  { code: 'STANDARD_1Y', label: 'Standard Plan (365 Days / 1 Year)', days: 365, price: 5999 },
  { code: 'PREMIUM_1Y', label: 'Premium Plan (365 Days / 1 Year)', days: 365, price: 9999 },
  { code: 'ENTERPRISE_1Y', label: 'Enterprise Plan (365 Days / 1 Year)', days: 365, price: 19999 },
];

export default function AdminMasterPage() {
  const supabase = createClient();
  const [catListAdmin, setCatListAdmin] = useState<any[]>([]);
  const [newCatTitle, setNewCatTitle] = useState("");
  const [uploadingCatId, setUploadingCatId] = useState<string | null>(null);

  const loadAdminCats = async () => {
    const { data } = await supabase.from("service_categories").select("*").order("name");
    if (data) setCatListAdmin(data);
  };

  useEffect(() => { loadAdminCats(); }, []);

  const uploadAdminCatPhoto = async (file: File | undefined, catId?: string) => {
    if (!file) return;
    setUploadingCatId(catId || "new");
    try {
      const ext = file.name.split(".").pop();
      const path = "categories/" + Date.now() + "." + ext;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (data?.publicUrl) {
        if (catId) {
          await supabase.from("service_categories").update({ image_url: data.publicUrl }).eq("id", catId);
        } else {
          if (!newCatTitle.trim()) return alert("Pehle Category ka naam likhein");
          await supabase.from("service_categories").insert([{ name: newCatTitle.trim(), image_url: data.publicUrl, is_active: true }]);
          setNewCatTitle("");
        }
        loadAdminCats();
      }
    } catch (e: any) {
      alert("Upload Error: " + e.message);
    } finally {
      setUploadingCatId(null);
    }
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'categories'>('subscriptions');
  const [loading, setLoading] = useState(false);

  // Subscriptions & Businesses State
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedBizId, setSelectedBizId] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState('PREMIUM_1M');
  const [activating, setActivating] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [bizRes, subRes, catRes, subCatRes] = await Promise.all([
      supabase.from('businesses').select('id, name, owner_id, phone, city, created_at').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('service_categories').select('*').order('name'),
      supabase.from('service_subcategories').select('*').order('name'),
    ]);

    if (bizRes.data) setBusinesses(bizRes.data);
    if (subRes.data) setSubscriptions(subRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (subCatRes.data) setSubcategories(subCatRes.data);
    const { data: delData } = await supabase.from('deleted_accounts').select('*').order('deleted_at', { ascending: false }).limit(20);
      if (delData) setDeletedAccounts(delData);
      setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsLoggedIn(true);
      } else {
        alert(data.error || 'Invalid Admin Password');
      }
    } catch {
      alert('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const activateSubscription = async (targetBizId: string, targetOwnerId: string | null, planCode: string, existingPendingId?: string) => {
    const planMeta = PLAN_OPTIONS.find((p) => p.code === planCode) || {
      code: planCode.toUpperCase(),
      days: planCode.toUpperCase().includes('1Y') ? 365 : 30,
      price: 0,
    };

    const now = new Date();
    const endDate = new Date(now.getTime() + planMeta.days * 24 * 60 * 60 * 1000);

    // Prevent duplicates: check existing active/pending subscription for this business or owner
    const existing = subscriptions.find(
      (s) =>
        s.id === existingPendingId ||
        (targetBizId && s.business_id === targetBizId && ['active', 'pending'].includes((s.status || '').toLowerCase())) ||
        (targetOwnerId && s.owner_id === targetOwnerId && ['active', 'pending'].includes((s.status || '').toLowerCase()))
    );

    const payload = {
      business_id: targetBizId || existing?.business_id || null,
      owner_id: targetOwnerId || existing?.owner_id || null,
      plan_code: planMeta.code,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
      amount_paid: existing?.amount_paid || planMeta.price,
      payment_method: existing?.payment_method || 'admin_manual',
    };

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert([payload]);
      if (error) throw error;
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId) return alert('Kripya pehle business select karein');
    const biz = businesses.find((b) => b.id === selectedBizId);
    if (!biz) return alert('Business nahi mila');

    setActivating(true);
    try {
      await activateSubscription(biz.id, biz.owner_id, selectedPlanCode);
      alert(`✅ ${biz.name} ke liye ${selectedPlanCode} plan activate ho gaya!`);
      await fetchData();
    } catch (err: any) {
      alert('Activation error: ' + (err.message || 'Failed'));
    } finally {
      setActivating(false);
    }
  };

  const handleApprovePending = async (sub: any) => {
    const biz = businesses.find((b) => b.id === sub.business_id || b.owner_id === sub.owner_id);
    setActivating(true);
    try {
      await activateSubscription(
        sub.business_id || biz?.id || '',
        sub.owner_id || biz?.owner_id || null,
        sub.plan_code || 'BASIC_1M',
        sub.id
      );
      alert('✅ Request Approved & Plan Activated!');
      await fetchData();
    } catch (err: any) {
      alert('Approval error: ' + (err.message || 'Failed'));
    } finally {
      setActivating(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return alert('Category name required');
    const { error } = await supabase.from('service_categories').insert([{ name: newCatName, icon: newCatIcon }]);
    if (!error) {
      setNewCatName('');
      fetchData();
    } else alert(error.message);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCatId || !newSubName) return alert('Select a category and enter subcategory name');
    const { error } = await supabase.from('service_subcategories').insert([{ category_id: selectedCatId, name: newSubName }]);
    if (!error) {
      setNewSubName('');
      fetchData();
    } else alert(error.message);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-extrabold text-center text-slate-800">VyapaarSetu Admin Login</h1>
          <input
            type="password"
            required
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-600"
          />
          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {authLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  const pendingSubs = subscriptions.filter((s) => (s.status || '').toLowerCase() === 'pending');
  const activeSubs = subscriptions.filter((s) => (s.status || '').toLowerCase() === 'active');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 text-white p-5 rounded-2xl shadow-md">
          <div>
            <h1 className="text-xl font-extrabold">VyapaarSetu Master Admin</h1>
            <p className="text-xs text-slate-300 mt-0.5">Subscriptions, Manual Plan Activation & Categories</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'subscriptions' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white'
              }`}
            >
              💎 Subscriptions ({pendingSubs.length} Pending)
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'categories' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white'
              }`}
            >
              🛠️ Categories
            </button>
            <Link href="/owner" className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 text-slate-200">
              Owner Panel →
            </Link>
          </div>
        </div>

        {activeTab === 'subscriptions' ? (
          <div className="space-y-6">
            {/* Manual Plan Activation Card */}
            <form onSubmit={handleManualActivate} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-base font-extrabold text-slate-800">⚡ Manual Business Plan Activation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Select Business</label>
                  <select
                    value={selectedBizId}
                    onChange={(e) => setSelectedBizId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-white"
                    required
                  >
                    <option value="">-- Choose Business ({businesses.length}) --</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.phone ? `(${b.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Select Plan & Validity</label>
                  <select
                    value={selectedPlanCode}
                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-white"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label} — ₹{p.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={activating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-sm shadow-sm disabled:opacity-50"
                  >
                    {activating ? 'Activating...' : '✓ Activate Plan Now'}
                  </button>
                </div>
              </div>
            </form>

            {/* Pending Plan Requests */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-base font-extrabold text-slate-800">⏳ Pending Plan Requests ({pendingSubs.length})</h2>
              {pendingSubs.length === 0 ? (
                <p className="text-xs text-slate-500">Abhi koi pending request nahi hai.</p>
              ) : (
                <div className="space-y-2.5">
                  {pendingSubs.map((sub) => {
                    const biz = businesses.find((b) => b.id === sub.business_id || b.owner_id === sub.owner_id);
                    return (
                      <div key={sub.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{biz?.name || 'Unknown Business'}</p>
                          <p className="text-xs font-semibold text-amber-800">
                            Plan: <span className="uppercase">{sub.plan_code}</span> • Amount: ₹{sub.amount_paid || 0} • {new Date(sub.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleApprovePending(sub)}
                          disabled={activating}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-sm"
                        >
                          ✓ Approve & Activate
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Subscriptions List */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-base font-extrabold text-slate-800">💎 Active Subscriptions ({activeSubs.length})</h2>
              {loading ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : activeSubs.length === 0 ? (
                <p className="text-xs text-slate-500">Koi active subscription nahi mili.</p>
              ) : (
                <div className="space-y-2">
                  {activeSubs.map((sub) => {
                    const biz = businesses.find((b) => b.id === sub.business_id || b.owner_id === sub.owner_id);
                    const expDate = sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A';
                    return (
                      <div key={sub.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{biz?.name || sub.business_id || 'Business'}</p>
                          <p className="text-xs text-slate-600">
                            Plan: <span className="font-bold text-indigo-700 uppercase">{sub.plan_code}</span> • Valid till: <span className="font-bold">{expDate}</span>
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                          Active
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold border-b pb-2">Add Main Category & Photo</h2>
              <div className="space-y-2">
                <input type="text" placeholder="Category Name (e.g. Plumbing Services)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Upload Category Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => handleCatPhotoUpload(e.target.files?.[0])} disabled={uploadingCat} className="w-full text-xs" />
                  {uploadingCat && <p className="text-xs text-blue-600 font-bold mt-1">Photo upload ho rahi hai...</p>}
                  {newCatImage && <img src={newCatImage} alt="" className="w-16 h-16 object-cover rounded-xl mt-2 border" />}
                </div>
              </div>
              <button onClick={handleAddCategory} disabled={uploadingCat} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Add Category</button>
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c.id} className="bg-gray-50 p-2.5 rounded-xl border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="w-11 h-11 rounded-xl object-cover border shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">NoImg</div>
                      )}
                      <span className="text-sm font-bold text-slate-800 truncate">{c.name}</span>
                    </div>
                    <label className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0">
                      {c.image_url ? "Change Photo" : "Upload Photo"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCatPhotoUpload(e.target.files?.[0], c.id)} />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-bold border-b pb-2">Add Subcategory</h2>
              <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
                <option value="">Select Main Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input type="text" placeholder="Subcategory Name (e.g. AC Gas Filling)" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} className="w-full p-3 border rounded-xl" />
              <button onClick={handleAddSubcategory} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Add Subcategory</button>
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {subcategories.map((s) => {
                  const parent = categories.find((c) => c.id === s.category_id);
                  return (
                    <div key={s.id} className="bg-gray-50 p-2 rounded-lg text-sm text-gray-700">
                      <b>{parent?.name}</b> → {s.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    
        <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-black text-red-700">🗑️ Deleted Accounts History ({deletedAccounts.length})</h2>
            <span className="text-[10px] font-bold text-slate-400">Audit Log</span>
          </div>
          {deletedAccounts.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">अभी तक किसी यूज़र ने अकाउंट डिलीट नहीं किया है।</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {deletedAccounts.filter((d) => (d.role || "").toLowerCase() !== "admin").map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex justify-between items-start text-xs">
                  <div>
                    <p className="font-black text-slate-900">{d.full_name || 'User'} <span className="text-[10px] font-normal text-slate-500">({d.role})</span></p>
                    <p className="text-slate-700">{d.email} {d.phone ? `• ${d.phone}` : ''}</p>
                    <p className="text-[11px] text-red-700 mt-1">कारण: {d.reason || '—'}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{new Date(d.deleted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
  );
}
