"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ExpensesPage() {
  const supabase = createClient();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [list, setList] = useState<any[]>([]);
  const [category, setCategory] = useState("Tea / Snacks");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const cats = [
    { en: "Tea / Snacks", hi: "चाय / नाश्ता" },
    { en: "Shop Rent", hi: "दुकान किराया" },
    { en: "Electricity / Internet", hi: "बिजली / इंटरनेट बिल" },
    { en: "Transport / Freight", hi: "ट्रांसपोर्ट / भाड़ा" },
    { en: "Staff Salary", hi: "स्टाफ सैलरी" },
    { en: "Other Expense", hi: "अन्य खर्च" },
  ];

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
          <Link href="/owner" className="p-2 bg-white rounded-full shadow-sm font-bold">←</Link>
          <h1 className="text-xl font-bold text-slate-800">{lang === "hi" ? "Expenses (खर्चे)" : "Expenses"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-xl text-xs font-bold">{lang === "hi" ? "कुल" : "Total"}: ₹{total}</span>
          <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-sm">
            {lang === "hi" ? "English" : "हिंदी"}
          </button>
        </div>
      </div>
      <form onSubmit={addExpense} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 mb-5">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm bg-white">
          {cats.map((c) => (
            <option key={c.en} value={c.en}>{lang === "hi" ? `${c.hi} (${c.en})` : c.en}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder={lang === "hi" ? "खर्च रकम (₹)" : "Amount (₹)"} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
          <input placeholder={lang === "hi" ? "नोट / विवरण" : "Note / Details"} value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
        </div>
        <button className="w-full py-2.5 bg-rose-600 text-white font-bold rounded-xl text-sm">{lang === "hi" ? "+ खर्च दर्ज करें" : "+ Add Expense"}</button>
      </form>
      <div className="space-y-2.5">
        {list.map((ex) => (
          <div key={ex.id} className="bg-white p-3.5 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">💸 {ex.category}</p>
              <p className="text-xs text-slate-500">{ex.note || (lang === "hi" ? "कोई नोट नहीं" : "No note")} • {ex.expense_date}</p>
            </div>
            <span className="font-extrabold text-rose-600">- ₹{ex.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}