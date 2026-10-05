/* ==========================================================================
 * 53-comb3d.js — 3D 조정 화면의 빗질: 쓰다듬은 방향으로 결을 정렬
 *
 * 로드 위치: index.html 맨 끝(52-views360.js 다음).
 *
 * 왜 (2026-10-05 · 사용자): "원본 다시 만들기 결과는 괜찮은데 주변에 삐죽 튀어나온 잔머리가 있다. 원장들이 저 정도만 나와도
 *   괜찮긴 한데 손질은 가능해야 한다. 예전의 빗(comb) 기능을 다시 써 보자 — 예전에는 2D 화면이라 어려웠는데 지금은 확대·이동이
 *   되니까. 잔머리 부분을 결 방향으로 빗질하듯 쓰다듬으면 잔머리들의 결이 정렬되게."
 *
 * 예전 빗(17a COMB)과 다른 점:
 *   예전 것은 "밀기"입니다 — 쓰다듬은 만큼 그 자리의 머리를 통째로 옮기는 변위장. 잔머리와 그 밑의 머리가 같이 밀려서
 *   튀어나온 각도는 그대로 남습니다. 그리고 2D 화면 전용이라 3D 조정 화면(43)에서는 버튼을 숨겨 두었습니다.
 *   이번 것은 "정렬"입니다 — 붓 안을 지나는 가닥 마디의 방향을 쓰다듬은 방향으로 돌립니다(마디 길이는 그대로).
 *   이미 그 방향인 머리는 거의 안 변하고, 엇나간 잔머리만 눕습니다. 붓을 지난 뒤쪽은 모양 그대로 따라 옮겨집니다.
 *
 * 어떻게:
 *   · [빗질] 버튼(조정 화면 왼쪽 위 · 3D 조정일 때만 보임)을 켜면 한 손가락 드래그가 회전 대신 빗질이 됩니다.
 *     두 손가락(이동·확대), 휠, Shift+드래그(이동), 확대 막대, 앞/옆/뒤 탭은 그대로 됩니다. 회전하려면 빗질을 끄거나 탭을 누릅니다.
 *   · 붓이 닿는 자리 = 손가락 아래에서 카메라에 가장 가까운 가닥 점(겉머리). 그 점을 중심으로 한 공(반지름 = 화면의 radiusPx)
 *     안의 가닥만 바뀝니다 — 머리 반대편은 안 건드립니다. 그래서 확대하면 붓이 작아져 세밀하게 됩니다.
 *   · 빗질은 "공간에 남는 표본"(중심·방향·반지름)으로 저장하고, 성긴 3D 격자(방향 장)에 칠해 둡니다. 가닥을 만들 때마다
 *     (17b _adjGeometry → combStrand3D 자리) 지나가는 칸의 방향으로 마디를 돌립니다. 그래서 길이·컬 슬라이더를 움직여도
 *     빗질한 자리는 남고, 빗질을 많이 해도 느려지지 않습니다. 같은 자리를 다시 빗으면 새 방향이 옛 방향을 덮습니다.
 *     뿌리 쪽 gripFrom 구간은 덜 움직입니다(뿌리는 두피에 붙어 있음).
 *   · [↶] = 마지막 한 획 되돌리기. 머리 모델이 바뀌면(다른 사진 · 마네킹 켬/끔 · 다시 기르기) 빗질은 지웁니다.
 *
 * 아직 안 되는 것 / 알아둘 것:
 *   · 등록 스타일에는 들어가지 않습니다(이 손님 화면에서만).
 *   · 쓰다듬는 동안 머리는 liveMs마다 다시 그립니다(가닥이 많으면 반 박자 늦게 따라옴).
 *   · 방향은 화면 평면 안에서만 줍니다. 화면 쪽으로 튀어나온 잔머리는 옆에서 보이게 돌려 놓고 빗는 편이 잘 됩니다.
 *
 * 끄기: COMB3D.enabled=false; COMB3D.refresh() · 지우기: COMB3D.clear()
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[빗질 3D]';
  var C = W.COMB3D = Object.assign({
    enabled: true,
    on: false,          // 빗질 모드(버튼)
    radiusPx: 30,       // 붓 반지름(화면 px)
    maxRadius: 0.16,    // 붓 반지름 상한(모델 단위 ≈ 3cm) — 축소해 놓고 빗어도 한 번에 머리 전체가 눕지 않게
    cell: 0.025,        // 방향 장 격자 칸(모델 단위 ≈ 0.45cm)
    pickPx: 22,         // 손가락 아래 이 안쪽에서 가장 가까운(카메라 쪽) 가닥 점을 붓 중심으로
    strength: 0.6,      // 한 표본이 방향을 돌리는 세기(0~1) — 여러 번 쓰다듬으면 쌓임
    falloff: 1.4,       // 붓 가장자리로 갈수록 약하게
    gripFrom: 0.12,     // 가닥의 앞 12%(뿌리 쪽)는 덜 움직임
    spacing: 0.35,      // 붓 반지름의 이 비율만큼 움직일 때마다 표본 하나
    minMovePx: 3,
    maxSamples: 3000,
    liveMs: 120,        // 쓰다듬는 동안 다시 그리는 간격
    pickStrands: 8000   // 붓 자리 찾기에 쓰는 가닥 수 상한(넘으면 건너뛰며 씀)
  }, W.COMB3D || {});
  C.samples = [];       // {x,y,z, dx,dy,dz, r, k, g}
  var S = C.stats = { strokes: 0, touched: 0, _t: 0, ms: 0, pickMs: 0, pickPts: 0, err: null };
  var ver = 0, gid = 0, modelRef = null;

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function scr() { try { return currentScreen; } catch (e) { return ''; } }
  function m3() { try { return (model3D && model3D.initialized) ? model3D : null; } catch (e) { return null; } }
  function a3on() { try { return !!(W.ADJUST3D && W.ADJUST3D.on); } catch (e) { return false; } }
  function usable() { return !!(C.enabled && a3on() && scr() === 'adjust' && m3()); }

  /* ────────────────────────────────────────────────────────────────────────
   * ① 적용 — 표본을 "방향 장"(성긴 3D 격자)에 칠해 두고, 가닥은 지나가는 칸의 방향으로 돌림
   *    처음에는 표본을 하나씩 순서대로 가닥에 적용했는데(표본 223개 · 가닥 2천 개에 150ms, 표본 10배면 1.2초),
   *    표본 수만큼 느려져서 격자로 바꿨습니다 — 가닥 하나당 점 수만큼만 조회하므로 빗질을 많이 해도 느려지지 않습니다.
   *    칸의 값 V = 방향들의 섞인 벡터(새 빗질이 옛 것을 a만큼 덮음). |V| = 그 칸의 세기(반대 방향 빗질은 서로 지움).
   * ────────────────────────────────────────────────────────────────────── */
  var F = null, fDone = 0, fEpoch = 0, epoch = 0;     // F: 격자 · fDone: 격자에 칠한 표본 수 · epoch: 되돌리기/지우기 때 올림
  var OFF = 512, SPAN = 1024;
  function newField() { return { map: new Map(), V: new Float32Array(3 * 4096), n: 0, mn: [Infinity, Infinity, Infinity], mx: [-Infinity, -Infinity, -Infinity] }; }
  function splat(f, s) {
    var cell = C.cell, r = s.r, r2 = r * r, x0 = Math.floor((s.x - r) / cell), x1 = Math.floor((s.x + r) / cell), y0 = Math.floor((s.y - r) / cell), y1 = Math.floor((s.y + r) / cell),
      z0 = Math.floor((s.z - r) / cell), z1 = Math.floor((s.z + r) / cell), a, b, c, key, i, d2, w, V;
    if (x0 < -OFF || y0 < -OFF || z0 < -OFF || x1 >= OFF || y1 >= OFF || z1 >= OFF) return;
    for (c = z0; c <= z1; c++) { var ez = (c + 0.5) * cell - s.z;
      for (b = y0; b <= y1; b++) { var ey = (b + 0.5) * cell - s.y;
        for (a = x0; a <= x1; a++) { var ex = (a + 0.5) * cell - s.x;
          d2 = ex * ex + ey * ey + ez * ez; if (d2 >= r2) continue;
          w = s.k * Math.pow(1 - Math.sqrt(d2) / r, C.falloff); if (w < 0.004) continue;
          key = (a + OFF) + SPAN * ((b + OFF) + SPAN * (c + OFF));
          i = f.map.get(key);
          if (i === undefined) {
            i = f.n++; f.map.set(key, i);
            if (i * 3 + 3 > f.V.length) { var nv = new Float32Array(f.V.length * 2); nv.set(f.V); f.V = nv; }
          }
          V = f.V; i *= 3;
          V[i] = V[i] * (1 - w) + s.dx * w; V[i + 1] = V[i + 1] * (1 - w) + s.dy * w; V[i + 2] = V[i + 2] * (1 - w) + s.dz * w;
        }
      }
    }
    if (s.x - r < f.mn[0]) f.mn[0] = s.x - r; if (s.y - r < f.mn[1]) f.mn[1] = s.y - r; if (s.z - r < f.mn[2]) f.mn[2] = s.z - r;
    if (s.x + r > f.mx[0]) f.mx[0] = s.x + r; if (s.y + r > f.mx[1]) f.mx[1] = s.y + r; if (s.z + r > f.mx[2]) f.mx[2] = s.z + r;
  }
  function syncField() {
    var n = C.samples.length;
    if (!F || fEpoch !== epoch || fDone > n) { F = newField(); fDone = 0; fEpoch = epoch; }
    for (; fDone < n; fDone++) splat(F, C.samples[fDone]);
    return n ? F : null;
  }
  var buf = new Float64Array(3 * 256);
  function applySamples(g) {
    if (!C.enabled || !C.samples.length || !g || g.length < 2) return g;
    var f = syncField(); if (!f || !f.n) return g;
    var n = g.length, i, p, mn = f.mn, mx = f.mx, any = false;
    for (i = 0; i < n; i++) { p = g[i]; if (p.x >= mn[0] && p.x <= mx[0] && p.y >= mn[1] && p.y <= mx[1] && p.z >= mn[2] && p.z <= mx[2]) { any = true; break; } }
    if (!any) return g;
    if (buf.length < n * 3) buf = new Float64Array(n * 3 + 96);
    var cell = C.cell, map = f.map, V = f.V, last = n - 1, changed = false, P = buf;
    var px = g[0].x, py = g[0].y, pz = g[0].z, nx = px, ny = py, nz = pz;
    P[0] = px; P[1] = py; P[2] = pz;
    for (i = 1; i < n; i++) {
      p = g[i];
      var sx = p.x - px, sy = p.y - py, sz = p.z - pz, len = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (len > 1e-9) {
        var ux = sx / len, uy = sy / len, uz = sz / len;
        var a = Math.floor((p.x + px) * 0.5 / cell) + OFF, b = Math.floor((p.y + py) * 0.5 / cell) + OFF, c = Math.floor((p.z + pz) * 0.5 / cell) + OFF;
        if (a >= 0 && b >= 0 && c >= 0 && a < SPAN && b < SPAN && c < SPAN) {
          var k = map.get(a + SPAN * (b + SPAN * c));
          if (k !== undefined) {
            k *= 3;
            var vx = V[k], vy = V[k + 1], vz = V[k + 2], w = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (w > 0.01) {
              var t = i / last; if (t < C.gripFrom) w *= t / C.gripFrom;
              if (w > 1) w = 1;
              var tx = ux + (vx / Math.sqrt(vx * vx + vy * vy + vz * vz) - ux) * w, ty = uy + (vy / Math.sqrt(vx * vx + vy * vy + vz * vz) - uy) * w, tz = uz + (vz / Math.sqrt(vx * vx + vy * vy + vz * vz) - uz) * w,
                tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
              if (tl > 1e-3) { ux = tx / tl; uy = ty / tl; uz = tz / tl; changed = true; }
            }
          }
        }
        nx += ux * len; ny += uy * len; nz += uz * len;
      }
      px = p.x; py = p.y; pz = p.z;
      P[i * 3] = nx; P[i * 3 + 1] = ny; P[i * 3 + 2] = nz;
    }
    if (!changed) return g;
    var out = new Array(n);
    out[0] = g[0];
    for (i = 1; i < n; i++) out[i] = { x: P[i * 3], y: P[i * 3 + 1], z: P[i * 3 + 2] };
    S._t++;
    return out;
  }
  C._apply = applySamples;

  var prevComb = W.combStrand3D;
  W.combStrand3D = function (g) {
    var r = typeof prevComb === 'function' ? prevComb.apply(this, arguments) : g;
    if (!C.samples.length) return r;
    try { return applySamples(r); } catch (e) { S.err = String(e && e.message || e); return r; }
  };
  /* 머리 모델이 바뀌면 빗질을 지움(다른 사진 · 마네킹 켬/끔 · 다시 기르기) */
  function checkModel() {
    var m = null; try { m = state.hair3Dneutral; } catch (e) {}
    if (m !== modelRef) { modelRef = m; if (C.samples.length) { C.samples.length = 0; ver++; epoch++; syncBtn(); } }
  }
  var origCA = W.computeAdjustedHair3DStrands;
  if (typeof origCA === 'function') W.computeAdjustedHair3DStrands = function () {
    try { checkModel(); S._t = 0; } catch (e) {}
    var t0 = now(), out = origCA.apply(this, arguments);
    if (S._t > 0) { S.touched = S._t; S.ms = now() - t0; }          // 캐시에서 나온 호출은 세지 않음
    return out;
  };
  // 서명 — 빗질이 바뀌면 미리 만든 헤어도 다시
  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () { return origFS.apply(this, arguments) + '|cb' + ver; };
  function redraw() {
    try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
    try { if (scr() === 'adjust' && typeof renderAdjustFrame === 'function') renderAdjustFrame(); } catch (e) {}
  }
  C.refresh = function () { ver++; epoch++; redraw(); syncBtn(); };
  C.clear = function () { if (!C.samples.length) return; C.samples.length = 0; ver++; epoch++; S.strokes = 0; redraw(); syncBtn(); };
  C.undo = function () {
    if (!C.samples.length) return;
    var g = C.samples[C.samples.length - 1].g;
    while (C.samples.length && C.samples[C.samples.length - 1].g === g) C.samples.pop();
    ver++; epoch++; redraw(); syncBtn();
  };

  /* ────────────────────────────────────────────────────────────────────────
   * ② 붓 자리 찾기 — 화면의 손가락 아래에서 카메라에 가장 가까운 가닥 점
   * ────────────────────────────────────────────────────────────────────── */
  function hairObject() {
    var m = m3(), found = null; if (!m) return null;
    m.headGroup.traverse(function (o) { if (!found && (o.isLineSegments || o.isLine) && o.geometry) found = o; });
    return found || m.headGroup;
  }
  var pick = null;
  function buildPick() {
    var m = m3(); if (!m) return null;
    var t0 = now(), model = null; try { model = state.hair3Dneutral; } catch (e) {}
    if (!model || !model.strands || !model.strands.length) return null;
    var list = null;
    try { list = computeAdjustedHair3DStrands(); } catch (e) { list = null; }      // 화면에 그린 것과 같은 목록(이미 계산돼 있음)
    if (!list || !list.length) return null;
    var stepS = Math.max(1, Math.ceil(list.length / C.pickStrands));
    var obj = hairObject(), cam = m.camera, cv = m.renderer.domElement, rect = cv.getBoundingClientRect();
    m.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    var M = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(obj.matrixWorld), e = M.elements;
    var total = 0, i, k; for (i = 0; i < list.length; i += stepS) total += list[i].pts ? list[i].pts.length : 0;
    var SX = new Float32Array(total), SY = new Float32Array(total), SW = new Float32Array(total), PX = new Float32Array(total), PY = new Float32Array(total), PZ = new Float32Array(total);
    var cell = Math.max(8, C.pickPx), gw = Math.ceil(rect.width / cell) + 1, gh = Math.ceil(rect.height / cell) + 1, head = new Int32Array(gw * gh).fill(-1), next = new Int32Array(total), n = 0;
    for (i = 0; i < list.length; i += stepS) {
      var pts = list[i].pts; if (!pts) continue;
      for (k = 0; k < pts.length; k++) {
        var p = pts[k], w = e[3] * p.x + e[7] * p.y + e[11] * p.z + e[15];
        if (!(w > 1e-6)) continue;
        var sx = ((e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]) / w * 0.5 + 0.5) * rect.width, sy = (1 - ((e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]) / w * 0.5 + 0.5)) * rect.height;
        if (sx < 0 || sy < 0 || sx >= rect.width || sy >= rect.height) continue;
        var b = (sy / cell | 0) * gw + (sx / cell | 0);
        SX[n] = sx; SY[n] = sy; SW[n] = w; PX[n] = p.x; PY[n] = p.y; PZ[n] = p.z; next[n] = head[b]; head[b] = n; n++;
      }
    }
    // 화면 → 모델 방향: 카메라의 오른쪽·위 벡터를 머리 객체 좌표로
    var inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    var right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).transformDirection(inv), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).transformDirection(inv);
    S.pickMs = now() - t0; S.pickPts = n;
    return { SX: SX, SY: SY, SW: SW, PX: PX, PY: PY, PZ: PZ, head: head, next: next, cell: cell, gw: gw, gh: gh, rect: rect, right: right, up: up,
      perPx: function (w) { return 2 * w * Math.tan(cam.fov * Math.PI / 360) / rect.height; } };
  }
  function pickAt(pk, x, y, rad) {
    var c = pk.cell, bx = x / c | 0, by = y / c | 0, span = Math.ceil(rad / c), best = -1, bw = Infinity, r2 = rad * rad, a, b, i;
    for (b = by - span; b <= by + span; b++) { if (b < 0 || b >= pk.gh) continue;
      for (a = bx - span; a <= bx + span; a++) { if (a < 0 || a >= pk.gw) continue;
        for (i = pk.head[b * pk.gw + a]; i >= 0; i = pk.next[i]) {
          var dx = pk.SX[i] - x, dy = pk.SY[i] - y; if (dx * dx + dy * dy > r2) continue;
          if (pk.SW[i] < bw) { bw = pk.SW[i]; best = i; }
        }
      }
    }
    return best;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * ③ 손가락 — 빗질 모드에서 한 손가락 드래그
   * ────────────────────────────────────────────────────────────────────── */
  var stroke = null, pass = false, ptrs = new Map(), synth = false, liveT = 0, liveTimer = null;
  function onCanvas(e) { var m = m3(); return !!(m && e.target === m.renderer.domElement && m.container && m.container.id === 'adjust3dHost'); }
  function live() {
    if (liveTimer) return;
    var wait = Math.max(0, C.liveMs - (now() - liveT));
    liveTimer = setTimeout(function () { liveTimer = null; liveT = now(); redraw(); }, wait);
  }
  function addSample(x, y) {
    var st = stroke, pk = st.pk; if (!pk) return;
    var mvx = x - st.lx, mvy = y - st.ly, mv = Math.sqrt(mvx * mvx + mvy * mvy);
    if (mv < C.minMovePx) return;
    var i = pickAt(pk, x, y, C.pickPx), cx, cy, cz, w;
    if (i < 0) i = pickAt(pk, x, y, C.radiusPx);
    if (i >= 0) { cx = pk.PX[i]; cy = pk.PY[i]; cz = pk.PZ[i]; w = pk.SW[i]; }
    else if (st.has) {                      // 머리 바깥 — 직전 깊이에서 화면 이동만큼 옮김
      var pp = pk.perPx(st.w); cx = st.cx + (pk.right.x * mvx - pk.up.x * mvy) * pp; cy = st.cy + (pk.right.y * mvx - pk.up.y * mvy) * pp; cz = st.cz + (pk.right.z * mvx - pk.up.z * mvy) * pp; w = st.w;
    } else { st.lx = x; st.ly = y; return; }
    var r = Math.min(C.maxRadius, C.radiusPx * pk.perPx(w));
    // 방향: 화면에서 움직인 방향(조금 고르게)
    st.vx = st.vx * 0.5 + mvx * 0.5; st.vy = st.vy * 0.5 + mvy * 0.5;
    var dx = pk.right.x * st.vx - pk.up.x * st.vy, dy = pk.right.y * st.vx - pk.up.y * st.vy, dz = pk.right.z * st.vx - pk.up.z * st.vy, dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    st.lx = x; st.ly = y;
    if (!(dl > 1e-9)) return;
    if (st.has) { var ex = cx - st.sx, ey = cy - st.sy, ez = cz - st.sz; if (ex * ex + ey * ey + ez * ez < (C.spacing * r) * (C.spacing * r)) { st.cx = cx; st.cy = cy; st.cz = cz; st.w = w; return; } }
    if (C.samples.length >= C.maxSamples) { if (!st.full) { st.full = true; try { showToast(lang() === 'ko' ? '빗질이 너무 많아요 — ↶로 되돌리거나 지워 주세요' : 'Too many comb strokes — undo or clear some'); } catch (e) {} } return; }
    C.samples.push({ x: cx, y: cy, z: cz, dx: dx / dl, dy: dy / dl, dz: dz / dl, r: r, k: C.strength, g: st.g });
    st.cx = st.sx = cx; st.cy = st.sy = cy; st.cz = st.sz = cz; st.w = w; st.has = true; st.n++;
    ver++; live();
  }
  function endStroke() {
    var st = stroke; stroke = null;
    if (!st) return;
    if (st.n) { S.strokes++; if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; } redraw(); }
    syncBtn();
  }
  function onDown(e) {
    if (synth || !C.on || !usable() || !onCanvas(e)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    if (pass) return;
    if (stroke) {                           // 두 번째 손가락 — 빗질을 멈추고 두 손가락을 화면 조작(이동·확대)에 넘김
      var first = stroke.id, fp = ptrs.get(first);
      endStroke(); pass = true;
      if (fp) { try { synth = true; e.target.dispatchEvent(new PointerEvent('pointerdown', { pointerId: first, clientX: fp.x, clientY: fp.y, bubbles: true, isPrimary: true, button: 0, pointerType: fp.type || 'touch' })); } catch (x) {} synth = false; }
      return;
    }
    if (e.button !== 0 || e.shiftKey) return;        // Shift+드래그·가운데/오른쪽 버튼 = 이동(그대로)
    var pk = null; try { pk = buildPick(); } catch (x) { S.err = String(x && x.message || x); }
    if (!pk) return;
    var rc = pk.rect;
    stroke = { id: e.pointerId, pk: pk, lx: e.clientX - rc.left, ly: e.clientY - rc.top, vx: 0, vy: 0, has: false, n: 0, g: ++gid, cx: 0, cy: 0, cz: 0, sx: 0, sy: 0, sz: 0, w: 0 };
    e.stopPropagation();
  }
  function onMove(e) {
    if (ptrs.has(e.pointerId)) { var q = ptrs.get(e.pointerId); q.x = e.clientX; q.y = e.clientY; }
    if (!stroke || e.pointerId !== stroke.id) return;
    e.stopPropagation();
    var rc = stroke.pk.rect, ev = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null;
    if (ev && ev.length > 1) { for (var i = 0; i < ev.length; i++) addSample(ev[i].clientX - rc.left, ev[i].clientY - rc.top); }
    else addSample(e.clientX - rc.left, e.clientY - rc.top);
  }
  function onUp(e) {
    ptrs.delete(e.pointerId);
    if (stroke && e.pointerId === stroke.id) endStroke();
    if (!ptrs.size) pass = false;
  }
  document.addEventListener('pointerdown', onDown, true);
  W.addEventListener('pointermove', onMove, true);
  W.addEventListener('pointerup', onUp, true);
  W.addEventListener('pointercancel', onUp, true);

  /* ────────────────────────────────────────────────────────────────────────
   * ④ 버튼
   * ────────────────────────────────────────────────────────────────────── */
  function lang() { try { return uiLang === 'ko' ? 'ko' : 'en'; } catch (e) { return 'ko'; } }
  var btn = null, undoBtn = null;
  function syncBtn() {
    try {
      if (!btn) return;
      var show = C.enabled && a3on();
      btn.style.display = show ? '' : 'none';
      btn.classList.toggle('on', !!C.on);
      btn.textContent = C.on ? '빗질 ON' : '빗질 OFF';
      undoBtn.style.display = show && C.on ? '' : 'none';
      undoBtn.disabled = !C.samples.length;
      var m = m3(); if (m && m.container && m.container.id === 'adjust3dHost') m.renderer.domElement.style.cursor = C.on ? 'crosshair' : '';
    } catch (e) {}
  }
  C.toggle = function (v) {
    C.on = (v == null) ? !C.on : !!v;
    if (!C.on && stroke) endStroke();
    syncBtn();
    if (C.on) { try { showToast(lang() === 'ko' ? '결 방향으로 쓰다듬으세요 · 두 손가락: 이동·확대' : 'Stroke along the hair flow · two fingers: move / zoom'); } catch (e) {} }
  };
  try {
    var bar = document.querySelector('#screen-adjust .mode-bar'), mq = document.getElementById('mannequinBtn');
    if (bar) {
      btn = document.createElement('button'); btn.id = 'comb3dBtn'; btn.type = 'button';
      if (mq && mq.className) btn.className = mq.className;
      btn.title = '켜면 한 손가락 드래그가 빗질이 됩니다 — 잔머리를 결 방향으로 쓰다듬어 눕힙니다';
      btn.addEventListener('click', function () { C.toggle(); });
      undoBtn = document.createElement('button'); undoBtn.id = 'comb3dUndoBtn'; undoBtn.type = 'button';
      if (mq && mq.className) undoBtn.className = mq.className;
      undoBtn.textContent = '↶'; undoBtn.title = '마지막 빗질 한 획 되돌리기';
      undoBtn.addEventListener('click', function () { C.undo(); });
      bar.appendChild(btn); bar.appendChild(undoBtn);
      syncBtn();
    }
  } catch (e) { console.warn(TAG + ' 버튼 만들기 실패', e); }
  try {
    if (typeof I18N !== 'undefined') {
      Object.assign(I18N, { '빗질 ON': 'Comb ON', '빗질 OFF': 'Comb OFF',
        '켜면 한 손가락 드래그가 빗질이 됩니다 — 잔머리를 결 방향으로 쓰다듬어 눕힙니다': 'When on, a one-finger drag combs — stroke flyaways along the hair flow to lay them down',
        '마지막 빗질 한 획 되돌리기': 'Undo the last comb stroke' });
      try { _i18nSubKeys = null; } catch (e) {}
      try { if (typeof applyUiLang === 'function') applyUiLang(); } catch (e) {}
    }
  } catch (e) {}
  // 화면·모드가 바뀌면 버튼 맞춤 · 조정 화면을 떠나면 빗질 모드는 끔
  ['activateScreen', 'toggleMannequin', 'mannequinReset'].forEach(function (name) {
    var o = W[name]; if (typeof o !== 'function') return;
    W[name] = function () {
      var r = o.apply(this, arguments);
      try { if (name === 'activateScreen' && arguments[0] !== 'adjust' && C.on) { C.on = false; if (stroke) endStroke(); } syncBtn(); } catch (e) {}
      return r;
    };
  });
  var origRAF = W.renderAdjustFrame;
  if (typeof origRAF === 'function') W.renderAdjustFrame = function () { var r = origRAF.apply(this, arguments); try { syncBtn(); } catch (e) {} return r; };

  /* ────────────────────────────────────────────────────────────────────────
   * ⑤ 진단
   * ────────────────────────────────────────────────────────────────────── */
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try {
      L.push(TAG + ' ' + (C.enabled ? (C.on ? '켜짐(빗질 모드)' : '대기') : '꺼짐') + ' · 획 ' + S.strokes + ' · 표본 ' + C.samples.length + '/' + C.maxSamples +
        ' · 직전에 바뀐 가닥 ' + S.touched + ' · 가닥 만들기 ' + Math.round(S.ms) + 'ms(빗질 포함) · 붓 자리 찾기 준비 ' + Math.round(S.pickMs) + 'ms(점 ' + S.pickPts + ')' +
        ' · 방향 장 ' + (F ? F.n : 0) + '칸 · 붓 ' + C.radiusPx + 'px · 세기 ' + C.strength + (S.err ? ' · ⚠ ' + S.err : ''));
    } catch (e) {}
    return L;
  };

  console.log(TAG + ' 설치 — 3D 조정 화면에서 [빗질]을 켜고 잔머리를 결 방향으로 쓰다듬으면 그 방향으로 눕습니다. 지우기 COMB3D.clear() · 되돌리기 COMB3D.undo()');
})();
