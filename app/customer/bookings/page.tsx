'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ChatModal from '@/components/ui/ChatModal'

export default function CustomerBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [providerUpi, setProviderUpi] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '', name: '' });

  const fetchBookings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('service_bookings')
      .select(`
        *,
        services:service_id (name, price, business_id)
      `)
      .eq('customer_id', user.id) 
      .order('created_at', { ascending: false });

    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const openPayModal = async (booking: any) => {
    setSelectedBooking(booking);
    setIsPayModalOpen(true);
    
    if (booking.services?.business_id) {
      const { data } = await supabase.from('businesses').select('upi_id').eq('id', booking.services.business_id).single();
      if (data && data.upi_id) setProviderUpi(data.upi_id);
      else setProviderUpi('provider@upi'); 
    }
  };

  const handlePaymentSubmit = async () => {
    if (utrNumber.length < 8) return alert("Please enter a valid UTR/Transaction ID");
    
    const { error } = await supabase.from('service_bookings').update({
      payment_status: 'pending_verification',
      utr_number: utrNumber
    }).eq('id', selectedBooking.id);

    if (!error) {
      alert("Payment details submitted! Provider will verify soon.");
      setIsPayModalOpen(false);
      setUtrNumber('');
      fetchBookings();
    } else alert("Error: " + error.message);
  };

  const handleSubmitReview = async () => {
    if (!reviewForm.name) return alert("Please enter your name");
    
    const { error } = await supabase.from('reviews').insert([{
      provider_business_id: selectedBooking.services.business_id,
      customer_name: reviewForm.name,
      rating: reviewForm.rating,
      review_text: reviewForm.text
    }]);

    if (!error) {
      alert("Thank you for your feedback! ⭐");
      setIsReviewModalOpen(false);
    } else alert("Error: " + error.message);
  };

  const generateUpiLink = () => {
    if (!selectedBooking) return '#';
    const amount = selectedBooking.services?.price || 0;
    return `upi://pay?pa=${providerUpi}&pn=ServiceProvider&am=${amount}&cu=INR`;
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Bookings...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h1 className="text-xl font-bold text-gray-800">My Bookings</h1>
        <Link href="/customer" className="text-sm font-bold text-blue-600">← Back Home</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">Aapne abhi tak koi booking nahi ki hai.</p>
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{b.services?.name || 'Service'}</h3>
                <p className="text-sm text-gray-500">Amount: ₹{b.services?.price || 0}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                  b.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                  b.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {b.status.toUpperCase()}
                </span>
                {b.payment_status === 'paid' && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-bold">PAID</span>}
                {b.payment_status === 'pending_verification' && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold">VERIFYING</span>}
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p><b>Date:</b> {b.booking_date} | {b.booking_time}</p>
                {b.notes && <p className="mt-1 italic text-gray-500">"{b.notes}"</p>}
              </div>
              {b.payment_status !== 'paid' && (
                <button onClick={() => openPayModal(b)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md">
                  Pay ₹{b.services?.price}
                </button>
              )}
            </div>

            {/* 👇 OTP DISPLAY BOX */}
            {(b.status === 'accepted' || b.status === 'in_progress') && b.completion_otp && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-center">
                <p className="text-xs font-bold text-orange-800 mb-1">Give this OTP to Worker after job completion:</p>
                <p className="text-2xl font-black text-orange-600 tracking-widest">{b.completion_otp}</p>
              </div>
            )}

            {/* CHAT BUTTON */}
            <button 
              onClick={() => setChatBookingId(b.id)}
              className="w-full bg-indigo-50 text-indigo-700 py-2.5 rounded-lg font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition"
            >
              💬 Chat with Provider
            </button>

            {/* REVIEW BUTTON */}
            {b.status === 'completed' && (
              <button 
                onClick={() => { setSelectedBooking(b); setIsReviewModalOpen(true); }}
                className="w-full bg-yellow-400 text-yellow-900 py-2.5 rounded-lg font-bold text-sm shadow-md"
              >
                ⭐ Rate & Review Provider
              </button>
            )}
          </div>
        ))
      )}

      {/* CHAT MODAL */}
      {chatBookingId && (
        <ChatModal bookingId={chatBookingId} role="customer" onClose={() => setChatBookingId(null)} />
      )}

      {/* PAYMENT MODAL */}
      {isPayModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <h2 className="text-xl font-bold text-gray-800">Pay ₹{selectedBooking.services?.price}</h2>
            <p className="text-sm text-gray-500">Scan QR or use UPI ID to pay</p>
            
            <div className="bg-gray-100 p-4 rounded-xl flex justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generateUpiLink())}`} 
                alt="UPI QR Code" 
                className="w-40 h-40 rounded-lg shadow-sm"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Or send to UPI ID:</p>
              <p className="font-bold text-blue-800 select-all">{providerUpi}</p>
            </div>

            <a href={generateUpiLink()} className="block w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-md">
              Pay via UPI App
            </a>

            <div className="pt-4 border-t border-gray-200">
              <label className="text-sm font-bold text-gray-700 block text-left mb-1">Enter 12-digit UTR / Ref No.</label>
              <input 
                type="text" 
                placeholder="e.g. 123456789012" 
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl outline-none text-center font-bold tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsPayModalOpen(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold text-gray-700">Cancel</button>
              <button onClick={handlePaymentSubmit} className="flex-1 bg-indigo-600 py-2 rounded-lg font-bold text-white">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {isReviewModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-xl font-bold text-center">Rate Service</h2>
            <div className="flex justify-center gap-2 text-4xl cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })} className={star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
              ))}
            </div>
            <input type="text" placeholder="Your Name" value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} className="w-full p-3 border rounded-xl" />
            <textarea placeholder="Your experience..." value={reviewForm.text} onChange={e => setReviewForm({...reviewForm, text: e.target.value})} className="w-full p-3 border rounded-xl" rows={3}></textarea>
            <div className="flex gap-3">
              <button onClick={() => setIsReviewModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSubmitReview} className="flex-1 bg-yellow-500 text-white py-3 rounded-xl font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}