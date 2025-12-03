'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentClanWars, getClanWarHistory, getMyClans, getMatieres } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

export default function ClanWarsPage() {
  const [currentWars, setCurrentWars] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [myClans, setMyClans] = useState<Record<string, any[]>>({});
  const [matieres, setMatieres] = useState<any[]>([]);
  const [selectedMatiere, setSelectedMatiere] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const { showError, PopupComponent } = usePopup();
  const router = useRouter();

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedMatiere, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warsData, historyData, myClansData, matieresData] = await Promise.all([
        getCurrentClanWars(selectedMatiere !== 'all' ? selectedMatiere : undefined).catch(() => ({ wars: [] })),
        getClanWarHistory(selectedMatiere !== 'all' ? selectedMatiere : undefined).catch(() => []),
        getMyClans().catch(() => ({ clansByMatiere: {} })),
        getMatieres().catch(() => []),
      ]);
      
      const warsDataTyped = warsData as { war?: any; wars?: any[] };
      if (warsDataTyped.war) {
        setCurrentWars([warsDataTyped.war]);
      } else if (warsDataTyped.wars) {
        setCurrentWars(warsDataTyped.wars);
      } else {
        setCurrentWars([]);
      }
      
      setHistory(historyData);
      setMyClans(myClansData.clansByMatiere || {});
      setMatieres(matieresData);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (weekEnd: Date) => {
    const now = new Date();
    const end = new Date(weekEnd);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Terminée';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getUserClanForMatiere = (matiereId: string) => {
    return myClans[matiereId]?.[0] || null;
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Guerres de Clan</h1>
          <p className="text-gray-600">
            Collectez le maximum de bananes pour votre clan chaque semaine !
          </p>
        </div>

        {/* Filter by Matiere */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par matière</label>
          <select
            value={selectedMatiere}
            onChange={(e) => setSelectedMatiere(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="all">Toutes les matières</option>
            {matieres.map((matiere) => (
              <option key={matiere.id} value={matiere.id}>
                {matiere.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guerres en cours
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Historique
            </button>
          </nav>
        </div>

        {activeTab === 'current' ? (
          <div className="space-y-6">
            {currentWars.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Aucune guerre active pour le moment.</p>
              </div>
            ) : (
              currentWars.map((warData: any) => {
                const war = warData.war || warData;
                const ranking = warData.ranking || [];
                const userClan = getUserClanForMatiere(war.matiereId || war.matiere?.id);
                const timeRemaining = getTimeRemaining(new Date(war.weekEnd));

                return (
                  <div key={war.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {war.matiere?.nom || 'Matière inconnue'}
                        </h2>
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Temps restant:</span> {timeRemaining}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Semaine du {new Date(war.weekStart).toLocaleDateString('fr-FR')} au{' '}
                        {new Date(war.weekEnd).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {ranking.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Classement</h3>
                        {ranking.map((item: any, index: number) => {
                          const isUserClan = userClan && item.clan.id === userClan.id;
                          return (
                            <div
                              key={item.clan.id}
                              className={`p-4 rounded-lg border-2 ${
                                isUserClan
                                  ? 'border-blue-500 bg-blue-50'
                                  : index === 0
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm">
                                    {item.rank}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {item.clan.name}
                                      {isUserClan && (
                                        <span className="ml-2 text-xs text-blue-600">(Mon clan)</span>
                                      )}
                                      {index === 0 && (
                                        <span className="ml-2 text-xs text-yellow-600">🏆</span>
                                      )}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {item.memberCount || 0} membre{item.memberCount !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900">
                                    {item.total} 🍌
                                  </p>
                                </div>
                              </div>
                              {war.totalBananas > 0 && (
                                <div className="mt-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{
                                        width: `${Math.min((item.total / war.totalBananas) * 100, 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Aucune contribution pour le moment. Soyez le premier à collecter des bananes !
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Aucune guerre terminée pour le moment.</p>
              </div>
            ) : (
              history.map((war: any) => (
                <div key={war.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {war.matiere?.nom || 'Matière inconnue'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(war.weekStart).toLocaleDateString('fr-FR')} -{' '}
                        {new Date(war.weekEnd).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {war.winnerClan && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Gagnant</p>
                        <p className="text-lg font-semibold text-yellow-600">
                          {war.winnerClan.name} 🏆
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

