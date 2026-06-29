// src/lib/deepgram.js
// Sends recorded audio to Deepgram and returns the transcript text

import * as FileSystem from "expo-file-system/legacy";

const DEEPGRAM_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_KEY;

export async function transcribeAudio(fileUri) {
  try {
    const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
      encoding: "base64",
    });

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_KEY}`,
          "Content-Type": "audio/m4a",
        },
        body: bytes.buffer,
      }
    );

    if (!response.ok) throw new Error(`Deepgram error: ${response.status}`);

    const data = await response.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return transcript.trim();
  } catch (err) {
    console.error("Deepgram transcription failed:", err);
    return "";
  }
}
