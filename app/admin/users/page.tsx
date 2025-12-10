'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

interface User {
  id: string;
  prenom: string;
  xp: number;
  role: string;
  streakDays: number;
  createdAt: string;
  stats: {
    coursesCompleted: number;
    badgesUnlocked: number;
    itemsPurchased: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showError, showConfirm, PopupComponent } = usePopup();

  useEffect(() => {
    loadUsers();
  }, [page, searchQuery, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const data = await apiRequest<{
        users: User[];
        pagination: { page: number; totalPages: number; total: number };
      }>(`/api/admin/users?${params.toString()}`);
      
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (userId: string, userName: string) => {
    showConfirm(
      `Réinitialiser le compte de ${userName} ? Cette action va supprimer toutes les données (badges, progression, achats, skins) mais gardera l'historique des duels et amitiés. L'utilisateur sera remis à zéro.`,
      async () => {
        try {
          await apiRequest<{ success: boolean }>(`/api/admin/users/${userId}/reset`, {
            method: 'DELETE',
          });
          loadUsers();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la réinitialisation');
        }
      },
      'Confirmer la réinitialisation',
      'Réinitialiser',
      'Annuler'
    );
  };

  const handleDelete = (userId: string, userName: string, userRole: string) => {
    if (userRole === 'admin') {
      showError('Impossible de supprimer un compte administrateur');
      return;
    }
    
    showConfirm(
      `Supprimer définitivement le compte de ${userName} ? Cette action est irréversible. Toutes les données de l'utilisateur seront supprimées.`,
      async () => {
        try {
          await apiRequest<{ success: boolean }>(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });
          loadUsers();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PopupComponent />
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">👥 Gestion des Utilisateurs</h1>
          <p className="text-textMuted">Gérer et réinitialiser les comptes utilisateurs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-surface rounded-lg shadow-card p-4 space-y-4 sm:space-y-0 sm:flex sm:gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tous les rôles</option>
            <option value="student">Étudiants</option>
            <option value="teacher">Professeurs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead className="bg-border/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Rôle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">XP</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Streak</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Statistiques</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-textMuted">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-border/20">
                    <td className="px-4 py-3 text-text font-medium">{user.prenom}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role === 'admin' ? 'Admin' :
                         user.role === 'teacher' ? 'Prof' :
                         'Étudiant'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text">{user.xp} 🍌</td>
                    <td className="px-4 py-3 text-text">{user.streakDays} jours</td>
                    <td className="px-4 py-3 text-text text-sm">
                      <div className="flex flex-col gap-1">
                        <span>{user.stats.coursesCompleted} cours</span>
                        <span>{user.stats.badgesUnlocked} badges</span>
                        <span>{user.stats.itemsPurchased} achats</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReset(user.id, user.prenom)}
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition text-sm"
                          title="Réinitialiser le compte"
                        >
                          🔄 Réinitialiser
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.prenom, user.role)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                          title="Supprimer le compte"
                          disabled={user.role === 'admin'}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex justify-between items-center">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-border text-text rounded hover:bg-border/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="text-textMuted">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-border text-text rounded hover:bg-border/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

