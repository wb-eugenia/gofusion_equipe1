'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function TeacherCourseStatsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadStats();
    }
  }, [courseId]);

  const loadStats = async () => {
    try {
      const data = await apiRequest<any>(`/api/teacher/courses/${courseId}/stats`);
      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Chargement...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-textMuted">Cours non trouvé</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text mb-2">📊 Statistiques du cours</h1>
        <h2 className="text-xl text-textMuted">{stats.course.titre}</h2>
      </div>

      <div className="bg-surface rounded-lg shadow-card p-6 mb-6">
        <h3 className="text-xl font-semibold text-text mb-4">Résumé</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background rounded-lg p-4">
            <p className="text-textMuted text-sm">Complétions totales</p>
            <p className="text-2xl font-bold text-text">{stats.totalCompletions}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow-card p-6">
        <h3 className="text-xl font-semibold text-text mb-4">Élèves ayant complété</h3>
        {stats.completions.length === 0 ? (
          <p className="text-textMuted">Aucun élève n'a encore complété ce cours</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Élève</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Date de complétion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.completions.map((completion: any) => (
                  <tr key={completion.id}>
                    <td className="px-4 py-3 text-text">{completion.user?.prenom || 'Inconnu'}</td>
                    <td className="px-4 py-3 text-textMuted">
                      {new Date(completion.completedAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

