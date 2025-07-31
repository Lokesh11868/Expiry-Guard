import { useState, useEffect } from 'react';
import { addProduct, uploadImage, getProductByBarcode } from '../services/productService';
import { Package, Upload, Scan, Camera, Barcode, Calendar, Calculator } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import toast from 'react-hot-toast';

const AddProduct = () => {
  const [formData, setFormData] = useState({ product_name: '', expiry_date: '', image_url: '', barcode: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
  const [scannedProductInfo, setScannedProductInfo] = useState(null);
  const [useBestBefore, setUseBestBefore] = useState(false);
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [bestBeforeMonths, setBestBeforeMonths] = useState('');
  const [calculatedExpiryDate, setCalculatedExpiryDate] = useState('');

  const isValidDate = d => {
    if (!d || d.length !== 10) return false;
    try {
      const [day, month, year] = d.split('/').map(Number);
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
      const date = new Date(year, month - 1, day);
      return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    } catch { return false; }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.product_name || (!formData.expiry_date && !useBestBefore)) return toast.error('Please fill in all required fields');
    if (useBestBefore && (!manufacturingDate || !bestBeforeMonths)) return toast.error('Please enter manufacturing date and best before months');
    try {
      await addProduct(formData);
      toast.success('Product added successfully!');
      setFormData({ product_name: '', expiry_date: '', image_url: '', barcode: '' });
      setExtractedText(''); setScannedProductInfo(null); setUseBestBefore(false); setManufacturingDate(''); setBestBeforeMonths(''); setCalculatedExpiryDate('');
    } catch { toast.error('Failed to add product'); }
  };

  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image size should be less than 5MB');
    setIsUploading(true);
    try {
      const response = await uploadImage(file);
      setFormData(prev => ({
        ...prev,
        image_url: response.image_url,
        expiry_date: response.expiry_date || prev.expiry_date,
        product_name: response.product_name || prev.product_name
      }));
      setExtractedText(response.extracted_text || '');
      if (response.best_before_months) { setBestBeforeMonths(response.best_before_months); setUseBestBefore(true); toast.success(`Best before ${response.best_before_months} months detected! Please enter manufacturing date.`); }
      if (response.expiry_date) toast.success('Expiry date extracted successfully!');
      if (response.product_name) toast.success('Product name detected!');
    } catch { toast.error('Failed to process image'); }
    finally { setIsUploading(false); }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return toast.error('Speech recognition not supported in this browser.');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      toast('Recognized: ' + transcript);
      fetch(`${import.meta.env.VITE_API_URL}/parse-voice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error('Voice input error: ' + (data.error || 'Unknown error'));
          } else {
            setFormData(f => ({ ...f, product_name: data.product_name || f.product_name, expiry_date: data.expiry_date || f.expiry_date }));
            toast.success('Voice input processed!');
          }
        })
        .catch(() => toast.error('Failed to process voice input.'));
    };
    recognition.onerror = event => toast.error('Speech recognition error: ' + event.error);
    recognition.start();
  };

  useEffect(() => {
    if (useBestBefore && manufacturingDate && bestBeforeMonths && manufacturingDate.length === 10 && isValidDate(manufacturingDate)) {
      try {
        const [day, month, year] = manufacturingDate.split('/').map(Number);
        const mfgDate = new Date(year, month - 1, day);
        const expiryDate = new Date(mfgDate);
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(bestBeforeMonths));
        const formattedDate = expiryDate.toLocaleDateString('en-GB');
        setCalculatedExpiryDate(formattedDate);
        setFormData(f => ({ ...f, expiry_date: formattedDate }));
      } catch { setCalculatedExpiryDate(''); }
    } else if (useBestBefore) setCalculatedExpiryDate('');
  }, [useBestBefore, manufacturingDate, bestBeforeMonths]);

  const handleBarcodeScanned = async barcode => {
    setShowBarcodeScanner(false); setIsLoadingBarcode(true);
    try {
      const productData = await getProductByBarcode(barcode);
      setFormData(f => ({ ...f, barcode, product_name: productData?.product_name || f.product_name }));
      setScannedProductInfo(productData || null);
      toast.success(productData ? `Product found: ${productData.product_name} (${productData.source})` : 'Barcode scanned! Please enter product details manually.');
    } catch {
      setFormData(f => ({ ...f, barcode }));
      setScannedProductInfo(null);
      toast.info('Barcode scanned! Please enter product details manually.');
    } finally { setIsLoadingBarcode(false); }
  };

  // ...existing code for rendering the form and UI...

  return (
    <>
      <div className="max-w-2xl mx-auto p-2 sm:p-4 md:p-8 bg-white rounded-lg shadow space-y-6">
        <div className="text-center mb-6">
          <Package className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-2xl font-bold">Add New Product</h1>
          <p className="text-gray-600 mt-2">Scan barcode, upload image, or enter details manually</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Barcode Scanner Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
            <div className="text-center">
              <Barcode className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <div className="text-lg font-medium text-gray-700 mb-1">
                Scan Product Barcode
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Automatically load product name from barcode database
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                disabled={isLoadingBarcode}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                <span>{isLoadingBarcode ? 'Loading...' : 'Scan Barcode'}</span>
              </button>
              
              {formData.barcode && (
                <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                  <strong>Barcode:</strong> {formData.barcode}
                </div>
              )}
              
              {scannedProductInfo && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-1">Product Found:</h4>
                  <div className="text-sm">
                    <div><strong>Name:</strong> {scannedProductInfo.product_name}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      Source: {scannedProductInfo.source === 'openfoodfacts' ? 'Open Food Facts' : 
                              scannedProductInfo.source === 'openbeautyfacts' ? 'Open Beauty Facts' : 
                              scannedProductInfo.source === 'user_inventory' ? 'Your Inventory' : 'Unknown'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="text-center">
                <Scan className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <div className="text-lg font-medium text-gray-700 mb-1">
                  Scan Product Image
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Upload image to automatically extract expiry date.
                </div>
                <div className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Processing...' : 'Choose Image'}</span>
                </div>
              </div>
              <input 
                type="file" 
                className="sr-only" 
                accept="image/*" 
                capture="environment"
                onChange={handleImageUpload} 
                disabled={isUploading} 
              />
            </label>
            
            {isUploading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-blue-600">Processing image with OCR...</p>
              </div>
            )}
            
            {formData.image_url && (
              <div className="mt-4 text-center">
                <img src={formData.image_url} alt="Product" className="w-full max-w-xs mx-auto border" />
              </div>
            )}
            
            {extractedText && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <strong>Extracted Text:</strong>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{extractedText}</p>
              </div>
            )}
          </div>

          {/* Manual Entry Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter product name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.product_name}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center justify-center"
                  title="Speak product and expiry date"
                  aria-label="Voice input"
                >
                  {/* Modern mic icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v3m0 0h3m-3 0H9" />
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Expiry Date *
                </label>
                <button
                  type="button"
                  onClick={() => setUseBestBefore(!useBestBefore)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Calculator className="h-4 w-4" />
                  <span>{useBestBefore ? 'Use Direct Date' : 'Calculate from Best Before'}</span>
                </button>
              </div>
              
              {!useBestBefore ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formData.expiry_date && formData.expiry_date.length === 10 && !isValidDate(formData.expiry_date)
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    value={formData.expiry_date}
                    onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                    maxLength="10"
                    required
                  />
                  {formData.expiry_date && formData.expiry_date.length === 10 && !isValidDate(formData.expiry_date) && (
                    <div className="text-xs text-red-600">
                      Please enter a valid date
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Manufacturing Date
                      </label>
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                            manufacturingDate && manufacturingDate.length === 10 && !isValidDate(manufacturingDate)
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          value={manufacturingDate}
                          onChange={e => setManufacturingDate(e.target.value)}
                          maxLength="10"
                        />
                        {manufacturingDate && manufacturingDate.length === 10 && !isValidDate(manufacturingDate) && (
                          <div className="text-xs text-red-600">
                            Please enter a valid date
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Best Before (Months)
                      </label>
                      <input
                        type="number"
                        placeholder="6"
                        min="1"
                        max="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        value={bestBeforeMonths}
                        onChange={e => setBestBeforeMonths(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Remove Calculate Expiry Date button, show calculated date if available */}
                  {calculatedExpiryDate && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          Calculated Expiry Date: {calculatedExpiryDate}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {formData.barcode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  value={formData.barcode}
                  readOnly
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:from-blue-700 hover:to-blue-600 hover:scale-105 transition-all duration-150 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <Package className="h-5 w-5 mr-1" />
            Add Product
          </button>
        </form>
      </div>
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </>
  );
};

export default AddProduct;