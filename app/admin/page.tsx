'use client';

import { useEffect, useState } from 'react';
import { getKPI, getCourses, createCourse, updateCourse, deleteCourse, createSession, getSessions, stopSession, startSessionQuiz } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePopup } from '@/hooks/usePopup';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<any>({ totalStudents: 0, totalXp: 0, activeCourses: 0, badgesUnlocked: 0 });
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess, PopupComponent } = usePopup();
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [courseFormData, setCourseFormData] = useState({
    titre: '',
    description: '',
    xpReward: 50,
  });
  const [selectedCourseId, setSelectedCourseId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Refresh session status every 3 seconds if there's an active session
  useEffect(() => {
    if (!activeSession) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  const loadData = async () => {
    // Set loading to false after a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Loading timeout - showing page with default values');
      setLoading(false);
    }, 5000); // 5 second timeout

    try {
      // Load KPI first (most important)
      const kpiData = await Promise.race([
        getKPI(),
        new Promise<{ totalStudents: number; totalXp: number; activeCourses: number; badgesUnlocked: number }>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]).catch(err => {
        console.error('Error loading KPI:', err);
        return { totalStudents: 0, totalXp: 0, activeCourses: 0, badgesUnlocked: 0 };
      });
      
      clearTimeout(timeoutId);
      setKpi(kpiData);
      setLoading(false); // Show page with KPI first
      
      // Load courses and sessions in parallel (less critical)
      const [coursesData, sessionsData] = await Promise.all([
        getCourses().catch(err => {
          console.error('Error loading courses:', err);
          return [];
        }),
        getSessions().catch(err => {
          console.error('Error loading sessions:', err);
          return [];
        }),
      ]);
      setCourses(coursesData || []);
      setSessions(sessionsData || []);
      const active = (sessionsData || []).find((s: any) => s.isActive);
      setActiveSession(active);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error loading data:', error);
      setLoading(false);
      // Keep default values that were set in useState
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseFormData);
      } else {
        await createCourse(courseFormData);
      }
      await loadData();
      setShowCourseModal(false);
      setEditingCourse(null);
      setCourseFormData({ titre: '', description: '', xpReward: 50 });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCreateSession = async () => {
    if (!selectedCourseId) {
      showError('Veuillez sélectionner un cours');
      return;
    }
    try {
      await createSession(selectedCourseId);
      await loadData();
      setShowSessionModal(false);
      setSelectedCourseId('');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création de la session');
    }
  };

  const handleStartQuiz = async (sessionId: string) => {
    try {
      await startSessionQuiz(sessionId);
      await loadData();
      showSuccess('Quiz lancé ! Les étudiants peuvent maintenant répondre.');
    } catch (error: any) {
      showError(error.message || 'Erreur lors du lancement du quiz');
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await stopSession(sessionId);
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'arrêt de la session');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }


  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">⚙️ Dashboard Admin</h1>
          <p className="text-sm sm:text-base text-gray-600">Gérez les cours, sessions et consultez les statistiques</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingCourse(null);
              setCourseFormData({ titre: '', description: '', xpReward: 50 });
              setShowCourseModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
          >
            + Nouveau Cours
          </button>
          <button
            onClick={() => setShowSessionModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          >
            📱 Nouvelle Session
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Étudiants</p>
              <p className="text-3xl font-bold text-gray-900">
                {kpi ? kpi.totalStudents : <span className="text-gray-400">...</span>}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Bananes Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {kpi ? kpi.totalXp.toLocaleString() : <span className="text-gray-400">...</span>}
              </p>
            </div>
            <div className="text-4xl">🍌</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cours Actifs</p>
              <p className="text-3xl font-bold text-gray-900">
                {kpi ? kpi.activeCourses : <span className="text-gray-400">...</span>}
              </p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Badges Débloqués</p>
              <p className="text-3xl font-bold text-gray-900">
                {kpi ? kpi.badgesUnlocked : <span className="text-gray-400">...</span>}
              </p>
            </div>
            <div className="text-4xl">🎖️</div>
          </div>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">📱 Session Active</h2>
              <p className="text-sm sm:text-base text-gray-700">
                <strong>Cours:</strong> {activeSession.course?.titre}
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                <strong>Code:</strong> <code className="bg-white px-2 py-1 rounded">{activeSession.code}</code>
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                Créée le {new Date(activeSession.createdAt).toLocaleString('fr-FR')}
              </p>
              {activeSession.status === 'waiting' && (
                <p className="text-sm text-orange-700 mt-2 font-semibold">
                  ⏳ En attente du lancement du quiz par l'admin...
                </p>
              )}
              {activeSession.status === 'started' && (
                <p className="text-sm text-green-700 mt-2 font-semibold">
                  ✅ Quiz en cours ! Les étudiants peuvent répondre.
                </p>
              )}
              {activeSession.status === 'finished' && (
                <p className="text-sm text-gray-700 mt-2 font-semibold">
                  Session terminée.
                </p>
              )}
            </div>
            <div className="text-center w-full sm:w-auto">
              <div className="bg-white p-3 sm:p-4 rounded-lg mb-3 inline-block">
                <QRCodeSVG 
                  value={activeSession.code}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
                <p className="text-xs text-gray-600 mt-2">Code: {activeSession.code}</p>
              </div>
              <div className="flex flex-col gap-2">
                {activeSession.status === 'waiting' && (
                  <button
                    onClick={() => handleStartQuiz(activeSession.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    🚀 Lancer le Quiz
                  </button>
                )}
                {activeSession.status !== 'finished' && (
                  <button
                    onClick={() => handleStopSession(activeSession.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Arrêter la Session
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses List */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Cours</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.titre}</h3>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-600 font-semibold">🍌 +{course.xpReward} bananes</span>
                <button
                  onClick={() => {
                    setEditingCourse(course);
                    setCourseFormData({
                      titre: course.titre,
                      description: course.description,
                      xpReward: course.xpReward,
                    });
                    setShowCourseModal(true);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm"
                >
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
            </h2>
            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={courseFormData.titre}
                  onChange={(e) => setCourseFormData({ ...courseFormData, titre: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Récompense Bananes</label>
                <input
                  type="number"
                  value={courseFormData.xpReward}
                  onChange={(e) => setCourseFormData({ ...courseFormData, xpReward: parseInt(e.target.value) })}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingCourse ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCourseModal(false);
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

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">📱 Nouvelle Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choisir la matière</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un cours</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.titre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateSession}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Créer Session
                </button>
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedCourseId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

