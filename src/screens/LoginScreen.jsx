import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, G, ClipPath, Rect, Defs } from "react-native-svg";
import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../lib/googleAuth";

function GoogleLogo() {
  return (
    <Svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
      <Defs>
        <ClipPath id="clip">
          <Rect width="48" height="48" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <Path fill="none" d="M0 0h48v48H0z"/>
      </G>
    </Svg>
  );
}

export default function LoginScreen({ navigation, onBypass }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <>
                  <ActivityIndicator color="#444" size="small" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Signing in…</Text>
                </>
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
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

  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8e8e8" },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: "#aaa" },

  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#dadce0", borderRadius: 4,
    paddingVertical: 13, marginTop: 12, backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#3c4043", letterSpacing: 0.25 },

  signupRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  signupText: { fontSize: 14, color: "#888" },
  signupLink: { fontSize: 14, color: "#111", fontWeight: "700" },

  legal: { fontSize: 11, color: "#bbb", textAlign: "center", lineHeight: 16 },
});
