import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { getStreakData } from "../lib/streak";

// ─── Role → skills mapping ────────────────────────────────────────────────────

const ROLE_SKILL_MAP = [
  {
    keywords: ["full stack", "fullstack"],
    skills: ["React.js", "Node.js", "TypeScript", "SQL", "PostgreSQL", "MongoDB", "Docker", "REST APIs", "GraphQL", "AWS", "Git"],
  },
  {
    keywords: ["frontend", "front-end", "front end", "ui developer", "react developer", "angular", "vue"],
    skills: ["React.js", "Vue.js", "Angular", "TypeScript", "JavaScript", "HTML/CSS", "Redux", "Next.js", "TailwindCSS", "Jest", "Webpack", "Vite"],
  },
  {
    keywords: ["backend", "back-end", "back end", "api developer", "server"],
    skills: ["Node.js", "Python", "Java", "Go", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "REST APIs", "GraphQL", "Microservices", "AWS"],
  },
  {
    keywords: ["android", "kotlin"],
    skills: ["Kotlin", "Java", "Android SDK", "Jetpack Compose", "Room DB", "Retrofit", "MVVM", "Firebase", "Coroutines", "RxJava"],
  },
  {
    keywords: ["ios", "swift"],
    skills: ["Swift", "Objective-C", "UIKit", "SwiftUI", "Core Data", "Combine", "Firebase", "CocoaPods", "ARKit"],
  },
  {
    keywords: ["mobile", "react native", "flutter"],
    skills: ["React Native", "Flutter", "Kotlin", "Swift", "Firebase", "TypeScript", "Redux"],
  },
  {
    keywords: ["data science", "machine learning", "ml engineer", "ai engineer", "data analyst"],
    skills: ["Python", "R", "SQL", "Machine Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Tableau", "Power BI", "Spark"],
  },
  {
    keywords: ["data engineer", "etl", "pipeline"],
    skills: ["Python", "SQL", "Apache Spark", "Airflow", "Kafka", "AWS", "Snowflake", "dbt", "Hadoop", "BigQuery"],
  },
  {
    keywords: ["devops", "sre", "platform engineer", "cloud engineer", "infrastructure"],
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD", "Jenkins", "Linux", "Python", "Prometheus", "Grafana"],
  },
  {
    keywords: ["qa", "quality assurance", "test engineer", "automation engineer"],
    skills: ["Selenium", "Cypress", "Jest", "JUnit", "Postman", "API Testing", "Performance Testing", "JIRA", "Test Automation"],
  },
  {
    keywords: ["product manager", "product management", "program manager"],
    skills: ["Product Roadmapping", "Agile/Scrum", "SQL", "Figma", "A/B Testing", "JIRA", "User Research", "OKRs", "Go-to-Market"],
  },
  {
    keywords: ["software engineer", "software developer", "swe", "engineer", "developer", "programmer"],
    skills: ["React.js", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "SQL", "PostgreSQL", "MongoDB", "Docker", "REST APIs", "AWS", "Git"],
  },
];

const FALLBACK_SKILLS = [
  "JavaScript", "Python", "Java", "SQL", "React.js", "Node.js",
  "TypeScript", "Docker", "REST APIs", "Git", "AWS", "PostgreSQL",
];

function getSkillsForRole(role) {
  if (!role || role.trim().length < 2) return [];
  const lower = role.toLowerCase();
  for (const entry of ROLE_SKILL_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.skills;
    }
  }
  return FALLBACK_SKILLS;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const FORM_KEY = "@crackit_form_v1";

async function saveFormToStore(form) {
  try {
    const { jobDescription, ...toSave } = form; // JD is optional, skip to stay under 2KB limit
    await SecureStore.setItemAsync(FORM_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

async function loadFormFromStore() {
  try {
    const raw = await SecureStore.getItemAsync(FORM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }) {
  const [streak, setStreak] = useState(0);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [form, setForm] = useState({
    role: "",
    company: "",
    yearsOfExperience: "3-5",
    interviewType: "mixed",
    jobDescription: "",
    companyMode: "General",
    skills: [],
  });

  const COMPANY_MODES = [
    { label: "General", icon: "🌐" },
    { label: "Amazon", icon: "📦" },
    { label: "Google", icon: "🔍" },
    { label: "Microsoft", icon: "🪟" },
    { label: "TCS / Infosys", icon: "🇮🇳" },
  ];

  // Reload saved form each time this screen is focused (e.g. after "Practice again")
  useFocusEffect(
    useCallback(() => {
      loadFormFromStore().then((saved) => {
        if (saved) {
          setForm((prev) => ({ ...prev, ...saved }));
          setAvailableSkills(getSkillsForRole(saved.role || ""));
        }
      });
      getStreakData().then(({ count }) => setStreak(count));
    }, [])
  );

  // Update available skills when role changes
  useEffect(() => {
    const skills = getSkillsForRole(form.role);
    setAvailableSkills(skills);
    // Drop any selected skills that are no longer in the new skill set
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => skills.includes(s)),
    }));
  }, [form.role]);

  function updateForm(patch) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      saveFormToStore(next);
      return next;
    });
  }

  function toggleSkill(skill) {
    setForm((prev) => {
      const already = prev.skills.includes(skill);
      const next = {
        ...prev,
        skills: already ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
      };
      saveFormToStore(next);
      return next;
    });
  }

  function handleStart(quickMode = false) {
    if (!form.role.trim()) {
      Alert.alert("Required", "Please enter the role you are applying for.");
      return;
    }
    navigation.navigate("Interview", { candidateContext: { ...form, quickMode } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.title}>Set up your interview</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.7}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
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

        {/* Company mode */}
        <Text style={styles.label}>Interview mode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
          {COMPANY_MODES.map(({ label, icon }) => (
            <TouchableOpacity
              key={label}
              style={[styles.modeChip, form.companyMode === label && styles.modeChipSelected]}
              onPress={() =>
                updateForm({
                  companyMode: label,
                  company: label === "General" ? form.company : label,
                })
              }
            >
              <Text style={styles.modeIcon}>{icon}</Text>
              <Text style={[styles.modeLabel, form.companyMode === label && styles.modeLabelSelected]}>
                {label}
              </Text>
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

        {/* Role */}
        <Text style={styles.label}>Role you are applying for *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor="#aaa"
          value={form.role}
          onChangeText={(v) => updateForm({ role: v })}
        />

        {/* Skills (dynamic based on role) */}
        {availableSkills.length > 0 && (
          <>
            <View style={styles.skillsHeader}>
              <Text style={styles.label}>Your key skills</Text>
              {form.skills.length > 0 && (
                <TouchableOpacity onPress={() => updateForm({ skills: [] })}>
                  <Text style={styles.clearLink}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.skillsHint}>
              Select skills so Alex focuses technical questions on what you know.
            </Text>
            <View style={styles.skillChips}>
              {availableSkills.map((skill) => {
                const selected = form.skills.includes(skill);
                return (
                  <TouchableOpacity
                    key={skill}
                    style={[styles.skillChip, selected && styles.skillChipSelected]}
                    onPress={() => toggleSkill(skill)}
                    activeOpacity={0.7}
                  >
                    {selected && <Text style={styles.skillCheck}>✓ </Text>}
                    <Text style={[styles.skillChipText, selected && styles.skillChipTextSelected]}>
                      {skill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Target company */}
        <Text style={styles.label}>Target company</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Google, Stripe, any startup"
          placeholderTextColor="#aaa"
          value={form.company}
          onChangeText={(v) => updateForm({ company: v })}
        />

        {/* Years of experience */}
        <Text style={styles.label}>Years of experience</Text>
        <View style={styles.optionRow}>
          {["0-2", "3-5", "6-9", "10+"].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.option, form.yearsOfExperience === val && styles.optionSelected]}
              onPress={() => updateForm({ yearsOfExperience: val })}
            >
              <Text style={[styles.optionText, form.yearsOfExperience === val && styles.optionTextSelected]}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Interview type */}
        <Text style={styles.label}>Interview type</Text>
        <View style={styles.optionRow}>
          {[
            { val: "behavioral", label: "Behavioral" },
            { val: "technical", label: "Technical" },
            { val: "mixed", label: "Mixed" },
          ].map(({ val, label }) => (
            <TouchableOpacity
              key={val}
              style={[styles.option, form.interviewType === val && styles.optionSelected]}
              onPress={() => updateForm({ interviewType: val })}
            >
              <Text style={[styles.optionText, form.interviewType === val && styles.optionTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.interviewType === "technical" && form.skills.length > 0 && (
          <Text style={styles.typeTip}>
            Technical questions will focus on: {form.skills.slice(0, 4).join(", ")}
            {form.skills.length > 4 ? ` +${form.skills.length - 4} more` : ""}
          </Text>
        )}

        {/* Job description */}
        <Text style={styles.label}>Job description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Paste the job description here for more targeted questions..."
          placeholderTextColor="#aaa"
          value={form.jobDescription}
          onChangeText={(v) => setForm((prev) => ({ ...prev, jobDescription: v }))}
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
  topRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 8,
  },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 22 },
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
  typeTip: {
    fontSize: 12, color: "#16a34a", marginTop: 6, lineHeight: 16,
    backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: "#bbf7d0",
  },

  // Skills
  skillsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 20, marginBottom: 0,
  },
  clearLink: { fontSize: 12, color: "#888", textDecorationLine: "underline" },
  skillsHint: { fontSize: 12, color: "#aaa", marginBottom: 10, lineHeight: 16 },
  skillChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fafafa",
  },
  skillChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  skillCheck: { fontSize: 11, color: "#fff", fontWeight: "700" },
  skillChipText: { fontSize: 13, color: "#555" },
  skillChipTextSelected: { color: "#fff", fontWeight: "500" },

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
