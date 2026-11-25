// The game-file endpoint stays client-streamed; app/runtime assets are cached for offline use.
const SHELL_CACHE = 'retrotitles-shell-v4';
const RUNTIME_CACHE = 'retrotitles-runtime-v4.2.3';
const SHELL_FILES = [
  './',
  './index.html',
  './launcher.css',
  './icons.js',
  './backup-manager.js',
  './compatibility.js',
  './save-manager.js',
  './file-manager.js',
  './launcher.js',
  './pwa.js',
  './jszip.min.js',
  './favicon.svg',
  './manifest.webmanifest'
];

const streamHeaders = contentType => new Headers({
  'Content-Type': contentType,
  'Accept-Ranges': 'bytes',
  'Cache-Control': 'no-store',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const oldCaches = (await caches.keys()).filter(name =>
      (name.startsWith('retrotitles-shell-') || name.startsWith('retrotitles-runtime-')) && !keep.has(name)
    );
    await Promise.all(oldCaches.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function ask(streamId, path) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hosts = clients.filter(client => !client.url.includes('/__game/') && !client.url.startsWith('about:'));
  if (!hosts.length) throw new Error('Runner page is closed');
  return new Promise((resolve, reject) => {
    let settled = false;
    const ports = [];
    const timeout = setTimeout(() => finish(reject, new Error('timeout')), 180000);
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      ports.forEach(port => port.close());
      callback(value);
    }
    let sent = 0;
    for (const host of hosts) {
      const channel = new MessageChannel();
      ports.push(channel.port1);
      channel.port1.onmessage = message => finish(resolve, message.data);
      try {
        host.postMessage({ streamId, path }, [channel.port2]);
        sent++;
      } catch (error) {
        channel.port1.close();
      }
    }
    if (!sent) finish(reject, new Error('Could not reach runner page'));
  });
}

async function handleGameFile(request, streamId, path) {
  try {
    const file = await ask(streamId, path);
    if (!file || !file.blob) return new Response('Not found: ' + path, { status: 404, headers: streamHeaders('text/plain; charset=utf-8') });
    const headers = streamHeaders(file.type || 'application/octet-stream');
    if (file.encoding) {
      headers.set('Content-Encoding', file.encoding);
      return new Response(file.blob, { status: 200, headers });
    }
    const size = file.blob.size, range = request.headers.get('range');
    headers.set('Content-Length', String(size));
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
    const match = range && /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (match) {
      let start, end;
      if (match[1] === '' && match[2] === '') {
        start = size;
        end = size - 1;
      } else if (match[1] === '' && match[2] !== '') {
        const suffix = Number(match[2]);
        start = Number.isSafeInteger(suffix) && suffix > 0 ? Math.max(0, size - suffix) : size;
        end = size - 1;
      } else {
        start = Number(match[1]);
        end = match[2] === '' ? size - 1 : Number(match[2]);
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
        headers.set('Content-Range', 'bytes */' + size);
        return new Response(null, { status: 416, headers });
      }
      end = Math.min(end, size - 1);
      headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
      headers.set('Content-Length', String(end - start + 1));
      return new Response(file.blob.slice(start, end + 1), { status: 206, headers });
    }
    return new Response(file.blob, { status: 200, headers });
  } catch (error) {
    return new Response(String(error), { status: 500, headers: streamHeaders('text/plain; charset=utf-8') });
  }
}

async function handleAppAsset(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206 && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return await cache.match(request) || Response.error();
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return await cache.match(request)
      || await cache.match(new URL('./index.html', self.registration.scope).href)
      || new Response('RetroTitles is offline and its app shell has not been cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const url = new URL(request.url);
  const gamePath = url.pathname.indexOf('/__game/');
  if (gamePath >= 0) {
    const parts = url.pathname.slice(gamePath + 8).split('/');
    const streamId = parts.shift();
    let path;
    try {
      path = decodeURIComponent(parts.join('/'));
    } catch (error) {
      event.respondWith(new Response('Invalid game file path.', { status: 400 }));
      return;
    }
    event.respondWith(handleGameFile(request, streamId, path));
    return;
  }
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (request.headers.has('range')) return;
  event.respondWith((async () => {
    const shellCache = await caches.open(SHELL_CACHE);
    const shellMatch = await shellCache.match(request);
    if (shellMatch) return handleAppAsset(request, shellCache);
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    return handleAppAsset(request, runtimeCache);
  })());
});
