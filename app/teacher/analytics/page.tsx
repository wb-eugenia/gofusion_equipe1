'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function TeacherAnalyticsPage() {
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get recent sessions
      const sessions = await apiRequest<any[]>('/api/teacher/sessions');
      const recent = sessions.slice(0, 10);
      
      // Get participants for each session
      const sessionsWithStats = await Promise.all(
        recent.map(async (session) => {
          try {
            const participants = await apiRequest<{ participants: any[] }>(
              `/api/teacher/sessions/${session.id}/participants`
            );
            const scores = participants.participants.map(p => {
              const total = p.score.total;
              const correct = p.score.correct;
              return total > 0 ? (correct / total) * 100 : 0;
            });
            const avgScore = scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0;
            
            return {
              ...session,
              participantCount: participants.participants.length,
              avgScore,
            };
          } catch {
            return {
              ...session,
              participantCount: 0,
              avgScore: 0,
            };
          }
        })
      );
      
      setRecentSessions(sessionsWithStats);
      
      // Get all courses and their completions
      const courses = await apiRequest<any[]>('/api/teacher/courses');
      const progressData = await Promise.all(
        courses.map(async (course) => {
          try {
            const stats = await apiRequest<any>(`/api/teacher/courses/${course.id}/stats`);
            return {
              course: course.titre,
              completions: stats.completions.map((c: any) => ({
                student: c.user?.prenom || 'Inconnu',
                completedAt: c.completedAt,
              })),
            };
          } catch {
            return {
              course: course.titre,
              completions: [],
            };
          }
        })
      );
      
      // Group by student
      const studentMap = new Map<string, any>();
      progressData.forEach((data) => {
        data.completions.forEach((completion: any) => {
          const studentName = completion.student;
          if (!studentMap.has(studentName)) {
            studentMap.set(studentName, {
              student: studentName,
              courses: [],
            });
          }
          studentMap.get(studentName)!.courses.push(data.course);
        });
      });
      
      setStudentsProgress(Array.from(studentMap.values()));
    } catch (error: any) {
      console.error('Error loading analytics:', error);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">📊 Analytics</h1>
        <p className="text-textMuted">Statistiques et analyses de vos cours et sessions</p>
      </div>

      {/* Recent Sessions */}
      <div className="bg-surface rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Dernières Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-textMuted">Aucune session récente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Cours</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Participants</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Score moyen</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-3 text-text">{session.course?.titre || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <code className="bg-border px-2 py-1 rounded text-sm">{session.code}</code>
                    </td>
                    <td className="px-4 py-3 text-text">{session.participantCount}</td>
                    <td className="px-4 py-3 text-text">{session.avgScore}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                        session.status === 'started' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status === 'waiting' ? 'En attente' :
                         session.status === 'started' ? 'En cours' :
                         'Terminée'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Students Progress */}
      <div className="bg-surface rounded-lg shadow-card p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Cours complétés par élève</h2>
        {studentsProgress.length === 0 ? (
          <p className="text-textMuted">Aucune donnée disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Élève</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Cours complétés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentsProgress.map((progress, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-text font-medium">{progress.student}</td>
                    <td className="px-4 py-3 text-text">
                      <div className="flex flex-wrap gap-2">
                        {progress.courses.length === 0 ? (
                          <span className="text-textMuted">Aucun cours complété</span>
                        ) : (
                          progress.courses.map((course: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                              {course}
                            </span>
                          ))
                        )}
                      </div>
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

