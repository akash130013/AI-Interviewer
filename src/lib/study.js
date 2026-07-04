import { supabase } from "./supabase";

export async function getStudyCategories() {
  // Fetch categories, topics, and question counts separately to avoid
  // FK relationship detection issues with Supabase nested queries.
  const { data: cats, error: catErr } = await supabase
    .from("study_categories")
    .select("*")
    .order("sort_order");
  if (catErr) throw catErr;

  const { data: topics, error: topicErr } = await supabase
    .from("study_topics")
    .select("*")
    .order("sort_order");
  if (topicErr) throw topicErr;

  const { data: qCounts, error: qErr } = await supabase
    .from("study_questions")
    .select("id, topic_id");
  if (qErr) throw qErr;

  // Build lookup: topic_id → question count
  const countByTopic = {};
  for (const q of qCounts) {
    countByTopic[q.topic_id] = (countByTopic[q.topic_id] || 0) + 1;
  }

  // Attach topics (with question count) to their categories
  return cats.map((cat) => ({
    ...cat,
    study_topics: topics
      .filter((t) => t.category_id === cat.id)
      .map((t) => ({
        ...t,
        study_questions: Array.from({ length: countByTopic[t.id] || 0 }, (_, i) => ({ id: i })),
      })),
  }));
}

export async function getStudyTopics(categoryId) {
  const { data, error } = await supabase
    .from("study_topics")
    .select("*, study_questions(id)")
    .eq("category_id", categoryId)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getStudyQuestions(topicId) {
  const { data, error } = await supabase
    .from("study_questions")
    .select("*")
    .eq("topic_id", topicId)
    .order("sort_order");
  if (error) throw error;
  return data;
}
