import "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { LogBox } from "react-native";

// expo-notifications push support was removed from Expo Go in SDK 53.
// Local notifications still work in EAS builds. Suppress the noisy warning.
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "./src/lib/supabase";
import { scheduleDailyNotifications } from "./src/lib/notifications";
import { getStreakData } from "./src/lib/streak";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import InterviewScreen from "./src/screens/InterviewScreen";
import ReportScreen from "./src/screens/ReportScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StudyLibraryScreen from "./src/screens/StudyLibraryScreen";
import StudyTopicListScreen from "./src/screens/StudyTopicListScreen";
import StudyTopicScreen from "./src/screens/StudyTopicScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Stack = createStackNavigator();

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

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Interview" component={InterviewScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="StudyLibrary" component={StudyLibraryScreen} />
        <Stack.Screen name="StudyTopicList" component={StudyTopicListScreen} />
        <Stack.Screen name="StudyTopic" component={StudyTopicScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bypassed, setBypassed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        getStreakData().then(({ count }) => scheduleDailyNotifications(count));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        getStreakData().then(({ count }) => scheduleDailyNotifications(count));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      {(session || bypassed) ? <AppNavigator /> : <AuthNavigator onBypass={() => setBypassed(true)} />}
    </SafeAreaProvider>
  );
}
