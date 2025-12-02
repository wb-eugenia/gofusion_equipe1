'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMatieres, getUser } from '@/lib/api';

async function getLobbyDuels() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/lobby`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load duels');
  return response.json();
}

async function createDuel(matiereId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ matiereId }),
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

export default function DuelLobbyPage() {
  const router = useRouter();
  const [duels, setDuels] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState('');

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
      alert('Veuillez sélectionner une matière');
      return;
    }
    
    try {
      const duel: any = await createDuel(selectedMatiere);
      router.push(`/student/duel/play?id=${duel.id}`);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleJoinDuel = async (duelId: string) => {
    try {
      const duel: any = await joinDuel(duelId);
      router.push(`/student/duel/play?id=${duel.id}`);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚔️ Lobby de Duel</h1>
          <p className="text-gray-600">Affrontez d'autres joueurs en 1v1 !</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          + Créer un duel
        </button>
      </div>

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
          duels.map((duel) => (
            <div key={duel.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Duel - {duel.matiere?.nom || 'Matière inconnue'}
                  </h3>
                  <p className="text-gray-600">
                    Créé par: <strong>{duel.player1?.prenom}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    En attente d'un adversaire...
                  </p>
                </div>
                {duel.player1Id !== user?.id && (
                  <button
                    onClick={() => handleJoinDuel(duel.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Rejoindre
                  </button>
                )}
                {duel.player1Id === user?.id && (
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                    Votre duel
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

