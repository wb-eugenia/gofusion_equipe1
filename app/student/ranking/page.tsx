'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRanking } from '@/lib/api';

export default function RankingPage() {
  const [ranking, setRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const data = await getRanking();
      setRanking(data);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    router.push(`/student/profile/view?userId=${userId}`);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement du classement...</div>;
  }

  if (!ranking) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  const getMedal = (position: number) => {
    return `${position}.`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Classement</h1>
        <p className="text-gray-600">Top 10 des étudiants</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="divide-y divide-gray-200">
          {ranking.top10.map((student: any, index: number) => (
            <div
              key={student.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
              onClick={() => handleProfileClick(student.id)}
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-gray-400 w-8">
                  {getMedal(index + 1)}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 hover:text-blue-600 transition">
                    {student.prenom}
                  </p>
                  <p className="text-sm text-gray-500">
                    {student.streakDays > 0 && `🔥 ${student.streakDays} jours de streak`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-yellow-600">🍌 {student.xp} bananes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ranking.userPosition > 10 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Votre position</p>
              <p className="text-sm text-gray-600">Rang #{ranking.userPosition}</p>
            </div>
            <p className="text-xl font-bold text-yellow-600">🍌 {ranking.userXp} bananes</p>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        Cliquez sur un nom pour voir son profil
      </div>
    </div>
  );
}

