'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CustomerLedgerPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (customerId) fetchLedgerData(); }, [customerId]);

  const fetchLedgerData = async () => {
    setLoading(true);
    const { data: custData } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (custData) setCustomer(custData);

    // 🔥 FIX: .gt('due_amount', 0) hata diya taaki saare bills dikhein
    const { data: salesData } = await supabase.from('sales').select('*').eq('customer_id', customerId);
    const { data: paymentsData } = await supabase.from('payments').select('*').eq('customer_id', customerId);

    let combined: any[] = [];
    
    // Opening Balance add karo
    if (custData && Number(custData.opening_balance) > 0) {
      combined.push({ type: 'sale', date: new Date(custData.created_at || new Date()), title: 'Opening Udhaar (Purana)', amount: Number(custData.opening_balance), due: Number(custData.opening_balance), id: 'opening' });
    }

    salesData?.forEach(s => combined.push({ type: 'sale', date: new Date(s.created_at), title: `Bill #${s.invoice_no}`, amount: Number(s.total_amount), due: Number(s.due_amount || 0), id: s.id }));
    paymentsData?.forEach(p => combined.push({ type: 'payment', date: new Date(p.created_at), title: `Payment (${p.payment_mode.toUpperCase()})`, amount: Number(p.amount), id: p.id }));

    combined.sort((a, b) => b.date.getTime() - a.date.getTime());
    setLedger(combined);
    setLoading(false);
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setSaving(true);
    const amountToPay = Number(payAmount);

    const { error: payError } = await supabase.from('payments').insert([{ business_id: customer.business_id, customer_id: customerId, amount: amountToPay, payment_mode: payMode }]);
    if (payError) { alert('Error: ' + payError.message); setSaving(false); return; }

    const newBalance = Number(customer.current_balance || 0) - amountToPay;
    await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId);
    
    setShowPayModal(false); setPayAmount(''); fetchLedgerData(); setSaving(false);
  };

  const filteredLedger = ledger.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.date.toLocaleDateString('en-IN').toLowerCase().includes(q) || item.amount.toString().includes(q);
  });
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="animate-pulse text-teal-600 font-bold">Loading Ledger...</p></div>;
  if (!customer) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-500 font-bold">Customer Not Found</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="text-slate-500 text-xl font-bold bg-slate-100 p-2 rounded-full w-9 h-9 flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold text-slate-800">Customer Ledger</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-20 h-20 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-3xl mx-auto border-4 border-white shadow-sm mb-3">{customer.name.charAt(0).toUpperCase()}</div>
            <h2 className="text-xl font-black text-slate-800">{customer.name}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">📞 {customer.phone}</p>
            
            <div className="mt-5 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center">
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Udhaar</p>
                <p className={`text-2xl font-black ${Number(customer.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{Number(customer.current_balance || 0).toFixed(2)}</p>
              </div>
              {Number(customer.current_balance) > 0 && (
                <button onClick={() => setShowPayModal(true)} className="bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition">Receive ₹</button>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-800 mb-3 px-1 uppercase tracking-wide">Transaction History</h3>
          <div className="relative mb-5">
            <input type="text" placeholder="Search Bill No, Date or Amount..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" />
            <span className="absolute left-3 top-3 text-slate-400">🔍</span>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
            {filteredLedger.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm font-medium bg-white rounded-xl border border-slate-100">Koi history nahi mili.</p>
            ) : (
              filteredLedger.map((item, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${item.type === 'sale' ? 'text-rose-500' : 'text-emerald-500'} relative z-10`}>{item.type === 'sale' ? '🛒' : '💰'}</div>
                  <div className="w-[calc(100%-3.5rem)] bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className={`text-sm font-black ${item.type === 'sale' ? 'text-rose-600' : 'text-emerald-600'}`}>{item.type === 'sale' ? '+' : '-'}₹{item.amount.toFixed(2)}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">{item.date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {item.type === 'sale' && item.due > 0 && <p className="text-[10px] text-rose-500 font-bold mt-2 bg-rose-50 inline-block px-2 py-0.5 rounded">Baki tha: ₹{item.due}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black text-slate-800 text-center mb-1">Receive Payment</h3>
            <p className="text-xs text-center text-rose-500 font-bold mb-5">Udhaar: ₹{customer.current_balance}</p>
            <form onSubmit={handleReceivePayment} className="space-y-4">
              <input type="number" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-2xl font-black text-slate-800 outline-none" placeholder="0" max={customer.current_balance} />
              <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"><option value="cash">Cash</option><option value="upi">UPI / Online</option></select>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md">{saving ? 'Saving...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}