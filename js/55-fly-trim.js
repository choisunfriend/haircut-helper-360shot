/* ==========================================================================
 * 55-fly-trim.js — 곱슬머리의 잔머리는 "정렬"이 아니라 "잘라내기"
 *
 * 로드 위치: index.html 맨 끝(54-body-seg-wait.js 다음).
 *
 * 왜 (2026-10-06 · 사용자, 곱슬 손님 영상): "컬은 빗질을 하면 저렇게 뻗친다. 결 정렬이 아니니까 잔머리들을 삭제하는 방법으로 할까.
 *   그리고 3D 결과 보기에서는 렌더링 과정에서 또 잔머리들이 생긴다. 그건 못 막잖아."
 *   · 곱슬머리는 가닥이 원래 엇갈려 있어서 "이웃과 나란히"가 맞지 않습니다. 53번 빗질(결 정렬)을 하면 감긴 가닥이 펴져서 곧게 뻗칩니다.
 *   · 3D 결과 화면은 가닥을 전부(예: 29,987) 그리고 조정 화면은 일부(PC 25,000 · 폰 10,000)만 그립니다. 조정 화면에 안 보이던 가닥의
 *     삐져나온 끝이 결과 화면에서 새로 보입니다 — 눈으로 보고 빗을 수가 없던 가닥들입니다.
 *
 * 무엇을 (컬이 있는 머리에서만 — 섹션 컬 평균이 minCurl 이상):
 *   ① 자동 정리 — 가닥을 다 만든 뒤(컬까지 건 최종 모양), 가닥이 빽빽한 "몸통"을 칸(cell ≈ 1.3cm)으로 찾고,
 *      몸통에서 한 칸 넘게 벗어난 채로 끝난 꼬리(길이 minTail 이상)와, 몸통 밖으로 maxOut 넘게 나갔다 돌아오는 고리를 그 자리에서 잘라 냅니다.
 *      조정 화면과 3D 결과 화면이 같은 규칙을 거치므로, 결과 화면에서만 새로 보이던 잔머리도 같이 정리됩니다.
 *   ② 빗 = 가위 — 컬이 있는 머리에서는 53번 빗질이 가닥을 돌리지 않게 하고(기록된 획은 그대로 둠), 빗이 지나간 자리에서
 *      몸통 밖으로 나온 부분을 여유 없이 잘라 냅니다. ↶(되돌리기)는 53번 것이 그대로 듣습니다.
 *   직모(컬 평균 < minCurl)는 아무것도 안 바꿉니다 — 빗질은 예전처럼 결 정렬입니다.
 *
 * ⚠ 합성 머리로만 확인했습니다. 몸통 판정(칸에 가닥 minStrands개 · 중앙값의 frac)은 어림값이라 숱이 성근 자리(앞머리 끝·목덜미)가
 *   같이 잘릴 수 있습니다 — 진단 [잔머리 정리] 줄에 자른 가닥 수와 길이가 찍힙니다.
 *
 * 끄기: FLY_TRIM.on=false; FLY_TRIM.refresh() · 자동만 끄기 FLY_TRIM.auto=false · 빗-가위만 끄기 FLY_TRIM.brush=false
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[잔머리 정리]';
  var F = W.FLY_TRIM = Object.assign({
    on: true, auto: true, brush: true,
    minCurl: 30,        // 섹션 컬 평균이 이 이상일 때만
    cell: 0.07,         // 몸통을 보는 칸(모델 단위 ≈ 1.3cm)
    minStrands: 3,      // 칸을 지나는 가닥이 이만큼은 돼야 몸통
    frac: 0.12,         // …그리고 (가닥이 있는 칸들의) 중앙값의 이 비율 이상
    refStrands: 10000,  // minStrands의 기준 가닥 수 — 더 많이 그릴 때는 비례해서 올림(조정 화면과 결과 화면이 같은 모양을 자르게)
    minTail: 0.08,      // 몸통(한 칸 여유) 밖에서 끝난 꼬리가 이 길이(≈ 1.5cm) 이상이면 자름
    maxOut: 0.16,       // 몸통 밖으로 이 길이(≈ 3cm) 넘게 나갔다 돌아오는 고리도 나간 자리에서 자름
    brushBack: 0.25,    // 빗-가위: 그 뒤로 몸통 안에 있는 점이 이 비율을 넘으면 꼬리가 아니라 몸통 머리로 보고 안 자름
    keepPts: 3          // 가닥은 최소 이 점 수는 남김
  }, W.FLY_TRIM || {});
  var S = F.stats = { curly: false, curl: 0, strands: 0, autoCut: 0, loopCut: 0, brushCut: 0, cutLen: 0, cells: 0, body: 0, thr: 0, ms: 0, err: null };
  var ver = 0, EMPTY = [];

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function avgCurl() {
    try { var k, n = 0, s = 0; for (k in state.sections) { var c = +state.sections[k].curl; if (isFinite(c)) { s += c; n++; } } return n ? s / n : 0; } catch (e) { return 0; }
  }
  function curly() { return !!(F.on && avgCurl() >= F.minCurl); }
  F.curly = curly;

  /* ② 컬이 있는 머리에서는 53번 빗질(돌리기)을 건너뜀 — 획은 그대로 두고, 자르기는 아래 pass가 함 */
  var innerComb = W.combStrand3D;
  if (typeof innerComb === 'function') W.combStrand3D = function (g) {
    var C = W.COMB3D;
    if (!(F.brush && C && C.samples && C.samples.length && curly())) return innerComb.apply(this, arguments);
    var keep = C.samples; C.samples = EMPTY;
    try { return innerComb.apply(this, arguments); } finally { C.samples = keep; }
  };

  var memo = new WeakMap();
  function pass(list) {
    S.curl = Math.round(avgCurl()); S.curly = curly();
    if (!S.curly || !list || !list.length) return list;
    var C = W.COMB3D, nSm = (F.brush && C && C.samples) ? C.samples.length : 0;
    var hit = memo.get(list); if (hit && hit.ver === ver && hit.nSm === nSm) return hit.out;
    var t0 = now(), n = list.length, i, k, p, e, cell = F.cell;
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (i = 0; i < n; i++) { p = list[i] && list[i].pts; if (!p) continue; for (k = 0; k < p.length; k++) { var q = p[k];
      if (q.x < mn[0]) mn[0] = q.x; if (q.y < mn[1]) mn[1] = q.y; if (q.z < mn[2]) mn[2] = q.z; if (q.x > mx[0]) mx[0] = q.x; if (q.y > mx[1]) mx[1] = q.y; if (q.z > mx[2]) mx[2] = q.z; } }
    if (!isFinite(mn[0])) return list;
    var nx = Math.min(160, Math.floor((mx[0] - mn[0]) / cell) + 3), ny = Math.min(200, Math.floor((mx[1] - mn[1]) / cell) + 3), nz = Math.min(160, Math.floor((mx[2] - mn[2]) / cell) + 3);
    var ox = mn[0] - cell, oy = mn[1] - cell, oz = mn[2] - cell, N = nx * ny * nz, cnt = new Uint16Array(N), last = new Int32Array(N).fill(-1);
    function idx(q) { var a = Math.floor((q.x - ox) / cell), b = Math.floor((q.y - oy) / cell), c = Math.floor((q.z - oz) / cell); return (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) ? -1 : a + nx * (b + ny * c); }
    for (i = 0; i < n; i++) { p = list[i] && list[i].pts; if (!p) continue; for (k = 0; k < p.length; k++) { var id = idx(p[k]); if (id >= 0 && last[id] !== i) { last[id] = i; if (cnt[id] < 65535) cnt[id]++; } } }
    var nz0 = [], j; for (j = 0; j < N; j++) if (cnt[j]) nz0.push(cnt[j]);
    nz0.sort(function (a, b) { return a - b; });
    var med = nz0.length ? nz0[nz0.length >> 1] : 0, thr = Math.max(F.minStrands * Math.max(1, n / F.refStrands), F.frac * med);
    var B = new Uint8Array(N), D = new Uint8Array(N), nb = 0, sx = 1, sy = nx, sz = nx * ny;
    for (j = 0; j < N; j++) if (cnt[j] >= thr) { B[j] = 1; nb++; }
    for (j = 0; j < N; j++) if (B[j]) { D[j] = 1; if (j - sx >= 0) D[j - sx] = 1; if (j + sx < N) D[j + sx] = 1; if (j - sy >= 0) D[j - sy] = 1; if (j + sy < N) D[j + sy] = 1; if (j - sz >= 0) D[j - sz] = 1; if (j + sz < N) D[j + sz] = 1; }
    S.cells = nz0.length; S.body = nb; S.thr = thr;
    // 빗이 지나간 칸
    var P = null;
    if (nSm) {
      P = new Uint8Array(N);
      var rr = Math.max(1, Math.round((C.dab > 0 ? C.dab : 0.045) / cell)), si, a, b, c;      // 칠한 점 둘레 한 칸
      for (si = 0; si < C.samples.length; si++) {
        var sm = C.samples[si], dd = sm && sm.dabs, m = sm && sm.m; if (!dd || !m) continue;
        for (k = 0; k < m; k++) {
          var cx = Math.floor((dd[k * 4] - ox) / cell), cy = Math.floor((dd[k * 4 + 1] - oy) / cell), cz = Math.floor((dd[k * 4 + 2] - oz) / cell);
          for (c = cz - rr; c <= cz + rr; c++) { if (c < 0 || c >= nz) continue; for (b = cy - rr; b <= cy + rr; b++) { if (b < 0 || b >= ny) continue; for (a = cx - rr; a <= cx + rr; a++) { if (a < 0 || a >= nx) continue; P[a + nx * (b + ny * c)] = 1; } } }
        }
      }
    }
    var out = new Array(n), aC = 0, lC = 0, bC = 0, cutLen = 0;
    for (i = 0; i < n; i++) {
      e = list[i]; p = e && e.pts; out[i] = e;
      if (!p || p.length <= F.keepPts) continue;
      var m2 = p.length, cut = m2, why = 0, runStart = -1, runLen = 0, id2;
      for (k = 1; k < m2; k++) {
        id2 = idx(p[k]);
        if (P && k >= F.keepPts && id2 >= 0 && P[id2] && !B[id2]) {
          // 빗이 지나간 자리에서 몸통 밖: 여기서부터 끝까지 거의 몸통 밖이면(= 삐져나온 꼬리) 자름. 다시 몸통으로 들어가는 가닥(성근 칸을 지나는 몸통 머리)은 그대로
          var inB = 0, kk, idk; for (kk = k + 1; kk < m2; kk++) { idk = idx(p[kk]); if (idk >= 0 && B[idk]) inB++; }
          if (inB <= F.brushBack * (m2 - k)) { cut = k; why = 3; break; }
        }
        if (!F.auto) continue;
        if (id2 < 0 || !D[id2]) {
          if (runStart < 0) { runStart = k; runLen = 0; }
          runLen += Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y, p[k].z - p[k - 1].z);
          if (runLen >= F.maxOut && k < m2 - 1) { cut = Math.max(F.keepPts, runStart); why = 2; break; }   // 멀리 나간 고리
        } else runStart = -1;
      }
      if (cut === m2 && F.auto && runStart >= 0 && runLen >= F.minTail) { cut = Math.max(F.keepPts, runStart); why = 1; }   // 밖에서 끝난 꼬리
      if (cut >= m2) continue;
      for (k = cut; k < m2; k++) cutLen += Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y, p[k].z - p[k - 1].z);
      var np = p.slice(0, cut);
      try { np._pre = (p._pre && p._pre.length === p.length) ? p._pre.slice(0, cut) : np; } catch (e2) {}
      var ne = Object.assign({}, e, { pts: np });
      try { if (e.colors && e.colors.length === p.length) ne.colors = e.colors.slice(0, cut); if (e.srcColors && e.srcColors.length === p.length) ne.srcColors = e.srcColors.slice(0, cut); } catch (e3) {}
      out[i] = ne;
      if (why === 1) aC++; else if (why === 2) lC++; else bC++;
    }
    S.strands = n; S.autoCut = aC; S.loopCut = lC; S.brushCut = bC; S.cutLen = cutLen; S.ms = now() - t0;
    memo.set(list, { ver: ver, nSm: nSm, out: out });
    return out;
  }
  F._pass = pass;

  var origCA = W.computeAdjustedHair3DStrands;
  if (typeof origCA === 'function') W.computeAdjustedHair3DStrands = function () {
    var list = origCA.apply(this, arguments);
    try { return pass(list); } catch (e) { S.err = String(e && e.message || e); return list; }
  };
  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () { return origFS.apply(this, arguments) + '|ft' + ver + (curly() ? 'c' : 's'); };
  F.refresh = function () {
    ver++;
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) {}
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try {
      var cm = 16.4; try { cm = modelCmPerUnit() || 16.4; } catch (e) {}
      var cutN = S.autoCut + S.loopCut + S.brushCut;
      L.push(TAG + ' ' + (!F.on ? '꺼짐' : !S.curly ? '대기 — 컬 평균 ' + S.curl + ' < ' + F.minCurl + ' (직모는 빗질 = 결 정렬 그대로)' :
        '켜짐(컬 평균 ' + S.curl + ') · 직전 가닥 ' + S.strands + '개 중 자른 것 ' + cutN + '개 — 밖에서 끝난 꼬리 ' + S.autoCut + ' · 멀리 나간 고리 ' + S.loopCut + ' · 빗이 지나간 자리 ' + S.brushCut +
        ' · 자른 길이 평균 ' + (cutN ? (S.cutLen / cutN * cm).toFixed(1) : '0') + 'cm · 몸통 칸 ' + S.body + '/' + S.cells + '(기준 가닥 ' + S.thr.toFixed(1) + '개) · ' + Math.round(S.ms) + 'ms' +
        ' · 이 머리에서는 빗 = 가위(53번 결 정렬은 건너뜀)') + (S.err ? ' · ⚠ ' + S.err : ''));
    } catch (e) {}
    return L;
  };
  console.log(TAG + ' 설치 — 컬이 있는 머리(섹션 컬 평균 ' + F.minCurl + ' 이상)는 몸통에서 벗어난 잔머리를 잘라 내고, 빗질도 정렬 대신 자르기로 동작합니다. 끄기 FLY_TRIM.on=false 후 FLY_TRIM.refresh()');
})();
