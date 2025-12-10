'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/api';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      // Don't redirect immediately, show a message or allow access
      setLoading(false);
      return;
    }

    getUser()
      .then((userData) => {
        if (userData.role !== 'teacher' && userData.role !== 'admin') {
          // If user is not a teacher, show message but don't redirect immediately
          setUser(null);
          setLoading(false);
          return;
        }
        setUser(userData);
        setLoading(false);
      })
      .catch(() => {
        // No session or error - allow access but show message
        setUser(null);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (sidebarOpen && !target.closest('.sidebar') && !target.closest('.burger-button')) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return null;
  }

  const navItems = [
    { href: '/teacher/courses', label: 'Mes Cours', icon: '📚' },
    { href: '/teacher/sessions', label: 'Sessions', icon: '🎯' },
    { href: '/teacher/analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-surface shadow-card sticky top-0 z-50 lg:hidden">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="burger-button p-2 text-text hover:bg-hover rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-text">Prof</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`sidebar fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface shadow-card transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-text">👨‍🏫 Professeur</h2>
              {user && (
                <p className="text-sm text-textMuted mt-1">{user.prenom}</p>
              )}
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    pathname === item.href
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-hover'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-border">
              <button
                onClick={() => {
                  localStorage.removeItem('sessionId');
                  router.push('/');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text hover:bg-hover transition bg-red-50 hover:bg-red-100 text-red-600 min-h-[44px]"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {loading ? (
            <div className="p-6 text-center">Chargement...</div>
          ) : !user ? (
            <div className="p-6 max-w-2xl mx-auto">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">Accès restreint</h2>
                <p className="text-yellow-700 mb-4">
                  Vous devez être connecté en tant que professeur pour accéder à cette section.
                </p>
                <div className="flex gap-4">
                  <Link
                    href="/"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                  >
                    Retour à l'accueil
                  </Link>
                  <button
                    onClick={() => {
                      const prenom = prompt('Entrez votre prénom pour vous connecter:');
                      if (prenom) {
                        // Try to find user and create session
                        // This is a simple approach - in production you'd have proper auth
                        window.location.href = '/';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

