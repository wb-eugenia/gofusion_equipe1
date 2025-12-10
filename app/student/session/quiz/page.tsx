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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [ranking, setRanking] = useState<any[]>([]);
  const [sessionStatus, setSessionStatus] = useState('waiting');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (sessionCode) {
      loadSession();
    } else {
      router.push('/student/checkin');
    }
  }, [sessionCode]);

  useEffect(() => {
    if (session?.id) {
      // Poll session status every 2 seconds
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
          
          // If session is started and we have questions, check for current question
          if (status.status === 'started' && course?.questions) {
            // In Kahoot mode, teacher controls question progression
            // We'll poll for ranking to see current state
            if (!showResults) {
              try {
                const currentRanking = await getSessionRanking(session.id);
                setRanking(currentRanking);
              } catch (e) {
                // Ignore errors
              }
            }
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [session?.id, course, showResults]);

  // Timer for current question (if implemented)
  useEffect(() => {
    if (questionStartTime && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            // Time's up - auto-submit if answer selected
            if (selectedAnswer && !submitted) {
              handleSubmitAnswer();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [questionStartTime, timeRemaining, selectedAnswer, submitted]);

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
      setQuestionStartTime(Date.now());
      // Optional: Set timer (e.g., 30 seconds per question)
      // setTimeRemaining(30);
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

  const handleAnswer = (answer: string) => {
    if (!submitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session?.id || !selectedAnswer || submitted) return;
    
    const currentQuestion = course?.questions?.[currentQuestionIndex];
    if (!currentQuestion) return;
    
    try {
      await submitSessionAnswer(session.id, currentQuestion.id, selectedAnswer);
      setSubmitted(true);
      
      // Show feedback briefly, then wait for next question
      // In Kahoot mode, teacher controls when next question appears
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-text">Chargement de la session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-error">Session introuvable</div>
      </div>
    );
  }

  // Waiting for quiz to start
  if (sessionStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-card p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-text mb-4">
            En attente du quiz
          </h1>
          <p className="text-textMuted mb-6">
            Vous êtes inscrit à la session. Le professeur va lancer le quiz sous peu.
          </p>
          <p className="text-sm text-textMuted">
            Code: <strong className="font-mono bg-border px-2 py-1 rounded">{session.code}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Show ranking if finished
  if (showResults || sessionStatus === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-surface rounded-2xl shadow-card p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-text mb-6 text-center">🏆 Classement Final</h1>
            
            {ranking.length === 0 ? (
              <p className="text-center text-textMuted">Calcul du classement...</p>
            ) : (
              <div className="space-y-3">
                {ranking.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border-2 border-yellow-400' :
                      index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                      'bg-background border border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold w-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="font-semibold text-text">{entry.prenom}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{entry.score}%</div>
                      <div className="text-sm text-textMuted">{entry.correct}/{entry.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => router.push('/student/courses')}
              className="w-full mt-6 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition min-h-[48px]"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress - Kahoot mode: one question at a time
  if (!course || !course.questions || course.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-text">Chargement du quiz...</div>
      </div>
    );
  }

  const currentQuestion = course.questions[currentQuestionIndex];
  const totalQuestions = course.questions.length;

  if (!currentQuestion) {
    // Wait for next question (teacher controlled)
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-card p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-text mb-4">
            Réponse enregistrée !
          </h1>
          <p className="text-textMuted mb-6">
            En attente de la prochaine question...
          </p>
          {/* Show live ranking */}
          {ranking.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold text-text mb-2">Classement en direct:</p>
              {ranking.slice(0, 5).map((entry, idx) => (
                <div key={entry.id} className="flex justify-between text-sm">
                  <span className="text-textMuted">{idx + 1}. {entry.prenom}</span>
                  <span className="text-primary font-semibold">{entry.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface rounded-2xl shadow-card p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-text">
                {course.titre}
              </h1>
              {timeRemaining !== null && (
                <div className={`text-2xl font-bold ${
                  timeRemaining <= 5 ? 'text-error animate-pulse' : 'text-primary'
                }`}>
                  {timeRemaining}s
                </div>
              )}
            </div>
            <p className="text-textMuted">Code: {session.code}</p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-textMuted mb-2">
              <span>Question {currentQuestionIndex + 1} / {totalQuestions}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-text mb-6">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3 pb-32 sm:pb-6">
              {options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = selectedAnswer === option;
                const isSubmitted = submitted;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-4 sm:p-6 rounded-lg border-2 transition-all min-h-[56px] sm:min-h-[64px] text-base sm:text-lg ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md scale-[1.02]'
                        : 'bg-background text-text border-border hover:border-primary hover:bg-hover active:scale-[0.98]'
                    } ${isSubmitted ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${
                        isSelected ? 'bg-white text-primary' : 'bg-border text-text'
                      }`}>
                        {optionLetter}
                      </span>
                      <span className="font-medium break-words">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button */}
          {!submitted && selectedAnswer && (
            <button
              onClick={handleSubmitAnswer}
              className="w-full px-6 py-4 bg-primary text-white rounded-lg font-bold text-base sm:text-lg hover:bg-primary/90 transition min-h-[56px] sm:min-h-[64px] shadow-md active:scale-[0.98]"
            >
              Valider la réponse
            </button>
          )}

          {/* Submitted feedback */}
          {submitted && (
            <div className="mt-4 p-4 bg-success/10 border-2 border-success/30 rounded-lg text-center">
              <p className="text-success font-semibold">✅ Réponse enregistrée !</p>
              <p className="text-sm text-textMuted mt-2">En attente de la prochaine question...</p>
            </div>
          )}

          {/* Live ranking (collapsed) */}
          {ranking.length > 0 && (
            <div className="mt-6 p-4 bg-background rounded-lg">
              <p className="text-sm font-semibold text-text mb-2">Classement en direct:</p>
              <div className="space-y-1">
                {ranking.slice(0, 5).map((entry, idx) => (
                  <div key={entry.id} className="flex justify-between text-sm">
                    <span className="text-textMuted">{idx + 1}. {entry.prenom}</span>
                    <span className="text-primary font-semibold">{entry.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
