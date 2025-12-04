'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate realistic loading progression
    const intervals = [
      { time: 100, value: 20 },
      { time: 300, value: 40 },
      { time: 500, value: 60 },
      { time: 800, value: 80 },
      { time: 1000, value: 95 },
    ];

    const timeouts = intervals.map(({ time, value }) =>
      setTimeout(() => setProgress(value), time)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Animated Mascot */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <img
              src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png"
              alt="Mascotte"
              className="w-32 h-32 object-contain animate-bounce"
              style={{ animationDuration: '1.5s' }}
            />
            {/* Sparkles effect */}
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse" style={{ animationDuration: '1s' }}>
              ✨
            </div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }}>
              ✨
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <h2 className="text-2xl font-extrabold text-text text-center mb-6">
          {message}
        </h2>

        {/* Progress Bar Container */}
        <div className="bg-surface rounded-2xl shadow-card p-6">
          {/* Progress Bar */}
          <div className="relative w-full bg-inactive/30 rounded-full h-6 overflow-hidden mb-3">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/20 to-primary/10 animate-[shimmer_2s_ease-in-out_infinite]"></div>
            
            {/* Progress Fill */}
            <div
              className="relative h-6 bg-gradient-to-r from-primary via-secondary to-primary rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
            </div>

            {/* Visual milestones */}
            <div className="absolute top-0 left-1/4 w-0.5 h-6 bg-white/40"></div>
            <div className="absolute top-0 left-1/2 w-0.5 h-6 bg-white/40"></div>
            <div className="absolute top-0 left-3/4 w-0.5 h-6 bg-white/40"></div>
          </div>

          {/* Progress Percentage */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-textMuted font-semibold">Progression</span>
            <span className="text-lg font-extrabold text-primary">{progress}%</span>
          </div>

          {/* Loading dots animation */}
          <div className="flex justify-center items-center mt-4 gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1s' }}></div>
            <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
          </div>
        </div>

        {/* Fun tip */}
        <p className="text-center text-textMuted text-sm mt-6 animate-pulse">
          💡 Astuce : Complète tes cours quotidiens pour maximiser tes bananes !
        </p>
      </div>
    </div>
  );
}
