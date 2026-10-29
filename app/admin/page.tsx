'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ADMIN_PASSWORD = 'Munnendra@2026'

export default function AdminCategoriesPage() {
  const supabase = createClient();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛠️');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newSubName, setNewSubName] = useState('');

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

  const handleAddCategory = async () => {
    if (!newCatName) return alert("Category name required");
    const { error } = await supabase.from('service_categories').insert([{ name: newCatName, icon: newCatIcon }]);
    if (!error) {
      setNewCatName('');
      fetchData();
    } else alert(error.message);
  };

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
          <h1 className="text-xl font-bold text-gray-800">Manage Categories</h1>
          <Link href="/admin" className="text-sm font-bold text-blue-600">← Back to Admin</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ADD CATEGORY */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Add Main Category</h2>
            <div className="flex gap-2">
              <input type="text" placeholder="Icon (e.g. ❄️)" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-16 p-3 border rounded-xl text-center" />
              <input type="text" placeholder="Category Name (e.g. AC Repair)" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 p-3 border rounded-xl" />
            </div>
            <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Add Category</button>
            
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="bg-gray-50 p-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <span>{c.icon}</span> {c.name}
                </div>
              ))}
            </div>
          </div>

          {/* ADD SUBCATEGORY */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Add Subcategory</h2>
            <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
              <option value="">Select Main Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input type="text" placeholder="Subcategory Name (e.g. AC Gas Filling)" value={newSubName} onChange={e => setNewSubName(e.target.value)} className="w-full p-3 border rounded-xl" />
            <button onClick={handleAddSubcategory} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Add Subcategory</button>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {subcategories.map(s => {
                const parent = categories.find(c => c.id === s.category_id);
                return (
                  <div key={s.id} className="bg-gray-50 p-2 rounded-lg text-sm text-gray-700">
                    <b>{parent?.name}</b> → {s.name}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}