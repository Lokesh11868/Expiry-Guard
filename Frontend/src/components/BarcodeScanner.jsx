import { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [scanning, setScanning] = useState(true);
  const [rawCode, setRawCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scanning) return;
    let debounceTimeout;
    Quagga.init({
      inputStream: { type: 'LiveStream', target: scannerRef.current, constraints: { facingMode: 'environment', width: 400, height: 300 } },
      decoder: { readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'code_128_reader'] },
      locate: true,
      locator: { patchSize: 'x-large', halfSample: false },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      frequency: 10,
      multiple: false
    }, err => {
      setLoading(false);
      if (err) { setError('Failed to initialize camera: ' + err.message); setScanning(false); return; }
      Quagga.start();
    });
    // Confirmation logic
    let lastCode = '';
    let confirm = 0;
    const onDetected = data => {
      const code = data.codeResult.code;
      setRawCode(code);
      if (code === lastCode) {
        confirm++;
        if (confirm >= 2) { // Require 2 identical reads
          Quagga.stop();
          setScanning(false);
          onScan && onScan(code);
        }
      } else {
        lastCode = code;
        confirm = 1;
      }
    };
    Quagga.onDetected(onDetected);
    return () => {
      try { Quagga.stop(); } catch {}
      Quagga.offDetected(onDetected);
    };
  }, [onScan, scanning]);

  const handleManualEntry = () => {
    const manualCode = prompt('Enter barcode manually:');
    if (manualCode && /^\d{8,13}$/.test(manualCode.trim())) {
      setScanning(false);
      onScan && onScan(manualCode.trim());
    } else {
      alert('Please enter a valid 8-13 digit barcode.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-auto relative flex flex-col items-center">
        <div className="mb-2 text-lg font-semibold">Barcode Scanner</div>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        {loading && <div className="mb-2 text-gray-500">Loading...</div>}
        <div style={{ position: 'relative', width: '100%', height: 240 }}>
          <div ref={scannerRef} style={{ width: '100%', height: 240, background: '#222', borderRadius: 8, zIndex: 1 }} />
        </div>
        {rawCode && <div className="mt-2 text-xs text-gray-500">Raw scanned code: {rawCode}</div>}
        <div className="flex gap-2 mt-8">
          <button onClick={onClose} style={{ zIndex: 10, pointerEvents: 'auto', position: 'relative' }} className="w-full bg-red-600 text-white px-12 py-1 rounded hover:bg-red-700 text-base">Close</button>
          <button onClick={handleManualEntry} style={{ zIndex: 10, pointerEvents: 'auto', position: 'relative' }} className="w-full bg-blue-600 text-white px-12 py-1 rounded hover:bg-blue-700 text-base">Enter Manually</button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;