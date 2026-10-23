# Google OAuth review preparation — Inbox Rescue

Prepared October 22, 2026. **Draft application materials, not a submitted or approved review.** Technical statements below describe the current browser extension. Confirm them against the final production build before submission.

## Application identity

| Field | Prepared value / status |
| --- | --- |
| App name | Inbox Rescue |
| Maintainer | Zack-cpu on GitHub |
| Public user support and developer-contact email | yexunyang7@gmail.com (owner-selected; confirm availability in Cloud Console) |
| Source repository | https://github.com/Zack-cpu/inbox-rescue |
| Distribution | Configured browser extension ZIP through GitHub Releases |
| Current version | 0.3.0 Preview |
| Current Google project | inbox-rescue-512306 (testing) |
| Current test client ID | 503639086098-7tb14hoknhtbfot83kbbd2jssrq7dqfi.apps.googleusercontent.com |
| Fixed unpacked test callback | https://gkkfdakddompncgecjajlajaphgogkhe.chromiumapp.org/oauth2 |
| Production project and client | To be confirmed; separate production configuration from testing |
| Public application homepage | Not available yet; publish on a site whose ownership can be verified |
| Public privacy policy URL | Not available yet; host with the homepage and link from it |
| Terms / contact pages | Prepare and link consistently with final branding requirements |
| Ownership verification | Pending site/domain choice and Search Console verification |
| Demonstration video URL | Pending real test-account recording |

Do not use a GitHub repository URL as proof that homepage/domain verification is complete. Do not claim Google approval or general Gmail access in the UI, repository, or video before approval.

## Work order

1. Confirm the support mailbox is accessible and selectable in the project's Google Auth Branding configuration. Keep developer contacts monitored as well.
2. Choose a public website address that you can control and verify. Publish the application homepage, privacy policy, and relevant terms/contact information. The support address can remain Gmail; it need not match the site's domain.
3. Verify the appropriate site/domain ownership in Google Search Console using an account associated with the production Google project. Follow Google's current validation requirements, including any browser-identity callback exceptions or questions raised by reviewers; do not attempt to claim ownership of chromiumapp.org.
4. Decide the production project/client and final distribution identity, while preserving the working test project. Update the production extension's bundled public client ID and register the actual release callback. Keep the review materials consistent with that build.
5. Complete Branding with the final app name, support mailbox, homepage and privacy URLs, authorized domains, and any other requested fields. Complete the brand verification/publishing steps shown by Google.
6. Declare gmail.modify under Data Access and use the purpose/justification text below after confirming the production feature set.
7. Record the actual production-intended authorization and real Gmail features using a test mailbox with synthetic correspondence. Upload the English demonstration as an unlisted YouTube video.
8. In Verification Center, provide the final URLs, scope justification, video link, permitted use-case selection, distribution/install instructions, and answers to data-handling questions. Check the developer/support inboxes for follow-up.
9. Complete any additional assessment or requested remediation. Client-only processing is architectural evidence, not a promise of exemption from review.

## Application purpose — form draft

Inbox Rescue is an open-source browser side panel that helps Gmail users review potentially missed messages in Spam and Promotions. It compares message sender addresses and conversation identifiers with recent sent correspondence, displays the reasons for suggested review, and lets users explicitly restore selected messages to Primary or undo that label change. Users connect their own Gmail accounts through Google authorization. The extension processes Gmail responses in the user's browser and communicates directly with Google APIs, without a project-operated application server or third-party AI service.

## Requested scope and justification — form draft

Scope: https://www.googleapis.com/auth/gmail.modify

Inbox Rescue needs read access to retrieve the connected account's Gmail address, list recent Spam/Promotions and sent messages, and read message metadata used for correspondence matching and display. It needs modification access to remove Spam/Promotions labels, add Inbox/Primary labels after the user's explicit confirmation, and reverse that label delta when the user selects Undo.

Read-only or metadata-only access cannot perform the user-requested restore and undo operations. Label-definition management permissions do not provide the required message relabeling operation. The broader mail.google.com scope is not requested. Although gmail.modify technically permits sending, Inbox Rescue implements no message-send, draft-send, forwarding, automatic restore, or permanent-delete operation.

The Gmail API methods currently used are users.getProfile, users.messages.list, users.messages.get with metadata format, and users.messages.modify. The production build should request no extra scope unless a concrete feature requires it and the justification/video is updated.

## Data access, processing, and retention — reviewer draft

- Data read: authorized Gmail address, message/thread IDs, labels, From/To/Cc/Subject headers, and available Authentication-Results text. Metadata responses may include snippets; they are not rendered or deliberately persisted.
- Processing: API requests go directly from the extension to Google. No project-operated mail server, analytics pipeline, third-party AI API, or remote executable script is used. The Gmail web page is not scraped.
- Scan coverage: up to 300 sent messages from 90 days and 100 Spam/Promotions messages from 7 days, excluding Trash. Limits are disclosed. Correspondence and authentication header text are evidence, not proof of safety.
- Authorization: browser identity window, random state, exact redirect origin/path checks, granted-scope checks, and token expiry checks. The current Edge-compatible client-side token flow has no client secret, code exchange, or refresh token. Do not describe it as an authorization-code/PKCE implementation.
- Tokens: access token and account address in chrome.storage.session, with no application disk-token file or sync storage. Google expiry ends token validity; the next expired-session check removes local session state. Browser restart/reload behavior follows browser-session storage semantics.
- Panel state: fetched metadata, dismissals, and undo deltas in memory. Clearing, rescanning, reconnecting/disconnecting, or reloading can remove those records. Existing Gmail label changes remain in Gmail.
- Disconnect: clears local authorization, then attempts Google token revocation. If the request fails, the user is instructed to remove the app in Google Account connections. Removing an extension alone does not guarantee revocation.
- No sale, ads targeting, or general model training use of Gmail data is implemented. No developer access to users' mail through an application backend exists. Do not ask users to post live mail or tokens in public GitHub issues.
- A failed label-update request can leave an uncertain result. The UI asks users to check Gmail before retrying. No durable action journal or transactional protection against concurrent external mailbox changes is currently implemented.

## Privacy policy content to finalize before hosting

Use docs/PRIVACY.md as the factual starting point, not as an already-complete production policy. Add the final website URL, effective date, public support mailbox yexunyang7@gmail.com, maintainer identity, access/use/sharing/storage/deletion details, and contact instructions. Explain what is local, what Google receives, and what the extension's actual permissions permit.

Owner-review draft for a Limited Use clause (publish only after confirming that the final application's conduct and policies support the commitment):

> Inbox Rescue's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including its Limited Use requirements. Gmail data is used only to provide the user-facing mail review and user-confirmed label-management features described in this policy. It is not sold, used for advertising, or used to train generalized AI or machine-learning models.

Do not call browser-session storage an encrypted OS credential vault. Do not claim zero data leaves the device: Gmail authorization/API traffic necessarily goes to Google. Do not promise that removing the extension reverses changes already made to Gmail.

## Demonstration recording plan

Use English UI and captions/narration. Suggested duration is 3–5 minutes; that is a recording plan, not a Google-guaranteed duration requirement. Use a dedicated test Gmail account populated with fictional correspondence. Protect unrelated personal messages and credentials without obscuring review-required identity/consent details.

1. **Introduction and distribution:** show the project homepage/download and installed extension. Explain that this is a local mail review tool. Show the real build/version and how the reviewer can load it.
2. **Authorization:** from disconnected state, click Connect Gmail. Show the actual Google account-selection and consent process, correct app name, requested Gmail permission, and relevant client ID in the browser address bar as required by Google. Do not show access tokens or client secrets.
3. **Read functionality:** complete authorization, show the connected address and automatic scan, then separate Spam and Promotions queues. Explain recent correspondence as the matching basis and show all checked messages.
4. **Modify functionality:** open a known fictional test message in Gmail, show its initial category, explicitly restore it, and show the resulting Gmail label/category. Then undo and show the original label/category restored. Narration must make clear that the extension does not send mail.
5. **Account controls:** disconnect and show the disconnected state. Explain temporary access, local session clearing, and Google revocation. Explain that existing label changes are not automatically undone.
6. **Privacy and finish:** show the hosted privacy policy and support contact. Summarize direct-to-Google requests and absence of a developer mail backend. Upload as Unlisted and check the reviewer can open the link without an extra permission request.

A fictional demo-only recording cannot substitute for showing real authorization and the Gmail read/modify feature. If more than one production OAuth client is used, include the functionality for each relevant client as requested.

## Evidence packet to assemble

- Final homepage, privacy, terms/contact URLs and ownership evidence
- Final production project/client IDs and callbacks for each supported distribution
- The exact review build/ZIP, version and download URL
- Install steps that reviewers can follow, with account-access arrangements handled privately if necessary
- Scope justification and data-flow text above, confirmed against final code
- English unlisted demonstration video
- Replies to any Google requests or assessment instructions

**Current blockers:** no public site/domain selected; no hosted production privacy policy; production project/client choice pending; review video not recorded; verification not submitted. The support mailbox has been chosen. Preparing this packet does not change the project's Testing status or authorize additional users.

## Official references (checked October 22, 2026)

- https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy
