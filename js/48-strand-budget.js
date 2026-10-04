/* ==========================================================================
 * 48-strand-budget.js — 가닥 수: 3D 결과 화면 3만 · 조정 화면 1만 5천
 *
 * 로드 위치: index.html에서 47-natural-grow.js 다음.
 *
 * 왜 (2026-10-04 사용자): "3D 결과보기는 3만 가닥 수준이 되어야 하고, 조정 화면은 1만 5천으로."
 *   지금까지는 가닥 수 = 사진에서 들어올린 가닥 수(이번 사진 약 21,600)였고 두 화면이 같은 수를 그렸습니다.
 *
 * 무엇을:
 *   ① 머리 모델(다시 기른 원본 머리 · 마네킹 둘 다)을 STRAND_BUDGET.total(30,000)가닥으로 심습니다.
 *      — 42-regrow.js와 17a-mannequin.js의 "심을 가닥 수" 한 줄이 이 값을 읽습니다.
 *        (사진에 머리가 없는 자리의 뿌리는 안 심으므로 실제 수는 2~3% 적게 나옵니다.)
 *   ② 조정 화면에서는 그중 STRAND_BUDGET.adjust(15,000)가닥만 고르게 뽑아 그립니다(두피 전체에서 일정 간격).
 *      3D 결과 화면은 전부 그립니다. 같은 모델이라 모양은 같고 숱만 다릅니다.
 *      — "전체 가닥" 요청(인자 없는 computeAdjustedHair3DStrands())에만 간격을 넣습니다.
 *        간격을 직접 정해 부르는 곳(진단·치수 재기·2D)은 그대로입니다.
 *   ③ 37번의 "미리 만든 3D 헤어"가 두 화면 사이에서 섞이지 않게 서명에 화면별 꼬리표를 붙입니다
 *      (조정 화면에서 만든 1만 5천짜리를 3D 결과 화면이 받아 쓰면 안 됨).
 *
 * 바꾸기: STRAND_BUDGET.total=30000; STRAND_BUDGET.adjust=15000; STRAND_BUDGET.refresh()
 * 끄기:   STRAND_BUDGET.on=false; STRAND_BUDGET.refresh()   (예전처럼 사진 가닥 수 · 두 화면 같은 수)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[가닥 수]';
  var B = W.STRAND_BUDGET = Object.assign({ on: true, total: 30000, adjust: 15000 }, W.STRAND_BUDGET || {});
  var S = B.stats = { lastAdjust: 0, lastFull: 0, model: 0 };

  function scr() { try { return currentScreen; } catch (e) { return ''; } }
  function model() { try { var m = state.hair3Dneutral; return m && m.strands ? m : null; } catch (e) { return null; } }
  /* 조정 화면에서 쓸 간격(1 = 전부) */
  function adjustStride() {
    if (!B.on || scr() !== 'adjust' || !(B.adjust > 0)) return 1;
    var m = model(), n = m ? m.strands.length : 0;
    return n > B.adjust ? n / B.adjust : 1;
  }
  B.stride = adjustStride;

  // ② 전체 가닥 요청에만 간격을 넣음
  var origCA = W.computeAdjustedHair3DStrands;
  if (typeof origCA !== 'function') { console.warn(TAG + ' computeAdjustedHair3DStrands가 없어 건너뜀'); return; }
  W.computeAdjustedHair3DStrands = function (view, stride) {
    if (!view && stride == null) {
      var k = adjustStride(), out;
      if (k > 1) {
        out = origCA.call(this, null, k);
        if (out && out.length) S.lastAdjust = out.length;
        return out;
      }
      out = origCA.apply(this, arguments);
      if (out && out.length) { if (scr() === 'adjust') S.lastAdjust = out.length; else S.lastFull = out.length; }
      return out;
    }
    return origCA.apply(this, arguments);
  };

  // ③ 화면별 꼬리표 — 37번 fullSig가 adjFilterSig()를 서명에 넣음
  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () {
    var s = origFS.apply(this, arguments), k = adjustStride();
    return k > 1 ? s + '|n' + B.adjust : s;
  };

  /* 값을 바꾼 뒤: 모델을 다시 만들게 하고 다시 그림 */
  B.refresh = function () {
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try {
      var photo = state._hair3Dneutral;
      if (photo) state.hair3Dneutral = photo;                      // 설정자가 마네킹·다시 기른 모델을 비움 → 새 가닥 수로 다시 만듦
    } catch (e) {}
    try { if (W.REGROW) { W.REGROW.base = null; if (typeof W.REGROW.sync === 'function' && scr() === 'adjust') W.REGROW.sync(); } } catch (e) {}
    try { if (typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) {}
    return { total: B.total, adjust: B.adjust, on: B.on };
  };

  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [], m = model(), n = m ? m.strands.length : 0;
    return L.concat([TAG + ' ' + (B.on ? '켜짐' : '꺼짐') + ' · 목표: 모델 ' + B.total + ' / 조정 화면 ' + B.adjust +
      ' · 지금 모델 ' + n + '가닥' + (m && m.mannequin ? '(마네킹)' : m && m.regrown ? '(다시 기른 머리)' : '(사진 가닥)') +
      ' · 직전에 그린 수 — 조정 화면 ' + (S.lastAdjust || '—') + ' · 3D 결과 화면 ' + (S.lastFull || '—')]);
  };

  console.log(TAG + ' 설치 — 모델 ' + B.total + '가닥 · 조정 화면은 ' + B.adjust + '가닥만 그림. 바꾸기 STRAND_BUDGET.total / .adjust 후 STRAND_BUDGET.refresh()');
})();
