import * as FileSystem from "expo-file-system/legacy";

const DEEPGRAM_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_KEY;
const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true";

export async function transcribeAudio(fileUri) {
  try {
    // Guard: reject empty/missing files before hitting Deepgram
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || (info.size ?? 0) < 1000) {
      console.warn("Audio file too small to transcribe:", info.size);
      return "";
    }

    // uploadAsync sends the raw file bytes — avoids the base64→ArrayBuffer
    // conversion that causes 408 (empty body) errors in React Native fetch.
    const result = await FileSystem.uploadAsync(DEEPGRAM_URL, fileUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Token ${DEEPGRAM_KEY}`,
        "Content-Type": "audio/m4a",
      },
    });

    if (result.status !== 200) {
      throw new Error(`Deepgram error: ${result.status} — ${result.body}`);
    }

    const data = JSON.parse(result.body);
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return transcript.trim();
  } catch (err) {
    console.error("Deepgram transcription failed:", err);
    return "";
  }
}
