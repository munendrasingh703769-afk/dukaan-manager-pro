"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendUdhaarWhatsApp } from "@/lib/whatsappUdhaar";
import Link from "next/link";

export default function UdhaarPage() {
  const supabase = createClient();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [tab, setTab] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [txType, setTxType] = useState<"UDHAAR" | "PAYMENT">("UDHAAR");
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanNum = (p: string) => p.replace(/\D/g, "").slice(-10);

  const loadData = async () => {
    const { data } = await supabase.from("udhaar_ledger").select("*").eq("party_type", tab).order("created_at", { ascending: false });
    if (data) setLedgers(data);
  };
  useEffect(() => { loadData(); }, [tab]);

  const recalcParty = async (digits: string) => {
    const { data } = await supabase.from("udhaar_ledger").select("*").eq("party_type", tab).eq("phone", digits).order("created_at", { ascending: true });
    if (!data) return;
    let running = 0;
    for (const row of data) {
      const oldB = running;
      const newB = row.tx_type === "UDHAAR" ? oldB + Number(row.amount) : oldB - Number(row.amount);
      running = newB;
      if (Number(row.old_balance) !== oldB || Number(row.new_balance) !== newB) {
        await supabase.from("udhaar_ledger").update({ old_balance: oldB, new_balance: newB }).eq("id", row.id);
      }
    }
  };

  const partyMap: Record<string, any> = {};
  for (const row of ledgers) {
    const k = cleanNum(row.phone);
    if (k && !partyMap[k]) partyMap[k] = row;
  }
  const uniqueParties = Object.values(partyMap);

  const handlePhoneChange = (val: string) => {
    const digits = cleanNum(val);
    setPhone(digits);
    if (!editId && digits.length === 10 && partyMap[digits]) setName(partyMap[digits].party_name);
  };

  const matchedParty = phone.length === 10 ? partyMap[phone] : null;
  const currentOldBal = matchedParty ? Number(matchedParty.new_balance) : 0;
  const previewNewBal = amount ? (txType === "UDHAAR" ? currentOldBal + Number(amount) : currentOldBal - Number(amount)) : currentOldBal;

  const startEdit = (item: any) => {
    setEditId(item.id);
    setName(item.party_name);
    setPhone(cleanNum(item.phone));
    setTxType(item.tx_type);
    setAmount(String(item.amount));
    setItems(item.item_details || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setName(""); setPhone(""); setAmount(""); setItems(""); };

  const handleDelete = async (item: any) => {
    const ok = confirm(lang === "hi" ? "क्या आप वाकई यह गलत एंट्री हटाना चाहते हैं? बाकी हिसाब अपने आप सही हो जाएगा।" : "Delete this wrong entry? Balance will auto-recalculate.");
    if (!ok) return;
    setLoading(true);
    await supabase.from("udhaar_ledger").delete().eq("id", item.id);
    await recalcParty(cleanNum(item.phone));
    await loadData();
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cleanNum(phone);
    if (!name.trim() || digits.length !== 10 || !amount) {
      alert(lang === "hi" ? "कृपया सही नाम और 10 अंकों का मोबाइल नंबर डालें" : "Enter valid name and 10-digit mobile number");
      return;
    }
    setLoading(true);
    const numAmt = Number(amount);
    if (editId) {
      await supabase.from("udhaar_ledger").update({ party_name: name.trim(), phone: digits, tx_type: txType, amount: numAmt, item_details: items }).eq("id", editId);
      await recalcParty(digits);
      cancelEdit();
      await loadData();
      setLoading(false);
      return;
    }
    const finalName = matchedParty ? matchedParty.party_name : name.trim();
    const newBal = txType === "UDHAAR" ? currentOldBal + numAmt : currentOldBal - numAmt;
    const { error } = await supabase.from("udhaar_ledger").insert([{
      party_type: tab, party_name: finalName, phone: digits, tx_type: txType,
      amount: numAmt, old_balance: currentOldBal, new_balance: newBal, item_details: items
    }]);
    if (error) { alert("Error: " + error.message); setLoading(false); return; }
    sendUdhaarWhatsApp(finalName, digits, tab, txType, currentOldBal, numAmt, items || (lang === "hi" ? "सामान" : "Items"), lang);
    setName(""); setPhone(""); setAmount(""); setItems("");
    await loadData();
    setLoading(false);
  };

  const filtered = ledgers.filter((x) => x.party_name.toLowerCase().includes(search.toLowerCase()) || cleanNum(x.phone).includes(search));
  const totalNet = uniqueParties.reduce((s: number, x: any) => s + Number(x.new_balance || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="p-2 bg-white rounded-full shadow-sm font-bold">←</Link>
          <h1 className="text-xl font-bold text-slate-800">{lang === "hi" ? "Udhaar & Pay खाता" : "Udhaar & Pay Ledger"}</h1>
        </div>
        <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-sm">
          {lang === "hi" ? "English" : "हिंदी"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm">
        <button onClick={() => { cancelEdit(); setTab("CUSTOMER"); }} className={`py-2.5 rounded-lg font-semibold text-sm ${tab === "CUSTOMER" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
          {lang === "hi" ? "👥 ग्राहक (माल बेचा)" : "👥 Customer (Sold)"}
        </button>
        <button onClick={() => { cancelEdit(); setTab("SUPPLIER"); }} className={`py-2.5 rounded-lg font-semibold text-sm ${tab === "SUPPLIER" ? "bg-amber-600 text-white" : "text-slate-600"}`}>
          {lang === "hi" ? "🚚 सप्लायर (माल लिया)" : "🚚 Supplier (Bought)"}
        </button>
      </div>
      <form onSubmit={handleSave} className={`p-4 rounded-2xl shadow-sm space-y-3 mb-5 border-2 ${editId ? "bg-amber-50 border-amber-400" : "bg-white border-transparent"}`}>
        {editId && (
          <div className="flex justify-between items-center text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg">
            <span>✏️ {lang === "hi" ? "गलत एंट्री सुधार मोड (Edit Mode)" : "Editing Wrong Entry"}</span>
            <button type="button" onClick={cancelEdit} className="underline text-red-600">{lang === "hi" ? "रद्द करें" : "Cancel"}</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTxType("UDHAAR")} className={`py-2 rounded-lg text-xs font-bold border ${txType === "UDHAAR" ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-slate-200"}`}>
            + {lang === "hi" ? (tab === "CUSTOMER" ? "उधार माल दिया" : "उधार माल लिया") : (tab === "CUSTOMER" ? "Credit Given" : "Credit Taken")}
          </button>
          <button type="button" onClick={() => setTxType("PAYMENT")} className={`py-2 rounded-lg text-xs font-bold border ${txType === "PAYMENT" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-200"}`}>
            - {lang === "hi" ? (tab === "CUSTOMER" ? "पैसा जमा (Receive)" : "पैसा दिया (Pay)") : (tab === "CUSTOMER" ? "Payment Received" : "Payment Paid")}
          </button>
        </div>
        <input type="tel" maxLength={10} placeholder={lang === "hi" ? "10 अंकों का मोबाइल नंबर (पहचान ID)" : "10-Digit Mobile Number (Unique ID)"} value={phone} onChange={(e) => handlePhoneChange(e.target.value)} readOnly={!!editId} className="w-full p-2.5 bg-white border rounded-xl text-sm font-semibold" required />
        <input placeholder={lang === "hi" ? (tab === "CUSTOMER" ? "ग्राहक का नाम" : "सप्लायर का नाम") : (tab === "CUSTOMER" ? "Customer Name" : "Supplier Name")} value={name} onChange={(e) => setName(e.target.value)} readOnly={!editId && !!matchedParty} className={`w-full p-2.5 border rounded-xl text-sm ${!editId && matchedParty ? "bg-emerald-50 font-bold text-emerald-900" : "bg-white"}`} required />
        {!editId && phone.length === 10 && (
          <div className="text-xs px-3 py-2 rounded-xl bg-slate-100 flex justify-between items-center">
            <span>{matchedParty ? (lang === "hi" ? `✅ पुराना खाता (${matchedParty.party_name})` : `✅ Existing (${matchedParty.party_name})`) : (lang === "hi" ? "🆕 नया खाता बनेगा" : "🆕 New Account")}</span>
            <span className="font-bold">{lang === "hi" ? "पुराना" : "Prev"}: ₹{currentOldBal} → {lang === "hi" ? "नया" : "New"}: ₹{previewNewBal}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder={lang === "hi" ? "रकम (₹)" : "Amount (₹)"} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-sm" required />
          <input placeholder={lang === "hi" ? "आइटम विवरण" : "Item Details"} value={items} onChange={(e) => setItems(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-sm" />
        </div>
        <button disabled={loading} className={`w-full py-3 text-white font-bold rounded-xl text-sm ${editId ? "bg-amber-600" : "bg-emerald-700"}`}>
          {loading ? (lang === "hi" ? "अपडेट हो रहा है..." : "Updating...") : editId ? (lang === "hi" ? "✅ सुधार सेव करें (Auto Recalculate)" : "✅ Update Entry & Recalculate") : (lang === "hi" ? "📲 सेव करें और WhatsApp भेजें" : "📲 Save & Send WhatsApp")}
        </button>
      </form>
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl mb-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-300">{lang === "hi" ? (tab === "CUSTOMER" ? "कुल ग्राहक बकाया (लेना है)" : "कुल सप्लायर बकाया (देना है)") : (tab === "CUSTOMER" ? "Total Customer Receivable" : "Total Supplier Payable")}</p>
          <p className="text-xl font-extrabold text-emerald-400">₹{totalNet}</p>
        </div>
        <span className="text-xs bg-white/10 px-2.5 py-1 rounded-lg">{uniqueParties.length} {lang === "hi" ? "पार्टी" : "Parties"} • {filtered.length} {lang === "hi" ? "एंट्री" : "Entries"}</span>
      </div>
      <input placeholder={lang === "hi" ? "🔍 नाम या मोबाइल नंबर से खोजें..." : "🔍 Search by name or phone..."} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-sm mb-3" />
      <div className="space-y-2.5">
        {filtered.map((item) => (
          <div key={item.id} onClick={() => handlePhoneChange(item.phone)} className="bg-white p-3.5 rounded-xl shadow-sm border flex justify-between items-start cursor-pointer">
            <div>
              <p className="font-bold text-slate-800">{item.party_name} <span className="text-xs text-slate-500">({cleanNum(item.phone)})</span></p>
              <p className="text-xs text-slate-500">{item.item_details || (lang === "hi" ? "पेमेंट एंट्री" : "Payment Entry")} • {new Date(item.created_at).toLocaleString("en-IN")}</p>
              <p className="text-xs mt-1">{lang === "hi" ? "पुराना" : "Prev"}: ₹{item.old_balance} | <span className={item.tx_type === "UDHAAR" ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{item.tx_type === "UDHAAR" ? `+₹${item.amount}` : `-₹${item.amount}`}</span></p>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(item); }} className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-200">✏️ Edit</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-200">🗑️ Delete</button>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">{lang === "hi" ? "कुल शेष" : "Balance"}</span>
              <span className="text-base font-extrabold text-emerald-700 block">₹{item.new_balance}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); sendUdhaarWhatsApp(item.party_name, cleanNum(item.phone), tab, item.tx_type, Number(item.old_balance), Number(item.amount), item.item_details || "सामान", lang); }} className="mt-1.5 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">📲 WhatsApp</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}