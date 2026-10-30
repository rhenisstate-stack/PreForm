import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { sanitizeReturnUrl } from "@/lib/validation/auth";

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sha256(plain: string): Buffer {
  return crypto.createHash("sha256").update(plain).digest();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourcePage = url.searchParams.get("source") === "sign-up" ? "sign-up" : "sign-in";
  const defaultDestination = sourcePage === "sign-up" ? "/courses" : "/dashboard";
  const rawFrom = url.searchParams.get("from") || url.searchParams.get("returnUrl");
  const from = sanitizeReturnUrl(rawFrom, defaultDestination);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Check if Google OAuth credentials are configured
  if (!clientId || !clientSecret) {
    const redirectUrl = new URL(`/${sourcePage}`, url.origin);
    redirectUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  // Generate PKCE code verifier and code challenge
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(sha256(codeVerifier));

  // Generate cryptographic state and nonce
  const state = crypto.randomBytes(24).toString("hex");
  const nonce = crypto.randomBytes(24).toString("hex");

  // Determine redirect URI (must match Google Cloud Console authorized redirect URIs)
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // Build Google OAuth authorization URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("nonce", nonce);
  googleAuthUrl.searchParams.set("code_challenge", codeChallenge);
  googleAuthUrl.searchParams.set("code_challenge_method", "S256");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  // Save session state in secure, HTTP-only cookie for callback verification
  const sessionData = JSON.stringify({
    state,
    nonce,
    codeVerifier,
    from,
    sourcePage,
  });

  const cookieStore = await cookies();
  const oauthCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes expiry
  };
  cookieStore.set("prepford_oauth_state", sessionData, oauthCookieOptions);
  cookieStore.set("preform_oauth_state", sessionData, oauthCookieOptions);

  return NextResponse.redirect(googleAuthUrl);
}
