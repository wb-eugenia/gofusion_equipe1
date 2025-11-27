'use client';

import { useEffect, useState } from 'react';
import { getAdminBadges, createBadge, updateBadge, deleteBadge } from '@/lib/api';

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '/badges/default.svg',
    description: '',
    thresholdXp: undefined as number | undefined,
    conditionType: 'xp' as 'xp' | 'top10' | 'courses_completed' | 'streak',
    conditionValue: undefined as number | undefined,
  });

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const data = await getAdminBadges();
      setBadges(data);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
        conditionType: formData.conditionType,
      };
      
      if (formData.conditionType === 'xp' && formData.thresholdXp) {
        submitData.thresholdXp = formData.thresholdXp;
      } else if (formData.conditionValue) {
        submitData.conditionValue = formData.conditionValue;
      }

      if (editingBadge) {
        await updateBadge(editingBadge.id, submitData);
      } else {
        await createBadge(submitData);
      }
      await loadBadges();
      setShowModal(false);
      setEditingBadge(null);
      setFormData({
        name: '',
        icon: '/badges/default.svg',
        description: '',
        thresholdXp: undefined,
        conditionType: 'xp',
        conditionValue: undefined,
      });
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleEdit = (badge: any) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      icon: badge.icon,
      description: badge.description,
      thresholdXp: badge.thresholdXp || undefined,
      conditionType: badge.conditionType,
      conditionValue: badge.conditionValue || undefined,
    });
    setShowModal(true);
  };

  const handleDelete = async (badgeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce badge ?')) return;
    try {
      await deleteBadge(badgeId);
      await loadBadges();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎖️ Gestion des Badges</h1>
          <p className="text-gray-600">Créez et gérez les badges</p>
        </div>
        <button
          onClick={() => {
            setEditingBadge(null);
            setFormData({
              name: '',
              icon: '/badges/default.svg',
              description: '',
              thresholdXp: undefined,
              conditionType: 'xp',
              conditionValue: undefined,
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          + Nouveau Badge
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {badges.map((badge) => (
          <div key={badge.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">🎖️</div>
              <h2 className="text-lg font-semibold text-gray-900">{badge.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Condition: {badge.conditionType}
              {badge.thresholdXp && ` (${badge.thresholdXp} XP)`}
              {badge.conditionValue && ` (${badge.conditionValue})`}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(badge)}
                className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(badge.id)}
                className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingBadge ? 'Modifier le badge' : 'Nouveau badge'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icône (chemin)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de condition
                </label>
                <select
                  value={formData.conditionType}
                  onChange={(e) => setFormData({ ...formData, conditionType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="xp">XP</option>
                  <option value="top10">Top 10</option>
                  <option value="courses_completed">Cours complétés</option>
                  <option value="streak">Streak</option>
                </select>
              </div>
              {formData.conditionType === 'xp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil XP
                  </label>
                  <input
                    type="number"
                    value={formData.thresholdXp || ''}
                    onChange={(e) => setFormData({ ...formData, thresholdXp: parseInt(e.target.value) || undefined })}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              {formData.conditionType !== 'xp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valeur de condition
                  </label>
                  <input
                    type="number"
                    value={formData.conditionValue || ''}
                    onChange={(e) => setFormData({ ...formData, conditionValue: parseInt(e.target.value) || undefined })}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingBadge ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBadge(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

