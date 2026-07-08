import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { supabase, getPastInterviews } from "../lib/supabase";
import { getStreakData } from "../lib/streak";
import { getAllProgress } from "../lib/studyProgress";
import { getStudyCategories } from "../lib/study";
import { getProfile } from "../lib/profile";

// ── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  frontend:  "Frontend Developer",
  backend:   "Backend Developer",
  fullstack: "Full-Stack Developer",
  mobile:    "Mobile Developer",
  devops:    "DevOps Engineer",
  data:      "Data Scientist / ML",
  designer:  "UI/UX Designer",
  pm:        "Product Manager",
  other:     "Professional",
};

const ROLE_COLORS = {
  frontend: "#3b82f6", backend: "#8b5cf6", fullstack: "#6366f1",
  mobile: "#f59e0b",  devops: "#f97316",  data: "#ec4899",
  designer: "#14b8a6", pm: "#84cc16",     other: "#94a3b8",
};

// Which category title keywords are relevant for each role
const ROLE_CAT_KEYWORDS = {
  frontend:  ["behavioral", "hr", "technical", "dsa"],
  backend:   ["behavioral", "hr", "technical", "system design", "database", "dsa"],
  fullstack: ["behavioral", "hr", "technical", "system design", "database", "dsa"],
  mobile:    ["behavioral", "hr", "technical", "dsa"],
  devops:    ["behavioral", "hr", "devops", "cloud", "system design", "technical"],
  data:      ["behavioral", "hr", "technical", "database", "ai", "ml", "dsa"],
  designer:  ["behavioral", "hr"],
  pm:        ["behavioral", "hr"],
  other:     null, // show all
};

function isCatRelevant(catTitle, jobCategory) {
  const keywords = ROLE_CAT_KEYWORDS[jobCategory];
  if (!keywords) return true; // no profile or 'other' → show all
  const lower = catTitle.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ── Daily challenge pool ──────────────────────────────────────────────────────
// roles: null = show to everyone; array = only for those roles

const CHALLENGE_POOL = [
  // JavaScript
  {
    roles: ["frontend", "backend", "fullstack", "mobile"],
    topic: "JavaScript",
    question: "What is the difference between var, let, and const? When would you use each?",
    answer: "var is function-scoped, hoisted, and can be redeclared — avoid it in modern code.\n\nlet is block-scoped and can be reassigned. Use it for values that will change (loop counters, conditional assignments).\n\nconst is block-scoped and cannot be reassigned after declaration. Default choice — use it unless you know the binding will change. Note: const objects/arrays can still have their contents mutated.",
  },
  {
    roles: ["frontend", "backend", "fullstack", "mobile"],
    topic: "JavaScript",
    question: "What is a closure in JavaScript? Give a real-world example.",
    answer: "A closure is a function that retains access to its outer scope even after the outer function has returned.\n\nExample: a counter factory — a function returns another function that increments a private `count` variable. Each call to the factory creates a new independent counter.\n\nClosures are the foundation of module patterns, memoization, and React hooks like useState.",
  },
  {
    roles: ["frontend", "backend", "fullstack", "mobile"],
    topic: "JavaScript",
    question: "Explain the JavaScript event loop. How does async/await fit in?",
    answer: "JavaScript is single-threaded. The event loop checks the call stack and task queues continuously. Async operations are offloaded to browser APIs; their callbacks go into the task queue once resolved.\n\nasync/await is syntactic sugar over Promises. An await pauses the current async function and returns control to the event loop. When the awaited Promise resolves, execution resumes from where it paused.",
  },
  {
    roles: ["frontend", "backend", "fullstack", "mobile"],
    topic: "JavaScript",
    question: "What is event delegation and why is it useful?",
    answer: "Event delegation means attaching a single event listener to a parent element instead of individual listeners on each child. Events bubble up the DOM, so the parent can intercept them via event.target.\n\nBenefits: fewer listeners = better memory performance, and new child elements automatically work without re-attaching listeners. Especially useful for dynamic lists.",
  },
  {
    roles: ["frontend", "backend", "fullstack", "mobile"],
    topic: "JavaScript",
    question: "What is the difference between == and ===?",
    answer: "=== (strict equality) checks both value AND type — no coercion. 1 === '1' is false.\n\n== (loose equality) does type coercion before comparing. 1 == '1' is true because '1' is coerced to 1. This causes subtle bugs.\n\nAlways prefer ===. Only use == when you deliberately need coercion (rare and should be commented).",
  },
  // React
  {
    roles: ["frontend", "fullstack", "mobile"],
    topic: "React",
    question: "What is the virtual DOM and why does React use it?",
    answer: "The virtual DOM is a lightweight in-memory representation of the real DOM. When state changes, React re-renders the virtual DOM and diffs it against the previous version (reconciliation). Only actual changes are applied to the real DOM.\n\nReal DOM operations are expensive. By batching and minimizing them, React improves rendering performance, especially for frequently-updating UIs.",
  },
  {
    roles: ["frontend", "fullstack", "mobile"],
    topic: "React",
    question: "What is the difference between state and props in React?",
    answer: "Props are inputs passed from a parent component — read-only from the child's perspective. They make components reusable and configurable.\n\nState is data managed inside a component that can change over time. When state changes, React re-renders. State is private unless lifted up or shared via context.\n\nRule of thumb: if a value is needed by a parent or sibling, lift it to state higher up and pass it down as props.",
  },
  {
    roles: ["frontend", "fullstack", "mobile"],
    topic: "React",
    question: "When would you use useCallback vs useMemo?",
    answer: "useMemo memoizes a computed value — use it when a calculation is expensive and shouldn't re-run on every render.\n\nuseCallback memoizes a function reference — use it when passing callbacks to children wrapped in React.memo, so the child doesn't re-render just because the parent did.\n\nBoth take a dependency array. Only apply these when you can measure a real performance problem — premature memoization adds complexity.",
  },
  {
    roles: ["frontend", "fullstack", "mobile"],
    topic: "React",
    question: "What are React keys and why are they important?",
    answer: "Keys help React identify which items in a list have changed, been added, or removed. Without stable keys, React falls back to index-based matching, which causes incorrect state updates and poor performance when items are reordered.\n\nKeys should be stable, unique, and from your data (database IDs). Avoid using array index as a key for lists that can change order.",
  },
  // React Native
  {
    roles: ["mobile"],
    topic: "React Native",
    question: "What is the difference between ScrollView and FlatList?",
    answer: "ScrollView renders all children at once, regardless of whether they're visible. It's fine for short, static lists.\n\nFlatList renders items lazily — only what's visible in the viewport plus a small buffer. It recycles components as you scroll, making it far more memory-efficient for long or dynamic lists.\n\nRule: use FlatList for any list that might have more than ~20 items or loads from an API.",
  },
  // System Design
  {
    roles: ["backend", "fullstack", "devops"],
    topic: "System Design",
    question: "How would you design a URL shortener like bit.ly?",
    answer: "Key components:\n1. API: POST /shorten returns short code; GET /:code redirects\n2. DB: { short_code, original_url, created_at }. Index on short_code\n3. Code generation: MD5/SHA → base62 encode, take first 7 chars\n4. Redirect: 301 (permanent, cached) vs 302 (always hits server — better for analytics)\n5. Scale: cache popular URLs in Redis, CDN for global reads, read replicas at scale",
  },
  {
    roles: ["backend", "fullstack", "devops"],
    topic: "System Design",
    question: "What is the difference between horizontal and vertical scaling?",
    answer: "Vertical scaling (scale up): add more CPU/RAM to the same server. Simple but has a hardware ceiling and is a single point of failure.\n\nHorizontal scaling (scale out): add more servers and distribute load. Requires a load balancer and distributed state management, but near-unlimited scale and better fault tolerance.\n\nStart with vertical (simplest), switch to horizontal when you hit limits or need high availability.",
  },
  {
    roles: ["backend", "fullstack", "devops"],
    topic: "System Design",
    question: "Explain CAP theorem with an example of a CP vs AP system.",
    answer: "CAP states that during a network partition, a distributed system must choose between Consistency and Availability. (Partition tolerance is always required in real networks.)\n\nCP (consistent + partition-tolerant): rejects requests when data might be stale. Example: ZooKeeper, HBase. Good for financial systems.\n\nAP (available + partition-tolerant): always responds, possibly with stale data. Example: DynamoDB, Cassandra. Good for social feeds where eventual consistency is fine.",
  },
  // DevOps
  {
    roles: ["devops"],
    topic: "DevOps",
    question: "What is the difference between a Docker image and a Docker container?",
    answer: "A Docker image is a read-only template — the blueprint for a container. It's built in layers and can be stored/distributed in a registry.\n\nA container is a running instance of an image. Containers are isolated processes with their own filesystem, but share the host OS kernel.\n\nAnalogy: image is the class definition, container is the instantiated object. One image can run as many containers simultaneously.",
  },
  {
    roles: ["devops"],
    topic: "DevOps",
    question: "How do you achieve zero-downtime deployment with Kubernetes?",
    answer: "Kubernetes rolling updates replace pods gradually: it spins up new pods with the updated image, waits for them to pass health checks, then terminates the old ones. The service always routes traffic only to ready pods.\n\nKey config: `maxSurge` (extra pods allowed during update) and `maxUnavailable` (pods that can be down). Set `readinessProbe` carefully — a pod isn't marked ready until your app can actually serve traffic.",
  },
  // Python
  {
    roles: ["backend", "data"],
    topic: "Python",
    question: "What is the difference between a list and a tuple in Python?",
    answer: "Lists are mutable — you can add, remove, or change elements. Syntax: [1, 2, 3].\n\nTuples are immutable — once created, they cannot be changed. Syntax: (1, 2, 3).\n\nUse tuples for data that should not change (coordinates, function return pairs). Tuples are slightly faster and can be used as dictionary keys. Use lists for dynamic collections.",
  },
  {
    roles: ["backend", "data"],
    topic: "Python",
    question: "What are Python decorators? Give a practical example.",
    answer: "A decorator is a function that wraps another function to add behavior without modifying the original code.\n\nExample:\n```\ndef log_call(func):\n  def wrapper(*args):\n    print(f'Calling {func.__name__}')\n    return func(*args)\n  return wrapper\n\n@log_call\ndef greet(name): print(f'Hello, {name}')\n```\n\nUsed for: logging, authentication checks (@login_required), caching, rate limiting. @staticmethod and @classmethod are built-in decorators.",
  },
  // SQL
  {
    roles: ["backend", "fullstack", "data"],
    topic: "SQL",
    question: "What is the difference between INNER JOIN and LEFT JOIN?",
    answer: "INNER JOIN returns only rows where there's a match in BOTH tables. Unmatched rows are excluded.\n\nLEFT JOIN returns all rows from the left table, plus matching rows from the right. Where there's no match, right-table columns appear as NULL.\n\nExample: users LEFT JOIN orders → returns every user, including those with no orders. INNER JOIN on the same would exclude users who've never ordered.",
  },
  {
    roles: ["backend", "fullstack", "data"],
    topic: "SQL",
    question: "What are database indexes and when should you use them?",
    answer: "An index is a separate data structure (usually a B-tree) that lets the DB find rows faster without scanning the full table.\n\nUse indexes on:\n- Columns in frequent WHERE clauses on large tables\n- Foreign key columns (for JOIN speed)\n- ORDER BY / GROUP BY columns\n\nTradeoffs: indexes speed up reads but slow writes and use disk space. Don't index every column — only ones in slow, frequent queries. Use EXPLAIN to confirm the index is actually used.",
  },
  // General CS
  {
    roles: ["frontend", "backend", "fullstack"],
    topic: "General CS",
    question: "What is the difference between REST and GraphQL?",
    answer: "REST uses separate URL endpoints per resource (GET /users, GET /posts). Simple, cacheable, widely understood. But can suffer from over-fetching (too much data) or under-fetching (multiple round trips needed).\n\nGraphQL exposes a single endpoint where clients specify exactly what data they need. No over/under-fetching. Flexible for complex or changing UIs.\n\nChoose REST for stable, simple APIs with good caching. GraphQL when clients have varying data needs or round trips matter (mobile apps).",
  },
  {
    roles: ["frontend", "backend", "fullstack"],
    topic: "General CS",
    question: "Explain Big O notation. What is the difference between O(n) and O(log n)?",
    answer: "Big O describes how an algorithm's time or space scales as input size (n) grows in the worst case.\n\nO(n) — linear: time grows proportionally with input. A single loop through an array. Doubling the input doubles the time.\n\nO(log n) — logarithmic: time grows very slowly. Binary search halves the problem each step. For n=1,000,000, only ~20 steps needed.\n\nScale: O(1) → O(log n) → O(n) → O(n log n) → O(n²) → O(2ⁿ), from fastest to slowest.",
  },
  // Behavioral (all roles)
  {
    roles: null,
    topic: "Behavioral",
    question: "Tell me about a time you failed at work and what you learned from it.",
    answer: "Use STAR: Situation → Task → Action → Result.\n\nBe honest about the failure, take ownership, and focus most of your answer on what you learned and how you applied that lesson later. Avoid blaming others.\n\nChoose a real failure with a meaningful takeaway — interviewers see through stories where you 'failed' but everything turned out fine.",
  },
  {
    roles: null,
    topic: "Behavioral",
    question: "How do you handle multiple deadlines competing for your attention?",
    answer: "Use STAR with a real example. Demonstrate:\n1. You assess urgency vs. importance\n2. You communicate with stakeholders early when you see a conflict — no surprises\n3. You break large tasks into milestones to track progress across priorities\n4. You ask for help or negotiate scope when truly blocked\n\nAvoid 'I just work harder.' Interviewers want to see a prioritization framework and proactive communication.",
  },
  {
    roles: null,
    topic: "Behavioral",
    question: "Describe a time you had to learn a new skill or technology quickly.",
    answer: "Use STAR. Include: what it was, your timeline, HOW you learned (docs, tutorials, prototyping, asking colleagues), and what you delivered.\n\nShow your learning strategy — how you identified what was essential vs. nice-to-know, and that you're comfortable asking for help. Interviewers want to know you can ramp up quickly on any stack.",
  },
  // Designer-specific
  {
    roles: ["designer"],
    topic: "UX Design",
    question: "Walk me through your design process from brief to final handoff.",
    answer: "A strong answer covers all phases:\n1. Discovery — understand the problem, user research, stakeholder interviews\n2. Define — synthesize insights, personas, user journey maps\n3. Ideate — sketches, wireframes, exploring multiple directions\n4. Prototype — low or high fidelity depending on what you're testing\n5. Test — usability sessions, iterate based on findings\n6. Handoff — specs, design system components, dev collaboration\n\nBe specific about tools (Figma, Maze, etc.) and give a real project example.",
  },
  {
    roles: ["designer"],
    topic: "UX Design",
    question: "How do you balance user needs with business constraints?",
    answer: "Frame it as a collaboration problem, not a conflict. Steps:\n1. Understand both sides — what does the user need? What's the business constraint (time, cost, scope)?\n2. Quantify the user need — data, usability findings, quotes\n3. Propose solutions that satisfy both: 'We can't build the full feature, but this lighter version addresses the core user pain and can be shipped in sprint 2'\n4. Document trade-offs so the decision is informed, not accidental\n\nShow that you advocate for the user while being commercially aware.",
  },
  // PM-specific
  {
    roles: ["pm"],
    topic: "Product",
    question: "How would you prioritize three competing feature requests from different stakeholders?",
    answer: "Use a framework:\n1. Align on the goal — which company metric matters most right now? Revenue, retention, NPS?\n2. Score each feature on impact (how much it moves that metric) × confidence × effort (lower = better)\n3. Cross-reference with strategy — does it fit the current quarter's focus?\n4. Communicate the decision — don't just pick one, explain the trade-offs to the others\n\nMention frameworks like RICE, MoSCoW, or effort/impact matrix. Show you make decisions with data, not politics.",
  },
  {
    roles: ["pm"],
    topic: "Product",
    question: "How do you define success for a product feature?",
    answer: "Work backwards from the goal:\n1. What user problem does this solve? How do we know it's solved? (Task completion, time on task, support tickets)\n2. What business metric moves? (Revenue, retention, activation, engagement)\n3. What are the leading vs. lagging indicators? Set both.\n4. What's the counter-metric? (Don't improve retention by making it hard to cancel)\n\nState your metrics BEFORE launch, not after. Define the 'good enough' threshold to avoid endless iteration.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDailyChallenge(jobCategory) {
  const filtered = jobCategory
    ? CHALLENGE_POOL.filter((q) => !q.roles || q.roles.includes(jobCategory))
    : CHALLENGE_POOL;
  const pool = filtered.length > 0 ? filtered : CHALLENGE_POOL;
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return pool[dayOfYear % pool.length];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(email) {
  if (!email) return "there";
  const local = email.split("@")[0];
  const letters = local.replace(/[^a-zA-Z]/g, "");
  const name = letters || local;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function relativeDate(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TYPE_META = {
  technical:  { label: "Technical",  bg: "#eff6ff", color: "#1d4ed8" },
  behavioral: { label: "Behavioral", bg: "#f0fdf4", color: "#15803d" },
  mixed:      { label: "Mixed",      bg: "#faf5ff", color: "#7c3aed" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [jobCategory, setJobCategory] = useState(null);
  const [streak, setStreak] = useState({ count: 0, bestCount: 0 });
  const [stats, setStats] = useState({ sessions: 0, avgScore: 0, studied: 0 });
  const [categories, setCategories] = useState([]);
  const [progress, setProgress] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [challengeRevealed, setChallengeRevealed] = useState(false);
  const [challengeMarked, setChallengeMarked] = useState(null);

  const challenge = useMemo(() => getDailyChallenge(jobCategory), [jobCategory]);

  // Categories: load once from Supabase on mount
  useEffect(() => {
    getStudyCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  // Reload all live data each time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const [{ data: { session } }, prog, streakData] = await Promise.all([
        supabase.auth.getSession(),
        getAllProgress(),
        getStreakData(),
      ]);

      if (session?.user?.email) setEmail(session.user.email);
      setStreak({ count: streakData.count || 0, bestCount: streakData.bestCount || streakData.count || 0 });
      setProgress(prog);

      const totalStudied = Object.values(prog).reduce((s, ids) => s + ids.length, 0);

      if (session?.user?.id) {
        const [interviews, profile] = await Promise.all([
          getPastInterviews(session.user.id),
          getProfile(session.user.id),
        ]);

        if (profile?.job_category) setJobCategory(profile.job_category);

        const totalSessions = interviews.length;
        const avgScore = totalSessions > 0
          ? Math.round(interviews.reduce((s, i) => s + (i.overall_score || 0), 0) / totalSessions)
          : 0;
        setStats({ sessions: totalSessions, avgScore, studied: totalStudied });
        setRecentSessions(interviews.slice(0, 2));
      } else {
        setStats((prev) => ({ ...prev, studied: totalStudied }));
      }
    } catch (e) {
      console.error("Dashboard load error:", e?.message);
    }
  }

  function getCatProgress(cat) {
    const total = (cat.study_topics || []).reduce((s, t) => s + (t.study_questions || []).length, 0);
    const studied = (cat.study_topics || []).reduce((s, t) => s + (progress[t.id] || []).length, 0);
    return { total, studied, pct: total > 0 ? Math.round((studied / total) * 100) : 0 };
  }

  const relevantCats = categories.filter((cat) => isCatRelevant(cat.title, jobCategory));
  const totalQs = relevantCats.reduce((s, c) => s + getCatProgress(c).total, 0);
  const topicsStarted = relevantCats.filter((c) => getCatProgress(c).studied > 0).length;

  const focusAreas = relevantCats
    .map((c) => ({ name: c.title, color: c.color, ...getCatProgress(c) }))
    .filter((c) => c.total > 0 && c.pct < 50)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  const barColor = (pct) => (pct >= 60 ? "#16a34a" : pct >= 30 ? "#3b82f6" : "#f59e0b");

  const roleColor = ROLE_COLORS[jobCategory] || "#3b82f6";
  const roleLabel = ROLE_LABELS[jobCategory];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <View style={styles.topbar}>
          <View>
            <Text style={styles.greetingLine}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>{getDisplayName(email)}</Text>
            {roleLabel && (
              <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
                <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{email ? email[0].toUpperCase() : "?"}</Text>
          </View>
        </View>

        {/* ── Streak banner ── */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakFlame}>🔥</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>CURRENT STREAK</Text>
            <Text style={styles.streakCount}>{streak.count} {streak.count === 1 ? "day" : "days"}</Text>
          </View>
          <View style={styles.streakBest}>
            <Text style={styles.streakBestText}>Best: {streak.bestCount} {streak.bestCount === 1 ? "day" : "days"}</Text>
          </View>
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>SESSIONS</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[styles.statNum, stats.avgScore >= 70 && { color: "#16a34a" }]}>
              {stats.sessions > 0 ? stats.avgScore : "—"}
            </Text>
            <Text style={styles.statLabel}>AVG SCORE</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statNum}>{stats.studied}</Text>
            <Text style={styles.statLabel}>Q&As READ</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statNum}>{topicsStarted}</Text>
            <Text style={styles.statLabel}>TOPICS</Text>
          </View>
        </View>

        {/* ── Daily challenge ── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Daily challenge</Text>
        </View>
        <View style={styles.challengeWrap}>
          {challengeMarked ? (
            <View style={[styles.challengeCard, styles.challengeCardMarked]}>
              <Text style={styles.markedIcon}>{challengeMarked === "known" ? "✓" : "↩"}</Text>
              <Text style={[styles.markedText, { color: challengeMarked === "known" ? "#10b981" : "#f59e0b" }]}>
                {challengeMarked === "known" ? "Marked as known" : "Added to review list"}
              </Text>
              <Text style={styles.markedSub}>
                {challengeMarked === "known" ? "See you tomorrow" : "We'll resurface this tomorrow"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.challengeCard}
              onPress={() => setChallengeRevealed(true)}
              activeOpacity={0.88}
            >
              <View style={styles.challengeEyebrow}>
                <View style={[styles.challengeDot, { backgroundColor: roleColor }]} />
                <Text style={[styles.challengeEyebrowText, { color: roleColor }]}>
                  {challenge.topic.toUpperCase()} · TODAY'S QUESTION
                </Text>
              </View>
              <Text style={styles.challengeQ}>{challenge.question}</Text>
              {!challengeRevealed ? (
                <Text style={styles.challengeCue}>ⓘ  Tap to reveal answer</Text>
              ) : (
                <>
                  <View style={styles.challengeDivider} />
                  <Text style={styles.challengeAnswer}>{challenge.answer}</Text>
                  <View style={styles.challengeActions}>
                    <TouchableOpacity
                      style={[styles.challengeBtn, { backgroundColor: "rgba(16,185,129,0.15)" }]}
                      onPress={() => setChallengeMarked("known")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.challengeBtnText, { color: "#10b981" }]}>✓  I knew this</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.challengeBtn, { backgroundColor: "rgba(245,158,11,0.15)" }]}
                      onPress={() => setChallengeMarked("review")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.challengeBtnText, { color: "#f59e0b" }]}>↩  Review later</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Study progress ── */}
        {relevantCats.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Study progress</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Study")}>
                <Text style={styles.sectionLink}>Study Hub →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressWrap}>
              <Text style={styles.progressSummary}>
                <Text style={styles.progressSummaryBold}>{stats.studied}</Text>
                {" "}of {totalQs} questions studied
              </Text>
              {relevantCats.slice(0, 6).map((cat) => {
                const { total, studied, pct } = getCatProgress(cat);
                return (
                  <View key={cat.id} style={styles.catRow}>
                    <View style={styles.catHeader}>
                      <Text style={styles.catName}>{cat.title}</Text>
                      <Text style={styles.catFrac}>{studied}/{total}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor(pct) }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Focus areas ── */}
        {focusAreas.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Focus areas</Text>
            </View>
            <View style={styles.focusWrap}>
              <Text style={styles.focusSource}>Categories with the least study progress</Text>
              <View style={styles.chipRow}>
                {focusAreas.map((area) => (
                  <TouchableOpacity
                    key={area.name}
                    style={[styles.chip, { backgroundColor: area.color + "22" }]}
                    onPress={() => navigation.navigate("Study")}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: area.color }]}>{area.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Recent sessions ── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent sessions</Text>
          {recentSessions.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("History")}>
              <Text style={styles.sectionLink}>See all →</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sessionsWrap}>
          {recentSessions.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate("Practice")}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyText}>No interviews yet</Text>
              <Text style={styles.emptyLink}>Start your first interview →</Text>
            </TouchableOpacity>
          ) : (
            recentSessions.map((item) => {
              const typeMeta = TYPE_META[item.report?.interview_type || "mixed"] || TYPE_META.mixed;
              const score = item.overall_score;
              const scoreColor = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
              return (
                <View key={item.id} style={styles.sessionCard}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionRole} numberOfLines={1}>{item.role || "Interview"}</Text>
                    <View style={styles.sessionMeta}>
                      <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                        <Text style={[styles.typePillText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                      </View>
                      <Text style={styles.sessionDate}>{relativeDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.sessionScore, { color: scoreColor }]}>{score}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { paddingBottom: 16 },

  topbar: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  greetingLine: { fontSize: 12, color: "#999", marginBottom: 2 },
  greetingName: { fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.5 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, marginTop: 6,
  },
  roleDot: { width: 5, height: 5, borderRadius: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#111", alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: 16, fontWeight: "700", color: "#fff" },

  streakBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#efefef",
  },
  streakFlame: { fontSize: 26, lineHeight: 30 },
  streakInfo: { flex: 1 },
  streakLabel: { fontSize: 10, color: "#aaa", letterSpacing: 0.6, marginBottom: 2 },
  streakCount: { fontSize: 18, fontWeight: "700", color: "#f97316", letterSpacing: -0.3 },
  streakBest: { backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  streakBestText: { fontSize: 11, color: "#888" },

  statsGrid: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 24 },
  statItem: { flex: 1, alignItems: "flex-start" },
  statBorder: { borderLeftWidth: 1, borderLeftColor: "#e5e5e5", paddingLeft: 12 },
  statNum: {
    fontSize: 26, fontWeight: "700", color: "#111",
    letterSpacing: -0.5, lineHeight: 30, fontVariant: ["tabular-nums"],
  },
  statLabel: { fontSize: 9, color: "#aaa", letterSpacing: 0.5, marginTop: 2 },

  sectionHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#333" },
  sectionLink: { fontSize: 12, color: "#3b82f6" },

  challengeWrap: { paddingHorizontal: 20, marginBottom: 24 },
  challengeCard: { backgroundColor: "#0d1117", borderRadius: 16, padding: 20 },
  challengeCardMarked: { alignItems: "center", paddingVertical: 28 },
  challengeEyebrow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  challengeDot: { width: 6, height: 6, borderRadius: 3 },
  challengeEyebrowText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  challengeQ: {
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    fontSize: 17, lineHeight: 27, color: "#f0f4f8", marginBottom: 14,
  },
  challengeCue: { fontSize: 12, color: "rgba(240,244,248,0.4)" },
  challengeDivider: { height: 1, backgroundColor: "rgba(240,244,248,0.1)", marginBottom: 14 },
  challengeAnswer: { fontSize: 13.5, color: "rgba(240,244,248,0.75)", lineHeight: 22, marginBottom: 16 },
  challengeActions: { flexDirection: "row", gap: 8 },
  challengeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  challengeBtnText: { fontSize: 13, fontWeight: "600" },
  markedIcon: { fontSize: 30, marginBottom: 8 },
  markedText: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  markedSub: { fontSize: 12, color: "rgba(240,244,248,0.4)" },

  progressWrap: { paddingHorizontal: 20, marginBottom: 24 },
  progressSummary: { fontSize: 12, color: "#999", marginBottom: 14 },
  progressSummaryBold: { fontWeight: "700", color: "#333" },
  catRow: { marginBottom: 14 },
  catHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  catName: { fontSize: 13, fontWeight: "500", color: "#333" },
  catFrac: { fontSize: 11, color: "#aaa", fontVariant: ["tabular-nums"] },
  barTrack: { height: 4, backgroundColor: "#e5e5e5", borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },

  focusWrap: { paddingHorizontal: 20, marginBottom: 24 },
  focusSource: { fontSize: 11, color: "#bbb", marginBottom: 10 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: "600" },

  sessionsWrap: { paddingHorizontal: 20 },
  sessionCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#efefef",
    padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  sessionLeft: { flex: 1 },
  sessionRole: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 5 },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  typePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  typePillText: { fontSize: 10, fontWeight: "700" },
  sessionDate: { fontSize: 11, color: "#aaa" },
  sessionScore: {
    fontSize: 28, fontWeight: "700", letterSpacing: -1, fontVariant: ["tabular-nums"],
  },
  emptyCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#efefef",
    padding: 20, alignItems: "center", gap: 6,
  },
  emptyText: { fontSize: 14, color: "#aaa" },
  emptyLink: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },
});
