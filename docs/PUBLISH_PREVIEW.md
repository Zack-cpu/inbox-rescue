# Publish the prepared Preview

The `Publish Preview` GitHub Actions workflow is triggered by a pushed `v0.3.0-preview` tag. It tests the extension, builds the configured package, includes the license/guide, generates a SHA-256 checksum, and publishes a GitHub prerelease with both assets.

1. Push the prepared code and tag:

   ```sh
   git push origin main
   git push origin v0.3.0-preview
   ```

2. Open the repository's **Actions → Publish Preview** run. Wait for success.
3. Open **Releases** and verify that the Preview has the extension ZIP and checksum assets. Download that ZIP and test a fresh installation, the demo, and an invited account before sharing widely.

GitHub Actions must be enabled and repository policy must permit the workflow's contents-write permission. If publishing fails after building, the `configured-preview` workflow artifact still provides the packaged files. Inspect the error before retrying. If the tag exists but no release was created, the workflow can also be started manually with that existing tag. If a release already exists, do not overwrite or recreate it automatically; inspect it first.

This workflow does not change Google Cloud settings, approve users, verify the OAuth app, or submit to a browser store. Real Gmail stays invite-only while the project is in Testing. The README and release notes disclose that limitation.
