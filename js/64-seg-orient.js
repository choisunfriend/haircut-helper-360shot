/* 64-seg-orient.js — 머리 영역 다시 찾기 + 결 촘촘히 읽기 (2026-10-10a)
 *
 * ① 결 촘촘히 — 사용자: "그 예측 구간에서 튀는 게 생길 수도 있나?"
 *   지금(04번): 사진 세로줄마다 그 줄의 머리 픽셀 중 12곳만 결을 저장하고, 꺼낼 때 가장 가까운 줄 하나에서 위아래 두 점 사이를 직선으로 메움.
 *     단발 옆머리 줄이면 2~3cm마다 한 점 → 가마·가르마가 뭉개지고, 줄마다 점 자리가 달라 옆으로 걸을 때 결이 튀고,
 *     머리-피부-머리로 끊긴 줄은 틈을 건너 메움.
 *   지금: 결은 이미 모든 픽셀에서 계산돼 있음(버리고 있었음) → orientStepPx(3)픽셀마다 저장.
 *     꺼낼 때: 위아래 두 점은 바로 찾아감(점이 많아져도 빠름) · 옆 줄 둘을 섞음(결은 두 배 각으로 섞어 ±90° 경계에서 안 튐)
 *     · 틈(머리가 끊긴 자리)은 건너지 않고 "모름"(또렷함 0) — 기르는 쪽이 직전 방향을 이어 감.
 *     예전에 저장된 사진(12곳)은 예전처럼 메움(틈 규칙은 촘촘한 줄에만).
 * ② 머리 영역 다시 찾기 — 사용자: "세그멘테이션에서 빠지는 헤어들이 간혹 있거든? 크게 한번 잡고 나서 내부 헤어와 비슷한 것 재탐색하는 게 있나?"
 *   지금(03b번): 영역을 4픽셀 넓혀 "일반적인 머리색 + 결 무늬"면 넣음 → 이 손님 머리색이 아니라 일반 규칙이라 광택·밝은 머리·그림자에서 빠짐.
 *   지금: 영역이 정해진 직후(가장 큰 덩어리만 남긴 뒤)
 *     1) 가장자리를 깎은 안쪽 = "확실한 머리" → 이 손님 머리색을 배움(보통 머리 + 밝은 광택 두 무리, 밝기·색 성분의 평균과 퍼짐)
 *     2) 경계 바깥 띠(사진 폭의 segBand) 안에서, 기존 머리와 이어져 있고 · 이 손님 머리색에 들고 · 결 무늬가 있는 픽셀을 넣음(번져 나감)
 *     3) 머리 안의 구멍(바깥과 안 이어진 빈자리, 머리 넓이의 holeMax 이하)은 이 손님 머리색이거나 같은 색 성분에 더 밝으면(광택) 채움 — 광택을 두피로 센 자리
 *   이어진 것만 넣으므로 멀리 있는 비슷한 색(옷·배경)은 안 들어옴.
 * 끄기: SEG_ORIENT.dense=false · SEG_ORIENT.regrow=false (사진을 새로 분석할 때부터)
 * 넣는 자리: index.html에서 63-hair-look.js 다음. 사진을 분석하는 순간에 적용되므로 "저장한 사진 쓰기"로 불러온 사진에는 안 걸림 — 새로 찍거나 다시 분석.
 */
(function () {
  'use strict';
  var W = window, TAG = '[영역·결 보강]';
  var SO = W.SEG_ORIENT = Object.assign({
    dense: true, orientStepPx: 3, gapK: 3, blendCols: true,
    regrow: true, segBand: 0.02, coreErode: 0.006, colorK: 2.6, glossQ: 0.85, texR: 2, holeMax: 0.15, cohMin: 0.5, minCore: 400
  }, W.SEG_ORIENT || {});
  var S = SO.stats = { views: [], dense: 0, samples: 0, err: null };

  /* ---------------- ① 결 촘촘히 ---------------- */
  var origBuild = W.buildColumnOrientationSamples, origSample = W.sampleOrientation;
  if (typeof origBuild === 'function') W.buildColumnOrientationSamples = function (angle, coh, mask, Wd, Hd, n, extra) {
    if (!SO.dense) return origBuild.apply(this, arguments);
    try {
      var step = Math.max(1, SO.orientStepPx | 0), cols = new Array(Wd), x, y, k, list, run, cnt = 0;
      for (x = 0; x < Wd; x++) {
        list = []; run = -1e9;
        for (y = 0; y < Hd; y++) {
          k = y * Wd + x; if (!(mask[k] > 0)) continue;
          if (y - run >= step) {
            list.push({ y: y, angle: angle[k], coherence: coh[k], fx: extra ? extra.fx[k] : 0, fy: extra ? extra.fy[k] : 0, fc: extra ? extra.fc[k] : 0 });
            run = y; cnt++;
          }
        }
        list._dense = step; cols[x] = list;
      }
      S.dense++; S.samples += cnt;
      return cols;
    } catch (e) { S.err = '결 저장: ' + (e && e.message || e); return origBuild.apply(this, arguments); }
  };
  function at1(col, Y) {                       // 한 줄에서 Y 자리의 결 — 위아래 두 점(바로 찾아감) · 틈은 안 건넘
    var n = col.length; if (!n) return null;
    var lo = 0, hi = n - 1, m;
    if (Y <= col[0].y) { return col._dense && col[0].y - Y > col._dense * SO.gapK ? null : col[0]; }
    if (Y >= col[n - 1].y) { return col._dense && Y - col[n - 1].y > col._dense * SO.gapK ? null : col[n - 1]; }
    while (hi - lo > 1) { m = (lo + hi) >> 1; if (col[m].y <= Y) lo = m; else hi = m; }
    var a = col[lo], b = col[hi];
    if (col._dense && b.y - a.y > col._dense * SO.gapK) {        // 머리가 끊긴 자리 — 가까운 쪽이 가까우면 그것, 아니면 모름
      if (Y - a.y <= col._dense * 1.5) return a; if (b.y - Y <= col._dense * 1.5) return b; return null;
    }
    var t = (Y - a.y) / ((b.y - a.y) || 1), ba = b.angle, d = ba - a.angle;
    while (d > Math.PI / 2) { ba -= Math.PI; d = ba - a.angle; }
    while (d < -Math.PI / 2) { ba += Math.PI; d = ba - a.angle; }
    var fx = (a.fx || 0) + ((b.fx || 0) - (a.fx || 0)) * t, fy = (a.fy || 0) + ((b.fy || 0) - (a.fy || 0)) * t, fl = Math.hypot(fx, fy);
    return { angle: a.angle + d * t, coherence: a.coherence + (b.coherence - a.coherence) * t, fx: fl > 1e-6 ? fx / fl : 0, fy: fl > 1e-6 ? fy / fl : 0, fc: ((a.fc || 0) + ((b.fc || 0) - (a.fc || 0)) * t) * fl };
  }
  var NONE = { angle: 0, coherence: 0, fx: 0, fy: 0, fc: 0 };
  if (typeof origSample === 'function') W.sampleOrientation = function (ori, X, Wd, Y) {
    if (!ori) return origSample.apply(this, arguments);
    var x0 = Math.max(0, Math.min(Wd - 1, Math.round(X))), c0 = ori[x0];
    if (!c0 || !c0._dense) return origSample.apply(this, arguments);   // 예전 방식으로 저장된 사진
    if (!SO.blendCols) return at1(c0, Y) || NONE;
    var xf = Math.max(0, Math.min(Wd - 1, X)), xa = Math.floor(xf), xb = Math.min(Wd - 1, xa + 1), t = xf - xa;
    var A = ori[xa] ? at1(ori[xa], Y) : null, B = (xb !== xa && ori[xb]) ? at1(ori[xb], Y) : null;
    if (!A && !B) return NONE; if (!A) return B; if (!B || t < 1e-3) return A; if (t > 0.999) return B;
    var wa = (1 - t) * (A.coherence + 1e-3), wb = t * (B.coherence + 1e-3);
    var cx = wa * Math.cos(2 * A.angle) + wb * Math.cos(2 * B.angle), sy = wa * Math.sin(2 * A.angle) + wb * Math.sin(2 * B.angle);
    var ang = 0.5 * Math.atan2(sy, cx);
    var fx = (1 - t) * (A.fx || 0) + t * (B.fx || 0), fy = (1 - t) * (A.fy || 0) + t * (B.fy || 0), fl = Math.hypot(fx, fy);
    return { angle: ang, coherence: (1 - t) * A.coherence + t * B.coherence, fx: fl > 1e-6 ? fx / fl : 0, fy: fl > 1e-6 ? fy / fl : 0, fc: ((1 - t) * (A.fc || 0) + t * (B.fc || 0)) * fl };
  };

  /* ---------------- ② 머리 영역 다시 찾기 ---------------- */
  var last = null;                                   // 03b가 영역을 만들 때 넘긴 사진(RGBA)
  var origGray = W.toGrayscale;
  if (typeof origGray === 'function') W.toGrayscale = function (rgba, Wd, Hd) {
    var g = origGray.apply(this, arguments);
    try { if (rgba && rgba.length === Wd * Hd * 4) last = { rgba: rgba, W: Wd, H: Hd, gray: g }; } catch (e) {}
    return g;
  };
  function feats(r, g, b) { return [0.299 * r + 0.587 * g + 0.114 * b, r - g, g - b]; }
  function stats(list) {
    var n = list.length / 3, m = [0, 0, 0], v = [0, 0, 0], i, j;
    for (i = 0; i < n; i++) for (j = 0; j < 3; j++) m[j] += list[i * 3 + j];
    for (j = 0; j < 3; j++) m[j] /= Math.max(1, n);
    for (i = 0; i < n; i++) for (j = 0; j < 3; j++) { var d = list[i * 3 + j] - m[j]; v[j] += d * d; }
    for (j = 0; j < 3; j++) v[j] = Math.max(j === 0 ? 36 : 9, v[j] / Math.max(1, n));
    return { m: m, s: v.map(Math.sqrt), n: n };
  }
  function inModel(md, f, k) { var d = 0, j; for (j = 0; j < 3; j++) { var z = (f[j] - md.m[j]) / md.s[j]; d += z * z; } return d <= k * k * 3; }
  function regrowMask(M, im) {
    var Wd = im.W, Hd = im.H, N = Wd * Hd, rgba = im.rgba, i, x, y, k;
    var er = Math.max(2, Math.round(Wd * SO.coreErode)), core = typeof W.erode === 'function' ? W.erode(M, Wd, Hd, er) : M;
    // 1) 이 손님 머리색
    var L = [], all = [];
    for (i = 0; i < N; i += 2) if (core[i] > 0) { var f = feats(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]); all.push(f); L.push(f[0]); }
    if (all.length < SO.minCore) return { M: M, note: '확실한 머리가 적어 건너뜀(' + all.length + ')' };
    L.sort(function (a, b) { return a - b; });
    var lq = L[Math.floor(L.length * SO.glossQ)], base = [], glos = [];
    all.forEach(function (f) { (f[0] <= lq ? base : glos).push(f[0], f[1], f[2]); });
    var mB = stats(base), mG = glos.length >= 30 ? stats(glos) : null;
    function hairLike(p) { var f = feats(rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]); return inModel(mB, f, SO.colorK) || (mG && inModel(mG, f, SO.colorK)); }
    function holeLike(p) {                         // 사방이 머리인 구멍 — 같은 색 성분인데 더 밝음(광택 띠)도 머리로
      var f = feats(rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]);
      return f[0] >= mB.m[0] - mB.s[0] && Math.abs(f[1] - mB.m[1]) <= SO.colorK * mB.s[1] + 0.25 * Math.max(0, f[0] - mB.m[0]) * Math.abs(mB.m[1]) / Math.max(1, mB.m[0]) + 6
        && Math.abs(f[2] - mB.m[2]) <= SO.colorK * mB.s[2] + 0.25 * Math.max(0, f[0] - mB.m[0]) * Math.abs(mB.m[2]) / Math.max(1, mB.m[0]) + 6;
    }
    var gray = im.gray || (typeof origGray === 'function' ? origGray(rgba, Wd, Hd) : null);
    function cohAt(p) {                            // 결 무늬가 한 방향으로 또렷한가(구조 텐서, 5×5) — 머리카락은 높고, 잡음·민무늬는 낮음
      if (!gray) return 1; var px = p % Wd, py = (p / Wd) | 0, r = 2, jxx = 0, jyy = 0, jxy = 0, xx, yy;
      if (px < r + 1 || py < r + 1 || px >= Wd - r - 1 || py >= Hd - r - 1) return 0;
      for (yy = py - r; yy <= py + r; yy++) for (xx = px - r; xx <= px + r; xx++) {
        var k2 = yy * Wd + xx, gx = (gray[k2 + 1] - gray[k2 - 1]) * 0.5, gy = (gray[k2 + Wd] - gray[k2 - Wd]) * 0.5;
        jxx += gx * gx; jyy += gy * gy; jxy += gx * gy;
      }
      var tr = jxx + jyy; if (tr < 1e-6) return 0;
      return Math.sqrt((jxx - jyy) * (jxx - jyy) + 4 * jxy * jxy) / tr;
    }
    function tex(p) {
      if (gray && cohAt(p) < SO.cohMin) return false;
      if (!gray || typeof W.hasHairTexture !== 'function') return true; return W.hasHairTexture(gray, Wd, Hd, p % Wd, (p / Wd) | 0, SO.texR);
    }
    var out = new Uint8Array(N); for (i = 0; i < N; i++) out[i] = M[i] > 0 ? 255 : 0;
    // 2) 경계 바깥 띠로 번져 나감(이어진 것만)
    var band = Math.max(3, Math.round(Wd * SO.segBand)), dil = typeof W.dilate === 'function' ? W.dilate(M, Wd, Hd, band) : null, added = 0;
    if (dil) {
      var q = new Int32Array(N), qh = 0, qt = 0, seen = new Uint8Array(N);
      for (y = 1; y < Hd - 1; y++) for (x = 1; x < Wd - 1; x++) { k = y * Wd + x; if (out[k] && (!out[k - 1] || !out[k + 1] || !out[k - Wd] || !out[k + Wd])) { q[qt++] = k; seen[k] = 1; } }
      while (qh < qt) {
        var p = q[qh++], px = p % Wd, py = (p / Wd) | 0, nb = [p - 1, p + 1, p - Wd, p + Wd], j2;
        for (j2 = 0; j2 < 4; j2++) {
          var c = nb[j2]; if (c < 0 || c >= N || seen[c]) continue;
          var cx2 = c % Wd; if (Math.abs(cx2 - px) > 1) continue;
          seen[c] = 1;
          if (out[c] || !dil[c]) continue;
          if (hairLike(c) && tex(c)) { out[c] = 255; added++; if (qt < N) q[qt++] = c; }
        }
      }
    }
    // 3) 안쪽 구멍(바깥과 안 이어진 빈자리) — 작은 것만, 이 손님 머리색이면
    var reach = new Uint8Array(N), st2 = [], filled = 0, holes = 0;
    for (x = 0; x < Wd; x++) { st2.push(x, (Hd - 1) * Wd + x); } for (y = 0; y < Hd; y++) { st2.push(y * Wd, y * Wd + Wd - 1); }
    while (st2.length) { var e = st2.pop(); if (e < 0 || e >= N || reach[e] || out[e]) continue; reach[e] = 1; var ex = e % Wd; if (ex > 0) st2.push(e - 1); if (ex < Wd - 1) st2.push(e + 1); st2.push(e - Wd, e + Wd); }
    var mArea = 0; for (i = 0; i < N; i++) if (M[i] > 0) mArea++;
    var lab = new Int32Array(N), cap = SO.holeMax * mArea;
    for (i = 0; i < N; i++) {
      if (out[i] || reach[i] || lab[i]) continue;
      holes++; var comp = [], st3 = [i]; lab[i] = holes;
      while (st3.length) { var h = st3.pop(); comp.push(h); var hx = h % Wd, nn = [hx > 0 ? h - 1 : -1, hx < Wd - 1 ? h + 1 : -1, h - Wd, h + Wd]; for (var j3 = 0; j3 < 4; j3++) { var c3 = nn[j3]; if (c3 < 0 || c3 >= N || out[c3] || reach[c3] || lab[c3]) continue; lab[c3] = holes; st3.push(c3); } }
      if (comp.length > cap) continue;
      comp.forEach(function (h2) { if (hairLike(h2) || holeLike(h2)) { out[h2] = 255; filled++; } });
    }
    var before = 0, after = 0; for (i = 0; i < N; i++) { if (M[i] > 0) before++; if (out[i]) after++; }
    return { M: out, added: added, filled: filled, before: before, after: after, model: { L: Math.round(mB.m[0]), Ls: Math.round(mB.s[0]), gloss: mG ? Math.round(mG.m[0]) : null } };
  }
  var origKeep = W.keepLargestComponents;
  if (typeof origKeep === 'function') W.keepLargestComponents = function (M, Wd, Hd, frac) {
    var R = origKeep.apply(this, arguments);
    if (!SO.regrow || frac !== 0.03 || !last || last.W !== Wd || last.H !== Hd) return R;
    try {
      var t0 = performance.now(), r = regrowMask(R, last);
      var info = { ms: Math.round(performance.now() - t0), added: r.added || 0, filled: r.filled || 0, before: r.before || 0, after: r.after || 0, model: r.model || null, note: r.note || '' };
      S.views.push(info); if (S.views.length > 8) S.views.shift();
      console.log(TAG + ' 머리 영역 다시 찾기 — ' + (r.note || ('경계 밖에서 넣은 픽셀 ' + info.added + ' · 안쪽 구멍 채움 ' + info.filled + ' · 영역 ' + info.before + ' → ' + info.after + 'px(+' + ((info.after / Math.max(1, info.before) - 1) * 100).toFixed(1) + '%) · 이 손님 머리색 밝기 ' + (r.model ? r.model.L + '±' + r.model.Ls + (r.model.gloss != null ? ' · 광택 ' + r.model.gloss : '') : '-') + ' · ' + info.ms + 'ms')));
      last = null;
      if (r.M === R) return R;
      // 원래 배열 형식에 맞춰 돌려줌
      var out = new (R.constructor || Uint8Array)(R.length); for (var i = 0; i < R.length; i++) out[i] = r.M[i] ? (R[i] > 0 ? R[i] : 255) : 0;
      return out;
    } catch (e) { S.err = '영역: ' + (e && e.message || e); console.warn(TAG + ' 영역 다시 찾기 실패', e); return R; }
  };

  SO.lines = function () {
    var L = [TAG + ' 결 촘촘히 ' + (SO.dense ? '켜짐(' + SO.orientStepPx + 'px마다 · 옆 줄 섞기 ' + (SO.blendCols ? '켬' : '끔') + ' · 저장한 사진 ' + S.dense + '장 · 점 ' + S.samples + ')' : '꺼짐') +
      ' · 영역 다시 찾기 ' + (SO.regrow ? '켜짐' : '꺼짐') + (S.err ? ' · ⚠ ' + S.err : '')];
    S.views.forEach(function (v, i) { L.push('  사진 ' + (i + 1) + ': ' + (v.note || ('+' + v.added + ' · 구멍 ' + v.filled + ' · ' + v.before + '→' + v.after + 'px · ' + v.ms + 'ms'))); });
    return L;
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () { var L = ppl.apply(this, arguments) || []; try { SO.lines().forEach(function (x) { L.push(x); }); } catch (e) {} return L; };
  console.log(TAG + ' 설치 — 사진 결을 ' + SO.orientStepPx + 'px마다 저장(예전: 세로줄마다 12곳) · 머리 영역을 이 손님 머리색·결 무늬로 다시 찾음. 새로 분석하는 사진부터 적용 · 끄기 SEG_ORIENT.dense=false / .regrow=false');
})();
