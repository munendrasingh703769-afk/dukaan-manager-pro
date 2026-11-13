'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const STANDARD_UNITS = [
  'piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'feet', 'box', 'packet', 'dozen', 'set', 'pair', 'bundle', 'roll', 'sheet', 'bottle'
];

interface Product {
  id: string;
  name: string;
  image_urls: string[] | null;
  sku: string | null;
  category: string;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  stock: number;
  min_stock: number;
  unit: string;
  warehouse_id: string | null;
  attributes: Record<string, string | number>;
  is_online: boolean;
  tax_percentage: number;
}

export default function ProviderInventoryPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    invoice_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', quantity: 1, unit_price: 0, total: 0 }],
    notes: '',
    discount: 0,
    tax: 0,
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    purchase_price: '',
    selling_price: '',
    mrp: '',
    stock: '',
    min_stock: '',
    unit: 'piece',
    warehouse_id: '',
    is_online: true,
    tax_percentage: '',
    attributes: {} as Record<string, string | number>,
    image_urls: [] as string[],
  });

  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchSuppliers();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setLoading(false);
  }

  async function fetchWarehouses() {
    const { data } = await supabase.from('warehouses').select('*');
    if (data) setWarehouses(data);
  }

  async function fetchSuppliers() {
    const { data } = await supabase.from('suppliers').select('*');
    if (data) setSuppliers(data);
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => sum + (p.selling_price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;
  function handleEditProduct(product: Product) {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      sku: product.sku || '',
      category: product.category,
      purchase_price: product.purchase_price.toString(),
      selling_price: product.selling_price.toString(),
      mrp: product.mrp.toString(),
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      unit: product.unit,
      warehouse_id: product.warehouse_id || '',
      is_online: product.is_online,
      tax_percentage: product.tax_percentage.toString(),
      attributes: product.attributes || {},
      image_urls: product.image_urls || [],
    });
    setIsItemModalOpen(true);
  }

  function resetForm() {
    setEditingProduct(null);
    setNewProduct({
      name: '', sku: '', category: '', purchase_price: '', selling_price: '', mrp: '',
      stock: '', min_stock: '', unit: 'piece', warehouse_id: '', is_online: true,
      tax_percentage: '', attributes: {}, image_urls: [],
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setNewProduct(prev => ({ ...prev, image_urls: [...prev.image_urls, data.publicUrl] }));
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const productData = {
      name: newProduct.name, sku: newProduct.sku || null, category: newProduct.category,
      purchase_price: Number(newProduct.purchase_price) || 0, selling_price: Number(newProduct.selling_price) || 0,
      mrp: Number(newProduct.mrp) || 0, stock: Number(newProduct.stock) || 0, min_stock: Number(newProduct.min_stock) || 0,
      unit: newProduct.unit, warehouse_id: newProduct.warehouse_id || null, is_online: newProduct.is_online,
      tax_percentage: Number(newProduct.tax_percentage) || 0, attributes: newProduct.attributes, image_urls: newProduct.image_urls,
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) alert('Error: ' + error.message);
      else { alert('Updated!'); setIsItemModalOpen(false); fetchProducts(); }
    } else {
      const { error } = await supabase.from('products').insert([productData]);
      if (error) alert('Error: ' + error.message);
      else { alert('Added!'); setIsItemModalOpen(false); fetchProducts(); }
    }
    setSaving(false);
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier) return alert('Select a supplier');
    setSaving(true);

    try {
      const totalAmount = purchaseForm.items.reduce((sum, item) => sum + item.total, 0);
      const finalAmount = totalAmount - purchaseForm.discount + purchaseForm.tax;

      const { data: purchase, error: purchaseError } = await supabase.from('purchases').insert([{
          supplier_id: selectedSupplier, invoice_number: purchaseForm.invoice_number,
          purchase_date: purchaseForm.purchase_date, total_amount: totalAmount, discount: purchaseForm.discount,
          tax: purchaseForm.tax, final_amount: finalAmount, notes: purchaseForm.notes, status: 'pending'
      }]).select().single();

      if (purchaseError) throw purchaseError;

      const purchaseItems = purchaseForm.items.map(item => ({
        purchase_id: purchase.id, product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total: item.total
      }));

      await supabase.from('purchase_items').insert(purchaseItems);

      for (const item of purchaseForm.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('products').update({ stock: product.stock + item.quantity, purchase_price: item.unit_price }).eq('id', item.product_id);
        }
      }

      alert('Stock added!');
      setIsPurchaseModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500">Manage your stock, products, and purchases.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { resetForm(); setIsItemModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Product
          </button>
          <button onClick={() => setIsPurchaseModalOpen(true)} className="border border-green-600 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50">
            Add Purchase
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600 text-xl">📦</div>
          <div><p className="text-sm text-gray-500">Total Products</p><h3 className="text-xl font-bold">{products.length}</h3></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600 text-xl font-bold">₹</div>
          <div><p className="text-sm text-gray-500">Total Stock Value</p><h3 className="text-xl font-bold">₹{totalValue.toLocaleString()}</h3></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600 text-xl">⚠️</div>
          <div><p className="text-sm text-gray-500">Low Stock Items</p><h3 className="text-xl font-bold text-red-600">{lowStockCount}</h3></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('inventory')}>Inventory</button>
        <button className={`px-4 py-2 font-medium text-sm ${activeTab === 'purchases' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('purchases')}>Purchases</button>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-md bg-white border border-gray-300 rounded-lg px-3 py-2">
            <span className="text-gray-400">🔍</span>
            <input type="text" placeholder="Search products..." className="flex-1 outline-none text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (<tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>) : 
                 filteredProducts.length === 0 ? (<tr><td colSpan={5} className="text-center py-8">No products found.</td></tr>) : 
                 (filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-gray-400">🖼️</span>}
                          </div>
                          <div><p className="font-medium text-gray-900">{product.name}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{product.category}</td>
                      <td className="px-4 py-3"><div>₹{product.selling_price}</div></td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${product.stock <= product.min_stock ? 'text-red-600' : 'text-green-600'}`}>{product.stock} {product.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEditProduct(product)} className="text-blue-600 mr-3 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                 )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🚀 FIXED PURCHASES TAB (Jo error de raha tha) 🚀 */}
      {activeTab === 'purchases' && (
        <div className="bg-white p-10 text-center rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 font-medium">Purchase tab logic is under construction.</p>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">Product Name *</label><input required className="w-full border p-2 rounded" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} /></div>
                <div><label className="block text-sm mb-1">Category *</label><input required className="w-full border p-2 rounded" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} /></div>
                <div><label className="block text-sm mb-1">Purchase Price *</label><input type="number" required className="w-full border p-2 rounded" value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price: e.target.value})} /></div>
                <div><label className="block text-sm mb-1">Selling Price *</label><input type="number" required className="w-full border p-2 rounded" value={newProduct.selling_price} onChange={(e) => setNewProduct({...newProduct, selling_price: e.target.value})} /></div>
                <div><label className="block text-sm mb-1">Stock *</label><input type="number" required className="w-full border p-2 rounded" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} /></div>
                <div><label className="block text-sm mb-1">Unit</label>
                  <select className="w-full border p-2 rounded" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}>
                    {STANDARD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}