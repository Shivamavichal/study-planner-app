-- Seed data for Student Study Planner

-- Insert sample user (password: password123)
INSERT INTO users (email, password_hash, full_name) VALUES 
('student@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', 'John Student');

-- Insert sample subjects
INSERT INTO subjects (user_id, name, description) VALUES 
(1, 'Mathematics', 'Calculus and Linear Algebra'),
(1, 'Physics', 'Mechanics and Thermodynamics'),
(1, 'Computer Science', 'Data Structures and Algorithms'),
(1, 'Chemistry', 'Organic Chemistry');

-- Insert sample exams
INSERT INTO exams (subject_id, user_id, exam_name, exam_date, priority_level) VALUES 
(1, 1, 'Calculus Midterm', '2026-02-20', 'high'),
(2, 1, 'Physics Final', '2026-03-15', 'high'),
(3, 1, 'CS Assignment', '2026-02-12', 'medium'),
(4, 1, 'Chemistry Quiz', '2026-02-25', 'medium');

-- Insert user preferences
INSERT INTO user_preferences (user_id, daily_study_hours, preferred_start_time, preferred_end_time) VALUES 
(1, 6.0, '09:00:00', '18:00:00');

-- Insert sample study plans for the next few days
INSERT INTO study_plans (user_id, subject_id, study_date, planned_hours, topic, description) VALUES 
(1, 1, '2026-02-06', 2.0, 'Derivatives', 'Practice derivative problems'),
(1, 3, '2026-02-06', 1.5, 'Binary Trees', 'Implement tree traversal algorithms'),
(1, 2, '2026-02-07', 2.5, 'Newton Laws', 'Review mechanics problems'),
(1, 4, '2026-02-07', 1.0, 'Molecular Structure', 'Study organic compounds'),
(1, 1, '2026-02-08', 3.0, 'Integration', 'Integration by parts practice');

-- Insert sample progress
INSERT INTO progress (user_id, study_plan_id, actual_hours, notes) VALUES 
(1, 1, 1.8, 'Completed most problems, need more practice with chain rule'),
(1, 2, 1.5, 'Successfully implemented inorder and preorder traversal');