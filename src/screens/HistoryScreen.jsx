import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, getPastInterviews } from "../lib/supabase";

export default function HistoryScreen({ navigation }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const data = await getPastInterviews(session.user.id);
      setInterviews(data);
    }
    setLoading(false);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function scoreColor(score) {
    if (score >= 75) return "#16a34a";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#111" />
      ) : interviews.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No interviews yet</Text>
          <Text style={styles.emptySub}>Complete your first interview to see your history here.</Text>
        </View>
      ) : (
        <FlatList
          data={interviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Report", { report: item.report })}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardRole}>{item.role}</Text>
                {item.company ? <Text style={styles.cardCompany}>{item.company}</Text> : null}
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardScore, { color: scoreColor(item.overall_score) }]}>
                  {item.overall_score}
                </Text>
                <Text style={styles.cardScoreLabel}>/100</Text>
              </View>
            </TouchableOpacity>
          )}
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111" },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#eee", borderRadius: 14,
    padding: 16, backgroundColor: "#fafafa",
  },
  cardLeft: { flex: 1 },
  cardRole: { fontSize: 15, fontWeight: "600", color: "#111", marginBottom: 3 },
  cardCompany: { fontSize: 13, color: "#666", marginBottom: 4 },
  cardDate: { fontSize: 12, color: "#aaa" },
  cardRight: { flexDirection: "row", alignItems: "flex-end", marginLeft: 12 },
  cardScore: { fontSize: 28, fontWeight: "700" },
  cardScoreLabel: { fontSize: 13, color: "#aaa", marginBottom: 4, marginLeft: 2 },
});
