import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getStudyCategories } from "../lib/study";
import { getAllProgress } from "../lib/studyProgress";

export default function StudyLibraryScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const [cats, prog] = await Promise.all([getStudyCategories(), getAllProgress()]);
      setCategories(cats);
      setProgress(prog);
    } catch (e) {
      setError(e?.message || "Could not load study content.");
    } finally {
      setRefreshing(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const loadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      );
      const [cats, prog] = await Promise.race([
        Promise.all([getStudyCategories(), getAllProgress()]),
        loadTimeout,
      ]);
      setCategories(cats);
      setProgress(prog);
    } catch (e) {
      console.error("Study load error:", JSON.stringify(e));
      setError(e?.message || e?.code || "Could not load study content.");
    } finally {
      setLoading(false);
    }
  }

  function totalQsForCategory(cat) {
    return (cat.study_topics || []).reduce(
      (sum, t) => sum + (t.study_questions || []).length,
      0
    );
  }

  function studiedCountForCategory(cat) {
    return (cat.study_topics || []).reduce((sum, t) => {
      const ids = progress[t.id] || [];
      return sum + ids.length;
    }, 0);
  }

  function handleCategoryPress(cat) {
    const topics = cat.study_topics || [];
    if (topics.length === 1) {
      navigation.navigate("StudyTopic", {
        topicId: topics[0].id,
        topicTitle: topics[0].title,
        categoryColor: cat.color,
        totalQuestions: (topics[0].study_questions || []).length,
      });
    } else {
      navigation.navigate("StudyTopicList", {
        categoryId: cat.id,
        categoryTitle: cat.title,
        categoryColor: cat.color,
        topics,
        progress,
      });
    }
  }

  const backBtn = navigation.canGoBack() ? (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={styles.back}>← Back</Text>
    </TouchableOpacity>
  ) : <View style={{ width: 50 }} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {backBtn}
          <Text style={styles.headerTitle}>Study Hub</Text>
          <View style={{ width: 50 }} />
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#111" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {backBtn}
        <Text style={styles.headerTitle}>Study Hub</Text>
        <View style={{ width: 50 }} />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={["#3b82f6"]} />
          }
        >
          <Text style={styles.subtitle}>
            Read and learn before your interview. Tap a topic to start.
          </Text>

          {categories.map((cat) => {
            const total = totalQsForCategory(cat);
            const done = studiedCountForCategory(cat);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.card, { borderLeftColor: cat.color, borderLeftWidth: 4 }]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.75}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: cat.bg_color }]}>
                    <Text style={styles.icon}>{cat.icon}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{cat.title}</Text>
                    <Text style={styles.cardMeta}>
                      {total} questions
                      {(cat.study_topics || []).length > 1
                        ? ` · ${(cat.study_topics || []).length} topics`
                        : ""}
                    </Text>
                  </View>
                  <View style={[styles.pctBadge, { backgroundColor: cat.bg_color }]}>
                    <Text style={[styles.pctText, { color: cat.color }]}>{pct}%</Text>
                  </View>
                </View>

                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{done}/{total} studied</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  list: { padding: 16, gap: 12 },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 8, lineHeight: 18 },
  card: {
    backgroundColor: "#fafafa", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#eee",
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  icon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 3 },
  cardMeta: { fontSize: 12, color: "#888" },
  pctBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pctText: { fontSize: 12, fontWeight: "700" },
  progressBg: { height: 5, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: "#aaa", marginTop: 6 },
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  retryBtn: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: "#fff", fontWeight: "600" },
});
