import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function OnboardingScreen({ navigation }) {
  const [form, setForm] = useState({
    role: "",
    company: "",
    yearsOfExperience: "3-5",
    interviewType: "mixed",
    jobDescription: "",
  });

  function handleStart() {
    if (!form.role.trim()) {
      Alert.alert("Required", "Please enter the role you are applying for.");
      return;
    }
    navigation.navigate("Interview", { candidateContext: form });
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

        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Start interview →</Text>
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
  subtitle: { fontSize: 14, color: "#666", marginBottom: 28, lineHeight: 20 },
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
    alignItems: "center", marginTop: 36, marginBottom: 40,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
