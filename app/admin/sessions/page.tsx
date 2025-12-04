'use client';

import { useEffect, useState } from 'react';
import { getAdminMatieres, apiRequest } from '@/lib/api';

async function getFixedSessions() {
  return apiRequest<any[]>('/api/admin/sessions/fixed');
}

async function createFixedSession(data: any) {
  return apiRequest<any>('/api/admin/sessions/fixed', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
    scheduledAt: '',
    recurrenceType: '' as 'daily' | 'weekly' | '',
    recurrenceDay: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, coursesData] = await Promise.all([
        getFixedSessions(),
        apiRequest<any[]>('/api/admin/courses'),
      ]);
      setSessions(sessionsData as any[]);
      setCourses(coursesData as any[]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        courseId: formData.courseId,
      };
      
      if (formData.recurrenceType) {
        data.recurrenceType = formData.recurrenceType;
        if (formData.recurrenceType === 'weekly') {
          data.recurrenceDay = formData.recurrenceDay;
        }
      } else if (formData.scheduledAt) {
        data.scheduledAt = formData.scheduledAt;
      }
      
      await createFixedSession(data);
      await loadData();
      setShowModal(false);
      setFormData({ courseId: '', scheduledAt: '', recurrenceType: '', recurrenceDay: 0 });
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Sessions Fixes</h1>
          <p className="text-gray-600">Gérez les sessions programmées et récurrentes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          + Nouvelle Session Fixe
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Créer une session fixe</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cours *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">Sélectionner un cours</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.titre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de session
                </label>
                <select
                  value={formData.recurrenceType}
                  onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any, scheduledAt: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">Session unique programmée</option>
                  <option value="daily">Récurrente - Quotidienne</option>
                  <option value="weekly">Récurrente - Hebdomadaire</option>
                </select>
              </div>

              {!formData.recurrenceType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date et heure programmée
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {formData.recurrenceType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jour de la semaine
                  </label>
                  <select
                    value={formData.recurrenceDay}
                    onChange={(e) => setFormData({ ...formData, recurrenceDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="0">Dimanche</option>
                    <option value="1">Lundi</option>
                    <option value="2">Mardi</option>
                    <option value="3">Mercredi</option>
                    <option value="4">Jeudi</option>
                    <option value="5">Vendredi</option>
                    <option value="6">Samedi</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ courseId: '', scheduledAt: '', recurrenceType: '', recurrenceDay: 0 });
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

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Aucune session fixe</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {session.course?.titre}
                  </h3>
                  <p className="text-gray-600">
                    <strong>Code:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{session.code}</code>
                  </p>
                  {session.scheduledAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      Programmée le: {new Date(session.scheduledAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                  {session.recurrenceType === 'daily' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Récurrence: Quotidienne
                    </p>
                  )}
                  {session.recurrenceType === 'weekly' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Récurrence: Hebdomadaire (Jour {session.recurrenceDay === 0 ? 'Dimanche' : session.recurrenceDay === 1 ? 'Lundi' : session.recurrenceDay === 2 ? 'Mardi' : session.recurrenceDay === 3 ? 'Mercredi' : session.recurrenceDay === 4 ? 'Jeudi' : session.recurrenceDay === 5 ? 'Vendredi' : 'Samedi'})
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded text-sm ${
                    session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

