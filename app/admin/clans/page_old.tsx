'use client';

import { useEffect, useState } from 'react';
import { getClans, getAdminClanMembers, deleteClanMembership } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

export default function AdminClansPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clans' | 'members'>('members');
  const { showError, showSuccess, PopupComponent, showConfirm } = usePopup();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clansData, membersData] = await Promise.all([
        getClans().catch(() => []),
        getAdminClanMembers().catch(() => []),
      ]);
      setClans(clansData);
      setMembers(membersData);
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

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Gestion des Clans</h1>
          <p className="text-gray-600">Gérez les clans et les associations de membres</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Membres ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('clans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Clans ({clans.length})
            </button>
          </nav>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Associations de Membres</h2>
            {members.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matière
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de jointure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.userName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.clanName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{member.matiere}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.role === 'leader'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'leader' ? '👑 Leader' : 'Membre'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(member.joinedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteMembership(member.id, member.userName, member.clanName)}
                            className="text-red-600 hover:text-red-900"
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
              <p className="text-gray-500 text-center py-8">Aucune association de membre pour le moment</p>
            )}
          </div>
        )}

        {/* Clans Tab */}
        {activeTab === 'clans' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Liste des Clans</h2>
            {clans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clans.map((clan) => (
                  <div key={clan.id} className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-1">{clan.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{clan.description || 'Pas de description'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{clan.matiere?.nom || 'Matière inconnue'}</span>
                      <span>•</span>
                      <span>{clan.memberCount || 0} membres</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucun clan pour le moment</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

