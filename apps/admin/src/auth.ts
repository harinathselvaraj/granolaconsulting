const TOKEN_KEY = "hg_admin_id_token";
const PKCE_STORAGE_KEY = "hg_admin_pkce_verifier";

import type { AdminUserDetail, ListUsersResponse } from "./types.js";

function apiBase(): string {
  const base = import.meta.env.VITE_ADMIN_API_BASE as string | undefined;
  if (!base) {
    throw new Error("VITE_ADMIN_API_BASE is not configured");
  }
  return base.replace(/\/$/, "");
}

function readPkceVerifier(): string {
  try {
    return sessionStorage.getItem(PKCE_STORAGE_KEY) || localStorage.getItem(PKCE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storePkceVerifier(verifier: string): void {
  try {
    sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
    localStorage.setItem(PKCE_STORAGE_KEY, verifier);
  } catch {
    throw new Error("Your browser blocked sign-in storage. Allow cookies/storage for this site.");
  }
}

function clearPkceVerifier(): void {
  try {
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
    localStorage.removeItem(PKCE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function stripOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.search && !url.hash) {
    return;
  }
  url.search = "";
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname || "/");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Drop tokens that are expired or malformed so we don't get stuck in a broken "signed in" state. */
export function isIdTokenUsable(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const exp = payload.exp;
  if (typeof exp !== "number") return true;
  return exp * 1000 > Date.now() + 60_000;
}

export function getIdToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (!isIdTokenUsable(token)) {
    clearIdToken();
    return null;
  }
  return token;
}

export function setIdToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getSignedInEmail(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || !isIdTokenUsable(token)) return null;
  const payload = decodeJwtPayload(token);
  const email = payload?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export function clearIdToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Wipe all local sign-in state (fixes stuck normal-window sessions). */
export function clearAuthState(): void {
  clearIdToken();
  clearPkceVerifier();
  stripOAuthParamsFromUrl();
}

/** Redirect plain-HTTP or legacy S3 website hostnames to canonical HTTPS admin URL. */
export function redirectInsecureOriginToHttps(): boolean {
  if (window.location.protocol !== "http:") {
    return false;
  }
  const host = window.location.hostname;
  if (!host.includes("s3-website") && host !== "admin.granolaconsulting.com") {
    return false;
  }
  window.location.replace(redirectUri());
  return true;
}

export function cognitoDomain(): string {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
  if (!domain) throw new Error("VITE_COGNITO_DOMAIN is not configured");
  return domain.replace(/\/$/, "");
}

export function cognitoClientId(): string {
  const id = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
  if (!id) throw new Error("VITE_COGNITO_CLIENT_ID is not configured");
  return id;
}

export function cognitoRegion(): string {
  const configured = import.meta.env.VITE_COGNITO_REGION as string | undefined;
  if (configured?.trim()) return configured.trim();
  const m = /\.auth\.([^.]+)\.amazoncognito\.com/.exec(cognitoDomain());
  if (m) return m[1]!;
  return "eu-west-1";
}

/** Sign in with a native Cognito user (email + password). */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  stripOAuthParamsFromUrl();
  const username = email.trim();
  if (!username || !password) {
    throw new Error("Email and password are required.");
  }

  const res = await fetch(`https://cognito-idp.${cognitoRegion()}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: cognitoClientId(),
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  });

  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    const msg =
      (typeof body.message === "string" && body.message) ||
      (typeof body.__type === "string" && body.__type) ||
      "Sign-in failed";
    throw new Error(msg);
  }

  const authResult = body.AuthenticationResult as { IdToken?: string } | undefined;
  const challenge = body.ChallengeName as string | undefined;
  if (challenge) {
    throw new Error(`Sign-in requires additional step: ${challenge}`);
  }
  if (!authResult?.IdToken) {
    throw new Error("Sign-in did not return an ID token.");
  }
  setIdToken(authResult.IdToken);
}

/** Fixed HTTPS callback — must match Cognito app client callback URLs exactly. */
export function redirectUri(): string {
  const configured = import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined;
  if (configured && configured.trim()) {
    const c = configured.trim();
    return c.endsWith("/") ? c : `${c}/`;
  }
  if (window.location.protocol === "https:") {
    return `${window.location.origin}/`;
  }
  return "https://admin.granolaconsulting.com/";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomPkceVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64UrlEncode(new Uint8Array(hash));
}

function canUsePkce(): boolean {
  return window.isSecureContext === true && typeof crypto !== "undefined" && !!crypto.subtle;
}

/** Shown on the login page when opened over plain HTTP. */
export function insecureLoginWarning(): string | null {
  if (window.isSecureContext) {
    return null;
  }
  return (
    "This page is not served over HTTPS, so secure sign-in (PKCE) is unavailable. " +
    "Open https://admin.granolaconsulting.com/ (Vercel) instead."
  );
}

function startImplicitGoogleLogin(): void {
  const params = new URLSearchParams({
    client_id: cognitoClientId(),
    response_type: "token",
    scope: "openid email profile",
    redirect_uri: redirectUri(),
    identity_provider: "Google",
  });
  window.location.href = `${cognitoDomain()}/oauth2/authorize?${params.toString()}`;
}

export async function startGoogleLogin(): Promise<void> {
  stripOAuthParamsFromUrl();

  if (!canUsePkce()) {
    startImplicitGoogleLogin();
    return;
  }

  const verifier = randomPkceVerifier();
  storePkceVerifier(verifier);

  const challenge = await pkceChallenge(verifier);
  const params = new URLSearchParams({
    client_id: cognitoClientId(),
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri(),
    identity_provider: "Google",
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `${cognitoDomain()}/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForIdToken(code: string, verifier: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cognitoClientId(),
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch(`${cognitoDomain()}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = "Could not complete sign-in (token exchange failed).";
    try {
      const j = JSON.parse(text) as { error_description?: string; error?: string };
      msg = j.error_description || j.error || msg;
    } catch {
      if (text && text.length < 200) msg = text;
    }
    throw new Error(msg);
  }
  const tokens = JSON.parse(text) as { id_token?: string };
  if (!tokens.id_token) {
    throw new Error("Sign-in did not return an ID token.");
  }
  return tokens.id_token;
}

/** Handle OAuth callback (?code= or legacy #id_token=). Returns error message or null on success. */
export async function completeOAuthLogin(): Promise<string | null> {
  const q = new URLSearchParams(window.location.search);
  if (q.get("error")) {
    const msg = q.get("error_description") || q.get("error") || "Sign-in failed";
    stripOAuthParamsFromUrl();
    return msg;
  }

  const code = q.get("code");
  if (code) {
    const verifier = readPkceVerifier();
    clearPkceVerifier();
    if (!verifier) {
      stripOAuthParamsFromUrl();
      return "Sign-in session expired. Please click Continue with Google again.";
    }
    try {
      const idToken = await exchangeCodeForIdToken(code, verifier);
      setIdToken(idToken);
      stripOAuthParamsFromUrl();
      return null;
    } catch (err) {
      stripOAuthParamsFromUrl();
      return err instanceof Error ? err.message : String(err);
    }
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const params = new URLSearchParams(hash);
    const token = params.get("id_token");
    if (token) {
      if (!isIdTokenUsable(token)) {
        stripOAuthParamsFromUrl();
        return "Sign-in token expired. Please click Continue with Google again.";
      }
      setIdToken(token);
      stripOAuthParamsFromUrl();
    }
  }
  return null;
}

export function logout(): void {
  clearAuthState();
  window.location.href = redirectUri();
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getIdToken();
  if (!token) {
    throw new Error("Not signed in");
  }
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearIdToken();
    }
    const msg =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : text || res.statusText;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function listUsers(cursor?: string | null): Promise<ListUsersResponse> {
  const qs = new URLSearchParams({ limit: "50" });
  if (cursor) qs.set("cursor", cursor);
  return adminFetch<ListUsersResponse>(`/v1/admin/users?${qs.toString()}`);
}

export async function getUserDetail(tenantId: string): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`/v1/admin/users/${encodeURIComponent(tenantId)}`);
}

export async function revokeUser(tenantId: string): Promise<void> {
  await adminFetch(`/v1/admin/users/${encodeURIComponent(tenantId)}/revoke`, {
    method: "POST",
    body: "{}",
  });
}

export async function reactivateUser(tenantId: string): Promise<void> {
  await adminFetch(`/v1/admin/users/${encodeURIComponent(tenantId)}/reactivate`, {
    method: "POST",
    body: "{}",
  });
}

export type DeleteStepId = "dynamodb" | "secrets" | "superset" | "postgres" | "cognito";

export const DELETE_STEPS: { id: DeleteStepId; label: string }[] = [
  { id: "dynamodb", label: "DynamoDB records (tenant, accounts, API keys)" },
  { id: "secrets", label: "Secrets Manager upload DB secret" },
  { id: "superset", label: "Superset user, role, and File Uploads database" },
  { id: "postgres", label: "Postgres upload schema and role" },
  { id: "cognito", label: "Cognito user" },
];

export async function deleteUserStep(
  tenantId: string,
  step: DeleteStepId,
  email: string,
): Promise<{ step: string; message: string }> {
  return adminFetch<{ ok: boolean; step: string; message: string }>(
    `/v1/admin/users/${encodeURIComponent(tenantId)}/delete`,
    {
      method: "POST",
      body: JSON.stringify({ step, email }),
    },
  );
}

export async function deleteUser(tenantId: string, email: string): Promise<void> {
  for (const step of DELETE_STEPS) {
    await deleteUserStep(tenantId, step.id, email);
  }
}
