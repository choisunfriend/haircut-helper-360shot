/* 66-gabor-orient.js — 결 읽기를 방향 필터(가버 묶음)로 (2026-10-11a)
 * 사용자: "어차피 차이가 없으면 방향필터로 가두면 실사사진갔을 때 효과를 볼거잖아?"
 * 지금(04번): 구조 텐서 — 주변 7×7 밝기 기울기를 평균 내서 방향을 구함. 직모엔 맞지만 가는 가닥·곱슬에선 여러 방향이 섞여 흐려짐.
 * 바꾼 것: 머리카락 한 올 굵기에 맞춘 "가는 선 필터"를 n방향(기본 16)으로 돌려 대 보고, 가장 크게 반응한 방향을 그 자리의 결로.
 *   그 뒤 믿을 만한(반응이 뚜렷한) 자리의 결로 둘레를 한 번 다듬음(이중각 평균). 머리 영역(mask) 픽셀만 계산.
 *   생성 사진(머리 영역 400px 남짓)에서는 지금 방식과 방향 차이 중앙값 4~6°(같은 결과) — 실사 고해상도에서 한 올 단위 결이 잡히는 쪽.
 *   coherence(결의 또렷함)는 뒤쪽 문턱값들이 지금 방식에 맞춰져 있어 04번 값을 그대로 씀. 방향(angle)만 바꿈.
 * 이 파일은 42번보다 먼저 올려야 함(42번이 이 함수를 감싸서 컬을 잼). 끄기 GABOR_ORIENT.on=false
 */
(function () {
  var W = window, TAG = '[결 방향 필터]';
  var GO = W.GABOR_ORIENT = Object.assign({ on: true, n: 16, lambda: 4, refine: true, stats: { calls: 0, ms: 0, px: 0, dMed: null } }, W.GABOR_ORIENT || {});
  var inner = W.computeHairOrientationField;
  if (typeof inner !== 'function') { console.warn(TAG + ' computeHairOrientationField 없음 — 안 걸림'); return; }
  var KC = {};
  function kernels(lam, n) {
    var key = lam + '|' + n; if (KC[key]) return KC[key];
    var sig = lam * 0.5, r = Math.max(2, Math.ceil(3 * sig)), sz = 2 * r + 1, gam = 0.5, out = [], k, x, y;
    for (k = 0; k < n; k++) {
      var t = k * Math.PI / n, ct = Math.cos(t), st = Math.sin(t), K = new Float32Array(sz * sz), sum = 0, i = 0;
      for (y = -r; y <= r; y++) for (x = -r; x <= r; x++) {
        var xr = x * ct + y * st, yr = -x * st + y * ct;
        var v = Math.exp(-(xr * xr + gam * gam * yr * yr) / (2 * sig * sig)) * Math.cos(2 * Math.PI * xr / lam);
        K[i++] = v; sum += v;
      }
      var mean = sum / (sz * sz); for (i = 0; i < K.length; i++) K[i] -= mean;
      out.push(K);
    }
    return (KC[key] = { K: out, r: r, sz: sz });
  }
  function gray(px, n) { var g = new Float32Array(n), i, j; for (i = 0, j = 0; i < n; i++, j += 4) g[i] = (0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]) / 255; return g; }
  function blur(a, Wd, Hd, sig) {                                          // 가우시안(분리) — 다듬기용
    var r = Math.max(1, Math.ceil(2.5 * sig)), k = new Float32Array(2 * r + 1), s = 0, i, x, y;
    for (i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sig * sig)); s += k[i + r]; } for (i = 0; i < k.length; i++) k[i] /= s;
    var t = new Float32Array(Wd * Hd), o = new Float32Array(Wd * Hd);
    for (y = 0; y < Hd; y++) for (x = 0; x < Wd; x++) { var v = 0; for (i = -r; i <= r; i++) { var xx = x + i; if (xx < 0) xx = 0; else if (xx >= Wd) xx = Wd - 1; v += k[i + r] * a[y * Wd + xx]; } t[y * Wd + x] = v; }
    for (y = 0; y < Hd; y++) for (x = 0; x < Wd; x++) { var v2 = 0; for (i = -r; i <= r; i++) { var yy = y + i; if (yy < 0) yy = 0; else if (yy >= Hd) yy = Hd - 1; v2 += k[i + r] * t[yy * Wd + x]; } o[y * Wd + x] = v2; }
    return o;
  }
  W.computeHairOrientationField = function (px, mask, Wd, Hd) {
    var f = inner.apply(this, arguments);
    if (!GO.on || !f || !f.angle || !px || px.length < Wd * Hd * 4 || !mask) return f;
    try {
      var t0 = performance.now(), N = Wd * Hd, g = gray(px, N), KK = kernels(GO.lambda, GO.n), r = KK.r, sz = KK.sz, n = GO.n;
      var ang = new Float32Array(N), conf = new Float32Array(N), idx, x, y, k, i, j, cnt = 0;
      for (y = r; y < Hd - r; y++) for (x = r; x < Wd - r; x++) {
        idx = y * Wd + x; if (!mask[idx]) continue;
        var best = -1, bk = 0, sumR = 0;
        for (k = 0; k < n; k++) {
          var K = KK.K[k], v = 0, ki = 0;
          for (j = -r; j <= r; j++) { var row = (y + j) * Wd + x - r; for (i = 0; i < sz; i++) v += K[ki++] * g[row + i]; }
          v = v < 0 ? -v : v; sumR += v; if (v > best) { best = v; bk = k; }
        }
        ang[idx] = bk * Math.PI / n + Math.PI / 2; conf[idx] = best > 1e-9 ? (best - sumR / n) / best : 0; cnt++;
      }
      if (GO.refine) {                                                   // 믿을 만한 자리의 결로 둘레를 한 번 다듬음
        var C2 = new Float32Array(N), S2 = new Float32Array(N);
        for (idx = 0; idx < N; idx++) if (mask[idx]) { C2[idx] = Math.cos(2 * ang[idx]) * conf[idx]; S2[idx] = Math.sin(2 * ang[idx]) * conf[idx]; }
        C2 = blur(C2, Wd, Hd, GO.lambda * 0.6); S2 = blur(S2, Wd, Hd, GO.lambda * 0.6);
        for (idx = 0; idx < N; idx++) if (mask[idx]) ang[idx] = 0.5 * Math.atan2(S2[idx], C2[idx]);
      }
      var A = f.angle, diffs = [];
      for (idx = 0; idx < N; idx++) {
        if (!mask[idx] || (idx % Wd) < r || (idx % Wd) >= Wd - r || idx < r * Wd || idx >= (Hd - r) * Wd) continue;
        var a = ang[idx]; while (a > Math.PI / 2) a -= Math.PI; while (a <= -Math.PI / 2) a += Math.PI;
        if ((idx & 63) === 0) { var dd = Math.abs(a - A[idx]); if (dd > Math.PI / 2) dd = Math.PI - dd; diffs.push(dd * 57.3); }
        A[idx] = a;                                                         // 방향만 바꿈(coherence는 04번 값)
      }
      diffs.sort(function (p, q) { return p - q; });
      GO.stats.calls++; GO.stats.ms = Math.round(performance.now() - t0); GO.stats.px = cnt; GO.stats.dMed = diffs.length ? diffs[diffs.length >> 1] : null;
      console.log(TAG + ' ' + Wd + '×' + Hd + ' · 머리 픽셀 ' + cnt + ' · ' + n + '방향 · ' + GO.stats.ms + 'ms · 예전 방식과 방향 차이 중앙 ' + (GO.stats.dMed != null ? GO.stats.dMed.toFixed(1) + '°' : '-'));
    } catch (e) { console.warn(TAG + ' 실패 — 예전 방식 그대로', e); }
    return f;
  };
  console.log(TAG + ' 설치 — 사진 결을 ' + GO.n + '방향 가는 선 필터로 읽음(파장 ' + GO.lambda + 'px) · 끄기 GABOR_ORIENT.on=false');
})();
