'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function TeacherSessionParticipantsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadParticipants();
    }
  }, [sessionId]);

  const loadParticipants = async () => {
    try {
      const data = await apiRequest<{ participants: any[] }>(`/api/teacher/sessions/${sessionId}/participants`);
      setParticipants(data.participants);
    } catch (error: any) {
      console.error('Error loading participants:', error);
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text mb-2">👥 Participants</h1>
      </div>

      <div className="bg-surface rounded-lg shadow-card p-6">
        {participants.length === 0 ? (
          <p className="text-textMuted">Aucun participant pour cette session</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-border/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Élève</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Réponses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-3 text-text">{participant.user?.prenom || 'Inconnu'}</td>
                    <td className="px-4 py-3 text-text">
                      {participant.score.total > 0
                        ? `${Math.round((participant.score.correct / participant.score.total) * 100)}%`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-textMuted">
                      {participant.score.correct} / {participant.score.total}
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

