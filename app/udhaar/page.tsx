"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendUdhaarWhatsApp } from "@/lib/whatsappUdhaar";
import Link from "next/link";

export default function UdhaarPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [txType, setTxType] = useState<"UDHAAR" | "PAYMENT">("UDHAAR");
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const { data } = await supabase.from("udhaar_ledger").select("*").eq("party_type", tab).order("created_at", { ascending: false });
    if (data) setLedgers(data);
  };
  useEffect(() => { loadData(); }, [tab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !amount) return;
    setLoading(true);
    const numAmt = Number(amount);
    const prev = ledgers.find((x) => x.phone === phone || x.party_name.toLowerCase() === name.toLowerCase());
    const oldBal = prev ? Number(prev.new_balance) : 0;
    const newBal = sendUdhaarWhatsApp(name, phone, tab, txType, oldBal, numAmt, items || "सामान");
    await supabase.from("udhaar_ledger").insert([{
      party_type: tab, party_name: name, phone, tx_type: txType,
      amount: numAmt, old_balance: oldBal, new_balance: newBal, item_details: items
    }]);
    setName(""); setPhone(""); setAmount(""); setItems("");
    await loadData();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/owner" className="p-2 bg-white rounded-full shadow-sm font-bold">←</Link>
        <h1 className="text-xl font-bold text-slate-800">Udhaar & Pay खाता</h1>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm">
        <button onClick={() => setTab("CUSTOMER")} className={`py-2.5 rounded-lg font-semibold ${tab === "CUSTOMER" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
          👥 ग्राहक (माल बेचा)
        </button>
        <button onClick={() => setTab("SUPPLIER")} className={`py-2.5 rounded-lg font-semibold ${tab === "SUPPLIER" ? "bg-amber-600 text-white" : "text-slate-600"}`}>
          🚚 सप्लायर (माल लिया)
        </button>
      </div>
      <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 mb-5">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTxType("UDHAAR")} className={`py-2 rounded-lg text-sm font-bold border ${txType === "UDHAAR" ? "bg-red-50 border-red-500 text-red-700" : "border-slate-200"}`}>
            + {tab === "CUSTOMER" ? "उधार माल दिया" : "उधार माल लिया"}
          </button>
          <button type="button" onClick={() => setTxType("PAYMENT")} className={`py-2 rounded-lg text-sm font-bold border ${txType === "PAYMENT" ? "bg-green-50 border-green-500 text-green-700" : "border-slate-200"}`}>
            - {tab === "CUSTOMER" ? "पैसा जमा (Receive)" : "पैसा दिया (Pay)"}
          </button>
        </div>
        <input placeholder={tab === "CUSTOMER" ? "ग्राहक का नाम" : "सप्लायर का नाम"} value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
        <input placeholder="मोबाइल नंबर (WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="रकम (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" required />
          <input placeholder="आइटम विवरण (जैसे 2 बोरी चीनी)" value={items} onChange={(e) => setItems(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
        </div>
        <button disabled={loading} className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl">
          📲 {loading ? "सेव हो रहा है..." : "सेव करें और WhatsApp भेजें"}
        </button>
      </form>
      <div className="space-y-2.5">
        {ledgers.map((item) => (
          <div key={item.id} onClick={() => { setName(item.party_name); setPhone(item.phone); }} className="bg-white p-3.5 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer">
            <div>
              <p className="font-bold text-slate-800">{item.party_name} <span className="text-xs text-slate-400">({item.phone})</span></p>
              <p className="text-xs text-slate-500">{item.item_details || "पेमेंट एंट्री"} • {new Date(item.created_at).toLocaleString("en-IN")}</p>
              <p className="text-xs mt-1">पुराना: ₹{item.old_balance} | {item.tx_type === "UDHAAR" ? `+₹${item.amount}` : `-₹${item.amount}`}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">कुल शेष</span>
              <span className="text-base font-extrabold text-emerald-700">₹{item.new_balance}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}