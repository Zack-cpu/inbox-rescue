import {createDemo, selectMessages, restore as demoRestore, undo as demoUndo} from './demo.mjs';
import {settings, saveClientId, getSession, clearSession, connect, disconnect} from './auth.mjs';
import {Gmail} from './gmail.mjs';

let messages = [], category = 'spam', scanned = false, session = null, busy = false;
const $ = id => document.getElementById(id);
function node(tag, text, className) {
  const el = document.createElement(tag); el.textContent = text;
  if (className) el.className = className;
  return el;
}
function setBusy(value) {
  busy = value;
  for (const button of document.querySelectorAll('button')) button.disabled = value;
}
function account() {
  $('mode').textContent = session ? 'Gmail' : 'Demo';
  $('account-title').textContent = session ? session.email : 'Connect your Gmail';
  $('account-title').className = 'account-email';
  $('account-description').textContent = session ? 'Connected to real Gmail. Restores change real messages. Access expires periodically; reconnect when prompted.' : 'Connect to check real mail, or try the demo below. Only confirmed restores change labels.';
  $('connect').hidden = Boolean(session);
  $('disconnect').hidden = !session;
  $('save-config').disabled = Boolean(session) || busy;
  $('client-id').disabled = Boolean(session) || busy;
  $('scan').textContent = session ? 'Check for missed messages' : 'Try a demo scan';
}
function confirmedReset() {
  return !messages.some(m => m.restored) || window.confirm('Clear these results and their undo actions? Existing Gmail changes will remain in place.');
}
function resetResults() {
  messages = []; scanned = false; category = 'spam'; $('show-all').checked = false;
}
function gmail() {
  return new Gmail(session, async () => { await clearSession(); });
}
async function handleError(error) {
  const previous = session;
  session = await getSession();
  if (previous && !session) resetResults();
  $('status').textContent = error.message || 'The operation failed. Please try again.';
  account(); render();
}
function confirmRestore() {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = session ? 'Restore this real message?' : 'Simulate a restore?';
  $('confirm-description').textContent = session ? `For ${session.email}: remove Spam/Promotions labels and move this message to Primary. Verify the sender first.` : 'Only the fictional message changes. Your real Gmail account will not change.';
  $('confirm-restore').textContent = session ? 'Restore real message' : 'Restore demo message';
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'restore'), {once: true});
    dialog.showModal();
  });
}
function render() {
  for (const key of ['spam', 'promotions']) {
    $(key).textContent = `${key === 'spam' ? 'Spam' : 'Promotions'} (${selectMessages(messages, key, $('show-all').checked).length})`;
    $(key).setAttribute('aria-pressed', String(category === key));
  }
  $('items').replaceChildren();
  if (!scanned) return;
  const visible = selectMessages(messages, category, $('show-all').checked);
  if (!visible.length) $('items').append(node('p', `No ${category === 'spam' ? 'Spam' : 'Promotions'} messages match this filter. Try the other category or show all checked messages.`));
  for (const message of visible) {
    const card = node('article', '');
    card.append(node('div', message.sender, 'sender'), node('h3', message.subject));
    if (message.restored) card.append(node('p', session ? 'Restored to Primary' : 'Restored to Primary · Demo', 'restored'));
    for (const reason of message.reasons) card.append(node('p', reason, 'reason'));
    if (!message.reasons.length) card.append(node('p', 'No recent correspondence was found. This message may still be important.', 'reason'));
    for (const warning of message.warnings) card.append(node('p', warning, 'warning'));
    const actions = node('div', '', 'actions');
    if (session) {
      const link = node('a', 'View in Gmail');
      link.href = `https://mail.google.com/mail/?authuser=${encodeURIComponent(session.email)}#all/${encodeURIComponent(message.id)}`;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    }
    const action = node('button', message.restored ? 'Undo restore' : 'Restore to Primary', 'primary');
    action.type = 'button'; action.disabled = busy;
    action.addEventListener('click', async () => {
      if (busy) return;
      // Keep dialog controls available before locking other interactions.
      if (!message.restored && !await confirmRestore()) return;
      setBusy(true);
      try {
        if (session) {
          const client = gmail();
          if (message.restored) { await client.undo(message.id, message.delta); message.restored = false; delete message.delta; }
          else { message.delta = await client.restore(message.id); message.restored = true; }
        } else if (message.restored) demoUndo(message);
        else demoRestore(message);
        $('status').textContent = session ? 'Gmail updated. Undo remains available until you clear results, scan again, or reload the panel.' : 'Demo action completed. Your real mailbox has not changed.';
        render();
      } catch (error) { await handleError(error); }
      finally { setBusy(false); account(); }
    });
    actions.append(action);
    if (!message.restored) {
      const dismiss = node('button', 'Dismiss for now'); dismiss.type = 'button'; dismiss.disabled = busy;
      dismiss.addEventListener('click', () => {
        if (busy) return;
        message.dismissed = true;
        $('status').textContent = 'Dismissed from this scan. No Gmail labels were changed.'; render();
      });
      actions.append(dismiss);
    }
    card.append(actions); $('items').append(card);
  }
}
for (const key of ['spam', 'promotions']) $(key).addEventListener('click', () => { if (!busy) {category = key; render();} });
$('show-all').addEventListener('change', render);
$('scan').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  setBusy(true);
  try {
    const result = session ? await gmail().scan(text => {$('status').textContent = text;}) : {items: createDemo(), checked: 5, limited: false};
    messages = result.items; scanned = true;
    $('status').textContent = `Checked ${result.checked} ${session ? '' : 'fictional '}messages; ${messages.filter(m => m.candidate).length} have correspondence evidence. Counts follow the current filter.` + (result.limited ? ' Scan limit reached; results are incomplete.' : '') + ' Rules can miss important messages.';
    render();
  } catch (error) { await handleError(error); }
  finally {setBusy(false); account();}
});
$('reset').addEventListener('click', () => {
  if (busy || !confirmedReset()) return;
  resetResults(); $('status').textContent = 'Results cleared. No Gmail labels were changed.'; render();
});
$('save-config').addEventListener('click', async () => {
  if (busy || session) return;
  try {await saveClientId($('client-id').value); $('status').textContent = 'Client ID saved. Click Connect Gmail to authorize your test account.';}
  catch (error) {$('status').textContent = error.message;}
});
$('connect').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  if (!$('client-id').value.trim()) {
    $('setup').open = true; $('client-id').focus();
    $('status').textContent = 'Configure the Web application client ID in Developer setup, then save it before connecting.'; return;
  }
  setBusy(true); $('status').textContent = 'Complete Google authorization in the window that opens…';
  try {await saveClientId($('client-id').value); session = await connect(); resetResults(); $('status').textContent = `Connected to ${session.email}. Start a scan to check real mail.`; $('setup').open = false; render();}
  catch (error) {await handleError(error);}
  finally {setBusy(false); account();}
});
$('disconnect').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  setBusy(true);
  try {
    const revoked = await disconnect(); session = null; resetResults(); render();
    $('status').textContent = revoked ? 'Disconnected. Local authorization was cleared and revocation was requested successfully. You can try demo mode.' : 'Local authorization cleared. Google revocation could not be confirmed; remove Inbox Rescue in your Google Account connections. Demo mode is available.';
  } catch (error) {await handleError(error);}
  finally {setBusy(false); account();}
});
setBusy(true);
try {
  const config = await settings(); $('client-id').value = config.clientId; $('redirect').value = config.redirect;
  session = await getSession();
  if (session) $('status').textContent = `Connected to ${session.email}. Start a scan to check real mail.`;
} catch (error) {$('status').textContent = 'Unable to initialize the extension. Reload it on the extensions page.';}
setBusy(false); account(); render();
