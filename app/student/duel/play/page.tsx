'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';

async function getDuelStatus(duelId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/${duelId}/status`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
  });
  if (!response.ok) throw new Error('Failed to load duel');
  return response.json();
}

async function submitDuelAnswer(duelId: string, questionId: string, answer: string, responseTimeMs: number) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/duels/${duelId}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
    },
    body: JSON.stringify({ questionId, answer, responseTimeMs }),
  });
  if (!response.ok) {
    const error: any = await response.json();
    throw new Error(error.error || 'Failed to submit answer');
  }
  return response.json();
}

export default function DuelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duelId = searchParams?.get('id') || '';

  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!duelId) return;
    
    // Get current user ID
    getUser().then((user: any) => {
      setCurrentUserId(user?.id || null);
    });
    
    loadDuel();
    
    // Only poll if duel is not finished
    const interval = setInterval(() => {
      if (duel?.status !== 'finished') {
        loadDuel();
      }
    }, 5000); // Poll every 5 seconds instead of 2
    
    return () => clearInterval(interval);
  }, [duelId]);

  const loadDuel = async () => {
    try {
      const duelData: any = await getDuelStatus(duelId);
      
      // Only update if status changed or if we don't have course questions yet
      if (!duel || duel.status !== duelData.status || (duelData.status === 'active' && !duel.course?.questions)) {
        if (duelData.status === 'active' && duelData.course && !duelData.course.questions) {
          // Fetch course with questions only once
          try {
            const courseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/courses/${duelData.course.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
              },
            });
            if (courseResponse.ok) {
              const courseData: any = await courseResponse.json();
              duelData.course = courseData;
            }
          } catch (e) {
            console.error('Error loading course:', e);
          }
        }
        
        setDuel(duelData);
      } else {
        // Just update scores and waitingForOpponent if duel exists
        if (duel && (duelData.player1Score !== undefined || duelData.player2Score !== undefined || duelData.waitingForOpponent !== undefined)) {
          setDuel((prev: any) => ({
            ...prev,
            player1Score: duelData.player1Score !== undefined ? duelData.player1Score : prev.player1Score,
            player2Score: duelData.player2Score !== undefined ? duelData.player2Score : prev.player2Score,
            status: duelData.status || prev.status,
            waitingForOpponent: duelData.waitingForOpponent !== undefined ? duelData.waitingForOpponent : prev.waitingForOpponent,
          }));
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading duel:', error);
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!duel?.id || !answers[questionId]) {
      alert('Veuillez sélectionner une réponse');
      return;
    }
    
    const responseTime = Date.now() - questionStartTime;
    
    try {
      await submitDuelAnswer(duel.id, questionId, answers[questionId], responseTime);
      
      // Clear answer for this question
      const newAnswers = { ...answers };
      delete newAnswers[questionId];
      setAnswers(newAnswers);
      
      // Move to next question
      if (duel.course?.questions && currentQuestionIndex < duel.course.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setQuestionStartTime(Date.now());
      } else {
        // All questions answered, reload duel to check status and see if opponent finished
        setTimeout(() => {
          loadDuel();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      alert(`Erreur: ${error.message || 'Impossible de soumettre la réponse'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement du duel...</div>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Duel introuvable</div>
      </div>
    );
  }

  // Waiting state
  if (duel.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Duel en attente</h1>
            <p className="text-xl text-gray-700 mb-6">
              En attente d'un adversaire...
            </p>
            {duel.matiere && (
              <p className="text-lg text-gray-600 mb-4">
                Matière: <strong>{duel.matiere.nom}</strong>
              </p>
            )}
            <button
              onClick={() => router.push('/student/duel/lobby')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Retour au lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Finished state
  if (duel.status === 'finished') {
    // Determine if current user is winner
    const isWinner = currentUserId && duel.winnerId && (
      (duel.player1?.id === currentUserId && duel.winnerId === duel.player1?.id) ||
      (duel.player2?.id === currentUserId && duel.winnerId === duel.player2?.id)
    );
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Duel terminé</h1>
            
            {isWinner ? (
              <div className="mb-6">
                <p className="text-2xl text-green-600 mb-2">Vous avez gagné !</p>
                {duel.betAmount > 0 && (
                  <p className="text-lg text-yellow-600 font-semibold">
                    🍌 Vous avez gagné {duel.betAmount * 2} bananes !
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-2xl text-red-600 mb-2">Vous avez perdu</p>
                {duel.betAmount > 0 && (
                  <p className="text-sm text-gray-600">
                    Vous avez perdu {duel.betAmount} bananes
                  </p>
                )}
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-gray-600">Joueur 1: {duel.player1?.prenom}</p>
                  <p className="text-2xl font-bold text-blue-600">{duel.player1Score || 0} points</p>
                </div>
                <div>
                  <p className="text-gray-600">Joueur 2: {duel.player2?.prenom}</p>
                  <p className="text-2xl font-bold text-purple-600">{duel.player2Score || 0} points</p>
                </div>
              </div>
              {duel.betAmount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300 text-center">
                  <p className="text-sm text-gray-600 mb-1">Mise du duel</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    🍌 {duel.betAmount} bananes par joueur (Pot: {duel.betAmount * 2} 🍌)
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => router.push('/student/duel/lobby')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Retour au lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active state - check if waiting for opponent
  if (duel.status === 'active' && duel.waitingForOpponent) {
    // Check if current user has finished
    const userAnswers = duel.course?.questions?.filter((q: any) => 
      answers[q.id] !== undefined
    ) || [];
    const userFinished = userAnswers.length === (duel.course?.questions?.length || 0);
    
    if (userFinished) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">⏳ En attente</h1>
              <p className="text-xl text-gray-700 mb-6">
                En attente de ton adversaire...
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Tu as terminé toutes les questions. Attends que ton adversaire termine aussi.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Active state - show questions
  if (duel.status === 'active' && duel.course?.questions) {
    const currentQuestion = duel.course.questions[currentQuestionIndex];
    const totalQuestions = duel.course.questions.length;
    
    if (!currentQuestion) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Toutes les questions ont été répondues. En attente de ton adversaire...</div>
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Duel - {duel.matiere?.nom || 'Matière'}
              </h1>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Question {currentQuestionIndex + 1} / {totalQuestions}</span>
                <div className="flex gap-4">
                  <span>Vous: {duel.player1Score || 0}</span>
                  <span>Adversaire: {duel.player2Score || 0}</span>
                </div>
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
                  <p className="text-yellow-800 mb-3">
                    Ce type de jeu nécessite une interface spéciale.
                  </p>
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="Votre réponse"
                  />
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={() => handleSubmitAnswer(currentQuestion.id)}
              disabled={!answers[currentQuestion.id]}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestionIndex === totalQuestions - 1 ? 'Terminer le duel' : 'Répondre et continuer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">État du duel inconnu</div>
    </div>
  );
}

