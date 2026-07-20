// Sentry must be the very first import so it hooks into the JS error handler
// before any other module code runs.
import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  enableNativeCrashHandling: false,
  tracesSampleRate: 0.1,
  debug: false,
});

import "react-native-gesture-handler";
import { useState, useEffect, Component } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  LogBox, StyleSheet, Platform, ActivityIndicator,
} from "react-native";

LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase, getSessionSafe } from "./src/lib/supabase";
import { scheduleDailyNotifications } from "./src/lib/notifications";
import { getStreakData } from "./src/lib/streak";
import { getProfile } from "./src/lib/profile";
import { logError } from "./src/lib/crashLog";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import InterviewScreen from "./src/screens/InterviewScreen";
import ReportScreen from "./src/screens/ReportScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StudyLibraryScreen from "./src/screens/StudyLibraryScreen";
import StudyTopicListScreen from "./src/screens/StudyTopicListScreen";
import StudyTopicScreen from "./src/screens/StudyTopicScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import FAQScreen from "./src/screens/FAQScreen";

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Global JS error capture ───────────────────────────────────────────────────

let _globalErrorSetter = null;

try {
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    const msg   = error?.message || "Unknown error";
    const stack = error?.stack   || "";
    console.error("[GlobalError] isFatal=" + isFatal, msg, stack);
    logError("GLOBAL", msg, stack);
    if (SENTRY_DSN) Sentry.captureException(error);
    if (_globalErrorSetter) _globalErrorSetter(msg + "\n\n" + stack);
  });
} catch (_) {}

// ── Error Boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, globalError: null };
    _globalErrorSetter = (msg) => this.setState({ globalError: msg });
  }

  static getDerivedStateFromError(error) {
    return { error: error?.message + "\n\n" + (error?.stack || "") };
  }

  componentDidCatch(error, info) {
    const msg = error?.message || "Unknown";
    logError("BOUNDARY", msg, (error?.stack || "") + "\n" + (info?.componentStack || ""));
    if (SENTRY_DSN) Sentry.captureException(error);
    console.error("[ErrorBoundary] caught:", msg, info?.componentStack);
  }

  render() {
    const msg = this.state.error || this.state.globalError;
    if (msg) {
      return <CrashScreen message={msg} onDismiss={() => this.setState({ error: null, globalError: null })} />;
    }
    return this.props.children;
  }
}

function CrashScreen({ message, onDismiss }) {
  return (
    <SafeAreaView style={cs.container} edges={["top", "bottom"]}>
      <View style={cs.header}>
        <Text style={cs.title}>App crashed</Text>
        <Text style={cs.sub}>Screenshot this and share for debugging. Tap "Try again" to reload.</Text>
      </View>
      <ScrollView style={cs.scroll} contentContainerStyle={{ padding: 16 }}>
        <Text style={cs.msg} selectable>{message}</Text>
      </ScrollView>
      <TouchableOpacity style={cs.btn} onPress={onDismiss} activeOpacity={0.8}>
        <Text style={cs.btnText}>Try again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#21262d" },
  title: { fontSize: 20, fontWeight: "700", color: "#f85149", marginBottom: 4 },
  sub: { fontSize: 13, color: "#8b949e" },
  scroll: { flex: 1 },
  msg: {
    fontSize: 12, color: "#e6edf3", lineHeight: 20,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  btn: {
    margin: 16, backgroundColor: "#21262d", borderRadius: 10,
    paddingVertical: 14, alignItems: "center",
  },
  btnText: { color: "#58a6ff", fontSize: 15, fontWeight: "600" },
});

// ── Auth navigator ────────────────────────────────────────────────────────────

function AuthNavigator({ onBypass }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} onBypass={onBypass} />}
        </Stack.Screen>
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Tab stack: Practice ───────────────────────────────────────────────────────

function PracticeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Interview"  component={InterviewScreen} />
      <Stack.Screen name="Report"     component={ReportScreen} />
    </Stack.Navigator>
  );
}

// ── Tab stack: Study ──────────────────────────────────────────────────────────

function StudyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudyLibrary"   component={StudyLibraryScreen} />
      <Stack.Screen name="StudyTopicList" component={StudyTopicListScreen} />
      <Stack.Screen name="StudyTopic"     component={StudyTopicScreen} />
    </Stack.Navigator>
  );
}

// ── Tab stack: Settings ───────────────────────────────────────────────────────

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="FAQ"          component={FAQScreen} />
    </Stack.Navigator>
  );
}

// ── Main app (tab) navigator ──────────────────────────────────────────────────

function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopColor: "#f0f0f0",
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarIcon: ({ focused, color }) => {
            const icons = {
              Dashboard: focused ? "grid"      : "grid-outline",
              Practice:  focused ? "mic"       : "mic-outline",
              Study:     focused ? "book"      : "book-outline",
              History:   focused ? "bar-chart" : "bar-chart-outline",
              Settings:  focused ? "settings"  : "settings-outline",
            };
            return <Ionicons name={icons[route.name]} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Practice"  component={PracticeStack} />
        <Tab.Screen name="Study"     component={StudyStack} />
        <Tab.Screen name="History"   component={HistoryScreen} />
        <Tab.Screen name="Settings"  component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default Sentry.wrap(function App() {
  const [session,     setSession]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [bypassed,    setBypassed]    = useState(false);
  const [profileDone, setProfileDone] = useState(false);

  useEffect(() => {
    async function init() {
      // Safety net: no matter what hangs below, clear the loading screen
      // within 6 seconds so the user is never stuck on a spinner.
      const safetyTimer = setTimeout(() => {
        setProfileDone(true);
        setLoading(false);
      }, 6000);

      try {
        // getSessionSafe() reads from the module-level cache (INITIAL_SESSION)
        // — returns instantly even when the token needs a background refresh.
        const session = await getSessionSafe();
        setSession(session);

        if (session?.user?.id) {
          // Wrap profile + streak in a 5s timeout so a slow network never
          // blocks the loading screen indefinitely.
          const profileTimeout = new Promise((resolve) =>
            setTimeout(() => resolve([null]), 5000)
          );
          const [profile] = await Promise.race([
            Promise.all([
              getProfile(session.user.id),
              getStreakData()
                .then(({ count }) => scheduleDailyNotifications(count))
                .catch(() => {}),
            ]),
            profileTimeout,
          ]);
          setProfileDone(profile?.setup_done === true);
        } else {
          setProfileDone(true);
        }
      } catch (e) {
        const msg = e?.message || "init failed";
        console.error("App init error:", msg, e?.stack);
        logError("INIT", msg, e?.stack);
        if (SENTRY_DSN) Sentry.captureException(e);
        setProfileDone(true);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }
    init();

    // CRITICAL: this callback must stay SYNCHRONOUS. supabase-js holds an
    // internal auth lock while notifying subscribers and awaits each callback.
    // Awaiting any supabase call here (getProfile, queries, getSession) makes
    // that call wait for the same lock → permanent deadlock → every screen
    // hangs on the 2nd app open. Real work is deferred via setTimeout(0) so
    // it runs AFTER the lock is released. Do not make this callback async.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        // init() already handles the startup session; token refreshes and
        // user-metadata updates don't change profile setup state.
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          return;
        }

        setTimeout(async () => {
          try {
            if (session?.user?.id) {
              const profile = await getProfile(session.user.id);
              setProfileDone(profile?.setup_done === true);
              getStreakData()
                .then(({ count }) => scheduleDailyNotifications(count))
                .catch(() => {});
            } else {
              setProfileDone(true);
            }
          } catch (e) {
            const msg = e?.message || "auth state change failed";
            console.error("Auth state change error:", msg);
            logError("AUTH", msg, e?.stack);
            setProfileDone(true);
          }
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#111" />
    </View>
  );

  const isAuthed = session || bypassed;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {!isAuthed ? (
          <AuthNavigator
            onBypass={() => { setBypassed(true); setProfileDone(true); }}
          />
        ) : !profileDone ? (
          <ProfileSetupScreen
            userId={session?.user?.id}
            onDone={() => setProfileDone(true)}
          />
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
});
