'use client';

import { useState } from 'react';
import { checkInSession } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export default function CheckInPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { showSuccess, showError, ToastComponent } = useToast();

  const handleCheckIn = async (codeToCheck: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await checkInSession(codeToCheck.toUpperCase());
      const successMsg = result.message || 'Inscription réussie !';
      setSuccess(successMsg);
      showSuccess('🎉 +10 🍌 bananes ajoutées à ton solde !');
      // Refresh user data in layout (bananas) - add small delay to ensure backend update is complete
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshUserData'));
      }, 300);
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
            Entrez le code de la session pour vous inscrire
          </p>
        </div>

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

