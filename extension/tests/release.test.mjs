import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extensionId} from '../../scripts/build-extension.mjs';

test('release key produces a stable Chromium ID and rejects private/invalid keys', async () => {
  const {publicKey} = JSON.parse(await readFile(new URL('../../scripts/extension-public-key.json', import.meta.url), 'utf8'));
  const id = extensionId(publicKey);
  assert.match(id, /^[a-p]{32}$/);
  assert.equal(extensionId(publicKey), id);
  assert.throws(() => extensionId('not-a-public-key'));
});

test('normal onboarding contains no developer configuration fields', async () => {
  const html = await readFile(new URL('../panel.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Developer setup|client-id|save-config|Authorized redirect/);
  assert.match(html, /Connect Gmail/);
  assert.match(html, /id="queue"[^>]*hidden/);
  assert.match(html, /Try a demo instead/);
});
