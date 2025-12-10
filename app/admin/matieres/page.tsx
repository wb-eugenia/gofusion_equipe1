'use client';

import { useEffect, useState } from 'react';
import { getAdminMatieres, createMatiere, updateMatiere, deleteMatiere, apiRequest } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

interface Matiere {
  id: string;
  nom: string;
  description: string | null;
  createdAt: string;
}

export default function AdminMatieresPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const { showError, showSuccess, showConfirm, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
  });

  useEffect(() => {
    loadMatieres();
  }, []);

  const loadMatieres = async () => {
    try {
      const data = await getAdminMatieres();
      setMatieres(data);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des matières');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.nom.trim()) {
        showError('Le nom de la matière est requis');
        return;
      }

      if (editingMatiere) {
        await updateMatiere(editingMatiere.id, {
          nom: formData.nom.trim(),
          description: formData.description.trim() || undefined,
        });
        showSuccess('Matière mise à jour avec succès');
      } else {
        await createMatiere({
          nom: formData.nom.trim(),
          description: formData.description.trim() || undefined,
        });
        showSuccess('Matière créée avec succès');
      }

      setShowModal(false);
      setEditingMatiere(null);
      setFormData({ nom: '', description: '' });
      loadMatieres();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (matiere: Matiere) => {
    setEditingMatiere(matiere);
    setFormData({
      nom: matiere.nom,
      description: matiere.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = (matiere: Matiere) => {
    showConfirm(
      `Supprimer la matière "${matiere.nom}" ?`,
      'Cette action est irréversible. Tous les cours associés seront également supprimés.',
      async () => {
        try {
          await deleteMatiere(matiere.id);
          showSuccess('Matière supprimée avec succès');
          loadMatieres();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Matières</h1>
          <p className="text-textMuted">Gérer les matières disponibles</p>
        </div>
        <button
          onClick={() => {
            setEditingMatiere(null);
            setFormData({ nom: '', description: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
        >
          + Créer une matière
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow-card overflow-hidden">
        {matieres.length === 0 ? (
          <div className="p-8 text-center text-textMuted">
            Aucune matière créée. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {matieres.map((matiere) => (
              <div key={matiere.id} className="p-4 hover:bg-border/20 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-1">{matiere.nom}</h3>
                    {matiere.description && (
                      <p className="text-textMuted text-sm">{matiere.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(matiere)}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition min-h-[36px]"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(matiere)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition min-h-[36px]"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-card max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-text mb-4">
                {editingMatiere ? 'Modifier la matière' : 'Créer une matière'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Nom de la matière *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Mathématiques"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Description de la matière"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
                  >
                    {editingMatiere ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingMatiere(null);
                      setFormData({ nom: '', description: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-border text-text rounded-lg hover:bg-border/80 transition min-h-[44px]"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <PopupComponent />
    </div>
  );
}

