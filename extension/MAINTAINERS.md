# Maintainer configuration and distribution

## Public OAuth configuration

`oauth-config.mjs` supplies the project's public Web application client ID. It is not a secret or a user credential. Never add the client secret, Python credentials JSON, access tokens, or refresh tokens to a release.

The normal panel has no setup form. For diagnostic configuration details, open the extension's **Options** from the browser's extensions page. This separate read-only page shows the build's public client ID and exact callback URL.

The Google project must enable Gmail API, request gmail.modify, and allow the intended accounts. Keep the existing working development callback while adding the release callback. Testing status still requires test users. A preconfigured client ID does not bypass Google verification, account policies, or store review.

## Build the configured test release

From the repository root with Node.js 22+:

```sh
node scripts/build-extension.mjs
```

The default output is a sibling folder named `inbox-rescue-extension-v0.3.0`. An explicit output path may be passed as the next argument. Output must be outside the source repository. The builder copies an explicit allowlist, supplies the public client ID, and injects the checked-in public test key into the manifest. It prints the fixed extension ID and callback URL and writes release-info.json.

The bundled test release's callback is:

```text
https://gkkfdakddompncgecjajlajaphgogkhe.chromiumapp.org/oauth2
```

Add that exact URL to the same Web application OAuth client's **Authorized redirect URIs**. Do not delete an older callback still used for development. Test by loading the built folder into Edge and Chrome and checking the Options page's actual callback. The public key fixes unpacked test identity; it is not a store signing key. A future store build must use that store's assigned public key/ID and register the corresponding callback separately.

When distributing a ZIP, include only the builder's declared files plus manifest.json, oauth-config.mjs, README.md, release-info.json, LICENSE, and INSTALL.md. Do not zip the repository, browser profile, or private data directory. A GitHub release/upload is a separate explicit publishing step.

Use `python scripts/package-extension.py BUILD_FOLDER OUTPUT.zip` to package the allowlisted build with LICENSE, INSTALL.md, and a SHA-256 checksum. The GitHub Preview workflow runs the same build and packaging steps after a `v0.3.0-preview` tag is pushed. It publishes a prerelease with the notes in `docs/releases/v0.3.0-preview.md`. A tag does not itself complete Google verification or invite test accounts.

## What remains before public launch

- Manually validate the configured fixed-ID package, real account selection, automatic scan, explicit restore/undo, expiry, and disconnect.
- Add invited testers under the Google project's Testing audience while gathering feedback.
- Prepare the app home page, privacy policy, permission explanation, and demonstration for the applicable Google verification process.
- Register the actual store identity/callback and complete Edge/Chrome store review. Do not describe a ZIP or Testing-mode app as generally available.
- Review the current client-side token architecture for production. It has no offline refresh or durable undo journal. If architecture changes, reassess the related privacy and Google requirements.

References: [Chrome manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/key), [Google OAuth verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
