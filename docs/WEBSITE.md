# Inbox Rescue website

The English site is in `website/`. It contains a homepage, installation guide, privacy policy, terms, and local assets. It has no JavaScript, analytics, Gmail authorization, or mailbox data collection form. Contact links use the owner-approved support address yexunyang7@gmail.com. The illustration is explicitly labeled as fictional.

The separate Sites checkout was prepared, but its credential handoff was blocked by the execution environment's approval policy; no Sites deployment has been verified. The repository copy can be hosted using the included GitHub Pages workflow after the owner enables Pages.

## Enable GitHub Pages

1. In the GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push the website commit to main. If it was already pushed before enabling Pages, open **Actions → Publish website → Run workflow**.
4. Wait for the workflow to succeed and use the URL shown in Settings → Pages or the deployment result. The expected project-site address is https://Zack-cpu.github.io/inbox-rescue/; use the actual returned URL as authoritative.

The site uses relative links and works under a project subpath, on a custom domain, or as a static local folder. The workflow deploys only `website/`, not extension files, tokens, or credentials.

## Before Google submission

- Confirm every page is publicly accessible without login and all download/contact links work.
- Choose and verify appropriate site/domain ownership through Google Search Console. A GitHub Pages deployment alone is not proof that Google's domain/branding requirements are satisfied. A verified custom domain can be added later; follow Google's current validation requirements.
- Review and confirm the published privacy commitments and terms, then ensure the OAuth consent screen uses the same app name, support mailbox, homepage, and privacy URL.
- The current content continues to state that real Gmail is invite-only and Google verification is incomplete.
- Do not claim ownership of chromiumapp.org; the browser identity callback and its review handling are separate from ownership of the informational website.

## Preview locally

From the repository root:

```sh
python -m http.server 8127 --bind 127.0.0.1 --directory website
```

Then open http://127.0.0.1:8127. The Pages URL should only be entered in Google Cloud after deployment and ownership validation are confirmed.
