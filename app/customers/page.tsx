'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

export default function App() {
const [activeTab, setActiveTab] = useState('customers');
const [salesOrQuoteTab, setSalesOrQuoteTab] = useState('sales');
const [customers, setCustomers] = useState([]);
const [selectedCustomerId, setSelectedCustomerId] = useState('');
const [loading, setLoading] = useState(false); 

const [name, setName] = useState('');
const [phone, setPhone] = useState('');
const [address, setAddress] = useState('');
const [customerType, setCustomerType] = useState('Regular Customer');
const [plan, setPlan] = useState('Free Plan');
const [openingUdhaar, setOpeningUdhaar] = useState('0');
const [searchQuery, setSearchQuery] = useState('');
const [itemName, setItemName] = useState('');
const [amount, setAmount] = useState('');
const [taxRate, setTaxRate] = useState('18'); 

const fetchCustomers = async () => {
setLoading(true);
const { data, error } = await supabase
.from('user_profiles')
.select('*')
.order('created_at', { ascending: false });
if (!error) setCustomers(data || []);
setLoading(false);
}; 

useEffect(() => { fetchCustomers(); }, []); 

const handleSaveCustomer = async (e) => {
e.preventDefault();
if (!name || !phone) return alert('Name & Phone are required!');
setLoading(true);
const { error } = await supabase.from('user_profiles').insert([
{ name, phone, address: address || 'Not Provided', customer_type: customerType, plan, udhaar: parseFloat(openingUdhaar) || 0 }
]);
if (error) alert('Error: ' + error.message);
else { alert('Saved!'); setName(''); setPhone(''); setAddress(''); setOpeningUdhaar('0'); fetchCustomers(); }
setLoading(false);
}; 

const handleProcessTransaction = async (e) => {
e.preventDefault();
if (!selectedCustomerId || !amount || !itemName) return alert('Fill details!');
setLoading(true);
const selectedCust = customers.find(c => c.id === selectedCustomerId);
const { error } = await supabase.from('transactions').insert([
{ customer_id: selectedCustomerId, customer_name: selectedCust?.name, type: salesOrQuoteTab, item_name: itemName, amount: parseFloat(amount), tax_rate: parseInt(taxRate), status: 'Pending' }
]);
if (error) alert('Error: ' + error.message);
else { alert('Document Created!'); setItemName(''); setAmount(''); }
setLoading(false);
}; 

const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery));
const currentSelectedCustomer = customers.find(c => c.id === selectedCustomerId);return ( 

} 

{activeTab === 'customers' ? (
) : (


<button className={flex-1 py-2.5 rounded-lg text-sm font-bold ${salesOrQuoteTab === 'sales' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950' : 'text-slate-400'}} onClick={() => setSalesOrQuoteTab('sales')}>Sales Mode
<button className={flex-1 py-2.5 rounded-lg text-sm font-bold ${salesOrQuoteTab === 'quotation' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950' : 'text-slate-400'}} onClick={() => setSalesOrQuoteTab('quotation')}>Quotation Mode


Select Customer
<select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-200">
-- Choose Account --
{customers.map(c => ( {c.name} ({c.phone}) ))}
{currentSelectedCustomer && (

Address: {currentSelectedCustomer.address}
Config: {currentSelectedCustomer.customer_type} | {currentSelectedCustomer.plan}

)}