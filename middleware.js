// Vercel Routing Middleware: nothing on the wiki is served without a valid Supabase session that
// passes public.wiki_access() (active Lighthouse employee or active external user).
import { next } from '@vercel/functions';
import {
  AT_COOKIE, RT_COOKIE, readCookies, checkAccess, refreshSession,
  sessionCookies, clearCookies, safeNext,
} from './lib/wiki-auth.js';

// The login page and what it needs to render and to start a session.
const PUBLIC = new Set([
  '/login.html', '/css/login.css', '/js/login.js', '/js/auth-config.js',
  '/assets/login-hero.png', '/api/session', '/favicon.ico',
]);
const isPublic = (p) => PUBLIC.has(p) || p.startsWith('/assets/logos/');

// Edge isolates are reused, so remember a good verdict briefly instead of calling Supabase per asset.
const verdicts = new Map();
const TTL_MS = 60_000;

function redirect(url, to, cookies = []) {
  const h = new Headers({ Location: new URL(to, url).toString() });
  cookies.forEach((c) => h.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers: h });
}

function toLogin(url, reason, cookies = []) {
  const dest = new URL('/login.html', url);
  const back = safeNext(url.pathname + url.search);
  if (back !== '/') dest.searchParams.set('next', back);
  if (reason) dest.searchParams.set('error', reason);
  return redirect(url, dest.pathname + dest.search, cookies);
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (isPublic(url.pathname)) return next();

  const jar = readCookies(request.headers.get('cookie'));
  const at = jar[AT_COOKIE];
  const rt = jar[RT_COOKIE];

  if (at) {
    const hit = verdicts.get(at);
    if (hit && hit > Date.now()) return next();
    const verdict = await checkAccess(at);
    if (verdict === 'ok') {
      verdicts.set(at, Date.now() + TTL_MS);
      if (verdicts.size > 500) verdicts.clear();
      return next();
    }
    if (verdict === 'denied') return toLogin(url, 'no_access', clearCookies());
  }

  // No or expired access token: try the refresh token, then retry the same URL with new cookies.
  if (rt) {
    const fresh = await refreshSession(rt);
    if (fresh) {
      const verdict = await checkAccess(fresh.accessToken);
      if (verdict === 'ok') {
        return redirect(url, url.pathname + url.search, sessionCookies(fresh.accessToken, fresh.refreshToken));
      }
      if (verdict === 'denied') return toLogin(url, 'no_access', clearCookies());
    }
  }
  return toLogin(url, null, at || rt ? clearCookies() : []);
}

export const config = { matcher: '/:path*' };
