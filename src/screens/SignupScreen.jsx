import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  async function handleSignup() {
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else if (data?.user?.identities?.length === 0) {
      // Supabase returns no error for duplicate emails — identities=[] reveals it
      setError("An account with this email already exists. Please log in instead.");
    } else if (data?.session) {
      // Email confirmation disabled — session change in App.jsx handles navigation
    } else {
      // Email confirmation required — show check-inbox screen
      setVerified(true);
    }
  }

  async function handleResend() {
    setResending(true);
    await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    setResending(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 4000);
  }

  // ── Check-your-inbox screen ──────────────────────────────────────────────
  if (verified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inboxWrap}>
          <Text style={styles.inboxIcon}>📬</Text>
          <Text style={styles.inboxTitle}>Check your inbox</Text>
          <Text style={styles.inboxBody}>
            We sent a verification link to{"\n"}
            <Text style={styles.inboxEmail}>{email.trim().toLowerCase()}</Text>
            {"\n\n"}Click the link in the email to activate your account, then come back here and log in.
          </Text>

          {resendDone ? (
            <Text style={styles.resendOk}>✓ Email resent!</Text>
          ) : (
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResend}
              disabled={resending}
              activeOpacity={0.7}
            >
              {resending ? (
                <ActivityIndicator color="#111" size="small" />
              ) : (
                <Text style={styles.resendText}>Resend email</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.goLoginBtn}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Text style={styles.goLoginText}>Go to Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start practising interviews for free</Text>
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
                placeholder="Min. 8 characters"
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

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Re-enter your password"
                placeholderTextColor="#bbb"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <Text style={password === confirmPassword ? styles.matchOk : styles.matchFail}>
                {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },

  header: { paddingTop: 12, marginBottom: 24 },
  back: { fontSize: 15, color: "#111", fontWeight: "500" },

  titleArea: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: "700", color: "#111", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#888" },

  form: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: "#111", backgroundColor: "#fafafa",
  },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 50 },
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
  matchOk: { fontSize: 12, color: "#16a34a", marginTop: 6, fontWeight: "500" },
  matchFail: { fontSize: 12, color: "#dc2626", marginTop: 6, fontWeight: "500" },

  primaryBtn: {
    backgroundColor: "#111", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  loginRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  loginText: { fontSize: 14, color: "#888" },
  loginLink: { fontSize: 14, color: "#111", fontWeight: "700" },

  legal: { fontSize: 11, color: "#bbb", textAlign: "center", lineHeight: 16 },

  // Check-inbox state
  inboxWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  inboxIcon: { fontSize: 64, marginBottom: 20 },
  inboxTitle: { fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 16, textAlign: "center" },
  inboxBody: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 24, marginBottom: 32 },
  inboxEmail: { fontWeight: "700", color: "#111" },
  resendBtn: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 28, marginBottom: 16,
  },
  resendText: { fontSize: 14, color: "#555", fontWeight: "500" },
  resendOk: { fontSize: 14, color: "#16a34a", fontWeight: "600", marginBottom: 16 },
  goLoginBtn: {
    backgroundColor: "#111", borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 48, alignSelf: "stretch", alignItems: "center",
  },
  goLoginText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
