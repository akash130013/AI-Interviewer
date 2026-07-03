import { useState, useRef } from "react";
import { Audio } from "expo-av";
import { transcribeAudio } from "../lib/deepgram";

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef(null);

  async function startRecording() {
    try {
      // Unload any stale recording left from a previous session
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
        recordingRef.current = null;
      }

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert("Microphone permission is required for voice interviews.");
        return;
      }

      // Reset audio session first (prevents "Only one Recording" error when
      // TTS playback was active just before this recording attempt)
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return null;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Return audio mode to playback so expo-speech works normally
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const transcript = await transcribeAudio(uri);
      return transcript;
    } catch (err) {
      console.error("Failed to stop/transcribe:", err);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
