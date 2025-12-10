'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function SessionParticipantsClient() {
  const params = useParams();
  const sessionId = (params?.id as string) || '';
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadParticipants();
    }
  }, [sessionId]);

  const loadParticipants = async () => {
    try {
      const data = await apiRequest<any[]>(`/api/teacher/sessions/${sessionId}/participants`);
      setParticipants(data);
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
        <p className="text-textMuted">{participants.length} participant(s)</p>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12 text-textMuted">
          Aucun participant pour le moment
        </div>
      ) : (
        <div className="bg-surface rounded-lg shadow-card p-6">
          <div className="space-y-2">
            {participants.map((participant: any) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-hover rounded-lg">
                <div>
                  <p className="font-medium text-text">{participant.user?.prenom || 'Utilisateur inconnu'}</p>
                  <p className="text-sm text-textMuted">
                    Rejoint le {new Date(participant.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-green-600 font-semibold">✓ Présent</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

