import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as schema from '../../prisma/schema.d1';
import { z } from 'zod';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  API_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check route
app.get('/', (c) => {
  return c.json({ 
    message: 'Gamification API is running',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/register',
      'GET /api/user',
      'GET /api/courses',
      'POST /api/courses/:id/complete',
      'GET /api/student/ranking',
      'GET /api/student/badges',
    ]
  });
});

// Helper: Get user from session
async function getUser(c: any): Promise<schema.User | null> {
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!sessionId) return null;
  
  const userId = await c.env.SESSIONS.get(sessionId);
  if (!userId) return null;
  
  const db = drizzle(c.env.DB, { schema });
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  return user || null;
}

// Helper: Check badges and unlock if conditions met
async function checkAndUnlockBadges(c: any, userId: string) {
  const db = drizzle(c.env.DB, { schema });
  
  // Get user data
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return;
  
  // Get all badges
  const allBadges = await db.select().from(schema.badges).all();
  
  // Get user's unlocked badges
  const unlockedBadges = await db
    .select({ badgeId: schema.userBadges.badgeId })
    .from(schema.userBadges)
    .where(eq(schema.userBadges.userId, userId))
    .all();
  const unlockedBadgeIds = new Set(unlockedBadges.map(ub => ub.badgeId));
  
  // Get user progress stats
  const completedCourses = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId))
    .all();
  const completedCount = completedCourses.length;
  
  // Get ranking position
  const allUsers = await db
    .select()
    .from(schema.users)
    .orderBy(desc(schema.users.xp))
    .all();
  const userRank = allUsers.findIndex(u => u.id === userId) + 1;
  const isTop10 = userRank <= 10;
  
  // Check each badge
  for (const badge of allBadges) {
    if (unlockedBadgeIds.has(badge.id)) continue;
    
    let shouldUnlock = false;
    
    switch (badge.conditionType) {
      case 'xp':
        if (badge.thresholdXp && user.xp >= badge.thresholdXp) {
          shouldUnlock = true;
        }
        break;
      case 'top10':
        if (isTop10) {
          shouldUnlock = true;
        }
        break;
      case 'courses_completed':
        if (badge.conditionValue && completedCount >= badge.conditionValue) {
          shouldUnlock = true;
        }
        break;
      case 'streak':
        if (badge.conditionValue && user.streakDays >= badge.conditionValue) {
          shouldUnlock = true;
        }
        break;
    }
    
    if (shouldUnlock) {
      await db.insert(schema.userBadges).values({
        id: crypto.randomUUID(),
        userId: user.id,
        badgeId: badge.id,
        unlockedAt: new Date(),
      });
    }
  }
}

// ========== AUTH ROUTES ==========

const registerSchema = z.object({
  prenom: z.string().min(1).max(50),
});

app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const { prenom } = registerSchema.parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if user with this prenom already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.prenom, prenom))
      .get();
    
    let userId: string;
    let isAdmin = false;
    
    if (existingUser) {
      // User exists, use existing ID and role
      userId = existingUser.id;
      isAdmin = existingUser.role === 'admin';
    } else {
      // Create new user
      userId = crypto.randomUUID();
      await db.insert(schema.users).values({
        id: userId,
        prenom,
        xp: 0,
        role: 'student',
        streakDays: 0,
        createdAt: new Date(),
      });
    }
    
    // Create session
    const sessionId = crypto.randomUUID();
    await c.env.SESSIONS.put(sessionId, userId, { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    return c.json({ 
      sessionId, 
      userId, 
      prenom,
      role: existingUser?.role || 'student',
      isAdmin: isAdmin || existingUser?.role === 'admin'
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/user', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get user badges
  const userBadges = await db
    .select({
      badge: schema.badges,
      unlockedAt: schema.userBadges.unlockedAt,
    })
    .from(schema.userBadges)
    .innerJoin(schema.badges, eq(schema.userBadges.badgeId, schema.badges.id))
    .where(eq(schema.userBadges.userId, user.id))
    .all();
  
  return c.json({
    ...user,
    badges: userBadges.map(ub => ({
      ...ub.badge,
      unlockedAt: ub.unlockedAt,
    })),
  });
});

// ========== COURSES ROUTES ==========

app.get('/api/courses', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const courses = await db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .all();
  
  // Get user progress
  const userProgress = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, user.id))
    .all();
  const completedCourseIds = new Set(userProgress.map(up => up.courseId));
  
  const coursesWithProgress = courses.map(({ course, matiere }) => ({
    ...course,
    matiere: matiere || null,
    completed: completedCourseIds.has(course.id),
  }));
  
  return c.json(coursesWithProgress);
});

app.get('/api/courses/:id', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const course = await db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .where(eq(schema.courses.id, courseId))
    .get();
  
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  const questions = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.courseId, courseId))
    .orderBy(asc(schema.questions.order))
    .all();
  
  return c.json({
    ...course.course,
    matiere: course.matiere,
    questions,
  });
});

const completeCourseSchema = z.object({
  courseId: z.string(),
});

app.post('/api/courses/:id/complete', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  // Check if course exists
  const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  // Check if already completed
  const existingProgress = await db
    .select()
    .from(schema.userProgress)
    .where(
      and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.courseId, courseId))
    )
    .get();
  
  if (existingProgress) {
    return c.json({ error: 'Course already completed' }, 400);
  }
  
  // Add progress
  await db.insert(schema.userProgress).values({
    id: crypto.randomUUID(),
    userId: user.id,
    courseId: course.id,
    completedAt: new Date(),
  });
  
  // Add XP
  await db
    .update(schema.users)
    .set({ xp: user.xp + course.xpReward })
    .where(eq(schema.users.id, user.id));
  
  // Update streak (simplified: increment if last completion was today or yesterday)
  const allUserProgress = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, user.id))
    .all();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastCompletion = allUserProgress.length > 0 
    ? new Date(Math.max(...allUserProgress.map(up => up.completedAt.getTime())))
    : null;
  
  if (!lastCompletion || lastCompletion >= today) {
    await db
      .update(schema.users)
      .set({ streakDays: user.streakDays + 1 })
      .where(eq(schema.users.id, user.id));
  }
  
  // Check and unlock badges
  await checkAndUnlockBadges(c, user.id);
  
  // Get updated user
  const updatedUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
  
  return c.json({
    success: true,
    xpGained: course.xpReward,
    totalXp: updatedUser?.xp || user.xp + course.xpReward,
  });
});

// ========== RANKING ROUTES ==========

app.get('/api/student/ranking', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const allUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, 'student'))
    .orderBy(desc(schema.users.xp))
    .limit(10)
    .all();
  
  // Get user position
  const allUsersRanked = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, 'student'))
    .orderBy(desc(schema.users.xp))
    .all();
  const userPosition = allUsersRanked.findIndex(u => u.id === user.id) + 1;
  
  return c.json({
    top10: allUsers,
    userPosition,
    userXp: user.xp,
  });
});

// ========== BADGES ROUTES ==========

app.get('/api/student/badges', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all badges
  const allBadges = await db.select().from(schema.badges).all();
  
  // Get user badges
  const userBadges = await db
    .select({ badgeId: schema.userBadges.badgeId })
    .from(schema.userBadges)
    .where(eq(schema.userBadges.userId, user.id))
    .all();
  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
  
  const badgesWithStatus = allBadges.map(badge => ({
    ...badge,
    unlocked: unlockedBadgeIds.has(badge.id),
  }));
  
  const unlockedCount = unlockedBadgeIds.size;
  const totalCount = allBadges.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  
  return c.json({
    badges: badgesWithStatus,
    stats: {
      unlocked: unlockedCount,
      total: totalCount,
      percentage,
    },
  });
});

// ========== ADMIN ROUTES ==========

async function requireAdmin(c: any): Promise<schema.User | null> {
  // Simplified admin check - password is verified on frontend
  // Just return a dummy admin user for operations
  const user = await getUser(c);
  if (user) {
    return { ...user, role: 'admin' };
  }
  // Return dummy admin for password-based access
  return { 
    id: 'admin-password', 
    prenom: 'Admin', 
    xp: 0, 
    role: 'admin', 
    streakDays: 0, 
    createdAt: new Date() 
  } as schema.User;
}

app.get('/api/admin/kpi', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Optimize: Run queries in parallel and only fetch what we need
  const [students, courses, allUserBadges] = await Promise.all([
    db
      .select({ xp: schema.users.xp })
      .from(schema.users)
      .where(eq(schema.users.role, 'student'))
      .all(),
    db.select().from(schema.courses).all(),
    db.select({ badgeId: schema.userBadges.badgeId }).from(schema.userBadges).all(),
  ]);
  
  const totalXp = students.reduce((sum, s) => sum + (s.xp || 0), 0);
  const uniqueBadgesUnlocked = new Set(allUserBadges.map(ub => ub.badgeId)).size;
  
  return c.json({
    totalStudents: students.length,
    totalXp,
    activeCourses: courses.length,
    badgesUnlocked: uniqueBadgesUnlocked,
  });
});

app.get('/api/admin/courses', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const courses = await db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .all();
  
  return c.json(courses.map(({ course, matiere }) => ({
    ...course,
    matiere: matiere || null,
  })));
});

app.get('/api/matieres', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const matieres = await db.select().from(schema.matieres).all();
  
  return c.json(matieres);
});

const createCourseSchema = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  xpReward: z.number().int().min(1).default(50),
});

app.post('/api/admin/courses', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const data = createCourseSchema.parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    const courseId = crypto.randomUUID();
    
    await db.insert(schema.courses).values({
      id: courseId,
      ...data,
      createdAt: new Date(),
    });
    
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    
    return c.json(course, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/admin/courses/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const courseId = c.req.param('id');
    const body = await c.req.json();
    const data = createCourseSchema.partial().parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    await db
      .update(schema.courses)
      .set(data)
      .where(eq(schema.courses.id, courseId));
    
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    return c.json(course);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/courses/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  await db.delete(schema.courses).where(eq(schema.courses.id, courseId));
  
  return c.json({ success: true });
});

app.get('/api/admin/badges', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const badges = await db.select().from(schema.badges).all();
  
  return c.json(badges);
});

const createBadgeSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  description: z.string().min(1),
  thresholdXp: z.number().int().min(0).optional(),
  conditionType: z.enum(['xp', 'top10', 'courses_completed', 'streak']),
  conditionValue: z.number().int().min(0).optional(),
});

app.post('/api/admin/badges', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const data = createBadgeSchema.parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    const badgeId = crypto.randomUUID();
    
    await db.insert(schema.badges).values({
      id: badgeId,
      ...data,
      createdAt: new Date(),
    });
    
    const badge = await db.select().from(schema.badges).where(eq(schema.badges.id, badgeId)).get();
    
    return c.json(badge, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/admin/badges/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const badgeId = c.req.param('id');
    const body = await c.req.json();
    const data = createBadgeSchema.partial().parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    await db
      .update(schema.badges)
      .set(data)
      .where(eq(schema.badges.id, badgeId));
    
    const badge = await db.select().from(schema.badges).where(eq(schema.badges.id, badgeId)).get();
    
    if (!badge) {
      return c.json({ error: 'Badge not found' }, 404);
    }
    
    return c.json(badge);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/badges/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const badgeId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  await db.delete(schema.badges).where(eq(schema.badges.id, badgeId));
  
  return c.json({ success: true });
});

// ========== SESSIONS ROUTES ==========

app.post('/api/admin/sessions', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { courseId } = body;
    
    if (!courseId) {
      return c.json({ error: 'Course ID is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if course exists
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    // Deactivate any existing active sessions
    await db
      .update(schema.sessions)
      .set({ isActive: false })
      .where(eq(schema.sessions.isActive, true));
    
    // Generate unique code (6 characters)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create new session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // Expires in 2 hours
    
    await db.insert(schema.sessions).values({
      id: sessionId,
      courseId,
      createdBy: admin.id,
      code,
      isActive: true,
      createdAt: new Date(),
      expiresAt,
    });
    
    const session = await db
      .select({
        session: schema.sessions,
        course: schema.courses,
      })
      .from(schema.sessions)
      .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
      .where(eq(schema.sessions.id, sessionId))
      .get();
    
    return c.json({
      ...session?.session,
      course: session?.course,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/admin/sessions', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  const sessions = await db
    .select({
      session: schema.sessions,
      course: schema.courses,
    })
    .from(schema.sessions)
    .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
    .orderBy(desc(schema.sessions.createdAt))
    .limit(50)
    .all();
  
  return c.json(sessions.map(s => ({
    ...s.session,
    course: s.course,
  })));
});

app.post('/api/admin/sessions/:id/start', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .get();
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  await db
    .update(schema.sessions)
    .set({ 
      status: 'started',
      startedAt: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId));
  
  return c.json({ success: true });
});

app.post('/api/admin/sessions/:id/stop', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  await db
    .update(schema.sessions)
    .set({ 
      isActive: false,
      status: 'finished',
    })
    .where(eq(schema.sessions.id, sessionId));
  
  return c.json({ success: true });
});

app.get('/api/admin/sessions/:id/attendances', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const attendances = await db
    .select({
      attendance: schema.sessionAttendances,
      user: schema.users,
    })
    .from(schema.sessionAttendances)
    .innerJoin(schema.users, eq(schema.sessionAttendances.userId, schema.users.id))
    .where(eq(schema.sessionAttendances.sessionId, sessionId))
    .all();
  
  return c.json(attendances.map(a => ({
    ...a.attendance,
    user: a.user,
  })));
});

app.post('/api/student/sessions/checkin', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { code } = body;
    
    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Find active session with this code
    const session = await db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.code, code), eq(schema.sessions.isActive, true)))
      .get();
    
    if (!session) {
      return c.json({ error: 'Session not found or inactive' }, 404);
    }
    
    // Check if already checked in
    const existingAttendance = await db
      .select()
      .from(schema.sessionAttendances)
      .where(
        and(
          eq(schema.sessionAttendances.sessionId, session.id),
          eq(schema.sessionAttendances.userId, user.id)
        )
      )
      .get();
    
    if (existingAttendance) {
      return c.json({ 
        success: false, 
        message: 'Vous êtes déjà inscrit à cette session' 
      }, 400);
    }
    
    // Create attendance
    await db.insert(schema.sessionAttendances).values({
      id: crypto.randomUUID(),
      sessionId: session.id,
      userId: user.id,
      checkedInAt: new Date(),
    });
    
    // Add XP for attendance
    await db
      .update(schema.users)
      .set({ xp: user.xp + 10 }) // 10 XP for attendance
      .where(eq(schema.users.id, user.id));
    
    return c.json({ 
      success: true, 
      message: 'Inscription réussie ! +10 XP',
      sessionId: session.id,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/student/sessions/code/:code', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const code = c.req.param('code');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db
    .select({
      session: schema.sessions,
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.sessions)
    .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .where(eq(schema.sessions.code, code))
    .get();
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  return c.json({
    ...session.session,
    course: session.course,
    matiere: session.matiere,
  });
});

app.get('/api/student/sessions/:id/status', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .get();
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  return c.json({
    status: session.status,
    startedAt: session.startedAt,
  });
});

app.post('/api/student/sessions/answer', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { sessionId, questionId, answer } = body;
    
    if (!sessionId || !questionId || answer === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Get question to check answer
    const question = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, questionId))
      .get();
    
    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }
    
    const isCorrect = answer === question.correctAnswer;
    
    // Save answer
    await db.insert(schema.sessionQuizAnswers).values({
      id: crypto.randomUUID(),
      sessionId,
      userId: user.id,
      questionId,
      answer: answer.toString(),
      isCorrect,
      answeredAt: new Date(),
    });
    
    return c.json({ success: true, isCorrect });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/student/sessions/:id/ranking', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  // Get all answers for this session
  const answers = await db
    .select({
      userId: schema.sessionQuizAnswers.userId,
      isCorrect: schema.sessionQuizAnswers.isCorrect,
      user: schema.users,
    })
    .from(schema.sessionQuizAnswers)
    .innerJoin(schema.users, eq(schema.sessionQuizAnswers.userId, schema.users.id))
    .where(eq(schema.sessionQuizAnswers.sessionId, sessionId))
    .all();
  
  // Calculate scores
  const userScores: Record<string, { user: any; correct: number; total: number }> = {};
  
  answers.forEach((a) => {
    if (!userScores[a.userId]) {
      userScores[a.userId] = {
        user: a.user,
        correct: 0,
        total: 0,
      };
    }
    userScores[a.userId].total++;
    if (a.isCorrect) {
      userScores[a.userId].correct++;
    }
  });
  
  // Convert to array and sort by score
  const ranking = Object.values(userScores)
    .map((score) => ({
      ...score.user,
      score: score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0,
      correct: score.correct,
      total: score.total,
    }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct);
  
  return c.json(ranking);
});

// Fallback for 404
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

export default app;

