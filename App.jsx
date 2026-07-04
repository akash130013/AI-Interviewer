import "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "./src/lib/supabase";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import InterviewScreen from "./src/screens/InterviewScreen";
import ReportScreen from "./src/screens/ReportScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StudyLibraryScreen from "./src/screens/StudyLibraryScreen";
import StudyTopicListScreen from "./src/screens/StudyTopicListScreen";
import StudyTopicScreen from "./src/screens/StudyTopicScreen";

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Interview" component={InterviewScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="StudyLibrary" component={StudyLibraryScreen} />
          <Stack.Screen name="StudyTopicList" component={StudyTopicListScreen} />
          <Stack.Screen name="StudyTopic" component={StudyTopicScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
