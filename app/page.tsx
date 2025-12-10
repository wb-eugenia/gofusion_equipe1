'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register, teacherLogin } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [code, setCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [error, setError] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { sessionId, role, isTeacher } = await register(prenom, code || undefined);
      localStorage.setItem('sessionId', sessionId);
      setShowRegisterModal(false);
      setPrenom('');
      setCode('');
      
      // Redirect based on role
      if (isTeacher || role === 'teacher') {
        router.push('/teacher/courses');
      } else {
        router.push('/student/courses');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherLoading(true);
    setTeacherError('');

    try {
      if (!teacherCode.trim()) {
        setTeacherError('Le code d\'accès est requis');
        setTeacherLoading(false);
        return;
      }

      // Use teacher login with code only
      const { sessionId, role, isTeacher } = await teacherLogin(teacherCode.trim().toUpperCase());
      
      // Verify that the user is actually a teacher
      if (!isTeacher && role !== 'teacher') {
        setTeacherError('Code invalide ou vous n\'êtes pas un professeur');
        setTeacherLoading(false);
        return;
      }

      localStorage.setItem('sessionId', sessionId);
      setShowTeacherModal(false);
      setTeacherCode('');
      router.push('/teacher/courses');
    } catch (err: any) {
      setTeacherError(err.message || 'Code invalide ou erreur lors de la connexion');
    } finally {
      setTeacherLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-extrabold text-primary">MOCHI</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/admin"
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-textMuted text-white rounded-xl text-xs sm:text-sm font-bold hover:brightness-105 transition-all duration-150 min-h-[44px] flex items-center justify-center"
                style={{ boxShadow: '0 3px 0 0 rgba(107, 91, 79, 1)', borderBottom: '3px solid rgba(107, 91, 79, 1)' }}
              >
                Admin
              </Link>
              <button
                onClick={() => setShowTeacherModal(true)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:brightness-105 transition-all duration-150 min-h-[44px] flex items-center justify-center"
                style={{ boxShadow: '0 3px 0 0 rgba(37, 99, 235, 1)', borderBottom: '3px solid rgba(37, 99, 235, 1)' }}
              >
                Prof
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold hover:brightness-105 transition-all duration-150 min-h-[44px] flex items-center justify-center"
                style={{ boxShadow: '0 3px 0 0 rgba(157, 95, 47, 1)', borderBottom: '3px solid rgba(157, 95, 47, 1)' }}
              >
                Étudiant
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-text mb-4 sm:mb-6">
            Apprenez en vous amusant !
          </h1>
          <p className="text-base sm:text-xl md:text-2xl font-medium text-textMuted mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Transformez votre apprentissage en jeu avec notre plateforme MOCHI.
            Gagnez des 🍌 bananes, débloquez des badges et montez dans le classement !
          </p>
          {/* Dashboard Selection */}
          <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-text mb-6 text-center">
              Choisissez votre espace
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 px-4">
              {/* Admin Dashboard */}
              <Link
                href="/admin"
                className="bg-surface rounded-2xl shadow-card p-6 sm:p-8 hover:shadow-lift hover:-translate-y-1 transition-all duration-200 text-center group cursor-pointer min-h-[200px] sm:min-h-[240px] flex flex-col justify-center items-center"
              >
                <div className="text-5xl sm:text-6xl mb-4">👨‍💼</div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 group-hover:text-primary transition">
                  Admin
                </h3>
                <p className="text-textMuted text-sm sm:text-base mb-4">
                  Gérez les cours, sessions, badges et utilisateurs
                </p>
                <span className="px-4 sm:px-6 py-2 sm:py-3 bg-textMuted text-white rounded-xl font-bold text-sm sm:text-base hover:brightness-105 transition min-h-[48px] flex items-center justify-center w-full pointer-events-none">
                  Accéder au dashboard
                </span>
              </Link>

              {/* Teacher Dashboard */}
              <button
                onClick={() => setShowTeacherModal(true)}
                className="bg-surface rounded-2xl shadow-card p-6 sm:p-8 hover:shadow-lift hover:-translate-y-1 transition-all duration-200 text-center group cursor-pointer min-h-[200px] sm:min-h-[240px] flex flex-col justify-center items-center w-full"
              >
                <div className="text-5xl sm:text-6xl mb-4">👨‍🏫</div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 group-hover:text-blue-600 transition">
                  Professeur
                </h3>
                <p className="text-textMuted text-sm sm:text-base mb-4">
                  Créez des cours, gérez les sessions et consultez les analytics
                </p>
                <span className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl font-bold text-sm sm:text-base hover:brightness-105 transition min-h-[48px] flex items-center justify-center w-full">
                  Accéder au dashboard
                </span>
              </button>

              {/* Student Dashboard */}
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-surface rounded-2xl shadow-card p-6 sm:p-8 hover:shadow-lift hover:-translate-y-1 transition-all duration-200 text-center group cursor-pointer min-h-[200px] sm:min-h-[240px] flex flex-col justify-center items-center"
              >
                <div className="text-5xl sm:text-6xl mb-4">👨‍🎓</div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 group-hover:text-primary transition">
                  Étudiant
                </h3>
                <p className="text-textMuted text-sm sm:text-base mb-4">
                  Apprenez, gagnez des bananes et débloquez des badges
                </p>
                <div className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-xl font-bold text-sm sm:text-base hover:brightness-105 transition min-h-[48px] flex items-center justify-center w-full">
                  Créer un compte
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-4">
            <Link
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-surface text-primary rounded-2xl font-bold text-base sm:text-lg hover:bg-hover hover:translate-y-1 active:translate-y-[5px] transition-all duration-150 border-2 border-primary min-h-[56px] flex items-center justify-center"
              style={{ boxShadow: '0 5px 0 0 rgba(228, 210, 194, 1)', borderBottom: '5px solid rgba(228, 210, 194, 1)' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 0 0 rgba(228, 210, 194, 1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 5px 0 0 rgba(228, 210, 194, 1)'}
              onMouseDown={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 rgba(228, 210, 194, 1)'}
              onMouseUp={(e) => e.currentTarget.style.boxShadow = '0 2px 0 0 rgba(228, 210, 194, 1)'}
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-4xl font-black text-center text-text mb-8 sm:mb-12">
          Fonctionnalités
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center"></div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Système de Bananes 🍌</h3>
            <p className="text-textMuted text-center">
              Gagnez des bananes en complétant des cours et en participant aux sessions.
              Plus vous apprenez, plus vous progressez !
            </p>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center"></div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Badges & Achievements</h3>
            <p className="text-textMuted text-center">
              Débloquez des badges en atteignant des objectifs. De "Débutant" à "Légende",
              collectionnez-les tous !
            </p>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center"></div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Classement</h3>
            <p className="text-textMuted text-center">
              Comparez votre progression avec les autres étudiants. Montez dans le classement
              et devenez le meilleur !
            </p>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center"></div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Cours Interactifs</h3>
            <p className="text-textMuted text-center">
              Accédez à une variété de cours et complétez-les pour gagner des 🍌 bananes.
              Chaque cours complété vous rapproche de nouveaux badges !
            </p>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center"></div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Sessions avec code</h3>
            <p className="text-textMuted text-center">
              Participez aux sessions en entrant un code de session. Gagnez 10 🍌 bananes à chaque participation
              et suivez votre présence !
            </p>
          </div>
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200">
            <div className="text-5xl mb-4 text-center">🔥</div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-3 text-center">Streak</h3>
            <p className="text-textMuted text-center">
              Maintenez votre série de jours consécutifs ! Plus vous êtes régulier,
              plus vous progressez rapidement.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-text mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-secondary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-extrabold text-text">1</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text mb-2">Inscrivez-vous</h3>
              <p className="text-textMuted">
                Créez votre compte en quelques secondes avec juste votre prénom
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-extrabold text-text">2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text mb-2">Explorez les cours</h3>
              <p className="text-textMuted">
                Parcourez les cours disponibles et commencez votre apprentissage
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-extrabold text-text">3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text mb-2">Gagnez des 🍌 bananes</h3>
              <p className="text-textMuted">
                Complétez les cours et participez aux sessions pour gagner des points
              </p>
            </div>
            <div className="text-center">
              <div className="bg-secondary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-extrabold text-text">4</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-text mb-2">Débloquez des badges</h3>
              <p className="text-textMuted">
                Atteignez des objectifs et collectionnez tous les badges disponibles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Prêt à commencer votre aventure ?
          </h2>
          <p className="text-lg sm:text-xl font-medium text-white/90 mb-8">
            Rejoignez des centaines d'étudiants qui transforment leur apprentissage en jeu
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="px-6 sm:px-8 py-4 bg-white text-textMuted rounded-2xl font-bold text-base sm:text-lg hover:brightness-95 transition-all duration-150 min-h-[56px] flex items-center justify-center"
              style={{ boxShadow: '0 5px 0 0 rgba(107, 91, 79, 1)', borderBottom: '5px solid rgba(107, 91, 79, 1)' }}
            >
              👨‍💼 Admin
            </Link>
            <button
              onClick={() => setShowTeacherModal(true)}
              className="px-6 sm:px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-base sm:text-lg hover:brightness-95 transition-all duration-150 min-h-[56px] flex items-center justify-center"
              style={{ boxShadow: '0 5px 0 0 rgba(37, 99, 235, 1)', borderBottom: '5px solid rgba(37, 99, 235, 1)' }}
            >
              👨‍🏫 Professeur
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 sm:px-8 py-4 bg-white text-primary rounded-2xl font-bold text-base sm:text-lg hover:brightness-95 transition-all duration-150 min-h-[56px]"
              style={{ boxShadow: '0 5px 0 0 rgba(228, 210, 194, 1)', borderBottom: '5px solid rgba(228, 210, 194, 1)' }}
            >
              👨‍🎓 Étudiant
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-textMuted">
              © 2024 MOCHI. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Teacher Login Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lift p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-text mb-2">
                Accès Professeur
              </h2>
              <p className="text-textMuted">
                Entrez votre code d'accès pour accéder au dashboard
              </p>
            </div>

            <form onSubmit={handleTeacherLogin} className="space-y-6">
              <div>
                <label htmlFor="teacherCode" className="block text-sm font-medium text-text mb-2">
                  Code d'accès *
                </label>
                <input
                  id="teacherCode"
                  type="text"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-3 border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition text-text bg-surface min-h-[52px] font-mono font-medium text-center text-lg"
                  placeholder="Entrez votre code d'accès"
                  autoFocus
                />
                <p className="text-xs text-textMuted mt-1">
                  Le code vous a été fourni lors de la création de votre compte professeur.
                </p>
              </div>

              {teacherError && (
                <div className="bg-error/10 border-2 border-error/30 text-error px-4 py-3 rounded-2xl font-medium">
                  {teacherError}
                </div>
              )}

              <button
                type="submit"
                disabled={teacherLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:brightness-105 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
                style={!teacherLoading ? { boxShadow: '0 5px 0 0 rgba(37, 99, 235, 1)', borderBottom: '5px solid rgba(37, 99, 235, 1)' } : {}}
              >
                {teacherLoading ? 'Connexion...' : 'Accéder au dashboard'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowTeacherModal(false);
                setTeacherError('');
                setTeacherCode('');
              }}
              className="mt-4 w-full text-textMuted hover:text-text transition min-h-[44px] font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lift p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-text mb-2">
                Créer un compte
              </h2>
              <p className="text-textMuted">
                Commencez votre aventure en quelques secondes
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-text mb-2">
                  Prénom
                </label>
                <input
                  id="prenom"
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition text-text bg-surface min-h-[52px] font-medium"
                  placeholder="Entrez votre prénom"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-text mb-2">
                  Code professeur (optionnel)
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition text-text bg-surface min-h-[52px] font-medium"
                  placeholder="Entrez le code si vous en avez un"
                />
                <p className="text-xs text-textMuted mt-1">
                  Si un professeur vous a donné un code, entrez-le ici pour accéder à ses cours.
                </p>
              </div>

              {error && (
                <div className="bg-error/10 border-2 border-error/30 text-error px-4 py-3 rounded-2xl font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:brightness-105 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
                style={!loading ? { boxShadow: '0 5px 0 0 rgba(157, 95, 47, 1)', borderBottom: '5px solid rgba(157, 95, 47, 1)' } : {}}
              >
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowRegisterModal(false);
                setError('');
                setPrenom('');
                setCode('');
              }}
              className="mt-4 w-full text-textMuted hover:text-text transition min-h-[44px] font-bold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
