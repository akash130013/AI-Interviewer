import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

// Transcription now goes through our backend proxy (/api/transcribe) so the
// Deepgram API key never ships inside the app bundle.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function transcribeAudio(fileUri) {
  try {
    // Guard: reject empty/missing files before uploading
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || (info.size ?? 0) < 1000) {
      console.warn("Audio file too small to transcribe:", info.size);
      return "";
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("No session — cannot transcribe");
      return "";
    }

    // uploadAsync sends the raw file bytes — avoids the base64→ArrayBuffer
    // conversion that causes 408 (empty body) errors in React Native fetch.
    const result = await FileSystem.uploadAsync(`${API_URL}/api/transcribe`, fileUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/octet-stream",
      },
    });

    if (result.status !== 200) {
      throw new Error(`Transcribe error: ${result.status} — ${result.body}`);
    }

    const data = JSON.parse(result.body);
    return (data?.transcript ?? "").trim();
  } catch (err) {
    console.error("Transcription failed:", err);
    return "";
  }
}
