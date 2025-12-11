'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register, teacherLogin } from '@/lib/api';
import Link from 'next/link';
import { Building, GraduationCap, Trophy } from 'lucide-react';

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
  const [demoEmail, setDemoEmail] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
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

  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    setDemoSuccess(false);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(demoEmail)) {
      setDemoLoading(false);
      return;
    }

    try {
      // Open email client with pre-filled template
      const subject = encodeURIComponent('Demande de démo MONKI');
      const body = encodeURIComponent(`Bonjour,\n\nJe souhaite obtenir une démonstration de la plateforme MONKI pour mon établissement.\n\nEmail: ${demoEmail}\n\nCordialement`);
      window.location.href = `mailto:contact@monki.fr?subject=${subject}&body=${body}`;
      
      setDemoSuccess(true);
      setDemoEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setDemoSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error opening email client:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-extrabold text-primary">MONKI</span>
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
            Réconciliez enfin l'école et le plaisir d'apprendre.
          </h1>
          <p className="text-base sm:text-xl md:text-2xl font-medium text-textMuted mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
            La plateforme qui aide les Écoles à fidéliser, donne des super-pouvoirs aux Profs, et rend les Étudiants accros à leurs cours.
          </p>
          
          {/* Demo Request Form */}
          <form onSubmit={handleDemoRequest} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="email"
                value={demoEmail}
                onChange={(e) => setDemoEmail(e.target.value)}
                placeholder="Votre email professionnel"
                required
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition text-text bg-surface min-h-[56px] font-medium text-base sm:text-lg"
              />
              <button
                type="submit"
                disabled={demoLoading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-2xl font-bold text-base sm:text-lg hover:brightness-105 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center gap-2"
                style={!demoLoading ? { boxShadow: '0 5px 0 0 rgba(157, 95, 47, 1)', borderBottom: '5px solid rgba(157, 95, 47, 1)' } : {}}
              >
                {demoLoading ? 'Envoi...' : (
                  <>
                    Demander une démo école 🎓
                  </>
                )}
              </button>
            </div>
            {demoSuccess && (
              <div className="mt-4 px-4 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl font-medium">
                Merci ! Votre client email va s'ouvrir pour envoyer votre demande.
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Pour qui ? Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-4xl font-black text-center text-text mb-8 sm:mb-12">
          Pour qui ?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Carte 1 - Pour l'École */}
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-4">
              Pour l'École
            </h3>
            <p className="text-textMuted text-base">
              Boostez votre taux de rétention et modernisez votre image de marque.
            </p>
          </div>

          {/* Carte 2 - Pour les Profs */}
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-4">
              Pour les Profs
            </h3>
            <p className="text-textMuted text-base">
              Des outils simples pour transformer n'importe quel cours en expérience interactive.
            </p>
          </div>

          {/* Carte 3 - Pour les Étudiants */}
          <div className="bg-surface rounded-2xl shadow-card p-8 hover:shadow-lift hover:scale-[1.02] transition-all duration-200 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-text mb-4">
              Pour les Étudiants
            </h3>
            <p className="text-textMuted text-base">
              Apprendre devient un jeu. Classements, récompenses et motivation garantie.
            </p>
          </div>
        </div>
      </section>

      {/* Preuve Sociale Section */}
      <section className="bg-surface py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logos Partenaires */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-center text-text mb-8 sm:mb-12">
              Ils transforment l'éducation
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 opacity-60">
              <div className="text-2xl sm:text-3xl font-bold text-textMuted">Lycée Victor Hugo</div>
              <div className="text-2xl sm:text-3xl font-bold text-textMuted">Collège Marie Curie</div>
              <div className="text-2xl sm:text-3xl font-bold text-textMuted">École Primaire Jean Jaurès</div>
              <div className="text-2xl sm:text-3xl font-bold text-textMuted">Institut Supérieur</div>
            </div>
          </div>

          {/* Témoignages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Témoignage 1 - Directrice */}
            <div className="bg-background rounded-2xl shadow-card p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">👩‍💼</span>
                </div>
                <div>
                  <h4 className="font-bold text-text text-lg">Marie Dubois</h4>
                  <p className="text-textMuted text-sm">Directrice d'école</p>
                </div>
              </div>
              <p className="text-textMuted text-base italic">
                "Une modernisation immédiate de notre pédagogie"
              </p>
            </div>

            {/* Témoignage 2 - Professeur */}
            <div className="bg-background rounded-2xl shadow-card p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">👨‍🏫</span>
                </div>
                <div>
                  <h4 className="font-bold text-text text-lg">Pierre Martin</h4>
                  <p className="text-textMuted text-sm">Professeur de Mathématiques</p>
                </div>
              </div>
              <p className="text-textMuted text-base italic">
                "Mes étudiants sont enfin réveillés"
              </p>
            </div>
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
            Prêt à transformer votre établissement ?
          </h2>
          <p className="text-lg sm:text-xl font-medium text-white/90 mb-8">
            Rejoignez les écoles qui modernisent leur pédagogie et boostent l'engagement de leurs étudiants
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
                }, 500);
              }}
              className="px-8 sm:px-12 py-4 sm:py-5 bg-white text-primary rounded-2xl font-bold text-lg sm:text-xl hover:brightness-95 transition-all duration-150 min-h-[64px] flex items-center justify-center gap-2"
              style={{ boxShadow: '0 5px 0 0 rgba(157, 95, 47, 1)', borderBottom: '5px solid rgba(157, 95, 47, 1)' }}
            >
              Demander une démo 🎓
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-textMuted">
              © 2024 MONKI. Tous droits réservés.
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
