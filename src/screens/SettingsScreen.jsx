import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "richamediahub@gmail.com";
const SHARE_MESSAGE =
  "🎙 I've been using *CrackIt* to practice job interviews with AI!\n\n" +
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
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? "");
    });
  }, []);

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
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => supabase.auth.signOut(),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
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
            onPress={() => navigation.navigate("StudyLibrary")}
          />
        </Section>

        {/* Support */}
        <Section title="SUPPORT">
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

        {/* Version */}
        <Text style={styles.version}>CrackIt v{APP_VERSION}</Text>
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

  version: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 8 },
});
