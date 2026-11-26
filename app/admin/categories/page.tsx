'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const ADMIN_PASSWORD = 'Munnendra@202';

export default function AdminCategoriesPage() {
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const [editCategory, setEditCategory] = useState<any>(null);
  const [editSubcategory, setEditSubcategory] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('service_categories').select('*').order('name');
    if (cats) setCategories(cats);
    const { data: subs } = await supabase.from('service_subcategories').select('*').order('name');
    if (subs) setSubcategories(subs);
    setLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setIsLoggedIn(true);
    else alert('Invalid Password');
  };

  const uploadCategoryPhoto = async (file: File, isEdit = false) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `categories/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      if (data?.publicUrl) {
        if (isEdit && editCategory) setEditCategory({ ...editCategory, image_url: data.publicUrl });
        else setNewCatImage(data.publicUrl);
      }
    } catch (err: any) {
      alert('Photo upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return alert('Category name required');
    const { error } = await supabase.from('service_categories').insert([{
      name: newCatName.trim(),
      icon: newCatIcon.trim() || null,
      image_url: newCatImage || null,
      is_active: true,
    }]);
    if (!error) {
      setNewCatName('');
      setNewCatIcon('');
      setNewCatImage('');
      fetchData();
    } else alert(error.message);
  };

  const handleUpdateCategory = async () => {
    if (!editCategory?.name?.trim()) return alert('Name required');
    const { error } = await supabase.from('service_categories').update({
      name: editCategory.name.trim(),
      icon: editCategory.icon || null,
      image_url: editCategory.image_url || null,
    }).eq('id', editCategory.id);
    if (!error) {
      setEditCategory(null);
      fetchData();
    } else alert(error.message);
  };

  const toggleCategoryActive = async (cat: any) => {
    await supabase.from('service_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure? Deleting a category will also delete its subcategories!')) return;
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (!error) fetchData();
    else alert(error.message);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCatId || !newSubName.trim()) return alert('Select a category and enter subcategory name');
    const { error } = await supabase.from('service_subcategories').insert([{
      category_id: selectedCatId,
      name: newSubName.trim(),
      is_active: true,
    }]);
    if (!error) {
      setNewSubName('');
      fetchData();
    } else alert(error.message);
  };

  const handleUpdateSubcategory = async () => {
    if (!editSubcategory?.name?.trim()) return alert('Name required');
    const { error } = await supabase.from('service_subcategories').update({
      name: editSubcategory.name.trim(),
    }).eq('id', editSubcategory.id);
    if (!error) {
      setEditSubcategory(null);
      fetchData();
    } else alert(error.message);
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const { error } = await supabase.from('service_subcategories').delete().eq('id', id);
    if (!error) fetchData();
    else alert(error.message);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">Admin Login</h1>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-xl" />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border">
          <h1 className="text-lg font-black text-gray-800">Manage Categories & Photos</h1>
          <Link href="/admin" className="text-xs font-bold text-blue-600">Back to Admin</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4 h-fit">
            <h2 className="text-base font-bold border-b pb-2 text-blue-800">Main Categories</h2>

            <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border">
              <input type="text" placeholder="Category Name (e.g. Plumbing Services) *" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl bg-white" />
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Upload Category Photo</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCategoryPhoto(e.target.files[0], false)} disabled={uploading} className="w-full text-xs" />
                {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Photo upload ho rahi hai...</p>}
                {newCatImage && <img src={newCatImage} alt="Preview" className="w-16 h-16 object-cover rounded-xl mt-2 border" />}
              </div>
              <button onClick={handleAddCategory} disabled={uploading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold">
                + Add Category
              </button>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {categories.map((c) => (
                <div key={c.id} className={`p-2.5 rounded-xl border flex justify-between items-center gap-2 ${c.is_active ? 'bg-blue-50/60 border-blue-100' : 'bg-gray-100 opacity-60'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-11 h-11 rounded-xl object-cover border bg-white shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">NoImg</div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-xs text-gray-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-500">{c.is_active ? 'Active' : 'Hidden'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditCategory(c)} className="px-2.5 py-1.5 bg-white rounded-lg border text-[11px] font-bold text-blue-700">Photo / Edit</button>
                    <button onClick={() => toggleCategoryActive(c)} className="px-2 py-1.5 bg-white rounded-lg border text-[11px] font-bold text-amber-700">{c.is_active ? 'Hide' : 'Show'}</button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="px-2 py-1.5 bg-white rounded-lg border text-[11px] font-bold text-red-600">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4 h-fit">
            <h2 className="text-base font-bold border-b pb-2 text-green-800">Subcategories</h2>
            <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl bg-white font-medium">
              <option value="">-- Select Main Category --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Subcategory Name (e.g. Tap Repair)" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl" />
            <button onClick={handleAddSubcategory} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold">+ Add Subcategory</button>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {subcategories.map((s) => {
                const parent = categories.find((c) => c.id === s.category_id);
                return (
                  <div key={s.id} className="bg-green-50/70 border border-green-100 p-2.5 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-gray-500 text-[10px] block">{parent?.name}</span>
                      <span className="font-bold text-xs text-gray-800">{s.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditSubcategory(s)} className="px-2 py-1 bg-white rounded-lg border text-[11px] font-bold text-blue-600">Edit</button>
                      <button onClick={() => handleDeleteSubcategory(s.id)} className="px-2 py-1 bg-white rounded-lg border text-[11px] font-bold text-red-600">Del</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {editCategory && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
              <h2 className="text-base font-black text-gray-800">Edit Category & Photo</h2>
              <input type="text" value={editCategory.name} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} className="w-full p-2.5 text-xs border rounded-xl" />
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Upload / Change Photo</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCategoryPhoto(e.target.files[0], true)} disabled={uploading} className="w-full text-xs" />
                {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Uploading...</p>}
                {editCategory.image_url && <img src={editCategory.image_url} alt="" className="w-20 h-20 object-cover rounded-xl mt-2 border" />}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditCategory(null)} className="flex-1 bg-gray-100 py-2.5 rounded-xl text-xs font-bold">Cancel</button>
                <button onClick={handleUpdateCategory} disabled={uploading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold">Save</button>
              </div>
            </div>
          </div>
        )}

        {editSubcategory && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
              <h2 className="text-base font-black text-gray-800">Edit Subcategory</h2>
              <input type="text" value={editSubcategory.name} onChange={(e) => setEditSubcategory({ ...editSubcategory, name: e.target.value })} className="w-full p-2.5 text-xs border rounded-xl" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditSubcategory(null)} className="flex-1 bg-gray-100 py-2.5 rounded-xl text-xs font-bold">Cancel</button>
                <button onClick={handleUpdateSubcategory} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
