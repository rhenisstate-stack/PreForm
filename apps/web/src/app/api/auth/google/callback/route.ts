import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sanitizeReturnUrl } from "@/lib/validation/auth";

interface StoredOAuthState {
  state: string;
  nonce: string;
  codeVerifier: string;
  from?: string;
  sourcePage?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const rawStoredState = cookieStore.get("preform_oauth_state")?.value;

  // Clear OAuth state cookie immediately to prevent replay
  cookieStore.delete("preform_oauth_state");

  let storedState: StoredOAuthState | null = null;
  if (rawStoredState) {
    try {
      storedState = JSON.parse(rawStoredState);
    } catch {
      storedState = null;
    }
  }

  const fallbackSource = storedState?.sourcePage === "sign-up" ? "sign-up" : "sign-in";
  const defaultDestination = fallbackSource === "sign-up" ? "/courses" : "/dashboard";
  const targetDestination = sanitizeReturnUrl(storedState?.from, defaultDestination);

  // Check for cancellation or provider errors
  if (error) {
    const errorRedirect = new URL(`/${fallbackSource}`, url.origin);
    errorRedirect.searchParams.set(
      "error",
      error === "access_denied" ? "google_cancelled" : "google_error"
    );
    return NextResponse.redirect(errorRedirect);
  }

  // Validate state to protect against CSRF attacks
  if (!code || !state || !storedState || state !== storedState.state) {
    const csrfRedirect = new URL(`/${fallbackSource}`, url.origin);
    csrfRedirect.searchParams.set("error", "state_mismatch");
    return NextResponse.redirect(csrfRedirect);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const configRedirect = new URL(`/${fallbackSource}`, url.origin);
    configRedirect.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(configRedirect);
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: storedState.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errRedirect = new URL(`/${fallbackSource}`, url.origin);
      errRedirect.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(errRedirect);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      const errRedirect = new URL(`/${fallbackSource}`, url.origin);
      errRedirect.searchParams.set("error", "missing_token");
      return NextResponse.redirect(errRedirect);
    }

    // Retrieve verified identity from Google UserInfo endpoint
    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errRedirect = new URL(`/${fallbackSource}`, url.origin);
      errRedirect.searchParams.set("error", "userinfo_failed");
      return NextResponse.redirect(errRedirect);
    }

    const profile = await userInfoResponse.json();

    // Verify email was verified by Google
    if (!profile.email_verified) {
      const unverifiedRedirect = new URL(`/${fallbackSource}`, url.origin);
      unverifiedRedirect.searchParams.set("error", "unverified_email");
      return NextResponse.redirect(unverifiedRedirect);
    }

    // Create session payload and establish secure session cookie
    const sessionPayload = {
      sub: profile.sub,
      email: profile.email,
      name: profile.name || profile.given_name || "Nursing Candidate",
      picture: profile.picture,
      provider: "google",
      createdAt: new Date().toISOString(),
    };

    cookieStore.set("preform_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days session
    });

    // Successfully authenticated, navigate to destination
    return NextResponse.redirect(new URL(targetDestination, url.origin));
  } catch (err) {
    console.error("Google authentication callback exception:", err);
    const failureRedirect = new URL(`/${fallbackSource}`, url.origin);
    failureRedirect.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(failureRedirect);
  }
}
