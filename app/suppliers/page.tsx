"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SuppliersPage() {
  const supabase = createClient();
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");

  const load = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    if (data) setList(data);
  };
  useEffect(() => { load(); }, []);

  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    await supabase.from("suppliers").insert([{ name, phone, gstin, address }]);
    setName(""); setPhone(""); setGstin(""); setAddress("");
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/owner" className="p-2 bg-white rounded-full shadow-sm font-bold">←</Link>
        <h1 className="text-xl font-bold text-slate-800">Suppliers (सप्लायर सूची)</h1>
      </div>
      <form onSubmit={addSupplier} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 mb-5">
        <input placeholder="सप्लायर / कंपनी का नाम" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="मोबाइल नंबर" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
          <input placeholder="GSTIN (वैकल्पिक)" value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
        </div>
        <input placeholder="पता / शहर" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
        <button className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl">+ सप्लायर जोड़ें</button>
      </form>
      <div className="space-y-2.5">
        {list.map((s) => (
          <div key={s.id} className="bg-white p-3.5 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">🚚 {s.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">📞 {s.phone} {s.gstin ? `• GST: ${s.gstin}` : ""}</p>
              {s.address && <p className="text-xs text-slate-400">{s.address}</p>}
            </div>
            <Link href="/udhaar" className="text-xs bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-200">खाता देखें</Link>
          </div>
        ))}
      </div>
    </div>
  );
}