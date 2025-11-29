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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
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
export async function getCourses() {
  return apiRequest<any[]>('/api/courses');
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
export async function createCourse(data: { titre: string; description: string; xpReward: number }) {
  return apiRequest<any>('/api/admin/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(courseId: string, data: Partial<{ titre: string; description: string; xpReward: number }>) {
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
  return apiRequest<{ success: boolean; message: string }>('/api/student/sessions/checkin', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

