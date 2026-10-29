'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProviderSupportPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reply State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    // Fetch all tickets for now (later we can filter by business_id)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [supabase]);

  const handleReply = async () => {
    if (!replyText.trim()) return alert("Reply cannot be empty");
    
    const { error } = await supabase.from('support_tickets').update({
      reply: replyText,
      status: 'resolved'
    }).eq('id', selectedTicket.id);

    if (!error) {
      alert("Reply sent successfully!");
      setIsModalOpen(false);
      setReplyText('');
      fetchTickets();
    } else {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Customer Support Tickets</h1>
          <p className="text-sm text-gray-500">Reply to customer complaints</p>
        </div>
        <button onClick={fetchTickets} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">🔄 Refresh</button>
      </div>

      {loading ? (
        <p className="text-center font-bold text-blue-600">Loading Tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-800 font-bold text-lg">Koi support ticket nahi hai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800">{ticket.subject}</h3>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                    ticket.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>{ticket.status}</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{ticket.description}</p>
                
                {ticket.reply && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Your Reply:</p>
                    <p className="text-sm text-blue-900">{ticket.reply}</p>
                  </div>
                )}
              </div>
              
              {ticket.status === 'open' && (
                <button 
                  onClick={() => { setSelectedTicket(ticket); setReplyText(''); setIsModalOpen(true); }}
                  className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm shadow-md"
                >
                  Reply to Customer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800">Reply to Ticket</h2>
            <p className="text-sm text-gray-600 font-bold">Subject: {selectedTicket.subject}</p>
            
            <textarea 
              placeholder="Write your solution here..." 
              value={replyText} 
              onChange={e => setReplyText(e.target.value)} 
              className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" 
              rows={4}
            ></textarea>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleReply} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white">Send Reply</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}