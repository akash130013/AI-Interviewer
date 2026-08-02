import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FREE_INTERVIEWS_PER_MONTH } from "../lib/subscription";

export default function PaywallScreen({ navigation, route }) {
  const currentTier = route?.params?.currentTier ?? "free";
  const used        = route?.params?.used ?? FREE_INTERVIEWS_PER_MONTH;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🚀</Text>

        <Text style={styles.title}>You've used all {FREE_INTERVIEWS_PER_MONTH} free interviews</Text>
        <Text style={styles.subtitle}>
          Upgrade to Pro for unlimited practice sessions, skill radar charts,
          progress graphs, and more — starting at $9.99/month.
        </Text>

        {/* Feature highlights */}
        <View style={styles.highlights}>
          {[
            "✅  Unlimited interviews",
            "✅  Skill radar chart",
            "✅  Readiness progress graph",
            "✅  Quick 5-min mode",
            "✅  3-day free trial",
          ].map((item, i) => (
            <Text key={i} style={styles.highlight}>{item}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => navigation.replace("Plans", { currentTier })}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBtnText}>See Plans →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Resets on the 1st of each month. {used}/{FREE_INTERVIEWS_PER_MONTH} used this month.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content:   { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  icon:     { fontSize: 64, marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "center", marginBottom: 12, lineHeight: 28 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 28 },

  highlights: { alignSelf: "stretch", backgroundColor: "#f8f9ff", borderRadius: 16, padding: 18, marginBottom: 28, gap: 10 },
  highlight:  { fontSize: 14, color: "#111", fontWeight: "500" },

  upgradeBtn: {
    backgroundColor: "#3b82f6", borderRadius: 14,
    paddingVertical: 16, alignSelf: "stretch", alignItems: "center", marginBottom: 12,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  skipBtn:  { paddingVertical: 10 },
  skipText: { fontSize: 14, color: "#aaa" },

  footer: { fontSize: 11, color: "#ccc", textAlign: "center", paddingBottom: 20 },
});
