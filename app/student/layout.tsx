'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/api';

export default function StudentLayout({
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
      router.push('/');
      return;
    }

    // Track session start
    const sessionStartId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();
    localStorage.setItem('currentSessionId', sessionStartId);
    localStorage.setItem('sessionStartTime', startTime.toString());

    getUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('sessionId');
        router.push('/');
      })
      .finally(() => setLoading(false));

    // Track session end on page unload
    const handleBeforeUnload = async () => {
      const currentSessionId = localStorage.getItem('currentSessionId');
      const sessionStartTime = localStorage.getItem('sessionStartTime');
      if (currentSessionId && sessionStartTime) {
        const duration = Math.round((Date.now() - parseInt(sessionStartTime)) / 1000);
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/session/track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionId}`,
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              startedAt: new Date(parseInt(sessionStartTime)),
              endedAt: new Date(),
              durationSeconds: duration,
            }),
            keepalive: true,
          });
        } catch (e) {
          // Ignore errors on unload
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [router]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/student/courses', label: 'Cours', icon: '' },
    { href: '/student/checkin', label: 'Check-in', icon: '' },
    { href: '/student/duel/lobby', label: 'Duel', icon: '' },
    { href: '/student/shop', label: 'Boutique', icon: '' },
    { href: '/student/ranking', label: 'Classement', icon: '' },
    { href: '/student/profile', label: 'Profil', icon: '' },
    { href: '/student/badges', label: 'Badges', icon: '' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
        w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-blue-600">Gamification</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Fermer le menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info in Sidebar */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <img 
                src="/singes/gemini_generated_image_d3kiodd3kiodd3ki-removebg-preview_480.png" 
                alt="Singe" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.prenom}</p>
              <p className="text-xs text-yellow-600">🍌 {user.xp} bananes</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${pathname === item.href
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Burger Menu Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="burger-button lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Ouvrir le menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop Header - User Info */}
          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user.prenom}</p>
              <p className="text-xs text-yellow-600">🍌 {user.xp} bananes</p>
            </div>
            <img 
              src="/singes/gemini_generated_image_d3kiodd3kiodd3ki-removebg-preview_480.png" 
              alt="Singe" 
              className="w-12 h-12 object-contain"
            />
          </div>

          {/* Mobile Header - User Info */}
          <div className="lg:hidden flex items-center gap-2 ml-auto">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{user.prenom}</p>
              <p className="text-xs text-yellow-600">🍌 {user.xp}</p>
            </div>
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
