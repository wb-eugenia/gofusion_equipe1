'use client';

import { useEffect, useState, Fragment } from 'react';
import { getAdminBadges, createBadge, updateBadge, deleteBadge } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [showModal, setShowModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [uploadingBadge, setUploadingBadge] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
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

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      showError('Veuillez sélectionner un fichier PNG valide');
      return;
    }

    setUploadingBadge(editingBadge?.id || 'new');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('badgeId', editingBadge?.id || 'new');

      const response = await fetch('/api/admin/upload-badge-icon', {
        method: 'POST',
        body: formDataUpload,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const result: any = await response.json();
      const iconPath = `/badges/${result.filename}`;
      setFormData({ ...formData, icon: iconPath });
      setIconPreview(iconPath);
      showError('✅ Icône uploadée avec succès', 'success');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'upload de l\'icône');
    } finally {
      setUploadingBadge(null);
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
      setIconPreview(null);
      setFormData({
        name: '',
        icon: '/badges/default.svg',
        description: '',
        thresholdXp: undefined,
        conditionType: 'xp',
        conditionValue: undefined,
      });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
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
    setIconPreview(badge.icon);
    setShowModal(true);
  };

  const handleDelete = async (badgeId: string) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce badge ?',
      async () => {
        try {
          await deleteBadge(badgeId);
          await loadBadges();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-text">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">🎖️ Gestion des Badges</h1>
            <p className="text-textMuted">Créez et gérez les badges</p>
          </div>
          <button
            onClick={() => {
              setEditingBadge(null);
              setIconPreview(null);
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
            className="px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
          >
            + Nouveau Badge
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {badges.map((badge) => (
            <div key={badge.id} className="bg-surface rounded-2xl shadow-card p-6 border-2 border-border">
              <div className="text-center mb-4">
                <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center bg-background rounded-lg border-2 border-border">
                  <img src={badge.icon} alt={badge.name} className="w-full h-full object-contain p-1" />
                </div>
                <h2 className="text-lg font-semibold text-text">{badge.name}</h2>
                <p className="text-sm text-textMuted mt-1">{badge.description}</p>
              </div>
              <div className="text-xs text-textMuted mb-4 text-center">
                Condition: {badge.conditionType}
                {badge.thresholdXp && ` (${badge.thresholdXp} XP)`}
                {badge.conditionValue && ` (${badge.conditionValue})`}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(badge)}
                  className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-2xl hover:bg-primary/20 transition text-sm font-medium"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(badge.id)}
                  className="flex-1 px-3 py-2 bg-error/10 text-error rounded-2xl hover:bg-error/20 transition text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-card">
              <h2 className="text-2xl font-bold text-text mb-4">
                {editingBadge ? 'Modifier le badge' : 'Nouveau badge'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary text-text bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Icône PNG
                  </label>
                  <div className="flex flex-col space-y-3">
                    <div className="w-full h-24 flex items-center justify-center bg-background border-2 border-dashed border-border rounded-2xl">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Aperçu" className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-textMuted text-sm">Aperçu de l'icône</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/png"
                        onChange={handleIconUpload}
                        disabled={uploadingBadge === (editingBadge?.id || 'new')}
                        className="hidden"
                        id="icon-upload"
                      />
                      <label
                        htmlFor="icon-upload"
                        className={`
                          block w-full px-4 py-2 rounded-2xl text-center font-semibold cursor-pointer transition-all
                          ${uploadingBadge === (editingBadge?.id || 'new')
                            ? 'bg-primary/50 text-white cursor-not-allowed'
                            : 'bg-primary text-white hover:brightness-105'
                          }
                        `}
                      >
                        {uploadingBadge === (editingBadge?.id || 'new') ? '⏳ Upload en cours...' : '📤 Choisir un PNG'}
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary text-text bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Type de condition
                  </label>
                  <select
                    value={formData.conditionType}
                    onChange={(e) => setFormData({ ...formData, conditionType: e.target.value as any })}
                    className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary text-text bg-background"
                  >
                    <option value="xp">XP</option>
                    <option value="top10">Top 10</option>
                    <option value="courses_completed">Cours complétés</option>
                    <option value="streak">Streak</option>
                  </select>
                </div>

                {formData.conditionType === 'xp' && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Seuil XP
                    </label>
                    <input
                      type="number"
                      value={formData.thresholdXp || ''}
                      onChange={(e) => setFormData({ ...formData, thresholdXp: parseInt(e.target.value) || undefined })}
                      required
                      min="0"
                      className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary text-text bg-background"
                    />
                  </div>
                )}

                {formData.conditionType !== 'xp' && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Valeur de condition
                    </label>
                    <input
                      type="number"
                      value={formData.conditionValue || ''}
                      onChange={(e) => setFormData({ ...formData, conditionValue: parseInt(e.target.value) || undefined })}
                      required
                      min="0"
                      className="w-full px-3 py-2 border-2 border-border rounded-2xl focus:ring-2 focus:ring-primary text-text bg-background"
                    />
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-2xl hover:brightness-105 transition font-semibold shadow-button"
                  >
                    {editingBadge ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBadge(null);
                      setIconPreview(null);
                    }}
                    className="flex-1 px-4 py-2 bg-surface text-text rounded-2xl border-2 border-border hover:shadow-lift transition"
                  >
                    Annuler
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

