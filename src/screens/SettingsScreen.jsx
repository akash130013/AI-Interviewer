import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking, Share, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase, deleteAllUserData } from "../lib/supabase";
import { getLogs, clearLogs } from "../lib/crashLog";

const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "richamediahub@gmail.com";
const SHARE_MESSAGE =
  "⛵ I've been using *Interview Boat* to practice job interviews with AI!\n\n" +
  "It asks real interview questions, scores your answers, and gives detailed feedback — like having a personal interview coach.\n\n" +
  "Coming soon to Google Play Store. Stay tuned! 🚀";

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ icon, label, onPress, destructive, showArrow = true, subtitle }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {showArrow && onPress && (
        <Text style={styles.rowArrow}>›</Text>
      )}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen({ navigation }) {
  const [email,       setEmail]       = useState("");
  const [debugMode,   setDebugMode]   = useState(false);
  const [crashLogs,   setCrashLogs]   = useState([]);
  const versionTaps   = useRef(0);
  const versionTimer  = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? "");
    });
  }, []);

  function handleVersionTap() {
    versionTaps.current += 1;
    clearTimeout(versionTimer.current);
    versionTimer.current = setTimeout(() => { versionTaps.current = 0; }, 2000);
    if (versionTaps.current >= 5) {
      versionTaps.current = 0;
      getLogs().then((logs) => {
        setCrashLogs(logs);
        setDebugMode(true);
      });
    }
  }

  function handleClearLogs() {
    clearLogs().then(() => setCrashLogs([]));
    Alert.alert("Cleared", "All debug logs have been deleted.");
  }

  const initial = email ? email[0].toUpperCase() : "?";

  async function handleShareWhatsApp() {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(SHARE_MESSAGE)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      Linking.openURL(whatsappUrl);
    } else {
      // WhatsApp not installed — fall back to native share sheet
      Share.share({ message: SHARE_MESSAGE });
    }
  }

  function handleContactUs() {
    const subject = encodeURIComponent("AI Interviewer — Support");
    const body = encodeURIComponent("Hi,\n\nI have a question about AI Interviewer:\n\n");
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
  }

  function handleSignOut() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently delete all your interview history and log you out. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete my account", style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  }

  async function confirmDeleteAccount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Delete all interview data (client-side, RLS-protected)
      await deleteAllUserData(session.user.id);

      // Delete auth user via server endpoint
      try {
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/delete-account`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch (_) {
        // Server deletion failed — data is cleared, proceed with sign-out
      }

      // Sign out — triggers auth state change → app navigates to login
      await supabase.auth.signOut();
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <Section title="PROFILE">
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>Free Plan</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* Practice */}
        <Section title="PRACTICE">
          <Row
            icon="📊"
            label="Interview History"
            subtitle="View past sessions and score trends"
            onPress={() => navigation.navigate("History")}
          />
          <Divider />
          <Row
            icon="📚"
            label="Study Hub"
            subtitle="170+ Q&As across 7 categories"
            onPress={() => navigation.navigate("Study")}
          />
        </Section>

        {/* Support */}
        <Section title="SUPPORT">
          <Row
            icon="❓"
            label="FAQ"
            subtitle="Frequently asked questions"
            onPress={() => navigation.navigate("FAQ")}
          />
          <Divider />
          <Row
            icon="💬"
            label="Share on WhatsApp"
            subtitle="Invite friends to try the app"
            onPress={handleShareWhatsApp}
          />
          <Divider />
          <Row
            icon="✉️"
            label="Contact Us"
            subtitle={CONTACT_EMAIL}
            onPress={handleContactUs}
          />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <Row
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
            showArrow={false}
          />
        </Section>

        {/* Debug log viewer — unlocked by tapping version 5× */}
        {debugMode && (
          <Section title="DEBUG LOGS">
            <View style={{ padding: 12 }}>
              {crashLogs.length === 0 ? (
                <Text style={styles.rowSubtitle}>No errors recorded.</Text>
              ) : (
                crashLogs.map((entry, i) => (
                  <View key={i} style={styles.logEntry}>
                    <Text style={styles.logMeta}>[{entry.tag}] {entry.ts}</Text>
                    <Text style={styles.logMsg} selectable>{entry.msg}</Text>
                    {!!entry.stack && (
                      <Text style={styles.logStack} selectable>{entry.stack}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
            <Divider />
            <Row
              icon="🗑"
              label="Clear all logs"
              onPress={handleClearLogs}
              destructive
              showArrow={false}
            />
          </Section>
        )}

        {/* Version — tap 5× to unlock debug logs */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
          <Text style={styles.version}>Interview Boat v{APP_VERSION}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  back: { fontSize: 15, color: "#111", width: 50 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  scroll: { padding: 20, paddingBottom: 48 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#999",
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1, borderColor: "#efefef",
  },

  profileRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#111", alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: 20, fontWeight: "700", color: "#fff" },
  profileInfo: { flex: 1 },
  profileEmail: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 6 },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  planText: { fontSize: 11, fontWeight: "600", color: "#666" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowIcon: { fontSize: 20, width: 28, textAlign: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, color: "#111", fontWeight: "500" },
  rowLabelDestructive: { color: "#dc2626" },
  rowSubtitle: { fontSize: 12, color: "#aaa", marginTop: 2 },
  rowArrow: { fontSize: 20, color: "#ccc", fontWeight: "300" },

  divider: { height: 1, backgroundColor: "#f5f5f5", marginLeft: 56 },

  version: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 8, paddingVertical: 12 },

  logEntry: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingBottom: 10 },
  logMeta:  { fontSize: 10, color: "#999", marginBottom: 2 },
  logMsg:   { fontSize: 12, color: "#dc2626", fontWeight: "600", marginBottom: 2 },
  logStack: {
    fontSize: 10, color: "#555", lineHeight: 16,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
});
