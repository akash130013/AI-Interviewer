import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { saveProfile } from "../lib/profile";

// ── Role catalogue ────────────────────────────────────────────────────────────

const ROLES = [
  {
    id: "frontend", label: "Frontend\nDeveloper", emoji: "🎨", color: "#3b82f6",
    skills: ["React.js", "TypeScript", "JavaScript", "HTML/CSS", "Next.js", "TailwindCSS", "Vue.js", "Redux", "Jest", "Webpack"],
  },
  {
    id: "backend", label: "Backend\nDeveloper", emoji: "⚙️", color: "#8b5cf6",
    skills: ["Node.js", "Python", "Java", "SQL", "REST APIs", "Docker", "PostgreSQL", "Redis", "GraphQL", "Microservices"],
  },
  {
    id: "fullstack", label: "Full-Stack\nDeveloper", emoji: "🔮", color: "#6366f1",
    skills: ["React.js", "Node.js", "TypeScript", "SQL", "PostgreSQL", "Docker", "REST APIs", "GraphQL", "AWS", "MongoDB"],
  },
  {
    id: "mobile", label: "Mobile\nDeveloper", emoji: "📱", color: "#f59e0b",
    skills: ["React Native", "Flutter", "Kotlin", "Swift", "Firebase", "TypeScript", "Redux", "Android SDK", "Jetpack Compose"],
  },
  {
    id: "devops", label: "DevOps /\nCloud", emoji: "🛠️", color: "#f97316",
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD", "Jenkins", "Linux", "Python", "Prometheus"],
  },
  {
    id: "data", label: "Data / ML\nEngineer", emoji: "🧠", color: "#ec4899",
    skills: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "Pandas", "NumPy", "Spark", "Tableau", "Statistics"],
  },
  {
    id: "designer", label: "UI/UX\nDesigner", emoji: "✏️", color: "#14b8a6",
    skills: ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research", "Design Systems", "Usability Testing", "InVision"],
  },
  {
    id: "pm", label: "Product\nManager", emoji: "📊", color: "#84cc16",
    skills: ["Product Roadmapping", "Agile/Scrum", "SQL", "Figma", "A/B Testing", "User Research", "OKRs", "JIRA", "Go-to-Market"],
  },
  {
    id: "other", label: "Other /\nNot listed", emoji: "💼", color: "#94a3b8",
    skills: [],
  },
];

const DEFAULT_SELECTED_COUNT = 5; // how many skills are pre-ticked

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen({ userId, onDone }) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  function pickRole(role) {
    setSelectedRole(role);
    setSelectedSkills(role.skills.slice(0, DEFAULT_SELECTED_COUNT));
  }

  function toggleSkill(skill) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function goNext() {
    if (step === 1 && selectedRole) setStep(2);
  }

  async function handleDone() {
    setSaving(true);
    try {
      if (userId) {
        await saveProfile(userId, {
          jobCategory: selectedRole?.id || null,
          skills: selectedSkills,
          setupDone: true,
        });
      }
      onDone();
    } catch (e) {
      console.error("Profile save error:", e?.message);
      onDone(); // still proceed even if save fails
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      if (userId) {
        await saveProfile(userId, { jobCategory: null, skills: [], setupDone: true });
      }
    } catch (_) {}
    setSaving(false);
    onDone();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {step === 2 ? (
          <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <View style={styles.stepDots}>
          <View style={[styles.dot, step === 1 && styles.dotActive]} />
          <View style={[styles.dot, step === 2 && styles.dotActive]} />
        </View>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.6} disabled={saving}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {step === 1 ? (
          <>
            <Text style={styles.title}>What's your target role?</Text>
            <Text style={styles.subtitle}>
              We'll show you relevant study topics, daily challenges, and interview questions.
            </Text>

            {/* Role grid */}
            <View style={styles.grid}>
              {ROLES.map((role) => {
                const active = selectedRole?.id === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      active && { borderColor: role.color, backgroundColor: role.color + "12" },
                    ]}
                    onPress={() => pickRole(role)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                    <Text
                      style={[styles.roleLabel, active && { color: role.color }]}
                      numberOfLines={2}
                    >
                      {role.label}
                    </Text>
                    {active && (
                      <View style={[styles.checkMark, { backgroundColor: role.color }]}>
                        <Text style={styles.checkMarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              Your core skills
            </Text>
            <Text style={styles.subtitle}>
              These pre-fill your interview setup and personalise daily challenges. Tap to toggle.
            </Text>

            {/* Role chip at top */}
            <View style={[styles.rolePill, { backgroundColor: selectedRole.color + "18" }]}>
              <Text style={styles.rolePillEmoji}>{selectedRole.emoji}</Text>
              <Text style={[styles.rolePillText, { color: selectedRole.color }]}>
                {selectedRole.label.replace("\n", " ")}
              </Text>
            </View>

            {selectedRole.skills.length > 0 ? (
              <View style={styles.skillsGrid}>
                {selectedRole.skills.map((skill) => {
                  const selected = selectedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[
                        styles.skillChip,
                        selected && {
                          backgroundColor: selectedRole.color + "18",
                          borderColor: selectedRole.color,
                        },
                      ]}
                      onPress={() => toggleSkill(skill)}
                      activeOpacity={0.7}
                    >
                      {selected && (
                        <Text style={[styles.skillTick, { color: selectedRole.color }]}>✓ </Text>
                      )}
                      <Text
                        style={[
                          styles.skillChipText,
                          selected && { color: selectedRole.color, fontWeight: "700" },
                        ]}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noSkillsText}>
                No specific skills for this role — your practice will focus on behavioral and soft-skill questions.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.footer}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.ctaBtn, !selectedRole && styles.ctaBtnDisabled]}
            onPress={goNext}
            activeOpacity={0.8}
            disabled={!selectedRole}
          >
            <Text style={styles.ctaBtnText}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, saving && styles.ctaBtnDisabled]}
            onPress={handleDone}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaBtnText}>Get Started →</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  back: { fontSize: 15, color: "#111", width: 60 },
  stepDots: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e5e5e5" },
  dotActive: { backgroundColor: "#111", width: 20 },
  skipText: { fontSize: 13, color: "#aaa", width: 60, textAlign: "right" },

  scroll: { padding: 24, paddingTop: 12, paddingBottom: 32 },

  title: {
    fontSize: 26, fontWeight: "700", color: "#111",
    letterSpacing: -0.5, marginBottom: 10, lineHeight: 32,
  },
  subtitle: { fontSize: 14, color: "#888", lineHeight: 21, marginBottom: 24 },

  // Role grid — 3 columns
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleCard: {
    width: "30.5%",
    borderWidth: 1.5, borderColor: "#efefef",
    borderRadius: 14, padding: 12,
    alignItems: "center", gap: 6,
    position: "relative",
  },
  roleEmoji: { fontSize: 26, lineHeight: 32 },
  roleLabel: {
    fontSize: 11, fontWeight: "600", color: "#555",
    textAlign: "center", lineHeight: 16,
  },
  checkMark: {
    position: "absolute", top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  checkMarkText: { fontSize: 9, color: "#fff", fontWeight: "800" },

  // Step 2 — skills
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  rolePillEmoji: { fontSize: 16 },
  rolePillText: { fontSize: 13, fontWeight: "700" },

  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#e5e5e5",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  skillTick: { fontSize: 11, fontWeight: "800" },
  skillChipText: { fontSize: 12, color: "#555", fontWeight: "500" },

  noSkillsText: {
    fontSize: 14, color: "#aaa", lineHeight: 22,
    padding: 16, borderWidth: 1, borderColor: "#efefef",
    borderRadius: 12, backgroundColor: "#fafafa",
  },

  // Footer CTA
  footer: {
    padding: 20, paddingBottom: Platform.OS === "android" ? 20 : 12,
    borderTopWidth: 1, borderTopColor: "#f5f5f5",
    backgroundColor: "#fff",
  },
  ctaBtn: {
    backgroundColor: "#111", borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#ccc" },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
