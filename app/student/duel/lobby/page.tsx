'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMatieres, getUser, getDuelStats } from '@/lib/api';
import Popup, { PopupType } from '@/components/Popup';

// Types
type Duel = {
  id: string;
  player1Id: string;
  player2Id?: string;
  matiereId?: string;
  status: 'waiting' | 'active' | 'finished';
  betAmount: number;
  createdAt: Date | string;
  player1?: { id: string; prenom: string; xp: number };
  matiere?: { id: string; nom: string; description?: string };
};

type SortOption = 'newest' | 'oldest' | 'betHigh' | 'betLow';
type FilterOption = 'all' | 'myDuels' | string; // string = matiereId

// API Functions
async function getLobbyDuels() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/lobby`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load duels');
  return response.json();
}

async function createDuel(matiereId: string, betAmount: number = 0) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ matiereId, betAmount }),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to create duel');
  }
  return response.json();
}

async function joinDuel(duelId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/${duelId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to join duel');
  }
  return response.json();
}

async function deleteDuel(duelId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/${duelId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to delete duel');
  }
  return response.json();
}

// Utility Functions
function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const duelDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - duelDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  
  if (diffMins < 1) return `Il y a ${diffSecs}s`;
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  return `Il y a ${Math.floor(diffHours / 24)}j`;
}

function isRecent(createdAt: Date | string, seconds: number = 30): boolean {
  const now = new Date();
  const duelDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const diffMs = now.getTime() - duelDate.getTime();
  return diffMs < seconds * 1000;
}

export default function DuelLobbyPage() {
  const router = useRouter();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [duelStats, setDuelStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState('');
  const [betAmount, setBetAmount] = useState<number | ''>('');
  const [errorPopup, setErrorPopup] = useState<{ show: boolean; message: string; isInsufficientBananas?: boolean; requiredAmount?: number }>({ show: false, message: '' });
  const [confirmPopup, setConfirmPopup] = useState<{ show: boolean; onConfirm: () => void }>({ show: false, onConfirm: () => {} });
  
  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMatiere, setFilterMatiere] = useState<FilterOption>('all');
  const [showMyDuels, setShowMyDuels] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  
  // Quick duel
  const [showQuickDuelModal, setShowQuickDuelModal] = useState(false);

  // Polling with exponential backoff
  const [pollInterval, setPollInterval] = useState(3000);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, pollInterval);
    
    // Listen for user data refresh events (when bananas are gained/spent)
    const refreshUserData = () => {
      getUser().then(setUser).catch(console.error);
    };
    
    window.addEventListener('refreshUserData', refreshUserData);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshUserData', refreshUserData);
    };
  }, [pollInterval]);

  const loadData = useCallback(async () => {
    try {
      setConnectionStatus('connected');
      setRetryCount(0);
      setPollInterval(3000);
      
      const [duelsData, matieresData, userData, statsData] = await Promise.all([
        getLobbyDuels(),
        getMatieres(),
        getUser(),
        getDuelStats().catch(() => null), // Don't fail if stats fail
      ]);
      setDuels(duelsData as Duel[]);
      setMatieres(matieresData as any[]);
      setUser(userData as any);
      setDuelStats(statsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setConnectionStatus('disconnected');
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff: 3s, 6s, 12s, max 30s
      const newInterval = Math.min(3000 * Math.pow(2, retryCount), 30000);
      setPollInterval(newInterval);
      
      if (retryCount < 3) {
        setConnectionStatus('reconnecting');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  // Filtered and sorted duels
  const filteredDuels = useMemo(() => {
    let filtered = [...duels];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(duel => 
        duel.player1?.prenom?.toLowerCase().includes(query) ||
        duel.matiere?.nom?.toLowerCase().includes(query)
      );
    }

    // Matiere filter
    if (filterMatiere !== 'all') {
      filtered = filtered.filter(duel => duel.matiereId === filterMatiere);
    }

    // My duels filter
    if (showMyDuels) {
      filtered = filtered.filter(duel => duel.player1Id === user?.id);
    }

    // Sort
    filtered.sort((a, b) => {
      const aDate = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const bDate = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      
      switch (sortBy) {
        case 'newest':
          return bDate.getTime() - aDate.getTime();
        case 'oldest':
          return aDate.getTime() - bDate.getTime();
        case 'betHigh':
          return b.betAmount - a.betAmount;
        case 'betLow':
          return a.betAmount - b.betAmount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [duels, searchQuery, filterMatiere, showMyDuels, sortBy, user?.id]);

  const handleCreateDuel = async () => {
    if (!selectedMatiere) {
      setErrorPopup({ show: true, message: 'Veuillez sélectionner une matière' });
      return;
    }
    
    if (betAmount === '' || betAmount === null || betAmount === undefined) {
      setErrorPopup({ show: true, message: 'Veuillez saisir une mise en bananes' });
      return;
    }
    
    const bet = typeof betAmount === 'number' ? betAmount : (typeof betAmount === 'string' ? parseInt(betAmount) || 0 : 0);
    
    if (bet <= 0) {
      setErrorPopup({ show: true, message: 'La mise doit être supérieure à 0 bananes' });
      return;
    }
    
    if (bet > (user?.xp || 0)) {
      setErrorPopup({ 
        show: true, 
        message: `Vous n'avez pas assez de bananes pour cette mise. Vous avez ${user?.xp || 0} 🍌 mais il vous faut ${bet} 🍌`,
        isInsufficientBananas: true,
        requiredAmount: bet
      });
      return;
    }
    
    try {
      const duel: any = await createDuel(selectedMatiere, bet);
      router.push(`/student/duel/play?id=${duel.id}`);
    } catch (error: any) {
      setErrorPopup({ show: true, message: error.message || 'Une erreur est survenue' });
    }
  };

  const handleQuickDuel = async () => {
    if (!matieres || matieres.length === 0) {
      setErrorPopup({ show: true, message: 'Aucune matière disponible' });
      return;
    }

    // Find first available duel or create one with default bet
    const availableDuel = filteredDuels.find(d => 
      d.status === 'waiting' && 
      !d.player2Id && 
      d.player1Id !== user?.id &&
      d.betAmount <= (user?.xp || 0)
    );

    if (availableDuel) {
      // Join existing duel
      try {
        await handleJoinDuel(availableDuel.id);
      } catch (error: any) {
        setErrorPopup({ show: true, message: error.message || 'Erreur lors de la jonction' });
      }
    } else {
      // Create new duel with first matiere and default bet
      const defaultMatiere = matieres[0];
      const defaultBet = Math.min(10, Math.floor((user?.xp || 0) / 10) || 1);
      
      if (defaultBet <= 0 || defaultBet > (user?.xp || 0)) {
        setErrorPopup({ show: true, message: 'Vous n\'avez pas assez de bananes pour créer un duel rapide' });
        return;
      }

      try {
        const duel: any = await createDuel(defaultMatiere.id, defaultBet);
        router.push(`/student/duel/play?id=${duel.id}`);
      } catch (error: any) {
        setErrorPopup({ show: true, message: error.message || 'Une erreur est survenue' });
      }
    }
    
    setShowQuickDuelModal(false);
  };

  const handleJoinDuel = async (duelId: string) => {
    try {
      const duel: any = await joinDuel(duelId);
      router.push(`/student/duel/play?id=${duel.id}`);
    } catch (error: any) {
      const isInsufficientBananas = error.message?.includes('Insufficient bananas') || error.message?.includes('pas assez de bananes');
      const requiredMatch = error.message?.match(/(\d+)\s+bananas?/i);
      const requiredAmount = requiredMatch ? parseInt(requiredMatch[1]) : undefined;
      
      setErrorPopup({ 
        show: true, 
        message: error.message || 'Une erreur est survenue',
        isInsufficientBananas,
        requiredAmount
      });
    }
  };

  const handleDeleteDuel = async (duelId: string) => {
    setConfirmPopup({
      show: true,
      onConfirm: async () => {
        setConfirmPopup({ show: false, onConfirm: () => {} });
        try {
          await deleteDuel(duelId);
          loadData();
        } catch (error: any) {
          setErrorPopup({ show: true, message: error.message || 'Une erreur est survenue' });
        }
      },
    });
  };

  const quickBetAmounts = useMemo(() => {
    const maxXp = user?.xp || 0;
    const amounts = [10, 50, 100, 500];
    return amounts.filter(amt => amt <= maxXp).concat(maxXp > 0 ? [maxXp] : []);
  }, [user?.xp]);

  // Skeleton loading component
  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">⚔️ Lobby de Duel</h1>
          <p className="text-textMuted">Affrontez d'autres joueurs en 1v1 !</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowQuickDuelModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition font-semibold shadow-button"
          >
            ⚡ Duel Rapide
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition font-semibold shadow-button"
          >
            + Créer un duel
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div className={`mb-4 p-3 rounded-2xl flex items-center gap-2 border-2 ${
          connectionStatus === 'reconnecting' ? 'bg-warning/10 border-warning/30' : 'bg-error/10 border-error/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'reconnecting' ? 'bg-warning animate-pulse' : 'bg-error'
          }`}></div>
          <span className="text-sm font-medium">
            {connectionStatus === 'reconnecting' ? 'Reconnexion en cours...' : 'Connexion perdue'}
          </span>
        </div>
      )}

      {/* Stats Widget */}
      {user && (
        <div className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 border-2 border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-sm text-textMuted">Vos bananes</p>
              <p className="text-2xl font-bold text-secondary">{user.xp || 0} 🍌</p>
            </div>
            <div>
              <p className="text-sm text-textMuted">Duels disponibles</p>
              <p className="text-2xl font-bold text-primary">{filteredDuels.filter(d => d.status === 'waiting' && !d.player2Id && d.player1Id !== user.id).length}</p>
            </div>
            {duelStats && (
              <>
                <div>
                  <p className="text-sm text-textMuted">Victoires</p>
                  <p className="text-2xl font-bold text-success">{duelStats.wins || 0} 🏆</p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Défaites</p>
                  <p className="text-2xl font-bold text-error">{duelStats.losses || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Taux de victoire</p>
                  <p className="text-2xl font-bold text-primary">{duelStats.winRate || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Bananes nettes</p>
                  <p className={`text-2xl font-bold ${(duelStats.netBananas || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {duelStats.netBananas >= 0 ? '+' : ''}{duelStats.netBananas || 0} 🍌
                  </p>
                </div>
              </>
            )}
          </div>
          {duelStats && duelStats.winRate >= 70 && duelStats.finishedDuels >= 5 && (
            <div className="mt-4 p-3 bg-secondary/10 border-2 border-secondary/30 rounded-2xl text-center">
              <p className="text-sm font-semibold text-secondary">
                🏅 Champion ! Taux de victoire exceptionnel de {duelStats.winRate}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 bg-surface rounded-2xl shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="absolute left-3 top-2.5 text-textMuted">🔍</span>
          </div>

          {/* Matiere Filter */}
          <select
            value={filterMatiere}
            onChange={(e) => setFilterMatiere(e.target.value as FilterOption)}
            className="w-full px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Toutes les matières</option>
            {matieres.map((matiere) => (
              <option key={matiere.id} value={matiere.id}>
                {matiere.nom}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="newest">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="betHigh">Mise élevée</option>
            <option value="betLow">Mise faible</option>
          </select>

          {/* My Duels Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMyDuels}
              onChange={(e) => setShowMyDuels(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-text">Mes duels uniquement</span>
          </label>
        </div>
      </div>

      {/* Confirm Popup */}
      <Popup
        show={confirmPopup.show}
        type="confirm"
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce duel ? Vos bananes seront remboursées."
        onConfirm={confirmPopup.onConfirm}
        onCancel={() => setConfirmPopup({ show: false, onConfirm: () => {} })}
        confirmText="Supprimer"
        cancelText="Annuler"
        showCancel={true}
      />

      {/* Error Popup */}
      {errorPopup.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-card animate-fadeIn">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 ${errorPopup.isInsufficientBananas ? 'bg-secondary/10' : 'bg-error/10'} rounded-full flex items-center justify-center`}>
                <span className="text-3xl">{errorPopup.isInsufficientBananas ? '🍌' : '❌'}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-text text-center mb-2">
              {errorPopup.isInsufficientBananas ? 'Bananes insuffisantes' : 'Erreur'}
            </h3>
            <p className="text-text text-center mb-6">{errorPopup.message}</p>
            
            {errorPopup.isInsufficientBananas ? (
              <div className="space-y-3">
                <div className="bg-secondary/10 border-2 border-secondary/30 rounded-2xl p-4 mb-4">
                  <p className="text-sm text-secondary text-center">
                    Vous avez {user?.xp || 0} 🍌 bananes
                    {errorPopup.requiredAmount && (
                      <span className="block mt-1 font-semibold">
                        Il vous faut {errorPopup.requiredAmount} 🍌 bananes
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setErrorPopup({ show: false, message: '' });
                      router.push('/student/shop');
                    }}
                    className="w-full px-4 py-3 bg-secondary text-white rounded-2xl hover:brightness-105 transition font-semibold flex items-center justify-center gap-2"
                  >
                    Acheter des bananes
                  </button>
                  <button
                    onClick={() => {
                      setErrorPopup({ show: false, message: '' });
                      router.push('/student/courses');
                    }}
                    className="w-full px-4 py-3 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold flex items-center justify-center gap-2"
                  >
                    Faire des cours pour gagner des bananes
                  </button>
                </div>
                <button
                  onClick={() => setErrorPopup({ show: false, message: '' })}
                  className="w-full px-4 py-2 bg-surface text-text rounded-2xl hover:shadow-lift transition font-semibold border-2 border-border"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setErrorPopup({ show: false, message: '' })}
                className="w-full px-4 py-2 bg-error text-white rounded-2xl hover:brightness-105 transition font-semibold"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Duel Modal */}
      {showQuickDuelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-card animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4">⚡ Duel Rapide</h2>
            <p className="text-gray-600 mb-6">
              Rejoignez automatiquement un duel disponible ou créez-en un nouveau avec les paramètres par défaut.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleQuickDuel}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
              >
                Lancer
              </button>
              <button
                onClick={() => setShowQuickDuelModal(false)}
                className="flex-1 px-4 py-2 bg-surface text-text rounded-2xl border-2 border-border hover:shadow-lift transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Duel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-card animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4">Créer un duel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Matière
                </label>
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner une matière</option>
                  {matieres.map((matiere) => (
                    <option key={matiere.id} value={matiere.id}>
                      {matiere.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Mise en bananes <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={user?.xp || 0}
                  value={betAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBetAmount(value === '' ? '' : parseInt(value) || '');
                  }}
                  placeholder="Saisissez le nombre de bananes"
                  required
                  className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-textMuted mt-1">
                  Vous avez {user?.xp || 0} 🍌 bananes disponibles (minimum: 1)
                </p>
                
                {/* Quick Bet Buttons */}
                {quickBetAmounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickBetAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setBetAmount(amount)}
                        className={`px-3 py-1 text-sm rounded-2xl transition ${
                          betAmount === amount
                            ? 'bg-primary text-white'
                            : 'bg-surface text-text border-2 border-border hover:shadow-lift'
                        }`}
                      >
                        {amount} 🍌
                      </button>
                    ))}
                    {user?.xp > 0 && (
                      <button
                        type="button"
                        onClick={() => setBetAmount(user.xp)}
                        className={`px-3 py-1 text-sm rounded-2xl transition ${
                          betAmount === user.xp
                            ? 'bg-primary text-white'
                            : 'bg-surface text-text border-2 border-border hover:shadow-lift'
                        }`}
                      >
                        Max ({user.xp})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateDuel}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
                >
                  Créer
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedMatiere('');
                    setBetAmount('');
                  }}
                  className="flex-1 px-4 py-2 bg-surface text-text rounded-2xl border-2 border-border hover:shadow-lift transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duels List */}
      <div className="space-y-4">
        {filteredDuels.length === 0 ? (
          <div className="bg-gradient-to-br from-background to-surface rounded-2xl p-12 text-center border-2 border-dashed border-border">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-2xl font-bold text-text mb-2">
              {searchQuery || filterMatiere !== 'all' || showMyDuels
                ? 'Aucun duel ne correspond à vos critères'
                : 'Aucun duel en attente'}
            </h3>
            <p className="text-textMuted mb-6">
              {searchQuery || filterMatiere !== 'all' || showMyDuels
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Soyez le premier à créer un duel et défiez vos amis !'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterMatiere('all');
                setShowMyDuels(false);
                setShowCreateModal(true);
              }}
              className="px-6 py-3 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Créer le premier duel
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text">
                Duels disponibles ({filteredDuels.length})
              </h2>
            </div>
            {filteredDuels.map((duel) => {
              const isMyDuel = duel.player1Id === user?.id;
              const canJoin = !isMyDuel && duel.status === 'waiting' && !duel.player2Id;
              const isRecentDuel = isRecent(duel.createdAt);
              
              return (
                <div
                  key={duel.id}
                  className={`bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift transition-all duration-300 ${
                    isRecentDuel ? 'ring-2 ring-primary animate-pulse-subtle' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-text">
                          {duel.matiere?.nom || 'Matière inconnue'}
                        </h3>
                        {isMyDuel && (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-2xl text-xs font-bold">
                            Votre duel
                          </span>
                        )}
                        {duel.status === 'waiting' && (
                          <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-2xl text-xs font-bold animate-pulse">
                            En attente
                          </span>
                        )}
                        {isRecentDuel && (
                          <span className="px-2 py-1 bg-success/10 text-success rounded-2xl text-xs font-bold">
                            ✨ Nouveau
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-textMuted">
                          Créé par: <strong>{duel.player1?.prenom || 'Joueur inconnu'}</strong>
                        </p>
                        {duel.player1 && (
                          <p className="text-xs text-textMuted">
                            Niveau: {Math.floor((duel.player1.xp || 0) / 100)} • {duel.player1.xp || 0} 🍌
                          </p>
                        )}
                        {duel.betAmount > 0 && (
                          <p className="text-sm font-extrabold text-secondary">
                            🍌 Mise: {duel.betAmount} bananes (Pot: {duel.betAmount * 2} 🍌)
                          </p>
                        )}
                        <p className="text-xs text-textMuted">
                          {formatTimeAgo(duel.createdAt)}
                        </p>
                        {duel.matiere && (
                          <p className="text-sm text-textMuted">
                            {duel.matiere.description || 'Testez vos connaissances'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0">
                      {canJoin && (
                        <button
                          onClick={() => handleJoinDuel(duel.id)}
                          className="px-6 py-2 bg-success text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button transform hover:-translate-y-0.5 active:scale-[0.98]"
                        >
                          ✅ Rejoindre
                        </button>
                      )}
                      {isMyDuel && (
                        <>
                          <button
                            onClick={() => router.push(`/student/duel/play?id=${duel.id}`)}
                            className="px-6 py-2 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
                          >
                            👁️ Voir
                          </button>
                          <button
                            onClick={() => handleDeleteDuel(duel.id)}
                            className="px-6 py-2 bg-error text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                      {!canJoin && !isMyDuel && (
                        <span className="px-4 py-2 bg-surface text-text rounded-2xl border-2 border-border">
                          Complet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
