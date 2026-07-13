import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RadarChart from "../components/RadarChart";

// The report comes from an LLM — fields can occasionally be missing or
// mistyped. Normalize everything so a partial report never crashes the screen.
function normalizeReport(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const num = (v, fallback) => (typeof v === "number" && isFinite(v) ? v : fallback);
  const strArr = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []);
  return {
    ...r,
    overall_score: Math.max(0, Math.min(100, num(r.overall_score, 0))),
    summary: typeof r.summary === "string" ? r.summary : "",
    interview_readiness_percent: Math.max(0, Math.min(100, num(r.interview_readiness_percent, 0))),
    top_3_strengths: strArr(r.top_3_strengths),
    top_3_improvements: strArr(r.top_3_improvements),
    recommended_next_focus: typeof r.recommended_next_focus === "string" ? r.recommended_next_focus : "",
    questions: (Array.isArray(r.questions) ? r.questions : [])
      .filter((q) => q && typeof q === "object")
      .map((q) => ({
        ...q,
        question: typeof q.question === "string" ? q.question : "",
        answer_summary: typeof q.answer_summary === "string" ? q.answer_summary : "",
        sample_better_answer: typeof q.sample_better_answer === "string" ? q.sample_better_answer : "",
        score: Math.max(1, Math.min(10, num(q.score, 5))),
      })),
  };
}

export default function ReportScreen({ route, navigation }) {
  const { streakCount } = route.params;
  const saved = route.params.saved !== false; // default true for older callers
  const report = normalizeReport(route.params.report);
  const [displayScore, setDisplayScore] = useState(0);
  const animatedScore = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const isHighScore = report.overall_score >= 80;

  // Derive 5 radar dimensions from per-question data
  // Clarity=odd Qs, Relevance=overall/2, Depth=even Qs, Structure=mid, Confidence=last
  const qs = report.questions || [];
  const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 5;
  const allScores = qs.map((q) => q.score);
  const radarScores = [
    avg(qs.filter((_, i) => i % 2 === 0).map((q) => q.score)),   // Clarity
    avg(allScores) * (report.overall_score / 100),                  // Relevance
    avg(qs.filter((_, i) => i % 2 === 1).map((q) => q.score)),    // Depth
    avg(qs.slice(0, Math.ceil(qs.length / 2)).map((q) => q.score)), // Structure
    avg(qs.slice(-2).map((q) => q.score)),                          // Confidence
  ].map((v) => Math.max(1, Math.min(10, parseFloat(v.toFixed(1)))));

  useEffect(() => {
    // Count up animation
    Animated.timing(animatedScore, {
      toValue: report.overall_score,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    const listener = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    // Celebration flash for high scores
    if (isHighScore) {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(celebrationOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      }, 1800);
    }

    return () => animatedScore.removeListener(listener);
  }, []);

  function scoreColor(score) {
    if (score >= 75) return "#16a34a";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  }

  return (
    <SafeAreaView style={styles.container}>
      {isHighScore && (
        <Animated.View style={[styles.celebrationBanner, { opacity: celebrationOpacity }]}>
          <Text style={styles.celebrationText}>🎉 Excellent performance!</Text>
        </Animated.View>
      )}

      {navigation.canGoBack() && (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {!saved && (
          <View style={styles.notSavedBanner}>
            <Text style={styles.notSavedText}>
              ⚠️ This report couldn't be saved to your history. Screenshot it to keep a copy.
            </Text>
          </View>
        )}

        {/* Score */}
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreNum, { color: scoreColor(report.overall_score) }]}>
            {displayScore}
          </Text>
          <Text style={styles.scoreOf}>/100</Text>
        </View>

        {isHighScore && <Text style={styles.highScoreLabel}>Outstanding! 🔥</Text>}
        <Text style={styles.summary}>{report.summary}</Text>

        {/* Streak badge */}
        {streakCount > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>🔥 {streakCount}-day streak! Keep it up!</Text>
          </View>
        )}

        {/* Readiness bar */}
        <Text style={styles.sectionTitle}>Interview readiness</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${report.interview_readiness_percent}%` }]} />
        </View>
        <Text style={styles.barPct}>{report.interview_readiness_percent}%</Text>

        {/* Strengths & improvements */}
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardTitle}>Strengths</Text>
            {report.top_3_strengths.map((s, i) => (
              <Text key={i} style={styles.strengthText}>✓ {s}</Text>
            ))}
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardTitle}>To improve</Text>
            {report.top_3_improvements.map((s, i) => (
              <Text key={i} style={styles.improveText}>→ {s}</Text>
            ))}
          </View>
        </View>

        {/* Skill radar */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Skill profile</Text>
        <View style={styles.radarCard}>
          <RadarChart scores={radarScores} />
        </View>

        {/* Per-question */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Question breakdown</Text>
        {qs.map((q, i) => (
          <View key={i} style={styles.qCard}>
            <View style={styles.qHeader}>
              <Text style={styles.qNum}>Q{i + 1}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor(q.score * 10) }]}>
                <Text style={styles.scoreBadgeText}>{q.score}/10</Text>
              </View>
            </View>
            <Text style={styles.qText}>{q.question}</Text>
            <Text style={styles.answerSummary}>{q.answer_summary}</Text>
            <View style={styles.divider} />
            <Text style={styles.betterLabel}>Better answer example</Text>
            <Text style={styles.betterText}>{q.sample_better_answer}</Text>
          </View>
        ))}

        {/* Next focus */}
        <View style={styles.focusCard}>
          <Text style={styles.focusLabel}>Focus for next session</Text>
          <Text style={styles.focusText}>{report.recommended_next_focus}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("Onboarding")}>
          <Text style={styles.btnText}>Practice again →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backBtn: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backBtnText: { fontSize: 15, color: "#111" },
  scroll: { padding: 24, paddingTop: 16 },
  celebrationBanner: {
    position: "absolute", top: 60, left: 20, right: 20, zIndex: 10,
    backgroundColor: "#16a34a", borderRadius: 14, padding: 14, alignItems: "center",
  },
  celebrationText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  notSavedBanner: {
    backgroundColor: "#fef3c7", borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  notSavedText: { fontSize: 13, color: "#92400e", lineHeight: 18 },
  scoreBlock: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", marginBottom: 8 },
  scoreNum: { fontSize: 88, fontWeight: "700", lineHeight: 96 },
  scoreOf: { fontSize: 22, color: "#888", marginBottom: 14, marginLeft: 4 },
  highScoreLabel: { textAlign: "center", fontSize: 16, fontWeight: "600", color: "#16a34a", marginBottom: 8 },
  summary: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  streakBadge: {
    backgroundColor: "#fff7ed", borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16,
    alignSelf: "center", marginBottom: 20, borderWidth: 1, borderColor: "#fed7aa",
  },
  streakBadgeText: { fontSize: 14, color: "#ea580c", fontWeight: "600" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#111", marginBottom: 10 },
  barBg: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: "#111", borderRadius: 4 },
  barPct: { fontSize: 12, color: "#888", textAlign: "right", marginTop: 4, marginBottom: 20 },
  row: { flexDirection: "row", gap: 10 },
  card: { backgroundColor: "#f9f9f9", borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 12, fontWeight: "600", color: "#111", marginBottom: 10 },
  strengthText: { fontSize: 12, color: "#16a34a", marginBottom: 6, lineHeight: 18 },
  improveText: { fontSize: 12, color: "#dc2626", marginBottom: 6, lineHeight: 18 },
  qCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 16, marginBottom: 12 },
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  qNum: { fontSize: 12, fontWeight: "600", color: "#888" },
  scoreBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  qText: { fontSize: 14, fontWeight: "500", color: "#111", marginBottom: 6, lineHeight: 20 },
  answerSummary: { fontSize: 13, color: "#666", lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 },
  betterLabel: { fontSize: 11, fontWeight: "600", color: "#888", marginBottom: 6 },
  betterText: { fontSize: 13, color: "#444", lineHeight: 20 },
  radarCard: {
    backgroundColor: "#f9f9f9", borderRadius: 14, padding: 12,
    alignItems: "center", marginBottom: 8,
  },
  focusCard: { backgroundColor: "#eff6ff", borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 24 },
  focusLabel: { fontSize: 12, fontWeight: "600", color: "#1d4ed8", marginBottom: 6 },
  focusText: { fontSize: 14, color: "#1e40af", lineHeight: 20 },
  btn: {
    backgroundColor: "#111", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginBottom: 48,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
