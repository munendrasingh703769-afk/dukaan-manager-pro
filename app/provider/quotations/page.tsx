'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Quotation = {
  id: string; customer_name: string; customer_phone: string;
  requirement: string; details: string; status: string;
  quoted_amount: number; labour_charge: number; items: any[]; provider_reply: string;
}

export default function ProviderQuotationsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false); // Naya state manual entry ke liye
  
  // Form States
  const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '', requirement: '' });
  const [labourCharge, setLabourCharge] = useState<number | ''>('');
  const [replyMessage, setReplyMessage] = useState('');
  const [items, setItems] = useState([{ name: '', qty: 1, price: 0, gst: 0 }]);

  const fetchQuotations = async () => {
    if (!activeId) return;
    setLoading(true);
    
    // Fetch quotes where provider is not assigned yet OR assigned to this provider
    const { data } = await supabase
      .from('quotations')
      .select('*')
      .or(`provider_business_id.is.null,provider_business_id.eq.${activeId}`)
      .order('created_at', { ascending: false });

    if (data) setQuotations(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchQuotations(); }, [activeId]);

  // --- OPEN MODAL FOR NEW MANUAL QUOTE ---
  const openNewQuoteModal = () => {
    setSelectedQuote(null);
    setIsManualEntry(true);
    setManualCustomer({ name: '', phone: '', requirement: '' });
    setLabourCharge('');
    setReplyMessage('');
    setItems([{ name: '', qty: 1, price: 0, gst: 0 }]);
    setIsModalOpen(true);
  };

  // --- OPEN MODAL FOR EXISTING REQUEST ---
  const openExistingQuoteModal = (q: Quotation) => {
    setSelectedQuote(q);
    setIsManualEntry(false);
    setLabourCharge('');
    setReplyMessage('');
    setItems([{ name: '', qty: 1, price: 0, gst: 0 }]);
    setIsModalOpen(true);
  };

  // --- ITEM HANDLERS ---
  const handleAddItem = () => setItems([...items, { name: '', qty: 1, price: 0, gst: 0 }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // --- CALCULATE TOTAL ---
  const calculateTotal = () => {
    let total = Number(labourCharge) || 0;
    items.forEach(item => {
      const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
      const gstAmount = itemTotal * ((Number(item.gst) || 0) / 100);
      total += itemTotal + gstAmount;
    });
    return total;
  };

  // --- SUBMIT QUOTE ---
  const handleSendQuote = async () => {
    const total = calculateTotal();
    const filteredItems = items.filter(i => i.name.trim() !== '');

    if (isManualEntry) {
      if (!manualCustomer.name || !manualCustomer.phone || !manualCustomer.requirement) {
        return alert("Customer Name, Phone, and Requirement are mandatory!");
      }

      // Save new manual quote
      const { error } = await supabase.from('quotations').insert([{
        business_id: activeId, // Customer side business_id
        provider_business_id: activeId, // This provider
        customer_name: manualCustomer.name,
        customer_phone: manualCustomer.phone,
        requirement: manualCustomer.requirement,
        quoted_amount: total,
        labour_charge: Number(labourCharge) || 0,
        items: filteredItems,
        provider_reply: replyMessage,
        status: 'quoted'
      }]);

      if (!error) {
        alert("Quotation Created Successfully!");
        setIsModalOpen(false);
        fetchQuotations();
      } else {
        alert("Error: " + error.message);
      }

    } else {
      // Update existing customer request
      if (!selectedQuote) return;
      const { error } = await supabase.from('quotations').update({
        quoted_amount: total,
        labour_charge: Number(labourCharge) || 0,
        items: filteredItems,
        provider_reply: replyMessage,
        provider_business_id: activeId,
        status: 'quoted'
      }).eq('id', selectedQuote.id);

      if (!error) {
        alert("Quotation Sent Successfully!");
        setIsModalOpen(false);
        fetchQuotations();
      } else {
        alert("Error: " + error.message);
      }
    }
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Quotations...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quotations / Estimates</h1>
          <p className="text-sm text-gray-500">Send and manage customer estimates</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchQuotations} className="flex-1 md:flex-none bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">🔄 Refresh</button>
          <button onClick={openNewQuoteModal} className="flex-1 md:flex-none bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-600">+ New Quotation</button>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-gray-800 font-bold text-lg">Koi quotation request nahi aayi hai.</p>
          <p className="text-gray-500 text-sm mt-1">Aap upar "+ New Quotation" button se naya bana sakte hain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotations.map((q) => (
            <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{q.requirement}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{q.details || 'No extra details'}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${q.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {q.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p><b>Name:</b> {q.customer_name}</p>
                <p><b>Phone:</b> {q.customer_phone}</p>
              </div>

              {q.status === 'pending' ? (
                <button 
                  onClick={() => openExistingQuoteModal(q)} 
                  className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition"
                >
                  Create Estimate
                </button>
              ) : (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <p className="text-sm text-green-700 font-bold mb-1">Quoted Amount: ₹{q.quoted_amount}</p>
                  <p className="text-xs text-green-600">Labour: ₹{q.labour_charge}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= QUOTATION MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {isManualEntry ? 'Create New Quotation' : 'Send Estimate'}
            </h2>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2 mt-4">
              
              {/* Customer Details (Only for manual entry) */}
              {isManualEntry && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div>
                    <label className="text-xs font-bold text-gray-700">Customer Name *</label>
                    <input type="text" value={manualCustomer.name} onChange={e => setManualCustomer({...manualCustomer, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm mt-1" placeholder="e.g. Ramesh" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Phone *</label>
                    <input type="text" value={manualCustomer.phone} onChange={e => setManualCustomer({...manualCustomer, phone: e.target.value})} className="w-full p-2 border rounded-lg text-sm mt-1" placeholder="e.g. 9876543210" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-700">Requirement *</label>
                    <input type="text" value={manualCustomer.requirement} onChange={e => setManualCustomer({...manualCustomer, requirement: e.target.value})} className="w-full p-2 border rounded-lg text-sm mt-1" placeholder="e.g. AC Gas Filling" />
                  </div>
                </div>
              )}

              {/* Items Section */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Products / Spare Parts</label>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <input type="text" placeholder="Item Name" value={item.name} onChange={e => handleUpdateItem(idx, 'name', e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
                    <input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => handleUpdateItem(idx, 'qty', Number(e.target.value))} className="w-16 p-2 border rounded-lg text-sm text-center" />
                    <input type="number" placeholder="₹ Rate" value={item.price || ''} onChange={e => handleUpdateItem(idx, 'price', Number(e.target.value))} className="w-20 p-2 border rounded-lg text-sm text-right" />
                    <select value={item.gst} onChange={e => handleUpdateItem(idx, 'gst', Number(e.target.value))} className="w-24 p-2 border rounded-lg text-sm bg-white">
                      <option value={0}>No GST</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                    </select>
                    <button onClick={() => handleRemoveItem(idx)} className="text-red-500 font-bold px-2 hover:bg-red-50 rounded">✕</button>
                  </div>
                ))}
                <button onClick={handleAddItem} className="text-sm font-bold text-blue-600 hover:underline">+ Add Another Item</button>
              </div>

              <hr className="border-gray-200" />

              {/* Labour & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Labour / Visit Charge (₹)</label>
                  <input type="number" placeholder="e.g. 200" value={labourCharge} onChange={e => setLabourCharge(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Message / Terms</label>
                  <input type="text" placeholder="e.g. 1 month warranty" value={replyMessage} onChange={e => setReplyMessage(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>

            {/* Total & Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <span className="font-bold text-gray-700">Grand Total (Incl. GST):</span>
                <span className="text-2xl font-black text-orange-600">₹{calculateTotal().toFixed(2)}</span>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200">Cancel</button>
                <button onClick={handleSendQuote} className="flex-1 bg-orange-500 py-3 rounded-xl font-bold text-white hover:bg-orange-600 shadow-md">
                  {isManualEntry ? 'Save Quotation' : 'Send Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}