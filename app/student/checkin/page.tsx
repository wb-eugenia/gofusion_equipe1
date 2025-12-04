'use client';

import { useState, useEffect, useRef } from 'react';
import { checkInSession } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/useToast';

export default function CheckInPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();
  const { showSuccess, showError, ToastComponent } = useToast();

  const startScanning = async () => {
    try {
      setCameraError('');
      
      // Vérifier si l'API MediaDevices est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Votre navigateur ne supporte pas l\'accès à la caméra. Utilisez un navigateur moderne (Chrome, Firefox, Safari, Edge).');
        return;
      }

      // Demander explicitement l'autorisation d'accès à la caméra
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Caméra arrière sur mobile
          } 
        });
        
        // Arrêter le stream temporaire pour que Html5Qrcode puisse le gérer
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError: any) {
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          setCameraError('❌ Autorisation refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur et réessayer.');
        } else if (permissionError.name === 'NotFoundError' || permissionError.name === 'DevicesNotFoundError') {
          setCameraError('❌ Aucune caméra trouvée. Vérifiez que votre appareil possède une caméra.');
        } else if (permissionError.name === 'NotReadableError' || permissionError.name === 'TrackStartError') {
          setCameraError('❌ La caméra est déjà utilisée par une autre application. Fermez les autres applications utilisant la caméra.');
        } else {
          setCameraError(`❌ Erreur d'accès à la caméra: ${permissionError.message || 'Erreur inconnue'}`);
        }
        console.error('Camera permission error:', permissionError);
        return;
      }

      // Si l'autorisation est accordée, démarrer le scanner
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      // Essayer d'abord la caméra arrière (mobile), puis la caméra avant (PC)
      let cameraId: string | null = null;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Chercher la caméra arrière (environment)
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          cameraId = backCamera.deviceId;
        } else if (videoDevices.length > 0) {
          cameraId = videoDevices[0].deviceId;
        }
      } catch (e) {
        console.warn('Could not enumerate devices:', e);
      }
      
      const config = cameraId 
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };
      
      await scanner.start(
        config,
        {
          qrbox: { width: 250, height: 250 },
          fps: 10,
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedCode(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore scanning errors (just trying to scan)
        }
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.message && err.message.includes('Permission')) {
        setCameraError('❌ Autorisation refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.');
      } else {
        setCameraError(`❌ Erreur lors du démarrage du scanner: ${err.message || 'Erreur inconnue'}`);
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScannedCode = async (scannedCode: string) => {
    setCode(scannedCode);
    await handleCheckIn(scannedCode);
  };

  const handleCheckIn = async (codeToCheck: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await checkInSession(codeToCheck.toUpperCase());
      const successMsg = result.message || 'Inscription réussie !';
      setSuccess(successMsg);
      showSuccess('🎉 +10 🍌 bananes ajoutées à ton solde !');
      setTimeout(() => {
        // Redirect to session quiz page
        router.push(`/student/session/quiz?code=${codeToCheck.toUpperCase()}`);
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de l\'inscription';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCheckIn(code);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <>
      <ToastComponent />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift transition-all duration-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-text mb-2">
            📱 Check-in Session
          </h1>
          <p className="text-textMuted">
            Entrez le code de la session ou scannez le QR code
          </p>
        </div>

        {/* QR Code Scanner */}
        <div className="mb-6">
          {!scanning ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={startScanning}
                className="w-full py-3 bg-success text-white rounded-2xl font-bold hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 shadow-button"
              >
                📷 Scanner le QR Code
              </button>
              <p className="text-xs text-textMuted text-center">
                En cliquant, vous autoriserez l'accès à votre caméra
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[250px] flex items-center justify-center">
                <p className="text-white text-sm">Positionnez le QR code dans le cadre</p>
              </div>
              <button
                type="button"
                onClick={stopScanning}
                className="w-full py-3 bg-error text-white rounded-2xl font-bold hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 shadow-button"
              >
                Arrêter le scan
              </button>
            </div>
          )}
          {cameraError && (
            <div className="bg-error/10 border-2 border-error/30 text-error px-4 py-3 rounded-2xl text-sm mt-3">
              {cameraError}
              <div className="mt-2 text-xs">
                <p className="font-bold mb-1">Comment autoriser la caméra :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Chrome/Edge :</strong> Cliquez sur l'icône dans la barre d'adresse → Autoriser la caméra</li>
                  <li><strong>Firefox :</strong> Cliquez sur l'icône → Permissions → Autoriser la caméra</li>
                  <li><strong>Safari :</strong> Safari → Préférences → Sites web → Caméra → Autoriser</li>
                  <li><strong>Mobile :</strong> Paramètres → Applications → Navigateur → Autorisations → Caméra</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-textMuted font-bold mb-4">OU</div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-extrabold text-text mb-2">
              Code de Session
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-center text-2xl font-black tracking-widest text-text bg-white hover:border-primary/50"
              placeholder="ABC123"
            />
          </div>

          {error && (
            <div className="bg-error/10 border-2 border-error/30 text-error px-4 py-3 rounded-2xl font-bold">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border-2 border-success/30 text-success px-4 py-3 rounded-2xl font-bold">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-2xl font-black hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-button"
          >
            {loading ? 'Inscription...' : 'S\'inscrire à la Session'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-textMuted font-semibold">
          <p>Gagnez 10 🍌 bananes en vous inscrivant à une session !</p>
        </div>
      </div>
    </div>
    </>
  );
}

