'use client';

import { useEffect, useState } from 'react';
import { getKPI } from '@/lib/api';

export default function KPIPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPI();
  }, []);

  const loadKPI = async () => {
    try {
      const data = await getKPI();
      setKpi(data);
    } catch (error) {
      console.error('Error loading KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement des KPI...</div>;
  }

  if (!kpi) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  const cards = [
    {
      title: 'Étudiants',
      value: kpi.totalStudents,
      icon: '👥',
      color: 'blue',
    },
    {
      title: 'Bananes Total',
      value: kpi.totalXp.toLocaleString(),
      icon: '⭐',
      color: 'yellow',
    },
    {
      title: 'Cours Actifs',
      value: kpi.activeCourses,
      icon: '📚',
      color: 'green',
    },
    {
      title: 'Badges Débloqués',
      value: kpi.badgesUnlocked,
      icon: '🎖️',
      color: 'purple',
    },
  ];

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Tableau de Bord</h1>
        <p className="text-gray-600">Indicateurs clés de performance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className="text-4xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

