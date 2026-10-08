/* ==========================================================================
 * 61-photo-curl.js — 곱슬 원본 머리: 컬 굵기를 사진에서 잰 값에 맞추고, 가닥이 뭉쳐서 같이 감기게
 *
 * 로드 위치: index.html 맨 끝(60-photo-check.js 다음). 42번·14c(컬 엔진)는 고치지 않습니다.
 *
 * 왜 (2026-10-08 · 사용자, 곱슬 손님 영상): "컬이 원본 사진에 비해 컬 직경이 좁고, 너무 가닥가닥 놀아. 사진에서 읽은 정보가 있을 테니,
 *   거기에 맞춰서 컬 직경과 뭉쳐 다니는 가닥들로 정리되게 해 줘."
 *   진단: 컬 75 · 컬 굵기 반경 1.3cm(뷰 중앙값) → 꺼짐(REGROW.curlRadius=false) — 웨이브 50.
 *   · 굵기 — 사진에서 반경은 재고 있었지만 쓰지 않았습니다. 42번 v5의 환산식이 실제 컬 엔진(14c 컬 묶음)과 안 맞아서(웨이브 100 + 로드 ×1.29 =
 *     한 바퀴 11cm · 두 바퀴도 안 감김 → 곧은 막대) 10/6에 꺼 둔 것입니다(42번 머리말 v8). 그래서 굵은 컬 사진도 웨이브 50짜리 잔 컬로 나왔습니다.
 *   · 뭉침 — 컬 엔진은 가닥을 다발(로드 하나에 감기는 한 타래)로 묶지만, 기본값이 다발 안에서도 가닥마다 감기는 자리(위상)를 크게 흩고(phaseJitter 1.2)
 *     다발 가운데로는 30%만 당깁니다(clumpPull 0.3). 그래서 타래가 아니라 낱가닥이 제각각 꼬불거리는 것처럼 보였습니다.
 *
 * 무엇을 (다시 기른 머리 화면에서, 사진에서 잰 컬이 lookMinCurl 이상일 때만):
 *   ① 컬 굵기 — 실제 엔진을 돌려서 "웨이브 값 → 가닥이 뼈대에서 벗어나는 거리(= 컬 반경)"를 재 둔 표(table)로, 사진에서 잰 반경이 나오는 웨이브 값을 고릅니다.
 *      REGROW.photoCurl()이 돌려주는 wave를 그 값으로 바꾸므로 — 섹션 웨이브 슬라이더 · 등록 스타일(perm.wave)에 그대로 들어갑니다.
 *      웨이브는 waveMin~waveMax 안에서만(너무 굵으면 다시 막대가 됨). 로드 배수(rodScale)는 쓰지 않습니다.
 *   ② 뭉침 모양(look) — 컬을 거는 동안만 컬 엔진의 값 네 개를 바꿉니다:
 *        pitchThick 3.5 → 1.4  굵은 로드에서도 한 바퀴 간격이 덜 늘어남(굵게 해도 감긴 모양이 남음 — ①을 켤 수 있게 된 이유)
 *        clumpPull 0.3 → 0.8 · phaseJitter 1.2 → 0.3 · microAmp 0.07 → 0.03   한 다발의 가닥이 같은 자리에서 같이 감김(타래)
 *      컬 엔진의 전역 값은 건드리지 않습니다(호출 앞뒤로 바꿨다 되돌림) → 마네킹 스타일·스타일 프로필(24번)은 예전 그대로입니다.
 *      제 머리 바탕으로 건 스타일(59번 · 마네킹 안 켬)에도 같은 모양이 걸립니다(그 화면도 다시 기른 가닥이라서).
 *
 * (2026-10-08b) ③ 타래 뼈대 — 사용자(3D 결과 화면 영상): "앞머리에서는 컬이 구현된 게 보여. 근데 나머지 머리는 가닥가닥이 제멋대로 굴곡만 좀 주며 뭉쳐 있는
 *   형태 — 저 앞머리처럼 전체에 적용되게."
 *   원인: 컬은 가닥의 "뼈대"(컬을 편 선)에 감깁니다. 한 다발의 뼈대가 나란하면(앞머리 — 전부 같은 쪽으로 내려옴) 같이 감겨 타래로 보이지만,
 *        곱슬 사진에서 다시 기른 뼈대는 가닥마다 엇갈려 있어서(곱슬은 결 정렬을 일부러 안 함) 다발이 같은 자리에서 감겨도 축이 제각각 → 낱가닥이 꼬불거리는 덩어리.
 *        재현(지어낸 가닥 · 같은 컬 값): 뼈대의 엇갈림만 키우면 타래가 사라지고 영상과 같은 모양이 됩니다.
 *   지금: 컬을 걸기 전에 뼈대를 "타래" 단위로 모읍니다.
 *     · 뿌리가 가까운(아래 2026-10-08c: 컬 지름 × 1직경) 가닥끼리 한 타래. 그 안에서 가장 여럿이 같이 가는 가닥을 길잡이로 삼고(같은 칸에서 반대로 가는 가닥은 다른 타래),
 *       나머지 가닥을 길잡이의 길로 당깁니다(lockPull · 뿌리 자리는 그대로 · 끝으로 갈수록 타래가 모임 lockTaper).
 *     · 타래끼리는 그대로 엇갈립니다 → 부피는 "타래의 엇갈림"에서 나옵니다(예전: 가닥의 엇갈림).
 *     · 다시 기른 가닥(G.model)은 안 건드립니다 — 가닥을 만들 때만 모은 뼈대를 씁니다. 그래서 결 표·스타일 등록·원본 대조는 예전 뼈대 그대로입니다.
 *     · 제 머리 바탕으로 건 곱슬 스타일(직모 손님에게 펌 스타일을 얹은 경우)에도 ②③이 걸립니다(스타일에 적힌 컬이 lookMinCurl 이상이면).
 *   끄기: PHOTO_CURL.lock=false 후 PHOTO_CURL.refresh()
 *
 * (2026-10-08c) 타래 크기 = 펌의 베이스 규칙 — 사용자가 보낸 와인딩 영상 두 개: 한 로드에 뜨는 베이스는 "로드 지름만큼의 두께 × 로드 길이만큼의 폭"인 얇은 판.
 *   예전 값(컬 반경 × 1.4 = 0.7직경)은 눈대중이었습니다. 이제 뿌리 자리 = 컬 지름(사진 반경 × 2) × lockDia(1직경).
 *   구역의 "펌·베이스 폭" 슬라이더가 이 값을 키우고 줄입니다(기본 자리 = 1직경 · 끝까지 올리면 2직경 · 끝까지 내리면 0.5직경 · 구역마다 따로).
 *   판 전체(로드 길이 폭)를 한 타래로 묶지는 않았습니다 — 로드를 풀면 판은 지름 폭쯤의 타래 여러 개로 갈라지기 때문(영상의 완성 머리).
 * 확인한 것(실제 앱 코드를 브라우저에 올리고 · 가닥은 지어낸 것): 표의 숫자 · 그림으로 본 타래 모양 · 다른 화면(마네킹)의 가닥이 점 단위로 그대로인 것.
 * ⚠ 확인 못 한 것: 실제 사진. 사진에서 재는 반경 자체가 어림값입니다(42번 curlRk) — 굵기가 사진보다 크거나 작게 나오면 PHOTO_CURL.radiusK(기본 1)로 맞춥니다.
 *   마네킹에 표를 올린 원본(직모·약한 웨이브 — 58번)과 마네킹 스타일에는 걸리지 않습니다.
 *
 * 끄기: PHOTO_CURL.on=false 후 마네킹을 켰다 끄기 · 굵기만 끄기 PHOTO_CURL.radius=false · 뭉침만 끄기 PHOTO_CURL.clump=false
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[사진 컬]';
  var PC = W.PHOTO_CURL = Object.assign({
    on: true,
    radius: true,        // ① 컬 굵기를 사진 반경에 맞춤
    clump: true,         // ② 뭉침 모양
    lookMinCurl: 30,     // 사진에서 잰 컬이 이 이상일 때만
    look: { pitchThick: 1.4, clumpPull: 0.8, phaseJitter: 0.3, microAmp: 0.03 },
    lock: true,          // ③ 타래 뼈대
    lockDia: 1.0,        // 타래 하나의 뿌리 자리 크기 = 컬 지름(사진 반경 × 2) × 이 값 — 펌에서 로드 하나에 뜨는 베이스 두께(1직경)와 같은 규칙. 반경을 못 쟀으면 lockCm
    lockBase: true,      // 그 구역의 "펌·베이스 폭" 슬라이더로 굵게/가늘게: 기본 자리(구역 기본값)에서 1직경 · 끝까지 올리면 lockBaseMax배 · 끝까지 내리면 1/lockBaseMax배
    lockBaseMax: 2,
    lockCm: 2.6, lockCmMin: 1.2, lockCmMax: 5,
    lockPull: 0.85,      // 길잡이의 길로 당기는 정도(1 = 완전히 나란히)
    lockRootCm: 1.0,     // 뿌리에서 이만큼은 서서히(뿌리는 제자리)
    lockTaper: 0.45, lockTaperCm: 5,   // 끝으로 갈수록 타래가 모임: 뿌리 간격의 이 비율까지 · 이 길이에 걸쳐
    lockDot: 0.5,        // 길잡이와 가는 쪽이 이만큼은 같아야 같은 타래(아니면 그 칸의 둘째 타래 · 그것도 아니면 그대로)
    radiusK: 1,          // 사진에서 잰 반경에 곱하는 보정(굵기가 사진과 다르면 이것으로)
    waveMin: 30, waveMax: 90,
    // 실제 컬 엔진(뭉침 모양을 건 상태)으로 잰 값: 컬 값 → [웨이브, 가닥이 뼈대에서 벗어나는 거리 cm(중앙값)] (2026-10-08 · 가닥 15~27cm · 엔진 자 19.33cm/단위)
    table: {
      50: [[30, 0.56], [50, 0.73], [60, 0.79], [70, 0.89], [80, 1.04], [90, 1.33]],
      75: [[30, 0.72], [50, 0.95], [60, 1.04], [70, 1.14], [80, 1.37], [90, 1.78]],
      90: [[30, 0.75], [50, 0.93], [60, 1.01], [70, 1.08], [80, 1.26], [90, 1.33]]
    }
  }, W.PHOTO_CURL || {});
  var S = PC.stats = { rCm: null, wave: null, was: null, curl: null, why: '', look: false, calls: 0, err: null };
  var G = W.REGROW;

  function mqOn() { try { return typeof MANNEQUIN !== 'undefined' && !!MANNEQUIN.on; } catch (e) { return false; } }
  function waveInRow(row, r) {             // 그 컬 값에서 반경 r이 나오는 웨이브(표 밖은 끝 값)
    var i, a, b;
    if (r <= row[0][1]) return row[0][0];
    for (i = 1; i < row.length; i++) { a = row[i - 1]; b = row[i]; if (r <= b[1]) return a[0] + (b[0] - a[0]) * (r - a[1]) / Math.max(1e-6, b[1] - a[1]); }
    return row[row.length - 1][0];
  }
  PC.waveFor = function (rCm, curl) {
    var keys = Object.keys(PC.table).map(Number).sort(function (x, y) { return x - y; }), i, w;
    if (!keys.length || !(rCm > 0)) return 50;
    if (curl <= keys[0]) w = waveInRow(PC.table[keys[0]], rCm);
    else if (curl >= keys[keys.length - 1]) w = waveInRow(PC.table[keys[keys.length - 1]], rCm);
    else for (i = 1; i < keys.length; i++) if (curl <= keys[i]) {
      var w0 = waveInRow(PC.table[keys[i - 1]], rCm), w1 = waveInRow(PC.table[keys[i]], rCm), t = (curl - keys[i - 1]) / (keys[i] - keys[i - 1]);
      w = w0 + (w1 - w0) * t; break;
    }
    return Math.round(Math.max(PC.waveMin, Math.min(PC.waveMax, w)));
  };

  /* ① 사진에서 잰 반경 → 웨이브 */
  if (G && typeof G.photoCurl === 'function') {
    var innerPC = G.photoCurl;
    G.photoCurl = function () {
      var out = innerPC.apply(this, arguments);
      try {
        if (PC.on && PC.radius && !G.curlRadius && out && out.value >= PC.lookMinCurl && out.rCm > 0) {
          var was = out.wave, w = PC.waveFor(out.rCm * PC.radiusK, out.value);
          out.wave = w; out.rodScale = 1; out.photoCurlWave = { was: was, rCm: out.rCm, k: PC.radiusK };
          S.rCm = out.rCm; S.wave = w; S.was = was; S.curl = out.value;
        } else if (out) { S.rCm = out.rCm || null; S.wave = null; S.curl = out.value; S.why = !PC.on ? '꺼짐' : !PC.radius ? '굵기 맞추기 꺼짐(PHOTO_CURL.radius=false)' : G.curlRadius ? '42번 굵기 적용(REGROW.curlRadius)이 켜져 있어 그쪽에 맡김' : !(out.value >= PC.lookMinCurl) ? '컬이 ' + PC.lookMinCurl + ' 미만이라 안 맞춤' : '사진에서 반경을 못 잼'; }
      } catch (e) { S.err = String(e && e.message || e); }
      return out;
    };
  } else console.warn(TAG + ' REGROW.photoCurl이 없어 컬 굵기는 못 맞춥니다');

  /* ② 뭉침 모양 — 다시 기른 머리 화면(사진에서 잰 컬이 있음)에서 컬을 거는 동안만 */
  function baseCurl() {
    var m = 0;
    try { var b = G && G.base && G.base.sections, k; if (b) for (k in b) if (b[k] && b[k].curl > m) m = b[k].curl; } catch (e) {}
    // 제 머리 바탕으로 건 스타일(59번)이 곱슬 스타일이면 그 컬로 — 직모 손님에게 펌 스타일을 얹은 경우
    try { var ns = W.FLOW_SPEC && W.FLOW_SPEC.nativeState, sp = (ns && ns.id && typeof getStyleSpec === 'function') ? getStyleSpec(ns.id) : null, c = sp && sp.flowBase ? +sp.flowBase.curl : 0; if (c > m) m = c; } catch (e) {}
    return m;
  }
  function lookActive() {
    try { return !!(PC.on && PC.clump && G && G.on && !mqOn() && typeof CURL_BUNDLE !== 'undefined' && baseCurl() >= PC.lookMinCurl); } catch (e) { return false; }
  }
  PC.lookActive = lookActive;
  /* ③ 타래 뼈대 — 모델마다 한 번 만들어 둠(가닥 → 모은 점 배열) */
  var lockMemo = { model: null, ver: -1, map: null, n: 0, locks: 0, moved: 0, ms: 0 }, lver = 0;
  function cmU() { try { var c = (typeof modelCmPerUnit === 'function') ? modelCmPerUnit() : 0; return c > 1 ? c : 19.33; } catch (e) { return 19.33; } }
  function arcs(p) { var a = new Float64Array(p.length), i; for (i = 1; i < p.length; i++) a[i] = a[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y, p[i].z - p[i - 1].z); return a; }
  function atArc(p, a, s, o) {              // 길 p(호길이 a)에서 s만큼 간 자리 → o · 끝을 넘으면 끝 방향으로 곧게
    var n = p.length, L = a[n - 1], i, t, d;
    if (s >= L) { d = Math.max(1e-9, a[n - 1] - a[n - 2]); t = (s - L) / d; o.x = p[n - 1].x + (p[n - 1].x - p[n - 2].x) * t; o.y = p[n - 1].y + (p[n - 1].y - p[n - 2].y) * t; o.z = p[n - 1].z + (p[n - 1].z - p[n - 2].z) * t; return o; }
    var lo = 0, hi = n - 1; while (hi - lo > 1) { i = (lo + hi) >> 1; if (a[i] <= s) lo = i; else hi = i; }
    t = (s - a[lo]) / Math.max(1e-9, a[hi] - a[lo]); o.x = p[lo].x + (p[hi].x - p[lo].x) * t; o.y = p[lo].y + (p[hi].y - p[lo].y) * t; o.z = p[lo].z + (p[hi].z - p[lo].z) * t; return o;
  }
  function feat(p, a, A) {                  // 가는 쪽: 뿌리 → A만큼 간 자리 · 뿌리 → 끝 (둘 다 길이 1)
    var o = { x: 0, y: 0, z: 0 }, f = new Float32Array(6), l; atArc(p, a, Math.min(A, a[p.length - 1]), o);
    f[0] = o.x - p[0].x; f[1] = o.y - p[0].y; f[2] = o.z - p[0].z; l = Math.hypot(f[0], f[1], f[2]) || 1; f[0] /= l; f[1] /= l; f[2] /= l;
    var e = p[p.length - 1]; f[3] = e.x - p[0].x; f[4] = e.y - p[0].y; f[5] = e.z - p[0].z; l = Math.hypot(f[3], f[4], f[5]) || 1; f[3] /= l; f[4] /= l; f[5] /= l;
    return f;
  }
  function fd(a, b) { return 0.5 * (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4] + a[5] * b[5]); }
  function baseOf(sec) {                    // 그 구역의 펌·베이스 폭 → 직경 배수(기본 자리 = 1)
    if (!PC.lockBase) return 1;
    try {
      var d = SECTIONS[sec] && SECTIONS[sec].defaults ? +SECTIONS[sec].defaults.base : NaN, v = state.sections && state.sections[sec] ? +state.sections[sec].base : NaN;
      if (!(d >= 0)) d = 55; if (!(v >= 0)) return 1;
      var t = v >= d ? (v - d) / Math.max(1, 100 - d) : (v - d) / Math.max(1, d);
      return Math.pow(Math.max(1, PC.lockBaseMax), Math.max(-1, Math.min(1, t)));
    } catch (e) { return 1; }
  }
  function lockCmOf(sec) {
    var cm = PC.lockCm; if (S.rCm > 0) cm = 2 * S.rCm * PC.radiusK * PC.lockDia;
    return Math.max(PC.lockCmMin, Math.min(PC.lockCmMax, cm * baseOf(sec)));
  }
  function lockSig() {
    var a = [PC.lockPull, PC.lockTaper, PC.lockDia, PC.lockCm, PC.lockCmMin, PC.lockCmMax, PC.radiusK, S.rCm || 0];
    try { if (PC.lockBase && state.sections) Object.keys(state.sections).sort().forEach(function (k) { a.push(k + '=' + (+baseOf(k)).toFixed(3)); }); } catch (e) {}
    return a.join(',');
  }
  function buildLocks(model) {
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now()), cu = cmU(), S0 = model.strands, n = S0.length, map = new Map(), cells = new Map(), i, s, p, k;
    var cmBy = {}, cmLo = Infinity, cmHi = 0, c;
    var A = 3 / cu, rootL = Math.max(1e-4, PC.lockRootCm / cu), tapL = Math.max(1e-4, PC.lockTaperCm / cu), recs = [];
    for (i = 0; i < n; i++) {
      s = S0[i]; p = s && s.pts; if (!p || p.length < 4 || !s.regrown) continue;
      var a = arcs(p); if (!(a[p.length - 1] > 1e-4)) continue;
      var sc = s.sec == null ? '' : s.sec; if (!(sc in cmBy)) { cmBy[sc] = lockCmOf(sc); cmLo = Math.min(cmLo, cmBy[sc]); cmHi = Math.max(cmHi, cmBy[sc]); }
      c = cmBy[sc] / cu;
      var r = { s: s, p: p, a: a, f: feat(p, a, A) }; k = sc + '|' + Math.floor(p[0].x / c) + ',' + Math.floor(p[0].y / c) + ',' + Math.floor(p[0].z / c);
      var g = cells.get(k); if (!g) { g = []; cells.set(k, g); } g.push(r);
    }
    var locks = 0, moved = 0, o = { x: 0, y: 0, z: 0 };
    function make(G0) {                      // 한 무리 → 길잡이를 뽑아 타래로 · 남은 가닥을 돌려줌
      var m = G0.length, lim = Math.min(m, 40), st = m / lim, best = -1, bi = 0, x, y, cnt;
      for (x = 0; x < lim; x++) { var ra = G0[Math.floor(x * st)]; cnt = 0; for (y = 0; y < lim; y++) if (fd(ra.f, G0[Math.floor(y * st)].f) >= 0.8) cnt++; if (cnt > best) { best = cnt; bi = Math.floor(x * st); } }
      var Ld = G0[bi], rest = [], mem = [], j;
      for (j = 0; j < m; j++) (fd(G0[j].f, Ld.f) >= PC.lockDot ? mem : rest).push(G0[j]);
      if (mem.length < 2) return rest.length === m ? [] : rest;
      // 길잡이의 길을 두 번 고르게(한 가닥의 잔 꺾임이 타래 전체에 복사되지 않게)
      var lp = Ld.p.map(function (q) { return { x: q.x, y: q.y, z: q.z }; }), ps, q;
      for (ps = 0; ps < 2; ps++) for (q = 1; q < lp.length - 1; q++) { lp[q] = { x: (lp[q - 1].x + 2 * lp[q].x + lp[q + 1].x) / 4, y: (lp[q - 1].y + 2 * lp[q].y + lp[q + 1].y) / 4, z: (lp[q - 1].z + 2 * lp[q].z + lp[q + 1].z) / 4 }; }
      var la = arcs(lp), r0 = Ld.p[0];
      mem.forEach(function (rc) {
        var pp = rc.p, aa = rc.a, out = new Array(pp.length), dx = pp[0].x - r0.x, dy = pp[0].y - r0.y, dz = pp[0].z - r0.z, q2, sx, tp, w;
        out[0] = pp[0];
        for (q2 = 1; q2 < pp.length; q2++) {
          sx = aa[q2]; atArc(lp, la, sx, o);
          tp = sx >= tapL ? PC.lockTaper : 1 - (1 - PC.lockTaper) * sx / tapL;
          w = PC.lockPull * Math.min(1, sx / rootL);
          out[q2] = { x: pp[q2].x + (o.x + dx * tp - pp[q2].x) * w, y: pp[q2].y + (o.y + dy * tp - pp[q2].y) * w, z: pp[q2].z + (o.z + dz * tp - pp[q2].z) * w };
        }
        map.set(rc.s, out); moved++;
      });
      locks++;
      return rest;
    }
    cells.forEach(function (g) { var rest = make(g); if (rest.length >= 2) make(rest); });
    if (!(cmHi > 0)) cmLo = cmHi = lockCmOf('');
    lockMemo = { model: model, ver: lver, sig: lockSig(), map: map, n: n, locks: locks, moved: moved, cm: cmLo, cmHi: cmHi, per: moved / Math.max(1, locks), ms: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 };
    return lockMemo;
  }
  function lockedPts(s) {
    var m = G && G.model; if (!m || !m.strands) return null;
    var sg = lockSig();
    if (lockMemo.model !== m || lockMemo.ver !== lver || lockMemo.sig !== sg) { try { buildLocks(m); } catch (e) { S.err = '타래 만들기: ' + (e && e.message || e); lockMemo = { model: m, ver: lver, sig: sg, map: new Map(), n: 0, locks: 0, moved: 0, ms: 0 }; } }
    return lockMemo.map.get(s) || null;
  }
  PC._locks = function () { return lockMemo; };
  var innerAdj = W.adjustStrandGeom;
  if (typeof innerAdj === 'function') W.adjustStrandGeom = function (s) {
    if (s && s.regrown && !s.mannequin && s.pts && PC.lock && lookActive()) {
      var lp = lockedPts(s);
      if (lp) { var keepP = s.pts; s.pts = lp; try { return innerAdj.apply(this, arguments); } finally { s.pts = keepP; } }
    }
    return innerAdj.apply(this, arguments);
  };

  var innerCurl = W.curlStrand3D;
  if (typeof innerCurl === 'function') {
    W.curlStrand3D = function () {
      if (!lookActive()) return innerCurl.apply(this, arguments);
      var CB = CURL_BUNDLE, L = PC.look, sv = {}, k;
      for (k in L) { sv[k] = CB[k]; CB[k] = L[k]; }
      S.calls++;
      try { return innerCurl.apply(this, arguments); } finally { for (k in sv) CB[k] = sv[k]; }
    };
  } else console.warn(TAG + ' curlStrand3D가 없어 뭉침 모양은 못 겁니다');
  // 서명 — 모양이 걸렸는지가 바뀌면 미리 만든 헤어도 다시
  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () {
    var s = origFS.apply(this, arguments);
    try { var a = lookActive(); return s + '|pcl' + (a ? [PC.look.pitchThick, PC.look.clumpPull, PC.look.phaseJitter, PC.look.microAmp].join(',') + (PC.lock ? 'L' + lver + ':' + lockSig() : '') : 0); } catch (e) { return s; }
  };

  PC.lines = function () {
    var a = lookActive(), L = [];
    L.push(TAG + ' ' + (PC.on ? '켜짐' : '꺼짐') +
      ' · 컬 굵기: ' + (!PC.radius ? '안 맞춤(PHOTO_CURL.radius=false)' : (S.wave != null ? '사진 반경 ' + (+S.rCm).toFixed(1) + 'cm' + (PC.radiusK !== 1 ? ' ×' + PC.radiusK : '') + ' · 컬 ' + S.curl + ' → 웨이브 ' + S.wave + '(예전 ' + S.was + ')' :
        (S.curl != null ? (S.rCm > 0 ? '사진 반경 ' + (+S.rCm).toFixed(1) + 'cm — ' : '') + (S.why || '안 맞춤') : '아직 안 잼'))) +
      ' · 뭉침 모양: ' + (!PC.clump ? '꺼짐' : (a ? '걸림(한 바퀴 간격 ' + PC.look.pitchThick + ' · 다발로 당김 ' + PC.look.clumpPull + ' · 감기는 자리 흩기 ' + PC.look.phaseJitter + ' · 잔떨림 ' + PC.look.microAmp + ')' :
        '안 걸림(다시 기른 머리 화면이 아니거나 사진 컬이 ' + PC.lookMinCurl + ' 미만)')) +
      ' · 타래 뼈대: ' + (!PC.lock ? '꺼짐' : (a && lockMemo.map ? '타래 ' + lockMemo.locks + '개(뿌리 자리 ' + (+lockMemo.cm).toFixed(1) + (lockMemo.cmHi > lockMemo.cm + 0.05 ? '~' + (+lockMemo.cmHi).toFixed(1) : '') + 'cm = 컬 지름 ' + (S.rCm > 0 ? (2 * S.rCm * PC.radiusK).toFixed(1) + 'cm' : '못 잼') + ' × ' + PC.lockDia + '직경' + (PC.lockBase ? ' × 펌·베이스 폭' : '') + ' · 타래당 ' + Math.round(lockMemo.per || 0) + '가닥) · 길잡이로 모은 가닥 ' + lockMemo.moved + '/' + lockMemo.n + ' · ' + Math.round(lockMemo.ms) + 'ms' : (a ? '아직 안 만듦' : '안 걸림'))) +
      (S.err ? ' · ⚠ ' + S.err : ''));
    return L;
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { PC.lines().forEach(function (x) { L.push(x); }); } catch (e) {}
    return L;
  };
  /* 지금 손님에게 다시 걸기(끄고 켠 뒤) — 사진에서 다시 재서 슬라이더에 넣음 */
  PC.refresh = function () {
    lver++;
    try { if (G && G.model && G.model.strands) G.model.strands.forEach(function (s) { if (s && s._fnat) s._fnat = null; }); } catch (e) {}
    try { if (G && G.on && typeof G.applyBaseline === 'function') { if (G.base) G.base = null; G.applyBaseline(); } } catch (e) { S.err = String(e && e.message || e); }
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) {}
  };
  console.log(TAG + ' 설치 — 곱슬 원본 머리의 컬 굵기를 사진에서 잰 반경에 맞추고(웨이브), 가닥이 다발로 같이 감기게 합니다. 끄기 PHOTO_CURL.on=false 후 마네킹을 켰다 끄기 · 굵기 보정 PHOTO_CURL.radiusK');
})();
