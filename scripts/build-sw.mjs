import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await collect(target)));
    else if (entry.name !== "sw.js") result.push(target);
  }
  return result;
}
const files = await collect("dist");
const hash = createHash("sha256");
for (const file of files.sort()) hash.update(await readFile(file));
const version = hash.digest("hex").slice(0, 12);
const assets = [
  "/",
  ...files.map(
    (file) => "/" + path.relative("dist", file).split(path.sep).join("/"),
  ),
];
await writeFile(
  "dist/sw.js",
  `
const CACHE = 'mind-react-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mind-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && ASSETS.includes(new URL(request.url).pathname)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(async () => {
    // Vite serves static assets with Vary: Origin; module fetches and precache
    // requests may have different Origin headers despite using the same origin.
    const match = await caches.match(request, { ignoreVary: true });
    return match || (request.mode === 'navigate' ? await caches.match('/', { ignoreVary: true }) : null) || Response.error();
  }));
});
`,
);
console.log(`Offline shell: ${assets.length} assets, ${version}`);
