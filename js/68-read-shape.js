/* ==========================================================================
 * 68-read-shape.js — 원본 머리 = 방향필터(66번)로 읽은 모양 그대로 · 거꾸로 자란 가닥 규칙 · 뿌리 고르게
 *
 * 로드 위치: index.html에서 61-photo-curl.js 다음(64번보다 앞 — 64번의 페이드·뿌리 채움이 이 파일 바깥에서 그대로 돎).
 *
 * 왜 (2026-10-12 · 사용자):
 *   "웨이브는 방향필터를 통해서 다 제대로 읽고 있는데, 그 뒷처리를 해버려서 원래 모양이 다 사라졌어. 방향필터에서 읽은 모양대로 읽도록."
 *   "머리 위 더듬이를 그냥 눌러놨는데, 그거 방향이 반대로 자란 가닥이야. 처리하는 규칙이 있을 텐데 제대로 안 갔고."
 *   "앞이마 쪽은 뿌리가 성글고 그 바로 위쪽은 뿌리가 밀집된 곳이 띠처럼 있어. 대머리이거나 숱이 적은 곳이 아니면 균일하게."
 *   "원래 수준대로 3만 가닥 가까이."
 *
 *   읽은 웨이브가 사라진 경로(10:38 로그 · 웨이브 손님):
 *     ① 42번 직모 뼈대 — 컬 55라서 읽은 길을 한 바퀴(11cm) 창으로 두 번 펴서 축만 남김("편 가닥 15444").
 *     ② 59번 결 표 — 그 축을 다시 칸 평균 방향으로 줄임.
 *     ③ 61번 — 그 위에 사진 값(파장 6.5 · 진폭 0.52cm)으로 "지어낸" 물결을 얹음. 읽은 자리·위상은 하나도 안 남음.
 *   더듬이: 42번이 "아래쪽에 머리가 없고 두께 1.8cm 이상"인 앞머리선 뿌리 264개를 위로 뒤집어 기름(세운 앞머리 규칙).
 *     긴 웨이브는 볼륨 때문에 두께가 3.7cm라 규칙이 걸려, 위로 솟은 가닥이 생겼고 59번은 짧은 막다른 무리만 눌렀음.
 *
 * 무엇을:
 *   A. 웨이브 사진(61번 ② 고리 정도 < 0.33)은 42번 직모 뼈대를 안 씀 — 기른 가닥 = 방향필터를 따라 걸은 길 그대로.
 *      진짜 고리 컬은 예전대로(뼈대 + 컬 엔진).
 *   B. 원본 머리(마네킹 + 잰 값)를 볼 때, 마네킹 뿌리마다 가장 가까운 "기른 가닥"의 길을 그 뿌리로 옮겨 씀(모양 옮겨심기).
 *      결 표·지어낸 물결을 거치지 않음 → 읽은 굴곡·위상·결이 그대로. 슬라이더(길이·넘김·볼륨·가르마·결·윤기)는
 *      59번과 같은 "기준에서 움직인 만큼만"으로 그 위에 걸림 · 컬은 스펙 값보다 올렸을 때만 그만큼 더 감음.
 *   C. 거꾸로 자란 가닥 — 기른 가닥 전체로 1cm 칸마다 "그 자리를 지나는 가닥들이 가는 쪽"(앞뒤 있는 평균)을 내고,
 *      뿌리에서 8cm 동안 그 흐름과 반대로(평균 cos < revCos) 가는 가닥은 거꾸로 자란 것으로 봄 → 본보기에서 뺌.
 *      그 뿌리는 이웃의 바른 가닥 모양을 받음(누르는 게 아니라 결대로 다시 남).
 *      짧게 막힌 가닥(이웃 뿌리 길이 중앙값의 shortK 미만)도 본보기에서 뺌.
 *   D. 뿌리 고르게 — 13b 뿌리 밀도에서, 머리 있는 칸은 전부 보통 밀도(잰 칸 중앙값)로. 보통의 rootLow(0.6) 미만인 칸만 그대로 두고
 *      64번 ③이 작은 덩어리는 채우고 넓고 빈 덩어리(대머리·숱 적은 곳)는 남김. → 앞이마 성긴 줄 · 그 위 밀집 띠가 없어짐.
 *   (가닥 수는 48번 adjustLow/High = 30000 · 42번 measureShare = 1로 같이 고침)
 *
 * (2026-10-12b) 다시 올림 — 사용자: "웨이브를 방향 필터에서 제대로 읽어두고 그 뒤에 여러 번 바꿔버리고 있어. 있는 그대로 그려지게. 컬도 포함.
 *   더듬이는 누르지 말고 반대방향으로 자란 가닥이니까 처리하는 규칙에 포함되도록."
 *   · A를 컬에도 — 웨이브·고리 컬 모두 42번 직모 뼈대(①)를 안 씀. 기른 가닥 = 방향필터를 따라 걸은 길 그대로.
 *     옮겨심은 원본 머리는 59번 표(②)·61번 지어낸 물결/컬(③)을 안 거치므로 컬을 두 번 감지 않음(슬라이더로 스펙보다 올린 만큼만 더 감음).
 *   · C 그대로 — 더듬이(42번이 위로 뒤집어 기른 가닥 포함)는 눌러 펴지 않고 "거꾸로 자란 가닥"으로 봐서 본보기에서 빼고, 그 뿌리는 이웃의 바른 가닥 모양을 받음.
 *   · D(뿌리 고르게)는 이번 요청이 아니라 기본 꺼짐(evenRoots=false) · 가닥 수(48·42번)는 손대지 않음.
 * (2026-10-12g) 폰 확인 뒤 다시 — 사용자: "컬이 다 죽었어 · 마네킨을 안 켠 거 같은 느낌 · 얼굴·턱 아래 지저분한 가닥 · 컬과 웨이브는 이어지는 곡선이라 걷기로 안 돼.
 *   컬 직경·축 읽기·방향필터를 그대로 살리고 마네킨도 넣어 봐 · 뿌리는 고르게."
 *   · B(옮겨심기) 기본 꺼짐(transplant=false) — 걸은 길을 통째로 쓰면 마네킹 처리가 다 빠지고(결 표·컬 엔진), 걷기가 못 따라간 컬은 죽고, 얼굴 앞으로 걸어 내려온 가닥까지 심겼음.
 *     원본 = 마네킹(결 표 = 큰 흐름) + 61번 ③(사진 4장의 선을 자리별로 모은 크기·파장·고리 정도 + 42번 나선 측정)으로 곡선.
 *   · A(직모 뼈대 안 씀) 기본 꺼짐 — 곡선은 걸은 길에서 안 가져오니, 축 읽기(42번 한 바퀴 창)를 그대로 씀. 웨이브/컬 판정도 안 함.
 *   · C(거꾸로 자란 가닥)는 59번 결 표를 만들 때 그 가닥을 빼는 데 씀(READ_SHAPE.revOf) — 더듬이 뿌리는 이웃 칸의 결을 따름.
 *   · D(뿌리 고르게) 켬.
 * 끄기: READ_SHAPE.on=false(B·C) · READ_SHAPE.waveRaw=false(A) · READ_SHAPE.evenRoots=false(D) — 바꾼 뒤 사진을 다시 분석하거나 마네킹을 켰다 끄기
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[읽은 모양]';
  var RS = W.READ_SHAPE = Object.assign({
    on: true,            // C(결 표에서 거꾸로 자란 가닥 빼기) · B는 transplant도 켜야
    transplant: false,   // B(2026-10-12g 기본 꺼짐)
    rawPath: false,      // A(2026-10-12g 기본 꺼짐 — 축 읽기를 씀 · 켜면 직모 뼈대 안 씀 · 판정 없음)
    evenRoots: true,     // D(2026-10-12g 다시 켬)
    rootLow: 0.6,        // D: 보통 밀도의 이 비율 미만 칸은 손대지 않음(대머리·숱 적은 곳 후보 — 64번이 덩어리 크기로 가름)
    vox: 0.05,           // C: 흐름 칸(모델 단위 ≈ 1cm)
    revLen: 0.42,        // C: 뿌리에서 이 길이(≈ 8cm)까지 봄
    revCos: -0.15,       // C: 흐름과의 평균 cos가 이 값 미만이면 거꾸로 자란 가닥
    revMinN: 3,          // C: 칸에 자기 말고 이만큼은 다른 마디가 있어야 비교
    shortK: 0.3,         // C: 이웃 뿌리 가닥 길이 중앙값의 이 비율 미만은 본보기 아님
    rootNbr: 0.06,       // C: 뿌리 이웃 칸(≈ 1.2cm · 둘레 27칸 ≈ 3.5cm 안의 뿌리들이 기준)
    rootCell: 0.04,      // B: 뿌리 찾기 칸(≈ 0.8cm)
    reach: 4             // B: 이 칸 수까지 넓혀 찾음(넘으면 예전 경로)
  }, W.READ_SHAPE || {});
  var ST = RS.stats = { built: null, used: 0, fell: 0, curlAdd: 0, wave: null, roots: null, err: null };
  var G = W.REGROW;

  function cpu() { try { return (typeof CURL_BUNDLE !== 'undefined' && CURL_BUNDLE.cmPerUnit) || 19.33; } catch (e) { return 19.33; } }
  function photo() { try { return state._hair3Dneutral || null; } catch (e) { return null; } }
  function model() { try { return (G && G.model && G.src === photo()) ? G.model : null; } catch (e) { return null; } }
  function isOrig() { try { return !!(W.ORIG_MQ && W.ORIG_MQ.on !== false && typeof W.ORIG_MQ.isOriginal === 'function' && W.ORIG_MQ.isOriginal()); } catch (e) { return false; } }

  /* ── A. 웨이브 사진은 직모 뼈대를 안 씀 ─────────────────────────────── */
  if (G && typeof G.build === 'function') {
    var innerBuild = G.build, straight0 = G.straightCurly;
    G.build = function () {
      try {
        G.straightCurly = straight0;
        ST.wave = RS.rawPath; if (RS.rawPath) G.straightCurly = false;
      } catch (e) {}
      return innerBuild.apply(this, arguments);
    };
  }

  /* ── C. 본보기 표: 거꾸로 자란 가닥·짧게 막힌 가닥을 빼고 뿌리 칸에 넣음 ── */
  var IDX = null;
  function keyOf(ix, iy, iz) { return ((ix + 512) * 1024 + (iy + 512)) * 1024 + (iz + 512); }
  function buildIndex(m) {
    var t0 = Date.now(), S = m.strands, n = S.length, V = RS.vox, flow = new Map(), i, j;
    // 흐름 칸 — 마디 방향(앞뒤 있음)의 합
    for (i = 0; i < n; i++) {
      var p = S[i] && S[i].pts; if (!p || p.length < 2) continue;
      for (j = 1; j < p.length; j++) {
        var dx = p[j].x - p[j - 1].x, dy = p[j].y - p[j - 1].y, dz = p[j].z - p[j - 1].z, l = Math.sqrt(dx * dx + dy * dy + dz * dz); if (!(l > 1e-9)) continue;
        var k = keyOf(Math.floor(p[j].x / V), Math.floor(p[j].y / V), Math.floor(p[j].z / V)), c = flow.get(k);
        if (!c) { c = [0, 0, 0, 0]; flow.set(k, c); }
        c[0] += dx / l; c[1] += dy / l; c[2] += dz / l; c[3]++;
      }
    }
    // 뿌리 이웃의 처음 방향 — 42번이 위로 뒤집어 기른 가닥(rg.flip 1)은 기준에서 뺌(앞머리선 한 줄이 통째로 뒤집혀도 그 뒤 뿌리들이 기준이 됨)
    var RN = RS.rootNbr, rootDir = new Map(), d0 = new Array(n);
    function dirOf(q) { var qi = Math.min(q.length - 1, 6), x = q[qi].x - q[0].x, y = q[qi].y - q[0].y, z = q[qi].z - q[0].z, l = Math.sqrt(x * x + y * y + z * z); return l > 1e-9 ? [x / l, y / l, z / l] : null; }
    for (i = 0; i < n; i++) {
      var q0 = S[i] && S[i].pts; if (!q0 || q0.length < 2) continue;
      var dd = d0[i] = dirOf(q0); if (!dd || (S[i].rg && S[i].rg.flip === 1)) continue;
      var kr = keyOf(Math.floor(q0[0].x / RN), Math.floor(q0[0].y / RN), Math.floor(q0[0].z / RN)), cr = rootDir.get(kr);
      if (!cr) rootDir.set(kr, cr = [0, 0, 0, 0]); cr[0] += dd[0]; cr[1] += dd[1]; cr[2] += dd[2]; cr[3]++;
    }
    function rootRef(i) {
      var q = S[i].pts[0], cx = Math.floor(q.x / RN), cy = Math.floor(q.y / RN), cz = Math.floor(q.z / RN), s = [0, 0, 0, 0], a, b, c;
      for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) for (c = -1; c <= 1; c++) { var e = rootDir.get(keyOf(cx + a, cy + b, cz + c)); if (e) { s[0] += e[0]; s[1] += e[1]; s[2] += e[2]; s[3] += e[3]; } }
      var dd = d0[i]; if (dd && !(S[i].rg && S[i].rg.flip === 1)) { s[0] -= dd[0]; s[1] -= dd[1]; s[2] -= dd[2]; s[3]--; }
      return s;
    }
    var info = new Array(n), rev = 0, revFlip = 0, flipN = 0, shortN = 0, revRoot = 0;
    for (i = 0; i < n; i++) {
      var q = S[i] && S[i].pts; if (!q || q.length < 2) { info[i] = null; continue; }
      var L = 0, sum = 0, cnt = 0;
      for (j = 1; j < q.length; j++) {
        var ex = q[j].x - q[j - 1].x, ey = q[j].y - q[j - 1].y, ez = q[j].z - q[j - 1].z, el = Math.sqrt(ex * ex + ey * ey + ez * ez); if (!(el > 1e-9)) continue;
        L += el;
        if (L <= RS.revLen) {
          var c2 = flow.get(keyOf(Math.floor(q[j].x / V), Math.floor(q[j].y / V), Math.floor(q[j].z / V)));
          if (c2 && c2[3] - 1 >= RS.revMinN) {
            var ux = ex / el, uy = ey / el, uz = ez / el, ox = c2[0] - ux, oy = c2[1] - uy, oz = c2[2] - uz, ol = Math.sqrt(ox * ox + oy * oy + oz * oz);
            if (ol > 0.5) { sum += (ux * ox + uy * oy + uz * oz) / ol; cnt++; }
          }
        }
      }
      var isRev = cnt >= 2 && sum / cnt < RS.revCos, fl = S[i].rg && S[i].rg.flip === 1;
      if (!isRev && d0[i]) {                                                   // 지나가는 자리에 다른 가닥이 없는 더듬이 — 뿌리 이웃이 가는 쪽과 반대면 거꾸로
        var rr = rootRef(i), rl = Math.sqrt(rr[0] * rr[0] + rr[1] * rr[1] + rr[2] * rr[2]);
        if (rr[3] >= RS.revMinN && rl > 0.3 * rr[3] && (d0[i][0] * rr[0] + d0[i][1] * rr[1] + d0[i][2] * rr[2]) / rl < RS.revCos) { isRev = true; revRoot++; }
      }
      if (fl) flipN++;
      if (isRev) { rev++; if (fl) revFlip++; }
      info[i] = { L: L, rev: isRev, r: q[0] };
    }
    // 짧게 막힌 가닥 — 뿌리 칸(2cm) 이웃 길이 중앙값 대비
    var RC = RS.rootCell, rc = new Map();
    for (i = 0; i < n; i++) { var f = info[i]; if (!f) continue; var kk = keyOf(Math.floor(f.r.x / (RC * 2)), Math.floor(f.r.y / (RC * 2)), Math.floor(f.r.z / (RC * 2))), a = rc.get(kk); if (!a) rc.set(kk, a = []); a.push(f.L); }
    rc.forEach(function (a) { a.sort(function (x, y) { return x - y; }); a.med = a[a.length >> 1]; });
    var cells = new Map(), good = 0;
    for (i = 0; i < n; i++) {
      var g = info[i]; if (!g || g.rev) continue;
      var a2 = rc.get(keyOf(Math.floor(g.r.x / (RC * 2)), Math.floor(g.r.y / (RC * 2)), Math.floor(g.r.z / (RC * 2))));
      if (a2 && a2.length >= 4 && g.L < a2.med * RS.shortK) { shortN++; continue; }
      var k3 = keyOf(Math.floor(g.r.x / RC), Math.floor(g.r.y / RC), Math.floor(g.r.z / RC)), b = cells.get(k3);
      if (!b) cells.set(k3, b = []); b.push(i); good++;
    }
    var revIdx = []; for (i = 0; i < n; i++) if (info[i] && info[i].rev) revIdx.push(i);
    ST.built = { n: n, good: good, rev: rev, revRoot: revRoot, revFlip: revFlip, flipN: flipN, short: shortN, vox: flow.size, ms: Date.now() - t0 };
    try { console.log(TAG + ' 본보기 — 기른 가닥 ' + n + ' 중 ' + good + '개 · 거꾸로 자란 가닥 ' + rev + '(그중 42번이 위로 뒤집어 기른 것 ' + revFlip + '/' + flipN + ') · 짧게 막힌 가닥 ' + shortN + ' · ' + ST.built.ms + 'ms'); } catch (e) {}
    return { m: m, arr: S, cells: cells, rev: revIdx };
  }
  function index() {
    var m = model(); if (!m || !m.strands || !m.strands.length) return null;
    if (!IDX || IDX.m !== m || IDX.arr !== m.strands) IDX = buildIndex(m);
    return IDX;
  }
  // (2026-10-12g) 59번 결 표가 거꾸로 자란 가닥(더듬이)을 안 넣게 — 그 가닥들의 번호(Set)
  RS.revOf = function (strands) {
    if (!RS.on || !strands || !strands.length) return null;
    try { var ix = (IDX && IDX.arr === strands) ? IDX : (IDX = buildIndex({ strands: strands })); IDX.m = model() && model().strands === strands ? model() : IDX.m; ST.revUsed = ix.rev.length; return new Set(ix.rev); } catch (e) { ST.err = '거꾸로 가닥: ' + (e && e.message || e); return null; }
  };
  RS.reindex = function () { IDX = null; return index() ? ST.built : null; };

  function nearest(ix, p) {
    var RC = RS.rootCell, cx = Math.floor(p.x / RC), cy = Math.floor(p.y / RC), cz = Math.floor(p.z / RC), best = -1, bd = Infinity, r, a, b, c;
    for (r = 0; r <= RS.reach; r++) {
      for (a = -r; a <= r; a++) for (b = -r; b <= r; b++) for (c = -r; c <= r; c++) {
        if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== r) continue;
        var L = ix.cells.get(keyOf(cx + a, cy + b, cz + c)); if (!L) continue;
        for (var t = 0; t < L.length; t++) { var q = ix.arr[L[t]].pts[0], d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) + (q.z - p.z) * (q.z - p.z); if (d < bd) { bd = d; best = L[t]; } }
      }
      if (best >= 0 && Math.sqrt(bd) <= (r + 0.5) * RC) break;              // 다음 고리에 더 가까운 게 있을 수 없음
    }
    return best;
  }

  /* ── B. 슬라이더 — 59번 adjustFlow와 같은 "기준에서 움직인 만큼만" · 컬은 올린 만큼만 ── */
  function adjustRead(s, g, base, lenOverride, styOverride) {
    var cur = (state.sections && state.sections[s.sec]) || {};
    var sty = (styOverride !== undefined ? styOverride : uniformStyling()) || stylingForRoot(s.pts[0]) || {};
    var dlen = 50; try { dlen = SECTIONS[s.sec].defaults.length; } catch (e) {}
    var r = sectionLengthRatio(s.sec, typeof lenOverride === 'number' ? lenOverride : cur.length) / (sectionLengthRatio(s.sec, dlen) || 1);
    if (isFinite(r) && Math.abs(r - 1) > 1e-6) g = lengthStrand3D(g, r);
    var curl = Math.max(0, cur.curl || 0), C0 = base.curl || 0, dC = curl - C0;
    var sweep = Math.max(-100, Math.min(100, (sty.sweep || 0) - (base.sweep || 0)));
    var vol = Math.max(0, Math.min(100, 50 + ((typeof sty.volume === 'number' ? sty.volume : 50) - (typeof base.volume === 'number' ? base.volume : 50))));
    var samePart = (sty.part || 0) === (base.part || 0) && (sty.partAmt || 0) === (base.partAmt || 0);
    var part = samePart ? 0 : (sty.part || 0), partAmt = samePart ? 0 : sty.partAmt;
    if (dC > 1) { g = curlStrand3D(g, dC, (typeof cur.wave === 'number' ? cur.wave : 50) / 100, typeof cur.curlDir === 'number' ? cur.curlDir : 0); g = gravityDroop3D(g, dC); ST.curlAdd++; }
    g = partStrand3D(g, part, curl, partAmt);
    g = sweepStrand3D(g, sweep, curl, part, partAmt);
    g = volumeStrand3D(g, vol, s.sec);
    g = flowCurlStrand3D(g, sty.flow || 0);
    g = sleekStrand3D(g, typeof sty.sleek === 'number' ? sty.sleek : 0);
    return g;
  }

  var prevAdj = W.adjustStrandGeom;
  if (typeof prevAdj === 'function') W.adjustStrandGeom = function (s, lenOverride, styOverride) {
    if (RS.on && RS.transplant && s && s.mannequin && s.pts && s.pts.length >= 2 && isOrig()) {
      try {
        var ix = index();
        if (ix) {
          var mem = s._rsh;
          if (!mem || mem.ix !== ix) {
            var root = s.pts[0], bi = nearest(ix, root), pts = null;
            if (bi >= 0) {
              var src = ix.arr[bi].pts, q0 = src[0], dx = root.x - q0.x, dy = root.y - q0.y, dz = root.z - q0.z, k;
              pts = new Array(src.length);
              for (k = 0; k < src.length; k++) pts[k] = { x: src[k].x + dx, y: src[k].y + dy, z: src[k].z + dz };
            }
            mem = s._rsh = { ix: ix, pts: pts };
            if (pts) ST.used++; else ST.fell++;
          }
          if (mem.pts) {
            // 기준 = 잰 값 그대로(옮겨심은 길에 이미 들어 있는 넘김·볼륨·컬) — 컬은 스펙이 섹션에 넣은 값(= 사진에서 잰 컬)
            var base = {}; try { var sp = W.ORIG_MQ.spec; base = Object.assign({}, (sp && sp.flowBase) || {}); if (sp && sp.perm && typeof sp.perm.curl === 'number') base.curl = sp.perm.curl; } catch (e) {}
            return adjustRead(s, mem.pts, base, lenOverride, styOverride);
          }
        }
      } catch (e) { if (!ST.err) console.warn(TAG + ' 옮겨심기 실패 — 예전 경로', e); ST.err = String(e && e.message || e); }
    }
    return prevAdj.apply(this, arguments);
  };
  else console.warn(TAG + ' adjustStrandGeom이 없어 모양 옮겨심기를 못 합니다');

  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () {
    var s = origFS.apply(this, arguments);
    try { if (RS.on && RS.transplant && isOrig()) { var m = model(); s += '|rs1:' + (m ? m.strands.length : 0); } } catch (e) {}
    return s;
  };

  /* ── D. 뿌리 고르게 ─────────────────────────────────────────────────── */
  var origFill = W.fillUnseenRootCells;
  if (typeof origFill === 'function') W.fillUnseenRootCells = function (ro) {
    var r = origFill.apply(this, arguments);
    if (!RS.evenRoots) return r;
    try {
      var den = ro && ro.den, est = ro && ro.est; if (!den || !est) return r;
      var N = ro.NT * ro.NP, OFFv = typeof EST_OFFSCALP !== 'undefined' ? EST_OFFSCALP : 3, meas = [], i;
      for (i = 0; i < N; i++) if (est[i] === 0 && den[i] > 0) meas.push(den[i]);
      if (meas.length < 20) return r;
      meas.sort(function (a, b) { return a - b; });
      var base = meas[meas.length >> 1], low = base * RS.rootLow, up = 0, down = 0, left = 0;
      for (i = 0; i < N; i++) {
        if (est[i] === OFFv) continue;
        if (!(den[i] >= low)) { left++; continue; }
        if (den[i] < base) up++; else if (den[i] > base) down++;
        den[i] = base;
      }
      ST.roots = { base: +base.toFixed(2), up: up, down: down, left: left };
      console.log(TAG + ' 뿌리 고르게 — 머리 있는 칸을 보통 밀도 ' + ST.roots.base + '로: 올린 칸 ' + up + ' · 내린 칸(밀집 띠) ' + down + ' · 보통의 ' + RS.rootLow + ' 미만이라 남긴 칸 ' + left + '(64번이 작은 덩어리는 채우고 넓게 빈 곳은 대머리로 둠) · 끄기 READ_SHAPE.evenRoots=false');
    } catch (e) { ST.err = '뿌리: ' + (e && e.message || e); }
    return r;
  };

  RS.lines = function () {
    var b = ST.built, w = ST.wave, ro = ST.roots;
    return [TAG + ' ' + (RS.on ? '켜짐' : '꺼짐') +
      ' · 축: ' + (RS.rawPath ? '걸은 길 그대로(rawPath)' : '축 읽기(42번 뼈대) + 결 표') + ' · 결 표에서 뺀 거꾸로 자란 가닥 ' + (ST.revUsed || 0) +
      (RS.transplant ? ' · 옮겨심은 마네킹 가닥 ' + ST.used + ' / 예전 경로 ' + ST.fell : ' · 옮겨심기 꺼짐(마네킹)') +
      (b ? '\n  본보기: 기른 가닥 ' + b.n + ' 중 ' + b.good + ' · 거꾸로 자란 가닥 ' + b.rev + '(42번이 위로 뒤집은 ' + b.flipN + ' 중 ' + b.revFlip + ') · 짧게 막힌 ' + b.short + ' · ' + b.ms + 'ms' : '') +
      (ro ? '\n  뿌리 고르게: 보통 밀도 ' + ro.base + ' · 올린 칸 ' + ro.up + ' · 내린 칸 ' + ro.down + ' · 남긴 칸 ' + ro.left : '') +
      (ST.err ? ' · ⚠ ' + ST.err : '')];
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () { var L = ppl.apply(this, arguments) || []; try { L = L.concat(RS.lines()); } catch (e) {} return L; };
  console.log(TAG + ' 설치 — 거꾸로 자란 가닥(더듬이)은 결 표에서 빼고 이웃 칸 결로 · 뿌리 고르게 · 원본 = 마네킹(곡선은 61번 ③). 끄기 READ_SHAPE.on / evenRoots = false · 옮겨심기 transplant=true · 걸은 길 rawPath=true');
})();
