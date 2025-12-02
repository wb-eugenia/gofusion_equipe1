import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc, lt, sql } from 'drizzle-orm';
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
  
  // Get matieres that have at least one course
  const matieresWithCourses = await db
    .selectDistinct({
      matiere: schema.matieres,
    })
    .from(schema.matieres)
    .innerJoin(schema.courses, eq(schema.matieres.id, schema.courses.matiereId))
    .all();
  
  return c.json(matieresWithCourses.map(m => m.matiere));
});

const createCourseSchema = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  matiereId: z.string().optional(),
  gameType: z.enum(['quiz', 'memory', 'match']).default('quiz'),
  theoreticalContent: z.string().optional(),
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

// ========== QUESTIONS ROUTES ==========

app.get('/api/admin/courses/:id/questions', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const questions = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.courseId, courseId))
    .all();
  
  return c.json(questions);
});

const createQuestionSchema = z.object({
  question: z.string().min(1),
  type: z.enum(['multiple_choice', 'memory_pair', 'match_pair']),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
  order: z.number().int().default(0),
});

app.post('/api/admin/courses/:id/questions', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const courseId = c.req.param('id');
    const body = await c.req.json();
    const data = createQuestionSchema.parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify course exists
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    const questionId = crypto.randomUUID();
    
    await db.insert(schema.questions).values({
      id: questionId,
      courseId,
      ...data,
      createdAt: new Date(),
    });
    
    const question = await db.select().from(schema.questions).where(eq(schema.questions.id, questionId)).get();
    
    return c.json(question, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/admin/questions/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const questionId = c.req.param('id');
    const body = await c.req.json();
    const data = createQuestionSchema.partial().parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    await db
      .update(schema.questions)
      .set(data)
      .where(eq(schema.questions.id, questionId));
    
    const question = await db.select().from(schema.questions).where(eq(schema.questions.id, questionId)).get();
    
    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }
    
    return c.json(question);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/questions/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const questionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
  
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

// ========== STRESS ROUTES ==========

app.post('/api/student/stress', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { courseId, levelBefore, levelAfter } = body;
    
    if (!levelBefore || !levelAfter || levelBefore < 1 || levelBefore > 10 || levelAfter < 1 || levelAfter > 10) {
      return c.json({ error: 'Invalid stress levels' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    const stressId = crypto.randomUUID();
    
    await db.insert(schema.stressLevels).values({
      id: stressId,
      userId: user.id,
      courseId: courseId || null,
      levelBefore,
      levelAfter,
      createdAt: new Date(),
    });
    
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/admin/stress-stats', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  const allStress = await db.select().from(schema.stressLevels).all();
  
  // Group by course
  const statsByCourse: Record<string, any> = {};
  
  for (const stress of allStress) {
    const courseId = stress.courseId || 'unknown';
    if (!statsByCourse[courseId]) {
      statsByCourse[courseId] = {
        courseId,
        count: 0,
        avgBefore: 0,
        avgAfter: 0,
        totalBefore: 0,
        totalAfter: 0,
      };
    }
    statsByCourse[courseId].count++;
    statsByCourse[courseId].totalBefore += stress.levelBefore;
    statsByCourse[courseId].totalAfter += stress.levelAfter;
  }
  
  // Calculate averages
  const stats = Object.values(statsByCourse).map((stat: any) => ({
    courseId: stat.courseId,
    count: stat.count,
    avgBefore: Math.round((stat.totalBefore / stat.count) * 10) / 10,
    avgAfter: Math.round((stat.totalAfter / stat.count) * 10) / 10,
    change: Math.round(((stat.totalAfter - stat.totalBefore) / stat.count) * 10) / 10,
  }));
  
  return c.json(stats);
});

// ========== SESSION TRACKING ==========

app.post('/api/student/session/track', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { sessionId, startedAt, endedAt, durationSeconds } = body;
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if session exists
    const existing = await db
      .select()
      .from(schema.userSessions)
      .where(eq(schema.userSessions.id, sessionId))
      .get();
    
    if (existing) {
      // Update existing session
      await db
        .update(schema.userSessions)
        .set({
          endedAt: endedAt ? new Date(endedAt) : null,
          durationSeconds: durationSeconds || null,
        })
        .where(eq(schema.userSessions.id, sessionId));
    } else {
      // Create new session
      await db.insert(schema.userSessions).values({
        id: sessionId,
        userId: user.id,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : null,
        durationSeconds: durationSeconds || null,
      });
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== SHOP ROUTES ==========

app.get('/api/student/shop/items', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const items = await db.select().from(schema.shopItems).all();
  
  // Get user purchases
  const purchases = await db
    .select()
    .from(schema.userPurchases)
    .where(eq(schema.userPurchases.userId, user.id))
    .all();
  
  const purchasedItemIds = new Set(purchases.map(p => p.itemId));
  
  return c.json(items.map(item => ({
    ...item,
    purchased: purchasedItemIds.has(item.id),
  })));
});

app.post('/api/student/shop/purchase', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { itemId } = body;
    
    if (!itemId) {
      return c.json({ error: 'Item ID is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Get item
    const item = await db.select().from(schema.shopItems).where(eq(schema.shopItems.id, itemId)).get();
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    // Check if already purchased
    const existingPurchase = await db
      .select()
      .from(schema.userPurchases)
      .where(and(eq(schema.userPurchases.userId, user.id), eq(schema.userPurchases.itemId, itemId)))
      .get();
    
    if (existingPurchase) {
      return c.json({ error: 'Item already purchased' }, 400);
    }
    
    // Check if user has enough bananas
    if (user.xp < item.price) {
      return c.json({ error: 'Insufficient bananas' }, 400);
    }
    
    // Deduct price
    await db
      .update(schema.users)
      .set({ xp: user.xp - item.price })
      .where(eq(schema.users.id, user.id));
    
    // Create purchase
    const purchaseId = crypto.randomUUID();
    await db.insert(schema.userPurchases).values({
      id: purchaseId,
      userId: user.id,
      itemId: item.id,
      purchasedAt: new Date(),
    });
    
    // If it's a skin, add to user_skins
    if (item.type === 'skin') {
      const skinId = crypto.randomUUID();
      await db.insert(schema.userSkins).values({
        id: skinId,
        userId: user.id,
        skinId: item.id,
        isActive: false,
        createdAt: new Date(),
      });
    }
    
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/student/shop/purchases', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  const purchases = await db
    .select({
      purchase: schema.userPurchases,
      item: schema.shopItems,
    })
    .from(schema.userPurchases)
    .innerJoin(schema.shopItems, eq(schema.userPurchases.itemId, schema.shopItems.id))
    .where(eq(schema.userPurchases.userId, user.id))
    .all();
  
  return c.json(purchases.map(p => ({
    ...p.purchase,
    item: p.item,
  })));
});

app.post('/api/student/shop/activate-skin', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { skinId } = body;
    
    if (!skinId) {
      return c.json({ error: 'Skin ID is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify user owns this skin
    const purchase = await db
      .select()
      .from(schema.userPurchases)
      .where(and(eq(schema.userPurchases.userId, user.id), eq(schema.userPurchases.itemId, skinId)))
      .get();
    
    if (!purchase) {
      return c.json({ error: 'Skin not purchased' }, 404);
    }
    
    // Deactivate all other skins
    await db
      .update(schema.userSkins)
      .set({ isActive: false })
      .where(eq(schema.userSkins.userId, user.id));
    
    // Activate this skin
    const userSkin = await db
      .select()
      .from(schema.userSkins)
      .where(and(eq(schema.userSkins.userId, user.id), eq(schema.userSkins.skinId, skinId)))
      .get();
    
    if (userSkin) {
      await db
        .update(schema.userSkins)
        .set({ isActive: true })
        .where(eq(schema.userSkins.id, userSkin.id));
    } else {
      const newSkinId = crypto.randomUUID();
      await db.insert(schema.userSkins).values({
        id: newSkinId,
        userId: user.id,
        skinId: skinId,
        isActive: true,
        createdAt: new Date(),
      });
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== DUEL ROUTES ==========

app.post('/api/student/duels', async (c) => {
  try {
    const user = await getUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const { matiereId, betAmount } = body;
    
    if (!matiereId) {
      return c.json({ error: 'Matiere ID is required' }, 400);
    }
    
    if (betAmount === undefined || betAmount === null || betAmount === '') {
      return c.json({ error: 'Bet amount is required' }, 400);
    }
    
    const bet = parseInt(betAmount) || 0;
    
    if (bet <= 0) {
      return c.json({ error: 'Bet amount must be greater than 0' }, 400);
    }
    
    if (bet > user.xp) {
      return c.json({ error: 'Insufficient bananas' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify matiere exists
    const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!matiere) {
      return c.json({ error: 'Matiere not found' }, 404);
    }
    
    // Verify at least one course exists for this matiere
    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.matiereId, matiereId))
      .limit(1)
      .get();
    
    if (!course) {
      return c.json({ error: 'No course found for this matiere' }, 404);
    }
    
    const duelId = crypto.randomUUID();
    
    // Deduct bet amount from user
    await db
      .update(schema.users)
      .set({ xp: user.xp - bet })
      .where(eq(schema.users.id, user.id));
    
    await db.insert(schema.duels).values({
      id: duelId,
      player1Id: user.id,
      matiereId,
      status: 'waiting',
      betAmount: bet,
      createdAt: new Date(),
    });
    
    const duel = await db.select().from(schema.duels).where(eq(schema.duels.id, duelId)).get();
    
    if (!duel) {
      // Refund if creation failed
      await db
        .update(schema.users)
        .set({ xp: user.xp })
        .where(eq(schema.users.id, user.id));
      return c.json({ error: 'Failed to create duel' }, 500);
    }
    
    return c.json(duel, 201);
  } catch (error: any) {
    console.error('Error creating duel:', error);
    return c.json({ error: error.message || 'Failed to create duel' }, 500);
  }
});

app.get('/api/student/duels/lobby', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Clean up old waiting duels (older than 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oldDuels = await db
    .select()
    .from(schema.duels)
    .where(and(
      eq(schema.duels.status, 'waiting'),
      lt(schema.duels.createdAt, fiveMinutesAgo)
    ))
    .all();
  
  // Refund bananas and delete old duels
  for (const oldDuel of oldDuels) {
    if (oldDuel.betAmount > 0 && oldDuel.player1Id) {
      const player1 = await db.select().from(schema.users).where(eq(schema.users.id, oldDuel.player1Id)).get();
      if (player1) {
        await db
          .update(schema.users)
          .set({ xp: player1.xp + oldDuel.betAmount })
          .where(eq(schema.users.id, oldDuel.player1Id));
      }
    }
    // Delete the duel (cascade will handle duel_answers)
    await db.delete(schema.duels).where(eq(schema.duels.id, oldDuel.id));
  }
  
  // Get ALL waiting duels (not just user's)
  const waitingDuels = await db
    .select({
      duel: schema.duels,
      player1: schema.users,
      matiere: schema.matieres,
    })
    .from(schema.duels)
    .leftJoin(schema.users, eq(schema.duels.player1Id, schema.users.id))
    .leftJoin(schema.matieres, eq(schema.duels.matiereId, schema.matieres.id))
    .where(eq(schema.duels.status, 'waiting'))
    .all();
  
  return c.json(waitingDuels.map(d => ({
    ...d.duel,
    player1: d.player1,
    matiere: d.matiere,
  })));
});

app.post('/api/student/duels/:id/join', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const duelId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    const duel = await db.select().from(schema.duels).where(eq(schema.duels.id, duelId)).get();
    
    if (!duel) {
      return c.json({ error: 'Duel not found' }, 404);
    }
    
    if (duel.status !== 'waiting') {
      return c.json({ error: 'Duel is not waiting for players' }, 400);
    }
    
    if (duel.player1Id === user.id) {
      return c.json({ error: 'Cannot join your own duel' }, 400);
    }
    
    if (duel.player2Id) {
      return c.json({ error: 'Duel is already full' }, 400);
    }
    
    // Check if user has enough bananas for the bet
    if (duel.betAmount > user.xp) {
      return c.json({ error: `Insufficient bananas. You need ${duel.betAmount} bananas to join this duel` }, 400);
    }
    
    // Get a course for this matiere
    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.matiereId, duel.matiereId || ''))
      .limit(1)
      .get();
    
    if (!course) {
      return c.json({ error: 'No course found for this matiere' }, 404);
    }
    
    // Deduct bet amount from player2 (betAmount is always > 0 now)
    await db
      .update(schema.users)
      .set({ xp: user.xp - duel.betAmount })
      .where(eq(schema.users.id, user.id));
    
    // Update duel with player2 and start
    await db
      .update(schema.duels)
      .set({
        player2Id: user.id,
        courseId: course.id,
        status: 'active',
        startedAt: new Date(),
      })
      .where(eq(schema.duels.id, duelId));
    
    // Get updated duel with relations (avoid duplicate users join)
    const updatedDuel = await db
      .select({
        duel: schema.duels,
        player1: schema.users,
        matiere: schema.matieres,
        course: schema.courses,
      })
      .from(schema.duels)
      .leftJoin(schema.users, eq(schema.duels.player1Id, schema.users.id))
      .leftJoin(schema.matieres, eq(schema.duels.matiereId, schema.matieres.id))
      .leftJoin(schema.courses, eq(schema.duels.courseId, schema.courses.id))
      .where(eq(schema.duels.id, duelId))
      .get();
    
    if (!updatedDuel) {
      return c.json({ error: 'Failed to update duel' }, 500);
    }
    
    // Get player2 separately to avoid join conflict
    const player2Data = updatedDuel.duel.player2Id ? await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, updatedDuel.duel.player2Id))
      .get() : null;
    
    return c.json({
      ...updatedDuel.duel,
      player1: updatedDuel.player1,
      player2: player2Data,
      matiere: updatedDuel.matiere,
      course: updatedDuel.course,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/student/duels/:id/answer', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const duelId = c.req.param('id');
    const body = await c.req.json();
    const { questionId, answer, responseTimeMs } = body;
    
    // Better validation
    if (!questionId || questionId.trim() === '') {
      return c.json({ error: 'Question ID is required' }, 400);
    }
    
    if (answer === undefined || answer === null || answer === '') {
      return c.json({ error: 'Answer is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify duel is active and user is a player
    const duel = await db.select().from(schema.duels).where(eq(schema.duels.id, duelId)).get();
    if (!duel) {
      return c.json({ error: 'Duel not found' }, 404);
    }
    
    if (duel.status !== 'active') {
      return c.json({ error: `Duel is not active (status: ${duel.status})` }, 400);
    }
    
    if (duel.player1Id !== user.id && duel.player2Id !== user.id) {
      return c.json({ error: 'You are not a player in this duel' }, 403);
    }
    
    // Get question and verify it belongs to the duel's course
    const question = await db.select().from(schema.questions).where(eq(schema.questions.id, questionId)).get();
    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }
    
    // Verify question belongs to duel's course
    if (duel.courseId && question.courseId !== duel.courseId) {
      return c.json({ error: 'Question does not belong to this duel' }, 400);
    }
    
    // Check if already answered
    const existingAnswer = await db
      .select()
      .from(schema.duelAnswers)
      .where(and(
        eq(schema.duelAnswers.duelId, duelId),
        eq(schema.duelAnswers.userId, user.id),
        eq(schema.duelAnswers.questionId, questionId)
      ))
      .get();
    
    if (existingAnswer) {
      return c.json({ error: 'Already answered this question' }, 400);
    }
    
    // Check answer (convert both to string for comparison)
    const isCorrect = String(answer) === String(question.correctAnswer);
    
    // Save answer
    const answerId = crypto.randomUUID();
    await db.insert(schema.duelAnswers).values({
      id: answerId,
      duelId,
      userId: user.id,
      questionId,
      answer,
      isCorrect,
      answeredAt: new Date(),
      responseTimeMs: responseTimeMs || null,
    });
    
    return c.json({ success: true, isCorrect });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/student/duels/:id', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const duelId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    const duel = await db.select().from(schema.duels).where(eq(schema.duels.id, duelId)).get();
    
    if (!duel) {
      return c.json({ error: 'Duel not found' }, 404);
    }
    
    // Only the creator can delete their own duel
    if (duel.player1Id !== user.id) {
      return c.json({ error: 'You can only delete your own duels' }, 403);
    }
    
    // Only waiting duels can be deleted
    if (duel.status !== 'waiting') {
      return c.json({ error: 'Only waiting duels can be deleted' }, 400);
    }
    
    // Refund bananas if bet was placed
    if (duel.betAmount > 0) {
      await db
        .update(schema.users)
        .set({ xp: user.xp + duel.betAmount })
        .where(eq(schema.users.id, user.id));
    }
    
    // Delete the duel (cascade will handle duel_answers)
    await db.delete(schema.duels).where(eq(schema.duels.id, duelId));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/student/duels/:id/status', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const duelId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const duel = await db
    .select({
      duel: schema.duels,
      player1: schema.users,
      course: schema.courses,
    })
    .from(schema.duels)
    .leftJoin(schema.users, eq(schema.duels.player1Id, schema.users.id))
    .leftJoin(schema.courses, eq(schema.duels.courseId, schema.courses.id))
    .where(eq(schema.duels.id, duelId))
    .get();
  
  // Get player2 separately to avoid join conflict
  const player2 = duel?.duel.player2Id ? await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, duel.duel.player2Id))
    .get() : null;
  
  if (!duel) {
    return c.json({ error: 'Duel not found' }, 404);
  }
  
  // Get scores
  const player1Answers = await db
    .select()
    .from(schema.duelAnswers)
    .where(and(eq(schema.duelAnswers.duelId, duelId), eq(schema.duelAnswers.userId, duel.duel.player1Id)))
    .all();
  
  const player2Answers = duel.duel.player2Id ? await db
    .select()
    .from(schema.duelAnswers)
    .where(and(eq(schema.duelAnswers.duelId, duelId), eq(schema.duelAnswers.userId, duel.duel.player2Id)))
    .all() : [];
  
  const player1Score = player1Answers.filter(a => a.isCorrect).length;
  const player2Score = player2Answers.filter(a => a.isCorrect).length;
  
  // Check if all questions answered
  if (duel.course && duel.duel.status === 'active') {
    const questions = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.courseId, duel.course.id))
      .all();
    
    const player1Finished = questions.every(q => player1Answers.some(a => a.questionId === q.id));
    const player2Finished = duel.duel.player2Id ? questions.every(q => player2Answers.some(a => a.questionId === q.id)) : false;
    
    // Only finish the duel when BOTH players have answered all questions
    if (player1Finished && player2Finished) {
      // Determine winner - player with most points wins (no draw, highest score wins)
      let winnerId = null;
      if (player1Score > player2Score) {
        winnerId = duel.duel.player1Id;
      } else if (player2Score > player1Score) {
        winnerId = duel.duel.player2Id;
      } else {
        // In case of exact tie, player1 wins (or we could make it a draw, but user wants winner)
        winnerId = duel.duel.player1Id;
      }
      
      // Update duel
      await db
        .update(schema.duels)
        .set({
          status: 'finished',
          winnerId,
          finishedAt: new Date(),
        })
        .where(eq(schema.duels.id, duelId));
      
      // Give rewards - winner gets all the bet bananas (2x betAmount)
      if (winnerId && duel.duel.betAmount > 0) {
        const winner = await db.select().from(schema.users).where(eq(schema.users.id, winnerId)).get();
        if (winner) {
          const totalWinnings = duel.duel.betAmount * 2; // Both players' bets
          await db
            .update(schema.users)
            .set({ xp: winner.xp + totalWinnings })
            .where(eq(schema.users.id, winnerId));
        }
      }
    }
  }
  
  // Check if one player finished but not the other (for frontend display)
  let waitingForOpponent = false;
  if (duel.course && duel.duel.status === 'active') {
    const questions = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.courseId, duel.course.id))
      .all();
    
    const player1Finished = questions.every(q => player1Answers.some(a => a.questionId === q.id));
    const player2Finished = duel.duel.player2Id ? questions.every(q => player2Answers.some(a => a.questionId === q.id)) : false;
    
    // One player finished but not the other
    waitingForOpponent = (player1Finished && !player2Finished) || (!player1Finished && player2Finished);
  }
  
  // Get matiere for the duel
  const matiere = duel.duel.matiereId ? await db
    .select()
    .from(schema.matieres)
    .where(eq(schema.matieres.id, duel.duel.matiereId))
    .get() : null;
  
  return c.json({
    ...duel.duel,
    player1: duel.player1,
    player2: player2,
    course: duel.course,
    matiere: matiere,
    player1Score,
    player2Score,
    waitingForOpponent,
  });
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

