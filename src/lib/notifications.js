import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Expo Go SDK 53+ removed push notification support — local notifications
// still work in a dev/production build. Wrap everything in try-catch so
// the app doesn't break when running inside Expo Go during development.

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (_) {}

async function requestNotificationPermission() {
  try {
    if (!Device.isDevice) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (_) {
    return false;
  }
}

export async function scheduleDailyNotifications(streakCount = 0) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    // Daily practice reminder — 7pm every day
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to practice 🎙",
        body: streakCount > 0
          ? `You're on a ${streakCount}-day streak. Keep it going with a quick 5-min session!`
          : "A quick 5-min mock interview keeps you sharp. Tap to start.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 0,
      },
    });

    // Streak protection — 9pm (only if streak > 1)
    if (streakCount > 1) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔥 ${streakCount}-day streak at risk!`,
          body: "You haven't practiced today. 3 questions and your streak is safe.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 21,
          minute: 0,
        },
      });
    }

    // Weekly recap — every Sunday at 10am
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Weekly recap 📊",
        body: "Check your interview history and see how your readiness is trending.",
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 10,
        minute: 0,
      },
    });
  } catch (_) {
    // Silently ignore — notifications unavailable in Expo Go
  }
}

export async function notifyInterviewComplete(score) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const isGreat = score >= 75;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isGreat
          ? `Great session! 🎉 You scored ${score}%`
          : `Session complete — score: ${score}%`,
        body: isGreat
          ? "Check your detailed report to see what went well."
          : "Review your report to find areas to improve.",
        sound: true,
      },
      trigger: null,
    });
  } catch (_) {
    // Silently ignore — notifications unavailable in Expo Go
  }
}
