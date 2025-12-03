'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, getUser, getMatieres } from '@/lib/api';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatiere, setSelectedMatiere] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, matieresData, userData] = await Promise.all([
        getCourses(),
        getMatieres(),
        getUser(),
      ]);
      setCourses(coursesData);
      setMatieres(matieresData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = selectedMatiere
    ? courses.filter((course) => course.matiereId === selectedMatiere.id)
    : [];

  if (loading) {
    return <div className="text-center py-12">Chargement des cours...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 relative">
      <div className="absolute top-4 right-4 hidden md:block">
        <img 
          src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" 
          alt="Singe" 
          className="w-16 h-16 object-contain"
        />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Cours</h1>
        <p className="text-gray-600">
          Complétez les cours pour gagner des 🍌 bananes et débloquer des badges !
        </p>
      </div>

      {!selectedMatiere ? (
        // Vue 1: Sélection de matière
        <>
          {matieres.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Aucune matière disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matieres.map((matiere) => {
                const coursesCount = courses.filter((c) => c.matiereId === matiere.id).length;
                return (
                  <div
                    key={matiere.id}
                    onClick={() => setSelectedMatiere(matiere)}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {matiere.nom}
                    </h2>
                    {matiere.description && (
                      <p className="text-gray-600 mb-4">{matiere.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 font-semibold">
                        {coursesCount} {coursesCount === 1 ? 'cours' : 'cours'}
                      </span>
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // Vue 2: Cours de la matière sélectionnée
        <>
          <div className="mb-6">
            <button
              onClick={() => setSelectedMatiere(null)}
              className="mb-4 flex items-center text-blue-600 hover:text-blue-700 transition"
            >
              <span className="mr-2">←</span>
              Retour aux matières
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedMatiere.nom}
            </h2>
            {selectedMatiere.description && (
              <p className="text-gray-600">{selectedMatiere.description}</p>
            )}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Aucun cours disponible pour cette matière.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
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
                      🍌 +{course.xpReward} bananes
                    </span>
                    {course.completed ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Complété
                      </span>
                    ) : (
                      <button
                        onClick={() => router.push(`/student/courses/quiz?id=${course.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Commencer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

