'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const ADMIN_PASSWORD = '2007';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if admin is already authenticated
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    // Check if user has a sessionId, if not, they need to register first
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId && adminAuth === 'true') {
      // Admin authenticated but no session - show message
      setError('Veuillez d\'abord vous inscrire sur la page d\'accueil pour accéder à l\'administration');
    }
    
    setLoading(false);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setPassword('');
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    setIsAuthenticated(false);
    router.push('/');
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '' },
    { href: '/admin/courses', label: 'Cours', icon: '' },
    { href: '/admin/sessions', label: 'Sessions', icon: '' },
    { href: '/admin/shop', label: 'Shop', icon: '' },
    { href: '/admin/clans', label: 'Clans', icon: '' },
    { href: '/admin/analytics', label: 'Analytics', icon: '' },
    { href: '/admin/badges', label: 'Badges', icon: '' },
  ];


  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (sidebarOpen && !target.closest('.sidebar') && !target.closest('.burger-button')) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when sidebar is open on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Show password prompt if not authenticated
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface rounded-lg shadow-card p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-primary mb-2 text-center">🔐 Accès Admin</h1>
          <p className="text-textMuted text-center mb-6">Veuillez entrer le mot de passe pour accéder à l'administration</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text bg-background"
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-error">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:brightness-105 transition-all duration-150 font-semibold"
            >
              Se connecter
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-textMuted hover:text-text transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        sidebar fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-surface shadow-lift transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <h2 className="text-lg font-extrabold text-primary">Admin</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-textMuted hover:text-text hover:bg-hover min-h-[44px] min-w-[44px]"
            aria-label="Fermer le menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px]
                ${pathname === item.href
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'text-text hover:bg-hover hover:scale-[1.02]'
                }
              `}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/student/courses"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-text hover:bg-hover rounded-lg transition-all duration-200 min-h-[44px]"
          >
            <span className="mr-3"></span>
            Vue Étudiant
          </Link>
          <button
            onClick={() => {
              handleLogout();
              setSidebarOpen(false);
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-all duration-200 min-h-[44px]"
          >
            <span className="mr-3">🚪</span>
            Déconnexion Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-surface shadow-card border-b border-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Burger Menu Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="burger-button lg:hidden p-2 rounded-md text-textMuted hover:text-text hover:bg-hover min-h-[44px] min-w-[44px]"
            aria-label="Ouvrir le menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop Header Actions */}
          <div className="hidden lg:flex items-center space-x-4 ml-auto">
            <Link
              href="/student/courses"
              className="text-sm text-textMuted hover:text-text transition-colors min-h-[44px] flex items-center"
            >
              Vue Étudiant
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-error hover:text-error/80 transition-colors min-h-[44px]"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
