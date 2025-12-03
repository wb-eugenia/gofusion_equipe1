'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMatieres, getUser } from '@/lib/api';
import Popup, { PopupType } from '@/components/Popup';

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

export default function DuelLobbyPage() {
  const router = useRouter();
  const [duels, setDuels] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState('');
  const [betAmount, setBetAmount] = useState<number | ''>('');
  const [errorPopup, setErrorPopup] = useState<{ show: boolean; message: string; isInsufficientBananas?: boolean; requiredAmount?: number }>({ show: false, message: '' });
  const [confirmPopup, setConfirmPopup] = useState<{ show: boolean; onConfirm: () => void }>({ show: false, onConfirm: () => {} });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [duelsData, matieresData, userData] = await Promise.all([
        getLobbyDuels(),
        getMatieres(),
        getUser(),
      ]);
      setDuels(duelsData as any[]);
      setMatieres(matieresData as any[]);
      setUser(userData as any);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          loadData(); // Refresh the list
        } catch (error: any) {
          setErrorPopup({ show: true, message: error.message || 'Une erreur est survenue' });
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lobby de Duel</h1>
          <p className="text-gray-600">Affrontez d'autres joueurs en 1v1 !</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          + Créer un duel
        </button>
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 ${errorPopup.isInsufficientBananas ? 'bg-yellow-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                <span className="text-3xl">{errorPopup.isInsufficientBananas ? '🍌' : ''}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              {errorPopup.isInsufficientBananas ? 'Bananes insuffisantes' : 'Erreur'}
            </h3>
            <p className="text-gray-700 text-center mb-6">{errorPopup.message}</p>
            
            {errorPopup.isInsufficientBananas ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 text-center">
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
                    className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold flex items-center justify-center gap-2"
                  >
                    Acheter des bananes
                  </button>
                  <button
                    onClick={() => {
                      setErrorPopup({ show: false, message: '' });
                      router.push('/student/courses');
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                  >
                    Faire des cours pour gagner des bananes
                  </button>
                </div>
                <button
                  onClick={() => setErrorPopup({ show: false, message: '' })}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setErrorPopup({ show: false, message: '' })}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Créer un duel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matière
                </label>
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vous avez {user?.xp || 0} 🍌 bananes disponibles (minimum: 1)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateDuel}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Créer
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedMatiere('');
                    setBetAmount('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {duels.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Aucun duel en attente</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Créer le premier duel
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Duels disponibles ({duels.length})
              </h2>
              <p className="text-sm text-gray-600">
                Cliquez sur "Rejoindre" pour affronter un autre joueur
              </p>
            </div>
            {duels.map((duel) => {
              const isMyDuel = duel.player1Id === user?.id;
              const canJoin = !isMyDuel && duel.status === 'waiting' && !duel.player2Id;
              
              return (
                <div key={duel.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {duel.matiere?.nom || 'Matière inconnue'}
                          </h3>
                          {isMyDuel && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              Votre duel
                            </span>
                          )}
                          {duel.status === 'waiting' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              En attente
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-1">
                          Créé par: <strong>{duel.player1?.prenom || 'Joueur inconnu'}</strong>
                        </p>
                        {duel.betAmount > 0 && (
                          <p className="text-sm font-semibold text-yellow-600 mb-1">
                            🍌 Mise: {duel.betAmount} bananes (Pot: {duel.betAmount * 2} 🍌)
                          </p>
                        )}
                        {duel.matiere && (
                          <p className="text-sm text-gray-500">
                            {duel.matiere.description || 'Testez vos connaissances'}
                          </p>
                        )}
                      </div>
                    <div className="flex gap-2">
                      {canJoin && (
                        <button
                          onClick={() => handleJoinDuel(duel.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                          ✅ Rejoindre
                        </button>
                      )}
                      {isMyDuel && (
                        <>
                          <button
                            onClick={() => router.push(`/student/duel/play?id=${duel.id}`)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                          >
                            👁️ Voir
                          </button>
                          <button
                            onClick={() => handleDeleteDuel(duel.id)}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                      {!canJoin && !isMyDuel && (
                        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
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
    </div>
  );
}

