import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemo, categoryOf, selectMessages, restore, undo} from '../demo.mjs';

test('Spam takes precedence over Promotions without duplicating messages', () => {
  const messages = createDemo();
  const spam = selectMessages(messages, 'spam', true);
  const promotions = selectMessages(messages, 'promotions', true);
  assert.equal(spam.length + promotions.length, messages.length);
  assert.equal(categoryOf(messages.find(m => m.id === 'invoice')), 'spam');
  assert.ok(!promotions.some(m => spam.includes(m)));
});

test('correspondence filter and dismissal work independently in both categories', () => {
  const messages = createDemo();
  assert.equal(selectMessages(messages, 'spam', false).length, 2);
  assert.equal(selectMessages(messages, 'promotions', false).length, 1);
  messages.find(m => m.id === 'invoice').dismissed = true;
  assert.equal(selectMessages(messages, 'spam', false).length, 1);
  assert.equal(selectMessages(messages, 'promotions', true).length, 2);
});

test('restore and undo preserve unrelated labels and the original review category', () => {
  const message = createDemo()[0];
  const original = [...message.labels];
  restore(message);
  assert.ok(message.currentLabels.includes('UNREAD'));
  assert.ok(!message.currentLabels.includes('SPAM'));
  assert.ok(message.currentLabels.includes('CATEGORY_PERSONAL'));
  assert.equal(categoryOf(message), 'spam');
  message.currentLabels.push('custom');
  undo(message);
  assert.deepEqual(new Set(message.currentLabels), new Set([...original, 'custom']));
  assert.throws(() => undo(message));
});

test('Promotions undo keeps a pre-existing INBOX label', () => {
  const message = createDemo().find(m => m.id === 'booking');
  restore(message);
  assert.throws(() => restore(message));
  undo(message);
  assert.deepEqual(new Set(message.currentLabels), new Set(['INBOX', 'CATEGORY_PROMOTIONS']));
});

test('a new scan resets simulated changes and does not mutate fixtures', () => {
  const old = createDemo();
  restore(old[0]);
  old[1].dismissed = true;
  const fresh = createDemo();
  assert.ok(fresh.every(m => !m.restored && !m.dismissed && !m.currentLabels));
});

test('demo manifest requests no mailbox, host, or identity permissions', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.permissions, ['sidePanel']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  for (const file of [manifest.background.service_worker, manifest.side_panel.default_path, 'panel.js', 'panel.css', 'demo.mjs']) {
    assert.ok((await readFile(new URL('../' + file, import.meta.url))).length);
  }
});
