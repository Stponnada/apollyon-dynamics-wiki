// POST {access_token, refresh_token}: verify the visitor may read the wiki, then set HttpOnly session
// cookies. GET ?action=logout: clear them and return to the login page.
import { checkAccess, sessionCookies, clearCookies } from '../lib/wiki-auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query?.action === 'logout') {
    res.setHeader('Set-Cookie', clearCookies());
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 302;
    res.setHeader('Location', '/login.html');
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const { access_token: at, refresh_token: rt } = req.body || {};
  if (typeof at !== 'string' || typeof rt !== 'string') {
    return res.status(400).json({ error: 'missing_tokens' });
  }
  const verdict = await checkAccess(at);
  if (verdict !== 'ok') {
    return res.status(verdict === 'denied' ? 403 : 401).json({ error: verdict === 'denied' ? 'no_access' : 'invalid' });
  }
  res.setHeader('Set-Cookie', sessionCookies(at, rt));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}
