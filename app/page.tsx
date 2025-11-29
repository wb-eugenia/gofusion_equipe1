'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { sessionId } = await register(prenom);
      localStorage.setItem('sessionId', sessionId);
      setShowRegisterModal(false);
      router.push('/student/courses');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-lg sm:text-2xl font-bold text-blue-600">🎮 Gamification App</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/admin/login"
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-purple-700 transition"
              >
                Admin
              </Link>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition"
              >
                <span className="hidden sm:inline">Créer un compte</span>
                <span className="sm:hidden">S'inscrire</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Apprenez en vous amusant ! 🎯
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Transformez votre apprentissage en jeu avec notre plateforme de gamification.
            Gagnez des XP, débloquez des badges et montez dans le classement !
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-4">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-700 transition shadow-lg"
            >
              Commencer maintenant
            </button>
            <Link
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-50 transition shadow-lg border-2 border-blue-600"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-4xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
          Fonctionnalités
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">⭐</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Système d'XP</h3>
            <p className="text-gray-600 text-center">
              Gagnez des points d'expérience en complétant des cours et en participant aux sessions.
              Plus vous apprenez, plus vous progressez !
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">🎖️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Badges & Achievements</h3>
            <p className="text-gray-600 text-center">
              Débloquez des badges en atteignant des objectifs. De "Débutant" à "Légende",
              collectionnez-les tous !
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">🏆</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Classement</h3>
            <p className="text-gray-600 text-center">
              Comparez votre progression avec les autres étudiants. Montez dans le classement
              et devenez le meilleur !
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Cours Interactifs</h3>
            <p className="text-gray-600 text-center">
              Accédez à une variété de cours et complétez-les pour gagner de l'XP.
              Chaque cours complété vous rapproche de nouveaux badges !
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">📱</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Sessions QR Code</h3>
            <p className="text-gray-600 text-center">
              Participez aux sessions en scannant un QR code. Gagnez 10 XP à chaque participation
              et suivez votre présence !
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
            <div className="text-5xl mb-4 text-center">🔥</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">Streak</h3>
            <p className="text-gray-600 text-center">
              Maintenez votre série de jours consécutifs ! Plus vous êtes régulier,
              plus vous progressez rapidement.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inscrivez-vous</h3>
              <p className="text-gray-600">
                Créez votre compte en quelques secondes avec juste votre prénom
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Explorez les cours</h3>
              <p className="text-gray-600">
                Parcourez les cours disponibles et commencez votre apprentissage
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gagnez de l'XP</h3>
              <p className="text-gray-600">
                Complétez les cours et participez aux sessions pour gagner des points
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Débloquez des badges</h3>
              <p className="text-gray-600">
                Atteignez des objectifs et collectionnez tous les badges disponibles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à commencer votre aventure ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des centaines d'étudiants qui transforment leur apprentissage en jeu
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            Créer mon compte gratuitement
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Gamification App. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Créer un compte
              </h2>
              <p className="text-gray-600">
                Commencez votre aventure en quelques secondes
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  id="prenom"
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 bg-white"
                  placeholder="Entrez votre prénom"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowRegisterModal(false);
                setError('');
                setPrenom('');
              }}
              className="mt-4 w-full text-gray-600 hover:text-gray-800 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
