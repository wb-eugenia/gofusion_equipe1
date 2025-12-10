'use client';

import { useEffect, useState } from 'react';
import { apiRequest, createTeacherSession } from '@/lib/api';
import Link from 'next/link';
import { usePopup } from '@/hooks/usePopup';

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
  });
  const { showError, PopupComponent } = usePopup();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, coursesData] = await Promise.all([
        apiRequest<any[]>('/api/teacher/sessions'),
        apiRequest<any[]>('/api/teacher/courses'),
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.courseId) {
        showError('Veuillez sélectionner un cours');
        return;
      }
      
      await createTeacherSession({ courseId: formData.courseId });
      
      await loadData();
      setShowModal(false);
      setFormData({ courseId: '' });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const handleStart = async (sessionId: string) => {
    try {
      await apiRequest(`/api/teacher/sessions/${sessionId}/start`, { method: 'PUT' });
      loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors du démarrage');
    }
  };

  const handleStop = async (sessionId: string) => {
    try {
      await apiRequest(`/api/teacher/sessions/${sessionId}/stop`, { method: 'PUT' });
      loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'arrêt');
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
    <div className="p-6 max-w-7xl mx-auto">
      <PopupComponent />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">🎯 Mes Sessions</h1>
          <p className="text-textMuted">Gérez vos sessions de quiz (mode Kahoot)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition min-h-[44px]"
        >
          + Nouvelle Session
        </button>
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-textMuted">
            Aucune session créée
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-surface rounded-lg shadow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text mb-2">
                    {session.course?.titre || 'Cours'}
                  </h2>
                  <p className="text-textMuted mb-2">
                    Code: <code className="bg-border px-2 py-1 rounded font-mono">{session.code}</code>
                  </p>
                  <p className="text-sm text-textMuted">
                    Statut: <span className={`font-semibold ${
                      session.status === 'waiting' ? 'text-yellow-600' :
                      session.status === 'started' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {session.status === 'waiting' ? 'En attente' :
                       session.status === 'started' ? 'En cours' :
                       'Terminée'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {session.status === 'waiting' && (
                    <button
                      onClick={() => handleStart(session.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition min-h-[44px]"
                    >
                      Démarrer
                    </button>
                  )}
                  {session.status === 'started' && (
                    <>
                      <button
                        onClick={() => handleStop(session.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition min-h-[44px]"
                      >
                        Arrêter
                      </button>
                      <Link
                        href={`/teacher/sessions/${session.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] flex items-center"
                      >
                        Voir participants
                      </Link>
                    </>
                  )}
                  {session.status === 'finished' && (
                    <Link
                      href={`/teacher/sessions/${session.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition min-h-[44px] flex items-center"
                    >
                      Voir résultats
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-lift p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-text">Nouvelle Session</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Cours *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-primary focus:outline-none transition text-text bg-surface min-h-[44px]"
                >
                  <option value="">Sélectionnez un cours</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.titre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition font-bold min-h-[44px]"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ courseId: '' });
                  }}
                  className="flex-1 bg-border text-text py-3 rounded-lg hover:bg-hover transition font-bold min-h-[44px]"
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

