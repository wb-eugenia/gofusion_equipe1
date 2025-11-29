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

