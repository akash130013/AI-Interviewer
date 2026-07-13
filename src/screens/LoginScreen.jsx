import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, // Platform kept for KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ navigation, onBypass }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot Password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: "https://ai-interviewer-backend-lac.vercel.app/reset-password" }
    );
    setResetLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setResetSent(true);
    }
  }

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      if (err.message.toLowerCase().includes("email not confirmed")) {
        setError("Please verify your email first. Check your inbox for the verification link.");
      } else {
        setError(err.message);
      }
    }
    // On success: session change in App.jsx swaps navigator automatically
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <Text style={styles.logoIcon}>🎙</Text>
            <Text style={styles.appName}>Interview Boat</Text>
            <Text style={styles.tagline}>Practice. Improve. Get hired.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>
                {resetLoading ? "Sending…" : "Forgot Password?"}
              </Text>
            </TouchableOpacity>

            {resetSent && (
              <View style={styles.resetSuccess}>
                <Text style={styles.resetSuccessText}>
                  ✅ Reset link sent! Check your email inbox.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Google login — re-enable once OAuth is configured in Supabase */}
          </View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },

  logoArea: { alignItems: "center", marginBottom: 36, marginTop: 20 },
  logoIcon: { fontSize: 52, marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 6 },
  tagline: { fontSize: 14, color: "#888", textAlign: "center" },

  form: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: "#111", backgroundColor: "#fafafa",
    marginBottom: 4,
  },
  passwordWrap: { position: "relative", marginBottom: 4 },
  passwordInput: { paddingRight: 50, marginBottom: 0 },
  eyeBtn: {
    position: "absolute", right: 14, top: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
  eyeIcon: { fontSize: 18 },

  errorText: {
    backgroundColor: "#fef2f2", borderRadius: 10,
    padding: 12, marginBottom: 8,
    fontSize: 13, color: "#dc2626", lineHeight: 18,
  },

  forgotBtn: { alignSelf: "flex-end", marginTop: 8, marginBottom: 4, padding: 4 },
  forgotText: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },

  resetSuccess: {
    backgroundColor: "#f0fdf4", borderRadius: 10,
    padding: 12, marginTop: 8,
  },
  resetSuccessText: { fontSize: 13, color: "#16a34a", lineHeight: 18 },

  primaryBtn: {
    backgroundColor: "#111", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 20,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  signupRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  signupText: { fontSize: 14, color: "#888" },
  signupLink: { fontSize: 14, color: "#111", fontWeight: "700" },

  legal: { fontSize: 11, color: "#bbb", textAlign: "center", lineHeight: 16 },
});
