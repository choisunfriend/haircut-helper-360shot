/* ==========================================================================
 * 44-fitting.js — 3D 결과 화면 = 전신 확인 + 의상·장신구 피팅
 *
 * 로드 위치: index.html에서 43-adjust-3d.js 다음.
 *
 * 왜 (2026-10-04 사용자): 머리 모양 확인은 이제 조정 화면(3D)에서 하므로,
 *   "3D 결과보기 화면에서는 전신 확인과 의상 및 장신구 피팅하게."
 *
 * 무엇을:
 *   · 의상 고르기 — 카탈로그(OUTFIT_CATALOG)의 옷을 눌러 바로 갈아입힙니다. [자동]은 머리에 맞춰 추천(원래 동작).
 *     고른 옷은 새 손님을 시작할 때까지 유지됩니다(원래 코드의 manual 표시를 그대로 씀).
 *   · 보기 — [전신] [상반신] [머리] 한 번에 맞춤. 들어올 때는 항상 전신.
 *   · 장신구(헤어핀)는 위쪽의 기존 막대(29번)를 그대로 씁니다.
 *
 * 새 옷 추가: 02-state-sections.js의 OUTFIT_CATALOG에 한 줄 + assets/에 OBJ·MTL.
 * 끄기: FITTING.on=false (막대 숨김)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[피팅]';
  var F = W.FITTING = Object.assign({ on: true, view: 'full' }, W.FITTING || {});
  if (typeof setupModel3DScreen !== 'function') { console.warn(TAG + ' setupModel3DScreen이 없어 건너뜀'); return; }
  function scr() { try { return currentScreen; } catch (e) { return ''; } }
  function m3() { try { return (model3D && model3D.initialized) ? model3D : null; } catch (e) { return null; } }
  function catalog() { try { return OUTFIT_CATALOG || []; } catch (e) { return []; } }
  function curId() { try { var r = state.aiOutfitRecommendation; return r && r.item ? r.item.id : null; } catch (e) { return null; } }
  function isManual() { try { return !!(state.aiOutfitRecommendation && state.aiOutfitRecommendation.manual); } catch (e) { return false; } }

  /* ── 보기 맞춤 ─────────────────────────────────────────────────────────── */
  F.setView = function (kind) {
    var m = m3(); if (!m || typeof MODEL3D_VIEW === 'undefined' || !MODEL3D_VIEW.base) return;
    F.view = kind;
    var base = MODEL3D_VIEW.base, t = null;
    try {
      var E = getHeadEllipsoid(), cy = (state.hair3Dneutral && isFinite(state.hair3Dneutral.CY)) ? state.hair3Dneutral.CY : 0, b = E.b;
      if (kind === 'head') t = { cy: cy - 0.15 * b, span: 3.6 * b };
      else if (kind === 'upper') t = { cy: cy - 1.7 * b, span: 7.2 * b };
    } catch (e) {}
    if (!t) { MODEL3D_VIEW.zoom = 1; MODEL3D_VIEW.panX = 0; MODEL3D_VIEW.panY = 0; }
    else {
      var half = Math.tan(m.camera.fov * Math.PI / 360);
      var d = Math.max(t.span / 2 / half, t.span * 0.62 / 2 / (half * Math.max(0.2, m.camera.aspect))) * 1.12;
      var zoom = Math.max(MODEL3D_VIEW.min, Math.min(MODEL3D_VIEW.max, base.dist / d));
      d = base.dist / zoom;
      MODEL3D_VIEW.zoom = zoom; MODEL3D_VIEW.panX = 0; MODEL3D_VIEW.panY = (t.cy - base.cy) / (2 * d * half);
    }
    try { model3dApplyView(); } catch (e) {}
    render();
  };

  /* ── 의상 갈아입히기 ───────────────────────────────────────────────────── */
  var busy = false;
  F.pick = function (id) {
    if (busy || scr() !== 'model3d') return;
    var item = null;
    catalog().forEach(function (c) { if (c.id === id) item = c; });
    try {
      if (item) {
        var fp = null; try { fp = hairOutfitFingerprint(); } catch (e) {}
        state.aiOutfitRecommendation = { item: item, reason: '직접 고름', alts: [], fp: fp, manual: true };
      } else state.aiOutfitRecommendation = null;                // 자동 추천으로
    } catch (e) { console.warn(TAG + ' 의상 지정 실패', e); return; }
    var m = m3(), rot = m ? m.headGroup.rotation.y : 0, keep = { zoom: MODEL3D_VIEW.zoom, panX: MODEL3D_VIEW.panX, panY: MODEL3D_VIEW.panY };
    busy = true; render();
    F._keepView = true;
    var done = function () {
      busy = false;
      try { var mm = m3(); if (mm) mm.headGroup.rotation.y = rot; MODEL3D_VIEW.zoom = keep.zoom; MODEL3D_VIEW.panX = keep.panX; MODEL3D_VIEW.panY = keep.panY; model3dApplyView(); } catch (e) {}
      render();
    };
    try { Promise.resolve(W.setupModel3DScreen()).then(done, done); } catch (e) { done(); }
  };

  /* ── 막대 ─────────────────────────────────────────────────────────────── */
  var bar = null;
  function chip(label, on, fn, dot) {
    var b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;border:1px solid rgba(0,0,0,.18);cursor:pointer;' +
      'font:600 12px system-ui,sans-serif;touch-action:manipulation;' + (on ? 'background:#C98A4B;color:#1b1510;' : 'background:rgba(20,16,12,.72);color:#f3eadf;');
    if (dot) { var d = document.createElement('span'); d.style.cssText = 'width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.5);background:' + dot + ';'; b.appendChild(d); }
    b.appendChild(document.createTextNode(label));
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return b;
  }
  function label(t) {
    var s = document.createElement('span');
    s.textContent = t; s.style.cssText = 'color:#f3eadf;background:rgba(20,16,12,.72);padding:7px 8px;border-radius:6px;font:600 12px system-ui,sans-serif;';
    return s;
  }
  function row() { var r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;'; return r; }
  function render() {
    var vp = document.getElementById('model3dViewport');
    if (!vp) return;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fittingBar';
      bar.style.cssText = 'position:absolute;left:8px;right:8px;bottom:40px;z-index:5;display:flex;flex-direction:column;gap:6px;pointer-events:none;';
      ['pointerdown', 'touchstart', 'wheel', 'dblclick'].forEach(function (ev) { bar.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
      vp.appendChild(bar);
    }
    bar.style.display = F.on ? 'flex' : 'none';
    bar.textContent = '';
    var r1 = row(), r2 = row(), cur = curId(), man = isManual();
    r1.style.pointerEvents = r2.style.pointerEvents = 'auto';
    r1.appendChild(label(busy ? '의상 입히는 중…' : '의상'));
    r1.appendChild(chip('자동', !man, function () { F.pick(null); }));
    catalog().forEach(function (c) { r1.appendChild(chip(c.name, man && cur === c.id, function () { F.pick(c.id); }, c.colorHex)); });
    r2.appendChild(label('보기'));
    [['full', '전신'], ['upper', '상반신'], ['head', '머리']].forEach(function (v) { r2.appendChild(chip(v[1], F.view === v[0], function () { F.setView(v[0]); })); });
    bar.appendChild(r2); bar.appendChild(r1);
  }
  F.render = render;

  var origSetup = W.setupModel3DScreen;
  W.setupModel3DScreen = function () {
    var keepView = !!F._keepView; F._keepView = false;
    var p = origSetup.apply(this, arguments);
    var after = function () { if (scr() !== 'model3d') return; if (!keepView) F.setView('full'); else render(); };
    try { Promise.resolve(p).then(after, after); } catch (e) { after(); }
    return p;
  };

  console.log(TAG + ' 설치 — 3D 결과 화면에 의상 고르기·보기 맞춤(전신/상반신/머리). 끄기 FITTING.on=false 후 FITTING.render()');
})();
