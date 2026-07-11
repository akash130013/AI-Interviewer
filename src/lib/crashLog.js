import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY   = "@ib_crash_log";
const MAX   = 30; // keep last 30 entries

export async function logError(tag, message, stack = "") {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    const entries  = existing ? JSON.parse(existing) : [];
    entries.unshift({
      ts:  new Date().toISOString(),
      tag,
      msg: String(message).slice(0, 400),
      stack: String(stack).slice(0, 600),
    });
    await AsyncStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch (_) {}
}

export async function getLogs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export async function clearLogs() {
  try { await AsyncStorage.removeItem(KEY); } catch (_) {}
}
