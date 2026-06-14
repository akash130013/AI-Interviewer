import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from "react-native";

export default function ReportScreen({ route, navigation }) {
  const { report } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Score */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreNum}>{report.overall_score}</Text>
          <Text style={styles.scoreOf}>/100</Text>
        </View>
        <Text style={styles.summary}>{report.summary}</Text>

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

        {/* Per-question */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Question breakdown</Text>
        {report.questions.map((q, i) => (
          <View key={i} style={styles.qCard}>
            <View style={styles.qHeader}>
              <Text style={styles.qNum}>Q{i + 1}</Text>
              <View style={styles.scoreBadge}>
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
          <Text style={styles.btnText}>Practice again</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 24, paddingTop: 48 },
  scoreBlock: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", marginBottom: 12 },
  scoreNum: { fontSize: 80, fontWeight: "700", color: "#111", lineHeight: 88 },
  scoreOf: { fontSize: 22, color: "#888", marginBottom: 14, marginLeft: 4 },
  summary: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 28 },
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
  scoreBadge: { backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  qText: { fontSize: 14, fontWeight: "500", color: "#111", marginBottom: 6, lineHeight: 20 },
  answerSummary: { fontSize: 13, color: "#666", lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 },
  betterLabel: { fontSize: 11, fontWeight: "600", color: "#888", marginBottom: 6 },
  betterText: { fontSize: 13, color: "#444", lineHeight: 20 },
  focusCard: { backgroundColor: "#eff6ff", borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 24 },
  focusLabel: { fontSize: 12, fontWeight: "600", color: "#1d4ed8", marginBottom: 6 },
  focusText: { fontSize: 14, color: "#1e40af", lineHeight: 20 },
  btn: {
    backgroundColor: "#111", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginBottom: 48,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
