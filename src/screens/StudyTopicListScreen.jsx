import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from "react-native";

export default function StudyTopicListScreen({ route, navigation }) {
  const { categoryTitle, categoryColor, topics, progress } = route.params;

  function studiedCount(topic) {
    const ids = progress[topic.id] || [];
    return ids.length;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {topics
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((topic) => {
            const total = (topic.study_questions || []).length;
            const done = studiedCount(topic);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <TouchableOpacity
                key={topic.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("StudyTopic", {
                    topicId: topic.id,
                    topicTitle: topic.title,
                    categoryColor,
                    totalQuestions: total,
                  })
                }
                activeOpacity={0.75}
              >
                <View style={styles.row}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={[styles.pct, { color: categoryColor }]}>{pct}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%`, backgroundColor: categoryColor },
                    ]}
                  />
                </View>
                <Text style={styles.meta}>{done}/{total} studied</Text>
              </TouchableOpacity>
            );
          })}
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  list: { padding: 16, gap: 10 },
  card: {
    borderWidth: 1, borderColor: "#eee", borderRadius: 14,
    padding: 16, backgroundColor: "#fafafa",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  topicTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  pct: { fontSize: 13, fontWeight: "700" },
  progressBg: { height: 5, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 4 },
  meta: { fontSize: 11, color: "#aaa", marginTop: 6 },
});
