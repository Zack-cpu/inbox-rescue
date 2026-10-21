import {settings} from './auth.mjs';
try {
  const config = await settings();
  document.getElementById('client').value = config.clientId;
  document.getElementById('redirect').value = config.redirect;
  document.getElementById('details-status').textContent = config.managed ? 'The public client ID is supplied by this build.' : 'This build has no project-supplied client ID. Configure oauth-config.mjs before distributing it.';
} catch {
  document.getElementById('details-status').textContent = 'Unable to load connection details. Reload the extension and try again.';
}
