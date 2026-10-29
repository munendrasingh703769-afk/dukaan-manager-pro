'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CustomerSupportPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newTicket, setNewTicket] = useState({ subject: '', description: '' });

  const fetchTickets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [supabase]);

  const handleSubmitTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return alert("Please fill all fields");
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('support_tickets').insert([{
      customer_id: user?.id || null,
      subject: newTicket.subject,
      description: newTicket.description,
      status: 'open'
    }]);

    if (!error) {
      alert("Support Ticket Raised Successfully! Our team will reply soon.");
      setIsModalOpen(false);
      setNewTicket({ subject: '', description: '' });
      fetchTickets();
    } else {
      alert("Error: " + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Help & Support</h1>
        <Link href="/customer/profile" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">← Profile</Link>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4 mt-2">
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        >
          <span>➕</span> Raise a New Ticket
        </button>

        <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">Your Previous Tickets</h2>

        {loading ? (
          <p className="text-center font-bold text-indigo-600 py-10">Loading Tickets...</p>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">🎧</div>
            <p className="text-gray-800 font-bold text-lg">Koi ticket nahi hai.</p>
            <p className="text-gray-500 text-sm mt-1">Agar aapko koi problem hai, toh upar button se ticket raise karein.</p>
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{ticket.subject}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(ticket.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                  ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{ticket.description}</p>
              
              {ticket.reply && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mt-3">
                  <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Support Reply:</p>
                  <p className="text-sm text-blue-900">{ticket.reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Raise Support Ticket</h2>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Subject *</label>
              <input type="text" placeholder="e.g. Order not delivered" value={newTicket.subject} onChange={e => setNewTicket({...newTicket, subject: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Describe your problem *</label>
              <textarea placeholder="Please explain in detail..." value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" rows={4}></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleSubmitTicket} disabled={submitting} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white disabled:opacity-50">
                {submitting ? 'Sending...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}