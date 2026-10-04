/* ==========================================================================
 * 51-groom.js — 결 정리: 불규칙한 가닥을 자동으로 찾아 이웃 결에 맞춤 (터치로 제외 → [실행])
 *
 * 로드 위치: index.html 맨 끝(50-shoulders.js 다음).
 *
 * 왜 (2026-10-04 사용자): 원장이 시술한 시그니처 헤어를 촬영해 스타일로 등록하려는데, 사진에서 다시 기른 원본 머리가
 *   항상 완벽하지는 않다 — 결이 서로 구불구불하거나, 확 꺾이거나, 혼자 튀어나온 가닥이 있다.
 *   "그런 불규칙 가닥을 인근 헤어와 정렬시키면 된다. 자동 검출로 영역을 표시하고, 의도한 부분은 터치해서 제외,
 *    '결정리에서 제외할 대상을 터치하세요' 안내와 [실행] 버튼."
 *
 * 쓰는 법: 조정 화면(마네킹 OFF = 원본 머리)에서 [결 정리] →
 *   ① 불규칙한 가닥이 주황색으로 표시됩니다.
 *   ② 의도한 부분(일부러 낸 삐침·컬)은 그 자리를 톡 터치하면 그 묶음이 제외됩니다(하늘색 · 다시 터치하면 되돌아옴).
 *      드래그(회전)·두 손가락(확대/이동)은 그대로 됩니다 — 짧게 톡 친 것만 제외로 받습니다.
 *   ③ [실행] → 남은 가닥을 이웃 결에 맞춥니다. [되돌리기]로 원래대로.
 *
 * 무엇이 "불규칙"인가 (가닥을 뿌리에서 1.5cm 간격으로 다시 찍어, 뿌리가 가까운 이웃들과 견줌):
 *   · 흐름 이탈 — 뿌리에서 본 가닥의 궤적이 이웃들의 평균 궤적에서 벗어난 정도 ÷ 그 동네 가닥들이 원래 흩어진 정도.
 *     매끈한 동네에서 혼자 튀면 크게 나오고, 원래 다 같이 곱슬거리는 동네에서는 작게 나옵니다(의도한 컬을 덜 잡음).
 *   · 꺾임 — 1.5cm 사이에 방향이 확 바뀐 각도가 그 동네 중앙값의 2.5배를 넘고 기준 각도도 넘을 때.
 *   민감도(낮음/보통/높음)로 기준을 바꿉니다.
 *
 * 정리(실행): 가닥의 궤적을 이웃(불규칙 가닥을 뺀) 평균 궤적 쪽으로 strength(0.8)만큼 당기고, 살짝 펴고, 두상·목 밖으로 밀어냄.
 *   뿌리는 그대로, 점 개수도 그대로(색이 그대로 따라옴). 길이는 거의 그대로입니다.
 *
 * 스타일 등록과의 연결(다음 단계): 한 일의 기록(민감도 · 세기 · 제외한 묶음의 두피 위치)을 모델에 남깁니다(model.groom).
 *   지금은 이 손님의 원본 머리에만 적용됩니다.
 *
 * 끄기: GROOM.on=false (버튼이 사라짐) · 되돌리기 GROOM.undo()
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[결 정리]';
  var G = W.GROOM = Object.assign({
    on: true,
    sens: 1,                    // 0 낮음 · 1 보통 · 2 높음
    scoreThr: [3.0, 2.2, 1.6],  // 흐름 이탈 기준(동네 흩어짐의 몇 배)
    kinkDeg: [70, 55, 42],      // 꺾임 기준 각도
    kinkMul: 2.5,               // 동네 꺾임 중앙값의 몇 배
    strength: 0.8,              // 이웃 결 쪽으로 당기는 비율
    stepCm: 1.5,                // 가닥을 다시 찍는 간격
    cellCm: 1.6,                // "이웃"으로 보는 뿌리 칸
    groupCm: 3,                 // 터치 한 번으로 제외되는 묶음 크기
    maxJ: 24,
    tapPx: 28
  }, W.GROOM || {});
  var S = G.stats = { n: 0, flagged: 0, byDev: 0, byKink: 0, groups: 0, excluded: 0, applied: 0, ms: 0, undo: 0, err: null };
  G.active = false;

  var SENS = ['낮음', '보통', '높음'];
  var TXT = {
    btn: '결 정리', guide: '결정리에서 제외할 대상을 터치하세요', run: '실행', cancel: '취소', undo: '되돌리기',
    none: '불규칙한 가닥을 못 찾았어요 — 민감도를 올려 보세요',
    need: '원본 머리(마네킹 OFF)에서 쓸 수 있어요', sens: '민감도 '
  };
  try {
    if (typeof I18N !== 'undefined') {
      Object.assign(I18N, {
        '결 정리': 'Tidy strands', '결정리에서 제외할 대상을 터치하세요': 'Tap the parts to leave out of tidying',
        '불규칙한 가닥을 못 찾았어요 — 민감도를 올려 보세요': 'No irregular strands found — try a higher sensitivity',
        '원본 머리(마네킹 OFF)에서 쓸 수 있어요': 'Available on your own hair (mannequin OFF)',
        '민감도 낮음': 'Sensitivity: low', '민감도 보통': 'Sensitivity: medium', '민감도 높음': 'Sensitivity: high',
        '정리 대상 ': 'To tidy: ', '가닥 · 제외 ': ' strands · left out: ', '묶음': ' groups', '취소': 'Cancel',
        '결 정리 완료 — ': 'Tidied — ', '가닥을 이웃 결에 맞췄어요': ' strands aligned with their neighbours',
        '결 정리를 되돌렸어요': 'Tidying undone', '실행': 'Apply', '되돌리기': 'Undo'
      });
      try { ['실행', '되돌리기', '결 정리'].forEach(function (k) { I18N_EXACT_ONLY.add(k); }); } catch (e) {}
      try { _i18nSubKeys = null; } catch (e) {}
    }
  } catch (e) {}

  function scr() { try { return currentScreen; } catch (e) { return ''; } }
  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function toast(t) { try { if (typeof showToast === 'function') showToast(t); } catch (e) {} }
  function cmPer() { try { return modelCmPerUnit() || 19; } catch (e) { return 19; } }
  function mqOn() { try { return typeof MANNEQUIN !== 'undefined' && !!MANNEQUIN.on; } catch (e) { return false; } }
  function model() {
    try { var m = state.hair3Dneutral; return (m && m.strands && m.regrown && !m.mannequin) ? m : null; } catch (e) { return null; }
  }
  function m3() { try { return (typeof model3D !== 'undefined' && model3D && model3D.initialized) ? model3D : null; } catch (e) { return null; } }
  function dirty() { try { if (W.GPU_DIET && W.GPU_DIET.markDirty) W.GPU_DIET.markDirty(); } catch (e) {} }

  /* ── 검출 ─────────────────────────────────────────────────────────────── */
  var A = null;      // 분석 결과
  function keyOf(x, y, z, c) { return (Math.floor(x / c) + 512) + (Math.floor(y / c) + 512) * 1024 + (Math.floor(z / c) + 512) * 1048576; }
  var NB = [0, 1, -1, 1024, -1024, 1048576, -1048576];

  function analyze(m) {
    var t0 = now(), st = m.strands, N = st.length, J = G.maxJ, cm = cmPer(), ds = G.stepCm / cm, cell = G.cellCm / cm, gcell = G.groupCm / cm;
    var D = new Float32Array(N * J * 3), nJ = new Uint8Array(N), kink = new Float32Array(N), ck = new Int32Array(N), gk = new Int32Array(N);
    var i, j, k, p, r, a, b, seg, acc, need, t, off;
    for (i = 0; i < N; i++) {
      p = st[i].pts; if (!p || p.length < 2) continue;
      r = p[0]; ck[i] = keyOf(r.x, r.y, r.z, cell); gk[i] = keyOf(r.x, r.y, r.z, gcell);
      off = i * J * 3; acc = 0; need = ds; j = 0; a = r;
      for (k = 1; k < p.length && j < J; k++) {
        b = p[k]; seg = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        if (seg > 1e-9) {
          while (acc + seg >= need && j < J) {
            t = (need - acc) / seg;
            D[off + j * 3] = a.x + (b.x - a.x) * t - r.x; D[off + j * 3 + 1] = a.y + (b.y - a.y) * t - r.y; D[off + j * 3 + 2] = a.z + (b.z - a.z) * t - r.z;
            j++; need += ds;
          }
          acc += seg;
        }
        a = b;
      }
      nJ[i] = j;
      // 꺾임: 1.5cm 사이 방향 변화의 최댓값
      var px = D[off], py = D[off + 1], pz = D[off + 2], pl = Math.hypot(px, py, pz), mx = 0;
      for (k = 1; k < j; k++) {
        var qx = D[off + k * 3] - D[off + k * 3 - 3], qy = D[off + k * 3 + 1] - D[off + k * 3 - 2], qz = D[off + k * 3 + 2] - D[off + k * 3 - 1], ql = Math.hypot(qx, qy, qz);
        if (pl > 1e-9 && ql > 1e-9) { var c = (px * qx + py * qy + pz * qz) / (pl * ql), an = Math.acos(c > 1 ? 1 : c < -1 ? -1 : c) * 57.2958; if (an > mx) mx = an; }
        px = qx; py = qy; pz = qz; pl = ql;
      }
      kink[i] = mx;
    }

    /* 칸별 평균 궤적·흩어짐 → 이웃 칸과 섞은 기준 */
    function build(skip) {
      var cells = new Map(), cl, o, x, y, z;
      for (i = 0; i < N; i++) {
        if (!nJ[i] || (skip && skip[i])) continue;
        cl = cells.get(ck[i]);
        if (!cl) { cl = { sum: new Float64Array(J * 3), cnt: new Float64Array(J), spr: new Float64Array(J), kk: [] }; cells.set(ck[i], cl); }
        o = i * J * 3;
        for (j = 0; j < nJ[i]; j++) { cl.sum[j * 3] += D[o + j * 3]; cl.sum[j * 3 + 1] += D[o + j * 3 + 1]; cl.sum[j * 3 + 2] += D[o + j * 3 + 2]; cl.cnt[j]++; }
        cl.kk.push(kink[i]);
      }
      cells.forEach(function (c2) { for (var q = 0; q < J; q++) if (c2.cnt[q] > 0) { c2.sum[q * 3] /= c2.cnt[q]; c2.sum[q * 3 + 1] /= c2.cnt[q]; c2.sum[q * 3 + 2] /= c2.cnt[q]; } c2.kk.sort(function (u, v) { return u - v; }); c2.kmed = c2.kk.length ? c2.kk[c2.kk.length >> 1] : 0; });
      for (i = 0; i < N; i++) {
        if (!nJ[i] || (skip && skip[i])) continue;
        cl = cells.get(ck[i]); o = i * J * 3;
        for (j = 0; j < nJ[i]; j++) { x = D[o + j * 3] - cl.sum[j * 3]; y = D[o + j * 3 + 1] - cl.sum[j * 3 + 1]; z = D[o + j * 3 + 2] - cl.sum[j * 3 + 2]; cl.spr[j] += Math.sqrt(x * x + y * y + z * z); }
      }
      cells.forEach(function (c2) { for (var q = 0; q < J; q++) if (c2.cnt[q] > 0) c2.spr[q] /= c2.cnt[q]; });
      return cells;
    }
    /* 한 칸의 기준(자기 칸 ×2 + 맞닿은 6칸) — 필요할 때 만들어 기억 */
    function refOf(cells, key, memo) {
      var R = memo.get(key); if (R) return R;
      R = { mean: new Float32Array(J * 3), spr: new Float32Array(J), ok: new Uint8Array(J), kmed: 0 };
      var own = cells.get(key); R.kmed = own ? own.kmed : 0;
      for (var q = 0; q < J; q++) {
        var w = 0, sx = 0, sy = 0, sz = 0, sp = 0, n = 0;
        for (var b2 = 0; b2 < NB.length; b2++) {
          var c2 = cells.get(key + NB[b2]); if (!c2 || c2.cnt[q] < 2) continue;
          var ww = (b2 === 0 ? 2 : 1) * Math.min(1, c2.cnt[q] / 6);
          sx += ww * c2.sum[q * 3]; sy += ww * c2.sum[q * 3 + 1]; sz += ww * c2.sum[q * 3 + 2]; sp += ww * c2.spr[q]; w += ww; n += c2.cnt[q];
        }
        if (w > 0 && n >= 5) { R.mean[q * 3] = sx / w; R.mean[q * 3 + 1] = sy / w; R.mean[q * 3 + 2] = sz / w; R.spr[q] = sp / w; R.ok[q] = 1; }
      }
      memo.set(key, R); return R;
    }
    function scoreAll(cells, memo, score) {
      for (i = 0; i < N; i++) {
        score[i] = 0; if (nJ[i] < 2) continue;
        var R = refOf(cells, ck[i], memo), o = i * J * 3, s = 0, n = 0;
        for (j = 0; j < nJ[i]; j++) {
          if (!R.ok[j]) continue;
          var x = D[o + j * 3] - R.mean[j * 3], y = D[o + j * 3 + 1] - R.mean[j * 3 + 1], z = D[o + j * 3 + 2] - R.mean[j * 3 + 2];
          var fl = (0.25 + 0.04 * (j + 1) * G.stepCm) / cm;
          s += Math.sqrt(x * x + y * y + z * z) / (R.spr[j] + fl); n++;
        }
        if (n >= 2) score[i] = s / n;
      }
    }
    var score = new Float32Array(N), cells = build(null), memo = new Map();
    scoreAll(cells, memo, score);
    // 2차: 눈에 띄게 벗어난 가닥을 빼고 기준을 다시 잡음(불규칙 가닥이 평균을 끌고 가지 않게)
    var skip = new Uint8Array(N), thr0 = G.scoreThr[1];
    for (i = 0; i < N; i++) if (score[i] > thr0) skip[i] = 1;
    cells = build(skip); memo = new Map();
    scoreAll(cells, memo, score);
    A = { m: m, st: st, N: N, J: J, cm: cm, ds: ds, D: D, nJ: nJ, kink: kink, ck: ck, gk: gk, score: score, cells: cells, memo: memo, refOf: refOf,
      flag: null, groups: null, list: null, ms: now() - t0 };
    flagAll();
    return A;
  }
  function flagAll() {
    var a = A, thr = G.scoreThr[G.sens], kd = G.kinkDeg[G.sens], flag = new Uint8Array(a.N), i, groups = new Map(), list = [], byDev = 0, byKink = 0;
    for (i = 0; i < a.N; i++) {
      if (a.nJ[i] < 2) continue;
      var f = 0;
      if (a.score[i] > thr) { f = 1; byDev++; }
      else { var R = a.refOf(a.cells, a.ck[i], a.memo); if (a.kink[i] > kd && a.kink[i] > G.kinkMul * R.kmed) { f = 2; byKink++; } }
      if (!f) continue;
      flag[i] = f; list.push(i);
      var g = groups.get(a.gk[i]);
      if (!g) { g = { key: a.gk[i], idx: [], excluded: false, cx: 0, cy: 0, cz: 0 }; groups.set(a.gk[i], g); }
      g.idx.push(i); var r = a.st[i].pts[0]; g.cx += r.x; g.cy += r.y; g.cz += r.z;
    }
    groups.forEach(function (g2) { g2.cx /= g2.idx.length; g2.cy /= g2.idx.length; g2.cz /= g2.idx.length; });
    a.flag = flag; a.groups = groups; a.list = list;
    S.n = a.N; S.flagged = list.length; S.byDev = byDev; S.byKink = byKink; S.groups = groups.size; S.excluded = 0; S.ms = Math.round(a.ms);
  }

  /* ── 표시(주황 = 정리 대상 · 하늘 = 제외) ─────────────────────────────── */
  var overlay = null, ovIdx = null, ovStart = null;
  var COL_T = [1.0, 0.48, 0.0], COL_X = [0.35, 0.68, 1.0];
  function dropOverlay() {
    if (!overlay) return;
    try { if (overlay.parent) overlay.parent.remove(overlay); overlay.geometry.dispose(); overlay.material.dispose(); } catch (e) {}
    overlay = null; ovIdx = null; ovStart = null; dirty();
  }
  function geomOf(s) {
    try { var sty = (typeof uniformStyling === 'function') ? uniformStyling() : null; var g = adjustStrandGeom(s, null, sty); if (g && g.length >= 2) return g; } catch (e) {}
    return s.pts;
  }
  function buildOverlay() {
    dropOverlay();
    var M = m3(); if (!M || !A || !A.list.length || typeof THREE === 'undefined') return;
    var list = A.list, stride = Math.max(1, Math.ceil(list.length / 6000)), segs = 0, geos = [], i, k, g;
    ovIdx = []; ovStart = [];
    for (i = 0; i < list.length; i += stride) { g = geomOf(A.st[list[i]]); geos.push(g); ovIdx.push(list[i]); ovStart.push(segs); segs += g.length - 1; }
    ovStart.push(segs);
    var pos = new Float32Array(segs * 6), col = new Float32Array(segs * 6), o = 0;
    for (i = 0; i < geos.length; i++) {
      g = geos[i];
      for (k = 1; k < g.length; k++) { pos[o] = g[k - 1].x; pos[o + 1] = g[k - 1].y; pos[o + 2] = g[k - 1].z; pos[o + 3] = g[k].x; pos[o + 4] = g[k].y; pos[o + 5] = g[k].z; o += 6; }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    overlay = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
    overlay.name = 'groomOverlay'; overlay.renderOrder = 10; overlay.userData._geos = geos;
    M.headGroup.add(overlay);
    paintOverlay();
  }
  function paintOverlay() {
    if (!overlay) return;
    var col = overlay.geometry.attributes.color.array, i, k, c;
    for (i = 0; i < ovIdx.length; i++) {
      c = A.groups.get(A.gk[ovIdx[i]]).excluded ? COL_X : COL_T;
      for (k = ovStart[i] * 6; k < ovStart[i + 1] * 6; k += 3) { col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2]; }
    }
    overlay.geometry.attributes.color.needsUpdate = true; dirty();
  }

  /* ── 터치로 제외 ──────────────────────────────────────────────────────── */
  function pick(clientX, clientY) {
    var M = m3(); if (!M || !overlay) return null;
    var cv = M.renderer.domElement, rc = cv.getBoundingClientRect();
    if (!(rc.width > 0)) return null;
    M.headGroup.updateMatrixWorld(true); M.camera.updateMatrixWorld(true);
    var mat = new THREE.Matrix4().multiplyMatrices(M.camera.projectionMatrix, M.camera.matrixWorldInverse).multiply(M.headGroup.matrixWorld), e = mat.elements;
    var geos = overlay.userData._geos, best = -1, bestZ = Infinity, r2 = G.tapPx * G.tapPx, i, k, g, p;
    for (i = 0; i < geos.length; i++) {
      g = geos[i];
      for (k = 1; k < g.length; k += 2) {
        p = g[k];
        var w = e[3] * p.x + e[7] * p.y + e[11] * p.z + e[15]; if (!(w > 1e-6)) continue;
        var nx = (e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]) / w, ny = (e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]) / w, nz = (e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14]) / w;
        var sx = rc.left + (nx + 1) / 2 * rc.width, sy = rc.top + (1 - ny) / 2 * rc.height, dx = sx - clientX, dy = sy - clientY;
        if (dx * dx + dy * dy <= r2 && nz < bestZ) { bestZ = nz; best = i; }
      }
    }
    return best < 0 ? null : A.groups.get(A.gk[ovIdx[best]]);
  }
  var down = null;
  document.addEventListener('pointerdown', function (ev) {
    down = null;
    if (!G.active) return;
    var M = m3(); if (!M || ev.target !== M.renderer.domElement) return;
    down = { x: ev.clientX, y: ev.clientY, t: now(), id: ev.pointerId, multi: false };
  }, true);
  document.addEventListener('pointermove', function (ev) {
    if (down && ev.pointerId !== down.id) down.multi = true;
  }, true);
  document.addEventListener('pointerup', function (ev) {
    var d = down; down = null;
    if (!G.active || !d || d.multi || ev.pointerId !== d.id) return;
    if (now() - d.t > 450 || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 9) return;     // 드래그·길게 누름은 회전 등
    try {
      var g = pick(ev.clientX, ev.clientY);
      if (!g) return;
      g.excluded = !g.excluded;
      S.excluded += g.excluded ? 1 : -1;
      paintOverlay(); syncBar();
    } catch (e) { S.err = String(e && e.message || e); }
  }, true);

  /* ── 실행 ─────────────────────────────────────────────────────────────── */
  function redraw() {
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) {}
  }
  function apply() {
    var a = A; if (!a) return 0;
    var Es = null, CY = 0, n = 0, J = a.J, ds = a.ds, w0 = Math.max(0, Math.min(1, G.strength));
    try { Es = getScalpEllipsoid(); CY = a.m.CY != null ? a.m.CY : SCALP_CENTER_Y; } catch (e) { Es = null; }
    var NK = W.REGROW && W.REGROW.neckPush;
    // 기준: 표시된(불규칙) 가닥을 전부 빼고 잡은 이웃 평균은 analyze의 2차에서 이미 근사했음 — 그대로 씀
    a.list.forEach(function (i) {
      if (a.groups.get(a.gk[i]).excluded) return;
      var s = a.st[i], p = s.pts, R = a.refOf(a.cells, a.ck[i], a.memo), o = i * J * 3, nj = a.nJ[i], j, k;
      // 간격마다의 "이웃 평균 − 내 궤적"
      var off = new Float32Array((nj + 1) * 3), last = -1;
      for (j = 0; j < nj; j++) {
        if (R.ok[j]) { off[(j + 1) * 3] = R.mean[j * 3] - a.D[o + j * 3]; off[(j + 1) * 3 + 1] = R.mean[j * 3 + 1] - a.D[o + j * 3 + 1]; off[(j + 1) * 3 + 2] = R.mean[j * 3 + 2] - a.D[o + j * 3 + 2]; last = j + 1; }
        else if (last >= 0) { off[(j + 1) * 3] = off[last * 3]; off[(j + 1) * 3 + 1] = off[last * 3 + 1]; off[(j + 1) * 3 + 2] = off[last * 3 + 2]; }
      }
      if (last < 0) return;
      var np = new Array(p.length), acc = 0;
      np[0] = p[0];
      for (k = 1; k < p.length; k++) {
        acc += Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y, p[k].z - p[k - 1].z);
        var u = acc / ds, j0 = Math.floor(u), f = u - j0;
        if (j0 >= nj) { j0 = nj; f = 0; }
        var j1 = Math.min(nj, j0 + 1);
        var ox = off[j0 * 3] + (off[j1 * 3] - off[j0 * 3]) * f, oy = off[j0 * 3 + 1] + (off[j1 * 3 + 1] - off[j0 * 3 + 1]) * f, oz = off[j0 * 3 + 2] + (off[j1 * 3 + 2] - off[j0 * 3 + 2]) * f;
        np[k] = { x: p[k].x + ox * w0, y: p[k].y + oy * w0, z: p[k].z + oz * w0 };
      }
      // 살짝 펴기(뿌리·끝 고정) — 확 꺾인 자리
      for (var it = 0; it < 2; it++) {
        var sm = new Array(np.length); sm[0] = np[0]; sm[np.length - 1] = np[np.length - 1];
        for (k = 1; k < np.length - 1; k++) sm[k] = { x: np[k].x * 0.5 + (np[k - 1].x + np[k + 1].x) * 0.25, y: np[k].y * 0.5 + (np[k - 1].y + np[k + 1].y) * 0.25, z: np[k].z * 0.5 + (np[k - 1].z + np[k + 1].z) * 0.25 };
        np = sm;
      }
      for (k = 1; k < np.length; k++) {
        if (Es) { try { np[k] = ellipsoidPushOut(np[k], Es.a, Es.b, Es.c, CY); } catch (e) {} }
        if (NK) { try { np[k] = NK(np[k]); } catch (e) {} }
      }
      if (!s._groom0) s._groom0 = p;                       // 처음 모양(되돌리기용)
      if (p._rgKeep) { try { np._rgKeep = true; } catch (e) {} }
      s.pts = np; n++;
    });
    var ex = [];
    a.groups.forEach(function (g) { if (g.excluded) ex.push({ x: +g.cx.toFixed(4), y: +g.cy.toFixed(4), z: +g.cz.toFixed(4) }); });
    try { a.m.groom = { sens: G.sens, strength: G.strength, groupCm: G.groupCm, excluded: ex, n: n, flagged: a.list.length, at: Date.now() }; } catch (e) {}
    S.applied = n;
    return n;
  }
  G.undo = function () {
    var m = model(), n = 0; if (!m) return 0;
    m.strands.forEach(function (s) { if (s._groom0) { s.pts = s._groom0; s._groom0 = null; n++; } });
    try { m.groom = null; } catch (e) {}
    if (n) { S.undo++; redraw(); toast('결 정리를 되돌렸어요'); }
    return n;
  };
  function hasUndo() { var m = model(); if (!m) return false; for (var i = 0; i < m.strands.length; i += 1) if (m.strands[i]._groom0) return true; return false; }

  /* ── 화면 ─────────────────────────────────────────────────────────────── */
  var btn = null, bar = null, elGuide = null, elInfo = null, elSens = null, elUndo = null, elRun = null;
  function mkBtn(label, primary, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = 'font-size:12px;padding:6px 11px;border-radius:9px;border:1px solid ' + (primary ? '#d08a45' : 'rgba(255,255,255,.28)') + ';' +
      'background:' + (primary ? '#d08a45' : 'rgba(255,255,255,.08)') + ';color:' + (primary ? '#1a1410' : '#fff') + ';font-weight:' + (primary ? '700' : '500') + ';';
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return b;
  }
  function ensureUi() {
    var pv = document.querySelector('#screen-adjust .adjust-preview'), mq = document.getElementById('mannequinBtn');
    if (!pv) return false;
    if (!btn && mq && mq.parentNode) {
      btn = document.createElement('button'); btn.id = 'groomBtn'; btn.type = 'button';
      if (mq.className) btn.className = mq.className.replace(/(^|\s)on(\s|$)/g, ' ').trim();
      btn.textContent = TXT.btn; btn.title = '불규칙한 가닥을 찾아 이웃 결에 맞춥니다';
      btn.addEventListener('click', function () { if (G.active) G.exit(); else G.enter(); });
      mq.parentNode.appendChild(btn);
    }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'groomBar';
      bar.style.cssText = 'position:absolute;left:8px;right:8px;bottom:46px;z-index:8;display:none;background:rgba(20,16,12,.86);color:#fff;border-radius:12px;padding:8px 10px;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.35);';
      elGuide = document.createElement('div'); elGuide.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:3px;';
      elInfo = document.createElement('div'); elInfo.style.cssText = 'font-size:11px;opacity:.82;margin-bottom:7px;';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
      elSens = mkBtn('', false, function () { G.sens = (G.sens + 1) % 3; if (A) { flagAll(); buildOverlay(); } syncBar(); });
      elUndo = mkBtn(TXT.undo, false, function () { G.exit(); G.undo(); });
      var sp = document.createElement('span'); sp.style.cssText = 'flex:1;';
      var bc = mkBtn(TXT.cancel, false, function () { G.exit(); });
      elRun = mkBtn(TXT.run, true, function () { G.run(); });
      row.appendChild(elSens); row.appendChild(elUndo); row.appendChild(sp); row.appendChild(bc); row.appendChild(elRun);
      bar.appendChild(elGuide); bar.appendChild(elInfo); bar.appendChild(row);
      pv.appendChild(bar);
    }
    return true;
  }
  function syncBtn() {
    if (!ensureUi() || !btn) return;
    var show = G.on && scr() === 'adjust' && !mqOn() && !!(W.ADJUST3D && W.ADJUST3D.on);
    btn.style.display = show ? '' : 'none';
    try { btn.classList.toggle('on', !!G.active); } catch (e) {}
    if (!show && G.active) G.exit();
  }
  function syncBar() {
    if (!bar) return;
    bar.style.display = G.active ? 'block' : 'none';
    if (!G.active) return;
    var none = !A || !A.list.length;
    elGuide.textContent = none ? TXT.none : TXT.guide;
    elInfo.textContent = none ? '' : '정리 대상 ' + (S.flagged - excludedStrands()) + '가닥 · 제외 ' + S.excluded + '묶음';
    elSens.textContent = TXT.sens + SENS[G.sens];
    elUndo.style.display = hasUndo() ? '' : 'none';
    elRun.disabled = none; elRun.style.opacity = none ? '0.45' : '1';
  }
  function excludedStrands() { var n = 0; if (A) A.groups.forEach(function (g) { if (g.excluded) n += g.idx.length; }); return n; }

  G.enter = function () {
    var m = model();
    if (!m || !(W.ADJUST3D && W.ADJUST3D.on)) { toast(TXT.need); return false; }
    try { analyze(m); } catch (e) { S.err = String(e && e.message || e); console.warn(TAG + ' 검출 실패', e); toast('결 정리: 검출 실패'); return false; }
    G.active = true;
    buildOverlay(); syncBtn(); syncBar();
    console.log(TAG + ' 검출 — 가닥 ' + S.n + '개 중 불규칙 ' + S.flagged + '개(흐름 이탈 ' + S.byDev + ' · 꺾임 ' + S.byKink + ') · 묶음 ' + S.groups + '곳 · ' + S.ms + 'ms · 민감도 ' + SENS[G.sens]);
    return true;
  };
  G.exit = function () {
    G.active = false; dropOverlay(); A = null; syncBtn(); syncBar();
  };
  G.run = function () {
    if (!G.active || !A || !A.list.length) return 0;
    var n = 0;
    try { n = apply(); } catch (e) { S.err = String(e && e.message || e); console.warn(TAG + ' 실행 실패', e); }
    var fl = S.flagged, ex = S.excluded;
    G.exit();
    if (n) { redraw(); toast('결 정리 완료 — ' + n + '가닥을 이웃 결에 맞췄어요'); }
    console.log(TAG + ' 실행 — 불규칙 ' + fl + '개 중 ' + n + '개 정리 · 제외 ' + ex + '곳 · 세기 ' + G.strength);
    return n;
  };

  // 화면이 다시 그려질 때: 버튼 보이기/숨기기, 표시가 장면에서 떨어졌으면 다시 붙임
  var raf = W.renderAdjustFrame, ovTimer = null;
  if (typeof raf === 'function') W.renderAdjustFrame = function () {
    var r = raf.apply(this, arguments);
    try {
      syncBtn();
      if (G.active) {
        if (ovTimer) clearTimeout(ovTimer);
        ovTimer = setTimeout(function () { ovTimer = null; if (G.active && model() === (A && A.m)) buildOverlay(); else if (G.active) G.exit(); }, 400);
      }
    } catch (e) {}
    return r;
  };
  var act = W.activateScreen;
  if (typeof act === 'function') W.activateScreen = function (name) {
    var r = act.apply(this, arguments);
    try { if (name !== 'adjust' && G.active) G.exit(); setTimeout(syncBtn, 0); } catch (e) {}
    return r;
  };
  var tmq = W.toggleMannequin;
  if (typeof tmq === 'function') W.toggleMannequin = function () { var r = tmq.apply(this, arguments); try { if (G.active) G.exit(); setTimeout(syncBtn, 0); } catch (e) {} return r; };

  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [], m = model(), rec = m && m.groom;
    return L.concat([TAG + ' ' + (G.on ? '켜짐' : '꺼짐') + (G.active ? ' · 고르는 중' : '') + ' · 민감도 ' + SENS[G.sens] +
      ' · 직전 검출: 가닥 ' + S.n + '개 중 불규칙 ' + S.flagged + '개(흐름 이탈 ' + S.byDev + ' · 꺾임 ' + S.byKink + ') · 묶음 ' + S.groups + '곳 · ' + S.ms + 'ms' +
      ' · 직전 실행: ' + S.applied + '가닥 정리' + (rec ? ' (제외 ' + rec.excluded.length + '곳 · 세기 ' + rec.strength + ')' : '') + ' · 되돌린 횟수 ' + S.undo + (S.err ? ' · ⚠ ' + S.err : '')]);
  };

  try { ensureUi(); syncBtn(); } catch (e) {}
  console.log(TAG + ' 설치 — 조정 화면(마네킹 OFF)의 [결 정리]: 불규칙 가닥 자동 표시 → 터치로 제외 → [실행]. 되돌리기 GROOM.undo()');
})();
