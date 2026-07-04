import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (!Device.isDevice) return false; // simulators can't receive notifications

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Cancel all previously scheduled notifications and reschedule fresh ones.
// Call this once on app launch (after permission granted) and again after
// each completed interview so the streak-protection time resets correctly.
export async function scheduleDailyNotifications(streakCount = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  // ── Daily practice reminder — 7pm every day ──────────────────────────────
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to practice 🎙",
      body:
        streakCount > 0
          ? `You're on a ${streakCount}-day streak. Keep it going with a quick 5-min session!`
          : "A quick 5-min mock interview keeps you sharp. Tap to start.",
      sound: true,
    },
    trigger: {
      hour: 19,
      minute: 0,
      repeats: true,
    },
  });

  // ── Streak protection — 9pm if streak > 1 ────────────────────────────────
  if (streakCount > 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 ${streakCount}-day streak at risk!`,
        body: "You haven't practiced today. 3 questions and your streak is safe.",
        sound: true,
      },
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      },
    });
  }

  // ── Weekly summary — every Sunday at 10am ────────────────────────────────
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Weekly recap 📊",
      body: "Check your interview history and see how your readiness is trending.",
      sound: false,
    },
    trigger: {
      weekday: 1, // Sunday (1 = Sunday in Expo's notation)
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });
}

// Fire an immediate local notification after a completed interview session.
export async function notifyInterviewComplete(score) {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const isGreat = score >= 75;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isGreat ? `Great session! 🎉 You scored ${score}%` : `Session complete — score: ${score}%`,
      body: isGreat
        ? "Check your detailed report to see what went well."
        : "Review your report to find areas to improve.",
      sound: true,
    },
    trigger: null, // immediate
  });
}
