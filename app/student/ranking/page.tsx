'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRanking } from '@/lib/api';

export default function RankingPage() {
  const [ranking, setRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const data = await getRanking();
      setRanking(data);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    router.push(`/student/profile/view?userId=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  if (!ranking) {
    return <div className="text-center py-12 text-textMuted">Erreur lors du chargement</div>;
  }

  const getMedal = (position: number) => {
    return `${position}.`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-text mb-2">Classement</h1>
        <p className="text-textMuted">Top 10 des étudiants</p>
      </div>
      {/* Podium Top 3 - Optimized for mobile */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
        {/* Confetti background - more subtle */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" className="text-secondary">
              <circle cx="15%" cy="20%" r="3" />
              <rect x="75%" y="15%" width="4" height="4" rx="1" />
              <circle cx="40%" cy="80%" r="2" />
              <rect x="85%" y="70%" width="3" height="3" rx="1" />
            </g>
          </svg>
        </div>
        
        {/* Podium row: align by bottom, responsive heights */}
        <div className="relative flex items-end justify-center gap-2 sm:gap-4">
          {ranking.top10.slice(0, 3).map((student: any, index: number) => {
            const podiumStyles = [
              // 1st place
              {
                ring: 'ring-2 ring-yellow-400/50',
                bg: 'bg-white',
                border: 'border-2 border-yellow-400',
                height: 'h-40 sm:h-48',
                textColor: 'text-gray-900',
                badgeBg: 'bg-yellow-400',
                badgeText: 'text-yellow-900',
              },
              // 2nd place
              {
                ring: 'ring-2 ring-gray-400/50',
                bg: 'bg-white',
                border: 'border-2 border-gray-400',
                height: 'h-32 sm:h-40',
                textColor: 'text-gray-900',
                badgeBg: 'bg-gray-400',
                badgeText: 'text-gray-900',
              },
              // 3rd place
              {
                ring: 'ring-2 ring-amber-600/50',
                bg: 'bg-white',
                border: 'border-2 border-amber-600',
                height: 'h-28 sm:h-36',
                textColor: 'text-gray-900',
                badgeBg: 'bg-amber-600',
                badgeText: 'text-white',
              },
            ][index];

            // Visual order: 2nd left, 1st center, 3rd right
            const orderClass = index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3';

            return (
              <div
                key={student.id}
                className={`relative flex-1 max-w-[120px] sm:max-w-[160px] ${orderClass} ${podiumStyles.bg} ${podiumStyles.border} ${podiumStyles.ring} ${podiumStyles.height} rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden`}
                onClick={() => handleProfileClick(student.id)}
              >
                {/* Special symbols for top 3 */}
                {index === 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10">👑</div>
                )}
                {index === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10">⭐</div>
                )}
                {index === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-10">🎖️</div>
                )}
                
                {/* Content container */}
                <div className="relative h-full flex flex-col items-center justify-between p-3">
                  {/* Medal badge at top */}
                  <div className={`${podiumStyles.badgeBg} ${podiumStyles.badgeText} w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-md`}>
                    #{index + 1}
                  </div>

                  {/* Avatar */}
                  {student.activeSkin && student.activeSkin.icon ? (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={student.activeSkin.icon} 
                        alt={student.activeSkin.name || student.prenom}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Error loading skin image:', student.activeSkin?.icon);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-black text-white">{student.prenom.charAt(0)}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="text-center w-full">
                    <p className={`font-black ${podiumStyles.textColor} text-xs sm:text-sm truncate`}>{student.prenom}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-secondary mt-1">🍌 {student.xp}</p>
                    {student.streakDays > 0 && (
                      <p className="text-[10px] text-gray-600 mt-0.5">🔥 {student.streakDays}j</p>
                    )}
                  </div>

                  {/* Trophy at bottom */}
                  <div className="text-xl opacity-30">🏆</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
        <div className="divide-y divide-border">
          {ranking.top10.slice(3).map((student: any, index: number) => (
            <div
              key={student.id}
              className="px-6 py-5 flex items-center justify-between hover:bg-hover transition-all duration-200 cursor-pointer min-h-[68px]"
              onClick={() => handleProfileClick(student.id)}
            >
              <div className="flex items-center space-x-4">
                <span className="text-xl font-extrabold text-primary w-8">
                  {getMedal(index + 4)}
                </span>
                {student.activeSkin && student.activeSkin.icon ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={student.activeSkin.icon} 
                      alt={student.activeSkin.name || student.prenom}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error('Error loading skin image:', student.activeSkin?.icon);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary shadow-md flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-white">{student.prenom.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-text hover:text-primary transition">
                    {student.prenom}
                  </p>
                  <p className="text-xs text-textMuted">
                    {student.streakDays > 0 && `🔥 ${student.streakDays} jours de streak`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-secondary">🍌 {student.xp} bananes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ranking.userPosition > 10 && (
        <div className="mt-6 bg-primary/10 border border-primary/30 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-text">Votre position</p>
              <p className="text-sm text-gray-600">Rang #{ranking.userPosition}</p>
            </div>
            <p className="text-xl font-bold text-secondary">🍌 {ranking.userXp} bananes</p>
          </div>
          <div className="mt-3 h-2 w-full bg-inactive/30 rounded-full overflow-hidden">
            <div className="h-2 bg-secondary rounded-full animate-[progressFill_1.2s_ease-out]" style={{ width: `${Math.min(100, Math.max(0, (ranking.userPosition <= 10 ? 100 : 100 - (ranking.userPosition - 10))))}%` }} />
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        Cliquez sur un nom pour voir son profil
      </div>
    </div>
  );
}

