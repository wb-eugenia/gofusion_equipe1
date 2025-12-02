import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  prenom: text('prenom').notNull(),
  xp: integer('xp').default(0).notNull(),
  role: text('role').default('student').notNull(), // 'student' | 'admin'
  streakDays: integer('streak_days').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const matieres = sqliteTable('matieres', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  titre: text('titre').notNull(),
  description: text('description').notNull(),
  matiereId: text('matiere_id').references(() => matieres.id, { onDelete: 'cascade' }),
  gameType: text('game_type').notNull().default('quiz'), // 'quiz' | 'memory' | 'match'
  theoreticalContent: text('theoretical_content'), // Contenu théorique WYSIWYG
  xpReward: integer('xp_reward').default(50).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  type: text('type').notNull().default('multiple_choice'), // 'multiple_choice' | 'memory_pair' | 'match_pair'
  options: text('options'), // JSON string for quiz options or memory/match pairs
  correctAnswer: text('correct_answer'), // For quiz: answer index or value, for memory/match: pair data
  order: integer('order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
});

export const badges = sqliteTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(), // path to SVG icon
  description: text('description').notNull(),
  thresholdXp: integer('threshold_xp').default(0), // null if not XP-based
  conditionType: text('condition_type').notNull(), // 'xp' | 'top10' | 'courses_completed' | 'streak'
  conditionValue: integer('condition_value'), // e.g., 5 for 5 courses completed
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(), // Code unique pour le QR code
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  status: text('status').default('waiting').notNull(), // 'waiting' | 'started' | 'finished'
  startedAt: integer('started_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  isFixed: integer('is_fixed', { mode: 'boolean' }).default(false).notNull(),
  recurrenceType: text('recurrence_type'), // 'daily' | 'weekly' | null
  recurrenceDay: integer('recurrence_day'), // Day of week (0-6) for weekly
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }), // For scheduled sessions
});

export const sessionAttendances = sqliteTable('session_attendances', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }).notNull(),
});

export const sessionQuizAnswers = sqliteTable('session_quiz_answers', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull(),
});

export const stressLevels = sqliteTable('stress_levels', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  levelBefore: integer('level_before').notNull(), // 1-10
  levelAfter: integer('level_after').notNull(), // 1-10
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  durationSeconds: integer('duration_seconds'),
});

export const shopItems = sqliteTable('shop_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'skin' | 'powerup' | 'cosmetic'
  price: integer('price').notNull(), // Price in bananas
  data: text('data'), // JSON string for metadata
  icon: text('icon'), // Icon path
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userPurchases = sqliteTable('user_purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => shopItems.id, { onDelete: 'cascade' }),
  purchasedAt: integer('purchased_at', { mode: 'timestamp' }).notNull(),
});

export const userSkins = sqliteTable('user_skins', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skinId: text('skin_id').notNull().references(() => shopItems.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const duels = sqliteTable('duels', {
  id: text('id').primaryKey(),
  player1Id: text('player1_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  player2Id: text('player2_id').references(() => users.id, { onDelete: 'cascade' }),
  matiereId: text('matiere_id').references(() => matieres.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  status: text('status').default('waiting').notNull(), // 'waiting' | 'active' | 'finished'
  winnerId: text('winner_id').references(() => users.id, { onDelete: 'set null' }),
  betAmount: integer('bet_amount').default(0).notNull(), // Bananas bet by each player
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
});

export const duelAnswers = sqliteTable('duel_answers', {
  id: text('id').primaryKey(),
  duelId: text('duel_id').notNull().references(() => duels.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull(),
  responseTimeMs: integer('response_time_ms'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionAttendance = typeof sessionAttendances.$inferSelect;
export type SessionQuizAnswer = typeof sessionQuizAnswers.$inferSelect;
export type NewSessionQuizAnswer = typeof sessionQuizAnswers.$inferInsert;

