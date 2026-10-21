import {createDemo, selectMessages, restore, undo} from './demo.mjs';

let messages = [], category = 'spam', scanned = false;
const $ = id => document.getElementById(id);
function node(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function confirmRestore() {
  const dialog = $('confirm-dialog');
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'restore'), {once: true});
    dialog.showModal();
  });
}

function render() {
  const showAll = $('show-all').checked;
  for (const key of ['spam', 'promotions']) {
    $(key).textContent = `${key === 'spam' ? 'Spam' : 'Promotions'} (${selectMessages(messages, key, showAll).length})`;
    $(key).setAttribute('aria-pressed', String(category === key));
  }
  $('items').replaceChildren();
  if (!scanned) return;
  const visible = selectMessages(messages, category, showAll);
  if (!visible.length) {
    $('items').append(node('p', `No ${category === 'spam' ? 'Spam' : 'Promotions'} messages match this filter. Try the other category or show all checked messages.`));
  }
  for (const message of visible) {
    const card = node('article', '');
    card.append(node('div', message.sender, 'sender'), node('h3', message.subject));
    if (message.restored) card.append(node('p', 'Restored to Primary · Demo', 'restored'));
    for (const reason of message.reasons) card.append(node('p', reason, 'reason'));
    if (!message.reasons.length) card.append(node('p', 'No recent correspondence was found. This message may still be important.', 'reason'));
    for (const warning of message.warnings) card.append(node('p', warning, 'warning'));
    const actions = node('div', '', 'actions');
    const action = node('button', message.restored ? 'Undo restore' : 'Restore to Primary', 'primary');
    action.type = 'button';
    action.addEventListener('click', async () => {
      action.disabled = true;
      try {
        if (message.restored) undo(message);
        else if (await confirmRestore()) restore(message);
        else return;
        $('status').textContent = 'Demo action completed. Your real mailbox has not changed.';
        render();
      } catch (error) {
        $('status').textContent = error.message;
      } finally { action.disabled = false; }
    });
    actions.append(action);
    // Keep the undo action visible until explicitly undone or the demo resets.
    if (!message.restored) {
      const dismiss = node('button', 'Dismiss for now');
      dismiss.type = 'button';
      dismiss.addEventListener('click', () => {
        message.dismissed = true;
        $('status').textContent = 'Dismissed from this demo scan. Reset the demo to bring it back.';
        render();
      });
      actions.append(dismiss);
    }
    card.append(actions);
    $('items').append(card);
  }
}

for (const key of ['spam', 'promotions']) $(key).addEventListener('click', () => { category = key; render(); });
$('show-all').addEventListener('change', render);
$('scan').addEventListener('click', () => {
  if (messages.some(m => m.restored) && !window.confirm('Start a new demo scan? This resets simulated changes and undo actions.')) return;
  messages = createDemo(); scanned = true;
  $('status').textContent = `Checked ${messages.length} fictional messages; ${messages.filter(m => m.candidate).length} have correspondence evidence. Counts follow the current filter.`;
  render();
});
$('reset').addEventListener('click', () => {
  if (messages.some(m => m.restored) && !window.confirm('Reset simulated changes and undo actions?')) return;
  messages = []; scanned = false; category = 'spam'; $('show-all').checked = false;
  $('status').textContent = 'Demo reset. Start a scan to try again.';
  render();
});
render();
