'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Image Slider State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Zoom Modal State
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select(`*, businesses(name, city, phone)`)
        .eq('id', id)
        .single();

      if (data) {
        setProduct(data);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, supabase]);

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Product...</div>;
  if (!product) return <div className="text-center py-20 font-bold text-red-600">Product not found!</div>;

  const discount = product.mrp && product.mrp > product.selling_price 
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) 
    : 0;

  const images = product.image_urls && product.image_urls.length > 0 ? product.image_urls : [null];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold">←</button>
        <h1 className="text-lg font-bold text-gray-800 line-clamp-1">{product.name}</h1>
        <Link href="/customer/shop" className="text-blue-600 font-bold text-sm">Shop</Link>
      </div>

      <div className="max-w-2xl mx-auto bg-white mt-2 pb-6 shadow-sm">
        
        {/* IMAGE SLIDER & ZOOM */}
        <div className="relative w-full h-80 bg-gray-50 flex items-center justify-center border-b">
          {images[activeImageIndex] ? (
            <img 
              src={images[activeImageIndex]} 
              alt={product.name} 
              className="w-full h-full object-contain cursor-zoom-in" 
              onClick={() => setIsZoomOpen(true)}
            />
          ) : (
            <span className="text-6xl text-gray-300 font-black">{product.name.charAt(0)}</span>
          )}
          
          {discount > 0 && (
            <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-md z-10">
              {discount}% OFF
            </span>
          )}

          {/* Thumbnails (Agar 1 se zyada photo hai) */}
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2 w-full justify-center px-4 overflow-x-auto">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-12 h-12 rounded-lg border-2 cursor-pointer overflow-hidden flex-shrink-0 bg-white ${activeImageIndex === idx ? 'border-blue-600' : 'border-gray-200 opacity-70'}`}
                >
                  {img ? <img src={img} alt="thumb" className="w-full h-full object-cover" /> : <div className="text-xs text-center mt-3">Img</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT DETAILS */}
        <div className="p-5 space-y-4">
          
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{product.brand || product.category}</p>
            <h2 className="text-xl font-black text-gray-900 leading-tight mt-1">{product.name}</h2>
            <p className="text-xs text-gray-500 mt-1">Sold by: {product.businesses?.name} ({product.businesses?.city})</p>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">₹{product.selling_price}</span>
            {product.mrp && product.mrp > product.selling_price && (
              <span className="text-sm text-gray-400 line-through mb-1 font-medium">MRP ₹{product.mrp}</span>
            )}
            <span className="text-xs text-gray-500 font-bold mb-1 ml-1">/ {product.uom}</span>
          </div>

          {/* WARRANTY & GUARANTEE */}
          {(product.warranty || product.guarantee) && (
            <div className="grid grid-cols-2 gap-3 bg-green-50 p-3 rounded-xl border border-green-100">
              {product.warranty && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <p className="text-[10px] text-green-700 font-bold uppercase">Warranty</p>
                    <p className="text-xs font-black text-green-900">{product.warranty}</p>
                  </div>
                </div>
              )}
              {product.guarantee && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔄</span>
                  <div>
                    <p className="text-[10px] text-green-700 font-bold uppercase">Guarantee</p>
                    <p className="text-xs font-black text-green-900">{product.guarantee}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DESCRIPTION / SPECIFICATIONS */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-800 mb-2">Product Details</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {product.description || "No detailed description provided for this product."}
            </p>
          </div>

          {/* STOCK STATUS */}
          <div className="flex items-center gap-2 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="font-bold text-gray-700">Availability:</span>
            <span className="font-bold text-green-600">In Stock (Ready to ship)</span>
          </div>

        </div>
      </div>

      {/* BOTTOM STICKY ACTION BAR */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4 flex gap-3 z-40 max-w-2xl left-1/2 transform -translate-x-1/2">
        <button 
          onClick={() => alert("Cart feature coming soon!")} 
          className="flex-1 bg-gray-100 text-gray-800 py-3.5 rounded-xl font-bold shadow-sm border border-gray-200"
        >
          Add to Cart
        </button>
        <button 
          onClick={() => alert("Buy Now feature coming soon!")} 
          className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md"
        >
          Buy Now
        </button>
      </div>

      {/* ZOOM MODAL (Full Screen Image) */}
      {isZoomOpen && images[activeImageIndex] && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-2" onClick={() => setIsZoomOpen(false)}>
          <button className="absolute top-6 right-6 text-white text-4xl font-bold">&times;</button>
          <img src={images[activeImageIndex]} alt="Zoomed" className="max-w-full max-h-full object-contain" />
        </div>
      )}

    </div>
  );
}