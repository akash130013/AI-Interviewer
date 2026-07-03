import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;
      }
    } catch (err) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <Text style={styles.logoIcon}>🎙</Text>
          <Text style={styles.appName}>AI Interviewer</Text>
          <Text style={styles.tagline}>
            Practice job interviews with AI.{"\n"}Get better with every session.
          </Text>
        </View>

        <View style={styles.features}>
          {["Adaptive questions based on your level", "Scored answers with detailed feedback", "Track progress across sessions"].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureDot}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={signInWithGoogle}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: "center", paddingBottom: 40 },
  logoArea: { alignItems: "center", marginBottom: 40 },
  logoIcon: { fontSize: 52, marginBottom: 14 },
  appName: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 10 },
  tagline: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22 },
  features: { marginBottom: 40, gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureDot: { fontSize: 15, color: "#16a34a", fontWeight: "700", marginTop: 1 },
  featureText: { fontSize: 14, color: "#444", lineHeight: 20, flex: 1 },
  googleBtn: {
    backgroundColor: "#f0f0f0", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginBottom: 16,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleBtnText: { fontSize: 16, fontWeight: "600", color: "#111" },
  legal: { fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 16 },
});
