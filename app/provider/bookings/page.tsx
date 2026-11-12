'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentBusinessId } from '@/lib/business'
import ChatModal from '@/components/ui/ChatModal'

type Service = { id: string; name: string; price: number; }
type Worker = { id: string; name: string; role: string; }
type Product = { id: string; name: string; selling_price: number; uom: string; inventory_stock: { quantity: number }[] }
type ServiceMaterial = { id: string; product_id: string; quantity_used: number; products?: { name: string; uom: string } }

type Booking = { 
  id: string; customer_name: string; customer_phone: string; 
  booking_date: string; booking_time: string; status: string; 
  notes: string; service_id: string; assigned_worker_id: string | null;
  payment_status: string; utr_number: string | null; completion_otp: string | null;
  customer_id: string | null;
  service_materials?: ServiceMaterial[]; // 👈 Materials attach honge
}

export default function ProviderBookingsPage() {
  const supabase = createClient();
  const activeId = getCurrentBusinessId();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);

  // Material Modal States
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [materialQty, setMaterialQty] = useState<number | ''>('');
  const [savingMaterial, setSavingMaterial] = useState(false);

  const fetchData = async () => {
    if (!activeId) return;
    setLoading(true);

    // 1. Fetch Default Warehouse
    const { data: whData } = await supabase.from('warehouses').select('id').eq('business_id', activeId).eq('is_default', true).maybeSingle();
    if (whData) setDefaultWarehouseId(whData.id);

    // 2. Fetch Services & Workers
    const { data: servData } = await supabase.from('services').select('*').eq('business_id', activeId);
    if (servData) setServices(servData);

    const { data: workerData } = await supabase.from('provider_workers').select('*').eq('business_id', activeId).eq('status', 'active');
    if (workerData) setWorkers(workerData);

    // 3. Fetch Products for Material Usage
    const { data: prodData } = await supabase.from('products').select(`*, inventory_stock(quantity)`).eq('business_id', activeId);
    if (prodData) setProducts(prodData as any);

    // 4. Fetch Bookings + Materials
    const { data: bookData } = await supabase
      .from('service_bookings')
      .select(`*, service_materials(*, products(name, uom))`)
      .eq('provider_business_id', activeId)
      .order('created_at', { ascending: false });
    if (bookData) setBookings(bookData as any);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeId]);

  // --- UPDATE STATUS ---
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    let updateData: any = { status: newStatus };
    if (newStatus === 'accepted') {
      updateData.completion_otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const { data: updatedBooking, error } = await supabase.from('service_bookings').update(updateData).eq('id', bookingId).select().single();
    
    if (!error && updatedBooking) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus, completion_otp: updateData.completion_otp || b.completion_otp } : b));
      
      if (updatedBooking.customer_id) {
        await supabase.from('notifications').insert([{
          customer_id: updatedBooking.customer_id,
          title: `Booking ${newStatus.toUpperCase()}!`,
          message: `Your booking for ${updatedBooking.customer_name} has been ${newStatus}.`,
          type: 'booking_update'
        }]);
      }
    }
  };

  const handleAssignWorker = async (bookingId: string, workerId: string) => {
    const { error } = await supabase.from('service_bookings').update({ assigned_worker_id: workerId || null }).eq('id', bookingId);
    if (!error) setBookings(bookings.map(b => b.id === bookingId ? { ...b, assigned_worker_id: workerId || null } : b));
  };

  const handleVerifyPayment = async (bookingId: string) => {
    const { error } = await supabase.from('service_bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, payment_status: 'paid' } : b));
      alert("Payment Verified!");
    }
  };

  // --- ADD MATERIAL LOGIC ---
  const handleAddMaterial = async () => {
    if (!selectedBooking || !selectedProduct || !materialQty || !defaultWarehouseId) {
      return alert("Please select product, quantity and ensure warehouse is set.");
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const availableStock = product.inventory_stock?.[0]?.quantity || 0;
    if (materialQty > availableStock) {
      return alert(`Only ${availableStock} ${product.uom} available in stock.`);
    }

    setSavingMaterial(true);
    try {
      // 1. Insert into service_materials
      const { error: matError } = await supabase.from('service_materials').insert([{
        business_id: activeId,
        booking_id: selectedBooking.id,
        product_id: selectedProduct,
        quantity_used: materialQty,
        cost_at_time: product.selling_price
      }]);

      if (matError) throw matError;

      // 2. Deduct Stock using RPC
      const { error: rpcError } = await supabase.rpc('adjust_stock', {
        p_business_id: activeId,
        p_product_id: selectedProduct,
        p_warehouse_id: defaultWarehouseId,
        p_quantity: -materialQty,
        p_movement_type: 'SERVICE_USE',
        p_reference_id: selectedBooking.id,
        p_notes: `Material used for booking #${selectedBooking.id.slice(0,6)}`
      });

      if (rpcError) throw rpcError;

      alert("Material added & stock deducted successfully!");
      setIsMaterialModalOpen(false);
      setSelectedProduct('');
      setMaterialQty('');
      fetchData(); // Refresh to show updated list

    } catch (error: any) {
      alert("Error adding material: " + error.message);
    } finally {
      setSavingMaterial(false);
    }
  };

  const getServiceDetails = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? { name: service.name, price: service.price } : { name: 'Unknown', price: 0 };
  };

  if (loading) return <div className="text-center py-20 font-bold text-blue-600">Loading Bookings...</div>;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">All Bookings</h1>
          <p className="text-sm text-gray-500">Manage jobs, materials & assign workers</p>
        </div>
        <button onClick={fetchData} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition">🔄 Refresh</button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-800 font-bold text-lg">Abhi tak koi booking nahi aayi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => {
            const serviceDetails = getServiceDetails(booking.service_id);
            const assignedWorker = workers.find(w => w.id === booking.assigned_worker_id);

            return (
              <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden flex flex-col">
                
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    booking.status === 'pending' ? 'bg-yellow-400' : 
                    booking.status === 'accepted' ? 'bg-blue-500' : 
                    booking.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{serviceDetails.name}</h3>
                    <p className="text-sm text-purple-600 font-bold bg-purple-50 inline-block px-2 py-0.5 rounded mt-1">₹{serviceDetails.price}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-xl ml-2">
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Customer</span> <span className="font-medium">{booking.customer_name}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Phone</span> <span className="font-medium text-blue-600">{booking.customer_phone}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Date</span> <span className="font-medium">{booking.booking_date}</span></p>
                  <p className="flex flex-col"><span className="text-xs text-gray-400 font-semibold uppercase">Time</span> <span className="font-medium">{booking.booking_time || 'Any time'}</span></p>
                </div>

                {/* 👇 MATERIAL USED SECTION */}
                {(booking.status === 'accepted' || booking.status === 'completed') && (
                  <div className="ml-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-indigo-800">Materials Used:</p>
                      <button onClick={() => { setSelectedBooking(booking); setIsMaterialModalOpen(true); }} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 transition">
                        + Add Material
                      </button>
                    </div>
                    
                    {booking.service_materials && booking.service_materials.length > 0 ? (
                      <ul className="space-y-1">
                        {booking.service_materials.map((mat, idx) => (
                          <li key={idx} className="flex justify-between text-xs text-indigo-900 font-medium">
                            <span>{mat.products?.name}</span>
                            <span>{mat.quantity_used} {mat.products?.uom}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-indigo-400 italic">No materials added yet.</p>
                    )}
                  </div>
                )}

                {/* PAYMENT & WORKER BOX */}
                <div className="ml-2 p-3 bg-gray-50 rounded-xl border border-gray-200 mt-auto">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-gray-700">Payment:</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      booking.payment_status === 'paid' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {booking.payment_status?.toUpperCase() || 'UNPAID'}
                    </span>
                  </div>
                  {booking.payment_status === 'pending_verification' && (
                    <button onClick={() => handleVerifyPayment(booking.id)} className="w-full bg-indigo-600 text-white py-1.5 rounded-lg font-bold text-xs shadow-sm mt-1">Verify Payment</button>
                  )}
                  
                  {(booking.status === 'accepted' || booking.status === 'completed') && (
                    <div className="mt-2">
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">Assign to Worker:</label>
                      <select 
                        value={booking.assigned_worker_id || ''} 
                        onChange={(e) => handleAssignWorker(booking.id, e.target.value)}
                        className="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white outline-none"
                      >
                        <option value="">-- Unassigned --</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 pl-2 flex gap-2">
                  <button onClick={() => setChatBookingId(booking.id)} className="flex-1 bg-white text-gray-700 border border-gray-200 py-2 rounded-xl font-bold text-xs hover:bg-gray-50">💬 Chat</button>
                  <a href={`tel:${booking.customer_phone}`} className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-xl font-bold text-xs text-center hover:bg-green-100">📞 Call</a>
                </div>

                {booking.status === 'pending' && (
                  <div className="flex space-x-3 pl-2">
                    <button onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-xl font-bold text-xs hover:bg-red-50">Reject</button>
                    <button onClick={() => handleUpdateStatus(booking.id, 'accepted')} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold text-xs shadow-md hover:bg-blue-700">Accept</button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ================= MATERIAL ADD MODAL ================= */}
      {isMaterialModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Add Material Used</h2>
            <p className="text-xs text-gray-500 mb-2">Select items used for this booking. Stock will be deducted automatically.</p>

            <div>
              <label className="text-sm font-bold text-gray-700">Select Product</label>
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Select Product --</option>
                {products.map(p => {
                  const stock = p.inventory_stock?.[0]?.quantity || 0;
                  return <option key={p.id} value={p.id} disabled={stock <= 0}>{p.name} (Stock: {stock} {p.uom})</option>
                })}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Quantity Used</label>
              <input type="number" placeholder="e.g. 5" value={materialQty} onChange={e => setMaterialQty(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
              <button onClick={() => setIsMaterialModalOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700">Cancel</button>
              <button onClick={handleAddMaterial} disabled={savingMaterial} className="flex-1 bg-indigo-600 py-3 rounded-xl font-bold text-white shadow-md disabled:opacity-50">
                {savingMaterial ? 'Saving...' : 'Save & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatBookingId && (
        <ChatModal bookingId={chatBookingId} role="provider" onClose={() => setChatBookingId(null)} />
      )}
    </div>
  );
}