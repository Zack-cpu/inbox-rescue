import {readFile, writeFile, mkdir, copyFile, readdir} from 'node:fs/promises';
import {createHash, createPublicKey} from 'node:crypto';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DEFAULT_CLIENT_ID} from '../extension/oauth-config.mjs';
import {validateClientId} from '../extension/auth.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FILES = ['background.js', 'demo.mjs', 'auth.mjs', 'gmail.mjs', 'panel.html', 'panel.css', 'panel.js', 'options.html', 'options.js'];

export function extensionId(publicKey) {
  const der = Buffer.from(publicKey, 'base64');
  createPublicKey({key: der, format: 'der', type: 'spki'});
  return [...createHash('sha256').update(der).digest('hex').slice(0, 32)].map(h => String.fromCharCode(97 + parseInt(h, 16))).join('');
}

export async function buildRelease({outputDir, publicKey, clientId = DEFAULT_CLIENT_ID}) {
  clientId = validateClientId(clientId);
  const id = extensionId(publicKey);
  const output = resolve(outputDir);
  const normalizedOutput = output.toLowerCase(), normalizedRoot = root.toLowerCase();
  if (normalizedOutput === normalizedRoot || normalizedOutput.startsWith(normalizedRoot + '/') || normalizedOutput.startsWith(normalizedRoot + '\\')) throw new Error('Release output must be outside the source repository.');
  await mkdir(output, {recursive: true});
  const expected = new Set([...FILES, 'manifest.json', 'oauth-config.mjs', 'README.md', 'release-info.json', 'LICENSE', 'INSTALL.md']);
  if ((await readdir(output)).some(file => !expected.has(file))) throw new Error('Output contains unexpected files. Choose a clean release folder.');
  // Copy an explicit file list: credentials, tokens, caches and tests never enter the bundle.
  for (const file of FILES) await copyFile(join(root, 'extension', file), join(output, file));
  await copyFile(join(root, 'LICENSE'), join(output, 'LICENSE'));
  await copyFile(join(root, 'docs/INSTALL.md'), join(output, 'INSTALL.md'));
  const manifest = JSON.parse(await readFile(join(root, 'extension/manifest.json'), 'utf8'));
  manifest.key = publicKey;
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(output, 'oauth-config.mjs'), `// Public project client ID; no client secret or user token.\nexport const DEFAULT_CLIENT_ID = ${JSON.stringify(clientId)};\n`);
  const redirect = `https://${id}.chromiumapp.org/oauth2`;
  await writeFile(join(output, 'README.md'), `# Inbox Rescue\n\nOpen edge://extensions or chrome://extensions, enable Developer mode, choose Load unpacked, and select this extracted folder. Pin Inbox Rescue and open it beside Gmail. Click Connect Gmail, choose your account, and approve access. Your first scan starts automatically.\n\nThis is a test release. The maintainer must register its redirect URL and allow your account in Google Cloud while the app is in Testing. You do not need to create a Cloud project, install Python, or supply a client ID.\n\nAccess is temporary. Reconnect if prompted. Only confirmed restore/undo actions change message labels.\n\nMaintainer redirect URL: ${redirect}\n`);
  await writeFile(join(output, 'release-info.json'), JSON.stringify({version: manifest.version, extensionId: id, redirect, clientId, distribution: 'unpacked-test'}, null, 2) + '\n');
  return {output, id, redirect};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {publicKey} = JSON.parse(await readFile(join(root, 'scripts/extension-public-key.json'), 'utf8'));
  const result = await buildRelease({outputDir: process.argv[2] || resolve(root, '../inbox-rescue-extension-v0.3.0'), publicKey});
  console.log(JSON.stringify(result, null, 2));
}
