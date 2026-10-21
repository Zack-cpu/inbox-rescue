import test from 'node:test';
import assert from 'node:assert/strict';
import {SCOPE, parseResponse, validateClientId, getSession, disconnect, connect} from '../auth.mjs';

const redirect = 'https://abcdefghijklmnop.chromiumapp.org/oauth2';
function response(changes = {}) {
  return redirect + '#' + new URLSearchParams({state: 'random-state', access_token: 'fake-token', token_type: 'Bearer', expires_in: '3600', scope: SCOPE, ...changes});
}

test('OAuth rejects mismatched states, hosts, paths, and missing scopes', () => {
  assert.throws(() => parseResponse(response(), redirect, 'wrong-state'), /state/);
  assert.throws(() => parseResponse(response().replace('chromiumapp.org', 'attacker.example'), redirect, 'random-state'), /callback/);
  assert.throws(() => parseResponse(response().replace('/oauth2#', '/elsewhere#'), redirect, 'random-state'), /callback/);
  assert.throws(() => parseResponse(response({scope: 'openid email'}), redirect, 'random-state'), /permission/);
});

test('OAuth validates expiry and refusal without exposing access tokens', () => {
  for (const value of ['0', '-1', 'bad', '999999']) assert.throws(() => parseResponse(response({expires_in: value}), redirect, 'random-state'));
  assert.throws(() => parseResponse(response({error: 'access_denied'}), redirect, 'random-state'), /did not grant/);
  assert.deepEqual(parseResponse(response(), redirect, 'random-state', 100), {token: 'fake-token', expiresAt: 3600100});
  assert.throws(() => validateClientId('private-secret'));
  assert.equal(validateClientId(' 123-client.apps.googleusercontent.com '), '123-client.apps.googleusercontent.com');
});

test('expired sessions are cleared without reading disk-based token files', async () => {
  let removed;
  globalThis.chrome = {storage: {session: {
    get: async () => ({gmailSession: {expiresAt: 0}}), remove: async key => {removed = key;},
  }}};
  assert.equal(await getSession(), null);
  assert.equal(removed, 'gmailSession');
});

test('disconnect clears local authorization even if Google revocation fails', async () => {
  let removed = false;
  globalThis.chrome = {storage: {session: {
    get: async () => ({gmailSession: {token: 'fake-token'}}), remove: async () => {removed = true;},
  }}};
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(removed);
      assert.equal(url, 'https://oauth2.googleapis.com/revoke');
      assert.equal(options.method, 'POST');
      throw new Error('offline');
    };
    assert.equal(await disconnect(), false);
  } finally {globalThis.fetch = previousFetch;}
});

test('connect requests the right scope and persists only after validating the Gmail account', async () => {
  let saved;
  globalThis.chrome = {
    storage: {
      local: {get: async () => ({oauthClientId: '123-client.apps.googleusercontent.com'})},
      session: {set: async value => {saved = value;}},
    },
    identity: {
      getRedirectURL: () => redirect,
      launchWebAuthFlow: async ({url, interactive}) => {
        const request = new URL(url);
        assert.equal(interactive, true);
        assert.equal(request.searchParams.get('scope'), SCOPE);
        assert.equal(request.searchParams.get('redirect_uri'), redirect);
        assert.ok(request.searchParams.get('state').length >= 32);
        return response({state: request.searchParams.get('state')});
      },
    },
  };
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://gmail.googleapis.com/gmail/v1/users/me/profile');
      assert.equal(options.headers.Authorization, 'Bearer fake-token');
      return {ok: true, json: async () => ({emailAddress: 'test@example.com'})};
    };
    assert.equal((await connect()).email, 'test@example.com');
    assert.equal(saved.gmailSession.email, 'test@example.com');
  } finally {globalThis.fetch = previousFetch;}
});
