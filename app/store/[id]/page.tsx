'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = { id: string; name: string; price: number; description: string; }
type Review = { id: string; customer_name: string; rating: number; review_text: string; }

export default function PublicStorePage() {
  const params = useParams();
  const providerId = params.id as string;
  const supabase = createClient();

  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!providerId) return;
      setLoading(true);

      // 1. Fetch Business Details
      const { data: bizData } = await supabase.from('businesses').select('*').eq('id', providerId).single();
      if (bizData) setBusiness(bizData);

      // 2. Fetch Active Services
      const { data: servData } = await supabase.from('services').select('*').eq('business_id', providerId).eq('is_active', true);
      if (servData) setServices(servData);

      // 3. Fetch Reviews
      const { data: revData } = await supabase.from('reviews').select('*').eq('provider_business_id', providerId);
      if (revData) setReviews(revData);

      setLoading(false);
    };

    fetchStoreData();
  }, [providerId, supabase]);

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : 'New';

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Store...</div>;
  if (!business) return <div className="text-center py-20 font-bold text-red-600">Store not found!</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* COVER IMAGE & PROFILE */}
      <div className="relative">
        <div className="h-48 w-full bg-gradient-to-r from-blue-900 to-indigo-800 rounded-b-3xl"></div>
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center overflow-hidden z-10">
            {business.logo_url ? (
              <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-gray-400">🏪</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black text-gray-800">{business.name}</h1>
          <p className="text-sm text-gray-500 font-medium">{business.city || 'Local Service Provider'}</p>
          
          <div className="flex items-center gap-2 mt-2 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <span className="text-yellow-500 font-bold">★</span>
            <span className="text-sm font-bold text-yellow-700">{avgRating} ({reviews.length} reviews)</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-20 max-w-2xl mx-auto space-y-6">
        
        {/* CONTACT & INFO */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
          {business.address && (
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <span className="text-lg">📍</span> 
              <p>{business.address}, {business.city} - {business.pincode}</p>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-lg">📞</span> 
              <p>{business.phone}</p>
            </div>
          )}
          
          <div className="flex gap-2 mt-2">
            <a href={`tel:${business.phone}`} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-center shadow-md active:scale-95 transition">
              Call Now
            </a>
            <a href={`https://wa.me/91${business.phone}`} target="_blank" className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-center shadow-md active:scale-95 transition">
              WhatsApp
            </a>
          </div>
        </div>

        {/* SERVICES */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Our Services</h2>
          <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-gray-500 text-sm text-center bg-white p-6 rounded-xl">No services available right now.</p>
            ) : (
              services.map(service => (
                <div key={service.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800">{service.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{service.description}</p>
                    <p className="text-blue-600 font-bold mt-1">₹{service.price}</p>
                  </div>
                  {/* Yahan customer app ka link de sakte hain future me */}
                  <button className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-xs">Book</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* REVIEWS */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Customer Reviews</h2>
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-sm text-center bg-white p-6 rounded-xl">No reviews yet.</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-sm text-gray-800">{review.customer_name}</h4>
                    <div className="flex text-yellow-400 text-xs">{'★'.repeat(review.rating)}</div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">"{review.review_text}"</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}