'use client';

import { useEffect, useState } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse, getMatieres } from '@/lib/api';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';
import { usePopup } from '@/hooks/usePopup';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    matiereId: '',
    gameType: 'quiz' as 'quiz' | 'memory' | 'match',
    theoreticalContent: '',
    xpReward: 50,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, matieresData] = await Promise.all([
        getCourses(),
        getMatieres(),
      ]);
      setCourses(coursesData);
      setMatieres(matieresData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
      } else {
        await createCourse(formData);
      }
      await loadData();
      setShowModal(false);
      setEditingCourse(null);
      setFormData({ titre: '', description: '', matiereId: '', gameType: 'quiz', theoreticalContent: '', xpReward: 50 });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setFormData({
      titre: course.titre,
      description: course.description,
      matiereId: course.matiereId || '',
      gameType: course.gameType || 'quiz',
      theoreticalContent: course.theoreticalContent || '',
      xpReward: course.xpReward,
    });
    setShowModal(true);
  };

  const handleDelete = async (courseId: string) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce cours ?',
      async () => {
        try {
          await deleteCourse(courseId);
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

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Gestion des Cours</h1>
          <p className="text-gray-600">Créez et gérez les cours</p>
        </div>
        <button
          onClick={() => {
            setEditingCourse(null);
            setFormData({ titre: '', description: '', matiereId: '', gameType: 'quiz', theoreticalContent: '', xpReward: 50 });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          + Nouveau Cours
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{course.titre}</h2>
            <p className="text-gray-600 mb-4">{course.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-yellow-600 font-semibold">🍌 +{course.xpReward} bananes</span>
                {course.matiere && (
                  <span className="text-xs text-gray-500">Matière: {course.matiere.nom}</span>
                )}
                <span className="text-xs text-gray-500">Type: {course.gameType === 'quiz' ? 'Quiz' : course.gameType === 'memory' ? 'Memory' : 'Match'}</span>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(course)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
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
                  Matière
                </label>
                <select
                  value={formData.matiereId}
                  onChange={(e) => setFormData({ ...formData, matiereId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Sélectionner une matière</option>
                  {matieres.map((matiere) => (
                    <option key={matiere.id} value={matiere.id}>
                      {matiere.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de jeu *
                </label>
                <select
                  value={formData.gameType}
                  onChange={(e) => setFormData({ ...formData, gameType: e.target.value as 'quiz' | 'memory' | 'match' })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="quiz">Quiz (Questions à choix multiples)</option>
                  <option value="memory">Memory (Paires de cartes)</option>
                  <option value="match">Match (Relier les éléments)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenu théorique
                </label>
                <RichTextEditor
                  value={formData.theoreticalContent}
                  onChange={(value) => setFormData({ ...formData, theoreticalContent: value })}
                  placeholder="Saisissez le contenu théorique qui sera affiché avant les questions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Récompense (bananes) *
                </label>
                <input
                  type="number"
                  value={formData.xpReward}
                  onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 50 })}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingCourse ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCourse(null);
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
    </>
  );
}

