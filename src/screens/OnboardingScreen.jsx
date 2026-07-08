import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { getStreakData } from "../lib/streak";
import { getProfile } from "../lib/profile";
import { supabase } from "../lib/supabase";

// ─── Preset role list (shown in dropdown) ────────────────────────────────────

const PRESET_ROLES = [
  // Engineering
  "Software Engineer", "Senior Software Engineer", "Software Developer",
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "React Developer", "Node.js Developer",
  "Android Developer", "iOS Developer", "Mobile Developer",
  "DevOps Engineer", "Cloud Engineer", "Platform Engineer", "SRE",
  "Data Scientist", "Machine Learning Engineer", "AI Engineer",
  "Data Analyst", "Data Engineer",
  "QA Engineer", "Test Automation Engineer",
  "Cybersecurity Engineer", "Security Analyst",
  // Design
  "Graphic Designer", "Visual Designer", "Brand Designer",
  "UI/UX Designer", "Product Designer",
  // Product & Management
  "Product Manager", "Technical Program Manager",
  "Project Manager", "Operations Manager",
  // Marketing & Content
  "Digital Marketing Manager", "SEO Specialist", "Social Media Manager",
  "Content Writer", "Copywriter", "Technical Writer",
  // Business
  "Sales Manager", "Business Development Manager", "Account Manager",
  "HR Manager", "Talent Acquisition Specialist", "Recruiter",
  "Finance Manager", "Financial Analyst", "Accountant",
];

// ─── Role → skills mapping ────────────────────────────────────────────────────

const ROLE_SKILL_MAP = [
  {
    keywords: ["full stack", "fullstack"],
    skills: ["React.js", "Node.js", "TypeScript", "SQL", "PostgreSQL", "MongoDB", "Docker", "REST APIs", "GraphQL", "AWS", "Git"],
  },
  {
    keywords: ["frontend", "front-end", "front end", "react developer", "vue", "angular"],
    skills: ["React.js", "Vue.js", "Angular", "TypeScript", "JavaScript", "HTML/CSS", "Redux", "Next.js", "TailwindCSS", "Jest", "Webpack", "Vite"],
  },
  {
    keywords: ["backend", "back-end", "back end", "node.js developer", "api developer"],
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
    keywords: ["mobile developer", "react native", "flutter"],
    skills: ["React Native", "Flutter", "Kotlin", "Swift", "Firebase", "TypeScript", "Redux"],
  },
  {
    keywords: ["data scientist", "machine learning", "ml engineer", "ai engineer"],
    skills: ["Python", "R", "SQL", "Machine Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Tableau", "Spark"],
  },
  {
    keywords: ["data analyst", "business intelligence"],
    skills: ["SQL", "Python", "Excel", "Tableau", "Power BI", "Google Analytics", "Data Visualization", "Statistics"],
  },
  {
    keywords: ["data engineer", "etl", "pipeline"],
    skills: ["Python", "SQL", "Apache Spark", "Airflow", "Kafka", "AWS", "Snowflake", "dbt", "BigQuery"],
  },
  {
    keywords: ["devops", "sre", "platform engineer", "cloud engineer", "infrastructure"],
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD", "Jenkins", "Linux", "Python", "Prometheus"],
  },
  {
    keywords: ["qa", "quality assurance", "test automation", "sdet"],
    skills: ["Selenium", "Cypress", "Jest", "JUnit", "Postman", "API Testing", "Performance Testing", "JIRA", "Test Automation"],
  },
  {
    keywords: ["cybersecurity", "security engineer", "security analyst", "infosec"],
    skills: ["Penetration Testing", "SIEM", "Network Security", "Firewalls", "SOC", "Python", "Linux", "OWASP", "Vulnerability Assessment"],
  },
  {
    keywords: ["product manager", "technical program manager"],
    skills: ["Product Roadmapping", "Agile/Scrum", "SQL", "Figma", "A/B Testing", "JIRA", "User Research", "OKRs", "Go-to-Market"],
  },
  {
    keywords: ["project manager", "program manager", "operations manager"],
    skills: ["Agile/Scrum", "JIRA", "Risk Management", "Stakeholder Management", "MS Project", "Confluence", "Budget Management"],
  },
  {
    keywords: ["graphic designer", "visual designer", "brand designer"],
    skills: ["Figma", "Adobe Illustrator", "Adobe Photoshop", "InDesign", "After Effects", "Canva", "Typography", "Brand Identity", "Color Theory"],
  },
  {
    keywords: ["ui/ux", "ux designer", "ui designer", "product designer", "user experience"],
    skills: ["Figma", "Adobe XD", "Sketch", "InVision", "Prototyping", "User Research", "Wireframing", "Design Systems", "Usability Testing"],
  },
  {
    keywords: ["content writer", "copywriter", "technical writer", "content creator"],
    skills: ["SEO", "WordPress", "Copywriting", "Content Strategy", "Social Media", "Google Analytics", "Email Marketing"],
  },
  {
    keywords: ["digital marketing", "seo specialist", "social media manager", "growth", "marketing manager", "marketing"],
    skills: ["Google Ads", "Facebook/Meta Ads", "SEO", "Google Analytics", "HubSpot", "Email Marketing", "Content Strategy", "CRM", "Canva"],
  },
  {
    keywords: ["sales manager", "business development", "account manager"],
    skills: ["CRM", "Salesforce", "Lead Generation", "Cold Outreach", "Pipeline Management", "Negotiation", "PowerPoint"],
  },
  {
    keywords: ["hr manager", "human resources", "talent acquisition", "recruiter"],
    skills: ["Recruitment", "HRIS", "Performance Management", "Employee Relations", "Payroll", "Labor Laws", "Onboarding"],
  },
  {
    keywords: ["finance manager", "financial analyst", "accountant", "cfo"],
    skills: ["Excel", "Financial Modeling", "SAP", "QuickBooks", "Tally", "Financial Reporting", "Budgeting", "GAAP", "Tableau"],
  },
  // Generic fallback for "software engineer", "developer", "engineer", "programmer"
  {
    keywords: ["software engineer", "software developer", "swe", "engineer", "developer", "programmer"],
    skills: ["React.js", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "SQL", "PostgreSQL", "Docker", "AWS", "REST APIs", "Git"],
  },
];

// Profile job_category → default role string for the onboarding form
const PROFILE_ROLE_MAP = {
  frontend: "Frontend Developer",
  backend:  "Backend Developer",
  fullstack: "Full Stack Developer",
  mobile:   "Mobile Developer",
  devops:   "DevOps Engineer",
  data:     "Data Scientist",
  designer: "UI/UX Designer",
  pm:       "Product Manager",
};

function getSkillsForRole(role) {
  if (!role || role.trim().length < 2) return [];
  const lower = role.toLowerCase();
  for (const entry of ROLE_SKILL_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.skills;
    }
  }
  return []; // No match → empty, user can add custom skills
}

// ─── Persistence ─────────────────────────────────────────────────────────────

// v2 key — old stored format (pre-skills) gets ignored cleanly
const FORM_KEY = "@crackit_form_v2";

async function saveFormToStore(form) {
  try {
    const { jobDescription, ...toSave } = form;
    await SecureStore.setItemAsync(FORM_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

async function loadFormFromStore() {
  try {
    const raw = await SecureStore.getItemAsync(FORM_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    // Explicit mapping ensures every field has a valid default (no undefined fields)
    return {
      role: p.role || "",
      company: p.company || "",
      yearsOfExperience: p.yearsOfExperience || "3-5",
      interviewType: p.interviewType || "mixed",
      companyMode: p.companyMode || "General",
      skills: Array.isArray(p.skills) ? p.skills : [],
      jobDescription: "",
    };
  } catch (_) {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }) {
  const [streak, setStreak] = useState(0);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState("");
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

  // Reload saved form whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function hydrate() {
        const [saved, { count }] = await Promise.all([
          loadFormFromStore(),
          getStreakData(),
        ]);
        setStreak(count);
        if (saved) {
          setForm(saved);
          setAvailableSkills(getSkillsForRole(saved.role));
          return;
        }
        // First visit: pre-fill role from profile if set
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const profile = await getProfile(session.user.id);
            if (profile?.job_category) {
              const role = PROFILE_ROLE_MAP[profile.job_category] || "";
              if (role) {
                const skills = getSkillsForRole(role).slice(0, 5);
                const next = { ...form, role, skills };
                setForm(next);
                setAvailableSkills(getSkillsForRole(role));
              }
            }
          }
        } catch (_) {}
      }
      hydrate();
    }, [])
  );

  // Only update available skill chips when role text changes — never auto-mutate form.skills
  useEffect(() => {
    setAvailableSkills(getSkillsForRole(form.role));
  }, [form.role]);

  // All form-change helpers: compute next state directly (no functional updater)
  // so saveFormToStore is never called inside a React state updater.
  function updateForm(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    saveFormToStore(next);
  }

  function togglePresetSkill(skill) {
    const skills = form.skills || [];
    const next = {
      ...form,
      skills: skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill],
    };
    setForm(next);
    saveFormToStore(next);
  }

  function addCustomSkill() {
    const skill = customSkillInput.trim();
    if (!skill || (form.skills || []).includes(skill)) {
      setCustomSkillInput("");
      return;
    }
    const next = { ...form, skills: [...(form.skills || []), skill] };
    setForm(next);
    saveFormToStore(next);
    setCustomSkillInput("");
  }

  function removeSkill(skill) {
    const next = { ...form, skills: (form.skills || []).filter((s) => s !== skill) };
    setForm(next);
    saveFormToStore(next);
  }

  // Selecting a preset role clears skills so fresh chips load for the new role
  function selectPresetRole(role) {
    const next = { ...form, role, skills: [] };
    setForm(next);
    saveFormToStore(next);
    setAvailableSkills(getSkillsForRole(role));
    setShowRoleSuggestions(false);
  }

  function handleStart(quickMode = false) {
    if (!form.role.trim()) {
      Alert.alert("Required", "Please enter the role you are applying for.");
      return;
    }
    navigation.navigate("Interview", { candidateContext: { ...form, quickMode } });
  }

  // Roles to show in dropdown — filtered by what's typed
  const filteredPresets = PRESET_ROLES.filter((r) =>
    form.role.trim() === ""
      ? true
      : r.toLowerCase().includes(form.role.toLowerCase())
  ).slice(0, 8);

  const safeSkills = form.skills || [];
  const allPresetSkillValues = ROLE_SKILL_MAP.flatMap((e) => e.skills);
  const customSelectedSkills = safeSkills.filter((s) => !allPresetSkillValues.includes(s));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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

        <TouchableOpacity
          style={styles.studyBtn}
          onPress={() => navigation.navigate("Study")}
        >
          <Text style={styles.studyBtnIcon}>📚</Text>
          <View>
            <Text style={styles.studyBtnTitle}>Study Topics First</Text>
            <Text style={styles.studyBtnSub}>Browse Q&As across 7 categories</Text>
          </View>
          <Text style={styles.studyBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* Interview mode */}
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

        {/* Role — with dropdown suggestions */}
        <Text style={styles.label}>Role you are applying for *</Text>
        <View style={styles.roleWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Senior Software Engineer"
            placeholderTextColor="#aaa"
            value={form.role}
            onChangeText={(v) => {
              updateForm({ role: v });
              setShowRoleSuggestions(true);
            }}
            onFocus={() => setShowRoleSuggestions(true)}
            onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 180)}
          />
          <TouchableOpacity
            style={styles.roleDropdownIcon}
            onPress={() => setShowRoleSuggestions((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.roleDropdownCaret}>{showRoleSuggestions ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>

        {showRoleSuggestions && filteredPresets.length > 0 && (
          <View style={styles.suggestionsBox}>
            {filteredPresets.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.suggestionItem, form.role === r && styles.suggestionItemActive]}
                onPress={() => selectPresetRole(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, form.role === r && styles.suggestionTextActive]}>
                  {r}
                </Text>
                {form.role === r && <Text style={styles.suggestionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skills */}
        {(availableSkills.length > 0 || form.skills.length > 0) && (
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

            {/* Preset skill chips */}
            {availableSkills.length > 0 && (
              <View style={styles.skillChips}>
                {availableSkills.map((skill) => {
                  const selected = safeSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillChip, selected && styles.skillChipSelected]}
                      onPress={() => togglePresetSkill(skill)}
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
            )}

            {/* Custom selected skills (not in any preset list) */}
            {customSelectedSkills.length > 0 && (
              <View style={[styles.skillChips, { marginTop: 8 }]}>
                {customSelectedSkills.map((skill) => (
                  <View key={skill} style={[styles.skillChip, styles.skillChipCustom]}>
                    <Text style={styles.skillChipTextSelected}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill(skill)} style={styles.removeSkillBtn}>
                      <Text style={styles.removeSkillText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Custom skill add — always visible if role is entered */}
        {form.role.trim().length > 1 && (
          <>
            {availableSkills.length === 0 && form.skills.length === 0 && (
              <View style={styles.skillsHeader}>
                <Text style={styles.label}>Your key skills</Text>
              </View>
            )}
            <View style={styles.addSkillRow}>
              <TextInput
                style={styles.addSkillInput}
                placeholder="Add a skill not listed above..."
                placeholderTextColor="#bbb"
                value={customSkillInput}
                onChangeText={setCustomSkillInput}
                onSubmitEditing={addCustomSkill}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addSkillBtn,
                  !customSkillInput.trim() && styles.addSkillBtnDisabled,
                ]}
                onPress={addCustomSkill}
                activeOpacity={0.7}
                disabled={!customSkillInput.trim()}
              >
                <Text style={styles.addSkillBtnText}>+ Add</Text>
              </TouchableOpacity>
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
        {form.interviewType === "technical" && safeSkills.length > 0 && (
          <Text style={styles.typeTip}>
            Technical questions will focus on:{" "}
            {safeSkills.slice(0, 4).join(", ")}
            {safeSkills.length > 4 ? ` +${safeSkills.length - 4} more` : ""}
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

  // Role dropdown
  roleWrapper: { position: "relative" },
  roleDropdownIcon: {
    position: "absolute", right: 14, top: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
  roleDropdownCaret: { fontSize: 11, color: "#aaa" },
  suggestionsBox: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    backgroundColor: "#fff", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  suggestionItemActive: { backgroundColor: "#f9fafb" },
  suggestionText: { fontSize: 14, color: "#374151" },
  suggestionTextActive: { fontWeight: "600", color: "#111" },
  suggestionCheck: { fontSize: 13, color: "#111", fontWeight: "700" },

  // Skills
  skillsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 20,
  },
  clearLink: { fontSize: 12, color: "#888", textDecorationLine: "underline", marginTop: 20 },
  skillsHint: { fontSize: 12, color: "#aaa", marginBottom: 10, lineHeight: 16 },
  skillChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fafafa",
  },
  skillChipSelected: { backgroundColor: "#111", borderColor: "#111" },
  skillChipCustom: {
    backgroundColor: "#1d4ed8", borderColor: "#1d4ed8",
    paddingRight: 6, gap: 6,
  },
  skillCheck: { fontSize: 11, color: "#fff", fontWeight: "700" },
  skillChipText: { fontSize: 13, color: "#555" },
  skillChipTextSelected: { color: "#fff", fontWeight: "500" },
  removeSkillBtn: { paddingHorizontal: 4 },
  removeSkillText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "700" },

  // Add custom skill
  addSkillRow: {
    flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center",
  },
  addSkillInput: {
    flex: 1, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: "#111", backgroundColor: "#fafafa",
    borderStyle: "dashed",
  },
  addSkillBtn: {
    backgroundColor: "#111", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addSkillBtnDisabled: { backgroundColor: "#ccc" },
  addSkillBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

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
