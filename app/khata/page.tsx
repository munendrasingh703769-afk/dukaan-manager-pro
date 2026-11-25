"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function MutualKhataPage() {
  const supabase = createClient();
  const [lang, setLang] = useState<"hi" | "en">("hi");
  const [myUser, setMyUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myBiz, setMyBiz] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [txType, setTxType] = useState<"GAVE" | "GOT">("GAVE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const cleanPhone = (ph: string) => (ph || "").replace(/\D/g, "").slice(-10);

  const loadKhata = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyUser(user);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setMyProfile(prof);

    const { data: biz } = await supabase.from("businesses").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
    setMyBiz(biz);

    const myPh = cleanPhone(prof?.phone || biz?.phone || user.phone || "");
    let query = supabase.from("mutual_khata").select("*").order("tx_date", { ascending: false }).limit(200);
    if (myPh) {
      query = query.or(`creator_user_id.eq.${user.id},creator_phone.eq.${myPh},party_phone.eq.${myPh}`);
    } else {
      query = query.eq("creator_user_id", user.id);
    }
    const { data: rows } = await query;
    if (rows) setEntries(rows);
    setLoading(false);
  };

  useEffect(() => { loadKhata(); }, []);

  const myPhone10 = cleanPhone(myProfile?.phone || myBiz?.phone || myUser?.phone || "");
  const myDisplayName = myBiz?.name || myProfile?.full_name || "VyapaarSetu User";

  // Normalize every transaction from current user's perspective
  const normalized = entries.map((row) => {
    const isCreator = row.creator_user_id === myUser?.id || (myPhone10 && cleanPhone(row.creator_phone) === myPhone10);
    const otherName = isCreator ? row.party_name : row.creator_name;
    const otherPhone = cleanPhone(isCreator ? row.party_phone : row.creator_phone);
    // If I am creator: GAVE means they owe me (+), GOT means I received (-)
    // If other person created it against my phone: their GAVE means I owe them (-), their GOT means I paid them (+)
    const signedAmount = isCreator
      ? (row.tx_type === "GAVE" ? Number(row.amount) : -Number(row.amount))
      : (row.tx_type === "GAVE" ? -Number(row.amount) : Number(row.amount));
    return { ...row, isCreator, otherName, otherPhone, signedAmount };
  });

  // Group by party phone
  const partiesMap: Record<string, { name: string; phone: string; balance: number; list: any[] }> = {};
  for (const item of normalized) {
    const key = item.otherPhone || item.otherName;
    if (!partiesMap[key]) partiesMap[key] = { name: item.otherName, phone: item.otherPhone, balance: 0, list: [] };
    partiesMap[key].balance += item.signedAmount;
    partiesMap[key].list.push(item);
  }
  const partyList = Object.values(partiesMap);
  const totalToGet = partyList.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const totalToGive = partyList.filter((p) => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const ph10 = cleanPhone(partyPhone);
    if (!partyName.trim() || ph10.length < 10 || !Number(amount)) {
      return alert(lang === "hi" ? "कृपया सही नाम, 10 अंकों का मोबाइल नंबर और रकम डालें" : "Enter valid name, 10-digit phone & amount");
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("mutual_khata").insert([{
        creator_user_id: myUser?.id,
        creator_business_id: myBiz?.id || null,
        creator_name: myDisplayName,
        creator_phone: myPhone10 || ph10,
        party_name: partyName.trim(),
        party_phone: ph10,
        tx_type: txType,
        amount: Number(amount),
        note: note.trim()
      }]);
      if (error) throw error;
      alert(lang === "hi" ? "✅ एंट्री सेव हो गई और दोनों के ऐप पर लाइव सिंक हो गई!" : "✅ Entry saved & synced on both apps!");
      setAmount(""); setNote("");
      await loadKhata();
    } catch (err: any) { alert("Error: " + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Loading Digital Khata...</div>;

  const activeParty = selectedPhone ? partyList.find((p) => p.phone === selectedPhone) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-base font-black">{lang === "hi" ? "📒 आपसी डिजिटल उधार खाता (Live Sync)" : "📒 Mutual Digital Khata"}</h1>
            <p className="text-[11px] text-blue-200">{lang === "hi" ? "दुकानदार-ग्राहक और आपसी दोस्तों का उधार दोनों के ऐप पर दिखेगा" : "Synced live between Customer, Provider & Friends"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLang(lang === "hi" ? "en" : "hi")} className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold">{lang === "hi" ? "English" : "हिंदी"}</button>
            <Link href={myBiz ? "/provider" : "/customer"} className="px-3 py-1 bg-amber-400 text-slate-900 rounded-full text-xs font-extrabold">← Home</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500">{lang === "hi" ? "आपको लेना है (You Will Get)" : "You Will Get"}</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">₹{totalToGet.toFixed(0)}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500">{lang === "hi" ? "आपको देना है (You Will Give)" : "You Will Give"}</p>
            <p className="text-xl font-black text-rose-600 mt-0.5">₹{totalToGive.toFixed(0)}</p>
          </div>
        </div>

        <form onSubmit={handleSaveEntry} className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase">{lang === "hi" ? "➕ नया लेनदेन दर्ज करें (दुकानदार या दोस्त)" : "➕ Add New Udhaar Entry"}</h2>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setTxType("GAVE")} className={`py-2 rounded-lg text-xs font-extrabold ${txType === "GAVE" ? "bg-rose-600 text-white" : "text-slate-600"}`}>
              {lang === "hi" ? "📤 मैंने दिए (उधार दिया)" : "📤 You Gave (Credit)"}
            </button>
            <button type="button" onClick={() => setTxType("GOT")} className={`py-2 rounded-lg text-xs font-extrabold ${txType === "GOT" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
              {lang === "hi" ? "📥 मैंने लिए (जमा / उधार लिया)" : "📥 You Got (Received)"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder={lang === "hi" ? "व्यक्ति / दुकान का नाम *" : "Person / Shop Name *"} value={partyName} onChange={(e) => setPartyName(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
            <input type="tel" maxLength={10} placeholder={lang === "hi" ? "10 अंक मोबाइल नंबर *" : "10-digit Mobile *"} value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} className="p-2.5 border rounded-xl text-xs" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="any" min="1" placeholder="Amount ₹ *" value={amount} onChange={(e) => setAmount(e.target.value)} className="p-2.5 border rounded-xl text-xs font-bold" required />
            <input placeholder={lang === "hi" ? "विवरण (जैसे: राशन / दोस्त उधार)" : "Note (Optional)"} value={note} onChange={(e) => setNote(e.target.value)} className="p-2.5 border rounded-xl text-xs" />
          </div>
          <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm">
            {saving ? "Syncing..." : (lang === "hi" ? "✅ सेव करें (दोनों के ऐप पर सिंक होगा)" : "✅ Save & Sync Live")}
          </button>
        </form>

        {activeParty ? (
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <button onClick={() => setSelectedPhone(null)} className="text-xs font-bold text-blue-600">← सभी खाते देखें</button>
                <h3 className="font-extrabold text-sm text-slate-900 mt-1">{activeParty.name} ({activeParty.phone})</h3>
              </div>
              <a href={`https://wa.me{activeParty.phone}?text=${encodeURIComponent(`*VyapaarSetu Digital Khata*\nNamaste ${activeParty.name},\n${activeParty.balance >= 0 ? `Aap par ₹${activeParty.balance} lena baki hai.` : `Aapko ₹${Math.abs(activeParty.balance)} dena baki hai.`}\nLive hisab VyapaarSetu app par dekhein.`)}`} target="_blank" className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                📲 WhatsApp
              </a>
            </div>
            <div className="space-y-2">
              {activeParty.list.map((tx: any) => (
                <div key={tx.id} className="p-2.5 bg-slate-50 rounded-xl border flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{tx.note || (tx.signedAmount >= 0 ? "उधार दिया / लेना है" : "उधार लिया / देना है")}</p>
                    <p className="text-[10px] text-slate-400">{new Date(tx.tx_date).toLocaleString("en-IN")} • {tx.isCreator ? "आपने दर्ज किया" : `${tx.creator_name} ने दर्ज किया`}</p>
                  </div>
                  <span className={`font-black text-sm ${tx.signedAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {tx.signedAmount >= 0 ? `+₹${tx.signedAmount}` : `-₹${Math.abs(tx.signedAmount)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2.5">
            <h2 className="text-sm font-extrabold text-slate-800 border-b pb-2">{lang === "hi" ? `👥 सभी उधार खाते (${partyList.length})` : `👥 All Khata Accounts (${partyList.length})`}</h2>
            {partyList.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">अभी तक कोई उधार खाता रिकॉर्ड नहीं है।</p> : partyList.map((p) => (
              <div key={p.phone || p.name} onClick={() => { setSelectedPhone(p.phone); setPartyName(p.name); setPartyPhone(p.phone); }} className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border flex justify-between items-center cursor-pointer">
                <div>
                  <p className="font-extrabold text-xs text-slate-800">{p.name}</p>
                  <p className="text-[11px] text-slate-500">📱 {p.phone} • {p.list.length} entries</p>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm block ${p.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ₹{Math.abs(p.balance).toFixed(0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{p.balance >= 0 ? "लेना है (Get)" : "देना है (Give)"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
