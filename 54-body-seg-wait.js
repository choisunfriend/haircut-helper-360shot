/* ==========================================================================
 * 54-body-seg-wait.js — 사진을 분석하기 전에 "사람 윤곽" 모델이 준비될 때까지 기다림
 *
 * 로드 위치: index.html 맨 끝(53-comb3d.js 다음).
 *
 * 왜 (2026-10-05 · 실측): 같은 손님 사진 4장인데 어떤 때는 뒷머리가 통째로 짧게 나왔습니다("뒷머리 날아갔어").
 *   두 번의 진단을 나란히 놓으니 얼굴 값·섹션 경계·결 신뢰도는 완전히 같은데(같은 사진),
 *     뒤 사진 가닥 길이 22.8 → 11.5cm · 뒤 사진 머리 끝 32.2 → 20.4cm(정수리 아래) · 뿌리밀도 실측 806 → 663칸
 *     [어깨] 사진 인지(정면): 됨 → "못 함(정면 머리 영역/랜드마크 없음)" · TF.js GPU 34.5 → 26MB
 *   로 달랐습니다. 사람 윤곽(personMask)이 빠졌을 때 나오는 모습입니다:
 *     · 사람 윤곽 모델(03a bodySegmenter)은 페이지가 뜰 때 따로 불러옵니다(헤어 모델이 준비된 뒤 시작 · 실패하면 조용히 null).
 *     · 03b extractHairMask는 `if (bodySegmenter)`일 때만 사람 윤곽을 만듭니다 — 아직 안 왔으면 그냥 건너뜁니다.
 *     · 얼굴이 없는 뒤 사진은 "정면과 사람 윤곽을 대조해서"(13a computeSilhouetteAnchors) 카메라를 맞추는데, 사람 윤곽이 없으면
 *       머리 폭만 보는 거친 방식으로 떨어집니다 → 뒤 사진의 배율·중심이 달라져 뒷머리 영역이 줄어듭니다.
 *   즉 네트워크·타이밍에 따라 결과가 갈리는 경합이었습니다(어깨 처리와는 무관 — 어깨는 가닥을 옮기기만 하고 자르지 않음).
 *
 * 무엇을:
 *   ① 사진 분석(extractHairMask)을 시작하기 전에 사람 윤곽 모델을 waitMs까지 기다립니다. 그래도 없으면 한 번 다시 불러 봅니다.
 *   ② 그래도 없이 분석했으면 알림을 띄우고(뒷머리가 짧게 나올 수 있음 · 새로고침 권함) 진단 [사람 윤곽]에 남깁니다.
 *
 * 끄기: BODY_SEG_WAIT.on=false
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[사람 윤곽]';
  var B = W.BODY_SEG_WAIT = Object.assign({ on: true, waitMs: 6000, retry: true, retryMs: 8000 }, W.BODY_SEG_WAIT || {});
  var S = B.stats = { waits: 0, waitedMs: 0, retried: 0, views: {}, warned: false };
  function ready() { try { return !!bodySegmenter; } catch (e) { return false; } }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function lang() { try { return uiLang === 'ko' ? 'ko' : 'en'; } catch (e) { return 'ko'; } }
  var gate = null;
  B.ensure = function () {
    if (!B.on || ready()) return Promise.resolve(ready());
    if (gate) return gate;
    var t0 = Date.now();
    try { if (typeof showAI === 'function') showAI(lang() === 'ko' ? '사람 윤곽 모델 준비 중…' : 'Preparing the body outline model…', lang() === 'ko' ? '뒤 사진을 맞추는 데 필요합니다' : 'Needed to align the back photo'); } catch (e) {}
    gate = (function loop() {
      if (ready()) return Promise.resolve(true);
      if (Date.now() - t0 < B.waitMs) return sleep(150).then(loop);
      if (B.retry && typeof initBodySegmenter === 'function') {
        S.retried++;
        console.warn(TAG + ' ' + B.waitMs + 'ms 기다려도 준비되지 않음 — 다시 불러 봅니다');
        var p; try { p = Promise.resolve(initBodySegmenter()); } catch (e) { p = Promise.resolve(); }
        return Promise.race([p.then(function () {}, function () {}), sleep(B.retryMs)]).then(ready);
      }
      return Promise.resolve(false);
    })().then(function (ok) {
      gate = null; S.waits++; S.waitedMs = Date.now() - t0;
      console[ok ? 'log' : 'warn'](TAG + ' ' + (ok ? '준비됨' : '⚠ 준비되지 않은 채로 분석합니다(뒤 사진 보정이 거친 방식으로 떨어짐)') + ' · 기다린 시간 ' + S.waitedMs + 'ms');
      return ok;
    });
    return gate;
  };
  var prev = W.extractHairMask;
  if (typeof prev === 'function') W.extractHairMask = function (angle) {
    var self = this, args = arguments;
    function run() { return prev.apply(self, args); }
    function after(r) {
      try {
        var mi = state.hairMasks && state.hairMasks[angle];
        if (mi && !mi._x360 && ['front', 'left', 'right', 'back'].indexOf(angle) >= 0) {
          S.views[angle] = !!mi.personMask;
          if (!mi.personMask && angle === 'back' && !S.warned) {
            S.warned = true;
            try { if (typeof showToast === 'function') showToast(lang() === 'ko' ? '사람 윤곽을 읽지 못했어요 — 뒷머리가 짧게 나올 수 있습니다. 새로고침 후 다시 해 주세요.' : 'Could not read the body outline — the back hair may come out short. Please reload and try again.'); } catch (e) {}
          }
          if (mi.personMask) S.warned = false;
        }
      } catch (e) {}
      return r;
    }
    if (!B.on || ready()) return Promise.resolve(run()).then(after);
    return B.ensure().then(run).then(after);
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try {
      var ks = Object.keys(S.views), miss = ks.filter(function (k) { return !S.views[k]; });
      L.push(TAG + ' 모델 ' + (ready() ? '준비됨' : '없음') + ' · 분석 전 기다림 ' + S.waits + '회(직전 ' + S.waitedMs + 'ms' + (S.retried ? ' · 다시 불러 봄 ' + S.retried + '회' : '') + ')' +
        (ks.length ? ' · 사진별 사람 윤곽: ' + ks.map(function (k) { return k + (S.views[k] ? ' ✓' : ' ✗'); }).join(' ') : ' · 아직 분석 전') +
        (miss.length ? '  ⚠ 사람 윤곽이 없는 사진이 있음 — 뒤 사진을 얼굴 없이 맞추는 보정이 거친 방식으로 떨어져 뒷머리가 짧아질 수 있음(새로고침 후 다시)' : ''));
    } catch (e) {}
    return L;
  };
  console.log(TAG + ' 설치 — 사진 분석 전에 사람 윤곽 모델을 ' + B.waitMs + 'ms까지 기다립니다. 끄기 BODY_SEG_WAIT.on=false');
})();
