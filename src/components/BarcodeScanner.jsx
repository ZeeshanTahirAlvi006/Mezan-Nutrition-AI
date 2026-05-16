import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import client from '../api/client';
import { Camera, X, Upload, ScanLine } from 'lucide-react';

const BarcodeScanner = ({ onAddFood }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Failed to stop scanner", e));
      }
    };
  }, []);

  const startScanner = async () => {
    setScanning(true);
    setError(null);
    
    // Small delay to ensure the div with id="reader" is rendered
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          async (decodedText) => {
            await html5QrCode.stop();
            setScanning(false);
            await lookupBarcode(decodedText);
          },
          (errorMessage) => {
            // Ignore ongoing scan errors
          }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        setError("Could not start camera. Please ensure you've granted permission.");
        setScanning(false);
      }
    }, 100);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      await lookupBarcode(decodedText);
    } catch (err) {
      console.error("File scan error:", err);
      setError("We couldn't detect a barcode in this image. Please try a clearer photo.");
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  const lookupBarcode = async (barcode) => {
    setLoading(true);
    try {
      const { data } = await client.get(`/api/food/search?q=${barcode}`);
      if (data && data.length > 0) {
        onAddFood(data[0]);
      } else {
        setError(`Product not found: ${barcode}`);
      }
    } catch (err) {
      setError("Database lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      setScanning(false);
    }
  };

  return (
    <div className="kcal-card flex flex-col h-full relative overflow-hidden">
      {/* Hidden element for file scanning */}
      <div id="reader-hidden" className="hidden"></div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-(--kcal-green-light) p-2 rounded-lg text-(--kcal-green)">
            <ScanLine className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-(--kcal-text-main) uppercase tracking-tight">Scan Product</h3>
        </div>
        
        {!scanning && (
          <div className="flex items-center gap-3">
            <label className="flex items-center justify-center space-x-2 bg-(--kcal-green-light) text-(--kcal-green) px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-(--kcal-green) hover:text-white transition-all cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
            <button 
              onClick={startScanner}
              className="flex items-center justify-center space-x-2 bg-(--kcal-green) text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[#91C788]/20"
              disabled={loading}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-(--kcal-coral-light) text-(--kcal-coral) rounded-lg text-xs font-bold border border-(--kcal-coral)/10 animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {loading && !scanning && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--kcal-green)"></div>
          <p className="text-[10px] font-black text-(--kcal-text-muted) uppercase tracking-widest">Processing...</p>
        </div>
      )}

      {scanning && (
        <div className="relative flex-1 min-h-[300px] mt-2">
          <button 
            onClick={stopScanner}
            className="absolute top-4 right-4 z-20 bg-white/80 backdrop-blur text-(--kcal-text-muted) p-2 rounded-full shadow-md hover:text-(--kcal-coral) transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div id="reader" className="w-full h-full bg-black rounded-xl overflow-hidden border-2 border-(--kcal-green) shadow-inner"></div>
          <div className="absolute inset-x-0 bottom-6 flex justify-center px-6">
            <p className="bg-black/40 backdrop-blur-md text-white text-[10px] px-4 py-2 rounded-full font-bold uppercase tracking-widest">
              Center the barcode inside the box
            </p>
          </div>
        </div>
      )}

      {!scanning && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-40">
          <div className="w-20 h-20 bg-(--kcal-green-light) rounded-full flex items-center justify-center mb-4">
            <ScanLine className="w-10 h-10 text-(--kcal-green)" />
          </div>
          <p className="text-[10px] font-black text-(--kcal-text-muted) uppercase tracking-[0.2em]">Ready to scan</p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
