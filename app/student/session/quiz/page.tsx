'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSessionByCode, getSessionStatus, getCourse, submitSessionAnswer, getSessionRanking } from '@/lib/api';

export default function SessionQuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionCode = searchParams?.get('code') || '';
  
  const [session, setSession] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [ranking, setRanking] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState('waiting');

  useEffect(() => {
    if (sessionCode) {
      loadSession();
    } else {
      router.push('/student/checkin');
    }
  }, [sessionCode]);

  useEffect(() => {
    if (session?.id) {
      // Poll session status
      const interval = setInterval(async () => {
        try {
          const status = await getSessionStatus(session.id);
          setSessionStatus(status.status);
          
          if (status.status === 'started' && !course) {
            loadCourse();
          }
          
          if (status.status === 'finished' && !showResults) {
            loadRanking();
            setShowResults(true);
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [session?.id, course, showResults]);

  const loadSession = async () => {
    try {
      const sessionData = await getSessionByCode(sessionCode);
      setSession(sessionData);
      setSessionStatus(sessionData.status);
      
      if (sessionData.status === 'started') {
        await loadCourse();
      }
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Erreur lors du chargement de la session');
      router.push('/student/checkin');
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async () => {
    if (!session?.courseId) return;
    try {
      const courseData = await getCourse(session.courseId);
      setCourse(courseData);
    } catch (error) {
      console.error('Error loading course:', error);
    }
  };

  const loadRanking = async () => {
    if (!session?.id) return;
    try {
      const rankingData = await getSessionRanking(session.id);
      setRanking(rankingData);
    } catch (error) {
      console.error('Error loading ranking:', error);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!session?.id || !answers[questionId]) return;
    
    setSubmitting(true);
    try {
      const result = await submitSessionAnswer(session.id, questionId, answers[questionId]);
      
      // Move to next question
      if (currentQuestionIndex < (course?.questions?.length || 0) - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // All questions answered, wait for session to finish
        loadRanking();
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement de la session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Session introuvable</div>
      </div>
    );
  }

  // Waiting for quiz to start
  if (sessionStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            En attente du quiz
          </h1>
          <p className="text-gray-600 mb-6">
            Vous êtes inscrit à la session. L'administrateur va lancer le quiz sous peu.
          </p>
          <p className="text-sm text-gray-500">
            Code: <strong>{session.code}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Show ranking if finished
  if (showResults || sessionStatus === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">🏆 Classement</h1>
            
            {ranking.length === 0 ? (
              <p className="text-center text-gray-600">Calcul du classement...</p>
            ) : (
              <div className="space-y-3">
                {ranking.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border-2 border-yellow-400' :
                      index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                      'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold w-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="font-semibold text-gray-900">{entry.prenom}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{entry.score}%</div>
                      <div className="text-sm text-gray-600">{entry.correct}/{entry.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => router.push('/student/courses')}
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (!course || !course.questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement du quiz...</div>
      </div>
    );
  }

  const currentQuestion = course.questions[currentQuestionIndex];
  const totalQuestions = course.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

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
            <p className="text-gray-600">Session: {session.code}</p>
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
                      disabled={submitting}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } disabled:opacity-50`}
                    >
                      <span className="font-medium text-gray-900">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Memory or Match games */}
            {(currentQuestion.type === 'memory_pair' || currentQuestion.type === 'match_pair') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 mb-3">
                  ⚠️ Ce type de jeu nécessite une interface spéciale.
                </p>
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholder="Votre réponse"
                />
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={() => handleSubmitAnswer(currentQuestion.id)}
            disabled={!answers[currentQuestion.id] || submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi...' : currentQuestionIndex === totalQuestions - 1 ? 'Terminer' : 'Valider et continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

