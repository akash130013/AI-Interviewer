import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

// Hardcoded deep link — must match Supabase allowed redirect URLs
const REDIRECT_URL = "interviewboat://auth/callback";

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No OAuth URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);

  if (result.type === "success" && result.url) {
    const url = result.url;

    if (url.includes("code=")) {
      // PKCE flow — exchange the code for a session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url);
      if (sessionError) throw sessionError;
    } else if (url.includes("access_token=")) {
      // Implicit flow fallback — extract tokens from the URL hash
      const hash = url.split("#")[1] || "";
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) throw new Error("Missing tokens in redirect URL");
      const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sessionError) throw sessionError;
    } else {
      throw new Error("Unrecognized OAuth callback format");
    }

    return true;
  }

  return false;
}
