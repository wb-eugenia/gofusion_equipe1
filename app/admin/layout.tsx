'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check if we're not already on the login page
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    // Check admin password access first (client-side only)
    if (typeof window !== 'undefined') {
      const adminAccess = sessionStorage.getItem('adminAccess');
      if (!adminAccess) {
        router.push('/admin/login');
        return;
      }

      // Set user immediately (no need to wait for API call)
      setUser({ prenom: 'Admin', role: 'admin', xp: 0 });
      setLoading(false);

      // Optionally try to get real user data in background (non-blocking)
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        getUser()
          .then((userData) => {
            setUser({ ...userData, role: 'admin' });
          })
          .catch(() => {
            // Ignore errors, we already have a user
          });
      }
    }
  }, [router, pathname]);

  // Don't render layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Vérification de l'accès...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '⚙️' },
    { href: '/admin/kpi', label: 'KPI', icon: '📊' },
    { href: '/admin/courses', label: 'Cours', icon: '📚' },
    { href: '/admin/badges', label: 'Badges', icon: '🎖️' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('adminAccess');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-purple-600">⚙️ Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4 lg:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-xs sm:text-sm font-medium ${
                      pathname === item.href
                        ? 'border-purple-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1 sm:mr-2">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/student/courses"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Vue Étudiant
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-900"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

