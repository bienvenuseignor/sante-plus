import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, X, RefreshCw, AlertTriangle, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  instruction?: string;
}

export default function QRScanner({ onScan, onClose, title = "Scanner de Code QR", instruction = "Placez le code QR du patient devant la caméra" }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setLoading(true);
      setError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("L'accès à la caméra n'est pas supporté par ce navigateur ou nécessite une connexion sécurisée (HTTPS).");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Set playsinline for iOS support
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(err => {
            console.error("Video play failed:", err);
          });
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Camera error:", err);
        if (active) {
          setError(err.message || "Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
          setLoading(false);
          setShowManual(true);
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (loading || error || showManual) return;

    function scan() {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            // Found QR code!
            stopCamera();
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameIdRef.current = requestAnimationFrame(scan);
    }

    animationFrameIdRef.current = requestAnimationFrame(scan);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [loading, error, showManual]);

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm font-sans">{title}</h3>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-square w-full bg-black flex flex-col items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="hidden" />

          {showManual ? (
            <div className="w-full h-full p-6 flex flex-col justify-center items-center bg-slate-950 text-white space-y-4">
              <Keyboard className="w-12 h-12 text-amber-500 mb-2" />
              <h4 className="font-bold text-sm text-center">Saisie manuelle du code</h4>
              <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
                Entrez le code d'autorisation copié depuis l'application du patient.
              </p>
              <form onSubmit={handleManualSubmit} className="w-full space-y-3">
                <input 
                  type="text" 
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Collez ou saisissez le code ici..." 
                  className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-800 rounded-xl text-xs font-mono focus:border-emerald-500 focus:outline-none text-white text-center"
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Valider le code d'accès
                </button>
              </form>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
                  <p className="text-xs font-sans">Démarrage de la caméra...</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-10 p-6 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 text-center space-y-4">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                  <p className="text-xs font-semibold max-w-xs">{error}</p>
                  <button 
                    onClick={() => setShowManual(true)} 
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Keyboard className="w-4 h-4" />
                    Utiliser le code manuel
                  </button>
                </div>
              )}

              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                <div className="absolute inset-0 border-[50px] border-slate-950/60"></div>
                
                <div className="relative w-48 h-48 border-2 border-emerald-500/80 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-md"></div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-md"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-md"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-md"></div>

                  <div className="absolute left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#10B981] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>

                <p className="absolute bottom-6 left-4 right-4 text-center text-[11px] text-emerald-300 font-sans tracking-wide drop-shadow-md">
                  {instruction}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-900 text-center flex justify-between items-center px-6">
          <span className="text-[10px] text-slate-500 font-sans">
            Sécurité Décentralisée Santé+
          </span>
          {!showManual && !error && (
            <button 
              onClick={() => { stopCamera(); setShowManual(true); }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Saisie Manuelle
            </button>
          )}
          {showManual && !error && (
            <button 
              onClick={() => { setShowManual(false); }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Activer Caméra
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
