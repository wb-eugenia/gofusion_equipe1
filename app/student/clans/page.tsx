'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClans, getClansByMatiere, getMyClans, joinClan, getMatieres } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

export default function ClansPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [myClans, setMyClans] = useState<Record<string, any[]>>({});
  const [matieres, setMatieres] = useState<any[]>([]);
  const [selectedMatiere, setSelectedMatiere] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess, PopupComponent, showConfirm } = usePopup();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMatiere !== 'all') {
      loadClansByMatiere(selectedMatiere);
    } else {
      loadAllClans();
    }
  }, [selectedMatiere]);

  const loadData = async () => {
    try {
      const [clansData, myClansData, matieresData] = await Promise.all([
        getClans().catch(() => []),
        getMyClans().catch(() => ({ clansByMatiere: {} })),
        getMatieres().catch(() => []),
      ]);
      setClans(clansData);
      setMyClans(myClansData.clansByMatiere || {});
      setMatieres(matieresData);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadAllClans = async () => {
    try {
      const data = await getClans();
      setClans(data);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    }
  };

  const loadClansByMatiere = async (matiereId: string) => {
    try {
      const data = await getClansByMatiere(matiereId);
      setClans(data);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    }
  };

  const handleJoinClan = async (clan: any) => {
    showConfirm(
      `Rejoindre le clan "${clan.name}" ?`,
      async () => {
        try {
          await joinClan(clan.id);
          showSuccess('Clan rejoint avec succès !');
          await loadData();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la jointure');
        }
      },
      'Confirmer la jointure',
      'Rejoindre',
      'Annuler'
    );
  };

  const isInClan = (clanId: string) => {
    return Object.values(myClans).some(clans => clans.some((c: any) => c.id === clanId));
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏰 Clans</h1>
          <p className="text-gray-600">Rejoignez un clan par matière pour collaborer avec d'autres étudiants</p>
        </div>

        {/* Filter by Matiere */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par matière</label>
          <select
            value={selectedMatiere}
            onChange={(e) => setSelectedMatiere(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les matières</option>
            {matieres.map((matiere) => (
              <option key={matiere.id} value={matiere.id}>
                {matiere.nom}
              </option>
            ))}
          </select>
        </div>

        {/* My Clans */}
        {Object.keys(myClans).length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mes Clans</h2>
            <div className="space-y-3">
              {Object.entries(myClans).map(([matiereId, clans]) => {
                const matiere = matieres.find(m => m.id === matiereId);
                return (
                  <div key={matiereId} className="p-4 bg-white rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {matiere?.nom || 'Matière inconnue'}
                    </h3>
                    {clans.map((clan: any) => (
                      <div key={clan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{clan.name}</p>
                          <p className="text-sm text-gray-600">{clan.description || 'Pas de description'}</p>
                        </div>
                        <span className="text-sm text-blue-600">
                          {clan.role === 'leader' ? '👑 Leader' : '👤 Membre'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Clans */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Clans disponibles ({clans.length})
          </h2>
          {clans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clans.map((clan: any) => {
                const alreadyMember = isInClan(clan.id);
                return (
                  <div key={clan.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-1">{clan.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{clan.description || 'Pas de description'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{clan.matiere?.nom || 'Matière inconnue'}</span>
                        <span>•</span>
                        <span>{clan.memberCount || 0} membres</span>
                      </div>
                    </div>
                    {alreadyMember ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed"
                      >
                        Déjà membre
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinClan(clan)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Rejoindre
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucun clan disponible pour le moment
            </p>
          )}
        </div>
      </div>
    </>
  );
}

