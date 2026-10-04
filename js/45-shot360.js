/* ==========================================================================
 * 45-shot360.js — 360° 촬영 (도와주는 사람이 폰을 들고 손님 둘레를 한 바퀴)
 *
 * 로드 위치: index.html에서 44-fitting.js 다음.
 *
 * 설계(2026-10-03~04 사용자와 정함):
 *   · 폰(후면 카메라)을 손님 머리로 향한 채 한 바퀴 돌며 연속 촬영.
 *   · 폰 회전 센서로 "지금 몇 도 돌았나"를 재서, 일정 각도마다 한 장씩 자동으로 뽑습니다(기본 30° 간격 12장 + ±45° 2장).
 *     각도 근처에서 여러 장 중 가장 선명한 것을 남깁니다(걸으면서 찍으면 흔들리므로).
 *   · 화면에 보여 주고 지금 흐름에 넣는 것은 4장(정면 0° · 좌 +45° · 우 −45° · 후면 180°) — 기존 슬롯에 그대로 들어갑니다.
 *     나머지는 "정보용"으로 state.shots360에 들고 있습니다(다시 기르기가 이 사진들까지 읽게 하는 것은 다음 단계 —
 *     실제 촬영본이 있어야 맞출 수 있습니다).
 *   · 좌/우 판정: 폰이 도는 방향(센서)만으로는 "손님의 왼쪽인지"가 기기마다 뒤집힐 수 있어,
 *     촬영 초반 얼굴이 보이는 구간에서 얼굴 각도(기존 얼굴 인식)와 맞춰 자동으로 정합니다. [좌우 바꾸기]로 뒤집을 수 있습니다.
 *   · 세트 저장: 이 기기에 저장(다음에 불러오기) · 파일로 내보내기(.json — 개발 때 그대로 보내 주면 됨) · 가져오기.
 *   · 센서가 없는 기기(노트북)는 [수동 찍기] — 버튼을 누를 때마다 다음 각도 칸에 한 장.
 *
 * 촬영 요령(화면에도 안내): 손님 정면에서 [시작] → 머리가 타원 안에 오게 유지 → 천천히 한 바퀴(15~20초) →
 *   출발점에 돌아오면 [완료]. 손님은 고개·머리카락을 움직이지 않습니다.
 *
 * 끄기: SHOT360.on=false (버튼 숨김 — 새로고침)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[360 촬영]';
  var Q = W.SHOT360 = Object.assign({
    on: true,
    stepDeg: 30,          // 뽑는 간격
    extra: [45, -45],     // 추가로 뽑는 각도(좌·우 표시용)
    tolDeg: 7,            // 목표 각도 ± 이만큼 안에서 뽑음
    maxSide: 1280,        // 저장 해상도(긴 변)
    jpeg: 0.9,
    slowDegPerSec: 50,    // 이보다 빨리 돌면 "천천히"
    maxTries: 4,          // 한 각도에서 더 선명한 장으로 바꿔 보는 횟수
    sign: 0               // +1/-1 = 좌우 고정 · 0 = 자동(얼굴 각도로 정함, 못 정하면 기본 -1)
  }, W.SHOT360 || {});
  if (!Q.on) return;

  var DB = 'gyeol-shot360', STORE = 'sets', KEY = 'last';
  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function wrap(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d === -180 ? 180 : d; }
  function toast(t) { try { if (typeof showToast === 'function') showToast(t); } catch (e) {} }

  /* 목표 각도(센서 기준 raw 각도 — 부호를 뒤집어도 같은 집합) */
  function targets() {
    var a = [], d, i;
    for (d = -180 + Q.stepDeg; d <= 180; d += Q.stepDeg) a.push(wrap(d));
    (Q.extra || []).forEach(function (x) { x = wrap(x); if (a.indexOf(x) < 0) a.push(x); if (a.indexOf(wrap(-x)) < 0) a.push(wrap(-x)); });
    a.sort(function (x, y) { return x - y; });
    return a;
  }

  /* ── 폰이 향한 방위(후면 카메라가 보는 방향) ──────────────────────────── */
  function headingOf(e) {
    if (e == null || e.alpha == null || e.beta == null || e.gamma == null) return null;
    var k = Math.PI / 180, a = e.alpha * k, b = e.beta * k, g = e.gamma * k;
    var cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
    // 기기 -Z축(후면 카메라)이 땅 좌표에서 향하는 방향 → 수평 성분의 방위
    var vx = -(cA * sG + sA * sB * cG), vy = -(sA * sG - cA * sB * cG);
    if (Math.hypot(vx, vy) < 0.15) return null;         // 폰이 하늘/바닥을 봄 — 방위를 못 정함
    return Math.atan2(vx, vy) / k;
  }

  /* ── 세트 저장(IndexedDB) ─────────────────────────────────────────────── */
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onerror = function () { rej(r.error); };
        r.onsuccess = function () {
          var db = r.result, t = db.transaction(STORE, mode), out = fn(t.objectStore(STORE));
          t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); db.close(); };
          t.onerror = function () { rej(t.error); db.close(); };
        };
      } catch (e) { rej(e); }
    });
  }
  Q.saveSet = function (set) { return idb('readwrite', function (s) { return s.put(set, KEY); }); };
  Q.loadSet = function () { return idb('readonly', function (s) { return s.get(KEY); }).catch(function () { return null; }); };

  /* ── 세트 → 기존 4장 슬롯 ─────────────────────────────────────────────── */
  function nearest(frames, deg, maxOff) {
    var best = null, bd = 1e9;
    frames.forEach(function (f) { var d = Math.abs(wrap(f.deg - deg)); if (d < bd) { bd = d; best = f; } });
    return best && bd <= maxOff ? best : null;
  }
  /* set.frames[].deg 는 앱 기준 각도(+ = 손님의 왼쪽이 보이는 쪽) */
  Q.applySet = function (set) {
    if (!set || !set.frames || !set.frames.length) { toast('The 360° set is empty'); return Promise.resolve(false); }
    var pick = { front: nearest(set.frames, 0, 20), left: nearest(set.frames, 45, 25), right: nearest(set.frames, -45, 25), back: nearest(set.frames, 180, 35) };
    var miss = Object.keys(pick).filter(function (k) { return !pick[k]; });
    if (miss.length) { toast('The 360° set has no ' + miss.join(' / ') + ' photo — please shoot again'); return Promise.resolve(false); }
    var cap = (typeof capShotDataURL === 'function') ? capShotDataURL : function (u) { return Promise.resolve(u); };
    var angles = ['front', 'left', 'right', 'back'];
    return Promise.all(angles.map(function (a) { return cap(pick[a].url); })).then(function (urls) {
      angles.forEach(function (a, i) {
        state.shots[a] = urls[i];
        ['hairCanvases', 'hairMasks', 'baseCanvases', 'baseFillCanvases'].forEach(function (k) { if (state[k]) state[k][a] = null; });
        ['landmarks', 'captureLmStatus', 'capturePose', 'poseEars'].forEach(function (k) { if (state[k]) state[k][a] = null; });
        if (state.strandPaths) state.strandPaths[a] = null;
      });
      state.shots360 = set;
      try { state.hair3D = null; state.hair3Dneutral = null; } catch (e) {}
      try { _silhouetteAnchorCache = {}; } catch (e) {}
      try { if (typeof resetResultScreenCache === 'function') resetResultScreenCache(); } catch (e) {}
      try { if (typeof resetSkinGraft === 'function') resetSkinGraft(); } catch (e) {}
      try { stylePrepDone = false; } catch (e) {}
      try { state.currentCaptureIndex = 3; } catch (e) {}
      try { updateAngleUI(); } catch (e) {}
      angles.forEach(function (a) { try { checkCaptureLandmarks(a); } catch (e) {} });
      console.log(TAG + ' 세트 적용 — ' + set.frames.length + '장 중 정면 ' + Math.round(pick.front.deg) + '° · 좌 ' + Math.round(pick.left.deg) + '° · 우 ' + Math.round(pick.right.deg) +
        '° · 후면 ' + Math.round(pick.back.deg) + '° 를 4장 슬롯에 넣음 · 나머지 ' + (set.frames.length - 4) + '장은 정보용(state.shots360)');
      toast('360° set: ' + set.frames.length + ' photos — 4 placed in the slots');
      return true;
    });
  };
  Q.exportSet = function (set) {
    set = set || (typeof state !== 'undefined' && state.shots360);
    if (!set) { toast('No 360° set to export'); return; }
    try {
      var blob = new Blob([JSON.stringify(set)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shot360-' + new Date(set.at || Date.now()).toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(a.href); } catch (e) {} }, 2000);
    } catch (e) { console.warn(TAG + ' 내보내기 실패', e); toast('Export failed'); }
  };
  Q.importFile = function (file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var set = JSON.parse(fr.result);
        if (!set || !set.frames) throw new Error('형식이 다름');
        Q.applySet(set).then(function (ok) { if (ok) Q.saveSet(set).catch(function () {}); refreshRow(); });
      } catch (e) { toast('Could not read the 360° set file'); console.warn(TAG + ' 가져오기 실패', e); }
    };
    fr.readAsText(file);
  };

  /* ── 촬영 화면(전체 화면 덮개) ────────────────────────────────────────── */
  var ov = null, vid = null, stream = null, ring = null, info = null, btnStart = null, btnDone = null, btnManual = null, btnFlip = null, needle = null;
  var running = false, raf = null, sensorOk = false, lastEvt = null, h0 = null, cur = 0, lastDeg = null, lastT = 0, speed = 0;
  var T = [], got = {}, tries = {}, small = null, grab = null, signVote = 0, signN = 0, userFlip = false, lastFaceAt = 0;

  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }
  function btn(label, primary, fn) {
    var b = el('button', 'flex:1;min-height:44px;padding:10px 8px;border-radius:12px;font:600 14px system-ui,sans-serif;touch-action:manipulation;border:1px solid ' +
      (primary ? '#C98A4B;background:#C98A4B;color:#1b1510;' : 'rgba(255,255,255,.35);background:rgba(20,16,12,.7);color:#f3eadf;'), label);
    b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function onOri(e) { lastEvt = e; if (e && e.alpha != null) sensorOk = true; }

  function drawRing() {
    if (!ring) return;
    var s = '', R = 44, i, t, a0, a1, c, p0, p1;
    function pt(deg, r) { var k = (deg - 90) * Math.PI / 180; return [50 + r * Math.cos(k), 50 + r * Math.sin(k)]; }
    // 화면에서는 위 = 정면(0°), 시계 방향 = raw 각도 +
    for (i = 0; i < T.length; i++) {
      t = T[i]; if (Math.abs(t % Q.stepDeg) > 0.01 && Math.abs(t) !== 180) continue;
      a0 = t - Q.stepDeg / 2 + 2; a1 = t + Q.stepDeg / 2 - 2; p0 = pt(a0, R); p1 = pt(a1, R);
      c = got[t] ? '#6fdc7a' : '#5a5148';
      s += '<path d="M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + R + ' ' + R + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + '" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>';
    }
    (Q.extra || []).concat((Q.extra || []).map(function (x) { return -x; })).forEach(function (x) {
      x = wrap(x); if (T.indexOf(x) < 0) return; var p = pt(x, R - 8);
      s += '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="2.4" fill="' + (got[x] ? '#6fdc7a' : '#5a5148') + '"/>';
    });
    var n = pt(cur, R - 16), n2 = pt(cur, R + 4);
    s += '<line x1="' + n[0].toFixed(2) + '" y1="' + n[1].toFixed(2) + '" x2="' + n2[0].toFixed(2) + '" y2="' + n2[1].toFixed(2) + '" stroke="#C98A4B" stroke-width="2.5" stroke-linecap="round"/>';
    s += '<text x="50" y="47" text-anchor="middle" font-size="9" fill="#f3eadf" font-family="system-ui,sans-serif">' + Object.keys(got).length + '/' + T.length + '</text>';
    s += '<text x="50" y="58" text-anchor="middle" font-size="7" fill="#cfc5b8" font-family="system-ui,sans-serif">' + Math.round(cur) + '°</text>';
    ring.innerHTML = s;
  }
  function sharpness() {            // 작은 흑백 사본의 라플라시안 분산
    try {
      if (!small) { small = document.createElement('canvas'); small.width = 160; small.height = 120; }
      var c = small.getContext('2d', { willReadFrequently: true });
      c.drawImage(vid, 0, 0, 160, 120);
      var d = c.getImageData(0, 0, 160, 120).data, w = 160, h = 120, sum = 0, sum2 = 0, n = 0, x, y, i, v;
      function g(xx, yy) { var k = (yy * w + xx) * 4; return d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11; }
      for (y = 20; y < h - 20; y += 2) for (x = 30; x < w - 30; x += 2) {
        v = 4 * g(x, y) - g(x - 1, y) - g(x + 1, y) - g(x, y - 1) - g(x, y + 1);
        sum += v; sum2 += v * v; n++;
      }
      return n ? sum2 / n - (sum / n) * (sum / n) : 0;
    } catch (e) { return 0; }
  }
  function grabFrame() {
    var vw = vid.videoWidth, vh = vid.videoHeight; if (!vw || !vh) return null;
    var k = Math.min(1, Q.maxSide / Math.max(vw, vh));
    if (!grab) grab = document.createElement('canvas');
    grab.width = Math.round(vw * k); grab.height = Math.round(vh * k);
    grab.getContext('2d').drawImage(vid, 0, 0, grab.width, grab.height);      // 후면 카메라 — 좌우를 뒤집지 않음
    return grab;
  }
  function takeFor(t, sh) {
    var c = grabFrame(); if (!c) return false;
    var url; try { url = c.toDataURL('image/jpeg', Q.jpeg); } catch (e) { return false; }
    got[t] = { raw: t, at: cur, url: url, sharp: sh, time: Date.now() };
    tries[t] = (tries[t] || 0) + 1;
    return true;
  }
  function faceVote() {             // 얼굴이 보이는 구간에서 "센서 + 방향 = 손님의 왼쪽인가"를 맞춰 봄
    if (Q.sign || typeof detectPoseOnCanvas !== 'function') return;
    var a = Math.abs(cur); if (a < 10 || a > 55) return;
    var t = now(); if (t - lastFaceAt < 450) return; lastFaceAt = t;
    var c = grabFrame(); if (!c) return;
    var p = null; try { p = detectPoseOnCanvas(c); } catch (e) {}
    if (!p || !isFinite(p.yawDeg) || Math.abs(p.yawDeg) < 8) return;
    signVote += (p.yawDeg > 0 ? 1 : -1) * (cur > 0 ? 1 : -1) * Math.min(Math.abs(p.yawDeg), a);
    signN++;
  }
  function appSign() {
    var s = Q.sign ? (Q.sign > 0 ? 1 : -1) : (signN >= 2 && Math.abs(signVote) > 15 ? (signVote > 0 ? 1 : -1) : -1);
    return userFlip ? -s : s;
  }
  function setInfo(t) { if (info) info.textContent = t; }

  function tick() {
    raf = null; if (!running) return;
    var t = now();
    if (sensorOk && lastEvt) {
      var h = headingOf(lastEvt);
      if (h != null) {
        if (h0 == null) h0 = h;
        cur = wrap(h - h0);
        if (lastDeg != null && t > lastT) speed = speed * 0.7 + 0.3 * Math.abs(wrap(cur - lastDeg)) / ((t - lastT) / 1000);
        lastDeg = cur; lastT = t;
        // 가장 가까운 목표
        var best = null, bd = 1e9, i;
        for (i = 0; i < T.length; i++) { var d = Math.abs(wrap(cur - T[i])); if (d < bd) { bd = d; best = T[i]; } }
        if (best != null && bd <= Q.tolDeg && (tries[best] || 0) < Q.maxTries) {
          var sh = sharpness();
          if (!got[best] || sh > got[best].sharp * 1.1) takeFor(best, sh);
        }
        faceVote();
        setInfo(speed > Q.slowDegPerSec ? 'Too fast — walk slowly' : (Object.keys(got).length >= T.length ? 'All angles captured — tap Done' : 'Keep the head inside the oval and walk slowly all the way around'));
      } else setInfo('Hold the phone upright and point it at the head');
    } else setInfo('No motion sensor — use Manual shot, one photo per angle (start at the front, keep going one way)');
    drawRing();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    var go = function () {
      T = targets(); got = {}; tries = {}; h0 = null; cur = 0; lastDeg = null; speed = 0; signVote = 0; signN = 0; userFlip = false;
      running = true; btnStart.textContent = 'Restart';
      W.addEventListener('deviceorientation', onOri, true);
      setTimeout(function () { if (btnManual) btnManual.style.display = sensorOk ? 'none' : ''; }, 1500);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(go, go);      // 아이폰은 허락을 물어봄
      } else go();
    } catch (e) { go(); }
  }
  function manualShot() {           // 센서 없음: 정면(0°)부터 +방향으로 다음 빈 칸에
    if (!running) start();
    var order = T.slice().sort(function (a, b) { return ((a + 360) % 360) - ((b + 360) % 360); }), i;
    for (i = 0; i < order.length; i++) if (!got[order[i]]) { cur = order[i]; takeFor(order[i], sharpness()); break; }
    drawRing();
  }
  function finish() {
    var keys = Object.keys(got);
    if (keys.length < 4) { toast('Not enough photos — front, both sides and back are needed'); return; }
    var s = appSign(), frames = keys.map(function (k) { var f = got[k]; return { deg: wrap(s * f.raw), url: f.url, sharp: Math.round(f.sharp), time: f.time }; });
    frames.sort(function (a, b) { return a.deg - b.deg; });
    var set = { version: 1, at: Date.now(), stepDeg: Q.stepDeg, sign: s, signAuto: !Q.sign && !userFlip && signN >= 2, sensor: sensorOk, frames: frames };
    console.log(TAG + ' 완료 — ' + frames.length + '장 · 좌우 부호 ' + s + (set.signAuto ? '(얼굴 각도로 자동 · 표 ' + signN + '회 · 합 ' + Math.round(signVote) + ')' : userFlip ? '(직접 바꿈)' : '(기본값 — 얼굴 각도를 못 읽음)') +
      ' · 각도 ' + frames.map(function (f) { return Math.round(f.deg); }).join(','));
    close();
    Q.applySet(set).then(function (ok) { if (ok) Q.saveSet(set).then(refreshRow, refreshRow); });
  }
  function stopCam() { try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
  function close() {
    running = false; if (raf) { cancelAnimationFrame(raf); raf = null; }
    W.removeEventListener('deviceorientation', onOri, true);
    stopCam();
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    ov = null;
    try { if (typeof initCamera === 'function' && typeof currentScreen !== 'undefined' && currentScreen === 'capture') Promise.resolve(initCamera()).then(function () { try { updateAngleUI(); } catch (e) {} }); } catch (e) {}
  }
  /* 카메라 열기 — 앱의 전면 카메라를 막 끈 직후에는 후면 카메라가 "사용 중"으로 거절되는 기기가 있어
     (2026-10-04 실기기: "카메라를 열 수 없습니다"), 잠깐 기다렸다가 조건을 풀어 가며 다시 시도합니다. */
  function openCam(attempt) {
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { setInfo('This browser cannot open the camera'); return; }
    var tries = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false }
    ];
    var c = tries[Math.min(attempt, tries.length - 1)];
    setTimeout(function () {
      if (!ov) return;
      md.getUserMedia(c).then(function (s) {
        if (!ov) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; vid.srcObject = s;
        try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        if (attempt > 0) console.log(TAG + ' 카메라 ' + (attempt + 1) + '번째 시도에 열림');
      }, function (e) {
        console.warn(TAG + ' 카메라 실패(' + (attempt + 1) + '번째)', e && e.name, e && e.message);
        if (attempt < 5 && (!e || e.name !== 'NotAllowedError')) return openCam(attempt + 1);
        setInfo('Cannot open the camera' + (e && e.name ? ' (' + e.name + ')' : '') + (e && e.name === 'NotAllowedError' ? ' — allow camera access for this site' : ' — close other apps using the camera and try again'));
      });
    }, attempt === 0 ? 350 : 500 + attempt * 300);
  }
  Q.open = function () {
    if (ov) return;
    // 앱의 전면 카메라를 끄고 후면 카메라를 엶(폰은 두 카메라를 동시에 못 여는 경우가 많음)
    try { if (typeof cameraStream !== 'undefined' && cameraStream) { cameraStream.getTracks().forEach(function (t) { t.stop(); }); cameraStream = null; video.srcObject = null; } } catch (e) {}
    ov = el('div', 'position:fixed;inset:0;z-index:9998;background:#000;display:flex;flex-direction:column;');
    var stage = el('div', 'position:relative;flex:1;overflow:hidden;');
    vid = el('video', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;');
    vid.autoplay = true; vid.muted = true; vid.setAttribute('playsinline', '');
    var oval = el('div', 'position:absolute;left:50%;top:40%;width:56%;aspect-ratio:3/4;transform:translate(-50%,-50%);border:2px dashed rgba(232,195,158,.75);border-radius:50%;pointer-events:none;');
    var ringWrap = el('div', 'position:absolute;right:10px;top:10px;width:104px;height:104px;background:rgba(0,0,0,.45);border-radius:50%;pointer-events:none;');
    ringWrap.innerHTML = '<svg viewBox="0 0 100 100" width="104" height="104"></svg>'; ring = ringWrap.firstChild;
    info = el('div', 'position:absolute;left:10px;right:124px;top:10px;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.55);color:#f3eadf;font:600 13px/1.4 system-ui,sans-serif;',
      'Stand in front of the client and tap Start. Hold the phone upright, pointed at the head.');
    var tip = el('div', 'position:absolute;left:10px;right:10px;bottom:10px;padding:6px 10px;border-radius:10px;background:rgba(0,0,0,.45);color:#cfc5b8;font:12px/1.4 system-ui,sans-serif;',
      'One full circle in 15–20 s · the client keeps head and hair still · back at the start, tap Done');
    stage.appendChild(vid); stage.appendChild(oval); stage.appendChild(ringWrap); stage.appendChild(info); stage.appendChild(tip);
    var bar = el('div', 'display:flex;gap:8px;padding:10px;background:#15110d;flex-wrap:wrap;');
    btnStart = btn('Start', true, start);
    btnManual = btn('Manual shot', false, manualShot); btnManual.style.display = 'none';
    btnFlip = btn('Swap L/R', false, function () { userFlip = !userFlip; toast(userFlip ? 'Left/right swapped' : 'Left/right back to automatic'); });
    btnDone = btn('Done', true, finish);
    bar.appendChild(btn('Close', false, close)); bar.appendChild(btnStart); bar.appendChild(btnManual); bar.appendChild(btnFlip); bar.appendChild(btnDone);
    ov.appendChild(stage); ov.appendChild(bar);
    document.body.appendChild(ov);
    T = targets(); got = {}; cur = 0; drawRing();
    openCam(0);
  };

  /* ── 촬영 화면의 버튼 줄 ──────────────────────────────────────────────── */
  var rowEl = null, fileIn = null;
  function small_btn(label, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-ghost'; b.textContent = label;
    b.style.cssText = 'flex:1;font-size:12px;padding:9px 6px;white-space:nowrap;';
    b.addEventListener('click', fn); return b;
  }
  function refreshRow() {
    var host = document.querySelector('#screen-capture .capture-actions');
    if (!host || !host.parentNode) return;
    if (!rowEl) {
      rowEl = document.createElement('div');
      rowEl.id = 'shot360Row';
      rowEl.style.cssText = 'display:flex;gap:6px;padding:0 14px 10px;flex-shrink:0;flex-wrap:wrap;';
      host.parentNode.insertBefore(rowEl, host.nextSibling);
      fileIn = document.createElement('input'); fileIn.type = 'file'; fileIn.accept = '.json,application/json'; fileIn.style.display = 'none';
      fileIn.addEventListener('change', function (e) { Q.importFile(e.target.files && e.target.files[0]); e.target.value = ''; });
      host.parentNode.appendChild(fileIn);
    }
    rowEl.textContent = '';
    var b0 = small_btn('🔄 360° capture', Q.open); b0.className = 'btn btn-primary'; rowEl.appendChild(b0);
    Q.loadSet().then(function (set) {
      if (!rowEl) return;
      if (set && set.frames) rowEl.appendChild(small_btn('Saved 360° (' + set.frames.length + ')', function () { Q.applySet(set); }));
      if ((typeof state !== 'undefined' && state.shots360) || (set && set.frames)) rowEl.appendChild(small_btn('Export', function () { Q.exportSet((typeof state !== 'undefined' && state.shots360) || set); }));
      rowEl.appendChild(small_btn('Import', function () { fileIn.click(); }));
    });
  }
  Q.refreshRow = refreshRow;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshRow); else refreshRow();

  console.log(TAG + ' 설치 — 촬영 화면의 [360° 촬영] 버튼. 간격 ' + Q.stepDeg + '° · 세트는 state.shots360 · 내보내기 SHOT360.exportSet()');
})();
