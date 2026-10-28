'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  note: string;
}

export default function ProviderExpensesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '', category: 'Travel / Petrol', amount: '', date: new Date().toISOString().split('T')[0], note: ''
  });

  const fetchExpenses = async () => {
    if (!activeId) return;
    setLoading(true);

    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', activeId)
      .order('expense_date', { ascending: false });

    if (data) setExpenses(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, [activeId]);

  // --- ADD EXPENSE ---
  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount) return alert("Title and Amount required");
    
    setSaving(true);
    const { error } = await supabase.from('expenses').insert([{
      business_id: activeId,
      title: newExpense.title,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      expense_date: newExpense.date,
      note: newExpense.note
    }]);

    if (!error) {
      setIsModalOpen(false);
      setNewExpense({ title: '', category: 'Travel / Petrol', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
      fetchExpenses();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  };

  // Total Expenses Calculate
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Expenses...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Business Expenses</h1>
          <p className="text-sm text-gray-500">Track your daily business kharcha</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-red-700 transition"
        >
          + Add Expense
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div className="bg-gradient-to-br from-red-500 to-rose-700 p-6 rounded-2xl shadow-lg text-white">
        <p className="text-red-100 text-sm font-semibold mb-1">Total Expenses</p>
        <h3 className="text-4xl font-black">₹{totalExpense}</h3>
        <p className="text-red-200 text-xs mt-2">Total {expenses.length} records found</p>
      </div>

      {/* EXPENSES LIST */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">💸</div>
          <p className="text-gray-800 font-bold text-lg">Aapne abhi tak koi expense record nahi kiya.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 md:p-5 flex justify-between items-center hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-lg">
                    {exp.category === 'Travel / Petrol' ? '⛽' : 
                     exp.category === 'Salary' ? '👥' : 
                     exp.category === 'Rent' ? '🏢' : 
                     exp.category === 'Tools / Parts' ? '🛠️' : '💸'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm md:text-base">{exp.title}</h4>
                    <p className="text-xs text-gray-500">{exp.category} • {new Date(exp.expense_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-red-600 text-base md:text-lg">- ₹{exp.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ADD EXPENSE MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Expense</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Expense Title *</label>
                <input type="text" placeholder="e.g. Petrol for site visit" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-700">Category</label>
                <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none bg-white focus:ring-2 focus:ring-red-500">
                  <option value="Travel / Petrol">Travel / Petrol</option>
                  <option value="Tools / Parts">Tools / Spare Parts</option>
                  <option value="Salary">Worker Salary</option>
                  <option value="Rent">Shop Rent</option>
                  <option value="Tea / Food">Tea / Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">Amount (₹) *</label>
                  <input type="number" placeholder="0" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Date</label>
                  <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleAddExpense} disabled={saving} className="flex-1 bg-red-600 py-3 rounded-xl font-bold text-white hover:bg-red-700 shadow-md transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}