
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, deleteProduct, sendExpiryAlerts } from '../services/productService';
import { format, differenceInDays, parse } from 'date-fns';
import { Package, Trash2, Bell, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const parseDate = d => d.includes('/') ? parse(d, 'dd/MM/yyyy', new Date()) : new Date(d);
const isValidDateObj = d => d instanceof Date && !isNaN(d);
const getStatusColor = s => s === 'expired' ? 'bg-red-100 text-red-800 border-red-200' : s === 'near' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200';
const getStatusIcon = s => s === 'expired' ? <AlertCircle className="h-4 w-4" /> : s === 'near' ? <Bell className="h-4 w-4" /> : <Package className="h-4 w-4" />;

const Dashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  useEffect(() => { (async () => {
    try {
      const data = await getProducts();
      setProducts(data.map(p => ({ ...p, status: getProductStatus(p.expiry_date), daysUntilExpiry: differenceInDays(parseDate(p.expiry_date), new Date()) })));
    } catch { toast.error('Failed to fetch products'); }
    setLoading(false);
  })(); }, []);
  const getProductStatus = d => { const days = differenceInDays(parseDate(d), new Date()); return days < 0 ? 'expired' : days <= 7 ? 'near' : 'safe'; };
  const handleDelete = async id => { if (window.confirm('Are you sure you want to delete this product?')) try { await deleteProduct(id); setProducts(products.filter(p => p._id !== id)); toast.success('Product deleted successfully'); } catch { toast.error('Failed to delete product'); } };
  const handleSendAlerts = async () => { setSendingAlerts(true); try { await sendExpiryAlerts(); toast.success(`Expiry alerts sent to ${user?.email}!`); } catch { toast.error('Failed to send alerts'); } setSendingAlerts(false); };
  const expiringProducts = products.filter(p => p.status === 'near' || p.status === 'expired');
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Product Dashboard</h1>
        {expiringProducts.length > 0 && (
          <button onClick={handleSendAlerts} disabled={sendingAlerts} className="w-full sm:w-auto bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>{sendingAlerts ? 'Sending...' : 'Send Expiry Alerts'}</span>
          </button>
        )}
      </div>
      {expiringProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h2 className="font-semibold text-orange-800">Attention Required</h2>
          </div>
          <p className="text-orange-700">You have {expiringProducts.length} product(s) that are expiring soon or have already expired.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product._id} className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-md transition-shadow border flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-gray-900 break-words max-w-[70%]">{product.product_name}</h3>
              <button onClick={() => handleDelete(product._id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-sm text-gray-600">Expiry Date</p>
                {(() => { const parsed = parseDate(product.expiry_date); return isValidDateObj(parsed) ? <p className="font-medium">{format(parsed, 'MMM dd, yyyy')}</p> : <p className="font-medium text-red-500">Invalid date</p>; })()}
              </div>
              {product.barcode && (<div><p className="text-sm text-gray-600">Barcode</p><p className="font-mono text-sm text-gray-800 break-all">{product.barcode}</p></div>)}
              <div>
                <p className="text-sm text-gray-600">Days Until Expiry</p>
                <p className={`font-medium ${product.daysUntilExpiry < 0 ? 'text-red-600' : product.daysUntilExpiry <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>{product.daysUntilExpiry < 0 ? `Expired ${Math.abs(product.daysUntilExpiry)} days ago` : `${product.daysUntilExpiry} days`}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>{getStatusIcon(product.status)}<span className="capitalize">{product.status}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-2 text-gray-500">Get started by adding your first product to track its expiry date.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;