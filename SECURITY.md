# Security and privacy

This prototype is for one user on a trusted local computer. Do not expose its port to a LAN or the internet. It has local Host validation and a per-process action token, but no user login or multi-user isolation.

OAuth credentials and tokens are stored unencrypted in `data/`. Protect that directory with OS permissions; it is excluded from Git and Docker images. Windows users must rely on Windows ACLs, not Unix mode bits. Disconnect by revoking the app in Google Account connections and deleting `data/token.json`; deleting the token alone does not revoke it.

No AI or analytics receives mail. Gmail receives API requests. Metadata is processed in memory; Gmail's response may include a snippet, which is not displayed or stored. SQLite stores message IDs and label deltas. Email HTML, images and attachments are never rendered.

Relationships and authentication headers are evidence, not proof of safety. Headers may be forged or copied. Verify suspicious messages in Gmail. Restoring does not guarantee future classification.

If Gmail accepts an update but the process crashes before recording success, the outcome can be uncertain. Inspect Gmail before retrying. Undo buttons last until refresh/rescan; the local audit remains. Undo keeps unrelated labels but is not transactional with concurrent Gmail changes.

Report vulnerabilities privately through GitHub security reporting if available; otherwise request a private contact without publishing secrets or exploit details.
