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
    return <div className="text-center py-12">Chargement des badges...</div>;
  }

  if (!badgesData) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Galerie de Badges</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
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
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${badgesData.stats.percentage}%` }}
            />
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

