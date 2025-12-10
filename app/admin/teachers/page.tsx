'use client';

import { useEffect, useState } from 'react';
import { getAdminMatieres, createTeacher, updateTeacherCode, deleteTeacher, apiRequest } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

interface Matiere {
  id: string;
  nom: string;
  description: string | null;
}

interface Teacher {
  id: string;
  prenom: string;
  role: string;
  createdAt: string;
  matiere?: Matiere;
  code?: string;
  codeId?: string;
}

export default function AdminTeachersPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const { showError, showSuccess, showConfirm, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    prenom: '',
    matiereId: '',
  });
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matieresData, teachersResponse] = await Promise.all([
        getAdminMatieres(),
        apiRequest<{ users: any[]; pagination: any }>('/api/admin/users?role=teacher').catch(() => ({ users: [], pagination: {} })),
      ]);
      setMatieres(matieresData);
      
      // Get teacher codes to link teachers with matieres
      const codesData = await apiRequest<any[]>('/api/admin/teacher-codes').catch(() => []);
      
      // Combine teachers with their matieres and codes
      const teachersWithMatiere = (teachersResponse?.users || []).map((teacher) => {
        const teacherCode = codesData.find((code: any) => code.teacherId === teacher.id && !code.isSpecialCode);
        return {
          ...teacher,
          matiere: teacherCode?.matiere || null,
          code: teacherCode?.code || null,
          codeId: teacherCode?.id || null,
        };
      });
      
      setTeachers(teachersWithMatiere);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.prenom.trim()) {
        showError('Le prénom est requis');
        return;
      }

      if (!formData.matiereId) {
        showError('Veuillez sélectionner une matière');
        return;
      }

      const result = await createTeacher({
        prenom: formData.prenom.trim(),
        matiereId: formData.matiereId,
      });

      showSuccess(
        result.message + 
        (result.code ? ` Code d'accès: ${result.code}` : '')
      );

      setShowModal(false);
      setFormData({ prenom: '', matiereId: '' });
      loadData(); // Reload the list
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création du professeur');
    }
  };

  const handleChangeCode = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setNewCode(teacher.code || '');
    setShowCodeModal(true);
  };

  const handleUpdateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.codeId) {
      showError('Impossible de modifier le code');
      return;
    }

    try {
      if (!newCode.trim()) {
        showError('Le code ne peut pas être vide');
        return;
      }

      await updateTeacherCode(editingTeacher.codeId, newCode.trim().toUpperCase());
      showSuccess('Code d\'accès modifié avec succès');
      setShowCodeModal(false);
      setEditingTeacher(null);
      setNewCode('');
      loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la modification du code');
    }
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    showConfirm(
      `Supprimer le professeur "${teacher.prenom}" ? Cette action est irréversible. Tous les codes associés seront également supprimés.`,
      async () => {
        try {
          await deleteTeacher(teacher.id);
          showSuccess('Professeur supprimé avec succès');
          loadData();
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
          <h1 className="text-3xl font-bold text-text mb-2">Créer un Professeur</h1>
          <p className="text-textMuted">Créez un compte professeur et liez-le à une matière</p>
        </div>
        <button
          onClick={() => {
            setFormData({ prenom: '', matiereId: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
        >
          + Créer un professeur
        </button>
      </div>

      {matieres.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ Aucune matière disponible. Créez d'abord une matière dans la section{' '}
            <a href="/admin/matieres" className="underline font-semibold">
              Matières
            </a>
            .
          </p>
        </div>
      )}

      {/* Teachers List */}
      <div className="bg-surface rounded-lg shadow-card overflow-hidden mt-6">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text">Liste des professeurs</h2>
        </div>
        {teachers.length === 0 ? (
          <div className="p-8 text-center text-textMuted">
            Aucun professeur créé. Créez-en un pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="p-4 hover:bg-border/20 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text">{teacher.prenom}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        Professeur
                      </span>
                    </div>
                    {teacher.matiere ? (
                      <p className="text-textMuted text-sm">
                        Matière: <span className="font-semibold text-text">{teacher.matiere.nom}</span>
                      </p>
                    ) : (
                      <p className="text-textMuted text-sm italic">Aucune matière associée</p>
                    )}
                    {teacher.code && (
                      <p className="text-textMuted text-sm mt-1">
                        Code: <code className="bg-border px-2 py-1 rounded text-xs font-mono">{teacher.code}</code>
                      </p>
                    )}
                    <p className="text-textMuted text-xs mt-2">
                      Créé le {new Date(teacher.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {teacher.codeId && (
                      <button
                        onClick={() => handleChangeCode(teacher)}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition min-h-[36px]"
                      >
                        Modifier code
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTeacher(teacher)}
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

      {/* Change Code Modal */}
      {showCodeModal && editingTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-card max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-text mb-4">
                Modifier le code d'accès
              </h2>
              <p className="text-textMuted text-sm mb-4">
                Professeur: <span className="font-semibold text-text">{editingTeacher.prenom}</span>
              </p>
              <form onSubmit={handleUpdateCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Nouveau code *
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary font-mono"
                    placeholder="Ex: ABC12345"
                    required
                    maxLength={10}
                  />
                  <p className="text-xs text-textMuted mt-1">
                    Le code sera automatiquement converti en majuscules
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCodeModal(false);
                      setEditingTeacher(null);
                      setNewCode('');
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-card max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-text mb-4">Créer un professeur</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Jean"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Matière *
                  </label>
                  <select
                    value={formData.matiereId}
                    onChange={(e) => setFormData({ ...formData, matiereId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Sélectionner une matière</option>
                    {matieres.map((matiere) => (
                      <option key={matiere.id} value={matiere.id}>
                        {matiere.nom}
                      </option>
                    ))}
                  </select>
                  {matieres.length === 0 && (
                    <p className="text-xs text-textMuted mt-1">
                      <a href="/admin/matieres" className="text-primary underline">
                        Créer une matière d'abord
                      </a>
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ Un code d'accès sera généré automatiquement pour ce professeur. 
                    Il pourra l'utiliser pour accéder à ses cours.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
                    disabled={matieres.length === 0}
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ prenom: '', matiereId: '' });
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

