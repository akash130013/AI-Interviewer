-- Run this first in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS study_categories (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📚',
  color      TEXT NOT NULL DEFAULT '#111111',
  bg_color   TEXT NOT NULL DEFAULT '#f5f5f5',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS study_topics (
  id          TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES study_categories(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS study_questions (
  id          SERIAL PRIMARY KEY,
  topic_id    TEXT NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Public read (no auth needed to study)
ALTER TABLE study_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_questions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_categories" ON study_categories FOR SELECT USING (true);
CREATE POLICY "public_read_topics"     ON study_topics     FOR SELECT USING (true);
CREATE POLICY "public_read_questions"  ON study_questions  FOR SELECT USING (true);
