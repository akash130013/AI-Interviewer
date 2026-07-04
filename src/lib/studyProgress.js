import * as SecureStore from "expo-secure-store";

const KEY = "study_progress";

async function loadAll() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAll(data) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(data));
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
