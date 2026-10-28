// Serves files for the game runner on demand. Keep this file next to the HTML page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function ask(streamId, path) {
  const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hosts = cs.filter(c => !c.url.includes('/__game/') && !c.url.startsWith('about:'));
  if (!hosts.length) throw new Error('Runner page is closed');
  return new Promise((resolve, reject) => {
    let settled = false;
    const ports = [];
    const t = setTimeout(() => finish(reject, new Error('timeout')), 180000);
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      ports.forEach(port => port.close());
      callback(value);
    }
    let sent = 0;
    for (const host of hosts) {
      const mc = new MessageChannel();
      ports.push(mc.port1);
      mc.port1.onmessage = m => finish(resolve, m.data);
      try {
        host.postMessage({ streamId, path }, [mc.port2]);
        sent++;
      } catch (err) {
        mc.port1.close();
      }
    }
    if (!sent) finish(reject, new Error('Could not reach runner page'));
  });
}

async function handle(req, streamId, path) {
  try {
    const r = await ask(streamId, path);
    if (!r || !r.blob) return new Response('Not found: ' + path, { status: 404 });
    const h = new Headers({ 'Content-Type': r.type || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    if (r.encoding) { h.set('Content-Encoding', r.encoding); return new Response(r.blob, { status: 200, headers: h }); }
    const size = r.blob.size, rg = req.headers.get('range');
    h.set('Content-Length', String(size));
    if (req.method === 'HEAD') return new Response(null, { status: 200, headers: h });
    const m = rg && /^bytes=(\d*)-(\d*)$/i.exec(rg.trim());
    if (m) {
      let s, en;
      if (m[1] === '' && m[2] === '') {
        s = size;
        en = size - 1;
      } else if (m[1] === '' && m[2] !== '') {
        const suffix = Number(m[2]);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) s = size;
        else s = Math.max(0, size - suffix);
        en = size - 1;
      } else {
        s = Number(m[1]);
        en = m[2] === '' ? size - 1 : Number(m[2]);
      }
      if (!Number.isSafeInteger(s) || !Number.isSafeInteger(en) || s > en || s >= size) {
        h.set('Content-Range', 'bytes */' + size);
        return new Response(null, { status: 416, headers: h });
      }
      en = Math.min(en, size - 1);
      h.set('Content-Range', 'bytes ' + s + '-' + en + '/' + size);
      h.set('Content-Length', String(en - s + 1));
      return new Response(r.blob.slice(s, en + 1), { status: 206, headers: h });
    }
    return new Response(r.blob, { status: 200, headers: h });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const i = u.pathname.indexOf('/__game/');
  if (i < 0) return;
  const parts = u.pathname.slice(i + 8).split('/');
  const streamId = parts.shift();
  e.respondWith(handle(e.request, streamId, decodeURIComponent(parts.join('/'))));
});
