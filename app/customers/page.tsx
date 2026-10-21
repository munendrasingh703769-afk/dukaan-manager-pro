'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCurrentBusinessId } from '@/lib/business';

export default function CustomersAndSalesPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [activeTab, setActiveTab] = useState<'customers' | 'create_doc'>('customers');
  const [salesOrQuoteTab, setSalesOrQuoteTab] = useState<'sale' | 'quotation'>('sale');
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // 🔥 Naya
  const [gstNumber, setGstNumber] = useState(''); // 🔥 Naya
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState('Regular Customer');
  const [plan, setPlan] = useState('Free Plan');
  const [openingUdhaar, setOpeningUdhaar] = useState('0');

  // Document Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState('18'); 

  // Fetch Customers
  useEffect(() => {
    if (activeId) fetchCustomers();
  }, [activeId]);

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

  // Save New Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return alert('Name & Phone are required!');
    
    setLoading(true);
    const { error } = await supabase.from('customers').insert([{ 
      business_id: activeId,
      name, 
      phone, 
      email: email.trim() || null, // 🔥 Naya
      gst_number: gstNumber.trim() || null, // 🔥 Naya
      address: address || 'Not Provided', 
      customer_type: customerType, 
      plan: plan, 
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

  // Create Sale or Quotation
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

                  {/* 🔥 Naye Fields: Email & GST */}
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
                    <div key={cust.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{cust.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">📞 {cust.phone}</p>
                            {cust.email && <p className="text-[10px] text-slate-500 font-medium">✉️ {cust.email}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Udhaar</p>
                          <p className={`font-black text-sm ${Number(cust.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{Number(cust.current_balance || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {/* GST aur Address dikhane ke liye */}
                      {(cust.gst_number || cust.address) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-600">
                          {cust.gst_number && <span className="bg-slate-100 px-2 py-1 rounded font-mono font-bold">GST: {cust.gst_number}</span>}
                          {cust.address && <span className="truncate max-w-[200px]">📍 {cust.address}</span>}
                        </div>
                      )}
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
                  <p className="text-xs text-teal-800"><strong>Config:</strong> {currentSelectedCustomer.customer_type} | {currentSelectedCustomer.plan}</p>
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
    </main>
  );
}