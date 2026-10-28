'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function ProviderReviewsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    if (!activeId) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });

    if (data) setReviews(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [activeId]);

  // --- CALCULATE AVERAGE RATING ---
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) 
    : 0;

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Reviews...</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reviews & Ratings</h1>
          <p className="text-sm text-gray-500">See what your customers are saying</p>
        </div>
        <button onClick={fetchReviews} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">
          🔄 Refresh
        </button>
      </div>

      {/* OVERALL RATING CARD */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
        <div className="text-center md:border-r border-gray-200 md:pr-8 w-full md:w-auto">
          <h2 className="text-5xl font-black text-gray-800">{avgRating}</h2>
          <div className="flex text-yellow-400 text-2xl justify-center my-2">
            {'★'.repeat(Math.round(Number(avgRating)))}
            {'☆'.repeat(5 - Math.round(Number(avgRating)))}
          </div>
          <p className="text-sm text-gray-500 font-semibold">Based on {totalReviews} reviews</p>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Great Job! 🎉</h3>
          <p className="text-sm text-gray-500">
            {totalReviews === 0 
              ? "Abhi tak koi review nahi aaya hai. Kaam complete hone par customer review de sakte hain." 
              : "Aapke customers aapke kaam se khush hain. Aise hi premium service dete rahein!"}
          </p>
        </div>
      </div>

      {/* REVIEWS LIST */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">⭐</div>
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi review nahi hai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{review.customer_name || 'Anonymous'}</h4>
                    <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex text-yellow-400 text-lg">
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                "{review.review_text || 'No text provided.'}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}