const fixtures = [
  {id: 'meeting', sender: 'Alex Morgan <alex@example.com>', subject: 'Re: Friday meeting plans', labels: ['SPAM', 'UNREAD'], reasons: ['This conversation includes a message you sent.'], warnings: [], candidate: true},
  {id: 'invoice', sender: 'Jamie Chen <jamie@example.com>', subject: 'Updated invoice for your review', labels: ['SPAM', 'CATEGORY_PROMOTIONS'], reasons: ['You contacted this address in recent sent messages.'], warnings: ['The headers report an authentication failure. Verify the sender before restoring.'], candidate: true},
  {id: 'booking', sender: 'River Studio <hello@example.com>', subject: 'Your workshop booking details', labels: ['INBOX', 'CATEGORY_PROMOTIONS'], reasons: ['You contacted this address in recent sent messages.'], warnings: [], candidate: true},
  {id: 'offer', sender: 'Weekly Deals <deals@example.com>', subject: 'This week’s offers', labels: ['INBOX', 'CATEGORY_PROMOTIONS'], reasons: [], warnings: [], candidate: false},
  {id: 'unknown', sender: 'Prize Desk <prize@example.net>', subject: 'Claim your surprise reward', labels: ['SPAM'], reasons: [], warnings: ['No recent correspondence was found. Review carefully.'], candidate: false},
];

export function createDemo() {
  return structuredClone(fixtures);
}

// Use scan-time labels to keep restored messages available for undo in their queue.
export function categoryOf(message) {
  return message.labels.includes('SPAM') ? 'spam' : 'promotions';
}

export function selectMessages(messages, category, showAll) {
  return messages.filter(m => !m.dismissed && categoryOf(m) === category && (showAll || m.candidate));
}

export function restore(message) {
  if (message.restored) throw new Error('This message has already been restored.');
  const labels = message.currentLabels || message.labels;
  message.delta = {
    added: ['INBOX', 'CATEGORY_PERSONAL'].filter(label => !labels.includes(label)),
    removed: labels.filter(label => ['SPAM', 'CATEGORY_PROMOTIONS'].includes(label)),
  };
  message.currentLabels = [...new Set([...labels.filter(label => !message.delta.removed.includes(label)), ...message.delta.added])];
  message.restored = true;
}

export function undo(message) {
  if (!message.restored) throw new Error('There is no restore to undo.');
  message.currentLabels = [...new Set([...message.currentLabels.filter(label => !message.delta.added.includes(label)), ...message.delta.removed])];
  message.restored = false;
  delete message.delta;
}
