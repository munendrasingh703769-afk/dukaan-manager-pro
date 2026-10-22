'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessId } from '@/lib/business';

export default function CustomersPage() {
  const supabase = createClient();
  const router = useRouter();
  const activeId = getCurrentBusinessId();

  // Tabs State
  const [activeTab, setActiveTab] = useState<'customers' | 'create_doc'>('customers');
  const [salesOrQuoteTab, setSalesOrQuoteTab] = useState<'sale' | 'quotation'>('sale');
  
  // Customers Data & Search State
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); 
  const [gstNumber, setGstNumber] = useState(''); 
  const [address, setAddress] = useState('');
  const [openingUdhaar, setOpeningUdhaar] = useState('0');

  // Create Document (Sale/Quote) State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState('18'); 

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');

  useEffect(() => {
    if (activeId) fetchCustomers();
  }, [activeId]);

  // 1. Fetch Customers
  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', activeId)
      .order('created_at', { ascending: false });
      
    if (data) setCustomers(data);
    setLoading(false);
  };

  // 2. Save New Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return alert('Name & Phone are required!');
    
    setLoading(true);
    const { error } = await supabase.from('customers').insert([{ 
      business_id: activeId,
      name, 
      phone, 
      email: email.trim() || null, 
      gst_number: gstNumber.trim() || null, 
      address: address || 'Not Provided', 
      opening_balance: parseFloat(openingUdhaar) || 0,
      current_balance: parseFloat(openingUdhaar) || 0
    }]);

    if (error) {
      alert('Error: ' + error.message);
    } else { 
      alert('Customer Saved Successfully!'); 
      setName(''); setPhone(''); setEmail(''); setGstNumber(''); setAddress(''); setOpeningUdhaar('0'); 
      fetchCustomers(); 
    }
    setLoading(false);
  }; 

  // 3. Receive Payment (Udhaar Vasooli)
  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal || !payAmount) return;
    
    const amountToPay = Number(payAmount);
    if (amountToPay <= 0) return alert('Amount 0 se bada hona chahiye');

    setLoading(true);

    // Payment Record Save karo
    const { error: payError } = await supabase.from('payments').insert([{
      business_id: activeId,
      customer_id: paymentModal.id,
      amount: amountToPay,
      payment_mode: payMode
    }]);

    if (payError) {
      alert('Error saving payment: ' + payError.message);
      setLoading(false);
      return;
    }

    // Customer ka Current Balance kam karo
    const newBalance = Number(paymentModal.current_balance || 0) - amountToPay;
    const { error: custError } = await supabase.from('customers')
      .update({ current_balance: newBalance })
      .eq('id', paymentModal.id);

    if (custError) {
      alert('Error updating balance: ' + custError.message);
    } else {
      alert(`₹${amountToPay} received successfully!`);
      setPaymentModal(null);
      setPayAmount('');
      fetchCustomers(); 
    }
    setLoading(false);
  };

  // 4. Create Sale or Quotation
  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || !itemName) return alert('Please fill all details!');
    
    setLoading(true);
    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    
    if (salesOrQuoteTab === 'sale') {
      const invoiceNo = `INV-${new Date().getTime().toString().slice(-6)}`;
      const { error } = await supabase.from('sales').insert([{ 
        business_id: activeId,
        customer_id: selectedCustomerId, 
        customer_name: selectedCust?.name, 
        invoice_no: invoiceNo,
        total_amount: parseFloat(amount), 
        paid_amount: parseFloat(amount), 
        due_amount: 0,
        payment_method: 'cash',
        status: 'paid'
      }]);
      if (error) alert('Error: ' + error.message);
      else alert('Sale Bill Created!'); 
    } else {
      const quoteNo = `QT-${new Date().getTime().toString().slice(-6)}`;
      const { error } = await supabase.from('quotations').insert([{ 
        business_id: activeId,
        customer_id: selectedCustomerId, 
        quote_no: quoteNo,
        estimated_amount: parseFloat(amount),
        description: itemName,
        status: 'pending',
        initiated_by: 'owner'
      }]);
      if (error) alert('Error: ' + error.message);
      else alert('Quotation Created!'); 
    }
    
    setItemName(''); setAmount(''); 
    setLoading(false);
  };

  // Filter Customers by Search
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery)
  );

  const currentSelectedCustomer = customers.find(c => c.id === selectedCustomerId);
  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-slate-500 text-xl font-bold bg-slate-100 p-2 rounded-full w-9 h-9 flex items-center justify-center">←</Link>
          <h1 className="text-lg font-bold text-slate-800">Customer Hub</h1>
        </div>
      </header>

      {/* Top Tabs */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="flex bg-slate-200/60 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('customers')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'customers' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
          >
            All Customers
          </button>
          <button 
            onClick={() => setActiveTab('create_doc')} 
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'create_doc' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
          >
            Create Bill/Quote
          </button>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-5">
        
        {/* ================= TAB 1: CUSTOMERS ================= */}
        {activeTab === 'customers' && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Add Customer Form */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-600 p-2 rounded-lg text-sm">👤</span> Add New Customer
              </h2>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: Rakesh Kumar" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Phone *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="9876543210" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Opening Udhaar (₹)</label>
                    <input type="number" value={openingUdhaar} onChange={(e) => setOpeningUdhaar(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Email Address (Gmail)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="customer@gmail.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">GST Number</label>
                    <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none uppercase" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Optional" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition">
                  {loading ? 'Saving...' : 'Save Customer'}
                </button>
              </form>
            </div>

            {/* Customer List */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-lg font-black text-slate-800">Directory</h2>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{customers.length} Total</span>
              </div>
              
              <div className="relative mb-4">
                <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" />
                <span className="absolute left-3 top-3 text-slate-400">🔍</span>
              </div>

              {loading ? (
                <p className="text-center text-slate-400 py-6 animate-pulse">Loading...</p>
              ) : filteredCustomers.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center border border-slate-200">
                  <span className="text-4xl block mb-2">📭</span>
                  <p className="font-bold text-slate-700">No Customer Found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((cust) => (
                    <div key={cust.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {/* Card Top Area (Clickable for History) */}
                      <div 
                        onClick={() => router.push(`/customers/${cust.id}`)} 
                        className="p-4 cursor-pointer hover:bg-slate-50 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{cust.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">📞 {cust.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Udhaar</p>
                            <p className={`font-black text-sm ${Number(cust.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ₹{Number(cust.current_balance || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions Area */}
                      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex justify-between items-center">
                        <button 
                          onClick={() => router.push(`/customers/${cust.id}`)} 
                          className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg active:scale-95 transition shadow-sm"
                        >
                          📖 View History
                        </button>
                        
                        {Number(cust.current_balance) > 0 && (
                          <button 
                            onClick={() => setPaymentModal(cust)} 
                            className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition shadow-sm"
                          >
                            Receive ₹
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: CREATE DOCUMENT ================= */}
        {activeTab === 'create_doc' && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
              <button onClick={() => setSalesOrQuoteTab('sale')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${salesOrQuoteTab === 'sale' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Sales Mode</button>
              <button onClick={() => setSalesOrQuoteTab('quotation')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${salesOrQuoteTab === 'quotation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Quotation Mode</button>
            </div>

            <form onSubmit={handleProcessTransaction} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Select Customer</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800" required>
                  <option value="">-- Choose Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {currentSelectedCustomer && (
                <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl space-y-1">
                  <p className="text-xs text-teal-800"><strong>Address:</strong> {currentSelectedCustomer.address}</p>
                  {currentSelectedCustomer.gst_number && <p className="text-xs text-teal-800"><strong>GST:</strong> {currentSelectedCustomer.gst_number}</p>}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Item Name / Service</label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ex: LED Bulb 9W" required />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Total Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none" placeholder="0.00" required />
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Tax Rate %</label>
                  <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none">
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition ${salesOrQuoteTab === 'sale' ? 'bg-slate-900' : 'bg-blue-600'}`}>
                {loading ? 'Creating...' : salesOrQuoteTab === 'sale' ? 'Generate Sale Bill' : 'Generate Quotation'}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">₹</div>
              <h3 className="text-xl font-black text-slate-800">Receive Payment</h3>
              <p className="text-sm text-slate-500 mt-1">{paymentModal.name}</p>
              <p className="text-xs font-bold text-rose-500 mt-1">Current Udhaar: ₹{paymentModal.current_balance}</p>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Amount Received (₹)</label>
                <input type="number" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-2xl font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" max={paymentModal.current_balance} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Payment Mode</label>
                <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl active:scale-95 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition">
                  {loading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}