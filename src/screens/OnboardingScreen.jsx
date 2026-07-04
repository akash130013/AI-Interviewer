import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { getStreakData } from "../lib/streak";

export default function OnboardingScreen({ navigation }) {
  const [streak, setStreak] = useState(0);
  const [form, setForm] = useState({
    role: "",
    company: "",
    yearsOfExperience: "3-5",
    interviewType: "mixed",
    jobDescription: "",
    companyMode: "General",
  });

  const COMPANY_MODES = [
    { label: "General", icon: "🌐" },
    { label: "Amazon", icon: "📦" },
    { label: "Google", icon: "🔍" },
    { label: "Microsoft", icon: "🪟" },
    { label: "TCS / Infosys", icon: "🇮🇳" },
  ];

  useEffect(() => {
    getStreakData().then(({ count }) => setStreak(count));
  }, []);

  function handleStart(quickMode = false) {
    if (!form.role.trim()) {
      Alert.alert("Required", "Please enter the role you are applying for.");
      return;
    }
    navigation.navigate("Interview", { candidateContext: { ...form, quickMode } });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Set up your interview</Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={() => navigation.navigate("History")}>
              <Text style={styles.topLink}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.topLink}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>
          The more context you give, the more relevant the questions will be.
        </Text>

        {streak > 0 && (
          <View style={styles.streakBar}>
            <Text style={styles.streakText}>🔥 {streak}-day streak — keep it going!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.studyBtn} onPress={() => navigation.navigate("StudyLibrary")}>
          <Text style={styles.studyBtnIcon}>📚</Text>
          <View>
            <Text style={styles.studyBtnTitle}>Study Topics First</Text>
            <Text style={styles.studyBtnSub}>Browse Q&As across 7 categories</Text>
          </View>
          <Text style={styles.studyBtnArrow}>→</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Interview mode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
          {COMPANY_MODES.map(({ label, icon }) => (
            <TouchableOpacity
              key={label}
              style={[styles.modeChip, form.companyMode === label && styles.modeChipSelected]}
              onPress={() => setForm({ ...form, companyMode: label, company: label === "General" ? form.company : label })}
            >
              <Text style={styles.modeIcon}>{icon}</Text>
              <Text style={[styles.modeLabel, form.companyMode === label && styles.modeLabelSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {form.companyMode !== "General" && (
          <Text style={styles.modeTip}>
            {form.companyMode === "Amazon" && "Focus: 14 Leadership Principles, STAR answers"}
            {form.companyMode === "Google" && "Focus: Googleyness, structured problem solving"}
            {form.companyMode === "Microsoft" && "Focus: Growth mindset, collaboration, impact"}
            {form.companyMode === "TCS / Infosys" && "Focus: HR + Technical rounds, project experience"}
          </Text>
        )}

        <Text style={styles.label}>Role you are applying for *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor="#aaa"
          value={form.role}
          onChangeText={(v) => setForm({ ...form, role: v })}
        />

        <Text style={styles.label}>Target company</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Google, Stripe, any startup"
          placeholderTextColor="#aaa"
          value={form.company}
          onChangeText={(v) => setForm({ ...form, company: v })}
        />

        <Text style={styles.label}>Years of experience</Text>
        <View style={styles.optionRow}>
          {["0-2", "3-5", "6-9", "10+"].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.option, form.yearsOfExperience === val && styles.optionSelected]}
              onPress={() => setForm({ ...form, yearsOfExperience: val })}
            >
              <Text style={[styles.optionText, form.yearsOfExperience === val && styles.optionTextSelected]}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Interview type</Text>
        <View style={styles.optionRow}>
          {["behavioral", "technical", "mixed"].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.option, form.interviewType === val && styles.optionSelected]}
              onPress={() => setForm({ ...form, interviewType: val })}
            >
              <Text style={[styles.optionText, form.interviewType === val && styles.optionTextSelected]}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Job description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Paste the job description here for more relevant questions..."
          placeholderTextColor="#aaa"
          value={form.jobDescription}
          onChangeText={(v) => setForm({ ...form, jobDescription: v })}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.button} onPress={() => handleStart(false)}>
          <Text style={styles.buttonText}>Start full interview (6 questions) →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickButton} onPress={() => handleStart(true)}>
          <Text style={styles.quickButtonText}>⚡ Quick practice (3 questions, ~5 min)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 24, paddingTop: 60 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  topActions: { flexDirection: "row", gap: 14, paddingTop: 4 },
  topLink: { fontSize: 13, color: "#888" },
  title: { fontSize: 26, fontWeight: "600", color: "#111", flex: 1 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 12, lineHeight: 20 },
  streakBar: {
    backgroundColor: "#fff7ed", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#fed7aa",
  },
  streakText: { fontSize: 14, color: "#ea580c", fontWeight: "600" },
  modeScroll: { marginBottom: 4 },
  modeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa", marginRight: 8,
  },
  modeChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  modeIcon: { fontSize: 15 },
  modeLabel: { fontSize: 13, color: "#555" },
  modeLabelSelected: { color: "#fff", fontWeight: "600" },
  modeTip: { fontSize: 12, color: "#888", marginBottom: 4, marginTop: 6, lineHeight: 16 },
  studyBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f5f3ff", borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#ddd6fe",
  },
  studyBtnIcon: { fontSize: 26 },
  studyBtnTitle: { fontSize: 14, fontWeight: "600", color: "#5b21b6" },
  studyBtnSub: { fontSize: 12, color: "#7c3aed", marginTop: 2 },
  studyBtnArrow: { fontSize: 16, color: "#7c3aed", marginLeft: "auto" },
  label: { fontSize: 13, fontWeight: "500", color: "#444", marginBottom: 8, marginTop: 20 },
  input: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 14, fontSize: 15, color: "#111", backgroundColor: "#fafafa",
  },
  textarea: { height: 110 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  option: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa",
  },
  optionSelected: { backgroundColor: "#111", borderColor: "#111" },
  optionText: { fontSize: 14, color: "#555" },
  optionTextSelected: { color: "#fff" },
  button: {
    backgroundColor: "#111", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 36, marginBottom: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  quickButton: {
    borderWidth: 1.5, borderColor: "#111", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 40,
  },
  quickButtonText: { color: "#111", fontSize: 15, fontWeight: "500" },
});
