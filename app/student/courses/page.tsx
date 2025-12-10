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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement des cours...</p>
        </div>
      </div>
    );
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
        <h1 className="text-2xl sm:text-3xl font-black text-text mb-2">Mes Cours</h1>
        <p className="text-textMuted">
          Complétez les cours pour gagner des 🍌 bananes et débloquer des badges !
        </p>
      </div>

      {!selectedMatiere ? (
        // Vue 1: Sélection de matière
        <>
          {matieres.length === 0 ? (
            <div className="bg-surface rounded-lg shadow-card p-8 text-center">
              <p className="text-textMuted">Aucune matière disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matieres.map((matiere) => {
                const coursesCount = courses.filter((c) => c.matiereId === matiere.id).length;
                const name = matiere.nom.toLowerCase();
                const isFrancais = name.includes('français') || name.includes('francais');
                const isSciences = name.includes('science');
                const isMaths = name.includes('math') || name.includes('maths') || name.includes('mathématiques') || name.includes('mathematiques');
                const isHistoire = name.includes('histoire');
                const isGeographie = name.includes('géographie') || name.includes('geographie');
                return (
                  <div
                    key={matiere.id}
                    onClick={() => setSelectedMatiere(matiere)}
                    className="bg-surface rounded-2xl shadow-card p-4 sm:p-6 hover:shadow-lift hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer relative touch-manipulation min-h-[120px] sm:min-h-[140px]"
                  >
                    {isFrancais && (
                      <img 
                        src="/singes/singe-livre.png" 
                        alt="Singe" 
                        className="absolute -top-4 -right-4 w-20 h-20 object-contain"
                      />
                    )}
                    {isSciences && (
                      <img 
                        src="/singes/gemini_generated_image_kwoz9ckwoz9ckwoz-removebg-preview_480.png" 
                        alt="Singe" 
                        className="absolute -top-4 -right-4 w-20 h-20 object-contain"
                      />
                    )}
                    {isHistoire && (
                      <img 
                        src="/singes/singe-histoire.png" 
                        alt="Singe" 
                        className="absolute -top-4 -right-4 w-20 h-20 object-contain"
                      />
                    )}
                    {isGeographie && (
                      <img 
                        src="/singes/singe-geographie.png" 
                        alt="Singe" 
                        className="absolute -top-4 -right-4 w-20 h-20 object-contain"
                      />
                    )}
                    {isMaths && (
                      <img 
                        src="/singes/singe-maths.png" 
                        alt="Singe" 
                        className="absolute -top-4 -right-4 w-20 h-20 object-contain"
                      />
                    )}
                    <h2 className="text-lg sm:text-xl font-extrabold text-text mb-2">
                      {matiere.nom}
                    </h2>
                    {matiere.description && (
                      <p className="text-textMuted mb-4">{matiere.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-semibold">
                        {coursesCount} {coursesCount === 1 ? 'cours' : 'cours'}
                      </span>
                      <span className="text-inactive">→</span>
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
              className="mb-4 flex items-center text-primary hover:text-primary/80 transition min-h-[44px] font-bold"
            >
              <span className="mr-2">←</span>
              Retour aux matières
            </button>
            <h2 className="text-xl sm:text-2xl font-extrabold font-inter text-text mb-2">
              {selectedMatiere.nom}
            </h2>
            {selectedMatiere.description && (
              <p className="text-textMuted">{selectedMatiere.description}</p>
            )}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-surface rounded-lg shadow-card p-8 text-center">
              <p className="text-textMuted">Aucun cours disponible pour cette matière.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200"
                >
                  <h2 className="text-lg sm:text-xl font-extrabold text-text mb-2">
                    {course.titre}
                  </h2>
                  <p className="text-textMuted mb-4">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-semibold">
                      🍌 +{course.xpReward} bananes
                    </span>
                    {course.completed ? (
                      <span className="px-4 py-2 bg-success/10 text-success rounded-2xl text-sm font-bold">
                        ✓ Complété
                      </span>
                    ) : (
                      <button
                        onClick={() => router.push(`/student/courses/quiz?id=${course.id}`)}
                        className="px-5 py-2.5 bg-primary text-white rounded-2xl hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-bold text-sm sm:text-base min-h-[48px] sm:min-h-[52px] touch-manipulation"
                        style={{ boxShadow: '0 4px 0 0 rgba(157, 95, 47, 1)', borderBottom: '4px solid rgba(157, 95, 47, 1)' }}
                      >
                        {course.gameType === 'memory'
                          ? 'Jouer au memory'
                          : course.gameType === 'match'
                          ? 'Relier les mots'
                          : 'Commencer'}
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

