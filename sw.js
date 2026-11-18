/* Today's style peek — service worker
 *
 * The app is built to run without a network. The shell (html/css/js, ~5 MB) is
 * precached on install; the heavy things it pulls in on demand — MediaPipe wasm
 * and models, three.js meshes, textures (~55 MB) — are cached the first time
 * they are fetched, so the second run works with the radio off.
 *
 * Only same-origin GETs are touched. The marketplace API is cross-origin and is
 * always left to the network.
 */
const VERSION = 'tsp-v1';
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261031b",
  "./vendor/tfjs/tf-core.min.js",
  "./vendor/tfjs/tf-backend-webgl.min.js",
  "./vendor/tfjs/tf-converter.min.js",
  "./vendor/tfjs/body-segmentation.min.js",
  "./mediapipe/selfie_segmentation/selfie_segmentation.js",
  "./vendor/three/three.min.js",
  "./vendor/three/loaders/MTLLoader.js",
  "./vendor/three/loaders/OBJLoader.js",
  "./vendor/three/loaders/GLTFLoader.js",
  "./js/01-face-landmarker.js?v=20261119offline",
  "./js/02-state-sections.js?v=20261110neck",
  "./js/21-body-base.js?v=20261119fit",
  "./js/03a-hair-mask.js?v=20261119offline",
  "./js/03b-mask-memory.js?v=20261117nm",
  "./js/04-structure-tensor.js?v=20261116stripe",
  "./js/05-capture-nav.js?v=20261119offline",
  "./js/06-ui-panels.js?v=20261115sec",
  "./js/07a-render-canvas.js?v=20261013m",
  "./js/07b-render-compare.js?v=20261117photo2",
  "./js/08-cut-engine.js?v=20261013m",
  "./js/09-strand-dye.js?v=20261108off",
  "./js/10-hair-render-2d.js?v=20261118curlup",
  "./js/38-raw-trace.js?v=20261118curlup",
  "./js/11-result-screen.js?v=20261013m",
  "./js/12a-head-project.js?v=20261110neck",
  "./js/12b-head-measure.js?v=20261110persp",
  "./js/13a-outfit-pose.js?v=20261116drape",
  "./js/13b-lift-fields.js?v=20261117nm",
  "./js/13c-scalp-sections.js?v=20261108off2",
  "./js/14-hair-3d-ops.js?v=20261013m",
  "./js/15-project-3d.js?v=20261013m",
  "./js/21-braid.js?v=20261013m",
  "./js/16-style-spec-diag.js?v=20261013m",
  "./js/17a-mannequin.js?v=20261115brow",
  "./js/17b-cut3d-piece.js?v=20261119mid",
  "./js/14c-curl-bundle.js?v=20261118ring",
  "./js/18-perf-i18n-boot.js?v=20261116hd",
  "./js/19-stage-backdrop.js?v=20261013m",
  "./js/20-outfit-match.js?v=20261013m",
  "./js/22-ui-i18n-extra.js?v=20261025b",
  "./js/23-section-all.js?v=20261013m",
  "./js/24-style-base.js?v=20261013m",
  "./js/25-treatment-spec.js?v=20261013m",
  "./js/26-hair-clump.js?v=20261013m",
  "./js/27-perf-tune.js?v=20261013m",
  "./js/28-perf-probe.js?v=20261102t",
  "./js/29-hairpin-3d.js?v=20261013m",
  "./js/30-saved-photos.js?v=20261013m",
  "./js/31-i18n-en.js?v=20261017b",
  "./js/35-salon-bridge.js?v=20261115sec2",
  "./js/36-erase-strand.js?v=20261101z",
  "./js/37-groom-recipe.js?v=20261101z",
  "./js/39-mv-depth.js?v=20261117nm",
  "./js/42-sil-length.js?v=20261110sil",
  "./js/40-device-audit.js?v=20261108f",
  "./js/41-head-tilt.js?v=20261118stand",
  "./js/43-photo-amp-gain.js?v=20261118ring4",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./manifest.json"
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // one bad entry must not fail the whole install
    await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // marketplace API etc.

  // Navigations: try the network so updates land, fall back to the cached page.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', net.clone()).catch(() => {});
        return net;
      } catch (err) {
        const c = await caches.open(VERSION);
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: cache first, then fill the cache from the network.
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, { ignoreVary: true });
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net && net.ok && net.type === 'basic') c.put(req, net.clone()).catch(() => {});
      return net;
    } catch (err) {
      const loose = await c.match(req, { ignoreSearch: true, ignoreVary: true });
      if (loose) return loose;
      throw err;
    }
  })());
});
