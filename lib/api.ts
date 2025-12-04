// API URL - utilise l'URL du Worker en production ou localhost en dev
const API_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787')
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionId = typeof window !== 'undefined' 
    ? localStorage.getItem('sessionId') 
    : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - le serveur ne répond pas');
    }
    throw error;
  }
}

// Auth
export async function register(prenom: string) {
  return apiRequest<{ sessionId: string; userId: string; prenom: string }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ prenom }),
    }
  );
}

export async function getUser() {
  return apiRequest<any>('/api/user');
}

// Courses
export async function getMatieres() {
  return apiRequest<any[]>('/api/matieres');
}

export async function getAdminMatieres() {
  return apiRequest<any[]>('/api/admin/matieres');
}

export async function getCourses() {
  return apiRequest<any[]>('/api/courses');
}

export async function getCourse(courseId: string) {
  return apiRequest<any>(`/api/courses/${courseId}`);
}

// Admin - Course Questions
export async function getAdminCourseQuestions(courseId: string) {
  return apiRequest<any[]>(`/api/admin/courses/${courseId}/questions`);
}

export async function createAdminQuestion(
  courseId: string, 
  data: {
    question: string;
    type: 'multiple_choice' | 'memory_pair' | 'match_pair';
    options?: string;
    correctAnswer?: string;
    order?: number;
  }
) {
  return apiRequest<any>(`/api/admin/courses/${courseId}/questions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminQuestion(
  questionId: string,
  data: Partial<{
    question: string;
    type: 'multiple_choice' | 'memory_pair' | 'match_pair';
    options?: string;
    correctAnswer?: string;
    order?: number;
  }>
) {
  return apiRequest<any>(`/api/admin/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminQuestion(questionId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/questions/${questionId}`, {
    method: 'DELETE',
  });
}

export async function completeCourse(courseId: string) {
  return apiRequest<{ success: boolean; xpGained: number; totalXp: number }>(
    `/api/courses/${courseId}/complete`,
    { method: 'POST' }
  );
}

// Ranking
export async function getRanking() {
  return apiRequest<{ top10: any[]; userPosition: number; userXp: number }>(
    '/api/student/ranking'
  );
}

// Badges
export async function getBadges() {
  return apiRequest<{
    badges: any[];
    stats: { unlocked: number; total: number; percentage: number };
  }>('/api/student/badges');
}

// Admin - KPI
export async function getKPI() {
  return apiRequest<{
    totalStudents: number;
    totalXp: number;
    activeCourses: number;
    badgesUnlocked: number;
  }>('/api/admin/kpi');
}

// Admin - Courses
export async function createCourse(data: { 
  titre: string; 
  description: string; 
  matiereId?: string;
  gameType?: 'quiz' | 'memory' | 'match';
  theoreticalContent?: string;
  xpReward: number;
}) {
  return apiRequest<any>('/api/admin/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(courseId: string, data: Partial<{ 
  titre: string; 
  description: string; 
  matiereId?: string;
  gameType?: 'quiz' | 'memory' | 'match';
  theoreticalContent?: string;
  xpReward: number;
}>) {
  return apiRequest<any>(`/api/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(courseId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/courses/${courseId}`, {
    method: 'DELETE',
  });
}

// Admin - Badges
export async function getAdminBadges() {
  return apiRequest<any[]>('/api/admin/badges');
}

export async function createBadge(data: {
  name: string;
  icon: string;
  description: string;
  thresholdXp?: number;
  conditionType: 'xp' | 'top10' | 'courses_completed' | 'streak';
  conditionValue?: number;
}) {
  return apiRequest<any>('/api/admin/badges', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBadge(badgeId: string, data: Partial<{
  name: string;
  icon: string;
  description: string;
  thresholdXp?: number;
  conditionType: 'xp' | 'top10' | 'courses_completed' | 'streak';
  conditionValue?: number;
}>) {
  return apiRequest<any>(`/api/admin/badges/${badgeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBadge(badgeId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/badges/${badgeId}`, {
    method: 'DELETE',
  });
}

// Student - Skins
export async function getMySkins() {
  return apiRequest<{ skins: any[]; activeSkin: any | null }>('/api/student/skins');
}

export async function activateSkin(skinId: string) {
  return apiRequest<{ success: boolean }>('/api/student/shop/activate-skin', {
    method: 'POST',
    body: JSON.stringify({ skinId }),
  });
}

// Student - Public Profile
export async function getPublicProfile(userId: string) {
  return apiRequest<any>(`/api/student/profile/${userId}`);
}

// Student - Friends
export async function getFriends() {
  return apiRequest<{ friends: any[] }>('/api/student/friends');
}

export async function getFriendRequests() {
  return apiRequest<{ received: any[]; sent: any[] }>('/api/student/friends/requests');
}

export async function sendFriendRequest(toUserId: string) {
  return apiRequest<{ success: boolean; requestId: string }>('/api/student/friends/request', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  });
}

export async function acceptFriendRequest(requestId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/friends/accept/${requestId}`, {
    method: 'POST',
  });
}

export async function rejectFriendRequest(requestId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/friends/reject/${requestId}`, {
    method: 'POST',
  });
}

export async function removeFriend(friendId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/friends/${friendId}`, {
    method: 'DELETE',
  });
}

export async function getFriendActivity(friendId: string) {
  return apiRequest<any>(`/api/student/friends/${friendId}/activity`);
}

// Student - Clans
export async function getClans() {
  return apiRequest<any[]>('/api/student/clans');
}

export async function getClansByMatiere(matiereId: string) {
  return apiRequest<any[]>(`/api/student/clans/${matiereId}`);
}

export async function getMyClans() {
  return apiRequest<{ clansByMatiere: Record<string, any[]> }>('/api/student/clans/my');
}

export async function getClanDetails(clanId: string) {
  return apiRequest<any>(`/api/student/clans/details/${clanId}`);
}

export async function joinClan(clanId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/clans/${clanId}/join`, {
    method: 'POST',
  });
}

export async function leaveClan(clanId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/clans/${clanId}/leave`, {
    method: 'POST',
  });
}

export async function createClan(data: { name: string; matiereId: string; description?: string }) {
  return apiRequest<any>('/api/student/clans/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Admin - Sessions
export async function createSession(courseId: string) {
  return apiRequest<any>('/api/admin/sessions', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  });
}

export async function getSessions() {
  return apiRequest<any[]>('/api/admin/sessions');
}

export async function stopSession(sessionId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/sessions/${sessionId}/stop`, {
    method: 'POST',
  });
}

export async function getSessionAttendances(sessionId: string) {
  return apiRequest<any[]>(`/api/admin/sessions/${sessionId}/attendances`);
}

// Student - Sessions
export async function checkInSession(code: string) {
  return apiRequest<{ success: boolean; message: string; sessionId: string }>('/api/student/sessions/checkin', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getSessionByCode(code: string) {
  return apiRequest<any>(`/api/student/sessions/code/${code}`);
}

export async function getSessionStatus(sessionId: string) {
  return apiRequest<{ status: string; startedAt?: number }>(`/api/student/sessions/${sessionId}/status`);
}

export async function submitSessionAnswer(sessionId: string, questionId: string, answer: string) {
  return apiRequest<{ success: boolean; isCorrect: boolean }>('/api/student/sessions/answer', {
    method: 'POST',
    body: JSON.stringify({ sessionId, questionId, answer }),
  });
}

export async function getSessionRanking(sessionId: string) {
  return apiRequest<any[]>(`/api/student/sessions/${sessionId}/ranking`);
}

// Admin - Sessions
export async function startSessionQuiz(sessionId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/sessions/${sessionId}/start`, {
    method: 'POST',
  });
}

// Student - Stress
export async function submitStressLevel(courseId: string | null, levelBefore: number, levelAfter: number) {
  return apiRequest<{ success: boolean }>('/api/student/stress', {
    method: 'POST',
    body: JSON.stringify({ courseId, levelBefore, levelAfter }),
  });
}

// Student - Duels
export async function deleteDuel(duelId: string) {
  return apiRequest<{ success: boolean }>(`/api/student/duels/${duelId}`, {
    method: 'DELETE',
  });
}

export async function getDuelStats() {
  return apiRequest<{
    totalDuels: number;
    finishedDuels: number;
    wins: number;
    losses: number;
    winRate: number;
    bananasWon: number;
    bananasLost: number;
    netBananas: number;
    recentDuels: any[];
  }>('/api/student/duels/stats');
}

// Student - Clan Wars
export async function getCurrentClanWars(matiereId?: string) {
  const url = matiereId 
    ? `/api/student/clans/wars/current?matiereId=${matiereId}`
    : '/api/student/clans/wars/current';
  return apiRequest<{ war?: any; wars?: any[] }>(url);
}

export async function getClanWar(warId: string) {
  return apiRequest<{ war: any; ranking: any[] }>(`/api/student/clans/wars/${warId}`);
}

export async function getClanWarHistory(matiereId?: string) {
  const url = matiereId
    ? `/api/student/clans/wars/history?matiereId=${matiereId}`
    : '/api/student/clans/wars/history';
  return apiRequest<any[]>(url);
}

export async function getClanWarContributions(clanId: string) {
  return apiRequest<{ war: any; contributions: any[]; total: number }>(`/api/student/clans/${clanId}/war-contributions`);
}

// Admin - Clan Wars
export async function getClanWarsConfig() {
  return apiRequest<Record<string, { value: string; description?: string }>>('/api/admin/clan-wars/config');
}

export async function updateClanWarsConfig(key: string, value: string, description?: string) {
  return apiRequest<{ success: boolean }>('/api/admin/clan-wars/config', {
    method: 'PUT',
    body: JSON.stringify({ key, value, description }),
  });
}

export async function getClanWarsStats() {
  return apiRequest<any>('/api/admin/clan-wars/stats');
}

export async function getAdminClanWars(status?: string) {
  const url = status ? `/api/admin/clan-wars?status=${status}` : '/api/admin/clan-wars';
  return apiRequest<any[]>(url);
}

export async function createClanWar(data: { matiereId: string; weekStart?: string; weekEnd?: string }) {
  return apiRequest<any>('/api/admin/clan-wars/manual-create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function finishClanWar(warId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/clan-wars/${warId}/finish`, {
    method: 'POST',
  });
}

// Admin - Clan Members
export async function getAdminClanMembers() {
  return apiRequest<any[]>('/api/admin/clans/members');
}

export async function deleteClanMembership(membershipId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/clans/members/${membershipId}`, {
    method: 'DELETE',
  });
}

