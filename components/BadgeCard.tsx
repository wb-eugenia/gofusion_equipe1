'use client';

interface BadgeCardProps {
  badge: {
    id: string;
    name: string;
    icon: string;
    description: string;
    thresholdXp?: number | null;
    conditionType: string;
    conditionValue?: number | null;
    unlocked?: boolean;
  };
  unlocked: boolean;
}

export default function BadgeCard({ badge, unlocked }: BadgeCardProps) {
  return (
    <div
      className={`relative rounded-lg p-6 border-2 transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 shadow-md'
          : 'bg-gray-100 border-gray-300 opacity-60'
      }`}
    >
      {unlocked && (
        <div className="absolute top-2 right-2 text-2xl">✨</div>
      )}
      
      <div className="text-center">
        <div className="text-6xl mb-3">
          {unlocked ? '🎖️' : '🔒'}
        </div>
        <h3 className={`text-lg font-semibold mb-1 ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className={`text-sm ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
          {badge.description}
        </p>
        {badge.thresholdXp && (
          <p className="text-xs text-gray-500 mt-2">
            {badge.thresholdXp} XP requis
          </p>
        )}
      </div>
    </div>
  );
}

