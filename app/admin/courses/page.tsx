'use client';

import { useEffect, useState } from 'react';
import { 
  createCourse, 
  updateCourse, 
  deleteCourse, 
  getAdminMatieres,
  getAdminCourseQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  apiRequest,
} from '@/lib/api';
import RichTextEditor from '@/components/RichTextEditor';
import QuestionEditor from '@/components/QuestionEditor';
import { usePopup } from '@/hooks/usePopup';

type GameType = 'quiz' | 'memory' | 'match';
type QuestionType = 'multiple_choice' | 'memory_pair' | 'match_pair';

interface AdminQuestion {
  id?: string;
  question: string;
  type: QuestionType;
  options?: string;
  correctAnswer?: string;
  order: number;
}

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
    theoreticalContent: '',
    xpReward: 50,
  });
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  // IDs des questions existantes en base pour ce cours (avant modification)
  const [initialQuestionIds, setInitialQuestionIds] = useState<string[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Use admin endpoints that don't require user session
      const [coursesData, matieresData] = await Promise.all([
        apiRequest<any[]>('/api/admin/courses'),
        getAdminMatieres(),
      ]);
      setCourses(coursesData);
      setMatieres(matieresData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetCourseForm = () => {
    setFormData({ 
      titre: '', 
      description: '', 
      matiereId: '', 
      theoreticalContent: '', 
      xpReward: 50,
    });
    setQuestions([]);
    setInitialQuestionIds([]);
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation basique : au moins une question pour le type sélectionné
      if (questions.length === 0) {
        showError('Veuillez ajouter au moins une question pour ce cours.');
        return;
      }

      // Déterminer automatiquement le type de jeu à partir du type de questions
      const questionTypes = Array.from(new Set(questions.map(q => q.type)));
      if (questionTypes.length !== 1) {
        showError('Toutes les questions d’un cours doivent être du même type (QCM, Memory ou Match).');
        return;
      }

      const qType = questionTypes[0];
      let gameType: GameType;
      if (qType === 'multiple_choice') {
        gameType = 'quiz';
      } else if (qType === 'memory_pair') {
        gameType = 'memory';
      } else {
        gameType = 'match';
      }

      if (editingCourse) {
        // Mise à jour du cours
        const updatedCourse = await updateCourse(editingCourse.id, {
          ...formData,
          gameType,
        });

        // Met à jour / crée / supprime les questions une par une
<<<<<<< HEAD
        // On se base sur les IDs chargés depuis l'API au moment où on a ouvert la modale
        const existingIds = new Set(initialQuestionIds);
=======
        const existingIds = new Set(
          (editingCourse.questions || []).map((q: any) => q.id as string).filter((id: string): id is string => !!id)
        );
>>>>>>> d8264abb074fe16356708db307a10cde250e95f3
        const currentIds = new Set(
          questions.filter(q => q.id).map(q => q.id as string)
        );

        // Supprimer les anciennes questions qui ne sont plus présentes
        for (const oldId of existingIds) {
          const oldIdStr = oldId as string;
          if (!currentIds.has(oldIdStr)) {
            await deleteAdminQuestion(oldIdStr);
          }
        }

        // Créer ou mettre à jour les questions actuelles
        for (const q of questions) {
          const payload = {
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            order: q.order ?? 0,
          };

          if (q.id) {
            await updateAdminQuestion(q.id, payload);
          } else {
            await createAdminQuestion(editingCourse.id, payload);
          }
        }
      } else {
        // Création du cours
        const newCourse = await createCourse({
          ...formData,
          gameType,
        });

        // Création des questions associées
        for (const q of questions) {
          await createAdminQuestion(newCourse.id, {
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            order: q.order ?? 0,
          });
        }
      }
      await loadData();
      setShowModal(false);
      resetCourseForm();
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
      theoreticalContent: course.theoreticalContent || '',
      xpReward: course.xpReward,
    });

    // Charger les questions du cours
    getAdminCourseQuestions(course.id)
      .then((qs) => {
        const sorted = (qs || []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        setQuestions(sorted);
        setInitialQuestionIds(sorted.map((q: any) => q.id));
      })
      .catch((err) => {
        console.error('Error loading questions:', err);
        setQuestions([]);
      })
      .finally(() => {
        setShowModal(true);
      });
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

  const openNewCourseModal = () => {
    resetCourseForm();
    setShowModal(true);
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      question: '',
      type: 'multiple_choice',
      options: '[]',
      correctAnswer: '',
      order: questions.length,
    });
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: AdminQuestion) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = (question: any) => {
    if (question.id) {
      setQuestions(prev => prev.map(q => (q.id === question.id ? question : q)));
    } else {
      setQuestions(prev => [...prev, { ...question, order: prev.length }]);
    }
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  const handleCancelQuestion = () => {
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestionLocal = (id?: string) => {
    if (!id) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
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
          onClick={openNewCourseModal}
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
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
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
              {/* Questions du cours */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Questions du cours</h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                  >
                    + Ajouter une question
                  </button>
                </div>
                {questions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Aucune question pour l’instant. Ajoutez au moins une question (QCM, Memory ou Match).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {questions
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((q, index) => (
                      <div
                        key={q.id || `local-${index}`}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {q.question}
                          </p>
                          <p className="text-xs text-gray-500">
                            Type:{' '}
                            {q.type === 'multiple_choice'
                              ? 'QCM'
                              : q.type === 'memory_pair'
                              ? 'Memory'
                              : 'Match'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestionLocal(q.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    resetCourseForm();
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
      {/* Modal d’édition de question */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingQuestion?.id ? 'Modifier la question' : 'Nouvelle question'}
            </h2>
            <QuestionEditor
              question={editingQuestion}
              onSave={handleSaveQuestion}
              onCancel={handleCancelQuestion}
            />
          </div>
        </div>
      )}
    </div>
    </>
  );
}

