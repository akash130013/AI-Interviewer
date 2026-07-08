import * as SecureStore from "expo-secure-store";

const KEY = "interview_streak";

export async function getStreakData() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { count: 0, lastDate: null, bestCount: 0 };
    const data = JSON.parse(raw);
    return { bestCount: 0, ...data };
  } catch {
    return { count: 0, lastDate: null, bestCount: 0 };
  }
}

export async function recordInterviewToday() {
  const today = new Date().toDateString();
  const { count, lastDate, bestCount } = await getStreakData();

  if (lastDate === today) return count;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newCount = lastDate === yesterday ? count + 1 : 1;
  const newBest = Math.max(bestCount || 0, newCount);

  await SecureStore.setItemAsync(
    KEY,
    JSON.stringify({ count: newCount, lastDate: today, bestCount: newBest })
  );
  return newCount;
}
