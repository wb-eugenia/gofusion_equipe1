'use client';

import { useEffect, useState } from 'react';
import { getUser, getCourses, getMySkins, activateSkin, getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getMyClans, leaveClan, getMatieres } from '@/lib/api';
import BadgeCard from '@/components/BadgeCard';
import { useToast } from '@/hooks/useToast';
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
  const { showSuccess, showError, ToastComponent } = useToast();
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
      showSuccess('✅ Demande d\'ami acceptée !');
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de l\'acceptation');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      showSuccess('❌ Demande d\'ami refusée');
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors du refus');
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    try {
      await removeFriend(friendId);
      showSuccess(`👋 ${friendName} retiré de vos amis`);
      await loadData();
    } catch (error: any) {
      showError(error.message || '❌ Erreur lors de la suppression');
    }
  };

  const handleLeaveClan = async (clanId: string, clanName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir quitter le clan "${clanName}" ?`)) {
      try {
        await leaveClan(clanId);
        showSuccess('Clan quitté');
        await loadData();
      } catch (error: any) {
        showError(error.message || 'Erreur lors de la sortie du clan');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-textMuted">Erreur lors du chargement</div>;
  }

  const completedCourses = courses.filter((c) => c.completed).length;
  const totalCourses = courses.length;
  const progressPercentage = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  return (
    <>
      <ToastComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-text mb-2">Mon Profil</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <div className="bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
            <h2 className="text-lg sm:text-xl font-extrabold text-text mb-4">Statistiques</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-textMuted">Bananes Total</span>
                <span className="text-2xl font-bold text-secondary">🍌 {user.xp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textMuted">Streak</span>
                <span className="text-xl font-semibold text-error">
                  🔥 {user.streakDays} jours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textMuted">Cours complétés</span>
                <span className="text-xl font-semibold text-success">
                  {completedCourses} / {totalCourses}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-textMuted font-bold">Progression</span>
                  <span className="text-success font-extrabold text-base">{progressPercentage}%</span>
                </div>
                <div className="relative w-full bg-inactive/30 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-success to-green-400 h-4 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                  />
                  {/* Jalons visuels */}
                  <div className="absolute top-0 left-1/4 w-0.5 h-4 bg-white/50"></div>
                  <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-white/50"></div>
                  <div className="absolute top-0 left-3/4 w-0.5 h-4 bg-white/50"></div>
                </div>
                <div className="flex justify-between text-xs text-textMuted mt-1">
                  <span>0</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Skin Card */}
          <div className="bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
            <h2 className="text-lg sm:text-xl font-extrabold text-text mb-4">Mon Skin</h2>
            {activeSkin ? (
              <div className="mb-4">
                <div className="flex items-center justify-center mb-3">
                  {activeSkin.icon ? (
                    <img src={activeSkin.icon} alt={activeSkin.name} className="w-24 h-24 object-contain" />
                  ) : (
                    <div className="w-24 h-24 bg-inactive/20 rounded-lg flex items-center justify-center text-4xl">
                    </div>
                  )}
                </div>
                <p className="text-center font-bold text-text">{activeSkin.name}</p>
                <p className="text-center text-sm text-textMuted">{activeSkin.description}</p>
              </div>
            ) : (
              <p className="text-textMuted text-center py-4">Aucun skin actif</p>
            )}
            {skins.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm text-textMuted mb-2">Skins disponibles ({skins.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {skins.map((skin: any) => (
                    <button
                      key={skin.id}
                      onClick={() => handleChangeSkin(skin.id)}
                      disabled={skin.isActive}
                      className={`w-full p-3 rounded-2xl text-left transition-all duration-200 min-h-[48px] font-medium ${
                        skin.isActive
                          ? 'bg-primary/10 border-2 border-primary cursor-default'
                          : 'bg-surface border-2 border-border hover:bg-hover hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {skin.icon ? (
                          <img src={skin.icon} alt={skin.name} className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-xl"></span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{skin.name}</p>
                          {skin.isActive && (
                            <p className="text-xs text-primary">Actif</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted text-center py-2">
                Achetez des skins dans la boutique
              </p>
            )}
          </div>

          {/* Badges Card */}
          <div className="bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-text">
                Badges débloqués
              </h2>
              <span className="text-sm font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {user.badges?.length || 0} / 8
              </span>
            </div>
            {user.badges && user.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {user.badges.map((badge: any) => (
                  <BadgeCard key={badge.id} badge={badge} unlocked={true} />
                ))}
              </div>
            ) : (
              <p className="text-textMuted text-center py-8">
                Aucun badge débloqué pour le moment
              </p>
            )}
          </div>
        </div>

        {/* Friends Section */}
        <div className="mt-6 bg-surface rounded-2xl shadow-card p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-text">
              Mes Amis ({friends.length})
            </h2>
            <button
              onClick={() => router.push('/student/friends')}
              className="text-sm text-primary hover:text-primary/80 transition min-h-[44px] flex items-center"
            >
              Voir tout →
            </button>
          </div>

          {/* Friend Requests Received */}
          {friendRequests.received.length > 0 && (
            <div className="mb-4 p-4 bg-secondary/10 border border-secondary/30 rounded-2xl">
              <h3 className="text-sm font-extrabold text-text mb-2">
                Demandes reçues ({friendRequests.received.length})
              </h3>
              <div className="space-y-2">
                {friendRequests.received.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between bg-surface p-2 rounded">
                    <span className="text-sm text-text">{request.fromUser?.prenom}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-3 py-1.5 text-xs bg-success text-white rounded-xl hover:brightness-105 transition-all duration-150 font-bold min-h-[36px]"
                        style={{ boxShadow: '0 2px 0 0 rgba(30, 130, 52, 1)' }}
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-3 py-1.5 text-xs bg-error text-white rounded-xl hover:brightness-105 transition-all duration-150 font-bold min-h-[36px]"
                        style={{ boxShadow: '0 2px 0 0 rgba(204, 73, 73, 1)' }}
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
                  className="p-3 bg-background rounded-2xl hover:bg-hover hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98] active:translate-y-0 transition-all duration-200 cursor-pointer shadow-sm"
                  onClick={() => router.push(`/student/profile/view?userId=${friend.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text truncate">{friend.prenom}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend.id, friend.prenom);
                      }}
                      className="text-xs text-error hover:text-error/80 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Retirer de mes amis"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-secondary font-medium">🍌 {friend.xp} bananes</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-textMuted text-center py-4">
              Aucun ami pour le moment. Ajoutez des amis depuis le classement !
            </p>
          )}

          {friends.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/student/friends')}
                className="text-sm text-primary hover:text-primary/80 transition min-h-[44px]"
              >
                Voir tous mes amis ({friends.length})
              </button>
            </div>
          )}
        </div>

        {/* Clans Section */}
        <div className="mt-6 bg-surface rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-text">
              Mes Clans
            </h2>
            <button
              onClick={() => router.push('/student/clans')}
              className="text-sm text-primary hover:text-primary/80 transition min-h-[44px] flex items-center"
            >
              Explorer les clans →
            </button>
          </div>

          {Object.keys(myClans).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(myClans).map(([matiereId, clans]) => {
                const matiere = matieres.find(m => m.id === matiereId);
                return (
                  <div key={matiereId} className="p-4 bg-background rounded-2xl">
                    <h3 className="font-extrabold text-text mb-2">
                      {matiere?.nom || 'Matière inconnue'}
                    </h3>
                    {clans.map((clan: any) => (
                      <div key={clan.id} className="flex items-center justify-between p-3 bg-surface rounded-2xl mb-2 shadow-sm">
                        <div>
                          <p className="font-medium text-text">{clan.name}</p>
                          <p className="text-sm text-textMuted">{clan.description || 'Pas de description'}</p>
                          <p className="text-xs text-primary font-medium">
                            {clan.role === 'leader' ? 'Leader' : 'Membre'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLeaveClan(clan.id, clan.name)}
                          className="px-3 py-1.5 text-sm bg-error text-white rounded-xl hover:brightness-105 transition-all duration-150 font-bold min-h-[36px]"
                          style={{ boxShadow: '0 2px 0 0 rgba(204, 73, 73, 1)' }}
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
            <p className="text-textMuted text-center py-4">
              Vous n'êtes dans aucun clan. Rejoignez-en un depuis la page des clans !
            </p>
          )}
        </div>
      </div>
    </>
  );
}

