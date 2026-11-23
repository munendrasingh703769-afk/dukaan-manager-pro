"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ExpensesPage() {
  const supabase = createClient();
  const [list, setList] = useState<any[]>([]);
  const [category, setCategory] = useState("चाय / नाश्ता");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (data) setList(data);
  };
  useEffect(() => { load(); }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    await supabase.from("expenses").insert([{ category, amount: Number(amount), note }]);
    setAmount(""); setNote("");
    load();
  };

  const total = list.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="p-2 bg-white rounded-full shadow-sm">←</Link>
          <h1 className="text-xl font-bold text-slate-800">Expenses (खर्चे)</h1>
        </div>
        <div className="bg-rose-100 text-rose-800 px-3 py-1 rounded-xl text-xs font-bold">कुल: ₹{total}</div>
      </div>
      <form onSubmit={addExpense} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 mb-5">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm bg-white">
          <option>चाय / नाश्ता</option>
          <option>दुकान किराया</option>
          <option>बिजली / इंटरनेट बिल</option>
          <option>ट्रांसपोर्ट / भाड़ा</option>
          <option>स्टाफ सैलरी</option>
          <option>अन्य खर्च</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="खर्च रकम (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
          <input placeholder="नोट / विवरण" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
        </div>
        <button className="w-full py-2.5 bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">+ खर्च दर्ज करें</button>
      </form>
      <div className="space-y-2.5">
        {list.map((ex) => (
          <div key={ex.id} className="bg-white p-3.5 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">💸 {ex.category}</p>
              <p className="text-xs text-slate-500">{ex.note || "कोई नोट नहीं"} • {ex.expense_date}</p>
            </div>
            <span className="font-extrabold text-rose-600">- ₹{ex.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}