import { supabase } from "./supabase";

export async function getStudyCategories() {
  const { data, error } = await supabase
    .from("study_categories")
    .select(`
      *,
      study_topics (
        id,
        title,
        sort_order,
        study_questions ( id )
      )
    `)
    .order("sort_order");
  if (error) throw error;
  return data;
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
