'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCourse, completeCourse } from '@/lib/api';

export default function CourseQuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams?.get('id') || '';
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    } else {
      router.push('/student/courses');
    }
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const courseData = await getCourse(courseId);
      setCourse(courseData);
    } catch (error) {
      console.error('Error loading course:', error);
      alert('Erreur lors du chargement du cours');
      router.push('/student/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (currentQuestionIndex < (course?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!course) return;
    
    setSubmitting(true);
    
    // Calculate score
    let correct = 0;
    course.questions.forEach((q: any) => {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        correct++;
      }
    });
    
    const calculatedScore = Math.round((correct / course.questions.length) * 100);
    setScore(calculatedScore);
    setShowResults(true);
    
    // Complete course if score >= 50%
    if (calculatedScore >= 50) {
      try {
        const result = await completeCourse(courseId);
        setTimeout(() => {
          alert(`🎉 Cours complété ! Score: ${calculatedScore}% (+${result.xpGained} 🍌 bananes)`);
          router.push('/student/courses');
        }, 1000);
      } catch (error: any) {
        console.error('Error completing course:', error);
      }
    }
    
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement du cours...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Cours introuvable</div>
      </div>
    );
  }

  const currentQuestion = course.questions?.[currentQuestionIndex];
  const totalQuestions = course.questions?.length || 0;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  if (showResults) {
    const correctAnswers = course.questions.filter((q: any) => answers[q.id] === q.correctAnswer).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">🎯 Résultats</h1>
            <div className="text-6xl font-bold text-blue-600 mb-4">{score}%</div>
            <p className="text-xl text-gray-700 mb-6">
              {correctAnswers} / {totalQuestions} bonnes réponses
            </p>
            {score >= 50 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-semibold">
                  ✅ Félicitations ! Vous avez réussi le cours !
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-semibold">
                  ❌ Score insuffisant. Il faut au moins 50% pour valider le cours.
                </p>
              </div>
            )}
            <button
              onClick={() => router.push('/student/courses')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  // Parse options for quiz questions
  let options: string[] = [];
  if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
    try {
      options = JSON.parse(currentQuestion.options);
    } catch (e) {
      options = [];
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {course.titre}
            </h1>
            {course.matiere && (
              <p className="text-gray-600">Matière: {course.matiere.nom}</p>
            )}
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} / {totalQuestions}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>

            {/* Options for multiple choice */}
            {currentQuestion.type === 'multiple_choice' && options.length > 0 && (
              <div className="space-y-3">
                {options.map((option, index) => {
                  const questionId = currentQuestion.id;
                  const isSelected = answers[questionId] === index.toString();
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(questionId, index.toString())}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-medium text-gray-900">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Memory or Match games - simplified display */}
            {(currentQuestion.type === 'memory_pair' || currentQuestion.type === 'match_pair') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  ⚠️ Ce type de jeu nécessite une interface spéciale. Pour l'instant, répondez directement.
                </p>
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholder="Votre réponse"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestionIndex === totalQuestions - 1 ? 'Terminer' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

