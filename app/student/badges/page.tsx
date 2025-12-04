'use client';

import { useEffect, useState } from 'react';
import { getBadges } from '@/lib/api';
import BadgeCard from '@/components/BadgeCard';

export default function BadgesPage() {
  const [badgesData, setBadgesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const data = await getBadges();
      setBadgesData(data);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <img src="/singes/gemini_generated_image_v5b4ivv5b4ivv5b4-removebg-preview_480.png" alt="Mascotte" className="w-24 h-24 mx-auto" />
          </div>
          <p className="text-xl font-bold text-text">Chargement de tes badges...</p>
        </div>
      </div>
    );
  }

  if (!badgesData) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Galerie de Badges</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progression</p>
              <p className="text-2xl font-bold text-blue-600">
                {badgesData.stats.unlocked} / {badgesData.stats.total} badges
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {badgesData.stats.percentage}%
              </p>
              <p className="text-sm text-gray-600">débloqués</p>
            </div>
          </div>
          <div className="mt-3 relative w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-4 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${badgesData.stats.percentage}%` }}
            />
            <div className="absolute top-0 left-1/4 w-0.5 h-4 bg-white/50"></div>
            <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-white/50"></div>
            <div className="absolute top-0 left-3/4 w-0.5 h-4 bg-white/50"></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span className={badgesData.stats.percentage >= 75 ? 'text-blue-600 font-extrabold text-base' : ''}>100%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {badgesData.badges.map((badge: any) => (
          <BadgeCard key={badge.id} badge={badge} unlocked={badge.unlocked} />
        ))}
      </div>
    </div>
  );
}

