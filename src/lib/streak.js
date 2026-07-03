import * as SecureStore from "expo-secure-store";

const KEY = "interview_streak";

export async function getStreakData() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastDate: null };
  }
}

export async function recordInterviewToday() {
  const today = new Date().toDateString();
  const { count, lastDate } = await getStreakData();

  if (lastDate === today) return count;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newCount = lastDate === yesterday ? count + 1 : 1;

  await SecureStore.setItemAsync(KEY, JSON.stringify({ count: newCount, lastDate: today }));
  return newCount;
}
