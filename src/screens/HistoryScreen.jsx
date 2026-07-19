import { useState, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, getPastInterviews, getSessionSafe, onSessionEvent } from "../lib/supabase";
import LineGraph from "../components/LineGraph";

const TYPE_META = {
  technical:  { label: "Technical",  bg: "#eff6ff", text: "#1d4ed8" },
  behavioral: { label: "Behavioral", bg: "#f0fdf4", text: "#15803d" },
  mixed:      { label: "Mixed",      bg: "#faf5ff", text: "#7c3aed" },
};

function relativeDate(dateString) {
  const now = new Date();
  const d = new Date(dateString);
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(score) {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export default function HistoryScreen({ navigation }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload when token refreshes (handles "blank after 1 hour" bug)
  useEffect(() => {
    return onSessionEvent((event) => {
      if (event === "TOKEN_REFRESHED") loadHistory();
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const session = await getSessionSafe();
      if (session) {
        const data = await getPastInterviews(session.user.id);
        setInterviews(data);
      }
    } catch (e) {
      console.error("loadHistory error:", e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadHistory(false);
    setRefreshing(false);
  }

  // Summary stats
  const totalSessions = interviews.length;
  const avgScore = totalSessions
    ? Math.round(interviews.reduce((s, i) => s + i.overall_score, 0) / totalSessions)
    : 0;
  const bestScore = totalSessions ? Math.max(...interviews.map((i) => i.overall_score)) : 0;

  // Trend data for graph (chronological order)
  const graphData = interviews
    .slice()
    .reverse()
    .map((item) => ({
      value: item.report?.interview_readiness_percent ?? item.overall_score,
      label: new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
        <Text style={styles.headerTitle}>Interview History</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#111" />
      ) : interviews.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.empty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={["#3b82f6"]} />
          }
        >
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No interviews yet</Text>
          <Text style={styles.emptySub}>
            Complete your first interview to start tracking your progress here.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("Practice")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyBtnText}>Start an interview →</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={interviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={["#3b82f6"]} />
          }
          ListHeaderComponent={
            <>
              {/* Stats summary */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{totalSessions}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: scoreColor(avgScore) }]}>{avgScore}</Text>
                  <Text style={styles.statLabel}>Avg score</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: scoreColor(bestScore) }]}>{bestScore}</Text>
                  <Text style={styles.statLabel}>Best score</Text>
                </View>
              </View>

              {/* Readiness trend */}
              {interviews.length >= 2 && (
                <View style={styles.graphSection}>
                  <Text style={styles.graphTitle}>Readiness trend</Text>
                  <Text style={styles.graphSub}>Your interview readiness % over time</Text>
                  <LineGraph data={graphData} />
                </View>
              )}

              <Text style={styles.sectionLabel}>All sessions</Text>
            </>
          }
          renderItem={({ item, index }) => {
            const typeMeta = TYPE_META[item.report?.interview_type] || TYPE_META.mixed;
            const skills = item.report?.skills || [];
            const visibleSkills = skills.slice(0, 3);
            const extraSkills = skills.length > 3 ? skills.length - 3 : 0;
            const sessionNum = interviews.length - index; // newest = highest number

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("Practice", { screen: "Report", params: { report: item.report } })}
                activeOpacity={0.7}
              >
                {/* Top row: role + score */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardSessionNum}>#{sessionNum}</Text>
                      <Text style={styles.cardRole} numberOfLines={1}>{item.role}</Text>
                    </View>
                    {item.company ? (
                      <Text style={styles.cardCompany} numberOfLines={1}>{item.company}</Text>
                    ) : null}
                    <Text style={styles.cardDate}>{relativeDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardScore, { color: scoreColor(item.overall_score) }]}>
                      {item.overall_score}
                    </Text>
                    <Text style={styles.cardScoreLabel}>/100</Text>
                  </View>
                </View>

                {/* Bottom row: type badge + skills */}
                <View style={styles.cardMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: typeMeta.text }]}>
                      {item.report?.quick_mode ? "⚡ Quick" : typeMeta.label}
                    </Text>
                  </View>
                  {visibleSkills.map((skill) => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{skill}</Text>
                    </View>
                  ))}
                  {extraSkills > 0 && (
                    <View style={styles.skillChip}>
                      <Text style={styles.skillChipText}>+{extraSkills}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  back: { fontSize: 15, color: "#111", width: 50 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  loader: { flex: 1 },

  // Empty state
  empty: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: "#111", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  list: { padding: 16, paddingBottom: 40, gap: 10 },

  // Stats row
  statsRow: {
    flexDirection: "row", backgroundColor: "#f9f9f9",
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#efefef",
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "700", color: "#111" },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#eee", marginHorizontal: 8 },

  // Graph section
  graphSection: {
    backgroundColor: "#f9f9f9", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#efefef", marginBottom: 20,
  },
  graphTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 2 },
  graphSub: { fontSize: 12, color: "#999", marginBottom: 12 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#999",
    letterSpacing: 0.6, marginBottom: 8, marginLeft: 2,
  },

  // Card
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 16,
    padding: 14, backgroundColor: "#fafafa", gap: 10,
  },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start" },
  cardLeft: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  cardSessionNum: { fontSize: 11, fontWeight: "700", color: "#bbb" },
  cardRole: { fontSize: 15, fontWeight: "600", color: "#111", flex: 1 },
  cardCompany: { fontSize: 13, color: "#666", marginBottom: 3 },
  cardDate: { fontSize: 12, color: "#aaa" },
  cardRight: { flexDirection: "row", alignItems: "flex-end", marginLeft: 12 },
  cardScore: { fontSize: 30, fontWeight: "700" },
  cardScoreLabel: { fontSize: 13, color: "#aaa", marginBottom: 4, marginLeft: 2 },

  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  skillChip: {
    backgroundColor: "#f0f0f0", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  skillChipText: { fontSize: 11, color: "#555", fontWeight: "500" },
});
