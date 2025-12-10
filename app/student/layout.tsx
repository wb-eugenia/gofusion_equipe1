'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, getMySkins } from '@/lib/api';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [activeSkin, setActiveSkin] = useState<any>(null);
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

    Promise.all([
      getUser(),
      getMySkins().catch(() => ({ skins: [], activeSkin: null }))
    ])
      .then(([userData, skinsData]) => {
        setUser(userData);
        setActiveSkin(skinsData.activeSkin);
      })
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

  // Reload skin when pathname changes (to update after skin activation)
  useEffect(() => {
    if (user) {
      getMySkins()
        .then((skinsData) => {
          setActiveSkin(skinsData.activeSkin);
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [pathname, user]);

  // Listen for user data refresh events (when bananas are gained/spent)
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;
    let isRefreshing = false;
    
    const refreshUserData = async () => {
      // Prevent multiple simultaneous refreshes
      if (isRefreshing) {
        return;
      }
      
      try {
        isRefreshing = true;
        
        // Clear any pending refresh
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        // Add a small delay to ensure backend has finished updating
        refreshTimeout = setTimeout(async () => {
          try {
            const userData = await getUser();
            if (userData) {
              setUser(userData);
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
            // Retry once after error
            setTimeout(async () => {
              try {
                const userData = await getUser();
                if (userData) {
                  setUser(userData);
                }
              } catch (retryError) {
                console.error('Error retrying user data refresh:', retryError);
              }
            }, 500);
          } finally {
            isRefreshing = false;
          }
        }, 200);
      } catch (error) {
        console.error('Error in refreshUserData:', error);
        isRefreshing = false;
      }
    };

    // Listen for custom event to refresh user data
    const handleRefresh = () => {
      refreshUserData();
    };
    
    window.addEventListener('refreshUserData', handleRefresh);

    return () => {
      window.removeEventListener('refreshUserData', handleRefresh);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  // Listen for skin refresh events (when skin is activated)
  useEffect(() => {
    const refreshSkin = async () => {
      try {
        const skinsData = await getMySkins();
        setActiveSkin(skinsData.activeSkin);
      } catch (error) {
        console.error('Error refreshing skin:', error);
      }
    };

    // Listen for custom event to refresh skin
    window.addEventListener('refreshSkin', refreshSkin);

    return () => {
      window.removeEventListener('refreshSkin', refreshSkin);
    };
  }, []);

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
    { href: '/student/clans', label: 'Clans', icon: '' },
    { href: '/student/clans/wars', label: 'Guerres', icon: '' },
    { href: '/student/shop', label: 'Boutique', icon: '' },
    { href: '/student/ranking', label: 'Classement', icon: '' },
    { href: '/student/profile', label: 'Profil', icon: '' },
    { href: '/student/badges', label: 'Badges', icon: '' },
  ];

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
          <h2 className="text-lg font-extrabold text-primary">Gamification</h2>
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

        {/* User Info in Sidebar */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {activeSkin && activeSkin.icon ? (
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeSkin.icon} 
                  alt={activeSkin.name || user.prenom}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center">
                <span className="text-lg font-black text-white">{user.prenom.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text truncate">{user.prenom}</p>
              <p className="text-xs font-medium text-secondary">🍌 {user.xp} bananes</p>
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

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              localStorage.removeItem('sessionId');
              localStorage.removeItem('currentSessionId');
              localStorage.removeItem('sessionStartTime');
              router.push('/');
            }}
            className="w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 min-h-[48px] text-text hover:bg-red-50 hover:text-red-600"
          >
            <span className="mr-3 text-xl">🚪</span>
            <span className="text-sm font-medium">Déconnexion</span>
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

          {/* Desktop Header - User Info */}
          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <div className="text-right">
              <p className="text-sm font-bold text-text">{user.prenom}</p>
              <p className="text-xs font-medium text-secondary">🍌 {user.xp} bananes</p>
            </div>
            {activeSkin && activeSkin.icon ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeSkin.icon} 
                  alt={activeSkin.name || user.prenom}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center">
                <span className="text-lg font-black text-white">{user.prenom.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Mobile Header - User Info */}
          <div className="lg:hidden flex items-center gap-2 ml-auto">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-bold text-text">{user.prenom}</p>
              <p className="text-xs font-medium text-secondary">🍌 {user.xp}</p>
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
