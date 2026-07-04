import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStudyQuestions } from "../lib/study";
import { getStudiedIds, toggleStudied } from "../lib/studyProgress";

export default function StudyTopicScreen({ route, navigation }) {
  const { topicId, topicTitle, categoryColor, totalQuestions } = route.params;
  const [questions, setQuestions] = useState([]);
  const [studiedIds, setStudiedIds] = useState([]);
  const [mode, setMode] = useState("study"); // "study" | "test"
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [topicId]);

  async function load() {
    setLoading(true);
    const [qs, ids] = await Promise.all([
      getStudyQuestions(topicId),
      getStudiedIds(topicId),
    ]);
    setQuestions(qs);
    setStudiedIds(ids);
    setLoading(false);
  }

  async function handleToggleStudied(questionId) {
    const updated = await toggleStudied(topicId, questionId);
    setStudiedIds(updated);
  }

  function toggleReveal(id) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function switchMode(newMode) {
    setMode(newMode);
    setRevealed({});
  }

  const studiedCount = studiedIds.length;
  const total = questions.length || totalQuestions;
  const pct = total > 0 ? Math.round((studiedCount / total) * 100) : 0;
  const isPromptTopic = topicId === "job_prompts";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#111" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{topicTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{studiedCount}/{total} studied</Text>
          <Text style={[styles.pctLabel, { color: categoryColor }]}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: categoryColor }]} />
        </View>
      </View>

      {/* Mode toggle (not shown for prompt topics) */}
      {!isPromptTopic && (
        <View style={styles.modeBar}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "study" && { backgroundColor: "#111" }]}
            onPress={() => switchMode("study")}
          >
            <Text style={[styles.modeBtnText, mode === "study" && { color: "#fff" }]}>
              📖 Study
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "test" && { backgroundColor: "#111" }]}
            onPress={() => switchMode("test")}
          >
            <Text style={[styles.modeBtnText, mode === "test" && { color: "#fff" }]}>
              🧠 Test yourself
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "test" && !isPromptTopic && (
        <Text style={styles.testHint}>Tap a card to reveal the answer</Text>
      )}

      {/* Questions list */}
      <ScrollView contentContainerStyle={styles.list}>
        {questions.map((q, index) => {
          const isStudied = studiedIds.includes(q.id);
          const isRevealedInTest = revealed[q.id];
          const showAnswer = isPromptTopic || mode === "study" || isRevealedInTest;

          return (
            <TouchableOpacity
              key={q.id}
              activeOpacity={mode === "test" && !isPromptTopic ? 0.75 : 1}
              onPress={() => mode === "test" && !isPromptTopic && toggleReveal(q.id)}
              style={[styles.card, isStudied && styles.cardStudied]}
            >
              {/* Question number + studied badge */}
              <View style={styles.cardHeader}>
                <View style={[styles.numBadge, { backgroundColor: categoryColor }]}>
                  <Text style={styles.numText}>{index + 1}</Text>
                </View>
                {isStudied && (
                  <View style={styles.studiedBadge}>
                    <Text style={styles.studiedBadgeText}>✓ Studied</Text>
                  </View>
                )}
                {mode === "test" && !isPromptTopic && !isRevealedInTest && (
                  <Text style={styles.tapHint}>Tap to reveal</Text>
                )}
              </View>

              {/* Question */}
              <Text style={styles.question}>{q.question}</Text>

              {/* Answer */}
              {showAnswer && (
                <View style={[styles.answerBox, { borderLeftColor: categoryColor }]}>
                  <Text style={styles.answer}>{q.answer}</Text>
                </View>
              )}

              {/* Mark studied button */}
              <TouchableOpacity
                style={[styles.markBtn, isStudied && { backgroundColor: "#f0fdf4", borderColor: "#16a34a" }]}
                onPress={() => handleToggleStudied(q.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.markBtnText, isStudied && { color: "#16a34a" }]}>
                  {isStudied ? "✓ Mark as not studied" : "Mark as studied"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111", flex: 1, textAlign: "center", marginHorizontal: 8 },
  progressSection: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 12, color: "#888" },
  pctLabel: { fontSize: 12, fontWeight: "700" },
  progressBg: { height: 6, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 4 },
  modeBar: {
    flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#ddd",
  },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: "#555" },
  testHint: { fontSize: 12, color: "#aaa", textAlign: "center", paddingTop: 8 },
  list: { padding: 16, gap: 14 },
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 16,
    padding: 16, backgroundColor: "#fff",
  },
  cardStudied: { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  numBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  studiedBadge: {
    backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  studiedBadgeText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
  tapHint: { fontSize: 11, color: "#aaa", marginLeft: "auto" },
  question: { fontSize: 15, fontWeight: "600", color: "#111", lineHeight: 22, marginBottom: 12 },
  answerBox: {
    backgroundColor: "#f9f9f9", borderRadius: 10,
    padding: 14, borderLeftWidth: 3, marginBottom: 14,
  },
  answer: { fontSize: 14, color: "#444", lineHeight: 22 },
  markBtn: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingVertical: 8, alignItems: "center",
  },
  markBtnText: { fontSize: 12, color: "#888", fontWeight: "500" },
});
