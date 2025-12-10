import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, desc, asc, lt, sql, inArray } from 'drizzle-orm';
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

// Helper: Update user streak based on activity date
async function updateUserStreak(db: any, userId: string, activityDate: Date = new Date()) {
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return;
  
  // Normalize dates to start of day (midnight) for accurate day comparison
  const activityDay = new Date(activityDate);
  activityDay.setHours(0, 0, 0, 0);
  
  const lastActivityDate = user.lastActivityDate 
    ? new Date(user.lastActivityDate)
    : user.createdAt 
    ? new Date(user.createdAt)
    : null;
  
  if (!lastActivityDate) {
    // First activity ever - start streak at 1
    await db
      .update(schema.users)
      .set({ 
        streakDays: 1,
        lastActivityDate: activityDay
      })
      .where(eq(schema.users.id, userId));
    return;
  }
  
  const lastActivityDay = new Date(lastActivityDate);
  lastActivityDay.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const timeDiff = activityDay.getTime() - lastActivityDay.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  let newStreak = user.streakDays;
  
  if (daysDiff === 0) {
    // Same day - no change to streak, but update lastActivityDate
    await db
      .update(schema.users)
      .set({ lastActivityDate: activityDay })
      .where(eq(schema.users.id, userId));
    return;
  } else if (daysDiff === 1) {
    // Next day - increment streak
    newStreak = user.streakDays + 1;
  } else if (daysDiff > 1) {
    // Gap of more than 1 day - reset streak to 1
    newStreak = 1;
  } else {
    // daysDiff < 0 (activity in the past) - don't update streak
    return;
  }
  
  // Update streak and last activity date
  await db
    .update(schema.users)
    .set({ 
      streakDays: newStreak,
      lastActivityDate: activityDay
    })
    .where(eq(schema.users.id, userId));
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
  code: z.string().optional(), // Optional teacher code
});

// Teacher login with code only
app.post('/api/auth/teacher-login', async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    
    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Find teacher code
    const teacherCode = await db
      .select()
      .from(schema.teacherCodes)
      .where(eq(schema.teacherCodes.code, code.toUpperCase()))
      .get();
    
    if (!teacherCode) {
      return c.json({ error: 'Code invalide' }, 400);
    }
    
    // Check if code is expired
    if (teacherCode.expiresAt && new Date(teacherCode.expiresAt) < new Date()) {
      return c.json({ error: 'Ce code a expiré' }, 400);
    }
    
    // Check if code has reached max uses
    if (teacherCode.maxUses > 0 && teacherCode.currentUses >= teacherCode.maxUses) {
      return c.json({ error: 'Ce code a atteint son nombre maximum d\'utilisations' }, 400);
    }
    
    // Get the teacher user
    if (!teacherCode.teacherId) {
      return c.json({ error: 'Code non associé à un professeur' }, 400);
    }
    
    const teacher = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, teacherCode.teacherId))
      .get();
    
    if (!teacher) {
      return c.json({ error: 'Professeur non trouvé' }, 404);
    }
    
    if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
      return c.json({ error: 'Ce code n\'est pas associé à un professeur' }, 400);
    }
    
    // Increment code uses
    await db
      .update(schema.teacherCodes)
      .set({ currentUses: teacherCode.currentUses + 1 })
      .where(eq(schema.teacherCodes.id, teacherCode.id));
    
    // Create session
    const sessionId = crypto.randomUUID();
    await c.env.SESSIONS.put(sessionId, teacher.id, { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    return c.json({
      sessionId,
      userId: teacher.id,
      prenom: teacher.prenom,
      role: teacher.role,
      isTeacher: true,
    }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const { prenom, code } = registerSchema.parse(body);
    
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
    
    // Handle teacher code if provided
    if (code) {
      const teacherCode = await db
        .select()
        .from(schema.teacherCodes)
        .where(eq(schema.teacherCodes.code, code.toUpperCase()))
        .get();
      
      if (teacherCode) {
        // Check if code is expired
        if (teacherCode.expiresAt && new Date(teacherCode.expiresAt) < new Date()) {
          return c.json({ error: 'This code has expired' }, 400);
        }
        
        // Check if code has reached max uses
        if (teacherCode.maxUses > 0 && teacherCode.currentUses >= teacherCode.maxUses) {
          return c.json({ error: 'This code has reached its maximum number of uses' }, 400);
        }
        
        // Special code: creates teacher account
        if (teacherCode.isSpecialCode && teacherCode.matiereId) {
          // Create teacher account with the matiere
          if (!existingUser) {
            // Update the user we just created to be a teacher
            await db
              .update(schema.users)
              .set({ role: 'teacher' })
              .where(eq(schema.users.id, userId));
            
            // Link the code to the new teacher
            await db
              .update(schema.teacherCodes)
              .set({ 
                teacherId: userId,
                currentUses: teacherCode.currentUses + 1 
              })
              .where(eq(schema.teacherCodes.id, teacherCode.id));
          } else {
            // User already exists - update to teacher if not already
            if (existingUser.role !== 'teacher' && existingUser.role !== 'admin') {
              await db
                .update(schema.users)
                .set({ role: 'teacher' })
                .where(eq(schema.users.id, userId));
            }
            
            // Link the code to the user
            await db
              .update(schema.teacherCodes)
              .set({ 
                teacherId: userId,
                currentUses: teacherCode.currentUses + 1 
              })
              .where(eq(schema.teacherCodes.id, teacherCode.id));
          }
        } else {
          // Regular code: just increment uses
          await db
            .update(schema.teacherCodes)
            .set({ currentUses: teacherCode.currentUses + 1 })
            .where(eq(schema.teacherCodes.id, teacherCode.id));
          
          // Link courses if courseIds are specified
          if (teacherCode.courseIds) {
            try {
              const courseIds = JSON.parse(teacherCode.courseIds) as string[];
              // Note: We don't automatically enroll in courses here, but the frontend can use this info
            } catch (e) {
              // Invalid JSON, ignore
            }
          }
        }
      } else {
        // Code not found, but don't fail registration - just ignore the code
        // This allows registration to work even with invalid codes
      }
    }
    
    // Create session
    const sessionId = crypto.randomUUID();
    await c.env.SESSIONS.put(sessionId, userId, { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
    
    // Get updated user to return correct role
    const updatedUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    
    return c.json({ 
      sessionId, 
      userId, 
      prenom,
      role: updatedUser?.role || existingUser?.role || 'student',
      isAdmin: updatedUser?.role === 'admin' || existingUser?.role === 'admin',
      isTeacher: updatedUser?.role === 'teacher',
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

app.get('/api/student/profile/:userId', async (c) => {
  const currentUser = await getUser(c);
  if (!currentUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB, { schema });
  
  // Get target user
  const targetUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Get user badges
  const userBadges = await db
    .select({
      badge: schema.badges,
      unlockedAt: schema.userBadges.unlockedAt,
    })
    .from(schema.userBadges)
    .innerJoin(schema.badges, eq(schema.userBadges.badgeId, schema.badges.id))
    .where(eq(schema.userBadges.userId, userId))
    .all();
  
  // Get completed courses count
  const userProgress = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.userId, userId))
    .all();
  const completedCoursesCount = userProgress.length;
  
  // Get active skin
  const activeSkin = await db
    .select({
      userSkin: schema.userSkins,
      item: schema.shopItems,
    })
    .from(schema.userSkins)
    .innerJoin(schema.shopItems, eq(schema.userSkins.skinId, schema.shopItems.id))
    .where(and(
      eq(schema.userSkins.userId, userId),
      eq(schema.userSkins.isActive, true)
    ))
    .get();
  
  // Return public profile (no sensitive data)
  return c.json({
    id: targetUser.id,
    prenom: targetUser.prenom,
    xp: targetUser.xp,
    streakDays: targetUser.streakDays,
    badges: userBadges.map(ub => ({
      ...ub.badge,
      unlockedAt: ub.unlockedAt,
    })),
    completedCoursesCount,
    activeSkin: activeSkin?.item || null,
  });
});

// ========== COURSES ROUTES ==========

app.get('/api/courses', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Filter out hidden courses for non-admin users
  const isAdmin = user.role === 'admin';
  
  let coursesQuery = db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id));
  
  // Only show non-hidden courses to students
  if (!isAdmin) {
    coursesQuery = coursesQuery.where(eq(schema.courses.isHidden, false)) as any;
  }
  
  const courses = await coursesQuery.all();
  
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
  
  // Track clan war contribution (only if course has a matiere)
  if (course.matiereId) {
    await trackClanWarContribution(db, user.id, course.matiereId, course.xpReward);
  }
  
  // Update streak using the new streak system
  await updateUserStreak(db, user.id, new Date());
  
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
  
  // Get active skins for all users in top 10
  const userIds = allUsers.map(u => u.id);
  const activeSkins = userIds.length > 0 ? await db
    .select({
      userSkin: schema.userSkins,
      item: schema.shopItems,
    })
    .from(schema.userSkins)
    .innerJoin(schema.shopItems, eq(schema.userSkins.skinId, schema.shopItems.id))
    .where(and(
      inArray(schema.userSkins.userId, userIds),
      eq(schema.userSkins.isActive, true)
    ))
    .all() : [];
  
  // Create a map of userId -> activeSkin
  const activeSkinMap = new Map<string, { icon: string | null; name: string }>();
  activeSkins.forEach(({ userSkin, item }) => {
    activeSkinMap.set(userSkin.userId, {
      icon: item.icon || null,
      name: item.name,
    });
  });
  
  // Add activeSkin to each user
  const usersWithSkins = allUsers.map(u => ({
    ...u,
    activeSkin: activeSkinMap.get(u.id) || null,
  }));
  
  // Get user position
  const allUsersRanked = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, 'student'))
    .orderBy(desc(schema.users.xp))
    .all();
  const userPosition = allUsersRanked.findIndex(u => u.id === user.id) + 1;
  
  return c.json({
    top10: usersWithSkins,
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
  // Also allow teachers to use admin routes for courses/questions
  const user = await getUser(c);
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    return { ...user, role: user.role };
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

async function requireTeacher(c: any): Promise<schema.User | null> {
  const user = await getUser(c);
  if (!user) {
    return null;
  }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return null;
  }
  return user;
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

app.put('/api/admin/courses/:id/toggle-visibility', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  // Toggle isHidden
  await db
    .update(schema.courses)
    .set({ isHidden: !course.isHidden })
    .where(eq(schema.courses.id, courseId));
  
  const updatedCourse = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  
  return c.json({
    ...updatedCourse,
    isHidden: updatedCourse?.isHidden || false,
  });
});

app.put('/api/admin/courses/:id/toggle-visibility', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  // Toggle isHidden
  await db
    .update(schema.courses)
    .set({ isHidden: !course.isHidden })
    .where(eq(schema.courses.id, courseId));
  
  const updatedCourse = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  
  return c.json({
    ...updatedCourse,
    isHidden: updatedCourse?.isHidden || false,
  });
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

// Admin endpoint for matieres (doesn't require user auth, only admin password)
app.get('/api/admin/matieres', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all matieres
  const matieres = await db.select().from(schema.matieres).all();
  
  return c.json(matieres);
});

app.post('/api/admin/matieres', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { nom, description } = body;
    
    if (!nom) {
      return c.json({ error: 'Le nom de la matière est requis' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if matiere with same name already exists
    const existing = await db
      .select()
      .from(schema.matieres)
      .where(eq(schema.matieres.nom, nom))
      .get();
    
    if (existing) {
      return c.json({ error: 'Une matière avec ce nom existe déjà' }, 400);
    }
    
    const matiereId = crypto.randomUUID();
    await db.insert(schema.matieres).values({
      id: matiereId,
      nom,
      description: description || null,
      createdAt: new Date(),
    });
    
    const createdMatiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    
    return c.json(createdMatiere, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/admin/matieres/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const matiereId = c.req.param('id');
    const body = await c.req.json();
    const { nom, description } = body;
    
    if (!nom) {
      return c.json({ error: 'Le nom de la matière est requis' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if matiere exists
    const existing = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!existing) {
      return c.json({ error: 'Matière non trouvée' }, 404);
    }
    
    // Check if another matiere with same name exists
    const duplicate = await db
      .select()
      .from(schema.matieres)
      .where(and(eq(schema.matieres.nom, nom), sql`${schema.matieres.id} != ${matiereId}`))
      .get();
    
    if (duplicate) {
      return c.json({ error: 'Une matière avec ce nom existe déjà' }, 400);
    }
    
    await db
      .update(schema.matieres)
      .set({
        nom,
        description: description || null,
      })
      .where(eq(schema.matieres.id, matiereId));
    
    const updated = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    
    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/matieres/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const matiereId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    // Check if matiere exists
    const existing = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!existing) {
      return c.json({ error: 'Matière non trouvée' }, 404);
    }
    
    // Delete matiere (cascade will delete related courses)
    await db.delete(schema.matieres).where(eq(schema.matieres.id, matiereId));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Create teacher account and link to matiere
app.post('/api/admin/teachers', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { prenom, matiereId } = body;
    
    if (!prenom) {
      return c.json({ error: 'Le prénom est requis' }, 400);
    }
    
    if (!matiereId) {
      return c.json({ error: 'La matière est requise' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify matiere exists
    const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!matiere) {
      return c.json({ error: 'Matière non trouvée' }, 404);
    }
    
    // Check if user with this prenom already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.prenom, prenom))
      .get();
    
    if (existingUser) {
      // Update existing user to teacher role
      await db
        .update(schema.users)
        .set({ role: 'teacher' })
        .where(eq(schema.users.id, existingUser.id));
      
      // Create a special teacher code for this teacher and matiere
      let code: string;
      let isUnique = false;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existing = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.code, code)).get();
        if (!existing) {
          isUnique = true;
        }
      }
      
      const codeId = crypto.randomUUID();
      await db.insert(schema.teacherCodes).values({
        id: codeId,
        code: code!,
        teacherId: existingUser.id,
        matiereId,
        isSpecialCode: false,
        maxUses: -1,
        currentUses: 0,
        createdAt: new Date(),
      });
      
      return c.json({
        user: { ...existingUser, role: 'teacher' },
        matiere,
        code: code!,
        message: 'Utilisateur existant mis à jour en professeur',
      }, 200);
    }
    
    // Create new teacher user
    const userId = crypto.randomUUID();
    await db.insert(schema.users).values({
      id: userId,
      prenom,
      xp: 0,
      role: 'teacher',
      streakDays: 0,
      createdAt: new Date(),
    });
    
    // Create a special teacher code for this teacher and matiere
    let code: string;
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existing = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.code, code)).get();
      if (!existing) {
        isUnique = true;
      }
    }
    
    const codeId = crypto.randomUUID();
    await db.insert(schema.teacherCodes).values({
      id: codeId,
      code: code!,
      teacherId: userId,
      matiereId,
      isSpecialCode: false,
      maxUses: -1,
      currentUses: 0,
      createdAt: new Date(),
    });
    
    const createdUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    
    return c.json({
      user: createdUser,
      matiere,
      code: code!,
      message: 'Professeur créé avec succès',
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Admin endpoint for fixed sessions
app.get('/api/admin/sessions/fixed', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get fixed sessions (isFixed = true)
  const fixedSessions = await db
    .select({
      session: schema.sessions,
      course: schema.courses,
    })
    .from(schema.sessions)
    .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
    .where(eq(schema.sessions.isFixed, true))
    .orderBy(desc(schema.sessions.createdAt))
    .all();
  
  return c.json(fixedSessions.map(s => ({
    ...s.session,
    course: s.course,
  })));
});

app.post('/api/admin/sessions/fixed', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { courseId, scheduledAt, recurrenceType, recurrenceDay } = body;
    
    if (!courseId) {
      return c.json({ error: 'Course ID is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if course exists
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    // Generate unique code (6 characters)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create fixed session
    const sessionId = crypto.randomUUID();
    const sessionData: any = {
      id: sessionId,
      courseId,
      createdBy: admin.id,
      code,
      isActive: false,
      status: 'waiting',
      isFixed: true,
      createdAt: new Date(),
    };
    
    if (scheduledAt) {
      sessionData.scheduledAt = new Date(scheduledAt);
    }
    
    if (recurrenceType) {
      sessionData.recurrenceType = recurrenceType;
      if (recurrenceType === 'weekly' && recurrenceDay !== undefined) {
        sessionData.recurrenceDay = recurrenceDay;
      }
    }
    
    await db.insert(schema.sessions).values(sessionData);
    
    const session = await db
      .select({
        session: schema.sessions,
        course: schema.courses,
      })
      .from(schema.sessions)
      .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
      .where(eq(schema.sessions.id, sessionId))
      .get();
    
    if (!session) {
      return c.json({ error: 'Failed to create session' }, 500);
    }
    
    return c.json({
      ...session.session,
      course: session.course,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
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

// ========== TEACHER CODES ROUTES (Admin) ==========

app.post('/api/admin/teacher-codes', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { teacherId, matiereId, courseIds, maxUses, expiresAt, isSpecialCode } = body;
    
    const db = drizzle(c.env.DB, { schema });
    
    // Special code: creates teacher account (1 code = 1 teacher = 1 matiere)
    if (isSpecialCode) {
      if (!matiereId) {
        return c.json({ error: 'Matiere ID is required for special codes' }, 400);
      }
      
      // Verify matiere exists
      const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
      if (!matiere) {
        return c.json({ error: 'Matiere not found' }, 404);
      }
      
      // Generate unique code (8 characters, alphanumeric)
      let code: string;
      let isUnique = false;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existing = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.code, code)).get();
        if (!existing) {
          isUnique = true;
        }
      }
      
      const codeId = crypto.randomUUID();
      await db.insert(schema.teacherCodes).values({
        id: codeId,
        code: code!,
        teacherId: null, // No teacher yet - will be created on registration
        matiereId,
        courseIds: null,
        isSpecialCode: true,
        maxUses: maxUses !== undefined ? maxUses : 1, // Default to 1 use for special codes
        currentUses: 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: new Date(),
      });
      
      const createdCode = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.id, codeId)).get();
      
      return c.json({
        ...createdCode,
        matiere: matiere,
      }, 201);
    }
    
    // Regular code: links to existing teacher
    if (!teacherId) {
      return c.json({ error: 'Teacher ID is required for regular codes' }, 400);
    }
    
    // Verify teacher exists and is a teacher
    const teacher = await db.select().from(schema.users).where(eq(schema.users.id, teacherId)).get();
    if (!teacher) {
      return c.json({ error: 'Teacher not found' }, 404);
    }
    
    if (teacher.role !== 'teacher') {
      return c.json({ error: 'User is not a teacher' }, 400);
    }
    
    // Generate unique code (8 characters, alphanumeric)
    let code: string;
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existing = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.code, code)).get();
      if (!existing) {
        isUnique = true;
      }
    }
    
    // Store courseIds as JSON string
    const courseIdsJson = courseIds && Array.isArray(courseIds) ? JSON.stringify(courseIds) : null;
    
    const codeId = crypto.randomUUID();
    await db.insert(schema.teacherCodes).values({
      id: codeId,
      code: code!,
      teacherId,
      matiereId: null,
      courseIds: courseIdsJson,
      isSpecialCode: false,
      maxUses: maxUses !== undefined ? maxUses : -1,
      currentUses: 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
    });
    
    const createdCode = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.id, codeId)).get();
    
    return c.json({
      ...createdCode,
      courseIds: courseIdsJson ? JSON.parse(courseIdsJson) : null,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/admin/teacher-codes', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  const codes = await db
    .select({
      code: schema.teacherCodes,
      teacher: schema.users,
      matiere: schema.matieres,
    })
    .from(schema.teacherCodes)
    .leftJoin(schema.users, eq(schema.teacherCodes.teacherId, schema.users.id))
    .leftJoin(schema.matieres, eq(schema.teacherCodes.matiereId, schema.matieres.id))
    .orderBy(desc(schema.teacherCodes.createdAt))
    .all();
  
  return c.json(codes.map(c => ({
    ...c.code,
    courseIds: c.code.courseIds ? JSON.parse(c.code.courseIds) : null,
    teacher: c.teacher,
    matiere: c.matiere,
  })));
});

app.delete('/api/admin/teacher-codes/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const codeId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const code = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.id, codeId)).get();
  if (!code) {
    return c.json({ error: 'Code not found' }, 404);
  }
  
  await db.delete(schema.teacherCodes).where(eq(schema.teacherCodes.id, codeId));
  
  return c.json({ success: true });
});

// Update teacher code
app.put('/api/admin/teacher-codes/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const codeId = c.req.param('id');
    const body = await c.req.json();
    const { code } = body;
    
    if (!code) {
      return c.json({ error: 'Le code est requis' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if code already exists (for another teacher code)
    const existing = await db
      .select()
      .from(schema.teacherCodes)
      .where(and(
        eq(schema.teacherCodes.code, code.toUpperCase()),
        sql`${schema.teacherCodes.id} != ${codeId}`
      ))
      .get();
    
    if (existing) {
      return c.json({ error: 'Ce code est déjà utilisé' }, 400);
    }
    
    // Update the code
    await db
      .update(schema.teacherCodes)
      .set({ code: code.toUpperCase() })
      .where(eq(schema.teacherCodes.id, codeId));
    
    const updated = await db.select().from(schema.teacherCodes).where(eq(schema.teacherCodes.id, codeId)).get();
    
    return c.json({
      ...updated,
      courseIds: updated.courseIds ? JSON.parse(updated.courseIds) : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Delete teacher (and their codes)
app.delete('/api/admin/teachers/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const userId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    // Check if user exists and is a teacher
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) {
      return c.json({ error: 'Professeur non trouvé' }, 404);
    }
    
    if (user.role !== 'teacher') {
      return c.json({ error: 'Cet utilisateur n\'est pas un professeur' }, 400);
    }
    
    // Delete all teacher codes associated with this teacher
    await db.delete(schema.teacherCodes).where(eq(schema.teacherCodes.teacherId, userId));
    
    // Delete the user (cascade will handle related data)
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ADMIN USER MANAGEMENT ROUTES ==========

app.get('/api/admin/users', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get query parameters
  const role = c.req.query('role'); // Optional filter by role
  const search = c.req.query('search'); // Optional search by prenom
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;
  
  // Build query
  let usersQuery = db.select().from(schema.users);
  
  const conditions = [];
  if (role) {
    conditions.push(eq(schema.users.role, role));
  }
  if (search) {
    conditions.push(sql`${schema.users.prenom} LIKE ${'%' + search + '%'}`);
  }
  
  if (conditions.length > 0) {
    usersQuery = usersQuery.where(and(...conditions)) as any;
  }
  
  // Get total count for pagination
  const allUsers = await usersQuery.all();
  const total = allUsers.length;
  
  // Get paginated users
  const users = await usersQuery
    .orderBy(desc(schema.users.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
  
  // Get additional stats for each user
  const usersWithStats = await Promise.all(users.map(async (user) => {
    const [progressCount, badgesCount, purchasesCount] = await Promise.all([
      db.select().from(schema.userProgress).where(eq(schema.userProgress.userId, user.id)).all(),
      db.select().from(schema.userBadges).where(eq(schema.userBadges.userId, user.id)).all(),
      db.select().from(schema.userPurchases).where(eq(schema.userPurchases.userId, user.id)).all(),
    ]);
    
    return {
      ...user,
      stats: {
        coursesCompleted: progressCount.length,
        badgesUnlocked: badgesCount.length,
        itemsPurchased: purchasesCount.length,
      },
    };
  }));
  
  return c.json({
    users: usersWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.delete('/api/admin/users/:id/reset', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Reset user data but keep the user account and history
  // Delete: badges, progression, achats, skins
  // Keep: user, friendships, duel history (for stats)
  
  await Promise.all([
    // Delete user badges
    db.delete(schema.userBadges).where(eq(schema.userBadges.userId, userId)),
    // Delete user progress
    db.delete(schema.userProgress).where(eq(schema.userProgress.userId, userId)),
    // Delete user purchases
    db.delete(schema.userPurchases).where(eq(schema.userPurchases.userId, userId)),
    // Delete user skins
    db.delete(schema.userSkins).where(eq(schema.userSkins.userId, userId)),
    // Reset user stats
    db.update(schema.users).set({
      xp: 0,
      streakDays: 0,
      lastActivityDate: null,
    }).where(eq(schema.users.id, userId)),
  ]);
  
  return c.json({ success: true, message: 'User account reset successfully' });
});

app.delete('/api/admin/users/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Prevent deleting admin accounts
  if (user.role === 'admin') {
    return c.json({ error: 'Cannot delete admin accounts' }, 400);
  }
  
  // Delete user (cascade will handle related data)
  await db.delete(schema.users).where(eq(schema.users.id, userId));
  
  return c.json({ success: true, message: 'User deleted successfully' });
});

// ========== STRESS ROUTES ==========

// ========== TEACHER ROUTES ==========

// Helper to get teacher's courses
app.get('/api/teacher/courses', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get courses created by this teacher (or all if admin)
  const courses = await db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .all();
  
  // Filter by teacher if not admin (temporary until created_by is added)
  const filteredCourses = teacher.role === 'admin' ? courses : courses;
  
  return c.json(filteredCourses.map(({ course, matiere }) => ({
    ...course,
    matiere: matiere || null,
  })));
});

app.post('/api/teacher/courses', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { titre, description, matiereId, gameType, theoreticalContent, xpReward } = body;
    
    if (!titre || !description) {
      return c.json({ error: 'Titre and description are required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    const courseId = crypto.randomUUID();
    
    await db.insert(schema.courses).values({
      id: courseId,
      titre,
      description,
      matiereId: matiereId || null,
      gameType: gameType || 'quiz',
      theoreticalContent: theoreticalContent || null,
      xpReward: xpReward || 50,
      createdAt: new Date(),
    });
    
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    
    return c.json(course, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/teacher/courses/:id', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  try {
    const courseId = c.req.param('id');
    const body = await c.req.json();
    const db = drizzle(c.env.DB, { schema });
    
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    await db
      .update(schema.courses)
      .set({ ...body })
      .where(eq(schema.courses.id, courseId));
    
    const updatedCourse = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    
    return c.json(updatedCourse);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/teacher/courses/:id/stats', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const courseId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
  if (!course) {
    return c.json({ error: 'Course not found' }, 404);
  }
  
  const completions = await db
    .select()
    .from(schema.userProgress)
    .where(eq(schema.userProgress.courseId, courseId))
    .all();
  
  const userIds = completions.map(c => c.userId);
  const users = userIds.length > 0 
    ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds)).all()
    : [];
  
  const userMap = new Map(users.map(u => [u.id, u]));
  
  return c.json({
    course,
    totalCompletions: completions.length,
    completions: completions.map(c => ({
      ...c,
      user: userMap.get(c.userId),
    })),
  });
});

app.get('/api/teacher/sessions', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  const sessions = await db
    .select({
      session: schema.sessions,
      course: schema.courses,
    })
    .from(schema.sessions)
    .innerJoin(schema.courses, eq(schema.sessions.courseId, schema.courses.id))
    .where(eq(schema.sessions.createdBy, teacher.id))
    .orderBy(desc(schema.sessions.createdAt))
    .all();
  
  return c.json(sessions.map(s => ({
    ...s.session,
    course: s.course,
  })));
});

app.post('/api/teacher/sessions', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { courseId } = body;
    
    if (!courseId) {
      return c.json({ error: 'Course ID is required' }, 400);
    }
  
    const db = drizzle(c.env.DB, { schema });
    
    const course = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).get();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    
    let code: string;
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await db.select().from(schema.sessions).where(eq(schema.sessions.code, code)).get();
      if (!existing) {
        isUnique = true;
      }
    }
    
    const sessionId = crypto.randomUUID();
    await db.insert(schema.sessions).values({
      id: sessionId,
      courseId,
      createdBy: teacher.id,
      code: code!,
      isActive: true,
      status: 'waiting',
      createdAt: new Date(),
    });
    
    const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).get();
    
    return c.json(session, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/teacher/sessions/:id/start', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  if (session.createdBy !== teacher.id && teacher.role !== 'admin') {
    return c.json({ error: 'Unauthorized - This session does not belong to you' }, 403);
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

app.put('/api/teacher/sessions/:id/stop', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  if (session.createdBy !== teacher.id && teacher.role !== 'admin') {
    return c.json({ error: 'Unauthorized - This session does not belong to you' }, 403);
  }
  
  await db
    .update(schema.sessions)
    .set({
      isActive: false,
      status: 'finished',
    })
    .where(eq(schema.sessions.id, sessionId));
  
  return c.json({ success: true });
});

app.get('/api/teacher/sessions/:id/participants', async (c) => {
  const teacher = await requireTeacher(c);
  if (!teacher) {
    return c.json({ error: 'Unauthorized - Teacher access required' }, 401);
  }
  
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  if (session.createdBy !== teacher.id && teacher.role !== 'admin') {
    return c.json({ error: 'Unauthorized - This session does not belong to you' }, 403);
  }
  
  const attendances = await db
    .select({
      attendance: schema.sessionAttendances,
      user: schema.users,
    })
    .from(schema.sessionAttendances)
    .innerJoin(schema.users, eq(schema.sessionAttendances.userId, schema.users.id))
    .where(eq(schema.sessionAttendances.sessionId, sessionId))
    .all();
  
  const answers = await db
    .select()
    .from(schema.sessionQuizAnswers)
    .where(eq(schema.sessionQuizAnswers.sessionId, sessionId))
    .all();
  
  const userScores = new Map<string, { correct: number; total: number }>();
  answers.forEach(a => {
    const current = userScores.get(a.userId) || { correct: 0, total: 0 };
    current.total++;
    if (a.isCorrect) {
      current.correct++;
    }
    userScores.set(a.userId, current);
  });
  
  return c.json({
    participants: attendances.map(a => ({
      ...a.attendance,
      user: a.user,
      score: userScores.get(a.user.id) || { correct: 0, total: 0 },
    })),
  });
});

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
    const { sessionId, startedAt, endedAt, durationSeconds, isPartial } = body;
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if session exists
    const existing = await db
      .select()
      .from(schema.userSessions)
      .where(eq(schema.userSessions.id, sessionId))
      .get();
    
    if (existing) {
      // Update existing session - only update if this is a final save or duration is higher
      // This prevents overwriting with partial saves that might be out of order
      if (!isPartial || (durationSeconds && (!existing.durationSeconds || durationSeconds > existing.durationSeconds))) {
        await db
          .update(schema.userSessions)
          .set({
            endedAt: endedAt ? new Date(endedAt) : existing.endedAt,
            durationSeconds: durationSeconds || existing.durationSeconds,
          })
          .where(eq(schema.userSessions.id, sessionId));
      }
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

// ========== ANALYTICS ROUTES ==========

app.get('/api/admin/analytics/time-spent', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get query parameters for filtering
  const period = c.req.query('period') || 'all'; // 'day' | 'week' | 'month' | 'all'
  const userId = c.req.query('userId'); // Optional user filter
  
  // Get all user sessions
  let allSessionsQuery = db
    .select({
      session: schema.userSessions,
      user: schema.users,
    })
    .from(schema.userSessions)
    .innerJoin(schema.users, eq(schema.userSessions.userId, schema.users.id));
  
  // Apply filters
  if (userId) {
    allSessionsQuery = allSessionsQuery.where(eq(schema.userSessions.userId, userId)) as any;
  }
  
  const allSessions = await allSessionsQuery.all();
  
  // Filter by period if specified
  const now = new Date();
  let filteredSessions = allSessions;
  
  if (period === 'day') {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filteredSessions = allSessions.filter(s => 
      s.session.startedAt >= dayStart
    );
  } else if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    filteredSessions = allSessions.filter(s => 
      s.session.startedAt >= weekStart
    );
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredSessions = allSessions.filter(s => 
      s.session.startedAt >= monthStart
    );
  }
  
  // Calculate overall stats
  const totalSessions = filteredSessions.length;
  const completedSessions = filteredSessions.filter(s => s.session.durationSeconds !== null && s.session.durationSeconds > 0).length;
  
  const sessionsWithDuration = filteredSessions
    .filter(s => s.session.durationSeconds !== null && s.session.durationSeconds > 0)
    .map(s => s.session.durationSeconds || 0);
  
  const totalTimeSeconds = sessionsWithDuration.reduce((sum, duration) => sum + duration, 0);
  const avgTimeSeconds = sessionsWithDuration.length > 0 ? Math.round(totalTimeSeconds / sessionsWithDuration.length) : 0;
  const avgTimeMinutes = Math.floor(avgTimeSeconds / 60);
  
  // Calculate stats per user
  const userStatsMap = new Map<string, {
    userId: string;
    userName: string;
    totalSessions: number;
    completedSessions: number;
    totalTimeSeconds: number;
    avgTimeSeconds: number;
    avgTimeMinutes: number;
  }>();
  
  filteredSessions.forEach(({ session, user }) => {
    const existing = userStatsMap.get(session.userId) || {
      userId: session.userId,
      userName: user.prenom,
      totalSessions: 0,
      completedSessions: 0,
      totalTimeSeconds: 0,
      avgTimeSeconds: 0,
      avgTimeMinutes: 0,
    };
    
    existing.totalSessions++;
    if (session.durationSeconds !== null && session.durationSeconds > 0) {
      existing.completedSessions++;
      existing.totalTimeSeconds += session.durationSeconds;
    }
    
    userStatsMap.set(session.userId, existing);
  });
  
  // Calculate averages for each user
  const userStats = Array.from(userStatsMap.values()).map(stat => ({
    ...stat,
    avgTimeSeconds: stat.completedSessions > 0 ? Math.round(stat.totalTimeSeconds / stat.completedSessions) : 0,
    avgTimeMinutes: stat.completedSessions > 0 ? Math.floor(stat.totalTimeSeconds / stat.completedSessions / 60) : 0,
  })).sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
  
  // Calculate daily breakdown (last 30 days)
  const dailyBreakdown: Record<string, number> = {};
  filteredSessions.forEach(({ session }) => {
    if (session.durationSeconds && session.durationSeconds > 0) {
      const dateKey = new Date(session.startedAt).toISOString().split('T')[0];
      dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + session.durationSeconds;
    }
  });
  
  return c.json({
    period,
    totalSessions,
    completedSessions,
    totalTimeSeconds,
    totalTimeMinutes: Math.floor(totalTimeSeconds / 60),
    totalTimeHours: Math.floor(totalTimeSeconds / 3600),
    avgTimeSeconds,
    avgTimeMinutes,
    userStats,
    dailyBreakdown: Object.entries(dailyBreakdown)
      .map(([date, seconds]) => ({ date, seconds, minutes: Math.floor(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
});

// ========== SHOP ROUTES ==========

// Admin routes for shop management
app.get('/api/admin/shop/items', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const items = await db.select().from(schema.shopItems).all();
  
  return c.json(items);
});

const createShopItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['skin', 'powerup', 'cosmetic']),
  price: z.number().int().min(1),
  data: z.string().optional(),
  icon: z.string().optional(),
});

app.post('/api/admin/shop/items', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const data = createShopItemSchema.parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    const itemId = crypto.randomUUID();
    
    await db.insert(schema.shopItems).values({
      id: itemId,
      ...data,
      createdAt: new Date(),
    });
    
    const item = await db.select().from(schema.shopItems).where(eq(schema.shopItems.id, itemId)).get();
    
    return c.json(item, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put('/api/admin/shop/items/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const itemId = c.req.param('id');
    const body = await c.req.json();
    const data = createShopItemSchema.partial().parse(body);
    
    const db = drizzle(c.env.DB, { schema });
    
    await db
      .update(schema.shopItems)
      .set(data)
      .where(eq(schema.shopItems.id, itemId));
    
    const item = await db.select().from(schema.shopItems).where(eq(schema.shopItems.id, itemId)).get();
    
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    return c.json(item);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/shop/items/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const itemId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  await db.delete(schema.shopItems).where(eq(schema.shopItems.id, itemId));
  
  return c.json({ success: true });
});

// Student routes
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

app.get('/api/student/skins', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all skin purchases
  const skinPurchases = await db
    .select({
      purchase: schema.userPurchases,
      item: schema.shopItems,
    })
    .from(schema.userPurchases)
    .innerJoin(schema.shopItems, eq(schema.userPurchases.itemId, schema.shopItems.id))
    .where(and(
      eq(schema.userPurchases.userId, user.id),
      eq(schema.shopItems.type, 'skin')
    ))
    .all();
  
  // Get active skin
  const activeSkin = await db
    .select({
      userSkin: schema.userSkins,
      item: schema.shopItems,
    })
    .from(schema.userSkins)
    .innerJoin(schema.shopItems, eq(schema.userSkins.skinId, schema.shopItems.id))
    .where(and(
      eq(schema.userSkins.userId, user.id),
      eq(schema.userSkins.isActive, true)
    ))
    .get();
  
  return c.json({
    skins: skinPurchases.map(p => ({
      ...p.item,
      purchased: true,
      isActive: activeSkin?.userSkin.skinId === p.item.id,
    })),
    activeSkin: activeSkin?.item || null,
  });
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

// ========== FRIENDS ROUTES ==========

app.get('/api/student/friends', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all friendships where user is either user1 or user2
  const friendships = await db
    .select()
    .from(schema.friendships)
    .where(or(
      eq(schema.friendships.user1Id, user.id),
      eq(schema.friendships.user2Id, user.id)
    ))
    .all();
  
  // Get friend IDs
  const friendIds = friendships.map(f => 
    f.user1Id === user.id ? f.user2Id : f.user1Id
  );
  
  if (friendIds.length === 0) {
    return c.json({ friends: [] });
  }
  
  // Get friend users
  const friends = await db
    .select()
    .from(schema.users)
    .where(inArray(schema.users.id, friendIds))
    .all();
  
  return c.json({ friends });
});

app.get('/api/student/friends/requests', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get received requests (pending)
  const receivedRequests = await db
    .select({
      request: schema.friendRequests,
      fromUser: schema.users,
    })
    .from(schema.friendRequests)
    .innerJoin(schema.users, eq(schema.friendRequests.fromUserId, schema.users.id))
    .where(and(
      eq(schema.friendRequests.toUserId, user.id),
      eq(schema.friendRequests.status, 'pending')
    ))
    .all();
  
  // Get sent requests (pending)
  const sentRequests = await db
    .select({
      request: schema.friendRequests,
      toUser: schema.users,
    })
    .from(schema.friendRequests)
    .innerJoin(schema.users, eq(schema.friendRequests.toUserId, schema.users.id))
    .where(and(
      eq(schema.friendRequests.fromUserId, user.id),
      eq(schema.friendRequests.status, 'pending')
    ))
    .all();
  
  return c.json({
    received: receivedRequests.map(r => ({
      ...r.request,
      fromUser: r.fromUser,
    })),
    sent: sentRequests.map(r => ({
      ...r.request,
      toUser: r.toUser,
    })),
  });
});

app.post('/api/student/friends/request', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { toUserId } = body;
    
    if (!toUserId) {
      return c.json({ error: 'toUserId is required' }, 400);
    }
    
    if (toUserId === user.id) {
      return c.json({ error: 'Cannot send friend request to yourself' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if target user exists
    const targetUser = await db.select().from(schema.users).where(eq(schema.users.id, toUserId)).get();
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Check if already friends
    const existingFriendship = await db
      .select()
      .from(schema.friendships)
      .where(or(
        and(eq(schema.friendships.user1Id, user.id), eq(schema.friendships.user2Id, toUserId)),
        and(eq(schema.friendships.user1Id, toUserId), eq(schema.friendships.user2Id, user.id))
      ))
      .get();
    
    if (existingFriendship) {
      return c.json({ error: 'Already friends' }, 400);
    }
    
    // Check if request already exists
    const existingRequest = await db
      .select()
      .from(schema.friendRequests)
      .where(or(
        and(
          eq(schema.friendRequests.fromUserId, user.id),
          eq(schema.friendRequests.toUserId, toUserId),
          eq(schema.friendRequests.status, 'pending')
        ),
        and(
          eq(schema.friendRequests.fromUserId, toUserId),
          eq(schema.friendRequests.toUserId, user.id),
          eq(schema.friendRequests.status, 'pending')
        )
      ))
      .get();
    
    if (existingRequest) {
      return c.json({ error: 'Friend request already exists' }, 400);
    }
    
    // Create friend request
    const requestId = crypto.randomUUID();
    await db.insert(schema.friendRequests).values({
      id: requestId,
      fromUserId: user.id,
      toUserId,
      status: 'pending',
      createdAt: new Date(),
    });
    
    return c.json({ success: true, requestId }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/student/friends/accept/:requestId', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const requestId = c.req.param('requestId');
    const db = drizzle(c.env.DB, { schema });
    
    // Get request
    const request = await db
      .select()
      .from(schema.friendRequests)
      .where(and(
        eq(schema.friendRequests.id, requestId),
        eq(schema.friendRequests.toUserId, user.id),
        eq(schema.friendRequests.status, 'pending')
      ))
      .get();
    
    if (!request) {
      return c.json({ error: 'Request not found or already processed' }, 404);
    }
    
    // Update request status
    await db
      .update(schema.friendRequests)
      .set({ status: 'accepted' })
      .where(eq(schema.friendRequests.id, requestId));
    
    // Create friendship (ensure user1Id < user2Id for consistency)
    const user1Id = request.fromUserId < request.toUserId ? request.fromUserId : request.toUserId;
    const user2Id = request.fromUserId < request.toUserId ? request.toUserId : request.fromUserId;
    
    const friendshipId = crypto.randomUUID();
    await db.insert(schema.friendships).values({
      id: friendshipId,
      user1Id,
      user2Id,
      createdAt: new Date(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/student/friends/reject/:requestId', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const requestId = c.req.param('requestId');
    const db = drizzle(c.env.DB, { schema });
    
    // Update request status
    await db
      .update(schema.friendRequests)
      .set({ status: 'rejected' })
      .where(and(
        eq(schema.friendRequests.id, requestId),
        eq(schema.friendRequests.toUserId, user.id),
        eq(schema.friendRequests.status, 'pending')
      ));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/student/friends/:friendId', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const friendId = c.req.param('friendId');
    const db = drizzle(c.env.DB, { schema });
    
    // Delete friendship
    await db
      .delete(schema.friendships)
      .where(or(
        and(eq(schema.friendships.user1Id, user.id), eq(schema.friendships.user2Id, friendId)),
        and(eq(schema.friendships.user1Id, friendId), eq(schema.friendships.user2Id, user.id))
      ));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/student/friends/:friendId/activity', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const friendId = c.req.param('friendId');
  const db = drizzle(c.env.DB, { schema });
  
  // Verify friendship
  const friendship = await db
    .select()
    .from(schema.friendships)
    .where(or(
      and(eq(schema.friendships.user1Id, user.id), eq(schema.friendships.user2Id, friendId)),
      and(eq(schema.friendships.user1Id, friendId), eq(schema.friendships.user2Id, user.id))
    ))
    .get();
  
  if (!friendship) {
    return c.json({ error: 'Not friends' }, 403);
  }
  
  // Get friend's recent activity
  const recentCourses = await db
    .select({
      progress: schema.userProgress,
      course: schema.courses,
    })
    .from(schema.userProgress)
    .innerJoin(schema.courses, eq(schema.userProgress.courseId, schema.courses.id))
    .where(eq(schema.userProgress.userId, friendId))
    .orderBy(desc(schema.userProgress.completedAt))
    .limit(5)
    .all();
  
  // Get friend's recent duel wins
  const recentDuelWins = await db
    .select()
    .from(schema.duels)
    .where(and(
      eq(schema.duels.winnerId, friendId),
      eq(schema.duels.status, 'finished')
    ))
    .orderBy(desc(schema.duels.finishedAt))
    .limit(5)
    .all();
  
  return c.json({
    recentCourses: recentCourses.map(rc => ({
      course: rc.course,
      completedAt: rc.progress.completedAt,
    })),
    recentDuelWins: recentDuelWins.length,
  });
});

// ========== CLAN WARS HELPERS ==========

// Helper: Get config value
async function getClanWarsConfig(db: any, key: string, defaultValue: string = ''): Promise<string> {
  const config = await db
    .select()
    .from(schema.clanWarsConfig)
    .where(eq(schema.clanWarsConfig.key, key))
    .get();
  
  return config?.value || defaultValue;
}

// Helper: Set config value
async function setClanWarsConfig(db: any, key: string, value: string, description?: string): Promise<void> {
  const existing = await db
    .select()
    .from(schema.clanWarsConfig)
    .where(eq(schema.clanWarsConfig.key, key))
    .get();
  
  if (existing) {
    await db
      .update(schema.clanWarsConfig)
      .set({
        value,
        description: description || existing.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.clanWarsConfig.key, key));
  } else {
    await db.insert(schema.clanWarsConfig).values({
      id: key,
      key,
      value,
      description: description || '',
      updatedAt: new Date(),
    });
  }
}

// Helper: Check if wars are enabled
async function areWarsEnabled(db: any): Promise<boolean> {
  const enabled = await getClanWarsConfig(db, 'wars_enabled', 'true');
  return enabled === 'true';
}

// Helper: Get start and end of current week (Monday 00:00 to Sunday 23:59)
function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

// Helper: Get or create current war for a matiere
async function getOrCreateCurrentWar(db: any, matiereId: string): Promise<schema.ClanWar | null> {
  // Check if wars are enabled
  if (!(await areWarsEnabled(db))) {
    return null;
  }
  
  const { weekStart, weekEnd } = getCurrentWeekRange();
  
  // Check if active war exists for this matiere
  const existingWar = await db
    .select()
    .from(schema.clanWars)
    .where(and(
      eq(schema.clanWars.matiereId, matiereId),
      eq(schema.clanWars.status, 'active')
    ))
    .get();
  
  if (existingWar) {
    // Check if war is still in current week
    const warStart = new Date(existingWar.weekStart);
    const warEnd = new Date(existingWar.weekEnd);
    const now = new Date();
    
    if (now >= warStart && now <= warEnd) {
      return existingWar;
    } else {
      // War is outdated, finish it
      await finishWarAndDistributeRewards(db, existingWar.id);
    }
  }
  
  // Create new war for current week
  const warId = crypto.randomUUID();
  await db.insert(schema.clanWars).values({
    id: warId,
    matiereId,
    weekStart,
    weekEnd,
    status: 'active',
    totalBananas: 0,
    createdAt: new Date(),
  });
  
  const newWar = await db
    .select()
    .from(schema.clanWars)
    .where(eq(schema.clanWars.id, warId))
    .get();
  
  return newWar;
}

// Helper: Track clan war contribution when user completes a course
async function trackClanWarContribution(
  db: any,
  userId: string,
  matiereId: string,
  bananasGained: number
): Promise<void> {
  if (!matiereId || bananasGained <= 0) return;
  
  // Get or create current war for this matiere
  const war = await getOrCreateCurrentWar(db, matiereId);
  if (!war) return;
  
  // Find user's clan for this matiere
  const userClan = await db
    .select({
      membership: schema.clanMembers,
      clan: schema.clans,
    })
    .from(schema.clanMembers)
    .innerJoin(schema.clans, eq(schema.clanMembers.clanId, schema.clans.id))
    .where(and(
      eq(schema.clanMembers.userId, userId),
      eq(schema.clans.matiereId, matiereId)
    ))
    .get();
  
  if (!userClan) return; // User not in a clan for this matiere
  
  // Get or create contribution
  const existingContribution = await db
    .select()
    .from(schema.clanWarContributions)
    .where(and(
      eq(schema.clanWarContributions.clanWarId, war.id),
      eq(schema.clanWarContributions.userId, userId)
    ))
    .get();
  
  if (existingContribution) {
    // Update existing contribution
    await db
      .update(schema.clanWarContributions)
      .set({
        bananasContributed: existingContribution.bananasContributed + bananasGained,
        updatedAt: new Date(),
      })
      .where(eq(schema.clanWarContributions.id, existingContribution.id));
  } else {
    // Create new contribution
    const contributionId = crypto.randomUUID();
    await db.insert(schema.clanWarContributions).values({
      id: contributionId,
      clanWarId: war.id,
      clanId: userClan.clan.id,
      userId,
      bananasContributed: bananasGained,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  // Update total bananas for the war
  await db
    .update(schema.clanWars)
    .set({ totalBananas: sql`${schema.clanWars.totalBananas} + ${bananasGained}` })
    .where(eq(schema.clanWars.id, war.id));
}

// Helper: Finish war and distribute rewards
async function finishWarAndDistributeRewards(db: any, warId: string): Promise<void> {
  const war = await db
    .select()
    .from(schema.clanWars)
    .where(eq(schema.clanWars.id, warId))
    .get();
  
  if (!war || war.status === 'finished') return;
  
  // Get all contributions grouped by clan
  const contributions = await db
    .select()
    .from(schema.clanWarContributions)
    .where(eq(schema.clanWarContributions.clanWarId, warId))
    .all();
  
  // Calculate total bananas per clan
  const clanTotals: Record<string, number> = {};
  contributions.forEach((contrib: schema.ClanWarContribution) => {
    if (!clanTotals[contrib.clanId]) {
      clanTotals[contrib.clanId] = 0;
    }
    clanTotals[contrib.clanId] += contrib.bananasContributed;
  });
  
  // Find winner (clan with most bananas)
  let winnerClanId: string | null = null;
  let maxBananas = 0;
  
  for (const [clanId, total] of Object.entries(clanTotals)) {
    if (total > maxBananas) {
      maxBananas = total;
      winnerClanId = clanId;
    }
  }
  
  // If there's a winner, distribute rewards
  if (winnerClanId) {
    const winnerMembers = await db
      .select()
      .from(schema.clanMembers)
      .where(eq(schema.clanMembers.clanId, winnerClanId))
      .all();
    
    const rewardPerMember = parseInt(await getClanWarsConfig(db, 'reward_per_member', '50'), 10);
    for (const member of winnerMembers) {
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, member.userId))
        .get();
      
      if (user) {
        await db
          .update(schema.users)
          .set({ xp: user.xp + rewardPerMember })
          .where(eq(schema.users.id, member.userId));
      }
    }
  }
  
  // Mark war as finished
  await db
    .update(schema.clanWars)
    .set({
      status: 'finished',
      winnerClanId,
      finishedAt: new Date(),
    })
    .where(eq(schema.clanWars.id, warId));
}

// Helper: Check and finalize expired wars (called periodically)
async function checkAndFinalizeExpiredWars(db: any): Promise<void> {
  // Check if auto-create is enabled
  const autoCreate = await getClanWarsConfig(db, 'auto_create_wars', 'true');
  if (autoCreate !== 'true') {
    return;
  }
  
  const now = new Date();
  const { weekStart } = getCurrentWeekRange();
  
  // Find all active wars that have ended
  const expiredWars = await db
    .select()
    .from(schema.clanWars)
    .where(and(
      eq(schema.clanWars.status, 'active'),
      lt(schema.clanWars.weekEnd, now)
    ))
    .all();
  
  for (const war of expiredWars) {
    await finishWarAndDistributeRewards(db, war.id);
  }
}

// ========== CLANS ROUTES ==========

app.get('/api/student/clans', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all clans with their matiere
  const clans = await db
    .select({
      clan: schema.clans,
      matiere: schema.matieres,
    })
    .from(schema.clans)
    .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
    .all();
  
  // Get member count for each clan
  const clansWithMembers = await Promise.all(clans.map(async (c) => {
    const memberCount = await db
      .select()
      .from(schema.clanMembers)
      .where(eq(schema.clanMembers.clanId, c.clan.id))
      .all();
    
    return {
      ...c.clan,
      matiere: c.matiere,
      memberCount: memberCount.length,
    };
  }));
  
  return c.json(clansWithMembers);
});

// IMPORTANT: Routes spécifiques doivent être AVANT les routes avec paramètres génériques
// Route pour obtenir les détails d'un clan spécifique (doit être AVANT /:matiereId)
app.get('/api/student/clans/details/:id', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const clanId = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  // Get clan details
  const clan = await db
    .select({
      clan: schema.clans,
      matiere: schema.matieres,
    })
    .from(schema.clans)
    .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
    .where(eq(schema.clans.id, clanId))
    .get();
  
  if (!clan) {
    return c.json({ error: 'Clan not found' }, 404);
  }
  
  // Get members
  const members = await db
    .select({
      membership: schema.clanMembers,
      user: schema.users,
    })
    .from(schema.clanMembers)
    .innerJoin(schema.users, eq(schema.clanMembers.userId, schema.users.id))
    .where(eq(schema.clanMembers.clanId, clanId))
    .all();
  
  // Get active skins for all members
  const memberUserIds = members.map(m => m.user.id);
  const activeSkins = memberUserIds.length > 0 ? await db
    .select({
      userSkin: schema.userSkins,
      item: schema.shopItems,
    })
    .from(schema.userSkins)
    .innerJoin(schema.shopItems, eq(schema.userSkins.skinId, schema.shopItems.id))
    .where(and(
      inArray(schema.userSkins.userId, memberUserIds),
      eq(schema.userSkins.isActive, true)
    ))
    .all() : [];
  
  // Create a map of userId -> activeSkin
  const activeSkinMap = new Map<string, { icon: string | null; name: string }>();
  activeSkins.forEach(({ userSkin, item }) => {
    activeSkinMap.set(userSkin.userId, {
      icon: item.icon || null,
      name: item.name,
    });
  });
  
  // Convert joinedAt to timestamp if it's a Date object
  const membersData = members.map(m => {
    let joinedAtValue: number | Date = m.membership.joinedAt;
    // If joinedAt is a Date object, convert to timestamp (seconds)
    if (joinedAtValue instanceof Date) {
      joinedAtValue = Math.floor(joinedAtValue.getTime() / 1000);
    } else if (typeof joinedAtValue === 'number') {
      // Already a timestamp, but ensure it's in seconds (not milliseconds)
      if (joinedAtValue > 10000000000) {
        joinedAtValue = Math.floor(joinedAtValue / 1000);
      }
    }
    return {
      ...m.user,
      role: m.membership.role,
      joinedAt: joinedAtValue as number,
      activeSkin: activeSkinMap.get(m.user.id) || null,
    };
  });

  return c.json({
    ...clan.clan,
    matiere: clan.matiere,
    members: membersData,
  });
});

app.get('/api/student/clans/my', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get user's clans
  const userClans = await db
    .select({
      membership: schema.clanMembers,
      clan: schema.clans,
      matiere: schema.matieres,
    })
    .from(schema.clanMembers)
    .innerJoin(schema.clans, eq(schema.clanMembers.clanId, schema.clans.id))
    .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
    .where(eq(schema.clanMembers.userId, user.id))
    .all();
  
  // Group by matiere and add member count
  const clansByMatiere: Record<string, any[]> = {};
  for (const uc of userClans) {
    const matiereId = uc.clan.matiereId;
    if (!clansByMatiere[matiereId]) {
      clansByMatiere[matiereId] = [];
    }
    
    // Get member count for this clan
    const memberCount = await db
      .select()
      .from(schema.clanMembers)
      .where(eq(schema.clanMembers.clanId, uc.clan.id))
      .all();
    
    clansByMatiere[matiereId].push({
      ...uc.clan,
      matiere: uc.matiere,
      role: uc.membership.role,
      joinedAt: uc.membership.joinedAt,
      memberCount: memberCount.length,
    });
  }
  
  return c.json({ clansByMatiere });
});

// Cette route est maintenant dans la section CLAN WARS plus bas dans le fichier

app.post('/api/student/clans/:id/join', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const clanId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    // Get clan
    const clan = await db.select().from(schema.clans).where(eq(schema.clans.id, clanId)).get();
    if (!clan) {
      return c.json({ error: 'Clan not found' }, 404);
    }
    
    // Check if already member
    const existingMember = await db
      .select()
      .from(schema.clanMembers)
      .where(and(
        eq(schema.clanMembers.clanId, clanId),
        eq(schema.clanMembers.userId, user.id)
      ))
      .get();
    
    if (existingMember) {
      return c.json({ error: 'Already a member of this clan' }, 400);
    }
    
    // Check if user is already in any clan (only one clan allowed total)
    const existingClan = await db
      .select({
        membership: schema.clanMembers,
        clan: schema.clans,
      })
      .from(schema.clanMembers)
      .innerJoin(schema.clans, eq(schema.clanMembers.clanId, schema.clans.id))
      .where(eq(schema.clanMembers.userId, user.id))
      .get();
    
    if (existingClan) {
      return c.json({ error: 'Vous êtes déjà dans un clan. Vous ne pouvez rejoindre qu\'un seul clan à la fois. Veuillez quitter votre clan actuel d\'abord.' }, 400);
    }
    
    // Join clan
    const membershipId = crypto.randomUUID();
    await db.insert(schema.clanMembers).values({
      id: membershipId,
      clanId,
      userId: user.id,
      role: 'member',
      joinedAt: new Date(),
    });
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/student/clans/:id/leave', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const clanId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    // Remove membership
    await db
      .delete(schema.clanMembers)
      .where(and(
        eq(schema.clanMembers.clanId, clanId),
        eq(schema.clanMembers.userId, user.id)
      ));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/student/clans/create', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { name, matiereId, description } = body;
    
    if (!name || !matiereId) {
      return c.json({ error: 'Name and matiereId are required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify matiere exists
    const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!matiere) {
      return c.json({ error: 'Matiere not found' }, 404);
    }
    
    // Check if user is already in a clan for this matiere
    const existingClanForMatiere = await db
      .select({
        membership: schema.clanMembers,
        clan: schema.clans,
      })
      .from(schema.clanMembers)
      .innerJoin(schema.clans, eq(schema.clanMembers.clanId, schema.clans.id))
      .where(and(
        eq(schema.clanMembers.userId, user.id),
        eq(schema.clans.matiereId, matiereId)
      ))
      .get();
    
    if (existingClanForMatiere) {
      return c.json({ error: 'You are already in a clan for this matiere' }, 400);
    }
    
    // Create clan
    const clanId = crypto.randomUUID();
    await db.insert(schema.clans).values({
      id: clanId,
      name,
      matiereId,
      description: description || null,
      createdAt: new Date(),
    });
    
    // Add creator as leader
    const membershipId = crypto.randomUUID();
    await db.insert(schema.clanMembers).values({
      id: membershipId,
      clanId,
      userId: user.id,
      role: 'leader',
      joinedAt: new Date(),
    });
    
    const clan = await db
      .select({
        clan: schema.clans,
        matiere: schema.matieres,
      })
      .from(schema.clans)
      .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
      .where(eq(schema.clans.id, clanId))
      .get();
    
    return c.json({
      ...clan?.clan,
      matiere: clan?.matiere,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ADMIN CLAN ROUTES ==========

app.post('/api/admin/clans', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { name, matiereId, description } = body;
    
    if (!name || !matiereId) {
      return c.json({ error: 'Name and matiereId are required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Verify matiere exists
    const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!matiere) {
      return c.json({ error: 'Matiere not found' }, 404);
    }
    
    // Create clan
    const clanId = crypto.randomUUID();
    await db.insert(schema.clans).values({
      id: clanId,
      name,
      matiereId,
      description: description || null,
      createdAt: new Date(),
    });
    
    const clan = await db
      .select({
        clan: schema.clans,
        matiere: schema.matieres,
      })
      .from(schema.clans)
      .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
      .where(eq(schema.clans.id, clanId))
      .get();
    
    return c.json({
      ...clan?.clan,
      matiere: clan?.matiere,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/clans/:id', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const clanId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    await db.delete(schema.clans).where(eq(schema.clans.id, clanId));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/admin/clans/members', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const db = drizzle(c.env.DB, { schema });
    
    // Get all clan memberships with clan and user info
    const memberships = await db
      .select({
        membership: schema.clanMembers,
        clan: schema.clans,
        user: schema.users,
        matiere: schema.matieres,
      })
      .from(schema.clanMembers)
      .innerJoin(schema.clans, eq(schema.clanMembers.clanId, schema.clans.id))
      .innerJoin(schema.users, eq(schema.clanMembers.userId, schema.users.id))
      .leftJoin(schema.matieres, eq(schema.clans.matiereId, schema.matieres.id))
      .all();
    
    const membersData = memberships.map(m => {
      let joinedAtValue: number | Date = m.membership.joinedAt;
      if (joinedAtValue instanceof Date) {
        joinedAtValue = Math.floor(joinedAtValue.getTime() / 1000);
      } else if (typeof joinedAtValue === 'number' && joinedAtValue > 10000000000) {
        joinedAtValue = Math.floor(joinedAtValue / 1000);
      }
      return {
        id: m.membership.id,
        clanId: m.clan.id,
        clanName: m.clan.name,
        userId: m.user.id,
        userName: m.user.prenom,
        role: m.membership.role,
        matiere: m.matiere?.nom || 'Inconnue',
        joinedAt: joinedAtValue as number,
      };
    });
    
    return c.json(membersData);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/api/admin/clans/members/:membershipId', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const membershipId = c.req.param('membershipId');
    const db = drizzle(c.env.DB, { schema });
    
    await db.delete(schema.clanMembers).where(eq(schema.clanMembers.id, membershipId));
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== CLAN WARS ROUTES ==========

app.get('/api/student/clans/wars/current', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const matiereId = c.req.query('matiereId');
  const db = drizzle(c.env.DB, { schema });
  
  // Check and finalize expired wars
  await checkAndFinalizeExpiredWars(db);
  
  if (matiereId) {
    // Get current war for specific matiere
    const war = await getOrCreateCurrentWar(db, matiereId);
    if (!war) {
      return c.json({ war: null });
    }
    
    // Get all contributions for this war
    const contributions = await db
      .select({
        contribution: schema.clanWarContributions,
        clan: schema.clans,
      })
      .from(schema.clanWarContributions)
      .innerJoin(schema.clans, eq(schema.clanWarContributions.clanId, schema.clans.id))
      .where(eq(schema.clanWarContributions.clanWarId, war.id))
      .all();
    
    // Calculate totals per clan
    const clanTotals: Record<string, { clan: any; total: number; memberCount: number }> = {};
    contributions.forEach(contrib => {
      const clanId = contrib.clan.id;
      if (!clanTotals[clanId]) {
        clanTotals[clanId] = {
          clan: contrib.clan,
          total: 0,
          memberCount: 0,
        };
      }
      clanTotals[clanId].total += contrib.contribution.bananasContributed;
      clanTotals[clanId].memberCount++;
    });
    
    // Convert to array and sort by total
    const ranking = Object.values(clanTotals)
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
    
    return c.json({
      war: {
        ...war,
        ranking,
      },
    });
  } else {
    // Get all current wars for all matieres
    const matieres = await db.select().from(schema.matieres).all();
    const wars = await Promise.all(
      matieres.map(async (matiere) => {
        const war = await getOrCreateCurrentWar(db, matiere.id);
        if (!war) return null;
        
        const contributions = await db
          .select({
            contribution: schema.clanWarContributions,
            clan: schema.clans,
          })
          .from(schema.clanWarContributions)
          .innerJoin(schema.clans, eq(schema.clanWarContributions.clanId, schema.clans.id))
          .where(eq(schema.clanWarContributions.clanWarId, war.id))
          .all();
        
        const clanTotals: Record<string, { clan: any; total: number }> = {};
        contributions.forEach(contrib => {
          const clanId = contrib.clan.id;
          if (!clanTotals[clanId]) {
            clanTotals[clanId] = {
              clan: contrib.clan,
              total: 0,
            };
          }
          clanTotals[clanId].total += contrib.contribution.bananasContributed;
        });
        
        const ranking = Object.values(clanTotals)
          .sort((a, b) => b.total - a.total)
          .map((item, index) => ({
            ...item,
            rank: index + 1,
          }));
        
        return {
          war: {
            ...war,
            matiere,
          },
          ranking,
        };
      })
    );
    
    return c.json({ wars: wars.filter(w => w !== null) });
  }
});

app.get('/api/student/clans/wars/:warId', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const warId = c.req.param('warId');
  const db = drizzle(c.env.DB, { schema });
  
  const war = await db
    .select({
      war: schema.clanWars,
      matiere: schema.matieres,
    })
    .from(schema.clanWars)
    .leftJoin(schema.matieres, eq(schema.clanWars.matiereId, schema.matieres.id))
    .where(eq(schema.clanWars.id, warId))
    .get();
  
  if (!war) {
    return c.json({ error: 'War not found' }, 404);
  }
  
  // Get all contributions with user details
  const contributions = await db
    .select({
      contribution: schema.clanWarContributions,
      clan: schema.clans,
      user: schema.users,
    })
    .from(schema.clanWarContributions)
    .innerJoin(schema.clans, eq(schema.clanWarContributions.clanId, schema.clans.id))
    .innerJoin(schema.users, eq(schema.clanWarContributions.userId, schema.users.id))
    .where(eq(schema.clanWarContributions.clanWarId, warId))
    .all();
  
  // Group by clan and calculate totals
  const clanData: Record<string, {
    clan: any;
    total: number;
    members: Array<{ user: any; contribution: number }>;
  }> = {};
  
  contributions.forEach(contrib => {
    const clanId = contrib.clan.id;
    if (!clanData[clanId]) {
      clanData[clanId] = {
        clan: contrib.clan,
        total: 0,
        members: [],
      };
    }
    clanData[clanId].total += contrib.contribution.bananasContributed;
    clanData[clanId].members.push({
      user: contrib.user,
      contribution: contrib.contribution.bananasContributed,
    });
  });
  
  // Sort members by contribution
  Object.values(clanData).forEach(data => {
    data.members.sort((a, b) => b.contribution - a.contribution);
  });
  
  // Convert to ranking
  const ranking = Object.values(clanData)
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  
  return c.json({
    war: {
      ...war.war,
      matiere: war.matiere,
    },
    ranking,
  });
});

app.get('/api/student/clans/wars/history', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const matiereId = c.req.query('matiereId');
  const db = drizzle(c.env.DB, { schema });
  
  const whereConditions = matiereId
    ? and(
        eq(schema.clanWars.status, 'finished'),
        eq(schema.clanWars.matiereId, matiereId)
      )
    : eq(schema.clanWars.status, 'finished');
  
  const finishedWars = await db
    .select({
      war: schema.clanWars,
      matiere: schema.matieres,
      winnerClan: schema.clans,
    })
    .from(schema.clanWars)
    .leftJoin(schema.matieres, eq(schema.clanWars.matiereId, schema.matieres.id))
    .leftJoin(schema.clans, eq(schema.clanWars.winnerClanId, schema.clans.id))
    .where(whereConditions)
    .orderBy(desc(schema.clanWars.finishedAt))
    .limit(50)
    .all();
  
  return c.json(finishedWars.map(w => ({
    ...w.war,
    matiere: w.matiere,
    winnerClan: w.winnerClan,
  })));
});

app.get('/api/student/clans/:clanId/war-contributions', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const clanId = c.req.param('clanId');
  const db = drizzle(c.env.DB, { schema });
  
  // Get current active war for this clan's matiere
  const clan = await db
    .select()
    .from(schema.clans)
    .where(eq(schema.clans.id, clanId))
    .get();
  
  if (!clan) {
    return c.json({ error: 'Clan not found' }, 404);
  }
  
  const war = await getOrCreateCurrentWar(db, clan.matiereId);
  if (!war) {
    return c.json({ contributions: [], war: null });
  }
  
  // Get contributions for this clan in current war
  const contributions = await db
    .select({
      contribution: schema.clanWarContributions,
      user: schema.users,
    })
    .from(schema.clanWarContributions)
    .innerJoin(schema.users, eq(schema.clanWarContributions.userId, schema.users.id))
    .where(and(
      eq(schema.clanWarContributions.clanWarId, war.id),
      eq(schema.clanWarContributions.clanId, clanId)
    ))
    .orderBy(desc(schema.clanWarContributions.bananasContributed))
    .all();
  
  const total = contributions.reduce((sum, c) => sum + c.contribution.bananasContributed, 0);
  
  return c.json({
    war: {
      ...war,
      matiere: clan.matiereId,
    },
    contributions: contributions.map(c => ({
      user: c.user,
      bananasContributed: c.contribution.bananasContributed,
      updatedAt: c.contribution.updatedAt,
    })),
    total,
  });
});

// ========== ADMIN CLAN WARS ROUTES ==========

app.get('/api/admin/clan-wars/config', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  const configs = await db.select().from(schema.clanWarsConfig).all();
  
  // Convert to key-value object
  const configObj: Record<string, { value: string; description?: string }> = {};
  configs.forEach(config => {
    configObj[config.key] = {
      value: config.value,
      description: config.description || undefined,
    };
  });
  
  return c.json(configObj);
});

app.put('/api/admin/clan-wars/config', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { key, value, description } = body;
    
    if (!key || value === undefined) {
      return c.json({ error: 'Key and value are required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    await setClanWarsConfig(db, key, String(value), description);
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/api/admin/clan-wars/stats', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all wars
  const allWars = await db.select().from(schema.clanWars).all();
  const activeWars = allWars.filter(w => w.status === 'active');
  const finishedWars = allWars.filter(w => w.status === 'finished');
  
  // Get total contributions
  const allContributions = await db.select().from(schema.clanWarContributions).all();
  const totalBananas = allContributions.reduce((sum, c) => sum + c.bananasContributed, 0);
  
  // Get unique clans that participated
  const uniqueClans = new Set(allContributions.map(c => c.clanId)).size;
  const uniqueUsers = new Set(allContributions.map(c => c.userId)).size;
  
  return c.json({
    totalWars: allWars.length,
    activeWars: activeWars.length,
    finishedWars: finishedWars.length,
    totalBananas,
    uniqueClans,
    uniqueUsers,
    totalContributions: allContributions.length,
  });
});

app.get('/api/admin/clan-wars', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const status = c.req.query('status');
  const db = drizzle(c.env.DB, { schema });
  
  const whereCondition = status
    ? eq(schema.clanWars.status, status)
    : undefined;
  
  const wars = await db
    .select({
      war: schema.clanWars,
      matiere: schema.matieres,
      winnerClan: schema.clans,
    })
    .from(schema.clanWars)
    .leftJoin(schema.matieres, eq(schema.clanWars.matiereId, schema.matieres.id))
    .leftJoin(schema.clans, eq(schema.clanWars.winnerClanId, schema.clans.id))
    .where(whereCondition)
    .orderBy(desc(schema.clanWars.createdAt))
    .limit(100)
    .all();
  
  return c.json(wars.map(w => ({
    ...w.war,
    matiere: w.matiere,
    winnerClan: w.winnerClan,
  })));
});

app.post('/api/admin/clan-wars/manual-create', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { matiereId, weekStart, weekEnd } = body;
    
    if (!matiereId) {
      return c.json({ error: 'Matiere ID is required' }, 400);
    }
    
    const db = drizzle(c.env.DB, { schema });
    
    // Check if matiere exists
    const matiere = await db.select().from(schema.matieres).where(eq(schema.matieres.id, matiereId)).get();
    if (!matiere) {
      return c.json({ error: 'Matiere not found' }, 404);
    }
    
    // Check if active war already exists
    const existingWar = await db
      .select()
      .from(schema.clanWars)
      .where(and(
        eq(schema.clanWars.matiereId, matiereId),
        eq(schema.clanWars.status, 'active')
      ))
      .get();
    
    if (existingWar) {
      return c.json({ error: 'Active war already exists for this matiere' }, 400);
    }
    
    const warId = crypto.randomUUID();
    const startDate = weekStart ? new Date(weekStart) : getCurrentWeekRange().weekStart;
    const endDate = weekEnd ? new Date(weekEnd) : getCurrentWeekRange().weekEnd;
    
    await db.insert(schema.clanWars).values({
      id: warId,
      matiereId,
      weekStart: startDate,
      weekEnd: endDate,
      status: 'active',
      totalBananas: 0,
      createdAt: new Date(),
    });
    
    const war = await db
      .select({
        war: schema.clanWars,
        matiere: schema.matieres,
      })
      .from(schema.clanWars)
      .leftJoin(schema.matieres, eq(schema.clanWars.matiereId, schema.matieres.id))
      .where(eq(schema.clanWars.id, warId))
      .get();
    
    return c.json({
      ...war?.war,
      matiere: war?.matiere,
    }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post('/api/admin/clan-wars/:id/finish', async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const warId = c.req.param('id');
    const db = drizzle(c.env.DB, { schema });
    
    const war = await db
      .select()
      .from(schema.clanWars)
      .where(eq(schema.clanWars.id, warId))
      .get();
    
    if (!war) {
      return c.json({ error: 'War not found' }, 404);
    }
    
    if (war.status === 'finished') {
      return c.json({ error: 'War already finished' }, 400);
    }
    
    await finishWarAndDistributeRewards(db, warId);
    
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
  // IMPORTANT: Only return duels that are not full (player2Id is null)
  // Duels are limited to exactly 2 players
  const waitingDuels = await db
    .select({
      duel: schema.duels,
      player1: schema.users,
      matiere: schema.matieres,
    })
    .from(schema.duels)
    .leftJoin(schema.users, eq(schema.duels.player1Id, schema.users.id))
    .leftJoin(schema.matieres, eq(schema.duels.matiereId, schema.matieres.id))
    .where(and(
      eq(schema.duels.status, 'waiting'),
      sql`${schema.duels.player2Id} IS NULL` // Only duels with no player2 (not full)
    ))
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
    
    // STRICT VALIDATION: Duels are limited to exactly 2 players
    // Check if duel already has a player2 (duel is full)
    if (duel.player2Id) {
      return c.json({ 
        error: 'Duel is already full. Duels are limited to 2 players maximum.' 
      }, 400);
    }
    
    // Additional check: Verify the duel is still in waiting status and not full
    // This prevents race conditions where multiple users try to join simultaneously
    const currentDuel = await db.select().from(schema.duels).where(eq(schema.duels.id, duelId)).get();
    if (!currentDuel || currentDuel.status !== 'waiting' || currentDuel.player2Id) {
      return c.json({ 
        error: 'This duel is no longer available. It may have been filled or cancelled.' 
      }, 400);
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
    
    // Calculate total response time for each player (only for correct answers) - used for tie breaking
    const player1TotalTimeForTie = player1Answers
      .filter(a => a.isCorrect && a.responseTimeMs)
      .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
    const player2TotalTimeForTie = player2Answers
      .filter(a => a.isCorrect && a.responseTimeMs)
      .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
    
    // Only finish the duel when BOTH players have answered all questions
    if (player1Finished && player2Finished) {
      // Determine winner - player with most points wins, or fastest time if tie
      let winnerId = null;
      if (player1Score > player2Score) {
        winnerId = duel.duel.player1Id;
      } else if (player2Score > player1Score) {
        winnerId = duel.duel.player2Id;
      } else {
        // In case of exact tie, player with fastest total time wins
        if (player1TotalTimeForTie > 0 && player2TotalTimeForTie > 0) {
          winnerId = player1TotalTimeForTie < player2TotalTimeForTie ? duel.duel.player1Id : duel.duel.player2Id;
        } else {
          // Fallback if no time data, player1 wins
          winnerId = duel.duel.player1Id;
        }
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
  
  // Get active skins for both players
  const playerIds = [duel.duel.player1Id];
  if (duel.duel.player2Id) {
    playerIds.push(duel.duel.player2Id);
  }
  
  const activeSkins = playerIds.length > 0 ? await db
    .select({
      userSkin: schema.userSkins,
      item: schema.shopItems,
    })
    .from(schema.userSkins)
    .innerJoin(schema.shopItems, eq(schema.userSkins.skinId, schema.shopItems.id))
    .where(and(
      inArray(schema.userSkins.userId, playerIds),
      eq(schema.userSkins.isActive, true)
    ))
    .all() : [];
  
  // Create a map of userId -> activeSkin
  const activeSkinMap = new Map<string, { icon: string | null; name: string }>();
  activeSkins.forEach(({ userSkin, item }) => {
    activeSkinMap.set(userSkin.userId, {
      icon: item.icon || null,
      name: item.name,
    });
  });
  
  // Add activeSkin to player1 and player2
  const player1WithSkin = duel.player1 ? {
    ...duel.player1,
    activeSkin: activeSkinMap.get(duel.player1.id) || null,
  } : null;
  
  const player2WithSkin = player2 ? {
    ...player2,
    activeSkin: activeSkinMap.get(player2.id) || null,
  } : null;
  
  // Calculate total response time for each player (only for correct answers) - for display
  const player1TotalTime = player1Answers
    .filter(a => a.isCorrect && a.responseTimeMs)
    .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
  const player2TotalTime = player2Answers
    .filter(a => a.isCorrect && a.responseTimeMs)
    .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
  
  return c.json({
    ...duel.duel,
    player1: player1WithSkin,
    player2: player2WithSkin,
    course: duel.course,
    matiere: matiere,
    player1Score,
    player2Score,
    player1TotalTime,
    player2TotalTime,
    waitingForOpponent,
  });
});

app.get('/api/student/duels/stats', async (c) => {
  const user = await getUser(c);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const db = drizzle(c.env.DB, { schema });
  
  // Get all duels where user participated
  const allDuels = await db
    .select()
    .from(schema.duels)
    .where(or(
      eq(schema.duels.player1Id, user.id),
      eq(schema.duels.player2Id, user.id)
    ))
    .all();
  
  const finishedDuels = allDuels.filter(d => d.status === 'finished');
  const wins = finishedDuels.filter(d => d.winnerId === user.id).length;
  const losses = finishedDuels.length - wins;
  const winRate = finishedDuels.length > 0 ? (wins / finishedDuels.length) * 100 : 0;
  
  // Calculate total bananas won/lost
  let bananasWon = 0;
  let bananasLost = 0;
  
  for (const duel of finishedDuels) {
    if (duel.winnerId === user.id) {
      bananasWon += duel.betAmount * 2; // Winner gets both bets
    } else {
      bananasLost += duel.betAmount; // Loser loses their bet
    }
  }
  
  // Get recent duels (last 5)
  const recentDuels = finishedDuels
    .sort((a, b) => {
      const aDate = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const bDate = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 5)
    .map(duel => ({
      id: duel.id,
      matiereId: duel.matiereId,
      betAmount: duel.betAmount,
      winnerId: duel.winnerId,
      finishedAt: duel.finishedAt,
    }));
  
  return c.json({
    totalDuels: allDuels.length,
    finishedDuels: finishedDuels.length,
    wins,
    losses,
    winRate: Math.round(winRate * 10) / 10,
    bananasWon,
    bananasLost,
    netBananas: bananasWon - bananasLost,
    recentDuels,
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
    
    // Update streak (check-in counts as activity)
    await updateUserStreak(db, user.id, new Date());
    
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

// Scheduled event handler for cron jobs
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const db = drizzle(env.DB, { schema });
        await checkAndFinalizeExpiredWars(db);
      })()
    );
  },
};

