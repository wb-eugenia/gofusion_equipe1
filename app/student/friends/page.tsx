'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getFriendActivity } from '@/lib/api';
import { usePopup } from '@/hooks/usePopup';

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendActivity, setFriendActivity] = useState<any>(null);
  const { showError, showSuccess, showConfirm, PopupComponent } = usePopup();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      setFriends(friendsData.friends || []);
      setFriendRequests(requestsData);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
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
          setSelectedFriend(null);
          setFriendActivity(null);
        } catch (error: any) {
          showError(error.message || 'Erreur lors de la suppression');
        }
      },
      'Confirmer la suppression',
      'Supprimer',
      'Annuler'
    );
  };

  const handleViewActivity = async (friend: any) => {
    try {
      const activity = await getFriendActivity(friend.id);
      setSelectedFriend(friend);
      setFriendActivity(activity);
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement de l\'activité');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Mes Amis</h1>
          <p className="text-gray-600">Gérez vos amis et leurs demandes</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Friend Requests */}
            {(friendRequests.received.length > 0 || friendRequests.sent.length > 0) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Demandes d'ami</h2>
                
                {friendRequests.received.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Reçues ({friendRequests.received.length})</h3>
                    <div className="space-y-2">
                      {friendRequests.received.map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{request.fromUser?.prenom}</p>
                              <p className="text-xs text-gray-500">🍌 {request.fromUser?.xp} bananes</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request.id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {friendRequests.sent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Envoyées ({friendRequests.sent.length})</h3>
                    <div className="space-y-2">
                      {friendRequests.sent.map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-900">{request.toUser?.prenom}</p>
                            <p className="text-xs text-gray-500">🍌 {request.toUser?.xp} bananes</p>
                          </div>
                          <span className="text-sm text-gray-500">En attente...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Friends List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Mes Amis ({friends.length})
              </h2>
              {friends.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {friends.map((friend: any) => (
                    <div
                      key={friend.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p
                            className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => router.push(`/student/profile/${friend.id}`)}
                          >
                            {friend.prenom}
                          </p>
                          <p className="text-sm text-yellow-600">🍌 {friend.xp} bananes</p>
                          <p className="text-xs text-gray-500">🔥 {friend.streakDays} jours de streak</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.id, friend.prenom)}
                          className="text-red-600 hover:text-red-800 text-xl"
                          title="Retirer de mes amis"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => router.push(`/student/profile/view?userId=${friend.id}`)}
                          className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Voir profil
                        </button>
                        <button
                          onClick={() => handleViewActivity(friend)}
                          className="flex-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Activité
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucun ami pour le moment. Ajoutez des amis depuis le classement !
                </p>
              )}
            </div>
          </div>

          {/* Friend Activity Sidebar */}
          {selectedFriend && friendActivity && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Activité de {selectedFriend.prenom}
                </h2>
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    setFriendActivity(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Cours récents</h3>
                  {friendActivity.recentCourses && friendActivity.recentCourses.length > 0 ? (
                    <div className="space-y-2">
                      {friendActivity.recentCourses.map((item: any, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="font-medium text-gray-900">{item.course?.titre}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.completedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun cours complété récemment</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Duels gagnés</h3>
                  <p className="text-lg font-bold text-green-600">{friendActivity.recentDuelWins} victoires</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

