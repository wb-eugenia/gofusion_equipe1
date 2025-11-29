// API route to get course with questions
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../../prisma/schema.d1';

export function getCourseWithQuestions(c: any, courseId: string) {
  const db = drizzle(c.env.DB, { schema });
  
  return db
    .select({
      course: schema.courses,
      matiere: schema.matieres,
      questions: schema.questions,
    })
    .from(schema.courses)
    .leftJoin(schema.matieres, eq(schema.courses.matiereId, schema.matieres.id))
    .leftJoin(schema.questions, eq(schema.courses.id, schema.questions.courseId))
    .where(eq(schema.courses.id, courseId))
    .all();
}

