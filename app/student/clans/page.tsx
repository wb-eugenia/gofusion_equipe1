'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClans, getClansByMatiere, getMyClans, joinClan, getMatieres, createClan, leaveClan, getClanDetails } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

export default function ClansPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [myClans, setMyClans] = useState<Record<string, any[]>>({});
  const [matieres, setMatieres] = useState<any[]>([]);
  const [selectedMatiere, setSelectedMatiere] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedClanDetails, setSelectedClanDetails] = useState<any>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    matiereId: '',
    description: '',
  });
  const { showSuccess, showError, ToastComponent } = useToast();
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
    try {
      await joinClan(clan.id);
      showSuccess(`✅ Clan "${clan.name}" rejoint avec succès !`);
      // Attendre un peu pour que la base de données soit à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      // Recharger toutes les données
      setLoading(true);
      await loadData();
      // Recharger aussi les clans disponibles
      if (selectedMatiere !== 'all') {
        await loadClansByMatiere(selectedMatiere);
      } else {
        await loadAllClans();
      }
      setLoading(false);
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de la jointure');
      setLoading(false);
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name || !createFormData.matiereId) {
      showError('❌ Le nom et la matière sont requis');
      return;
    }
    
    try {
      await createClan(createFormData);
      showSuccess('🎉 Clan créé avec succès ! Vous en êtes le leader.');
      setShowCreateModal(false);
      setCreateFormData({ name: '', matiereId: '', description: '' });
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de la création');
    }
  };

  const handleLeaveClan = async (clan: any) => {
    try {
      await leaveClan(clan.id);
      showSuccess(`👋 Clan "${clan.name}" quitté avec succès !`);
      // Recharger toutes les données
      await loadData();
      // Recharger aussi les clans disponibles si on filtre par matière
      if (selectedMatiere !== 'all') {
        await loadClansByMatiere(selectedMatiere);
      } else {
        await loadAllClans();
      }
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de la sortie du clan');
    }
  };

  const handleViewMembers = async (clanId: string) => {
    setLoadingMembers(true);
    setShowMembersModal(true);
    setSelectedClanDetails(null); // Reset avant de charger
    try {
      const details = await getClanDetails(clanId);
      // Debug: vérifier la structure des données
      if (!details.members) {
        console.warn('No members property in details:', details);
      } else if (!Array.isArray(details.members)) {
        console.warn('Members is not an array:', details.members);
      }
      setSelectedClanDetails(details);
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors du chargement des membres');
      setShowMembersModal(false);
    } finally {
      setLoadingMembers(false);
    }
  };

  const formatDate = (timestamp: number | Date | string) => {
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Si c'est un timestamp en secondes (Unix), multiplier par 1000
      // Si c'est déjà en millisecondes, utiliser directement
      date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
    } else {
      date = timestamp;
    }
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const isInClan = (clanId: string) => {
    if (!myClans || Object.keys(myClans).length === 0) return false;
    return Object.values(myClans).some((clans: any) => {
      if (!Array.isArray(clans)) return false;
      return clans.some((c: any) => c && c.id === clanId);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement des clans...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Clans</h1>
            <button
              onClick={() => router.push('/student/clans/wars')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold"
            >
              🏆 Guerres de Clan
            </button>
          </div>
          <p className="text-gray-600">Rejoignez un clan par matière pour collaborer avec d'autres étudiants et participer aux guerres hebdomadaires !</p>
          {/* Weekly time banner (frontend-only visual) */}
          <div className="mt-4 bg-secondary/15 border border-secondary/30 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <p className="font-extrabold text-text">Semaine en cours</p>
              </div>
              <p className="text-sm text-textMuted">Se termine dimanche 23:59</p>
            </div>
            <div className="h-3 w-full bg-inactive/30 rounded-full overflow-hidden">
              <div className="h-3 bg-secondary rounded-full animate-[progressFill_1.2s_ease-out]" style={{ width: `${Math.min(100, Math.max(0, (new Date().getDay() / 6) * 100))}%` }} />
            </div>
          </div>
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
                      <div key={clan.id} className="p-4 border border-gray-200 rounded-2xl bg-white shadow-card">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900">{clan.name}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                clan.role === 'leader' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {clan.role === 'leader' ? 'Leader' : 'Membre'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{clan.description || 'Pas de description'}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{clan.memberCount || 0} membres</span>
                            </div>
                            {/* Weekly Objective (frontend-only visual) */}
                            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                              <p className="text-xs font-bold text-primary mb-1">Objectif de la semaine</p>
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-text">Collecter 500 bananes</p>
                                <span className="text-sm font-bold text-secondary">🍌 320 / 500</span>
                              </div>
                              <div className="mt-2 h-2 w-full bg-inactive/30 rounded-full overflow-hidden">
                                <div className="h-2 bg-secondary rounded-full" style={{ width: '64%' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewMembers(clan.id)}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                          >
                            👥 Voir les membres
                          </button>
                          <button
                            onClick={() => handleLeaveClan(clan)}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                          >
                            🚪 Quitter
                          </button>
                        </div>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Clans disponibles ({clans.length})
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              + Créer un clan
            </button>
          </div>
          {clans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clans.map((clan: any) => {
                const alreadyMember = isInClan(clan.id);
                return (
                  <div key={clan.id} className="p-4 border border-gray-200 rounded-2xl hover:shadow-md transition bg-white">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-1">{clan.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{clan.description || 'Pas de description'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span>{clan.matiere?.nom || 'Matière inconnue'}</span>
                        <span>•</span>
                        <span>{clan.memberCount || 0} membres</span>
                      </div>
                      {/* Weekly Objective for available clans (placeholder) */}
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                        <p className="text-xs font-bold text-primary mb-1">Objectif de la semaine</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-text">Collecter 500 bananes</p>
                          <span className="text-sm font-bold text-secondary">🍌 0 / 500</span>
                        </div>
                        <div className="mt-2 h-2 w-full bg-inactive/30 rounded-full overflow-hidden">
                          <div className="h-2 bg-secondary rounded-full" style={{ width: '0%' }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewMembers(clan.id)}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                      >
                        👥 Membres
                      </button>
                      {alreadyMember ? (
                        <button
                          onClick={() => handleLeaveClan(clan)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                        >
                          🚪 Quitter
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinClan(clan)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                        >
                          Rejoindre
                        </button>
                      )}
                    </div>
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

      {/* Create Clan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Créer un clan</h2>
            <form onSubmit={handleCreateClan}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du clan *</label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Ex: Les Champions"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Matière *</label>
                <select
                  required
                  value={createFormData.matiereId}
                  onChange={(e) => setCreateFormData({ ...createFormData, matiereId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                >
                  <option value="">Sélectionner une matière</option>
                  {matieres.map((matiere) => (
                    <option key={matiere.id} value={matiere.id}>
                      {matiere.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Décrivez votre clan..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({ name: '', matiereId: '', description: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMembersModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {loadingMembers ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Chargement des membres...</p>
              </div>
            ) : selectedClanDetails ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedClanDetails.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedClanDetails.matiere?.nom || 'Matière inconnue'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                {selectedClanDetails.description && (
                  <p className="text-gray-700 mb-4 pb-4 border-b">{selectedClanDetails.description}</p>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Membres ({selectedClanDetails.members && Array.isArray(selectedClanDetails.members) ? selectedClanDetails.members.length : 0})
                  </h3>
                  {selectedClanDetails.members && Array.isArray(selectedClanDetails.members) && selectedClanDetails.members.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClanDetails.members.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {member.prenom.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.prenom}</p>
                              {member.joinedAt && (
                                <p className="text-xs text-gray-500">
                                  Rejoint le {formatDate(member.joinedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            member.role === 'leader' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'leader' ? '👑 Leader' : 'Membre'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucun membre pour le moment</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Aucune information disponible</p>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

