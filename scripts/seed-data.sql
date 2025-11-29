-- Insert 5 matières
INSERT OR IGNORE INTO matieres (id, nom, description, created_at) VALUES
('matiere-1', 'Mathématiques', 'Apprenez les mathématiques de manière ludique', strftime('%s', 'now')),
('matiere-2', 'Français', 'Maîtrisez la langue française avec des jeux interactifs', strftime('%s', 'now')),
('matiere-3', 'Histoire', 'Découvrez l''histoire à travers des quiz et des jeux', strftime('%s', 'now')),
('matiere-4', 'Sciences', 'Explorez les sciences avec des activités amusantes', strftime('%s', 'now')),
('matiere-5', 'Géographie', 'Apprenez la géographie en jouant', strftime('%s', 'now'));

-- Insert 1 cours par matière avec différents types de jeux
-- Mathématiques - Quiz
INSERT OR IGNORE INTO courses (id, titre, description, matiere_id, game_type, xp_reward, created_at) VALUES
('course-1', 'Quiz Mathématiques - Niveau 1', 'Testez vos connaissances en mathématiques avec ce quiz', 'matiere-1', 'quiz', 50, strftime('%s', 'now'));

-- Français - Memory
INSERT OR IGNORE INTO courses (id, titre, description, matiere_id, game_type, xp_reward, created_at) VALUES
('course-2', 'Memory Français - Vocabulaire', 'Mémorisez les mots et leurs définitions', 'matiere-2', 'memory', 60, strftime('%s', 'now'));

-- Histoire - Quiz
INSERT OR IGNORE INTO courses (id, titre, description, matiere_id, game_type, xp_reward, created_at) VALUES
('course-3', 'Quiz Histoire - Moyen Âge', 'Testez vos connaissances sur le Moyen Âge', 'matiere-3', 'quiz', 55, strftime('%s', 'now'));

-- Sciences - Match (Relier)
INSERT OR IGNORE INTO courses (id, titre, description, matiere_id, game_type, xp_reward, created_at) VALUES
('course-4', 'Relier Sciences - Éléments', 'Reliez les éléments scientifiques à leurs descriptions', 'matiere-4', 'match', 65, strftime('%s', 'now'));

-- Géographie - Quiz
INSERT OR IGNORE INTO courses (id, titre, description, matiere_id, game_type, xp_reward, created_at) VALUES
('course-5', 'Quiz Géographie - Capitales', 'Connaissez-vous les capitales du monde ?', 'matiere-5', 'quiz', 50, strftime('%s', 'now'));

-- Questions pour le Quiz Mathématiques (5 questions)
INSERT OR IGNORE INTO questions (id, course_id, question, type, options, correct_answer, "order", created_at) VALUES
('q1-1', 'course-1', 'Combien font 2 + 2 ?', 'multiple_choice', '["2", "3", "4", "5"]', '2', 1, strftime('%s', 'now')),
('q1-2', 'course-1', 'Quel est le résultat de 5 × 3 ?', 'multiple_choice', '["10", "15", "20", "25"]', '1', 2, strftime('%s', 'now')),
('q1-3', 'course-1', 'Combien font 10 - 4 ?', 'multiple_choice', '["4", "5", "6", "7"]', '2', 3, strftime('%s', 'now')),
('q1-4', 'course-1', 'Quel est le résultat de 8 ÷ 2 ?', 'multiple_choice', '["2", "3", "4", "5"]', '2', 4, strftime('%s', 'now')),
('q1-5', 'course-1', 'Combien font 3² ?', 'multiple_choice', '["6", "9", "12", "15"]', '1', 5, strftime('%s', 'now'));

-- Questions pour le Memory Français (5 paires)
INSERT OR IGNORE INTO questions (id, course_id, question, type, options, correct_answer, "order", created_at) VALUES
('q2-1', 'course-2', 'Mot: Chat', 'memory_pair', '["Chat", "Cat"]', 'Cat', 1, strftime('%s', 'now')),
('q2-2', 'course-2', 'Mot: Maison', 'memory_pair', '["Maison", "House"]', 'House', 2, strftime('%s', 'now')),
('q2-3', 'course-2', 'Mot: Livre', 'memory_pair', '["Livre", "Book"]', 'Book', 3, strftime('%s', 'now')),
('q2-4', 'course-2', 'Mot: École', 'memory_pair', '["École", "School"]', 'School', 4, strftime('%s', 'now')),
('q2-5', 'course-2', 'Mot: Ami', 'memory_pair', '["Ami", "Friend"]', 'Friend', 5, strftime('%s', 'now'));

-- Questions pour le Quiz Histoire (5 questions)
INSERT OR IGNORE INTO questions (id, course_id, question, type, options, correct_answer, "order", created_at) VALUES
('q3-1', 'course-3', 'En quelle année a eu lieu la bataille de Hastings ?', 'multiple_choice', '["1064", "1066", "1068", "1070"]', '1', 1, strftime('%s', 'now')),
('q3-2', 'course-3', 'Qui était le roi de France pendant la Guerre de Cent Ans ?', 'multiple_choice', '["Louis XIV", "Charlemagne", "Charles VII", "Napoléon"]', '2', 2, strftime('%s', 'now')),
('q3-3', 'course-3', 'Quand a commencé le Moyen Âge ?', 'multiple_choice', '["476 ap. J.-C.", "500 ap. J.-C.", "1000 ap. J.-C.", "1200 ap. J.-C."]', '0', 3, strftime('%s', 'now')),
('q3-4', 'course-3', 'Quelle était la capitale de l''Empire byzantin ?', 'multiple_choice', '["Rome", "Athènes", "Constantinople", "Alexandrie"]', '2', 4, strftime('%s', 'now')),
('q3-5', 'course-3', 'Qui a écrit "Le Prince" ?', 'multiple_choice', '["Dante", "Machiavel", "Shakespeare", "Voltaire"]', '1', 5, strftime('%s', 'now'));

-- Questions pour le Match Sciences (5 paires à relier)
INSERT OR IGNORE INTO questions (id, course_id, question, type, options, correct_answer, "order", created_at) VALUES
('q4-1', 'course-4', 'Élément: H', 'match_pair', '["H", "Hydrogène"]', 'Hydrogène', 1, strftime('%s', 'now')),
('q4-2', 'course-4', 'Élément: O', 'match_pair', '["O", "Oxygène"]', 'Oxygène', 2, strftime('%s', 'now')),
('q4-3', 'course-4', 'Élément: Fe', 'match_pair', '["Fe", "Fer"]', 'Fer', 3, strftime('%s', 'now')),
('q4-4', 'course-4', 'Élément: Au', 'match_pair', '["Au", "Or"]', 'Or', 4, strftime('%s', 'now')),
('q4-5', 'course-4', 'Élément: Na', 'match_pair', '["Na", "Sodium"]', 'Sodium', 5, strftime('%s', 'now'));

-- Questions pour le Quiz Géographie (5 questions)
INSERT OR IGNORE INTO questions (id, course_id, question, type, options, correct_answer, "order", created_at) VALUES
('q5-1', 'course-5', 'Quelle est la capitale de la France ?', 'multiple_choice', '["Lyon", "Marseille", "Paris", "Toulouse"]', '2', 1, strftime('%s', 'now')),
('q5-2', 'course-5', 'Quelle est la capitale de l''Espagne ?', 'multiple_choice', '["Barcelone", "Madrid", "Séville", "Valence"]', '1', 2, strftime('%s', 'now')),
('q5-3', 'course-5', 'Quelle est la capitale de l''Italie ?', 'multiple_choice', '["Milan", "Naples", "Rome", "Venise"]', '2', 3, strftime('%s', 'now')),
('q5-4', 'course-5', 'Quelle est la capitale de l''Allemagne ?', 'multiple_choice', '["Berlin", "Hambourg", "Munich", "Francfort"]', '0', 4, strftime('%s', 'now')),
('q5-5', 'course-5', 'Quelle est la capitale du Royaume-Uni ?', 'multiple_choice', '["Birmingham", "Liverpool", "Londres", "Manchester"]', '2', 5, strftime('%s', 'now'));

