'use client';

import { useEffect, useState } from 'react';
import { getUser, getCourses } from '@/lib/api';
import BadgeCard from '@/components/BadgeCard';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, coursesData] = await Promise.all([
        getUser(),
        getCourses(),
      ]);
      setUser(userData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  const completedCourses = courses.filter((c) => c.completed).length;
  const totalCourses = courses.length;
  const progressPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 Mon Profil</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bananes Total</span>
              <span className="text-2xl font-bold text-yellow-600">🍌 {user.xp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Streak</span>
              <span className="text-xl font-semibold text-orange-600">
                🔥 {user.streakDays} jours
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cours complétés</span>
              <span className="text-xl font-semibold text-green-600">
                {completedCourses} / {totalCourses}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progression</span>
                <span className="text-gray-600">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Badges Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Badges débloqués ({user.badges?.length || 0})
          </h2>
          {user.badges && user.badges.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {user.badges.map((badge: any) => (
                <BadgeCard key={badge.id} badge={badge} unlocked={true} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucun badge débloqué pour le moment
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

