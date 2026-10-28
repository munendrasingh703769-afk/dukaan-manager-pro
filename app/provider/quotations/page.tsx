'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Quotation = {
  id: string; customer_name: string; customer_phone: string;
  requirement: string; details: string; status: string;
  quoted_amount: number; labour_charge: number; items: any[]; provider_reply: string;
  created_at: string;
}

export default function ProviderQuotationsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  
  // Form States
  const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '', requirement: '' });
  const [labourCharge, setLabourCharge] = useState<number | ''>('');
  const [replyMessage, setReplyMessage] = useState('');
  const [items, setItems] = useState([{ name: '', qty: 1, price: 0, gst: 0 }]);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);
    
    const { data: bizData } = await supabase.from('businesses').select('*').eq('id', activeId).single();
    if (bizData) setBusiness(bizData);

    const { data } = await supabase
      .from('quotations')
      .select('*')
      .or(`provider_business_id.is.null,provider_business_id.eq.${activeId}`)
      .order('created_at', { ascending: false });

    if (data) setQuotations(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- OPEN MODALS ---
  const openNewQuoteModal = () => {
    setSelectedQuote(null);
    setIsManualEntry(true);
    setManualCustomer({ name: '', phone: '', requirement: '' });
    setLabourCharge('');
    setReplyMessage('');
    setItems([{ name: '', qty: 1, price: 0, gst: 0 }]);
    setIsModalOpen(true);
  };

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
      const { error } = await supabase.from('quotations').insert([{
        business_id: activeId,
        provider_business_id: activeId,
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
        fetchData();
      } else alert("Error: " + error.message);

    } else {
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
        fetchData();
      } else alert("Error: " + error.message);
    }
  };

  // --- WHATSAPP SHARE ---
  const handleWhatsAppShare = (quote: Quotation) => {
    const message = `*Quotation from ${business?.name || 'VyapaarSetu'}*\n\n` +
      `*Req:* ${quote.requirement}\n` +
      `*Total Amount:* ₹${quote.quoted_amount}\n` +
      `*Labour Charge:* ₹${quote.labour_charge}\n\n` +
      `*Note:* ${quote.provider_reply || 'Thank you!'}\n\n` +
      `Please check your app to accept/reject this quotation.`;
      
    const url = `https://wa.me/91${quote.customer_phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- PRINT PDF ---
  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Quotations...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER (Hide while printing) */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quotations / Estimates</h1>
          <p className="text-sm text-gray-500">Send and manage customer estimates</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchData} className="flex-1 md:flex-none bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">🔄 Refresh</button>
          <button onClick={openNewQuoteModal} className="flex-1 md:flex-none bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-orange-600">+ New Quotation</button>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="print:hidden text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-gray-800 font-bold text-lg">Koi quotation request nahi aayi hai.</p>
        </div>
      ) : (
        <div className="print:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <button onClick={() => openExistingQuoteModal(q)} className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition">
                  Create Estimate
                </button>
              ) : (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-3">
                  <div>
                    <p className="text-sm text-green-700 font-bold mb-1">Total: ₹{q.quoted_amount}</p>
                    <p className="text-xs text-green-600">Labour: ₹{q.labour_charge}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedQuote(q); setIsViewModalOpen(true); }} className="flex-1 bg-white text-gray-700 border border-gray-200 py-1.5 rounded text-xs font-bold">View / Print</button>
                    <button onClick={() => handleWhatsAppShare(q)} className="flex-1 bg-green-500 text-white py-1.5 rounded text-xs font-bold">WhatsApp</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= CREATE MODAL (Same as before, hidden in print) ================= */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
           {/* ... (Pura create modal code yahan rahega jo pehle tha) ... */}
           <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{isManualEntry ? 'Create New Quotation' : 'Send Estimate'}</h2>
            <div className="overflow-y-auto flex-1 space-y-4 pr-2 mt-4">
              {isManualEntry && (
                <div className="grid grid-cols-2 gap-3 bg-blue-50 p-4 rounded-xl">
                  <input type="text" placeholder="Customer Name *" value={manualCustomer.name} onChange={e => setManualCustomer({...manualCustomer, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Phone *" value={manualCustomer.phone} onChange={e => setManualCustomer({...manualCustomer, phone: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                  <input type="text" placeholder="Requirement *" value={manualCustomer.requirement} onChange={e => setManualCustomer({...manualCustomer, requirement: e.target.value})} className="w-full p-2 border rounded-lg text-sm col-span-2" />
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Labour Charge (₹)" value={labourCharge} onChange={e => setLabourCharge(Number(e.target.value))} className="w-full p-3 border rounded-xl" />
                <input type="text" placeholder="Message / Terms" value={replyMessage} onChange={e => setReplyMessage(e.target.value)} className="w-full p-3 border rounded-xl" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4 bg-orange-50 p-4 rounded-xl">
                <span className="font-bold text-gray-700">Total:</span>
                <span className="text-2xl font-black text-orange-600">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
                <button onClick={handleSendQuote} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW / PRINT MODAL ================= */}
      {isViewModalOpen && selectedQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] print:bg-white print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:w-full">
            
            {/* INVOICE BODY (This area will be printed) */}
            <div id="printable-invoice">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-800">{business?.name || 'My Business'}</h1>
                  <p className="text-sm text-gray-500">{business?.address || 'Address'}, {business?.city}</p>
                  <p className="text-sm text-gray-500">Phone: {business?.phone || 'N/A'}</p>
                  <p className="text-sm text-gray-500">GSTIN: {business?.gst_number || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">Quotation</h2>
                  <p className="text-sm font-mono text-gray-600">#{selectedQuote.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">Date: {new Date(selectedQuote.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-6 bg-gray-50 p-3 rounded-lg print:bg-white print:border print:border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Bill To:</h3>
                <p className="font-bold text-gray-800">{selectedQuote.customer_name}</p>
                <p className="text-sm text-gray-600">Phone: {selectedQuote.customer_phone}</p>
                <p className="text-sm text-gray-600">Req: {selectedQuote.requirement}</p>
              </div>

              {/* Items Table */}
              <table className="w-full text-left mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300 text-sm text-gray-600">
                    <th className="py-2">Item Name</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">GST</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuote.items?.map((item, idx) => {
                    const itemTotal = item.qty * item.price;
                    return (
                      <tr key={idx} className="border-b border-gray-100 text-sm text-gray-800">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-center">{item.qty}</td>
                        <td className="py-2 text-right">₹{item.price}</td>
                        <td className="py-2 text-right">{item.gst}%</td>
                        <td className="py-2 text-right font-bold">₹{(itemTotal + (itemTotal * item.gst / 100)).toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-1/2 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Labour Charge:</span>
                    <span>₹{selectedQuote.labour_charge}</span>
                  </div>
                  <div className="flex justify-between font-black text-lg text-gray-800 border-t-2 border-gray-300 pt-2">
                    <span>Grand Total:</span>
                    <span>₹{selectedQuote.quoted_amount}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Terms */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Terms & Conditions:</h3>
                <p className="text-xs text-gray-500">{business?.terms || selectedQuote.provider_reply || 'Valid for 7 days.'}</p>
              </div>
            </div>

            {/* Action Buttons (Hide in print) */}
            <div className="print:hidden flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setIsViewModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Close</button>
              <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                🖨️ Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}