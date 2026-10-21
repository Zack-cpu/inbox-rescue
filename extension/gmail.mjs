function header(message, name) {
  return (message.payload?.headers || []).filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value).join(' ');
}

export function addresses(value) {
  // Prefer angle-bracket addresses so a display name cannot impersonate a known contact.
  const parts = String(value).match(/(?:"[^"\\]*(?:\\.[^"\\]*)*"|[^,])+/g) || [];
  return parts.flatMap(part => {
    const bracket = part.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
    if (bracket) return [bracket[1].toLowerCase()];
    const plain = part.trim();
    return /^[^\s<>"@]+@[^\s<>"@]+$/.test(plain) ? [plain.toLowerCase()] : [];
  });
}

export function assess(message, sentAddresses, sentThreads) {
  const reasons = [], warnings = [];
  if (addresses(header(message, 'From')).some(a => sentAddresses.has(a))) reasons.push('You contacted this address in recently checked sent messages.');
  if (sentThreads.has(message.threadId)) reasons.push('This conversation includes a message you sent.');
  const auth = header(message, 'Authentication-Results');
  if (/\b(?:spf|dkim|dmarc)=(?:fail|softfail)\b/i.test(auth)) warnings.push('The headers report an authentication failure. Verify the sender in Gmail.');
  if (!auth) warnings.push('No authentication results were available.');
  return {id: message.id, sender: header(message, 'From') || 'Unknown sender', subject: header(message, 'Subject') || '(No subject)', labels: message.labelIds || [], reasons, warnings, candidate: reasons.length > 0};
}

export function restoreDelta(labels) {
  if (labels.includes('TRASH')) throw new Error('This message is in Trash. Check Gmail before restoring.');
  const removed = labels.filter(l => ['SPAM', 'CATEGORY_PROMOTIONS'].includes(l));
  if (!removed.length) throw new Error('This message is no longer in Spam or Promotions. Scan again.');
  return {added: ['INBOX', 'CATEGORY_PERSONAL'].filter(l => !labels.includes(l)), removed};
}

export function canUndo(labels, delta) {
  return !labels.includes('TRASH') && delta.added.every(l => labels.includes(l)) && !delta.removed.some(l => labels.includes(l));
}

async function mapLimit(values, fn) {
  const output = new Array(values.length);
  let next = 0, failure;
  await Promise.all(Array.from({length: Math.min(values.length, 4)}, async () => {
    while (next < values.length && !failure) {
      const index = next++;
      try { output[index] = await fn(values[index]); }
      catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
  return output;
}

export class Gmail {
  constructor(session, onExpired, request = fetch) {
    this.session = session; this.onExpired = onExpired; this.request = request;
  }
  async api(path, {query, body} = {}) {
    if (this.session.expiresAt < Date.now() + 10000) {
      await this.onExpired(); throw new Error('Gmail authorization expired. Click Connect Gmail again.');
    }
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);
    if (query) for (const [key, value] of query) url.searchParams.append(key, value);
    let response;
    try { response = await this.request(url.href, {
      method: body ? 'POST' : 'GET',
      headers: {Authorization: `Bearer ${this.session.token}`, ...(body ? {'Content-Type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(20000),
    }); } catch { throw new Error('Network request failed. For restore or undo, check Gmail before retrying: the update may already have succeeded.'); }
    if (response.status === 401) {
      await this.onExpired(); throw new Error('Gmail authorization is no longer valid. Connect again.');
    }
    if (!response.ok) throw new Error(`Gmail request failed (${response.status}). Check API access, permissions, or quota. For an update, check Gmail before retrying.`);
    return response.json();
  }
  message(id) {
    return this.api(`messages/${encodeURIComponent(id)}`, {query: [['format', 'metadata'], ...['From', 'To', 'Cc', 'Subject', 'Authentication-Results'].map(h => ['metadataHeaders', h])]});
  }
  async list(query, limit) {
    const ids = []; let pageToken;
    do {
      const params = [['q', query], ['includeSpamTrash', 'true'], ['maxResults', String(Math.min(100, limit - ids.length))]];
      if (pageToken) params.push(['pageToken', pageToken]);
      const page = await this.api('messages', {query: params});
      ids.push(...(page.messages || []).map(m => m.id));
      pageToken = page.nextPageToken;
    } while (pageToken && ids.length < limit);
    return {ids, limited: Boolean(pageToken)};
  }
  async scan(progress = () => {}) {
    progress('Checking recent sent messages…');
    const sent = await this.list('in:sent newer_than:90d', 300);
    const sentAddresses = new Set(), threads = new Set();
    await mapLimit(sent.ids, async id => {
      const message = await this.message(id);
      for (const h of ['To', 'Cc']) addresses(header(message, h)).forEach(a => sentAddresses.add(a));
      threads.add(message.threadId);
    });
    progress('Checking Spam and Promotions…');
    const candidates = await this.list('newer_than:7d {in:spam category:promotions} -in:trash', 100);
    const items = await mapLimit(candidates.ids, async id => assess(await this.message(id), sentAddresses, threads));
    return {items, checked: items.length, limited: sent.limited || candidates.limited};
  }
  async restore(id) {
    const delta = restoreDelta((await this.message(id)).labelIds || []);
    await this.api(`messages/${encodeURIComponent(id)}/modify`, {body: {addLabelIds: delta.added, removeLabelIds: delta.removed}});
    return delta;
  }
  async undo(id, delta) {
    if (!canUndo((await this.message(id)).labelIds || [], delta)) throw new Error('The message labels have changed. Check Gmail instead of overwriting later changes.');
    await this.api(`messages/${encodeURIComponent(id)}/modify`, {body: {addLabelIds: delta.removed, removeLabelIds: delta.added}});
  }
}
