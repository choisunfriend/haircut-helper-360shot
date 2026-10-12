/* ==========================================================================
 * 68-direct-read.js — ① 뿌리를 고르게  ② 방향 필터에서 읽은 결을 그대로 (결 표 · 타래 · 정렬 안 거침)
 *
 * 로드 위치: index.html 맨 끝(67-cause-test.js 다음). 다른 파일은 고치지 않습니다 — 값만 바꾸고 함수 하나를 감쌉니다.
 *
 * 사용자 (2026-10-12):
 *   "머리에 숱이 없거나 대머리로 판정된 경우가 아니면, roots가 골고루 분포되도록 해줘"
 *   "지금 웨이브와 컬이 덩어리져서 나오는데 방향필터에서 읽은 내용을 그대로 반영되도록 해줘.
 *    중간에 결표 거치면서 수정되는 걸로 알고 있는데 처음 읽는 정보가 형태를 가장 잘 반영하고 있어."
 *
 * ① 뿌리 고르게 (DIRECT_READ.rootEven)
 *   지금(64번 ③): 밀도가 보통의 60% 미만인 "작은" 빈 칸만 보통의 95%로 올림. 나머지 칸은 사진에서 잰 밀도 그대로라
 *     밀도 0.6~1.4배가 뒤섞여 Roots 보기에서 뿌리가 얼룩덜룩(광택·그림자·각도에 따라 잰 값이 흔들림).
 *   지금: 64번이 끝난 뒤, 머리가 있는 칸(두피 밖 아님)은 전부 "보통 밀도"(잰 칸의 중앙값) 하나로 맞춤 — 높은 칸은 내리고 낮은 칸은 올림.
 *     예외 = 숱 없음·대머리로 보는 칸: 밀도가 보통의 rootLow 미만인 칸이 이어진 덩어리이면서, 넓이가 머리 넓이의 rootBaldArea 이상이고
 *     평균 밀도가 rootBaldDen 미만(64번과 같은 판정 · 같은 값) → 그 칸은 잰 값 그대로 둠.
 *   뿌리 수 = 밀도 × 칸 넓이라서, 칸 넓이(정수리 꼭대기는 작음)만큼 고르게 심어집니다. 전체 가닥 수(48번 예산)는 그대로.
 *
 * ② 읽은 결 그대로 (DIRECT_READ.direct) — "원본 머리" 화면에서
 *   지금 원본 머리가 사진의 결에서 멀어지는 단계(읽은 순서대로):
 *     a. 66번 방향 필터가 픽셀마다 결을 읽은 뒤 둘레 평균으로 한 번 다듬음(refine)
 *     b. 42번 다시 기르기 — 곱슬·웨이브 사진은 뼈대를 펴서 기름(straightCurly) · 관성 55%로 직전 방향을 섞음 · 다 기른 뒤 두 번 폄(smooth)
 *        · 기른 뒤 결 정렬(align) · 재는 용도라 앞·관자 밖 섹션은 절반만 기름(measureShare 0.5)
 *     c. 56번 뿌리 이웃 결 정렬
 *     d. 58·59번 원본 머리 = 마네킹 + 잰 숫자 + 결 표 — 표는 두피 칸(× 길이 칸)마다 방향 하나라서 같은 칸의 가닥이 같은 길을 감
 *     e. 61번 곱슬 — 편 뼈대 위에 컬 엔진으로 컬을 새로 감고, 뿌리 가까운 가닥끼리 타래로 당겨(lockPull 0.85) 같은 자리에서 같이 감음
 *   "덩어리"는 d·e(칸·타래 단위로 같이 움직임)와 b의 펴기에서 옵니다 — 사진에서 읽은 굴곡은 b에서 펴지고, e가 지어낸 컬로 다시 감습니다.
 *   지금: 이 단계를 전부 끄고, 다시 기른 가닥(사진 결을 걸음마다 직접 읽은 길)을 그대로 그립니다.
 *     · 66 refine 끔 · 42 straightCurly 끔 · 관성 0.55 → inertia · smooth 0 · align 끔 · measureShare 1(전부 기름)
 *     · 56 끔 · 58 끔(= 다시 기른 가닥을 그림 · 59 결 표를 안 탐) · 61 끔(타래·지어낸 컬 없음)
 *     · 42 컬 엔진(curl) 끔 — 컬은 사진에서 읽은 굴곡 그대로가 컬입니다. 컬을 또 감으면 두 번 감김.
 *
 * ⚠ 바꾸면서 잃는 것 (되돌리기는 아래):
 *   · 원본 머리를 스타일로 등록하면 마네킹 + 숫자로 저장되던 경로(58)를 안 탑니다 — 다른 손님에게 걸 때 모양이 원본과 달라질 수 있음.
 *     등록이 필요하면 DIRECT_READ.direct=false로 돌린 뒤 등록하세요.
 *   · 컬 슬라이더·웨이브 슬라이더가 원본 머리에서는 사진 굴곡 위에 "더" 감는 값이 됩니다(잰 컬이 0으로 들어가므로 0 = 사진 그대로).
 *   · 결 정렬·타래가 없어서 잘못 읽은 자리(광택 띠 가장자리 · 머리 끝 흐린 자리)에서는 잔머리가 그대로 보일 수 있습니다(빗질 53·잔머리 자르기 55는 그대로 있음).
 *   · 실제 손님 사진·폰에서는 못 돌려 봤습니다(여기서는 얼굴·머리 모델을 받을 수 없음). 진단 줄 [읽은 결 그대로]에 켜진 값이 찍힙니다.
 *
 * 되돌리기(사진을 다시 분석하거나 마네킹을 켰다 끄기):
 *   전부 예전대로: DIRECT_READ.direct=false; DIRECT_READ.rootEven=false  (이 파일을 index.html에서 빼도 같음)
 *   일부만: DIRECT_READ.keep = ['align'] 처럼 예전대로 둘 항목 이름(아래 STEPS의 키)을 넣기
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[읽은 결 그대로]';
  var DR = W.DIRECT_READ = Object.assign({
    rootEven: true,
    direct: true,
    inertia: 0.15,     // 직전 방향을 섞는 비율(예전 0.55 · 0 = 걸음마다 사진 결 그대로 — 픽셀 잡음에 가닥이 떨 수 있음)
    keep: []           // 예전대로 둘 단계 이름
  }, W.DIRECT_READ || {});
  var S = DR.stats = { roots: [], applied: [], skipped: [] };

  /* ── ② 단계 스위치 ─────────────────────────────────────────────────── */
  var STEPS = {
    refine:    { obj: 'GABOR_ORIENT',   set: { refine: false },        note: '66 방향 필터 둘레 다듬기' },
    straight:  { obj: 'REGROW',         set: { straightCurly: false }, note: '42 곱슬 뼈대 펴기' },
    inertia:   { obj: 'REGROW',         set: function () { return { inertia: DR.inertia }; }, note: '42 관성' },
    smooth:    { obj: 'REGROW',         set: { smooth: 0 },            note: '42 기른 뒤 펴기' },
    align:     { obj: 'REGROW',         set: { align: false },         note: '42 기른 뒤 결 정렬' },
    share:     { obj: 'REGROW',         set: { measureShare: 1 },      note: '42 일부 섹션 절반만 기르기' },
    curl:      { obj: 'REGROW',         set: { curl: false },          note: '42 컬 엔진으로 다시 감기' },
    neighbor:  { obj: 'NEIGHBOR_ALIGN', set: { on: false },            note: '56 뿌리 이웃 결 정렬' },
    table:     { obj: 'ORIG_MQ',        set: { on: false },            note: '58·59 마네킹 + 결 표' },
    clump:     { obj: 'PHOTO_CURL',     set: { on: false },            note: '61 타래·뭉침' }
  };
  var saved = {};
  function applySteps() {
    S.applied = []; S.skipped = [];
    Object.keys(STEPS).forEach(function (k) {
      var st = STEPS[k], o = W[st.obj];
      if (!o) { S.skipped.push(k + '(' + st.obj + ' 없음)'); return; }
      if (DR.keep.indexOf(k) >= 0) { S.skipped.push(k + '(keep)'); return; }
      var v = typeof st.set === 'function' ? st.set() : st.set;
      Object.keys(v).forEach(function (f) {
        var key = st.obj + '.' + f;
        if (!(key in saved)) saved[key] = o[f];
        o[f] = v[f];
      });
      S.applied.push(k);
    });
  }
  function restoreSteps() {
    Object.keys(saved).forEach(function (key) {
      var p = key.split('.'), o = W[p[0]]; if (o) o[p[1]] = saved[key];
    });
  }
  DR.apply = function () { if (DR.direct) applySteps(); else restoreSteps(); };
  DR.apply();

  /* ── ① 뿌리 고르게 ─────────────────────────────────────────────────── */
  var inner = W.fillUnseenRootCells;
  if (typeof inner === 'function') W.fillUnseenRootCells = function (ro) {
    var r = inner.apply(this, arguments);
    if (!DR.rootEven) return r;
    try {
      var SO = W.SEG_ORIENT || {}, rootLow = SO.rootLow != null ? SO.rootLow : 0.6, baldArea = SO.rootBaldArea != null ? SO.rootBaldArea : 0.04, baldDen = SO.rootBaldDen != null ? SO.rootBaldDen : 0.12;
      var NT = ro.NT, NP = ro.NP, den = ro.den, est = ro.est, N = NT * NP, OFFv = typeof EST_OFFSCALP !== 'undefined' ? EST_OFFSCALP : 3, i;
      if (!den || !est || !(N > 0)) return r;
      var area = new Float64Array(N), meas = [], hairA = 0;
      for (i = 0; i < N; i++) { var row = (i / NT) | 0; area[i] = Math.sin((row + 0.5) / NP * Math.PI); if (est[i] !== OFFv && den[i] >= 0) { hairA += area[i]; if (est[i] === 0) meas.push(den[i]); } }
      if (meas.length < 20) return r;
      meas.sort(function (a, b) { return a - b; });
      var base = meas[meas.length >> 1], low = base * rootLow, bald = new Uint8Array(N), lab = new Int32Array(N), nl = 0, baldCells = 0, up = 0, down = 0, same = 0;
      // 숱 없음·대머리 덩어리 찾기(64번과 같은 판정)
      for (i = 0; i < N; i++) {
        if (lab[i] || est[i] === OFFv || !(den[i] < low)) continue;
        nl++; var comp = [], st = [i]; lab[i] = nl;
        while (st.length) {
          var c = st.pop(); comp.push(c); var cr = (c / NT) | 0, cc = c % NT;
          var nb = [cr > 0 ? c - NT : -1, cr < NP - 1 ? c + NT : -1, cr * NT + (cc + 1) % NT, cr * NT + (cc - 1 + NT) % NT];
          for (var j = 0; j < 4; j++) { var q = nb[j]; if (q < 0 || lab[q] || est[q] === OFFv || !(den[q] < low)) continue; lab[q] = nl; st.push(q); }
        }
        var A = 0, ds = 0; comp.forEach(function (c2) { A += area[c2]; ds += den[c2] * area[c2]; });
        if (A >= baldArea * hairA && ds / Math.max(1e-9, A) < baldDen) comp.forEach(function (c2) { bald[c2] = 1; baldCells++; });
      }
      // 나머지 머리 칸은 전부 보통 밀도로
      for (i = 0; i < N; i++) {
        if (est[i] === OFFv || bald[i] || !(den[i] >= 0)) continue;
        if (den[i] < base) up++; else if (den[i] > base) down++; else same++;
        den[i] = base;
      }
      var info = { base: +base.toFixed(2), up: up, down: down, same: same, baldCells: baldCells };
      S.roots.push(info); if (S.roots.length > 4) S.roots.shift();
      console.log(TAG + ' 뿌리 고르게 — 머리 칸 전부 보통 밀도 ' + info.base + '로(올림 ' + up + ' · 내림 ' + down + ') · 숱 없음·대머리로 보고 그대로 둔 칸 ' + baldCells + ' · 끄기 DIRECT_READ.rootEven=false');
    } catch (e) { S.err = '뿌리: ' + (e && e.message || e); console.warn(TAG + ' 뿌리 고르게 실패', e); }
    return r;
  };
  else console.warn(TAG + ' fillUnseenRootCells 없음 — 뿌리 고르게 안 걸림');

  /* ── 진단 줄 ────────────────────────────────────────────────────────── */
  function line() {
    var r = S.roots[S.roots.length - 1];
    return TAG + ' ' + (DR.direct ? '켜짐 — 끈 단계: ' + (S.applied.join(', ') || '없음') + (S.skipped.length ? ' · 못 끈 것: ' + S.skipped.join(', ') : '') + ' · 관성 ' + DR.inertia : '꺼짐(예전 단계 전부)') +
      ' | 뿌리 고르게 ' + (DR.rootEven ? (r ? '보통 ' + r.base + ' · 올림 ' + r.up + ' · 내림 ' + r.down + ' · 대머리 칸 ' + r.baldCells : '켜짐(아직 사진 분석 전)') : '꺼짐');
  }
  DR.line = line;
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () { var L = ppl.apply(this, arguments) || []; L.push(line()); return L; };
  console.log(line());
})();
