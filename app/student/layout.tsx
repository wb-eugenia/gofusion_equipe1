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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/student/courses', label: 'Cours', icon: '📚' },
    { href: '/student/checkin', label: 'Check-in', icon: '📱' },
    { href: '/student/duel/lobby', label: 'Duel', icon: '⚔️' },
    { href: '/student/shop', label: 'Boutique', icon: '🛒' },
    { href: '/student/ranking', label: 'Classement', icon: '🏆' },
    { href: '/student/profile', label: 'Profil', icon: '👤' },
    { href: '/student/badges', label: 'Badges', icon: '🎖️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Singe décoratif en haut à droite */}
      <div className="absolute top-4 right-4 z-10 hidden md:block">
        <img 
          src="/singes/gemini_generated_image_d3kiodd3kiodd3ki-removebg-preview_480.png" 
          alt="Singe" 
          className="w-20 h-20 object-contain animate-bounce"
          style={{ animationDuration: '3s' }}
        />
      </div>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-blue-600">🎮 Gamification</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4 lg:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-xs sm:text-sm font-medium ${
                      pathname === item.href
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1 sm:mr-2">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <div className="text-xs sm:text-sm text-gray-700">
                <span className="font-semibold">{user.prenom}</span>
                <span className="ml-1 sm:ml-2 text-yellow-600">🍌 {user.xp} bananes</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

