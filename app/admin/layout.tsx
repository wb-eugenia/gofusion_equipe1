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
    // Check admin password access first
    const adminAccess = sessionStorage.getItem('adminAccess');
    if (!adminAccess) {
      router.push('/admin/login');
      return;
    }

    // Try to get user if session exists, but don't require it
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      getUser()
        .then((userData) => {
          setUser({ ...userData, role: 'admin' });
        })
        .catch(() => {
          // If user doesn't exist, still allow access with password
          setUser({ prenom: 'Admin', role: 'admin', xp: 0 });
        })
        .finally(() => setLoading(false));
    } else {
      // No session but password is correct, allow access
      setUser({ prenom: 'Admin', role: 'admin', xp: 0 });
      setLoading(false);
    }
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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-purple-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
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

