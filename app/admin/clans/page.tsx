'use client';

import { useEffect, useState } from 'react';
import { getClans, getAdminClanMembers, deleteClanMembership, getAdminMatieres } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

// Clan Wars API
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

const CLAN_EMBLEMS = [
  { id: 'francais', name: 'Français', file: 'clan-francais.png' },
  { id: 'maths', name: 'Mathématiques', file: 'clan-maths.png' },
  { id: 'sciences', name: 'Sciences', file: 'clan-sciences.png' },
  { id: 'histoire', name: 'Histoire', file: 'clan-histoire.png' },
  { id: 'geographie', name: 'Géographie', file: 'clan-geographie.png' },
];

export default function AdminClansPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'clans' | 'emblems' | 'wars' | 'warsConfig' | 'warsStats'>('members');
  const { showError, showSuccess, PopupComponent, showConfirm } = usePopup();

  // Wars state
  const [config, setConfig] = useState<Record<string, { value: string; description?: string }>>({});
  const [stats, setStats] = useState<any>(null);
  const [wars, setWars] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warFormData, setWarFormData] = useState({
    matiereId: '',
    weekStart: '',
    weekEnd: '',
  });

  // Emblem state
  const [uploadingEmblem, setUploadingEmblem] = useState<string | null>(null);
  const [emblemTimestamp, setEmblemTimestamp] = useState(Date.now());

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'members' || activeTab === 'clans') {
        const [clansData, membersData] = await Promise.all([
          getClans().catch(() => []),
          getAdminClanMembers().catch(() => []),
        ]);
        setClans(clansData);
        setMembers(membersData);
      } else if (activeTab === 'warsConfig') {
        const configData = await getClanWarsConfig() as Record<string, { value: string; description?: string }>;
        setConfig(configData);
      } else if (activeTab === 'warsStats') {
        const statsData = await getClanWarsStats() as any;
        setStats(statsData);
      } else if (activeTab === 'wars') {
        const [warsData, matieresData] = await Promise.all([
          getClanWars(),
          getAdminMatieres(),
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

  const handleDeleteMembership = async (membershipId: string, userName: string, clanName: string) => {
    showConfirm(
      `Supprimer l'association de "${userName}" avec le clan "${clanName}" ?`,
      async () => {
        try {
          await deleteClanMembership(membershipId);
          showSuccess('Association supprimée avec succès !');
          await loadData();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
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

  const handleFileUpload = async (emblemId: string, file: File | null | undefined) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/png')) {
      showError('Le fichier doit être au format PNG');
      return;
    }

    try {
      setUploadingEmblem(emblemId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('emblemId', emblemId);

      const response = await fetch('/api/admin/upload-clan-emblem', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload');
      }

      showSuccess(`Emblème ${emblemId} mis à jour avec succès`);
      setEmblemTimestamp(Date.now());
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploadingEmblem(null);
    }
  };

  const formatDate = (timestamp: number | Date | string) => {
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading && (activeTab === 'members' || activeTab === 'clans' || activeTab === 'warsConfig')) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text mb-2">👥 Gestion des Clans</h1>
          <p className="text-textMuted">Gérez les clans, leurs membres, emblèmes et guerres</p>
        </div>

        {/* Main Tabs */}
        <div className="mb-6 border-b-2 border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-textMuted hover:text-text hover:border-border'
              }`}
            >
              Membres ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('clans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'clans'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-textMuted hover:text-text hover:border-border'
              }`}
            >
              Clans ({clans.length})
            </button>
            <button
              onClick={() => setActiveTab('emblems')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'emblems'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-textMuted hover:text-text hover:border-border'
              }`}
            >
              Emblèmes
            </button>
            <button
              onClick={() => setActiveTab('wars')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                (activeTab === 'wars' || activeTab === 'warsConfig' || activeTab === 'warsStats')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-textMuted hover:text-text hover:border-border'
              }`}
            >
              Guerres
            </button>
          </nav>
        </div>

        {/* Wars Sub-tabs */}
        {(activeTab === 'wars' || activeTab === 'warsConfig' || activeTab === 'warsStats') && (
          <div className="mb-6 border-b border-border">
            <nav className="flex space-x-6">
              <button
                onClick={() => setActiveTab('warsConfig')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === 'warsConfig'
                    ? 'border-secondary text-text'
                    : 'border-transparent text-textMuted hover:text-text'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('wars')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === 'wars'
                    ? 'border-secondary text-text'
                    : 'border-transparent text-textMuted hover:text-text'
                }`}
              >
                Guerres
              </button>
              <button
                onClick={() => setActiveTab('warsStats')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === 'warsStats'
                    ? 'border-secondary text-text'
                    : 'border-transparent text-textMuted hover:text-text'
                }`}
              >
                Statistiques
              </button>
            </nav>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
            <h2 className="text-xl font-semibold text-text mb-4">Associations de Membres</h2>
            {members.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Clan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Matière
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Date de jointure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-background transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text">{member.userName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text">{member.clanName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-textMuted">{member.matiere}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.role === 'leader'
                              ? 'bg-secondary/20 text-secondary'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {member.role === 'leader' ? '👑 Leader' : 'Membre'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-textMuted">
                          {formatDate(member.joinedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteMembership(member.id, member.userName, member.clanName)}
                            className="text-error hover:brightness-110 transition-all"
                          >
                            🗑️ Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-textMuted text-center py-8">Aucune association de membre pour le moment</p>
            )}
          </div>
        )}

        {/* Clans Tab */}
        {activeTab === 'clans' && (
          <div className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
            <h2 className="text-xl font-semibold text-text mb-4">Liste des Clans</h2>
            {clans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clans.map((clan) => (
                  <div key={clan.id} className="p-4 bg-background border-2 border-border rounded-2xl hover:shadow-lift transition-all">
                    <h3 className="font-semibold text-text mb-1">{clan.name}</h3>
                    <p className="text-sm text-textMuted mb-2">{clan.description || 'Pas de description'}</p>
                    <div className="flex items-center gap-2 text-xs text-textMuted">
                      <span>{clan.matiere?.nom || 'Matière inconnue'}</span>
                      <span>•</span>
                      <span>{clan.memberCount || 0} membres</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-textMuted text-center py-8">Aucun clan pour le moment</p>
            )}
          </div>
        )}

        {/* Emblems Tab */}
        {activeTab === 'emblems' && (
          <div className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-text mb-2">Gestion des Emblèmes</h2>
              <p className="text-textMuted text-sm">Téléchargez des images PNG pour chaque clan matière</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {CLAN_EMBLEMS.map((emblem) => (
                <div key={emblem.id} className="bg-background rounded-2xl p-6 border-2 border-border hover:shadow-lift transition-all">
                  <h3 className="text-lg font-semibold text-text mb-4">{emblem.name}</h3>
                  
                  <div className="mb-4">
                    <div className="w-24 h-24 mx-auto bg-surface border-2 border-dashed border-border rounded-2xl overflow-hidden flex items-center justify-center">
                      <img
                        src={`/badges/${emblem.file}?t=${emblemTimestamp}`}
                        alt={emblem.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleFileUpload(emblem.id, e.target.files?.[0])}
                      id={`emblem-${emblem.id}`}
                      className="hidden"
                      disabled={uploadingEmblem === emblem.id}
                    />
                    <label
                      htmlFor={`emblem-${emblem.id}`}
                      className={`block w-full text-center px-4 py-2 rounded-2xl font-medium transition-all cursor-pointer ${
                        uploadingEmblem === emblem.id
                          ? 'bg-background text-textMuted cursor-not-allowed'
                          : 'bg-primary text-white hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] shadow-button'
                      }`}
                    >
                      {uploadingEmblem === emblem.id ? '⏳ Upload...' : '📤 Choisir PNG'}
                    </label>
                    <p className="text-xs text-textMuted text-center">
                      Fichier: {emblem.file}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-secondary/10 border-2 border-secondary/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-text mb-3">📋 Instructions</h3>
              <ul className="space-y-2 text-sm text-textMuted">
                <li>✅ Utilisez uniquement des fichiers <strong className="text-text">PNG</strong></li>
                <li>✅ Dimensions recommandées: <strong className="text-text">512x512px</strong> ou plus</li>
                <li>✅ Fond transparent recommandé pour un meilleur rendu</li>
                <li>✅ Les images seront automatiquement redimensionnées</li>
              </ul>
            </div>
          </div>
        )}

        {/* Wars Config Tab */}
        {activeTab === 'warsConfig' && (
          <div className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
            <h2 className="text-xl font-semibold text-text mb-4">Paramètres de Configuration</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Récompense par membre (bananes)
                </label>
                <p className="text-xs text-textMuted mb-2">
                  {config.reward_per_member?.description || 'Nombre de bananes données à chaque membre du clan gagnant'}
                </p>
                <input
                  type="number"
                  min="0"
                  value={config.reward_per_member?.value || '50'}
                  onChange={(e) => setConfig({ ...config, reward_per_member: { ...config.reward_per_member, value: e.target.value } })}
                  onBlur={(e) => handleConfigUpdate('reward_per_member', e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Guerres activées
                </label>
                <p className="text-xs text-textMuted mb-2">
                  {config.wars_enabled?.description || 'Activer ou désactiver les guerres de clan'}
                </p>
                <select
                  value={config.wars_enabled?.value || 'true'}
                  onChange={(e) => {
                    setConfig({ ...config, wars_enabled: { ...config.wars_enabled, value: e.target.value } });
                    handleConfigUpdate('wars_enabled', e.target.value);
                  }}
                  className="w-full sm:w-64 px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
                >
                  <option value="true">Activées</option>
                  <option value="false">Désactivées</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Création automatique
                </label>
                <p className="text-xs text-textMuted mb-2">
                  {config.auto_create_wars?.description || 'Créer automatiquement les guerres chaque semaine'}
                </p>
                <select
                  value={config.auto_create_wars?.value || 'true'}
                  onChange={(e) => {
                    setConfig({ ...config, auto_create_wars: { ...config.auto_create_wars, value: e.target.value } });
                    handleConfigUpdate('auto_create_wars', e.target.value);
                  }}
                  className="w-full sm:w-64 px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
                >
                  <option value="true">Automatique</option>
                  <option value="false">Manuelle</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Wars List Tab */}
        {activeTab === 'wars' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-text">Guerres</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] shadow-button transition-all"
              >
                + Créer une guerre
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : (
              <div className="bg-surface rounded-2xl shadow-card overflow-hidden border-2 border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Matière</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Début</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Fin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Total Bananes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Gagnant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-textMuted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {wars.map((war: any) => (
                      <tr key={war.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                          {war.matiere?.nom || 'Inconnue'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-textMuted">
                          {new Date(war.weekStart).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-textMuted">
                          {new Date(war.weekEnd).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            war.status === 'active' ? 'bg-success/10 text-success' : 'bg-background text-textMuted'
                          }`}>
                            {war.status === 'active' ? 'Active' : 'Terminée'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                          {war.totalBananas} 🍌
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                          {war.winnerClan?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {war.status === 'active' && (
                            <button
                              onClick={() => handleFinishWar(war.id)}
                              className="text-error hover:brightness-110 transition-all"
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
                  <div className="text-center py-8 text-textMuted">
                    Aucune guerre trouvée
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Wars Stats Tab */}
        {activeTab === 'warsStats' && (
          <div className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
            <h2 className="text-xl font-semibold text-text mb-4">Statistiques</h2>
            {loading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl">
                  <p className="text-sm text-textMuted">Total des guerres</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalWars}</p>
                </div>
                <div className="p-4 bg-success/10 border-2 border-success/30 rounded-2xl">
                  <p className="text-sm text-textMuted">Guerres actives</p>
                  <p className="text-3xl font-bold text-success">{stats.activeWars}</p>
                </div>
                <div className="p-4 bg-background border-2 border-border rounded-2xl">
                  <p className="text-sm text-textMuted">Guerres terminées</p>
                  <p className="text-3xl font-bold text-text">{stats.finishedWars}</p>
                </div>
                <div className="p-4 bg-secondary/10 border-2 border-secondary/30 rounded-2xl">
                  <p className="text-sm text-textMuted">Total bananes collectées</p>
                  <p className="text-3xl font-bold text-secondary">{stats.totalBananas?.toLocaleString() || 0} 🍌</p>
                </div>
                <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl">
                  <p className="text-sm text-textMuted">Clans participants</p>
                  <p className="text-3xl font-bold text-primary">{stats.uniqueClans}</p>
                </div>
                <div className="p-4 bg-secondary/10 border-2 border-secondary/30 rounded-2xl">
                  <p className="text-sm text-textMuted">Étudiants participants</p>
                  <p className="text-3xl font-bold text-secondary">{stats.uniqueUsers}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create War Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-border shadow-lift">
              <h3 className="text-xl font-semibold text-text mb-4">Créer une guerre</h3>
              <form onSubmit={handleCreateWar}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text mb-2">Matière</label>
                  <select
                    required
                    value={warFormData.matiereId}
                    onChange={(e) => setWarFormData({ ...warFormData, matiereId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
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
                  <label className="block text-sm font-medium text-text mb-2">Date de début (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={warFormData.weekStart}
                    onChange={(e) => setWarFormData({ ...warFormData, weekStart: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
                  />
                  <p className="text-xs text-textMuted mt-1">Laisser vide pour utiliser la semaine actuelle</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text mb-2">Date de fin (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={warFormData.weekEnd}
                    onChange={(e) => setWarFormData({ ...warFormData, weekEnd: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary bg-background text-text"
                  />
                  <p className="text-xs text-textMuted mt-1">Laisser vide pour utiliser la semaine actuelle</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border-2 border-border rounded-2xl hover:bg-background transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-110 shadow-button transition-all"
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
