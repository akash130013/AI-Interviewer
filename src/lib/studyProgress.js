import * as SecureStore from "expo-secure-store";
import { getSessionSafe } from "./supabase";

async function getKey() {
  try {
    const session = await getSessionSafe();
    const uid = session?.user?.id;
    return uid ? `study_progress_${uid}` : "study_progress";
  } catch {
    return "study_progress";
  }
}

async function loadAll() {
  try {
    const key = await getKey();
    const raw = await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAll(data) {
  const key = await getKey();
  await SecureStore.setItemAsync(key, JSON.stringify(data));
}

export async function getStudiedIds(topicId) {
  const all = await loadAll();
  return all[topicId] || [];
}

export async function toggleStudied(topicId, questionId) {
  const all = await loadAll();
  const studied = new Set(all[topicId] || []);
  if (studied.has(questionId)) {
    studied.delete(questionId);
  } else {
    studied.add(questionId);
  }
  all[topicId] = [...studied];
  await saveAll(all);
  return all[topicId];
}

export async function getTopicProgress(topicId, totalQuestions) {
  const studied = await getStudiedIds(topicId);
  return { studied: studied.length, total: totalQuestions };
}

export async function getAllProgress() {
  return loadAll();
}
