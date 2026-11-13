'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Search, Edit, Trash2, Upload, X, Image as ImageIcon, AlertCircle, ShoppingCart } from 'lucide-react';

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
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchSuppliers();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setProducts(data || []);
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
  async function fetchCategoryAttributes(category: string) {
    if (!category) return;
    setLoadingAttributes(true);
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('attributes')
        .eq('name', category)
        .single();
      if (error) throw error;
      if (data && data.attributes) {
        setCategoryAttributes(data.attributes as any[]);
      } else {
        setCategoryAttributes([]);
      }
    } catch (err) {
      console.error(err);
      setCategoryAttributes([]);
    } finally {
      setLoadingAttributes(false);
    }
  }

  useEffect(() => {
    fetchCategoryAttributes(newProduct.category);
  }, [newProduct.category]);

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
      attributes: {},
      image_urls: [],
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      setNewProduct(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, data.publicUrl]
      }));
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
      name: newProduct.name,
      sku: newProduct.sku || null,
      category: newProduct.category,
      purchase_price: Number(newProduct.purchase_price) || 0,
      selling_price: Number(newProduct.selling_price) || 0,
      mrp: Number(newProduct.mrp) || 0,
      stock: Number(newProduct.stock) || 0,
      min_stock: Number(newProduct.min_stock) || 0,
      unit: newProduct.unit,
      warehouse_id: newProduct.warehouse_id || null,
      is_online: newProduct.is_online,
      tax_percentage: Number(newProduct.tax_percentage) || 0,
      attributes: newProduct.attributes,
      image_urls: newProduct.image_urls,
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) alert('Error updating product: ' + error.message);
      else { alert('Product updated!'); setIsItemModalOpen(false); fetchProducts(); }
    } else {
      const { error } = await supabase.from('products').insert([productData]);
      if (error) alert('Error adding product: ' + error.message);
      else { alert('Product added!'); setIsItemModalOpen(false); fetchProducts(); }
    }
    setSaving(false);
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Error deleting: ' + error.message);
    else fetchProducts();
  }
  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier) return alert('Select a supplier');
    setSaving(true);

    try {
      const totalAmount = purchaseForm.items.reduce((sum, item) => sum + item.total, 0);
      const finalAmount = totalAmount - purchaseForm.discount + purchaseForm.tax;

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          supplier_id: selectedSupplier,
          invoice_number: purchaseForm.invoice_number,
          purchase_date: purchaseForm.purchase_date,
          total_amount: totalAmount,
          discount: purchaseForm.discount,
          tax: purchaseForm.tax,
          final_amount: finalAmount,
          notes: purchaseForm.notes,
          status: 'pending'
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const purchaseItems = purchaseForm.items.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total
      }));

      const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems);
      if (itemsError) throw itemsError;

      for (const item of purchaseForm.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('products').update({
            stock: product.stock + item.quantity,
            purchase_price: item.unit_price
          }).eq('id', item.product_id);
        }
      }

      alert('Stock successfully added!');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500">Manage your stock, products, and purchases.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setIsItemModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
          <Button onClick={() => setIsPurchaseModalOpen(true)} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
            <ShoppingCart className="w-4 h-4 mr-2" /> Add Purchase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <h3 className="text-xl font-bold">{products.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg"><span className="text-green-600 font-bold text-xl">₹</span></div>
            <div>
              <p className="text-sm text-gray-500">Total Stock Value</p>
              <h3 className="text-xl font-bold">₹{totalValue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <h3 className="text-xl font-bold text-red-600">{lowStockCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex items-center gap-2 max-w-md bg-white border rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="flex-1 outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No products found.</td></tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 relative bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {product.image_urls?.[0] ? (
                                <Image src={product.image_urls[0]} alt={product.name} fill className="object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{product.category}</td>
                        <td className="px-4 py-3">
                          <div>₹{product.selling_price}</div>
                          <div className="text-xs text-gray-400 line-through">₹{product.mrp}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${product.stock <= product.min_stock ? 'text-red-600' : 'text-green-600'}`}>
                            {product.stock} {product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${product.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {product.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 🚀 YAHAN PAR AAPKA ERROR FIX HO GAYA HAI 🚀 */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="p-10 text-center bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
            <p className="text-gray-500 font-medium">Purchase tab logic is under construction.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div>
                <Label>Category *</Label>
                <Input required value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} />
              </div>
              <div>
                <Label>Purchase Price *</Label>
                <Input type="number" required value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price: e.target.value})} />
              </div>
              <div>
                <Label>Selling Price *</Label>
                <Input type="number" required value={newProduct.selling_price} onChange={(e) => setNewProduct({...newProduct, selling_price: e.target.value})} />
              </div>
              <div>
                <Label>MRP *</Label>
                <Input type="number" required value={newProduct.mrp} onChange={(e) => setNewProduct({...newProduct, mrp: e.target.value})} />
              </div>
              <div>
                <Label>Stock *</Label>
                <Input type="number" required value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} />
              </div>
              <div>
                <Label>Min Stock *</Label>
                <Input type="number" required value={newProduct.min_stock} onChange={(e) => setNewProduct({...newProduct, min_stock: e.target.value})} />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={newProduct.unit} onValueChange={(val) => setNewProduct({...newProduct, unit: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STANDARD_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}