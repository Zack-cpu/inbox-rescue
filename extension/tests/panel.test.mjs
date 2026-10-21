import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('normal panel connects and scans without config input; demo stays separate', async () => {
  const html = await readFile(new URL('../panel.html', import.meta.url), 'utf8');
  const all = [];
  class Element {
    constructor(tag = 'div') {this.tag = tag; this.textContent = ''; this.hidden = false; this.disabled = false; this.checked = false; this.children = []; this.events = {}; this.attrs = {}; all.push(this);}
    append(...children) {this.children.push(...children);}
    replaceChildren() {this.children = [];}
    setAttribute(key, value) {this.attrs[key] = value;}
    addEventListener(type, fn) {(this.events[type] ||= []).push(fn);}
    async click() {assert.equal(this.disabled, false); for (const fn of this.events.click || []) await fn();}
  }
  const elements = new Map([...html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"([^>]*)>/g)].map(([, tag, id, rest]) => {
    const el = new Element(tag); el.hidden = /\bhidden\b/.test(rest); el.checked = /\bchecked\b/.test(rest); return [id, el];
  }));
  const previous = {chrome: globalThis.chrome, fetch: globalThis.fetch, document: globalThis.document, window: globalThis.window};
  let saved = {}, requests = [], launches = 0;
  globalThis.document = {getElementById: id => {assert.ok(elements.has(id), `Missing element ${id}`); return elements.get(id);}, createElement: tag => new Element(tag), querySelectorAll: selector => all.filter(el => selector === 'button' && el.tag === 'button')};
  globalThis.window = {confirm: () => true};
  globalThis.chrome = {
    storage: {local: {get: async () => ({})}, session: {get: async () => saved, set: async value => {saved = value;}, remove: async () => {saved = {};}}},
    identity: {getRedirectURL: () => 'https://example.chromiumapp.org/oauth2', launchWebAuthFlow: async ({url}) => {
      launches++;
      const params = new URL(url).searchParams;
      return 'https://example.chromiumapp.org/oauth2#' + new URLSearchParams({state: params.get('state'), scope: params.get('scope'), access_token: 'fake', expires_in: '3600', token_type: 'Bearer'});
    }},
  };
  globalThis.fetch = async url => {
    requests.push(url);
    const parsed = new URL(url);
    let data;
    if (parsed.pathname.endsWith('/profile')) data = {emailAddress: 'test@example.com'};
    else if (parsed.pathname.endsWith('/revoke')) data = {};
    else if (parsed.pathname.endsWith('/messages')) data = {messages: [{id: parsed.searchParams.get('q').startsWith('in:sent') ? 's' : 'm'}]};
    else data = {id: 'm', threadId: 't', labelIds: ['SPAM'], payload: {headers: [{name: 'From', value: 'Alex <alex@example.com>'}, {name: 'To', value: 'alex@example.com'}, {name: 'Subject', value: 'Friday meeting'}]}};
    return {ok: true, json: async () => data};
  };
  try {
    // Load the actual panel module with real auth/Gmail modules and fake browser APIs.
    const original = await readFile(new URL('../panel.js', import.meta.url), 'utf8');
    const code = original.replace(/from '(\.\/[^']+)'/g, (_, relative) => `from '${new URL('../' + relative.slice(2), import.meta.url).href}'`);
    await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    assert.equal(elements.get('queue').hidden, true);
    assert.equal(launches, 0);
    await elements.get('try-demo').click();
    assert.equal(elements.get('mode').textContent, 'Demo');
    assert.equal(requests.length, 0);
    await elements.get('connect').click();
    assert.equal(launches, 1);
    assert.equal(elements.get('account-title').textContent, 'test@example.com');
    assert.equal(elements.get('mode').textContent, 'Gmail');
    assert.equal(elements.get('try-demo').hidden, true);
    assert.equal(elements.get('queue').hidden, false);
    assert.match(elements.get('status').textContent, /Checked 1 messages/);
    assert.equal(elements.get('items').children.length, 1);
    assert.ok(requests.some(url => url.includes('/messages?')));
    await elements.get('disconnect').click();
    assert.equal(elements.get('queue').hidden, true);
    assert.equal(elements.get('mode').textContent, 'Welcome');
    assert.deepEqual(saved, {});
  } finally {Object.assign(globalThis, previous);}
});
