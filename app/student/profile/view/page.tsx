'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPublicProfile, sendFriendRequest, getFriendRequests, getUser } from '@/lib/api';
import BadgeCard from '@/components/BadgeCard';
import { usePopup } from '@/hooks/usePopup';

export default function ViewProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams?.get('userId') || '';
  
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'request_sent' | 'request_received'>('none');
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess, PopupComponent } = usePopup();

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadCurrentUser();
    }
  }, [userId]);

  const loadCurrentUser = async () => {
    try {
      const user = await getUser();
      setCurrentUser(user);
      await checkFriendStatus(user.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const checkFriendStatus = async (currentUserId: string) => {
    try {
      const requests = await getFriendRequests();
      
      // Check if already friends
      const friendsResponse: any = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/student/friends`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
      }).then(r => r.json()).catch(() => ({ friends: [] }));
      
      const isFriend = friendsResponse.friends?.some((f: any) => f.id === userId);
      if (isFriend) {
        setFriendStatus('friends');
        return;
      }
      
      // Check if request sent
      const sentRequest = requests.sent?.find((r: any) => r.toUser?.id === userId);
      if (sentRequest) {
        setFriendStatus('request_sent');
        return;
      }
      
      // Check if request received
      const receivedRequest = requests.received?.find((r: any) => r.fromUser?.id === userId);
      if (receivedRequest) {
        setFriendStatus('request_received');
        return;
      }
      
      setFriendStatus('none');
    } catch (error) {
      console.error('Error checking friend status:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getPublicProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      await sendFriendRequest(userId);
      showSuccess('Demande d\'ami envoyée !');
      setFriendStatus('request_sent');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de l\'envoi de la demande');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement du profil...</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Profil introuvable</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <>
      <PopupComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 transition"
          >
            ← Retour
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 Profil de {profile.prenom}</h1>
            {currentUser && currentUser.id !== userId && (
              <div>
                {friendStatus === 'none' && (
                  <button
                    onClick={handleAddFriend}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    + Ajouter en ami
                  </button>
                )}
                {friendStatus === 'request_sent' && (
                  <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">
                    Demande envoyée
                  </span>
                )}
                {friendStatus === 'friends' && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                    ✓ Amis
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Bananes Total</span>
                <span className="text-2xl font-bold text-yellow-600">🍌 {profile.xp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Streak</span>
                <span className="text-xl font-semibold text-orange-600">
                  🔥 {profile.streakDays} jours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cours complétés</span>
                <span className="text-xl font-semibold text-green-600">
                  {profile.completedCoursesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Skin Card */}
          {profile.activeSkin && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🎨 Skin Actif</h2>
              <div className="flex items-center justify-center mb-3">
                {profile.activeSkin.icon ? (
                  <img 
                    src={profile.activeSkin.icon} 
                    alt={profile.activeSkin.name} 
                    className="w-24 h-24 object-contain" 
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                    🎨
                  </div>
                )}
              </div>
              <p className="text-center font-semibold text-gray-900">{profile.activeSkin.name}</p>
              <p className="text-center text-sm text-gray-600">{profile.activeSkin.description}</p>
            </div>
          )}

          {/* Badges Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Badges débloqués ({profile.badges?.length || 0})
            </h2>
            {profile.badges && profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {profile.badges.map((badge: any) => (
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
      </div>
    </>
  );
}

