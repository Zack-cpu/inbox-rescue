import {createDemo, selectMessages, restore as demoRestore, undo as demoUndo} from './demo.mjs';
import {getSession, clearSession, connect, disconnect} from './auth.mjs';
import {Gmail} from './gmail.mjs';

let messages = [], category = 'spam', scanned = false, session = null, busy = false, demo = false;
const $ = id => document.getElementById(id);
function node(tag, text, className) {
  const el = document.createElement(tag); el.textContent = text;
  if (className) el.className = className;
  return el;
}
function setBusy(value) {
  busy = value;
  for (const button of document.querySelectorAll('button')) button.disabled = value;
  $('show-all').disabled = value;
  $('queue').setAttribute('aria-busy', String(value));
}
function account() {
  $('mode').textContent = session ? 'Gmail' : demo ? 'Demo' : 'Welcome';
  $('intro').hidden = Boolean(session || demo);
  $('account-title').textContent = session ? session.email : demo ? 'You are trying fictional mail.' : 'Your inbox, with a second look.';
  $('account-title').className = 'account-email';
  $('account-description').textContent = session ? 'Connected. Review the results below and choose what belongs in Primary.' : demo ? 'Demo actions do not change your Gmail. Connect whenever you are ready.' : 'Connect your Gmail account to get started. We check recent correspondence to help you spot missed messages.';
  $('connect').hidden = Boolean(session);
  $('disconnect').hidden = !session;
  $('permission-note').hidden = Boolean(session);
  $('try-demo').hidden = Boolean(session || demo);
  $('scan').hidden = !session && !demo;
  $('scan').textContent = session ? 'Check again' : 'Restart demo';
  $('queue').hidden = !session && !demo;
}
function confirmedReset() {
  return !messages.some(m => m.restored) || window.confirm('Clear these results and their undo actions? Existing Gmail changes will remain in place.');
}
function resetResults() {
  messages = []; scanned = false; category = 'spam'; $('show-all').checked = true;
}
function gmail() {
  return new Gmail(session, async () => { await clearSession(); });
}
async function handleError(error) {
  const previous = session;
  session = await getSession();
  if (previous && !session) {resetResults(); demo = false;}
  $('status').textContent = error.message || 'The operation failed. Please try again.';
  account(); render();
}
function confirmRestore() {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = session ? 'Restore this message?' : 'Simulate a restore?';
  $('confirm-description').textContent = session ? `For ${session.email}: remove Spam/Promotions labels and move this message to Primary. Verify the sender first.` : 'Only this fictional message changes. Your real Gmail account will not change.';
  $('confirm-restore').textContent = session ? 'Restore to Primary' : 'Restore demo message';
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
      if (!message.restored && !await confirmRestore()) return;
      setBusy(true);
      try {
        if (session) {
          const client = gmail();
          if (message.restored) { await client.undo(message.id, message.delta); message.restored = false; delete message.delta; }
          else { message.delta = await client.restore(message.id); message.restored = true; }
        } else if (message.restored) demoUndo(message);
        else demoRestore(message);
        $('status').textContent = session ? 'Gmail updated. You can undo this action below.' : 'Demo action completed. Your real mailbox has not changed.';
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
async function runScan() {
  const result = session ? await gmail().scan(text => {$('status').textContent = text;}) : {items: createDemo(), checked: 5, limited: false};
  messages = result.items; scanned = true;
  $('status').textContent = `Checked ${result.checked} ${session ? '' : 'fictional '}messages. ${messages.filter(m => m.candidate).length} have recent correspondence.` + (result.limited ? ' Scan limit reached; results are incomplete.' : '') + ' Review both categories below.';
  render();
}
for (const key of ['spam', 'promotions']) $(key).addEventListener('click', () => {if (!busy) {category = key; render();}});
$('show-all').addEventListener('change', render);
$('scan').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  setBusy(true);
  try {await runScan();}
  catch (error) {await handleError(error);}
  finally {setBusy(false); account();}
});
$('reset').addEventListener('click', () => {
  if (busy || !confirmedReset()) return;
  resetResults(); $('status').textContent = 'Results cleared. No Gmail labels were changed.'; render();
});
$('try-demo').addEventListener('click', async () => {
  if (busy || session) return;
  demo = true; resetResults(); account(); await runScan();
});
$('connect').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  setBusy(true); $('status').textContent = 'Choose your Google account and approve Gmail access in the window that opens…';
  try {
    session = await connect(); demo = false; resetResults(); account();
    $('status').textContent = 'Connected. Checking your mailbox…';
    await runScan();
  } catch (error) {await handleError(error);}
  finally {setBusy(false); account();}
});
$('disconnect').addEventListener('click', async () => {
  if (busy || !confirmedReset()) return;
  setBusy(true);
  try {
    const revoked = await disconnect(); session = null; demo = false; resetResults(); render();
    $('status').textContent = revoked ? 'Disconnected. Your previous Gmail changes remain in place.' : 'Disconnected locally. To finish removing access, remove Inbox Rescue in your Google Account connections.';
  } catch (error) {await handleError(error);}
  finally {setBusy(false); account();}
});
setBusy(true);
try {
  session = await getSession();
  if (session) $('status').textContent = 'Welcome back. Click Check again to review your mailbox.';
} catch (error) {$('status').textContent = 'Unable to open your connection. Reload the extension and try again.';}
setBusy(false); account(); render();
