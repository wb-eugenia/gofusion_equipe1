'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCourse, completeCourse, submitStressLevel } from '@/lib/api';
import StressSlider from '@/components/StressSlider';
import { useToast } from '@/hooks/useToast';

export default function CourseQuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams?.get('id') || '';
  const { showSuccess, showError, ToastComponent } = useToast();
  
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [showTheory, setShowTheory] = useState(true);
  const [stressBefore, setStressBefore] = useState(5);
  const [stressAfter, setStressAfter] = useState(5);
  const [stressBeforeSubmitted, setStressBeforeSubmitted] = useState(false);
  const [stressAfterSubmitted, setStressAfterSubmitted] = useState(false);

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
    if (!course) return;

    // Pour les jeux memory/match on ne parcourt pas question par question
    if (course.gameType === 'memory' || course.gameType === 'match') {
      handleSubmit();
      return;
    }

    if (currentQuestionIndex < (course.questions?.length || 0) - 1) {
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
    
    // Calculate score en fonction du type de jeu
    let correct = 0;

    if (course.gameType === 'quiz') {
      course.questions.forEach((q: any) => {
        const userAnswer = answers[q.id];
        if (userAnswer === q.correctAnswer) {
          correct++;
        }
      });
    } else if (course.gameType === 'memory') {
      // Pour le memory, chaque paire correctement trouvée est stockée dans answers avec value === 'matched'
      const memoryQuestions = course.questions.filter((q: any) => q.type === 'memory_pair');
      correct = memoryQuestions.filter((q: any) => answers[q.id] === 'matched').length;
    } else if (course.gameType === 'match') {
      // Pour le match, chaque paire correcte donne une réponse exacte
      const matchQuestions = course.questions.filter((q: any) => q.type === 'match_pair');
      matchQuestions.forEach((q: any) => {
        const userAnswer = answers[q.id];
        if (userAnswer && userAnswer === q.correctAnswer) {
          correct++;
        }
      });
    }

    const total = course.questions.length || 1;
    const calculatedScore = Math.round((correct / total) * 100);
    setScore(calculatedScore);
    setShowResults(true);
    
    // Complete course if score >= 50%
    if (calculatedScore >= 50) {
      try {
        const result = await completeCourse(courseId);
        showSuccess(`🎉 Cours complété ! +${result.xpGained} 🍌 bananes gagnées !`);
      } catch (error: any) {
        console.error('Error completing course:', error);
        showError('Erreur lors de la validation du cours');
      }
    } else {
      showError('❌ Score insuffisant (minimum 50% requis)');
    }
    
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement du cours...</p>
        </div>
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
  const progress = course.gameType === 'quiz'
    ? ((currentQuestionIndex + 1) / (totalQuestions || 1)) * 100
    : 100;

  // Show stress after if results shown but not submitted
  if (showResults && !stressAfterSubmitted) {
    let correctAnswers = 0;
    if (course.gameType === 'quiz') {
      correctAnswers = course.questions.filter((q: any) => answers[q.id] === q.correctAnswer).length;
    } else if (course.gameType === 'memory') {
      const memoryQuestions = course.questions.filter((q: any) => q.type === 'memory_pair');
      correctAnswers = memoryQuestions.filter((q: any) => answers[q.id] === 'matched').length;
    } else if (course.gameType === 'match') {
      const matchQuestions = course.questions.filter((q: any) => q.type === 'match_pair');
      matchQuestions.forEach((q: any) => {
        if (answers[q.id] && answers[q.id] === q.correctAnswer) {
          correctAnswers++;
        }
      });
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">🎯 Résultats</h1>
            <div className="text-6xl font-bold text-blue-600 mb-4 text-center">{score}%</div>
            <p className="text-xl text-gray-700 mb-6 text-center">
              {correctAnswers} / {totalQuestions} bonnes réponses
            </p>
            {score >= 50 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-semibold text-center">
                  ✅ Félicitations ! Vous avez réussi le cours !
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-semibold text-center">
                  ❌ Score insuffisant. Il faut au moins 50% pour valider le cours.
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Niveau de stress après</h2>
            <p className="text-gray-600 mb-6">
              Indiquez votre niveau de stress maintenant que vous avez terminé
            </p>
            <StressSlider
              value={stressAfter}
              onChange={setStressAfter}
              label="Niveau de stress après le cours"
            />
            <button
              onClick={async () => {
                setStressAfterSubmitted(true);
                await submitStressLevel(courseId, stressBefore, stressAfter);
                router.push('/student/courses');
              }}
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
            >
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && stressAfterSubmitted) {
    let correctAnswers = 0;
    if (course.gameType === 'quiz') {
      correctAnswers = course.questions.filter((q: any) => answers[q.id] === q.correctAnswer).length;
    } else if (course.gameType === 'memory') {
      const memoryQuestions = course.questions.filter((q: any) => q.type === 'memory_pair');
      correctAnswers = memoryQuestions.filter((q: any) => answers[q.id] === 'matched').length;
    } else if (course.gameType === 'match') {
      const matchQuestions = course.questions.filter((q: any) => q.type === 'match_pair');
      matchQuestions.forEach((q: any) => {
        if (answers[q.id] && answers[q.id] === q.correctAnswer) {
          correctAnswers++;
        }
      });
    }
    
    return (
      <>
        <ToastComponent />
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Interface spécifique selon le type de jeu
  if (!course.questions || course.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Aucune question définie pour ce cours</div>
      </div>
    );
  }

  // Vue Quiz classique
  if (course.gameType === 'quiz') {
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
      <>
        <ToastComponent />
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
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                <button
                  onClick={handleNext}
                  disabled={!answers[currentQuestion.id]}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestionIndex === totalQuestions - 1 ? 'Terminer' : 'Suivant →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vue Memory : grille simple de cartes
  if (course.gameType === 'memory') {
    // Construire les cartes à partir des paires
    const pairs = course.questions
      .filter((q: any) => q.type === 'memory_pair')
      .flatMap((q: any) => {
        let pairValues: string[] = [];
        try {
          if (q.options) {
            pairValues = JSON.parse(q.options);
          }
        } catch {
          pairValues = [];
        }
        if (pairValues.length < 2) return [];
        return [
          { id: `${q.id}-a`, questionId: q.id, value: pairValues[0] },
          { id: `${q.id}-b`, questionId: q.id, value: pairValues[1] },
        ];
      });

    // Mélange déterministe simple basé sur l’index pour éviter de re-mélanger à chaque render
    const shuffledCards = pairs.map((card: any, index: number) => ({
      ...card,
      sortKey: (index * 37) % 101,
    })).sort((a: any, b: any) => a.sortKey - b.sortKey);

    // État dérivé : quelles cartes sont retournées / trouvées
    const flippedIds = Object.keys(answers).filter(key => answers[key] === 'flipped');
    const matchedQuestionIds = Object.keys(answers).filter(qid => answers[qid] === 'matched');

    const handleCardClick = (cardId: string, questionId: string) => {
      // Si déjà trouvée, on ignore
      if (matchedQuestionIds.includes(questionId)) return;

      const currentFlipped = flippedIds.filter(id => id !== cardId);

      // Si aucune ou une seule carte, on (re)retourne
      if (currentFlipped.length === 0) {
        setAnswers(prev => ({
          ...prev,
          [cardId]: 'flipped',
        }));
        return;
      }

      if (currentFlipped.length === 1) {
        const firstId = currentFlipped[0];
        const firstCard = shuffledCards.find((c: any) => c.id === firstId);
        const secondCard = shuffledCards.find((c: any) => c.id === cardId);
        if (!firstCard || !secondCard) return;

        // Si même questionId => paire trouvée
        if (firstCard.questionId === secondCard.questionId) {
          setAnswers(prev => ({
            ...prev,
            [cardId]: 'flipped',
            [firstId]: 'flipped',
            [questionId]: 'matched',
          }));
        } else {
          // Sinon, on retourne cette carte et on laissera l’utilisateur réessayer
          setAnswers(prev => ({
            ...prev,
            [cardId]: 'flipped',
          }));
        }
      }
    };

    const allMatched = course.questions
      .filter((q: any) => q.type === 'memory_pair')
      .every((q: any) => answers[q.id] === 'matched');

    return (
      <>
        <ToastComponent />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {course.titre} - Memory
                </h1>
                {course.matiere && (
                  <p className="text-gray-600">Matière: {course.matiere.nom}</p>
                )}
                <p className="text-gray-600 mt-2">
                  Trouvez toutes les paires en cliquant sur les cartes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {shuffledCards.map((card: any) => {
                  const isMatched = matchedQuestionIds.includes(card.questionId);
                  const isFlipped = flippedIds.includes(card.id) || isMatched;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardClick(card.id, card.questionId)}
                      className={`aspect-square rounded-xl border-2 flex items-center justify-center text-center text-sm font-semibold transition-all ${
                        isMatched
                          ? 'bg-green-100 border-green-400 text-green-800'
                          : isFlipped
                          ? 'bg-white border-blue-400 text-gray-900'
                          : 'bg-blue-600 border-blue-700 text-white'
                      }`}
                    >
                      {isFlipped ? card.value : '?'}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!allMatched}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allMatched ? 'Terminer le jeu' : 'Trouvez d’abord toutes les paires'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vue Match : relier définitions et mots
  if (course.gameType === 'match') {
    const pairs = course.questions
      .filter((q: any) => q.type === 'match_pair')
      .map((q: any) => {
        let pairValues: string[] = [];
        try {
          if (q.options) {
            pairValues = JSON.parse(q.options);
          }
        } catch {
          pairValues = [];
        }
        return {
          id: q.id,
          definition: pairValues[0] || q.question,
          word: pairValues[1] || q.correctAnswer || '',
        };
      })
      .filter((p: any) => p.definition && p.word);

    const leftItems = pairs.map((p: any) => ({
      id: p.id,
      text: p.definition,
    }));

    const rightItems = pairs
      .map((p: any, index: number) => ({
        id: `${p.id}-right-${index}`,
        word: p.word,
        questionId: p.id,
        sortKey: (index * 53) % 101,
      }))
      .sort((a: any, b: any) => a.sortKey - b.sortKey);

    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    const handleSelectLeft = (id: string) => {
      setSelectedLeft(id);
    };

    const handleSelectRight = (right: any) => {
      if (!selectedLeft) return;
      // On enregistre la correspondance pour la question
      setAnswers(prev => ({
        ...prev,
        [selectedLeft]: right.word,
      }));
      setSelectedLeft(null);
    };

    const allMatched = leftItems.every((left: any) => {
      const expected = pairs.find((p: any) => p.id === left.id);
      const userAnswer = answers[left.id];
      return expected && userAnswer && userAnswer === expected.word;
    });

    return (
      <>
        <ToastComponent />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {course.titre} - Relier les définitions
                </h1>
                {course.matiere && (
                  <p className="text-gray-600">Matière: {course.matiere.nom}</p>
                )}
                <p className="text-gray-600 mt-2">
                  Cliquez d’abord sur une définition, puis sur le mot correspondant.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Définitions</h2>
                  <div className="space-y-2">
                    {leftItems.map((item: any) => {
                      const isSelected = selectedLeft === item.id;
                      const hasAnswer = !!answers[item.id];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectLeft(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : hasAnswer
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {item.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">Mots</h2>
                  <div className="space-y-2">
                    {rightItems.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRight(item)}
                        className="w-full text-left px-3 py-2 rounded-lg border-2 border-gray-200 text-sm hover:border-blue-300 transition"
                      >
                        {item.word}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!allMatched}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allMatched ? 'Valider mes correspondances' : 'Complétez toutes les correspondances'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}

