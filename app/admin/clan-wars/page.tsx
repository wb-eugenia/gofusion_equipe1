'use client';

import { useEffect, useState } from 'react';
import { getMatieres } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function getClanWarsConfig() {
  const response = await fetch(`${API_URL}/api/admin/clan-wars/config`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}

async function updateClanWarsConfig(key: string, value: string, description?: string) {
  const response = await fetch(`${API_URL}/api/admin/clan-wars/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ key, value, description }),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to update config');
  }
  return response.json();
}

async function getClanWarsStats() {
  const response = await fetch(`${API_URL}/api/admin/clan-wars/stats`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load stats');
  return response.json();
}

async function getClanWars(status?: string) {
  const url = status
    ? `${API_URL}/api/admin/clan-wars?status=${status}`
    : `${API_URL}/api/admin/clan-wars`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load wars');
  return response.json();
}

async function createClanWar(data: any) {
  const response = await fetch(`${API_URL}/api/admin/clan-wars/manual-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to create war');
  }
  return response.json();
}

async function finishClanWar(warId: string) {
  const response = await fetch(`${API_URL}/api/admin/clan-wars/${warId}/finish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to finish war');
  }
  return response.json();
}

export default function ClanWarsAdminPage() {
  const [config, setConfig] = useState<Record<string, { value: string; description?: string }>>({});
  const [stats, setStats] = useState<any>(null);
  const [wars, setWars] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'wars' | 'stats'>('config');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warFormData, setWarFormData] = useState({
    matiereId: '',
    weekStart: '',
    weekEnd: '',
  });
  const { showError, showSuccess, PopupComponent } = usePopup();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'config') {
        const configData = await getClanWarsConfig() as Record<string, { value: string; description?: string }>;
        setConfig(configData);
      } else if (activeTab === 'stats') {
        const statsData = await getClanWarsStats() as any;
        setStats(statsData);
      } else if (activeTab === 'wars') {
        const [warsData, matieresData] = await Promise.all([
          getClanWars(),
          getMatieres(),
        ]);
        setWars(warsData as any[]);
        setMatieres(matieresData as any[]);
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (key: string, value: string) => {
    try {
      await updateClanWarsConfig(key, value, config[key]?.description);
      showSuccess('Configuration mise à jour');
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleCreateWar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClanWar(warFormData);
      showSuccess('Guerre créée avec succès');
      setShowCreateModal(false);
      setWarFormData({ matiereId: '', weekStart: '', weekEnd: '' });
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleFinishWar = async (warId: string) => {
    if (!confirm('Terminer cette guerre maintenant ? Les récompenses seront distribuées.')) {
      return;
    }
    try {
      await finishClanWar(warId);
      showSuccess('Guerre terminée avec succès');
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la finalisation');
    }
  };

  if (loading && activeTab === 'config') {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Guerres de Clan</h1>
          <p className="text-gray-600">Configurez les paramètres des guerres de clan et gérez les guerres actives</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('wars')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'wars'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guerres
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistiques
            </button>
          </nav>
        </div>

        {activeTab === 'config' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paramètres de Configuration</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Récompense par membre (bananes)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {config.reward_per_member?.description || 'Nombre de bananes données à chaque membre du clan gagnant'}
                </p>
                <input
                  type="number"
                  min="0"
                  value={config.reward_per_member?.value || '50'}
                  onChange={(e) => setConfig({ ...config, reward_per_member: { ...config.reward_per_member, value: e.target.value } })}
                  onBlur={(e) => handleConfigUpdate('reward_per_member', e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guerres activées
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {config.wars_enabled?.description || 'Activer ou désactiver les guerres de clan'}
                </p>
                <select
                  value={config.wars_enabled?.value || 'true'}
                  onChange={(e) => {
                    setConfig({ ...config, wars_enabled: { ...config.wars_enabled, value: e.target.value } });
                    handleConfigUpdate('wars_enabled', e.target.value);
                  }}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="true">Activées</option>
                  <option value="false">Désactivées</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Création automatique
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {config.auto_create_wars?.description || 'Créer automatiquement les guerres chaque semaine'}
                </p>
                <select
                  value={config.auto_create_wars?.value || 'true'}
                  onChange={(e) => {
                    setConfig({ ...config, auto_create_wars: { ...config.auto_create_wars, value: e.target.value } });
                    handleConfigUpdate('auto_create_wars', e.target.value);
                  }}
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="true">Automatique</option>
                  <option value="false">Manuelle</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wars' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Guerres</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Créer une guerre
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matière</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Début</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bananes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gagnant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wars.map((war: any) => (
                      <tr key={war.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {war.matiere?.nom || 'Inconnue'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(war.weekStart).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(war.weekEnd).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            war.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {war.status === 'active' ? 'Active' : 'Terminée'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {war.totalBananas} 🍌
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {war.winnerClan?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {war.status === 'active' && (
                            <button
                              onClick={() => handleFinishWar(war.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Terminer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {wars.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucune guerre trouvée
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
            {loading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total des guerres</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalWars}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Guerres actives</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeWars}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Guerres terminées</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.finishedWars}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total bananes collectées</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.totalBananas?.toLocaleString() || 0} 🍌</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Clans participants</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.uniqueClans}</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-gray-600">Étudiants participants</p>
                  <p className="text-3xl font-bold text-pink-600">{stats.uniqueUsers}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create War Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Créer une guerre</h3>
              <form onSubmit={handleCreateWar}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matière</label>
                  <select
                    required
                    value={warFormData.matiereId}
                    onChange={(e) => setWarFormData({ ...warFormData, matiereId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={warFormData.weekStart}
                    onChange={(e) => setWarFormData({ ...warFormData, weekStart: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laisser vide pour utiliser la semaine actuelle</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={warFormData.weekEnd}
                    onChange={(e) => setWarFormData({ ...warFormData, weekEnd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Laisser vide pour utiliser la semaine actuelle</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

