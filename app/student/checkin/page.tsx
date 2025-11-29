'use client';

import { useState, useEffect, useRef } from 'react';
import { checkInSession } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

export default function CheckInPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();

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
      setSuccess(result.message || 'Inscription réussie !');
      setTimeout(() => {
        // Redirect to session quiz page
        router.push(`/student/session/quiz?code=${codeToCheck.toUpperCase()}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📱 Check-in Session
          </h1>
          <p className="text-gray-600">
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
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📷 Scanner le QR Code
              </button>
              <p className="text-xs text-gray-500 text-center">
                En cliquant, vous autoriserez l'accès à votre caméra
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[250px] flex items-center justify-center">
                <p className="text-white text-sm">Positionnez le QR code dans le cadre</p>
              </div>
              <button
                type="button"
                onClick={stopScanning}
                className="w-full py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Arrêter le scan
              </button>
            </div>
          )}
          {cameraError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-3">
              {cameraError}
              <div className="mt-2 text-xs">
                <p className="font-semibold mb-1">Comment autoriser la caméra :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Chrome/Edge :</strong> Cliquez sur l'icône 🔒 dans la barre d'adresse → Autoriser la caméra</li>
                  <li><strong>Firefox :</strong> Cliquez sur l'icône 🔒 → Permissions → Autoriser la caméra</li>
                  <li><strong>Safari :</strong> Safari → Préférences → Sites web → Caméra → Autoriser</li>
                  <li><strong>Mobile :</strong> Paramètres → Applications → Navigateur → Autorisations → Caméra</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-gray-500 mb-4">OU</div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Code de Session
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl font-bold tracking-widest text-gray-900 bg-white"
              placeholder="ABC123"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Inscription...' : 'S\'inscrire à la Session'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Gagnez 10 🍌 bananes en vous inscrivant à une session !</p>
        </div>
      </div>
    </div>
  );
}

