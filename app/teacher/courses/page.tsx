'use client';

import { useEffect, useState } from 'react';
import { 
  apiRequest,
  createTeacherCourse,
  updateTeacherCourse,
  getAdminMatieres,
  getAdminCourseQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  uploadSlide,
  analyzeSlideWithAI,
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

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const { showError, showSuccess, showConfirm, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    matiereId: '',
    theoreticalContent: '',
    xpReward: 50,
  });
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [initialQuestionIds, setInitialQuestionIds] = useState<string[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [uploadedSlide, setUploadedSlide] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [slideFile, setSlideFile] = useState<File | null>(null);
  const [creationMode, setCreationMode] = useState<'upload' | 'manual' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, matieresData] = await Promise.all([
        apiRequest<any[]>('/api/teacher/courses'),
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
    setUploadedSlide(null);
    setSlideFile(null);
    setCreationMode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For upload mode, require slide
      if (creationMode === 'upload' && !uploadedSlide) {
        showError('Veuillez uploader un slide pour ce mode de création.');
        return;
      }
      
      if (questions.length === 0) {
        showError('Veuillez ajouter au moins une question pour ce cours.');
        return;
      }

      const questionTypes = Array.from(new Set(questions.map(q => q.type)));
      if (questionTypes.length !== 1) {
        showError("Toutes les questions d'un cours doivent être du même type (QCM, Memory ou Match).");
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
        const updatedCourse = await updateTeacherCourse(editingCourse.id, {
          ...formData,
          gameType,
          slideFile: uploadedSlide?.file?.filename || undefined,
        });

        const existingIds = new Set(initialQuestionIds);
        const currentIds = new Set(
          questions.filter(q => q.id).map(q => q.id as string)
        );

        for (const oldId of existingIds) {
          const oldIdStr = oldId as string;
          if (!currentIds.has(oldIdStr)) {
            await deleteAdminQuestion(oldIdStr);
          }
        }

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
        const newCourse = await createTeacherCourse({
          ...formData,
          gameType,
          slideFile: uploadedSlide?.file?.filename || undefined,
        });

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
    
    if (course.slideFile) {
      setUploadedSlide({ file: { filename: course.slideFile } });
    }

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

  const openNewCourseModal = () => {
    resetCourseForm();
    setShowModal(true);
    setCreationMode(null); // Reset mode selection
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

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showError('Type de fichier non supporté. Formats acceptés: PDF, PPT, PPTX, PNG, JPEG');
      return;
    }

    // Validate file size (max 5MB to avoid memory issues)
    if (file.size > 5 * 1024 * 1024) {
      showError('Fichier trop volumineux. Taille maximum: 5MB');
      return;
    }

    setSlideFile(file);
    setIsAnalyzing(true);
    
    try {
      // Upload the file
      const result = await uploadSlide(file);
      setUploadedSlide(result);
      
      // Auto-extract title from filename if title is empty
      if (!formData.titre && file.name) {
        const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, titre: filenameWithoutExt }));
      }
      
      // Automatically analyze the slide
      await handleAnalyzeSlideAuto(result.file, file.name);
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'upload du slide');
      setSlideFile(null);
      setUploadedSlide(null); // Bug 5 fix: Reset uploadedSlide on error
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSlideAuto = async (slideData: any, filename?: string) => {
    if (!slideData || !slideData.base64) {
      showError('Données du slide invalides');
      setIsAnalyzing(false);
      return;
    }

    const courseTitle = formData.titre || filename?.replace(/\.[^/.]+$/, '') || 'Cours';
    const courseDescription = formData.description || `Cours basé sur ${filename || 'le slide'}`;

    try {
      const result = await analyzeSlideWithAI({
        slideData,
        courseTitle,
        courseDescription,
        numberOfQuestions: 5,
      });

      // Update description if generated
      if (result.description && !formData.description) {
        setFormData(prev => ({ ...prev, description: result.description }));
      }
      
      // Update theoretical content if generated
      if (result.theoreticalContent) {
        setFormData(prev => ({ ...prev, theoreticalContent: result.theoreticalContent }));
      }
      
      if (result.questions && result.questions.length > 0) {
        // Convert AI-generated questions to the format expected by the UI
        // Keep the type from AI (multiple_choice, memory_pair, match_pair)
        const formattedQuestions: AdminQuestion[] = result.questions.map((q: any, index: number) => ({
          question: q.question,
          type: q.type || 'multiple_choice', // Use the type from AI
          options: q.options,
          correctAnswer: q.correctAnswer,
          order: index,
        }));

        // Set questions (replace if empty, add if not)
        setQuestions(formattedQuestions);
        
        // Update form data if empty
        if (!formData.titre) {
          setFormData(prev => ({ ...prev, titre: courseTitle }));
        }
        if (!formData.description) {
          setFormData(prev => ({ ...prev, description: courseDescription }));
        }
        
        const questionTypes = formattedQuestions.map(q => {
          if (q.type === 'multiple_choice') return 'QCM';
          if (q.type === 'memory_pair') return 'Memory';
          if (q.type === 'match_pair') return 'Match';
          return 'QCM';
        }).join(', ');
        
        showSuccess(`✅ ${result.message}. Types: ${questionTypes}. Contenu théorique généré.`);
      } else {
        showError('Aucune question générée. Veuillez réessayer ou créer les questions manuellement.');
      }
    } catch (error: any) {
      console.error('Analyze error:', error);
      showError(error.message || 'Erreur lors de l\'analyse du slide. Vous pouvez créer les questions manuellement.');
    } finally {
      setIsAnalyzing(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <PopupComponent />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">📚 Mes Cours</h1>
            <p className="text-textMuted">Créez et gérez vos cours</p>
          </div>
          <button
            onClick={openNewCourseModal}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
          >
            + Nouveau Cours
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.length === 0 ? (
            <div className="col-span-full text-center py-12 text-textMuted">
              Aucun cours créé
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="bg-surface rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold text-text mb-2">{course.titre}</h2>
                <p className="text-textMuted mb-4 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-yellow-600 font-semibold">🍌 +{course.xpReward} bananes</span>
                    {course.matiere && (
                      <span className="text-xs text-textMuted">Matière: {course.matiere.nom}</span>
                    )}
                    <span className="text-xs text-textMuted">Type: {course.gameType === 'quiz' ? 'Quiz' : course.gameType === 'memory' ? 'Memory' : 'Match'}</span>
                  </div>
                  <button
                    onClick={() => handleEdit(course)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm min-h-[44px]"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
              // Close modal when clicking on the backdrop (but not on the modal content)
              if (e.target === e.currentTarget && !isAnalyzing) {
                setShowModal(false);
                resetCourseForm();
              }
            }}
          >
            <div 
              className="bg-surface rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetCourseForm();
                }}
                className="absolute top-4 right-4 text-textMuted hover:text-text transition p-2 hover:bg-hover rounded-full"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-4 text-text pr-8">
                {editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
              </h2>
              
              {!editingCourse && creationMode === null && !isAnalyzing && (
                <div className="mb-6 p-4 bg-hover rounded-lg">
                  <p className="text-text font-medium mb-4">Comment souhaitez-vous créer ce cours ?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          setCreationMode('upload');
                          if (e.target.files?.[0]) {
                            handleSlideUpload(e);
                          }
                        }}
                        className="hidden"
                        id="slide-upload-input"
                      />
                      <div className="p-4 border-2 border-primary rounded-lg hover:bg-primary/10 transition text-left">
                        <div className="text-2xl mb-2">📄</div>
                        <div className="font-semibold text-text">Uploader un slide</div>
                        <div className="text-sm text-textMuted mt-1">L'IA analysera automatiquement et créera les questions</div>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreationMode('manual')}
                      className="p-4 border-2 border-border rounded-lg hover:bg-hover transition text-left"
                    >
                      <div className="text-2xl mb-2">✏️</div>
                      <div className="font-semibold text-text">Création manuelle</div>
                      <div className="text-sm text-textMuted mt-1">Créez le cours et les questions vous-même</div>
                    </button>
                  </div>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text mb-1">Analyse en cours...</h3>
                      <p className="text-sm text-textMuted">
                        L'IA analyse votre slide et génère automatiquement les questions. Cela peut prendre quelques secondes.
                      </p>
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(creationMode !== null || editingCourse) && (
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition text-text bg-surface min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition text-text bg-surface min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Matière
                  </label>
                  <select
                    value={formData.matiereId}
                    onChange={(e) => setFormData({ ...formData, matiereId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition text-text bg-surface min-h-[44px]"
                  >
                    <option value="">Aucune matière</option>
                    {matieres.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {creationMode === 'upload' && !isAnalyzing && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Slide du cours *
                    </label>
                    <div className="space-y-2">
                      <label className="block">
                        <input
                          type="file"
                          accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
                          onChange={handleSlideUpload}
                          className="hidden"
                          id="slide-file-input"
                        />
                        <div className="w-full px-4 py-3 border-2 border-dashed border-primary rounded-lg hover:bg-primary/5 transition cursor-pointer text-center">
                          <span className="text-primary font-medium">📄 Cliquez pour changer de fichier</span>
                          <p className="text-xs text-textMuted mt-1">
                            {uploadedSlide ? (uploadedSlide.file?.filename || slideFile?.name) : 'Aucun fichier sélectionné'}
                          </p>
                        </div>
                      </label>
                      {uploadedSlide && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✅ Slide analysé: {uploadedSlide.file?.filename || slideFile?.name}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {questions.length} question(s) générée(s). Vous pouvez les modifier ci-dessous.
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-textMuted mt-1">
                      Formats acceptés: PDF, PPT, PPTX, PNG, JPEG (max 5MB). L'analyse est automatique.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Contenu théorique (optionnel)
                  </label>
                  <RichTextEditor
                    value={formData.theoreticalContent}
                    onChange={(content) => setFormData({ ...formData, theoreticalContent: content })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Récompense en bananes 🍌
                  </label>
                  <input
                    type="number"
                    value={formData.xpReward}
                    onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 50 })}
                    min={1}
                    className="w-full px-4 py-2 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition text-text bg-surface min-h-[44px]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-text">
                      Questions *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm min-h-[44px]"
                    >
                      + Ajouter une question
                    </button>
                  </div>
                  {questions.length === 0 ? (
                    <p className="text-textMuted text-sm">Aucune question ajoutée</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((q, idx) => (
                        <div key={q.id || idx} className="flex items-center justify-between p-3 bg-hover rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text">
                              {idx + 1}. {q.question.substring(0, 50)}...
                            </p>
                            <p className="text-xs text-textMuted">
                              Type: {q.type === 'multiple_choice' ? 'QCM' : q.type === 'memory_pair' ? 'Memory' : 'Match'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditQuestion(q)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-xs min-h-[32px]"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionLocal(q.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-xs min-h-[32px]"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isAnalyzing || (creationMode === 'upload' && !uploadedSlide)}
                    className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition font-bold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingCourse ? 'Enregistrer' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetCourseForm();
                    }}
                    disabled={isAnalyzing}
                    className="flex-1 bg-border text-text py-3 rounded-lg hover:bg-hover transition font-bold min-h-[44px] disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}

        {showQuestionModal && editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
            <div className="bg-surface rounded-lg shadow-lift p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-text">
                {editingQuestion.id ? 'Modifier la question' : 'Nouvelle question'}
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
