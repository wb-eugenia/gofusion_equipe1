'use client';

interface ClanWarRankingProps {
  ranking: Array<{
    rank: number;
    clan: {
      id: string;
      name: string;
    };
    total: number;
    memberCount?: number;
  }>;
  userClanId?: string;
  totalBananas: number;
}

export default function ClanWarRanking({ ranking, userClanId, totalBananas }: ClanWarRankingProps) {
  if (ranking.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Aucune contribution pour le moment.</p>
        <p className="text-sm mt-2">Soyez le premier à collecter des bananes !</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ranking.map((item) => {
        const isUserClan = userClanId && item.clan.id === userClanId;
        const isFirst = item.rank === 1;

        return (
          <div
            key={item.clan.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              isUserClan
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : isFirst
                ? 'border-yellow-400 bg-yellow-50 shadow-md'
                : 'border-gray-200 bg-gray-50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isFirst
                      ? 'bg-yellow-400 text-yellow-900'
                      : isUserClan
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {item.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {item.clan.name}
                    </p>
                    {isUserClan && (
                      <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                        Mon clan
                      </span>
                    )}
                    {isFirst && (
                      <span className="text-lg" title="En tête">
                        🏆
                      </span>
                    )}
                  </div>
                  {item.memberCount !== undefined && (
                    <p className="text-sm text-gray-600">
                      {item.memberCount} membre{item.memberCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {item.total.toLocaleString()} 🍌
                </p>
                {totalBananas > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((item.total / totalBananas) * 100)}%
                  </p>
                )}
              </div>
            </div>
            {totalBananas > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      isFirst
                        ? 'bg-yellow-400'
                        : isUserClan
                        ? 'bg-blue-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${Math.min((item.total / totalBananas) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

