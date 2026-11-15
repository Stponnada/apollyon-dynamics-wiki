// Shared by middleware.js and api/session.js. Every check goes to the Lighthouse Supabase project.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/auth-config.js';

export const AT_COOKIE = 'wiki_at';
export const RT_COOKIE = 'wiki_rt';

export function readCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function sessionCookies(accessToken, refreshToken) {
  const base = 'Path=/; HttpOnly; Secure; SameSite=Lax';
  return [
    `${AT_COOKIE}=${encodeURIComponent(accessToken)}; ${base}; Max-Age=604800`,
    `${RT_COOKIE}=${encodeURIComponent(refreshToken)}; ${base}; Max-Age=2592000`,
  ];
}

export function clearCookies() {
  const base = 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  return [`${AT_COOKIE}=; ${base}`, `${RT_COOKIE}=; ${base}`];
}

/** 'ok' | 'denied' (valid user, not an employee/external) | 'invalid' (expired or bad token). */
export async function checkAccess(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/wiki_access`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (res.status === 401 || res.status === 403) return 'invalid';
  if (!res.ok) return 'invalid';
  return (await res.json()) === true ? 'ok' : 'denied';
}

export async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.access_token && j.refresh_token
    ? { accessToken: j.access_token, refreshToken: j.refresh_token }
    : null;
}

/** Only same-site paths, never //host or /\host. */
export function safeNext(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/';
}
