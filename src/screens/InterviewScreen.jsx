import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { useVoice } from "../hooks/useVoice";
import { sendMessage, extractReport } from "../lib/openai";
import { supabase, saveInterview } from "../lib/supabase";
import { recordInterviewToday } from "../lib/streak";
import { notifyInterviewComplete, scheduleDailyNotifications } from "../lib/notifications";

export default function InterviewScreen({ route, navigation }) {
  const { candidateContext } = route.params;
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("thinking");
  const [micError, setMicError] = useState(null);
  const [aiError, setAiError] = useState(null);
  const flatListRef = useRef(null);
  const lastMsgsRef = useRef([]);
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoice();

  useEffect(() => {
    callAI([]);
  }, []);

  async function callAI(msgs) {
    lastMsgsRef.current = msgs;
    setAiError(null);
    setStatus("thinking");
    try {
      const reply = await sendMessage(msgs, candidateContext);

      // Check for report BEFORE speaking or adding to messages
      const report = extractReport(reply);
      if (report) {
        Speech.stop();
        await handleReportReceived(report);
        return;
      }

      const updated = [...msgs, { role: "assistant", content: reply }];
      setMessages(updated);

      setStatus("speaking");
      Speech.speak(reply, {
        language: "en-US",
        rate: 0.92,
        pitch: 1.0,
        onDone: () => setStatus("idle"),
        onError: () => setStatus("idle"),
      });
    } catch (err) {
      console.error("AI call failed:", err);
      setAiError(
        err?.status === 429
          ? "You've hit the practice limit for now — please try again in a bit."
          : "Connection problem — check your internet, then tap Retry."
      );
      setStatus("idle");
    }
  }

  async function handleReportReceived(report) {
    let streakCount = 0;
    try {
      streakCount = await recordInterviewToday();
      // Reschedule notifications with updated streak + fire completion alert
      await Promise.all([
        scheduleDailyNotifications(streakCount),
        notifyInterviewComplete(report.overall_score ?? 0),
      ]);
    } catch (_) {}

    let saved = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        saved = await saveInterview(session.user.id, candidateContext, report);
      }
    } catch (_) {
      saved = false;
    }

    navigation.navigate("Report", { report, streakCount, saved });
  }

  async function handleMicPress() {
    if (isRecording) {
      const transcript = await stopRecording();
      if (!transcript) {
        setMicError("Couldn't hear that — please tap the mic and try again.");
        setTimeout(() => setMicError(null), 3500);
        setStatus("idle");
        return;
      }
      setMicError(null);
      const updated = [...messages, { role: "user", content: transcript }];
      setMessages(updated);
      await callAI(updated);
    } else {
      Speech.stop();
      setMicError(null);
      await startRecording();
      setStatus("listening");
    }
  }

  async function handleEndInterview() {
    Speech.stop();

    // If the last AI message already has a report, use it directly
    const lastAiMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAiMsg) {
      const existingReport = extractReport(lastAiMsg.content);
      if (existingReport) {
        await handleReportReceived(existingReport);
        return;
      }
    }

    const endMsgs = [...messages, { role: "user", content: "end interview" }];
    await callAI(endMsgs);
  }

  function getStatusLabel() {
    if (status === "thinking" || isTranscribing) return "Alex is thinking...";
    if (status === "speaking") return "Alex is speaking — tap mic to interrupt";
    if (isRecording || status === "listening") return "Listening... tap to stop";
    return "Tap the mic to answer";
  }

  const micBusy = status === "thinking" || isTranscribing;
  const micColor = isRecording ? "#ef4444" : micBusy ? "#d1d5db" : "#111";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interview with Alex</Text>
        <Text style={styles.headerSub}>
          {candidateContext.role}
          {candidateContext.company ? ` · ${candidateContext.company}` : ""}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, item.role === "user" ? styles.userText : styles.aiText]}>
              {item.content}
            </Text>
          </View>
        )}
      />

      <View style={styles.controls}>
        {aiError ? (
          <View style={styles.aiErrorWrap}>
            <Text style={styles.micErrorText}>{aiError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => callAI(lastMsgsRef.current)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : micError ? (
          <Text style={styles.micErrorText}>{micError}</Text>
        ) : (
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        )}

        <TouchableOpacity
          style={[styles.micButton, { backgroundColor: micColor }]}
          onPress={handleMicPress}
          disabled={micBusy}
          activeOpacity={0.8}
        >
          {isTranscribing ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.micIcon}>{isRecording ? "⏹" : "🎙"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtn} onPress={handleEndInterview} disabled={micBusy}>
          <Text style={styles.endBtnText}>End interview & get report</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111" },
  headerSub: { fontSize: 13, color: "#888", marginTop: 2 },
  chatList: { padding: 16, paddingBottom: 8, gap: 10 },
  bubble: { maxWidth: "84%", borderRadius: 18, padding: 14 },
  aiBubble: { backgroundColor: "#f5f5f5", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: "#111", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  aiText: { color: "#111" },
  userText: { color: "#fff" },
  controls: {
    alignItems: "center", paddingVertical: 20, paddingHorizontal: 20,
    gap: 14, borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  statusText: { fontSize: 13, color: "#888" },
  micErrorText: { fontSize: 13, color: "#dc2626", textAlign: "center" },
  aiErrorWrap: { alignItems: "center", gap: 8 },
  retryBtn: {
    backgroundColor: "#111", borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  micButton: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center",
  },
  micIcon: { fontSize: 30 },
  endBtn: { paddingVertical: 8 },
  endBtnText: { fontSize: 13, color: "#aaa", textDecorationLine: "underline" },
});
