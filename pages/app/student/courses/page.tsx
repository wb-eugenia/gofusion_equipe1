'use client';

import { useEffect, useState } from 'react';
import { getCourses, completeCourse, getUser } from '@/lib/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, userData] = await Promise.all([
        getCourses(),
        getUser(),
      ]);
      setCourses(coursesData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (courseId: string) => {
    setCompleting(courseId);
    try {
      const result = await completeCourse(courseId);
      await loadData(); // Reload to get updated data
      alert(`🎉 Cours complété ! +${result.xpGained} XP (Total: ${result.totalXp} XP)`);
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement des cours...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Mes Cours</h1>
        <p className="text-gray-600">
          Complétez les cours pour gagner de l'XP et débloquer des badges !
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Aucun cours disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {course.titre}
              </h2>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-semibold">
                  ⭐ +{course.xpReward} XP
                </span>
                {course.completed ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    ✓ Complété
                  </span>
                ) : (
                  <button
                    onClick={() => handleComplete(course.id)}
                    disabled={completing === course.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {completing === course.id ? 'Complétion...' : 'Commencer'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

