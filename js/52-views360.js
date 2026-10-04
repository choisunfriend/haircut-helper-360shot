/* ==========================================================================
 * 52-views360.js — 360° 세트의 나머지 사진을 "형태 계산"에 넣기
 *
 * 로드 위치: index.html 맨 끝(51-roots-fallback.js 다음).
 *
 * 왜 (2026-10-05 · 사용자): "사진 4장은 보여주기 위해서 4장인 거고, 전체 14장은 렌더링 전에 형태를 만드는 계산에 쓰는 것."
 *   45번(360° 촬영)은 14장을 뽑아 놓고 4장(정면·좌45·우45·후면)만 흐름에 넣었고, 나머지는 state.shots360에 들고만 있었습니다.
 *   그래서 360으로 찍어도 형태 계산은 4장짜리와 같았습니다(진짜 옆모습이 없어 뒤통수 두께를 못 재고, 귀 뒤·뒤통수 옆의 결도 못 읽음).
 *
 * 무엇을:
 *   ① 분석 — 기존 4장의 머리 추출이 끝난 직후(분석 모델이 올라와 있는 동안) 나머지 사진도 같은 extractHairMask로 분석합니다.
 *      결과(머리 마스크·결 방향·숱 격자)는 state.hairMasks['v90'] 같은 키로 들어갑니다(v90 = 손님 왼쪽 90°, vm90 = 오른쪽 90°).
 *      화면·슬롯·2D 조정은 그대로 4장입니다(state.shots에는 넣지 않음 · 사진 원본과 캔버스는 분석 뒤 버림).
 *   ② 카메라 맞추기 — 얼굴이 안 보이는 각도가 대부분이라 얼굴 랜드마크 없이 맞춥니다.
 *        방향   = 촬영 때 센서 각도(정면으로 고른 장의 센서 각도 ↔ 정면 얼굴 실측 yaw를 맞춤). 고개 숙임·기울임은 0.
 *        배율   = 정면 배율 × (정면의 "정수리→어깨선" 픽셀 ÷ 이 사진의 "정수리→어깨선" 픽셀) — 세로 길이는 돌아도 안 변한다는 가정.
 *                 어깨선이 안 잡히는 사진(옆모습은 어깨가 안 벌어짐)은 "정수리→목 밑동"으로 같은 계산.
 *                 둘 다 못 찾으면 찾은 이웃 각도 사이를 보간, 그것도 없으면 정면과 같은 거리로 가정.
 *        가로 중심 = 정수리 아래 얕은 깊이(머리 높이의 capDepth)에서 머리 윤곽을 가로지른 선의 가운데.
 *        세로 기준 = 머리 맨 위(기존 4장과 같은 규칙).
 *      ⚠ 실제 360 촬영본 없이 합성 장면으로만 맞춘 규칙입니다(합성에서 배율 오차 최대 5.5% · 가로 중심 2px · 맨 위 1px).
 *        진단 [360 뷰]에서 옆·뒤 사진의 "맞음 %"가 낮으면 그 사진의 보정이 틀린 것 — VIEWS360.skip=['v90'] 처럼 빼거나,
 *        그 줄을 보내 주면 규칙을 고칩니다. (앞쪽 사진은 얼굴에 가려 원래 낮게 나옵니다.)
 *   ③ 넣기 — 13b makeHairOccupancyProbe(점유 프로브)를 만들 때 추가 카메라를 같이 넣습니다. 프로브의 카메라를 읽는 계산이
 *      전부 14장을 보게 됩니다: 점유(머리 영역) 판정 · 뿌리밀도 · 다시 기르기(42)의 머리 영역 투표·두께 재기·결 읽기 · 마네킹 앞머리 판정.
 *      사진 가닥 들어올리기(13c)와 2D 화면은 예전대로 4장입니다.
 *      합성 장면(뒤통수 아래가 불룩한 단발 · 14방향)으로 본 효과: 다시 기르기 방식의 두께 재기 — 직접 잰 칸 244 → 415(/796),
 *      두께 오차 중앙값 3.1cm → 0.4cm. 점유 판정(probe.at)은 "그 자리를 정면으로 보는 사진"의 가중 평균이라 사진 수로는 거의 안 변합니다.
 *   ④ 진단 [360 뷰] — 어느 사진이 들어갔는지, 배율을 어떻게 정했는지, 지금 3D 가닥이 그 사진의 머리 영역 안에 떨어지는 비율.
 *
 * 아직 안 하는 것: 추가 사진의 얼굴 랜드마크(얼굴 옆 깊이에는 아직 안 씀) · 고개 숙임/기울임 보정 · 원근(가까운 쪽이 크게 찍히는 것).
 *
 * 끄기: VIEWS360.on=false 후 사진을 다시 분석(또는 마네킹을 켰다 끄면 프로브는 그대로라 안 바뀜 — 다시 분석해야 함).
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[360 뷰]';
  var X = W.VIEWS360 = Object.assign({
    on: true,
    shoulderK: 1.6,     // 어깨선 A = 사람 윤곽 폭이 그 위쪽 폭 중앙값의 이 배수를 넘는 첫 줄(13a 실루엣 앵커와 같은 규칙)
    neckK: 1.25, neckMax: 0.8,    // 목 밑동 B = 목(가장 좁은 줄 · 머리 최대 폭의 neckMax 미만) 아래로 폭이 목의 neckK배를 넘기 직전 줄
    capDepth: 0.12,     // 가로 중심을 재는 깊이(정수리→어깨선 높이 대비)
    ratioLo: 0.7, ratioHi: 1.4,   // 배율 비가 이 밖이면 못 믿음(어깨선 오검출)
    minCols: 0.08,      // 머리 윗선이 잡힌 열이 사진 폭의 이만큼은 돼야 씀
    skip: [],           // 빼고 싶은 뷰 키(예: ['v90'])
    agreeWarn: 0.8      // 옆·뒤 사진의 "맞음 %"가 이보다 낮으면 ⚠
  }, W.VIEWS360 || {});
  X.views = {}; X.order = []; X.ref = null; X.busy = false; X.setFp = null; X.fp = null; X.forSet = null; X.note = ''; X.last = null;

  var BASE = ['front', 'left', 'right', 'back'];
  function tail(u) { return typeof u === 'string' ? u.length + ':' + u.slice(-24) : ''; }
  function fpNow() { try { return BASE.map(function (a) { return tail(state.shots && state.shots[a]); }).join('|'); } catch (e) { return ''; } }
  function wrapDeg(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d === -180 ? 180 : d; }
  function keyOf(deg) { var d = Math.round(wrapDeg(deg)); return 'v' + (d < 0 ? 'm' + (-d) : d); }
  function nearest(frames, deg, maxOff) {
    var best = null, bd = 1e9;
    frames.forEach(function (f) { var d = Math.abs(wrapDeg(f.deg - deg)); if (d < bd) { bd = d; best = f; } });
    return best && bd <= maxOff ? best : null;
  }
  /* 45번 applySet과 같은 규칙으로 4장을 고름 */
  function picks(set) { return { front: nearest(set.frames, 0, 20), left: nearest(set.frames, 45, 25), right: nearest(set.frames, -45, 25), back: nearest(set.frames, 180, 35) }; }
  function isExtraKey(k) { return /^vm?\d+$/.test(k); }

  /* ────────────────────────────────────────────────────────────────────────
   * 사진 한 장에서 카메라 맞추기에 쓸 치수 재기
   * ────────────────────────────────────────────────────────────────────── */
  /* 사람 윤곽: 맨 윗줄 · 어깨선(마스크 줄 번호). 못 찾으면 -1
     어깨선 A = 윤곽 폭이 그 위쪽 폭 중앙값의 shoulderK배를 넘는 첫 줄(13a 실루엣 앵커와 같은 규칙 — 앞·뒤에서 잘 잡힘)
     목 밑동 B = 머리 가장 넓은 줄 아래에서 가장 좁은 줄(목)을 찾고, 그 아래로 폭이 목 폭의 neckK배를 넘기 직전 줄
                (옆모습은 어깨가 안 벌어져 A가 안 잡힘 — 목은 옆에서도 보임. 머리가 목을 덮으면 B가 안 잡힘) */
  function personStats(pm, mw, mh) {
    var out = { top: -1, shoulder: -1, neckBase: -1 };
    if (!pm || !(mw > 8) || !(mh > 8)) return out;
    var y, x, l, r, cnt, widths = [], rows = [], sorted, med;
    for (y = 0; y < mh; y++) {
      l = -1; r = -1; cnt = 0;
      for (x = 0; x < mw; x++) if (pm[y * mw + x]) { if (l < 0) l = x; r = x; cnt++; }
      if (out.top < 0) { if (cnt >= 3) out.top = y; else continue; }
      var wd = l < 0 ? 0 : r - l + 1;
      rows.push(wd);
      if (out.shoulder < 0 && wd > 0) {
        if (widths.length > 8) {
          sorted = widths.slice().sort(function (a, b) { return a - b; }); med = sorted[sorted.length >> 1];
          if (wd > med * X.shoulderK) out.shoulder = y;
        }
        if (out.shoulder < 0) widths.push(wd);
      }
    }
    // B: 목 밑동
    var n = rows.length, i, wmax = 0, imax = 0, lim = Math.min(n, Math.round((out.shoulder >= 0 ? out.shoulder - out.top : n) * 0.6));   // 머리 구간만(어깨선 A를 찾았으면 그 위쪽 60%)
    for (i = 0; i < lim; i++) if (rows[i] > wmax) { wmax = rows[i]; imax = i; }
    if (wmax > 8) {
      var wmin = wmax, imin = -1;
      for (i = imax + 1; i < n; i++) {
        if (rows[i] > 0 && rows[i] < wmin) { wmin = rows[i]; imin = i; }
        if (imin >= 0 && rows[i] > wmin * X.neckK) break;
      }
      if (imin >= 0 && wmin < wmax * X.neckMax && i < n) out.neckBase = out.top + i - 1;
    }
    return out;
  }
  /* 머리 윗선(scalpY)에서: 좌우 끝 · 맨 위 · 정수리 아래 얕은 깊이의 가로 중심 */
  function measure(mi) {
    if (!mi || !mi.scalpY || !(mi.w > 8) || !(mi.h > 8)) return null;
    var sY = mi.scalpY, w = mi.w, x, minX = Infinity, maxX = -Infinity, crown = Infinity, valid = 0;
    for (x = 0; x < w; x++) { var v = sY[x]; if (v >= 0) { valid++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (v < crown) crown = v; } }
    if (!(maxX > minX) || !isFinite(crown)) return null;
    var mw = mi.maskW || w, mh = mi.maskH || mi.h, ky = mi.h / mh;
    var ps = personStats(mi.personMask, mw, mh);
    var top = ps.top >= 0 ? ps.top * ky : -1, sh = ps.shoulder >= 0 ? ps.shoulder * ky : -1, nb = ps.neckBase >= 0 ? ps.neckBase * ky : -1;
    var H = (top >= 0 && sh > top) ? sh - top : 0, HB = (top >= 0 && nb > top) ? nb - top : 0;
    var depth = X.capDepth * (H > 0 ? H : HB > 0 ? HB : (maxX - minX));
    var cl = Infinity, cr = -Infinity;
    for (x = 0; x < w; x++) if (sY[x] >= 0 && sY[x] <= crown + depth) { if (x < cl) cl = x; if (x > cr) cr = x; }
    return { w: w, h: mi.h, minX: minX, maxX: maxX, hw: (maxX - minX) / 2, crown: crown, valid: valid, top: top, shoulder: sh, H: H, neckBase: nb, HB: HB,
      capCx: cr >= cl ? (cl + cr) / 2 : (minX + maxX) / 2 };
  }
  X._measure = measure;

  /* ────────────────────────────────────────────────────────────────────────
   * ① 나머지 사진 분석
   * ────────────────────────────────────────────────────────────────────── */
  function dropKey(k) {
    ['shots', 'hairCanvases', 'baseCanvases', 'baseFillCanvases', 'strandPaths', 'landmarks', 'captureLmStatus', 'capturePose', 'poseEars'].forEach(function (n) {
      try { if (state[n] && k in state[n]) delete state[n][k]; } catch (e) {}
    });
    try { if (typeof imgCache !== 'undefined' && imgCache[k]) delete imgCache[k]; } catch (e) {}
  }
  function clearViews() {
    try { Object.keys(state.hairMasks || {}).forEach(function (k) { if (isExtraKey(k)) delete state.hairMasks[k]; }); } catch (e) {}
    Object.keys(X.views).forEach(dropKey);
    X.views = {}; X.order = []; X.ref = null; X.fp = null; X.forSet = null;
  }
  X.clear = clearViews;
  /* 지금 4장이 360 세트에서 온 그대로인가 */
  function setLive() { try { return !!(state.shots360 && state.shots360.frames && X.setFp && X.setFp === fpNow()); } catch (e) { return false; } }
  function active() { return !!(X.on && setLive() && X.forSet === state.shots360 && X.fp === fpNow() && X.order.length); }
  X.active = active;

  var prevExtract = null;                 // 설치 때 채움
  X.extractOne = function (key) { return prevExtract ? prevExtract(key) : Promise.resolve(false); };   // 테스트에서 바꿔 끼울 수 있게

  /* 배율 비: 어깨선을 찾은 뷰는 직접, 못 찾은 뷰는 찾은 이웃 사이 보간 */
  function fillRatios() {
    var ref = X.ref, known = [{ deg: 0, r: 1 }];
    X.order.forEach(function (k) {
      var v = X.views[k], m = v.m; v.ratio = null; v.ratioSrc = '';
      var r = 0, src = '';
      if (ref && ref.H > 0 && m && m.H > 0) { r = ref.H / m.H; src = '어깨선'; }
      else if (ref && ref.HB > 0 && m && m.HB > 0) { r = ref.HB / m.HB; src = '목 밑동'; }
      if (r > 0) {
        if (r >= X.ratioLo && r <= X.ratioHi) { v.ratio = r; v.ratioSrc = src; known.push({ deg: v.deg, r: r }); }
        else v.ratioSrc = src + ' 비가 범위 밖(' + r.toFixed(2) + ')';
      }
    });
    X.order.forEach(function (k) {
      var v = X.views[k]; if (v.ratio != null) return;
      var lo = null, hi = null, dl = 1e9, dh = 1e9;
      known.forEach(function (q) {
        var d = wrapDeg(q.deg - v.deg);
        if (d <= 0 && -d < dl) { dl = -d; lo = q; }
        if (d >= 0 && d < dh) { dh = d; hi = q; }
      });
      if (lo && hi && dl + dh > 0 && dl + dh < 200) { v.ratio = (lo.r * dh + hi.r * dl) / (dl + dh); v.ratioSrc = (v.ratioSrc ? v.ratioSrc + ' → ' : '') + '이웃 보간'; }
      else if (lo || hi) { v.ratio = (lo || hi).r; v.ratioSrc = (v.ratioSrc ? v.ratioSrc + ' → ' : '') + '가까운 뷰 값'; }
      else { v.ratio = (ref && ref.h > 0 && v.m && v.m.h > 0) ? ref.h / v.m.h : 1; v.ratioSrc = (v.ratioSrc ? v.ratioSrc + ' → ' : '') + '같은 거리 가정'; }
    });
  }

  X.prepare = function () {
    if (X.busy) return X.busy;
    var set = state.shots360;
    if (!X.on || !set || !set.frames || !setLive()) return Promise.resolve(false);
    if (X.forSet === set && X.fp === fpNow()) return Promise.resolve(true);
    clearViews();
    var p = picks(set), used = [p.front, p.left, p.right, p.back], seen = {}, list = [];
    set.frames.forEach(function (f) {
      if (!f || !f.url || used.indexOf(f) >= 0) return;
      var k = keyOf(f.deg); if (seen[k] || X.skip.indexOf(k) >= 0) return;
      seen[k] = true; list.push({ key: k, deg: wrapDeg(f.deg), url: f.url });
    });
    list.sort(function (a, b) { return a.deg - b.deg; });
    X.degFront = p.front ? wrapDeg(p.front.deg) : 0;
    try { X.ref = measure(state.hairMasks && state.hairMasks.front); } catch (e) { X.ref = null; }
    var cap = (typeof capShotDataURL === 'function') ? capShotDataURL : function (u) { return Promise.resolve(u); };
    var t0 = Date.now(), okN = 0, i = 0, fp0 = fpNow();
    function one() {
      if (i >= list.length) return Promise.resolve();
      var it = list[i++];
      try { if (typeof showAI === 'function') showAI('360° 사진 분석 중… ' + i + '/' + list.length, Math.round(it.deg) + '° 사진'); } catch (e) {}
      return cap(it.url).then(function (u) {
        state.shots[it.key] = u;
        return X.extractOne(it.key);
      }).then(function (ok) {
        var mi = state.hairMasks && state.hairMasks[it.key], m = null;
        if (ok && mi) { try { m = measure(mi); } catch (e) { m = null; } }
        if (m) {
          // 가볍게: 형태 계산에 쓰는 것만 남김
          ['photoRGB', 'personMask', 'reasonCanvas', 'avgColorsBySection', 'colorPalette', 'faceBoxDiag'].forEach(function (n) { try { mi[n] = null; } catch (e) {} });
          mi._x360 = true;
          X.views[it.key] = { key: it.key, deg: it.deg, m: m, cal: null, ratio: null, ratioSrc: '' };
          X.order.push(it.key); okN++;
        } else {
          try { if (state.hairMasks) delete state.hairMasks[it.key]; } catch (e) {}
          console.warn(TAG + ' ' + it.key + '(' + Math.round(it.deg) + '°) 분석 실패 — 이 사진은 안 씁니다');
        }
        dropKey(it.key);
      }, function (e) {
        try { if (state.hairMasks) delete state.hairMasks[it.key]; } catch (x) {}
        dropKey(it.key);
        console.warn(TAG + ' ' + it.key + ' 분석 중 오류 — 안 씁니다', e);
      }).then(one);
    }
    X.busy = one().then(function () {
      X.busy = false;
      if (fpNow() !== fp0) { clearViews(); console.warn(TAG + ' 분석하는 사이 사진이 바뀌어 버립니다'); return false; }
      fillRatios();
      X.forSet = set; X.fp = fp0;
      X.note = '추가 ' + list.length + '장 중 ' + okN + '장 분석 · ' + (Date.now() - t0) + 'ms';
      console.log(TAG + ' ' + X.note + ' — ' + X.order.map(function (k) { var v = X.views[k]; return k + ' ×' + v.ratio.toFixed(3) + '(' + v.ratioSrc + ')'; }).join(' · '));
      return okN > 0;
    }, function (e) { X.busy = false; console.warn(TAG + ' 준비 실패', e); return false; });
    return X.busy;
  };

  /* 4장 추출이 끝난 직후(모델이 올라와 있는 동안) 이어서 */
  if (typeof W.extractHairMask === 'function') {
    prevExtract = W.extractHairMask;
    W.extractHairMask = function (angle) {
      var p = prevExtract.apply(this, arguments);
      if (angle !== 'back' || !p || typeof p.then !== 'function') return p;
      return p.then(function (r) {
        var go = false; try { go = X.on && setLive() && !(X.forSet === state.shots360 && X.fp === fpNow()); } catch (e) {}
        if (!go) { try { if (!setLive() && X.order.length) clearViews(); } catch (e) {} return r; }
        return Promise.resolve(X.prepare()).then(function () { return r; }, function () { return r; });
      });
    };
  }
  /* 세트를 넣은 순간의 4장 지문 — 이후 4장이 바뀌면(다른 손님 사진) 추가 사진은 안 씀 */
  try {
    var Q = W.SHOT360, oApply = Q && Q.applySet;
    if (typeof oApply === 'function') Q.applySet = function (set) {
      clearViews(); X.setFp = null;
      return Promise.resolve(oApply.apply(Q, arguments)).then(function (ok) { if (ok) X.setFp = fpNow(); return ok; });
    };
  } catch (e) { console.warn(TAG + ' applySet 연결 실패', e); }
  /* 3D를 만들기 직전에 한 번 더(추출 때 못 했으면) */
  var oBuild = W.buildNeutralHair3D;
  if (typeof oBuild === 'function') W.buildNeutralHair3D = function (cb) {
    var self = this, args = arguments, need = false;
    try { need = X.on && setLive() && !(X.forSet === state.shots360 && X.fp === fpNow()); } catch (e) {}
    if (!need) { try { if (!setLive() && X.order.length) clearViews(); } catch (e) {} return oBuild.apply(self, args); }
    var hasModel = false; try { hasModel = !!segmenter; } catch (e) {}
    if (!hasModel) { X.note = '분석 모델이 내려가 있어 추가 사진을 분석하지 못함 — 4장으로만 계산'; console.warn(TAG + ' ' + X.note); return oBuild.apply(self, args); }
    Promise.resolve(X.prepare()).then(function () { oBuild.apply(self, args); }, function () { oBuild.apply(self, args); });
  };

  /* ────────────────────────────────────────────────────────────────────────
   * ② 카메라 맞추기 → ③ 프로브에 넣기
   * ────────────────────────────────────────────────────────────────────── */
  function calFor(v, viewCal) {
    var f = viewCal && viewCal.front, m = v.m;
    if (!f || !(f.sy > 0) || !f.pose) return { err: '정면 보정 없음' };
    if (!m || m.hw < 4 || m.valid < m.w * X.minCols) return { err: '머리 윗선이 거의 안 잡힘' };
    if (!(v.ratio > 0)) return { err: '배율 없음' };
    var sy = f.sy * v.ratio;
    if (!isFinite(sy) || !(sy > 0)) return { err: '배율 계산 실패' };
    var yaw = (wrapDeg(v.deg - (X.degFront || 0))) * Math.PI / 180 + (f.pose.yaw || 0);
    return { pose: { yaw: yaw, pitch: 0, roll: 0 }, cx: m.capCx, s: sy, sy: sy, crownY: m.crown, x360: true };
  }
  var oProbe = W.makeHairOccupancyProbe;
  if (typeof oProbe === 'function') W.makeHairOccupancyProbe = function (viewCal, names, yTop, CY, scale) {
    X.last = { used: [], dropped: [], base: (names || []).slice() };
    try {
      if (active()) {
        var vc = Object.assign({}, viewCal), nm = names.slice();
        X.order.forEach(function (k) {
          var v = X.views[k]; v.cal = null;
          if (X.skip.indexOf(k) >= 0) { X.last.dropped.push(k + '(뺌)'); return; }
          if (!(state.hairMasks && state.hairMasks[k])) { X.last.dropped.push(k + '(마스크 없음)'); return; }
          var c = calFor(v, viewCal);
          if (!c || c.err) { X.last.dropped.push(k + '(' + (c ? c.err : '?') + ')'); return; }
          v.cal = c; vc[k] = c; nm.push(k); X.last.used.push(k);
        });
        if (X.last.used.length) {
          console.log(TAG + ' 형태 계산에 추가 사진 ' + X.last.used.length + '장을 넣습니다(' + X.last.used.join(',') + ')' + (X.last.dropped.length ? ' · 뺀 것 ' + X.last.dropped.join(',') : ''));
          return oProbe.call(this, vc, nm, yTop, CY, scale);
        }
      }
    } catch (e) { console.warn(TAG + ' 추가 사진 넣기 실패 — 4장으로만 계산', e); X.last.used = []; }
    return oProbe.apply(this, arguments);
  };

  /* ────────────────────────────────────────────────────────────────────────
   * ④ 진단
   * ────────────────────────────────────────────────────────────────────── */
  /* 지금 3D 가닥의 점이 각 사진의 머리 영역 안에 떨어지는 비율(사진마다) */
  var agreeMemo = null;
  X.agreement = function () {
    var model = null, probe = null;
    try { model = state.hair3Dneutral; } catch (e) {}
    try { probe = (state._hair3Dneutral && state._hair3Dneutral.occ && state._hair3Dneutral.occ.probe) || (state.hairOcc3D && state.hairOcc3D.probe); } catch (e) {}
    if (!model || !model.strands || !model.strands.length || !probe || !probe.cams) return null;
    if (agreeMemo && agreeMemo.model === model && agreeMemo.probe === probe) return agreeMemo.out;
    var CY = model.CY, yTop = model.yTop, S = model.strands, step = Math.max(1, Math.floor(S.length / 500)), pts = [], i, j;
    for (i = 0; i < S.length; i += step) { var p = S[i].pts; for (j = 2; j < p.length; j += 3) pts.push(p[j]); }
    var out = {};
    probe.cams.forEach(function (c) {
      if (!c.smp || !(c.iw > 0)) return;
      var R = c.R, inn = 0, n = 0, k, q, x, y, z, ix, iy;
      for (k = 0; k < pts.length; k++) {
        q = pts[k]; x = q.x; y = q.y - CY; z = q.z;
        if (R[6] * x + R[7] * y + R[8] * z <= 0) continue;                 // 카메라 반대쪽 점은 얼굴·두상에 가려 안 보임 — 셈에서 뺌
        ix = (R[0] * x + R[1] * y + R[2] * z) / c.s + c.cx;
        iy = c.crownY + (yTop - ((R[3] * x + R[4] * y + R[5] * z) + CY)) / c.sy;
        if (ix < 0 || iy < 0 || ix >= c.iw || iy >= c.ih) continue;
        n++; if (c.smp.at(ix, iy) > 0) inn++;
      }
      out[c.angle] = n ? inn / n : null;
    });
    agreeMemo = { model: model, probe: probe, out: out };
    return out;
  };
  X.lines = function () {
    var L = [], set = null; try { set = state.shots360; } catch (e) {}
    if (!X.on) return [TAG + ' 꺼짐'];
    if (!set || !set.frames) return [TAG + ' 켜짐 · 360 세트 없음(4장으로 계산)'];
    if (!setLive()) return [TAG + ' 켜짐 · 360 세트(' + set.frames.length + '장)가 있지만 지금 4장이 그 세트의 것이 아님 — 추가 사진 안 씀'];
    var used = X.last ? X.last.used : [];
    L.push(TAG + ' 켜짐 · 세트 ' + set.frames.length + '장 · ' + (X.note || '아직 분석 전') +
      ' · 형태 계산에 넣은 추가 사진 ' + used.length + '장' + (X.last && X.last.dropped.length ? ' · 뺀 것 ' + X.last.dropped.join(', ') : '') +
      (used.length ? '' : ' (3D를 아직 안 만들었거나 전부 빠짐)'));
    if (!X.order.length) return L;
    var ag = null; try { ag = X.agreement(); } catch (e) {}
    L.push('  뷰: 센서각 → yaw · 배율(정면 대비 · 출처) · 가로중심 · 맨위 · 맞음(지금 3D 가닥 중 그 사진 쪽을 향한 점이 사진의 머리 영역 안에 떨어지는 비율)');
    X.order.forEach(function (k) {
      var v = X.views[k], c = v.cal, a = ag && ag[k];
      L.push('   ' + k + ' ' + Math.round(v.deg) + '°' + (c ? ' → ' + (c.pose.yaw * 180 / Math.PI).toFixed(1) + '°' : ' → (안 넣음)') +
        ' · ×' + (v.ratio != null ? v.ratio.toFixed(3) : '?') + ' ' + v.ratioSrc +
        ' · cx ' + Math.round(v.m.capCx) + '/' + v.m.w + ' · 위 ' + Math.round(v.m.crown) + 'px' +
        (a != null ? ' · 맞음 ' + Math.round(a * 100) + '%' + (a < X.agreeWarn && Math.abs(v.deg) >= 80 ? ' ⚠' : '') : ''));
    });
    if (ag) L.push('  기준 4장 맞음 — ' + BASE.map(function (b) { return b + ' ' + (ag[b] != null ? Math.round(ag[b] * 100) + '%' : '-'); }).join(' · ') +
      '  (앞쪽 사진은 얼굴에 가려 원래 낮음 · 옆·뒤 사진(80° 이상)이 ' + Math.round(X.agreeWarn * 100) + '% 아래면 그 사진의 카메라 보정이 틀린 것 — VIEWS360.skip에 넣고 다시 분석)');
    return L;
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { L = L.concat(X.lines()); } catch (e) {}
    return L;
  };

  console.log(TAG + ' 설치 — 360 세트의 나머지 사진을 형태 계산(점유·뿌리밀도·다시 기르기)에 넣습니다. 콘솔: VIEWS360.lines().join("\\n")');
})();
