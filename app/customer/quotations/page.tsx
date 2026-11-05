'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CustomerQuotationsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: quoteData, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching quotes:", error);
      setLoading(false);
      return;
    }

    if (quoteData) {
      const quotesWithProvider = await Promise.all(
        quoteData.map(async (quote) => {
          if (quote.provider_business_id) {
            const { data: biz } = await supabase
              .from('businesses')
              .select('name, phone')
              .eq('id', quote.provider_business_id)
              .single();
            return { ...quote, provider: biz };
          }
          return { ...quote, provider: null };
        })
      );
      setQuotations(quotesWithProvider);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, [supabase]);

  const handleUpdateQuote = async (quoteId: string, newStatus: string) => {
    const confirmAction = confirm(`Are you sure you want to ${newStatus} this quotation?`);
    if (!confirmAction) return;

    const { error } = await supabase
      .from('quotations')
      .update({ status: newStatus })
      .eq('id', quoteId);

    if (!error) {
      alert(`Quotation ${newStatus} successfully!`);
      fetchQuotations(); 
    } else {
      alert("Error updating quotation: " + error.message);
    }
  };
  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24 font-sans">
      
      <header className="bg-blue-600 text-white pt-6 pb-6 px-4 rounded-b-3xl shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/customer')} className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shadow-sm active:scale-95 transition">
            ←
          </button>
          <div>
            <h1 className="text-xl font-black tracking-wide">My Estimates</h1>
            <p className="text-blue-200 text-[11px]">Review quotes from providers</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4 mt-2">
        
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-blue-600 font-bold">Loading Quotes...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 mt-4">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-800 font-bold text-lg">Koi estimate request nahi mili.</p>
            <p className="text-gray-500 text-sm mt-1">Jab aap koi quote request bhejenge, wo yahan dikhegi.</p>
            <Link href="/customer" className="inline-block mt-5 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
              Go to Home
            </Link>
          </div>
        ) : (
          quotations.map((quote) => (
            <div key={quote.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase ${
                    quote.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    quote.status === 'quoted' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    quote.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {quote.status}
                  </span>
                  <p className="text-[10px] text-gray-500 font-bold">{new Date(quote.created_at).toLocaleDateString()}</p>
                </div>
                {quote.provider && (
                  <p className="text-xs font-bold text-gray-700">By: {quote.provider.name}</p>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-1">{quote.requirement}</h3>
                {quote.details && <p className="text-xs text-gray-500 mb-3">{quote.details}</p>}

                {quote.status === 'quoted' && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 mb-4">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-2">Provider's Estimate:</p>
                    
                    {quote.items && quote.items.length > 0 && (
                      <div className="space-y-1 border-b border-blue-200 pb-2 mb-2">
                        {quote.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm text-gray-700">
                            <span>{item.name} (x{item.qty})</span>
                            <span>₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm text-gray-700 font-medium">
                      <span>Labour Charge:</span>
                      <span>₹{quote.labour_charge || 0}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                      <span className="font-bold text-blue-900">Total Amount:</span>
                      <span className="text-xl font-black text-blue-700">₹{quote.quoted_amount}</span>
                    </div>

                    {quote.provider_reply && (
                      <p className="text-xs text-blue-700 italic mt-2 bg-blue-100/50 p-2 rounded">"{quote.provider_reply}"</p>
                    )}
                  </div>
                )}

                {quote.status === 'pending' && (
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center mb-4">
                    <p className="text-sm font-bold text-yellow-800">Waiting for provider to send quote...</p>
                  </div>
                )}

                {quote.status === 'accepted' && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center mb-4">
                    <p className="text-sm font-bold text-green-800">✓ You accepted this quote (₹{quote.quoted_amount})</p>
                  </div>
                )}

                {quote.status === 'rejected' && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center mb-4">
                    <p className="text-sm font-bold text-red-800">You rejected this quote.</p>
                  </div>
                )}

                {quote.status === 'quoted' && (
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => handleUpdateQuote(quote.id, 'rejected')} 
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleUpdateQuote(quote.id, 'accepted')} 
                      className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 active:scale-95 transition"
                    >
                      Accept Quote
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}