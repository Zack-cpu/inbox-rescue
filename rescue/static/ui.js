let session, items = [], category = 'spam';
const categoryOf = m => m.labels.includes('SPAM') ? 'spam' : 'promotions';
const $ = id => document.getElementById(id);
function element(tag, text, cls) {
  const e = document.createElement(tag); e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
async function api(path) {
  const r = await fetch(path, {method:'POST', headers:{'x-rescue-token':session.token}});
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || 'The operation could not be completed. Please try again.');
  return data;
}
function render() {
  $('items').replaceChildren();
  const eligible = items.filter(m => $('all').checked || m.candidate);
  for (const key of ['spam', 'promotions']) {
    const count = eligible.filter(m => categoryOf(m) === key).length;
    $(key).textContent = `${key === 'spam' ? 'Spam' : 'Promotions'} (${count})`;
    $(key).setAttribute('aria-pressed', String(category === key));
  }
  const shown = eligible.filter(m => categoryOf(m) === category);
  for (const m of shown) {
    const card = element('article', '');
    card.append(element('span', `${m.sender} · ${m.labels.includes('SPAM') ? 'Spam' : 'Promotions'}`, 'sender'));
    card.append(element('h3', m.subject));
    for (const r of m.reasons) card.append(element('p', '↳ ' + r, 'reason'));
    if (!m.reasons.length) card.append(element('p', 'No recent correspondence was found. This message may still be important.'));
    for (const w of m.warnings) card.append(element('p', 'Note: ' + w, 'warning'));
    const actions = element('div', '', 'actions');
    if (!session.demo) {
      const link = element('a', 'View in Gmail');
      link.href = 'https://mail.google.com/mail/u/0/#all/' + encodeURIComponent(m.id);
      link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    }
    const restore = element('button', m.action !== undefined ? 'Undo restore' : 'Restore to Primary');
    restore.onclick = async () => {
      if (m.action === undefined && !confirm(session.demo ? 'Simulate restoring this demo message?' : 'Have you verified the sender? This removes the Spam/Promotions labels and moves the message to Primary.')) return;
      restore.disabled = true;
      try {
        if (m.action !== undefined) { await api('/api/undo/' + m.action); delete m.action; }
        else { const result = await api('/api/restore/' + encodeURIComponent(m.id)); m.action = result.action_id; }
        $('status').textContent = session.demo ? 'Demo action completed. Your real mailbox has not changed.' : 'Action completed. You can undo it until you refresh or scan again.';
        render();
      } catch (e) { $('status').textContent = e.message; }
      finally { restore.disabled = false; }
    };
    const ignore = element('button', 'Dismiss for now', 'secondary');
    ignore.onclick = () => { items = items.filter(x => x !== m); render(); };
    actions.append(restore, ignore); card.append(actions); $('items').append(card);
  }
  if (!shown.length) {
    const label = category === 'spam' ? 'Spam' : 'Promotions';
    const hint = $('all').checked ? 'Try the other category or scan again.' : 'Select “Show all checked messages” to review messages without correspondence evidence.';
    $('items').append(element('p', `No ${label} messages match this filter. ${hint}`));
  }
}
$('all').onchange = render;
for (const key of ['spam', 'promotions']) {
  $(key).onclick = () => { category = key; render(); };
}
$('scan').disabled = true;
$('scan').onclick = async () => {
  $('scan').disabled = true; $('status').textContent = 'Checking messages and recent correspondence. Please wait…';
  try {
    const result = await api('/api/scan'); items = result.items; render();
    $('status').textContent = `Checked ${result.checked} messages; ${items.filter(m => m.candidate).length} have recent correspondence.` + (result.limited ? ' The scan limit was reached; results are incomplete.' : '') + ' Rules can miss important messages. Review all checked messages as needed.';
  } catch (e) { $('status').textContent = e.message; }
  finally { $('scan').disabled = false; }
};
fetch('/api/session').then(r => {if (!r.ok) throw Error(); return r.json();}).then(s => {
  session = s; $('mode').textContent = s.demo ? 'Demo mode' : 'Gmail · Local mode'; $('scan').disabled = false;
  if (!s.demo) $('status').textContent = 'Gmail mode is enabled. Start a scan above. Make sure Gmail is signed in to the authorized account.';
}).catch(() => { $('status').textContent = 'Unable to connect to the local service. Refresh to try again.'; });
