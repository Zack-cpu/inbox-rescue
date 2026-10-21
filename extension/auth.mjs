import {DEFAULT_CLIENT_ID} from './oauth-config.mjs';

export const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
export function validateClientId(value) {
  const id = String(value || '').trim();
  if (!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) throw new Error('Enter a Google OAuth Web application client ID, not a client secret or JSON file.');
  return id;
}

export function parseResponse(callback, redirect, state, now = Date.now()) {
  if (!callback) throw new Error('Google authorization was cancelled.');
  const url = new URL(callback), expected = new URL(redirect);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.search) throw new Error('Unexpected OAuth callback. Please reconnect.');
  const params = new URLSearchParams(url.hash.slice(1));
  if (params.get('state') !== state) throw new Error('OAuth state validation failed. Please reconnect.');
  if (params.has('error')) throw new Error('Google did not grant access. Try again and approve the Gmail permission. If access is blocked, contact the app maintainer.');
  const expires = Number(params.get('expires_in'));
  if (!params.get('access_token') || params.get('token_type')?.toLowerCase() !== 'bearer' || !Number.isFinite(expires) || expires <= 0 || expires > 86400) throw new Error('Google returned an invalid access token response.');
  if (!(params.get('scope') || '').split(' ').includes(SCOPE)) throw new Error('Gmail access was not granted. Reconnect and approve the Gmail permission.');
  return {token: params.get('access_token'), expiresAt: now + expires * 1000};
}

export async function settings() {
  const saved = await chrome.storage.local.get('oauthClientId');
  return {clientId: DEFAULT_CLIENT_ID || saved.oauthClientId || '', redirect: chrome.identity.getRedirectURL('oauth2'), managed: Boolean(DEFAULT_CLIENT_ID)};
}

export async function saveClientId(value) {
  await chrome.storage.local.set({oauthClientId: validateClientId(value)});
}

export async function getSession() {
  const {gmailSession} = await chrome.storage.session.get('gmailSession');
  if (!gmailSession || gmailSession.expiresAt < Date.now() + 30000) {
    await chrome.storage.session.remove('gmailSession');
    return null;
  }
  return gmailSession;
}

export async function clearSession() {
  await chrome.storage.session.remove('gmailSession');
}

export async function connect() {
  const {clientId, redirect} = await settings();
  validateClientId(clientId);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id: clientId, redirect_uri: redirect, response_type: 'token', scope: SCOPE, state, prompt: 'select_account'});
  let callback;
  try { callback = await chrome.identity.launchWebAuthFlow({url: url.href, interactive: true}); }
  catch { throw new Error('Google sign-in did not finish. You can try again. If Google reports a configuration error or blocked access, contact the app maintainer.'); }
  const session = parseResponse(callback, redirect, state);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {headers: {Authorization: `Bearer ${session.token}`}, signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Unable to connect to your mailbox. Try again and approve Gmail access. If the problem continues, contact the app maintainer.');
  const profile = await response.json();
  if (!profile.emailAddress) throw new Error('Gmail did not return an account address.');
  session.email = profile.emailAddress;
  await chrome.storage.session.set({gmailSession: session});
  return session;
}

export async function disconnect() {
  const {gmailSession} = await chrome.storage.session.get('gmailSession');
  await clearSession();
  if (!gmailSession) return true;
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({token: gmailSession.token}), signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch { return false; }
}
