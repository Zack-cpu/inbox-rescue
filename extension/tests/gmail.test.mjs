import test from 'node:test';
import assert from 'node:assert/strict';
import {addresses, assess, restoreDelta, canUndo, Gmail} from '../gmail.mjs';

test('relationship matching uses mailbox addresses rather than display names', () => {
  assert.deepEqual(addresses('"alex@example.com" <attacker@example.net>'), ['attacker@example.net']);
  assert.deepEqual(addresses('"Last, First" <Alex@example.com>, other@example.net'), ['alex@example.com', 'other@example.net']);
  const m = {id: '1', threadId: '1', payload: {headers: [{name: 'From', value: 'alex@example.com <attacker@example.net>'}]}};
  assert.equal(assess(m, new Set(['alex@example.com']), new Set()).candidate, false);
});

test('relationship evidence does not suppress authentication warnings', () => {
  const m = {id: '1', threadId: 't', payload: {headers: [{name: 'Authentication-Results', value: 'mx.google.com; dmarc=fail'}]}};
  const result = assess(m, new Set(), new Set(['t']));
  assert.equal(result.candidate, true);
  assert.equal(result.warnings.length, 1);
});

test('restore and undo are limited to the label delta and reject conflicts', () => {
  const delta = restoreDelta(['SPAM', 'INBOX', 'STARRED']);
  assert.deepEqual(delta, {added: ['CATEGORY_PERSONAL'], removed: ['SPAM']});
  assert.ok(canUndo(['INBOX', 'CATEGORY_PERSONAL', 'STARRED', 'custom'], delta));
  assert.ok(!canUndo(['INBOX', 'CATEGORY_PERSONAL', 'TRASH'], delta));
  assert.ok(!canUndo(['INBOX', 'CATEGORY_PERSONAL', 'SPAM'], delta));
  assert.throws(() => restoreDelta(['INBOX']));
  assert.throws(() => restoreDelta(['SPAM', 'TRASH']));
});

test('expired or rejected authorization stops Gmail requests', async () => {
  let expired = false, requested = false;
  const client = new Gmail({expiresAt: 0}, async () => {expired = true;}, async () => {requested = true;});
  await assert.rejects(client.message('x'), /expired/);
  assert.ok(expired && !requested);
  const rejected = new Gmail({expiresAt: Date.now() + 60000, token: 'fake'}, async () => {expired = true;}, async () => ({status: 401, ok: false}));
  await assert.rejects(rejected.message('x'), /no longer valid/);
});

test('scan paginates sent history, finds replies and handles mixed labels', async () => {
  const requests = [];
  const client = new Gmail({expiresAt: Date.now() + 60000, token: 'fake'}, async () => {}, async url => {
    const u = new URL(url); requests.push(u);
    let data;
    if (u.pathname.endsWith('/messages')) {
      if (u.searchParams.get('q').startsWith('in:sent')) data = u.searchParams.has('pageToken') ? {messages: [{id: 's2'}]} : {messages: [{id: 's1'}], nextPageToken: 'next'};
      else data = {messages: [{id: 'm'}]};
    } else if (u.pathname.endsWith('/m')) data = {id: 'm', threadId: 't', labelIds: ['SPAM', 'CATEGORY_PROMOTIONS'], payload: {headers: [{name: 'From', value: 'Alex <alex@example.com>'}]}};
    else data = {threadId: 't', payload: {headers: [{name: 'To', value: 'alex@example.com'}]}};
    return {ok: true, json: async () => data};
  });
  const result = await client.scan();
  assert.equal(result.checked, 1); assert.equal(result.limited, false);
  assert.equal(result.items[0].reasons.length, 2);
  assert.ok(requests.some(u => u.searchParams.get('pageToken') === 'next'));
});

test('real restore and undo preserve INBOX and unrelated labels', async () => {
  let labels = ['INBOX', 'CATEGORY_PROMOTIONS', 'STARRED'];
  const changes = [];
  const client = new Gmail({expiresAt: Date.now() + 60000, token: 'fake'}, async () => {}, async (url, options) => {
    if (options.body) {
      const body = JSON.parse(options.body); changes.push(body);
      labels = [...labels.filter(l => !body.removeLabelIds.includes(l)), ...body.addLabelIds];
    }
    return {ok: true, json: async () => ({labelIds: labels})};
  });
  const delta = await client.restore('m');
  assert.ok(!labels.includes('CATEGORY_PROMOTIONS'));
  labels.push('custom');
  await client.undo('m', delta);
  assert.deepEqual(new Set(labels), new Set(['INBOX', 'CATEGORY_PROMOTIONS', 'STARRED', 'custom']));
  assert.ok(changes.every(c => !c.removeLabelIds.includes('INBOX')));
});
