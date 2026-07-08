import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    category: "General",
    items: [
      {
        q: "What is CrackIt?",
        a: "CrackIt is an AI-powered mock interview coach. You practice job interviews by speaking with an AI interviewer named Alex who asks adaptive questions, scores your answers, and gives you a detailed report — all on your phone.",
      },
      {
        q: "Is CrackIt free to use?",
        a: "CrackIt offers a free tier with a limited number of practice interviews per month. A paid subscription unlocks unlimited interviews and all premium features.",
      },
      {
        q: "What interview types are available?",
        a: "Three types: Technical (tests your coding and tech knowledge), Behavioral (STAR-format situational questions), and Mixed (a blend of both). You choose the type on the setup screen before each session.",
      },
      {
        q: "Which roles can I practice for?",
        a: "Any role — from Software Engineer and Data Scientist to Product Manager, UI/UX Designer, Marketing Manager, HR, and more. Select your role on the setup screen and Alex adapts the questions accordingly.",
      },
    ],
  },
  {
    category: "Interview",
    items: [
      {
        q: "How does the voice interview work?",
        a: "Tap the microphone button to start recording your answer. Speak naturally, then tap again to stop. Your speech is converted to text and sent to Alex. Alex responds with a follow-up or the next question, which is also spoken aloud.",
      },
      {
        q: "How is my score calculated?",
        a: "Each answer is evaluated across four dimensions: Clarity (how well-structured your answer is), Relevance (how directly you addressed the question), Depth (specific examples and detail), and STAR Structure (situation, task, action, result). The overall score (0–100) reflects your combined interview readiness.",
      },
      {
        q: "Why does Alex sometimes ask different types of questions?",
        a: "Alex adapts difficulty based on your performance. Two strong answers in a row → harder questions. Two weak answers → easier, more supportive questions. This keeps practice challenging but not overwhelming.",
      },
      {
        q: "What if I don't know the answer to a question?",
        a: "Just say \"I don't know\" or \"I'm not familiar with that.\" Alex will move on to the next topic rather than pressing you further. You'll still receive feedback and a sample better answer in your report.",
      },
      {
        q: "What is Quick Mode?",
        a: "Quick Mode is a 3-question session designed for a 5-minute practice burst. Tap the '⚡ Quick Practice' button on the setup screen. It's ideal for daily warm-ups or when you're short on time.",
      },
      {
        q: "What are Company Modes?",
        a: "Company Modes tailor questions to specific interview cultures: Amazon focuses on Leadership Principles, Google on Googleyness and data-driven thinking, Microsoft on Growth Mindset, and TCS/Infosys on HR + technical mix. Select a company on the setup screen.",
      },
    ],
  },
  {
    category: "Features",
    items: [
      {
        q: "What are Skills and why should I add them?",
        a: "Skills (e.g. React, Python, SQL, Docker) tell Alex which technologies to focus on during Technical interviews. Without skills selected, Alex asks general role questions. With skills, Alex asks specific depth questions like \"What is the difference between var, let, and const?\"",
      },
      {
        q: "What is the Study Hub?",
        a: "The Study Hub is a built-in library of 200+ curated Q&As across categories like JavaScript, Python, React, System Design, SQL, Docker, AWS, and more. Use it to study between interview sessions and prepare specific answers.",
      },
      {
        q: "What is a streak?",
        a: "Your streak tracks how many consecutive days you've completed at least one interview. Practice every day to keep it going. Miss a day and it resets to zero. The streak is shown on the home screen to keep you motivated.",
      },
      {
        q: "What does the Readiness % mean?",
        a: "The Interview Readiness % on your report is Alex's estimate of how prepared you are for a real interview right now, based on your answers in that session. Track it over time in your History to see your improvement trend.",
      },
    ],
  },
  {
    category: "Data & Privacy",
    items: [
      {
        q: "Is my data secure?",
        a: "Yes. All data is encrypted in transit (HTTPS/TLS). Your interview history is stored in Supabase with Row Level Security — only you can access your own records. Voice recordings are transcribed in real time and not stored on any server.",
      },
      {
        q: "Where is my data stored?",
        a: "Your account and interview history are stored in Supabase (a secure cloud database). Preferences and streak data are stored locally on your device only. We do not sell or share your data with third parties.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Delete Account. This permanently deletes all your interview history and logs you out. This action cannot be undone.",
      },
    ],
  },
];

export default function FAQScreen({ navigation }) {
  const [openKeys, setOpenKeys] = useState(new Set());

  function toggle(key) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Frequently asked questions about CrackIt.</Text>

        {FAQS.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.category.toUpperCase()}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = openKeys.has(key);
                const isLast = i === section.items.length - 1;

                return (
                  <View key={key}>
                    <TouchableOpacity
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                      style={styles.item}
                    >
                      <Text style={styles.question}>{item.q}</Text>
                      <Text style={[styles.caret, isOpen && styles.caretOpen]}>›</Text>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.answerBox}>
                        <Text style={styles.answer}>{item.a}</Text>
                      </View>
                    )}

                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Still have a question?</Text>
          <Text style={styles.footerEmail}>richmediahub@gmail.com</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  back: { fontSize: 15, color: "#111", width: 50 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  scroll: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14, color: "#888", marginBottom: 24, lineHeight: 20 },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#999",
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#efefef", overflow: "hidden",
  },

  item: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  question: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111", lineHeight: 20 },
  caret: {
    fontSize: 22, color: "#ccc", fontWeight: "300",
    transform: [{ rotate: "0deg" }],
  },
  caretOpen: {
    transform: [{ rotate: "90deg" }],
    color: "#111",
  },
  answerBox: {
    paddingHorizontal: 16, paddingBottom: 14,
  },
  answer: { fontSize: 14, color: "#555", lineHeight: 22 },
  divider: { height: 1, backgroundColor: "#f5f5f5", marginLeft: 16 },

  footer: {
    alignItems: "center", paddingTop: 16, gap: 4,
  },
  footerText: { fontSize: 13, color: "#aaa" },
  footerEmail: { fontSize: 13, color: "#111", fontWeight: "600" },
});
