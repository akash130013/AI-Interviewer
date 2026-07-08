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

// ── Daily challenge pool ────────────────────────────────────────────────────

const CHALLENGE_POOL = [
  {
    topic: "JavaScript",
    question: "What is the difference between var, let, and const? When would you use each?",
    answer: "var is function-scoped, hoisted, and can be redeclared — avoid it in modern code.\n\nlet is block-scoped and can be reassigned. Use it for values that will change (loop counters, conditional assignments).\n\nconst is block-scoped and cannot be reassigned after declaration. This should be your default — use it unless you know the binding needs to change. Note: const objects/arrays can still have their contents mutated.",
  },
  {
    topic: "JavaScript",
    question: "What is a closure in JavaScript? Give a real-world example.",
    answer: "A closure is a function that retains access to its outer scope even after the outer function has returned.\n\nReal-world example: a counter factory — a function returns another function that increments a private `count` variable. Each call to the factory creates a new, independent counter.\n\nClosures are the foundation of module patterns, memoization, and React hooks like useState.",
  },
  {
    topic: "JavaScript",
    question: "Explain the JavaScript event loop. How does async/await fit in?",
    answer: "JavaScript is single-threaded. The event loop continuously checks the call stack and task queues. Async operations (setTimeout, fetch) are offloaded to browser APIs; their callbacks go into the task queue once resolved.\n\nasync/await is syntactic sugar over Promises. An await pauses the current async function and returns control to the event loop, allowing other code to run. When the awaited Promise resolves, execution resumes from where it paused.",
  },
  {
    topic: "JavaScript",
    question: "What is event delegation and why is it useful?",
    answer: "Event delegation means attaching a single event listener to a parent element instead of individual listeners on each child. Events bubble up the DOM, so the parent can intercept them and check which child triggered the event via event.target.\n\nBenefits: fewer listeners means better memory performance, and new child elements automatically work without re-attaching listeners. Especially useful for dynamic lists.",
  },
  {
    topic: "JavaScript",
    question: "What is the difference between == and ===?",
    answer: "=== (strict equality) checks both value AND type — no coercion. 1 === '1' is false.\n\n== (loose equality) does type coercion before comparing. 1 == '1' is true because '1' is coerced to 1. This leads to subtle bugs.\n\nAlways prefer === unless you deliberately need coercion (rare). The rule: if you can't explain why == gives the right answer, use ===.",
  },
  {
    topic: "React",
    question: "What is the virtual DOM and why does React use it?",
    answer: "The virtual DOM is a lightweight in-memory representation of the real DOM. When state changes, React re-renders the virtual DOM tree and diffs it against the previous version (reconciliation). Only the actual changes are applied to the real DOM.\n\nReal DOM operations are expensive. By batching and minimizing them, React improves rendering performance, especially for frequently-updating UIs.",
  },
  {
    topic: "React",
    question: "What is the difference between state and props in React?",
    answer: "Props are inputs passed from a parent to a child component — they are read-only from the child's perspective. Props make components reusable and configurable.\n\nState is data managed inside a component that can change over time. When state changes, React re-renders the component. State is private to the component unless lifted up or shared via context.\n\nSimple rule: if a value is needed by a parent or sibling, it should live in state higher up and flow down as props.",
  },
  {
    topic: "React",
    question: "When would you use useCallback vs useMemo?",
    answer: "useMemo memoizes a computed value — use it when a calculation is expensive and shouldn't re-run on every render.\n\nuseCallback memoizes a function reference — use it when passing callbacks to child components wrapped in React.memo, so the child doesn't re-render just because the parent re-rendered.\n\nBoth take a dependency array. Only apply these when you can measure a real performance problem — premature memoization adds complexity with no benefit.",
  },
  {
    topic: "React",
    question: "What are React keys and why are they important?",
    answer: "Keys help React identify which items in a list have changed, been added, or removed. When React diffs lists, it uses keys to match old and new elements.\n\nWithout stable keys, React falls back to index-based matching, which causes incorrect state updates and poor performance when items are reordered or removed.\n\nKeys should be stable, unique, and ideally from your data (database IDs). Avoid using array index as a key for lists that can change order.",
  },
  {
    topic: "React",
    question: "What is prop drilling and how do you solve it?",
    answer: "Prop drilling is when you pass data through many intermediate components that don't need it, just to reach a deeply nested child that does.\n\nSolutions:\n1. React Context — built-in way to share data globally without passing props manually at each level\n2. State management libraries (Zustand, Redux) for complex global state\n3. Component composition — restructure components so the consuming child is closer to where the data lives\n\nContext is the idiomatic React solution for theming, auth state, and locale.",
  },
  {
    topic: "Behavioral",
    question: "Tell me about a time you failed at work and what you learned from it.",
    answer: "Use the STAR format: Situation (set the context), Task (what you needed to do), Action (what you specifically did), Result (outcome + what you learned).\n\nKey points: be honest about the failure, take ownership, focus most of your answer on what you learned and how you applied that learning later. Avoid blaming others. Choose a real failure with a meaningful lesson — interviewers see through stories where you 'failed' but everything turned out great.",
  },
  {
    topic: "Behavioral",
    question: "Describe a time you had to work with a difficult teammate. How did you handle it?",
    answer: "Use STAR. Show that you: (1) tried to understand their perspective first, (2) addressed the issue directly and professionally rather than going around them, (3) focused on the outcome for the team, not the personality conflict.\n\nAvoid: badmouthing the person, implying you were entirely right and they were wrong, or describing a situation you didn't resolve.\n\nGood signal to send: you can work with different personality types and you default to direct, respectful communication.",
  },
  {
    topic: "Behavioral",
    question: "How do you handle multiple deadlines competing for your attention?",
    answer: "Use STAR with a real example. Demonstrate:\n1. You assess urgency vs. importance (Eisenhower matrix)\n2. You communicate with stakeholders early when you see a conflict — no surprises\n3. You break large tasks into milestones to track progress across priorities\n4. You ask for help or negotiate scope when truly blocked\n\nAvoid describing yourself as someone who just 'works harder.' Interviewers want to see prioritization frameworks and proactive communication.",
  },
  {
    topic: "Behavioral",
    question: "Describe a situation where you had to learn a new technology quickly to deliver a project.",
    answer: "Use STAR. Key elements to include: what the technology was, the timeline you had, HOW you learned (documentation, tutorials, colleagues, building a prototype), and what you delivered.\n\nShowcase: learning strategy, ability to identify what's essential vs. what's nice-to-know, and willingness to ask for help. Interviewers want to know you can ramp up quickly on any stack — show the approach, not just the outcome.",
  },
  {
    topic: "Behavioral",
    question: "Tell me about your greatest professional achievement.",
    answer: "Use STAR. Choose something with measurable impact (business metric, time saved, system improved). Structure: what was the challenge, what was your specific contribution (not the team's), and what was the result.\n\nTips: quantify the impact ('reduced load time by 40%', 'shipped to 50k users'). If you're early in your career, a project you built solo or a tough academic challenge works. Make sure you can speak to it in depth — follow-up questions will come.",
  },
  {
    topic: "System Design",
    question: "How would you design a URL shortener like bit.ly?",
    answer: "Key components:\n1. API: POST /shorten returns short code; GET /:code redirects to original URL\n2. Database: store { short_code, original_url, created_at, user_id }. Index on short_code\n3. Code generation: take MD5/SHA of URL, encode as base62, take first 7 chars. Or use a counter + base62 encoding\n4. Redirect: 301 (permanent, cached by browser) vs 302 (always hits server — better for analytics)\n5. Scale: cache popular URLs in Redis, CDN for global reads, separate read/write DBs at scale",
  },
  {
    topic: "System Design",
    question: "What is the difference between horizontal and vertical scaling?",
    answer: "Vertical scaling (scale up): add more resources (CPU, RAM) to the same server. Simple but has a ceiling — there's a maximum size for a single machine. Also a single point of failure.\n\nHorizontal scaling (scale out): add more servers and distribute load between them. More complex (needs a load balancer, shared state management, distributed systems concerns) but near-unlimited scale and better fault tolerance.\n\nIn practice: start with vertical scaling (simplest), add horizontal scaling when you hit limits or need high availability.",
  },
  {
    topic: "System Design",
    question: "What is a CDN and when would you use one?",
    answer: "A Content Delivery Network is a geographically distributed network of servers that caches and serves static assets (images, JS, CSS, video) from locations close to the user.\n\nWhen to use: any app with global users where latency matters, or where static asset delivery is a bottleneck. Also reduces load on your origin server.\n\nExamples: Cloudflare, AWS CloudFront, Fastly. For dynamic content, some CDNs also support edge computing (running serverless functions close to the user).",
  },
  {
    topic: "System Design",
    question: "Explain CAP theorem. Can you give an example of a system that prioritizes CP vs AP?",
    answer: "CAP theorem states that in a distributed system, during a network partition, you can guarantee at most two of: Consistency, Availability, Partition Tolerance. Since partitions happen in real networks, you must choose between C and A during a partition.\n\nCP systems (consistency + partition tolerance): reject or delay responses when a partition might cause stale reads. Example: HBase, ZooKeeper. Good for financial transactions.\n\nAP systems (available + partition tolerance): always respond, possibly with stale data. Example: DynamoDB, Cassandra. Good for social feeds, carts where eventual consistency is acceptable.",
  },
  {
    topic: "Python",
    question: "What is the difference between a list and a tuple in Python?",
    answer: "Lists are mutable — you can add, remove, or change elements after creation. Syntax: [1, 2, 3].\n\nTuples are immutable — once created, they cannot be changed. Syntax: (1, 2, 3).\n\nUse tuples for data that should not change (coordinates, RGB values, function return values for multiple items). Tuples are slightly faster and can be used as dictionary keys (because they're hashable). Use lists when you need a dynamic collection.",
  },
  {
    topic: "Python",
    question: "What are Python decorators? Write a simple example.",
    answer: "A decorator is a function that wraps another function to add behavior before/after without modifying the original function's code.\n\nExample:\n```python\ndef log_call(func):\n    def wrapper(*args, **kwargs):\n        print(f'Calling {func.__name__}')\n        return func(*args, **kwargs)\n    return wrapper\n\n@log_call\ndef greet(name):\n    print(f'Hello, {name}')\n```\n\nDecorators are used for logging, timing, authentication checks (@login_required in Django), rate limiting, and caching. @staticmethod and @classmethod are built-in Python decorators.",
  },
  {
    topic: "SQL",
    question: "What is the difference between INNER JOIN and LEFT JOIN?",
    answer: "INNER JOIN returns only rows where there's a match in BOTH tables. Unmatched rows from either table are excluded.\n\nLEFT JOIN returns all rows from the left table, plus matching rows from the right table. Where there's no match, right-table columns appear as NULL.\n\nExample: users LEFT JOIN orders returns every user, including those with no orders. INNER JOIN on the same tables would omit users who've never ordered.\n\nRight/Full Outer Join exist but are less common. LEFT JOIN is by far the most used outer join type.",
  },
  {
    topic: "SQL",
    question: "What are database indexes and when should you use them?",
    answer: "An index is a separate data structure (usually a B-tree) the database maintains to find rows faster without scanning the entire table.\n\nUse indexes on:\n- Columns in WHERE clauses that filter large tables\n- Foreign keys (for JOIN performance)\n- Columns in ORDER BY / GROUP BY\n\nTradeoffs: indexes speed up reads but slow down writes (every INSERT/UPDATE must update the index) and use disk space. Don't index every column — only columns that appear in frequent, slow queries. Use EXPLAIN to verify a query uses the index.",
  },
  {
    topic: "General CS",
    question: "What is the difference between REST and GraphQL?",
    answer: "REST is a convention for APIs where each resource has its own URL endpoint (GET /users, GET /users/:id/posts). Simple and cacheable, but can suffer from over-fetching (getting too much data) or under-fetching (needing multiple requests to compose a view).\n\nGraphQL exposes a single endpoint where clients specify exactly what data they need in a query. No over/under-fetching. More flexible for complex or rapidly-changing UIs.\n\nChoose REST for simple, stable APIs with good HTTP caching. Choose GraphQL when clients have varying data needs or when reducing round trips matters (mobile apps).",
  },
  {
    topic: "General CS",
    question: "Explain Big O notation. What is the difference between O(n) and O(log n)?",
    answer: "Big O notation describes how an algorithm's time or space grows as input size (n) grows, in the worst case.\n\nO(n) — linear: time grows proportionally with input. Example: a single loop through an array. Doubling the input doubles the time.\n\nO(log n) — logarithmic: time grows very slowly. Example: binary search halves the search space each step. For n=1,000,000, only ~20 steps needed. This happens when you repeatedly cut the problem in half.\n\nO(1) constant → O(log n) → O(n) → O(n log n) → O(n²) → O(2ⁿ) from fastest to slowest.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDailyChallenge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return CHALLENGE_POOL[dayOfYear % CHALLENGE_POOL.length];
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
  const [streak, setStreak] = useState({ count: 0, bestCount: 0 });
  const [stats, setStats] = useState({ sessions: 0, avgScore: 0, studied: 0 });
  const [categories, setCategories] = useState([]);
  const [progress, setProgress] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [challengeRevealed, setChallengeRevealed] = useState(false);
  const [challengeMarked, setChallengeMarked] = useState(null); // null | 'known' | 'review'

  const challenge = useMemo(() => getDailyChallenge(), []);

  // Categories: load once (hits Supabase)
  useEffect(() => {
    getStudyCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  // Stats, streak, progress: reload every time tab is focused
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
        const interviews = await getPastInterviews(session.user.id);
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
    const total = (cat.study_topics || []).reduce(
      (s, t) => s + (t.study_questions || []).length,
      0
    );
    const studied = (cat.study_topics || []).reduce(
      (s, t) => s + (progress[t.id] || []).length,
      0
    );
    return { total, studied, pct: total > 0 ? Math.round((studied / total) * 100) : 0 };
  }

  const totalQs = categories.reduce((s, c) => s + getCatProgress(c).total, 0);
  const topicsStarted = categories.filter((c) => getCatProgress(c).studied > 0).length;

  const focusAreas = categories
    .map((c) => ({ name: c.title, color: c.color, ...getCatProgress(c) }))
    .filter((c) => c.total > 0 && c.pct < 50)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  const barColor = (pct) => (pct >= 60 ? "#16a34a" : pct >= 30 ? "#3b82f6" : "#f59e0b");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Top bar ── */}
        <View style={styles.topbar}>
          <View>
            <Text style={styles.greetingLine}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>{getDisplayName(email)}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {email ? email[0].toUpperCase() : "?"}
            </Text>
          </View>
        </View>

        {/* ── Streak banner ── */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakFlame}>🔥</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>CURRENT STREAK</Text>
            <Text style={styles.streakCount}>
              {streak.count} {streak.count === 1 ? "day" : "days"}
            </Text>
          </View>
          <View style={styles.streakBest}>
            <Text style={styles.streakBestText}>
              Best: {streak.bestCount} {streak.bestCount === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>SESSIONS</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={[
              styles.statNum,
              stats.avgScore >= 70 && { color: "#16a34a" },
            ]}>
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
              <Text style={styles.markedIcon}>
                {challengeMarked === "known" ? "✓" : "↩"}
              </Text>
              <Text style={[
                styles.markedText,
                { color: challengeMarked === "known" ? "#10b981" : "#f59e0b" },
              ]}>
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
                <View style={styles.challengeDot} />
                <Text style={styles.challengeEyebrowText}>
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
                      <Text style={[styles.challengeBtnText, { color: "#10b981" }]}>
                        ✓  I knew this
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.challengeBtn, { backgroundColor: "rgba(245,158,11,0.15)" }]}
                      onPress={() => setChallengeMarked("review")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.challengeBtnText, { color: "#f59e0b" }]}>
                        ↩  Review later
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Study progress ── */}
        {categories.length > 0 && (
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
              {categories.slice(0, 6).map((cat) => {
                const { total, studied, pct } = getCatProgress(cat);
                return (
                  <View key={cat.id} style={styles.catRow}>
                    <View style={styles.catHeader}>
                      <Text style={styles.catName}>{cat.title}</Text>
                      <Text style={styles.catFrac}>{studied}/{total}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%`, backgroundColor: barColor(pct) },
                        ]}
                      />
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
              const typeMeta =
                TYPE_META[item.report?.interview_type || "mixed"] || TYPE_META.mixed;
              const score = item.overall_score;
              const scoreColor =
                score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
              return (
                <View key={item.id} style={styles.sessionCard}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionRole} numberOfLines={1}>
                      {item.role || "Interview"}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                        <Text style={[styles.typePillText, { color: typeMeta.color }]}>
                          {typeMeta.label}
                        </Text>
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

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { paddingBottom: 16 },

  // Top bar
  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  greetingLine: { fontSize: 12, color: "#999", marginBottom: 2 },
  greetingName: { fontSize: 22, fontWeight: "700", color: "#111", letterSpacing: -0.5 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#111", alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Streak
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
  streakBest: {
    backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  streakBestText: { fontSize: 11, color: "#888" },

  // Stats
  statsGrid: {
    flexDirection: "row", paddingHorizontal: 20, paddingBottom: 24,
  },
  statItem: { flex: 1, alignItems: "flex-start" },
  statBorder: { borderLeftWidth: 1, borderLeftColor: "#e5e5e5", paddingLeft: 12 },
  statNum: {
    fontSize: 26, fontWeight: "700", color: "#111",
    letterSpacing: -0.5, lineHeight: 30,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 9, color: "#aaa", letterSpacing: 0.5, marginTop: 2,
  },

  // Section header
  sectionHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#333" },
  sectionLink: { fontSize: 12, color: "#3b82f6" },

  // Challenge
  challengeWrap: { paddingHorizontal: 20, marginBottom: 24 },
  challengeCard: {
    backgroundColor: "#0d1117", borderRadius: 16, padding: 20,
  },
  challengeCardMarked: { alignItems: "center", paddingVertical: 28 },
  challengeEyebrow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12,
  },
  challengeDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: "#3b82f6",
  },
  challengeEyebrowText: {
    fontSize: 10, color: "#3b82f6", fontWeight: "700", letterSpacing: 0.8,
  },
  challengeQ: {
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    fontSize: 17, lineHeight: 27, color: "#f0f4f8", marginBottom: 14,
  },
  challengeCue: {
    fontSize: 12, color: "rgba(240,244,248,0.4)",
  },
  challengeDivider: {
    height: 1, backgroundColor: "rgba(240,244,248,0.1)", marginBottom: 14,
  },
  challengeAnswer: {
    fontSize: 13.5, color: "rgba(240,244,248,0.75)", lineHeight: 22, marginBottom: 16,
  },
  challengeActions: { flexDirection: "row", gap: 8 },
  challengeBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center",
  },
  challengeBtnText: { fontSize: 13, fontWeight: "600" },
  markedIcon: { fontSize: 30, marginBottom: 8 },
  markedText: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  markedSub: { fontSize: 12, color: "rgba(240,244,248,0.4)" },

  // Study progress
  progressWrap: {
    paddingHorizontal: 20, marginBottom: 24,
  },
  progressSummary: { fontSize: 12, color: "#999", marginBottom: 14 },
  progressSummaryBold: { fontWeight: "700", color: "#333" },
  catRow: { marginBottom: 14 },
  catHeader: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 6,
  },
  catName: { fontSize: 13, fontWeight: "500", color: "#333" },
  catFrac: { fontSize: 11, color: "#aaa", fontVariant: ["tabular-nums"] },
  barTrack: {
    height: 4, backgroundColor: "#e5e5e5", borderRadius: 2, overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },

  // Focus areas
  focusWrap: { paddingHorizontal: 20, marginBottom: 24 },
  focusSource: { fontSize: 11, color: "#bbb", marginBottom: 10 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: "600" },

  // Sessions
  sessionsWrap: { paddingHorizontal: 20 },
  sessionCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#efefef",
    padding: 14, flexDirection: "row",
    alignItems: "center", marginBottom: 10,
  },
  sessionLeft: { flex: 1 },
  sessionRole: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 5 },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  typePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  typePillText: { fontSize: 10, fontWeight: "700" },
  sessionDate: { fontSize: 11, color: "#aaa" },
  sessionScore: {
    fontSize: 28, fontWeight: "700", letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  emptyCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#efefef",
    padding: 20, alignItems: "center", gap: 6,
  },
  emptyText: { fontSize: 14, color: "#aaa" },
  emptyLink: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },
});
