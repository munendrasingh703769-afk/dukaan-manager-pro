'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChatModal({ bookingId, role, onClose }: { bookingId: string, role: 'customer' | 'provider', onClose: () => void }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // Har 5 second me naye messages check karein
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    // Auto scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage;
    setNewMessage(''); // Clear input

    const { error } = await supabase.from('chat_messages').insert([{
      booking_id: bookingId,
      sender_role: role,
      message_text: msgText
    }]);

    if (!error) fetchMessages();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[500px]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h3 className="font-bold text-gray-800">Chat with {role === 'customer' ? 'Provider' : 'Customer'}</h3>
          <button onClick={onClose} className="text-gray-500 font-bold text-xl">✕</button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <p className="text-center text-xs text-gray-400">Loading chat...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-gray-400 mt-10">Start the conversation.</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_role === role;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'}`}>
                    <p>{msg.message_text}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 rounded-b-2xl">
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md">
            ➤
          </button>
        </form>

      </div>
    </div>
  )
}