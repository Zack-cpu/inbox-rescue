# Privacy summary — browser extension Preview

Last updated: October 21, 2026.

Inbox Rescue is an open-source Gmail review assistant. This summary describes the browser extension, not the optional Python prototype. It is a factual Preview summary; it is not a claim that Google verification is complete.

## What is accessed

After you explicitly connect, the extension requests Google's gmail.modify scope. It reads the connected Gmail address, message identifiers, label metadata, sender/recipient headers, subjects, and available authentication header text. Gmail metadata responses may also include snippets, which are not rendered or deliberately persisted. Recent sent-message headers are used to find prior correspondence.

The Google scope is broad and technically permits sending. The extension implements no sending operation. It does not render mail HTML, load email images or attachments, scrape the Gmail page, or automatically restore messages.

## Where processing happens

Gmail requests go directly from your browser to Google. This version has no app server, telemetry, advertising integration, or third-party AI processing. The project does not receive your mailbox through its own server. Google and your browser process authorization and API requests under their own policies.

## Local state and retention

Access tokens and the connected address are held in browser-session storage until expiry, browser-session reset, or disconnect. Legacy development builds may have saved a public client ID in local extension storage; it is not a user credential, and the configured release uses its bundled public client ID.

Fetched metadata, dismissals, and undo state are held in panel memory. Clearing, rescanning, disconnecting, reconnecting, or reloading can remove these records. Label changes already applied to Gmail remain until changed again. Session storage and memory are not an operating-system credential vault, and the browser/OS may retain their own state.

## Your choices

You can use the fictional demo without connecting. Real label changes require an explicit restore confirmation or undo action. Disconnect clears local authorization and attempts Google token revocation. If revocation cannot be confirmed, remove Inbox Rescue from your Google Account's third-party connections. Removing the extension clears its local extension storage; it does not by itself revoke Google's grant or reverse past label changes.

## Feedback and contact

Project questions and requests to arrange private contact can be raised at https://github.com/Zack-cpu/inbox-rescue/issues. Do not publish mailbox contents, personal addresses, tokens, or credentials in issues. Avoid sending real message data when synthetic examples can reproduce a problem.

This project is not affiliated with Google or Microsoft. A production privacy policy, verified-domain hosting, and the applicable reviews remain release prerequisites for general Gmail access.
