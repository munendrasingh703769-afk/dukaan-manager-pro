'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ADMIN_PASSWORD = 'Munnendra@202'

export default function AdminCategoriesPage() {
  const supabase = createClient();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // Edit Modal States
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
    else alert("Invalid Password");
  };

  // --- CATEGORY CRUD ---
  const handleAddCategory = async () => {
    if (!newCatName) return alert("Category name required");
    const { error } = await supabase.from('service_categories').insert([{ name: newCatName, icon: newCatIcon }]);
    if (!error) {
      setNewCatName('');
      fetchData();
    } else alert(error.message);
  };

  const handleUpdateCategory = async () => {
    if (!editCategory.name) return alert("Name required");
    const { error } = await supabase.from('service_categories').update({ 
      name: editCategory.name, 
      icon: editCategory.icon 
    }).eq('id', editCategory.id);
    
    if (!error) {
      setEditCategory(null);
      fetchData();
    } else alert(error.message);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? Deleting a category will also delete all its subcategories!")) return;
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (!error) fetchData();
    else alert(error.message);
  };

  // --- SUBCATEGORY CRUD ---
  const handleAddSubcategory = async () => {
    if (!selectedCatId || !newSubName) return alert("Select a category and enter subcategory name");
    const { error } = await supabase.from('service_subcategories').insert([{ 
      category_id: selectedCatId, 
      name: newSubName 
    }]);
    if (!error) {
      setNewSubName('');
      fetchData();
    } else alert(error.message);
  };

  const handleUpdateSubcategory = async () => {
    if (!editSubcategory.name) return alert("Name required");
    const { error } = await supabase.from('service_subcategories').update({ 
      name: editSubcategory.name 
    }).eq('id', editSubcategory.id);
    
    if (!error) {
      setEditSubcategory(null);
      fetchData();
    } else alert(error.message);
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;
    const { error } = await supabase.from('service_subcategories').delete().eq('id', id);
    if (!error) fetchData();
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
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">Manage Categories & Subcategories</h1>
          <Link href="/admin" className="text-sm font-bold text-blue-600">← Back to Admin</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* MAIN CATEGORIES */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 h-fit">
            <h2 className="text-lg font-bold border-b pb-2 text-blue-800">Main Categories</h2>
            
            <div className="flex gap-2">
              <input type="text" placeholder="Icon" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-16 p-3 border rounded-xl text-center" />
              <input type="text" placeholder="Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 p-3 border rounded-xl" />
            </div>
            <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">+ Add Category</button>
            
            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {categories.map(c => (
                <div key={c.id} className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-xl">{c.icon}</span> {c.name}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditCategory(c)} className="p-1.5 bg-white rounded shadow-sm text-blue-600 hover:bg-blue-100">✏️</button>
                    <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 bg-white rounded shadow-sm text-red-600 hover:bg-red-100">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SUBCATEGORIES */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 h-fit">
            <h2 className="text-lg font-bold border-b pb-2 text-green-800">Subcategories</h2>
            
            <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-medium">
              <option value="">-- Select Main Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input type="text" placeholder="Subcategory Name (e.g. Gas Filling)" value={newSubName} onChange={e => setNewSubName(e.target.value)} className="w-full p-3 border rounded-xl" />
            <button onClick={handleAddSubcategory} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">+ Add Subcategory</button>

            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {subcategories.map(s => {
                const parent = categories.find(c => c.id === s.category_id);
                return (
                  <div key={s.id} className="bg-green-50 border border-green-100 p-3 rounded-xl flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-500 text-xs block">{parent?.name}</span>
                      <span className="font-bold text-gray-800">{s.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditSubcategory(s)} className="p-1.5 bg-white rounded shadow-sm text-blue-600 hover:bg-blue-100">✏️</button>
                      <button onClick={() => handleDeleteSubcategory(s.id)} className="p-1.5 bg-white rounded shadow-sm text-red-600 hover:bg-red-100">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ================= EDIT CATEGORY MODAL ================= */}
      {editCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Edit Category</h2>
            <div className="flex gap-2">
              <input type="text" value={editCategory.icon} onChange={e => setEditCategory({...editCategory, icon: e.target.value})} className="w-16 p-3 border rounded-xl text-center" />
              <input type="text" value={editCategory.name} onChange={e => setEditCategory({...editCategory, name: e.target.value})} className="flex-1 p-3 border rounded-xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditCategory(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={handleUpdateCategory} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT SUBCATEGORY MODAL ================= */}
      {editSubcategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Edit Subcategory</h2>
            <input type="text" value={editSubcategory.name} onChange={e => setEditSubcategory({...editSubcategory, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditSubcategory(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={handleUpdateSubcategory} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}