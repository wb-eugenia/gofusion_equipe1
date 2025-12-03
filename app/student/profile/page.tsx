'use client';

import { useEffect, useState } from 'react';
import { getUser, getCourses, getMySkins, activateSkin, getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getMyClans, leaveClan, getMatieres } from '@/lib/api';
import BadgeCard from '@/components/BadgeCard';
import { usePopup } from '@/hooks/usePopup';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [skins, setSkins] = useState<any[]>([]);
  const [activeSkin, setActiveSkin] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] });
  const [myClans, setMyClans] = useState<Record<string, any[]>>({});
  const [matieres, setMatieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess, PopupComponent, showConfirm } = usePopup();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, coursesData, skinsData, friendsData, requestsData, clansData, matieresData] = await Promise.all([
        getUser(),
        getCourses(),
        getMySkins(),
        getFriends().catch(() => ({ friends: [] })),
        getFriendRequests().catch(() => ({ received: [], sent: [] })),
        getMyClans().catch(() => ({ clansByMatiere: {} })),
        getMatieres().catch(() => []),
      ]);
      setUser(userData);
      setCourses(coursesData);
      setSkins(skinsData.skins || []);
      setActiveSkin(skinsData.activeSkin);
      setFriends(friendsData.friends || []);
      setFriendRequests(requestsData);
      setMyClans(clansData.clansByMatiere || {});
      setMatieres(matieresData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSkin = async (skinId: string) => {
    try {
      await activateSkin(skinId);
      showSuccess('Skin activé avec succès !');
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors du changement de skin');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      showSuccess('Demande d\'ami acceptée !');
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'acceptation');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      showSuccess('Demande d\'ami refusée');
      await loadData();
    } catch (error: any) {
      showError(error.message || 'Erreur lors du refus');
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    showConfirm(
      `Êtes-vous sûr de vouloir retirer ${friendName} de vos amis ?`,
      async () => {
        try {
          await removeFriend(friendId);
          showSuccess('Ami retiré');
          await loadData();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
  };

  const handleLeaveClan = async (clanId: string, clanName: string) => {
    showConfirm(
      `Êtes-vous sûr de vouloir quitter le clan "${clanName}" ?`,
      async () => {
        try {
          await leaveClan(clanId);
          showSuccess('Clan quitté');
          await loadData();
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la sortie du clan');
        }
      },
      'Confirmer la sortie',
      'Quitter',
      'Annuler'
    );
  };

  if (loading) {
    return <div className="text-center py-12">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">Erreur lors du chargement</div>;
  }

  const completedCourses = courses.filter((c) => c.completed).length;
  const totalCourses = courses.length;
  const progressPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 Mon Profil</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Bananes Total</span>
                <span className="text-2xl font-bold text-yellow-600">🍌 {user.xp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Streak</span>
                <span className="text-xl font-semibold text-orange-600">
                  🔥 {user.streakDays} jours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cours complétés</span>
                <span className="text-xl font-semibold text-green-600">
                  {completedCourses} / {totalCourses}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progression</span>
                  <span className="text-gray-600">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Skin Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🎨 Mon Skin</h2>
            {activeSkin ? (
              <div className="mb-4">
                <div className="flex items-center justify-center mb-3">
                  {activeSkin.icon ? (
                    <img src={activeSkin.icon} alt={activeSkin.name} className="w-24 h-24 object-contain" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                      🎨
                    </div>
                  )}
                </div>
                <p className="text-center font-semibold text-gray-900">{activeSkin.name}</p>
                <p className="text-center text-sm text-gray-600">{activeSkin.description}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Aucun skin actif</p>
            )}
            {skins.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Skins disponibles ({skins.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {skins.map((skin: any) => (
                    <button
                      key={skin.id}
                      onClick={() => handleChangeSkin(skin.id)}
                      disabled={skin.isActive}
                      className={`w-full p-2 rounded-lg text-left transition ${
                        skin.isActive
                          ? 'bg-blue-100 border-2 border-blue-500 cursor-default'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {skin.icon ? (
                          <img src={skin.icon} alt={skin.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-xl">🎨</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{skin.name}</p>
                          {skin.isActive && (
                            <p className="text-xs text-blue-600">Actif</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                Achetez des skins dans la boutique
              </p>
            )}
          </div>

          {/* Badges Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Badges débloqués ({user.badges?.length || 0})
            </h2>
            {user.badges && user.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {user.badges.map((badge: any) => (
                  <BadgeCard key={badge.id} badge={badge} unlocked={true} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Aucun badge débloqué pour le moment
              </p>
            )}
          </div>
        </div>

        {/* Friends Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              👥 Mes Amis ({friends.length})
            </h2>
            <button
              onClick={() => router.push('/student/friends')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir tout →
            </button>
          </div>

          {/* Friend Requests Received */}
          {friendRequests.received.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Demandes reçues ({friendRequests.received.length})
              </h3>
              <div className="space-y-2">
                {friendRequests.received.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between bg-white p-2 rounded">
                    <span className="text-sm text-gray-700">{request.fromUser?.prenom}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          {friends.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {friends.slice(0, 8).map((friend: any) => (
                <div
                  key={friend.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => router.push(`/student/profile/view?userId=${friend.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{friend.prenom}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend.id, friend.prenom);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                      title="Retirer de mes amis"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-yellow-600">🍌 {friend.xp} bananes</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Aucun ami pour le moment. Ajoutez des amis depuis le classement !
            </p>
          )}

          {friends.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/student/friends')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir tous mes amis ({friends.length})
              </button>
            </div>
          )}
        </div>

        {/* Clans Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              🏰 Mes Clans
            </h2>
            <button
              onClick={() => router.push('/student/clans')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Explorer les clans →
            </button>
          </div>

          {Object.keys(myClans).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(myClans).map(([matiereId, clans]) => {
                const matiere = matieres.find(m => m.id === matiereId);
                return (
                  <div key={matiereId} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {matiere?.nom || 'Matière inconnue'}
                    </h3>
                    {clans.map((clan: any) => (
                      <div key={clan.id} className="flex items-center justify-between p-3 bg-white rounded mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{clan.name}</p>
                          <p className="text-sm text-gray-600">{clan.description || 'Pas de description'}</p>
                          <p className="text-xs text-gray-500">
                            {clan.role === 'leader' ? '👑 Leader' : '👤 Membre'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLeaveClan(clan.id, clan.name)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Quitter
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Vous n'êtes dans aucun clan. Rejoignez-en un depuis la page des clans !
            </p>
          )}
        </div>
      </div>
    </>
  );
}

