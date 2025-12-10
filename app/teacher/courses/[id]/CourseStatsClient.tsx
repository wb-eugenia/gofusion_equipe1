'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function CourseStatsClient() {
  const params = useParams();
  const courseId = (params?.id as string) || '';
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
        <div className="text-center py-12 text-textMuted">Aucune statistique disponible</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text mb-2">📊 Statistiques du cours</h1>
        <p className="text-textMuted">{stats.course?.titre}</p>
      </div>

      <div className="bg-surface rounded-lg shadow-card p-6 mb-6">
        <h2 className="text-xl font-semibold text-text mb-4">Complétions</h2>
        <p className="text-2xl font-bold text-primary">{stats.totalCompletions}</p>
      </div>

      {stats.completions && stats.completions.length > 0 && (
        <div className="bg-surface rounded-lg shadow-card p-6">
          <h2 className="text-xl font-semibold text-text mb-4">Étudiants ayant complété</h2>
          <div className="space-y-2">
            {stats.completions.map((completion: any) => (
              <div key={completion.id} className="flex items-center justify-between p-3 bg-hover rounded-lg">
                <div>
                  <p className="font-medium text-text">{completion.user?.prenom || 'Utilisateur inconnu'}</p>
                  <p className="text-sm text-textMuted">
                    Complété le {new Date(completion.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-yellow-600 font-semibold">🍌 +{stats.course?.xpReward || 0} bananes</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

