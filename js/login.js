// Sign in against the Lighthouse Supabase project, then hand the session to /api/session, which
// verifies wiki access server-side and sets HttpOnly cookies. Nothing is kept in browser storage.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './auth-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const $ = (id) => document.getElementById(id);
const form = $('form'), errorEl = $('error'), submit = $('submit');
const params = new URLSearchParams(location.search);

const MESSAGES = {
  no_access: 'This account is not authorised to read the wiki.',
  invalid: 'Your session has expired. Please sign in again.',
  must_change: 'Sign in to Lighthouse once to set your own password, then come back here.',
};
if (params.get('error') && MESSAGES[params.get('error')]) showError(MESSAGES[params.get('error')]);

function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }
function safeNext(v) { return /^\/(?![/\\])/.test(v || '') ? v : '/index.html'; }

$('toggle').addEventListener('click', (e) => {
  const pw = $('password'), show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'Hide' : 'Show';
  e.currentTarget.setAttribute('aria-pressed', String(show));
  e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const email = $('email').value.trim(), password = $('password').value;
  if (!email || !password) return showError('Enter your email and password.');

  submit.disabled = true; submit.textContent = 'Signing in…';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return showError('Incorrect email or password.');
    }
    // Employees invited with a temporary password must finish Lighthouse onboarding first.
    if (data.user?.user_metadata?.must_change_password === true) {
      return showError(MESSAGES.must_change);
    }
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
    });
    if (res.status === 403) return showError(MESSAGES.no_access);
    if (!res.ok) return showError('Could not start your session. Please try again.');
    location.replace(safeNext(params.get('next')));
  } catch {
    showError('Network error. Please try again.');
  } finally {
    submit.disabled = false; submit.textContent = 'Sign in';
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
});
