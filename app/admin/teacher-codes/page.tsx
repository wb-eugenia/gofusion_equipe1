'use client';

import { useEffect, useState } from 'react';
import { getTeacherCodes, createTeacherCode, deleteTeacherCode, apiRequest } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

interface TeacherCode {
  id: string;
  code: string;
  teacherId: string | null;
  matiereId: string | null;
  courseIds: string[] | null;
  maxUses: number;
  currentUses: number;
  isSpecialCode: boolean;
  expiresAt: string | null;
  createdAt: string;
  teacher?: {
    id: string;
    prenom: string;
  };
  matiere?: {
    id: string;
    nom: string;
  };
}

export default function AdminTeacherCodesPage() {
  const [codes, setCodes] = useState<TeacherCode[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [isSpecialCode, setIsSpecialCode] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    matiereId: '',
    courseIds: [] as string[],
    maxUses: 1, // Default to 1 for special codes
    expiresAt: '',
  });

  // Ensure teachers is always an array
  const safeTeachers = Array.isArray(teachers) ? teachers : [];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [codesData, teachersResponse, coursesData, matieresData] = await Promise.all([
        getTeacherCodes(),
        apiRequest<{ users: any[]; pagination: any }>('/api/admin/users?role=teacher').catch(() => ({ users: [], pagination: {} })),
        apiRequest<any[]>('/api/admin/courses'),
        apiRequest<any[]>('/api/admin/matieres').catch(() => []),
      ]);
      setCodes(codesData);
      // Extract users array from response
      setTeachers(Array.isArray(teachersResponse) ? teachersResponse : (teachersResponse?.users || []));
      setCourses(coursesData);
      setMatieres(matieresData);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des données');
      // Ensure teachers is always an array
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSpecialCode) {
        if (!formData.matiereId) {
          showError('Veuillez sélectionner une matière');
          return;
        }
      } else {
        if (!formData.teacherId) {
          showError('Veuillez sélectionner un professeur');
          return;
        }
      }

      await createTeacherCode({
        isSpecialCode,
        teacherId: isSpecialCode ? undefined : formData.teacherId,
        matiereId: isSpecialCode ? formData.matiereId : undefined,
        courseIds: formData.courseIds.length > 0 ? formData.courseIds : undefined,
        maxUses: formData.maxUses > 0 ? formData.maxUses : undefined,
        expiresAt: formData.expiresAt || undefined,
      });

      setShowModal(false);
      setIsSpecialCode(false);
      setFormData({
        teacherId: '',
        matiereId: '',
        courseIds: [],
        maxUses: 1,
        expiresAt: '',
      });
      loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création du code');
    }
  };

  const handleDelete = (codeId: string) => {
    showConfirm(
      'Supprimer ce code ? Cette action est irréversible.',
      async () => {
        try {
          await deleteTeacherCode(codeId);
          loadData();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression'
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
          <h1 className="text-3xl font-bold text-text mb-2">Codes Professeur</h1>
          <p className="text-textMuted">Gérer les codes d'inscription pour les professeurs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + Créer un code
        </button>
      </div>

      <div className="bg-surface rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-border/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Professeur / Matière</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Cours</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Utilisations</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Expiration</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {codes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-textMuted">
                  Aucun code créé
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id} className="hover:bg-border/20">
                  <td className="px-4 py-3">
                    <code className="bg-border px-2 py-1 rounded text-sm font-mono">
                      {code.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-text">
                    {code.isSpecialCode ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        Code spécial
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                        Code normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {code.isSpecialCode ? (
                      <span className="text-blue-600 font-semibold">
                        {code.matiere?.nom || 'Matière inconnue'}
                      </span>
                    ) : (
                      <span>{code.teacher?.prenom || 'Inconnu'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {code.isSpecialCode ? (
                      <span className="text-textMuted">Création compte prof</span>
                    ) : code.courseIds && code.courseIds.length > 0 ? (
                      `${code.courseIds.length} cours`
                    ) : (
                      'Tous les cours'
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {code.maxUses > 0
                      ? `${code.currentUses} / ${code.maxUses}`
                      : `${code.currentUses} (illimité)`}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {code.expiresAt
                      ? new Date(code.expiresAt).toLocaleDateString('fr-FR')
                      : 'Jamais'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="text-error hover:text-error/80 transition"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-text mb-4">Créer un code professeur</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Code Type Toggle */}
                <div className="bg-border/30 p-4 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSpecialCode}
                      onChange={(e) => {
                        setIsSpecialCode(e.target.checked);
                        setFormData({
                          teacherId: '',
                          matiereId: '',
                          courseIds: [],
                          maxUses: e.target.checked ? 1 : -1,
                          expiresAt: '',
                        });
                      }}
                      className="w-5 h-5 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-semibold text-text">Code spécial (création compte prof)</div>
                      <div className="text-sm text-textMuted">
                        Crée un compte professeur lors de l'inscription. 1 code = 1 compte = 1 matière
                      </div>
                    </div>
                  </label>
                </div>

                {isSpecialCode ? (
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
                    <p className="text-xs text-textMuted mt-1">
                      Le compte créé avec ce code sera un professeur lié à cette matière.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Professeur *
                    </label>
                    <select
                      value={formData.teacherId}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                      required
                    >
                    <option value="">Sélectionner un professeur</option>
                    {safeTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.prenom}
                      </option>
                    ))}
                    </select>
                  </div>
                )}

                {!isSpecialCode && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Cours (optionnel)
                    </label>
                    <select
                      multiple
                      value={formData.courseIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                        setFormData({ ...formData, courseIds: selected });
                      }}
                      className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary min-h-[100px]"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.titre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-textMuted mt-1">
                      Maintenez Ctrl/Cmd pour sélectionner plusieurs cours. Laissez vide pour tous les cours du professeur.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Utilisations max {isSpecialCode ? '(recommandé: 1)' : '(optionnel)'}
                  </label>
                  <input
                    type="number"
                    value={formData.maxUses === -1 ? '' : formData.maxUses}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUses: e.target.value === '' ? -1 : parseInt(e.target.value),
                      })
                    }
                    min="1"
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder={isSpecialCode ? "1 (par défaut)" : "Illimité si vide"}
                  />
                  {isSpecialCode && (
                    <p className="text-xs text-textMuted mt-1">
                      Les codes spéciaux sont généralement à usage unique (1 utilisation).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Date d'expiration (optionnel)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-border text-text rounded-lg hover:bg-border/80 transition"
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

