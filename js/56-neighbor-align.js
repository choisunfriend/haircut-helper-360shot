/* ==========================================================================
 * 56-neighbor-align.js — 다시 기른 머리: 다 기른 뒤 "뿌리 이웃"을 기준으로 결 정렬 (v2 · 2026-10-06 다시 짬)
 *
 * 로드 위치: index.html 맨 끝(55-fly-trim.js 다음). 42-regrow.js는 고치지 않습니다.
 *
 * ⚠ v1(같은 날 먼저 올린 것)은 잘못 짰습니다 — 사용자: "결 정리가 아니라 빗질했냐?" "일부러 뿌리 벗어나지 못하게 짰었는데, 그걸 되돌려 놨어."
 *   v1은 뿌리 첫 마디부터 방향을 돌리고(42번 v7의 alignRoot 보호를 우회), 100° 넘게 반대인 마디도 돌리고, 곱슬에도 켜 두고,
 *   꼬리 자르기까지 덧붙였습니다. v2는 그 넷을 전부 뺐습니다.
 *
 * 무엇을 (42번이 가닥을 다 기른 직후 · v7 결 정렬 "앞"에 한 번):
 *   v7 결 정렬과 같은 일을, 이웃을 다르게 잡아서 한 번 합니다.
 *     · v7의 이웃 = 같은 공간 칸(≈ 1.3cm)을 지나는 가닥. 머리 겉면 밖으로 뜬 가닥은 제 칸에 이웃이 없어서
 *       두상 쪽으로 3칸까지만 찾고, 그래도 없으면 기준 없이 그대로 둡니다.
 *     · 여기의 이웃 = 뿌리가 가까운 가닥(뿌리 칸 cell ≈ 1.2cm · 옆 칸과 섞음). "뿌리에서 같은 길이만큼 간 자리에서 이웃들은
 *       어느 쪽으로 가는가"를 기준으로 삼으므로, 가닥이 얼마나 멀리 떴든 기준이 있습니다.
 *   v7에 일부러 넣어 둔 규칙은 그 값 그대로 따릅니다(REGROW의 값을 읽음 — 여기서 따로 정하지 않음):
 *     · 뿌리 보호 — 뿌리에서 alignRoot까지는 안 돌리고, 그 뒤 alignRootFade에 걸쳐 서서히(v7과 같은 식).
 *       그 구간의 점은 한 점도 옮기지 않습니다(같은 점 그대로 · 바뀐 구간을 고르게 펴는 것도 보호 구간 밖에서만).
 *     · alignTol° 안쪽은 그대로 · alignFull° 이상은 alignK만큼 · alignFlip° 넘게 반대인 마디는 안 건드림.
 *     · 이웃 결집도 < alignCoh인 자리(가르마·가마)는 기준으로 안 씀.
 *     · 곱슬 — 42번이 넘겨주는 세기(kMul = 1 − 사진 컬/alignCurlOff)를 그대로 곱함. 0이면 아무것도 안 함.
 *     · 마디 길이는 그대로(가닥 길이 안 변함). 꼬리 자르기 없음(v7의 strayTrim은 v7이 그대로 함).
 *   여기서만 더한 것(셋 다 "덜 돌리는" 쪽):
 *     · 가닥이 뿌리 이웃들이 있는 자리에서 이미 멀리 떨어졌으면(뿌리에서 본 위치 차이 > nearMin + nearK × 뿌리에서의 길이) 그 마디는
 *       안 건드립니다 — 다른 자리에 가 있는 가닥에 "뿌리 이웃의 방향"을 들이대면 엉뚱한 쪽으로 꺾기 때문입니다(그런 가닥은 v7이 공간 이웃으로 봄).
 *     · 이웃 평균은 첫 평균에서 trim° 안쪽인 마디만으로 다시 냅니다(튄 가닥이 기준을 끌고 가지 않게).
 *     · 이웃끼리 원래 벌어져 있는 자리는 그 벌어진 만큼 기준 각을 넓힙니다(tol = 이웃 퍼짐 × spreadK 이상).
 *
 * ⚠ 합성 머리로만 확인했습니다. 합성 머리의 잔머리는 제가 심은 것이라, 실제 사진에서 얼마나 듣는지는 알 수 없습니다.
 *   확인한 것은 "규칙을 지키는가"입니다: 뿌리 보호 구간의 점이 한 점도 안 바뀜 · 100° 넘게 반대인 마디 그대로 · 가닥 길이 그대로 · 곱슬(kMul 0)은 손 안 댐.
 *   진단 [이웃 결 정렬] 줄에 돌린 가닥 수 · 돌린 각이 찍힙니다.
 *
 * 끄기: NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild() (값을 바꾼 뒤에도 rebuild — 머리를 다시 기릅니다)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[이웃 결 정렬]';
  var G = W.REGROW;
  if (!G || typeof G.alignStrands !== 'function') { console.warn(TAG + ' REGROW.alignStrands를 못 찾아 건너뜀(42-regrow.js 다음에 넣어야 합니다)'); return; }

  var NB = W.NEIGHBOR_ALIGN = Object.assign({
    on: true,
    cell: 0.07,          // 뿌리 이웃 칸(모델 단위 ≈ 1.2cm)
    bin: 0.03,           // 뿌리에서 잰 길이 칸(≈ 0.5cm)
    maxBins: 160,        // 길이 칸 상한(≈ 79cm) — 그보다 긴 구간은 마지막 칸으로
    minN: 6,             // 그 자리까지 자란 이웃이 이만큼은 돼야 기준으로 씀
    trim: 45,            // 도: 이웃 평균을 다시 낼 때 첫 평균에서 이 안쪽인 마디만 씀
    spreadK: 1.3,        // 이웃이 원래 벌어진 자리는 기준 각을 (퍼짐 × 이 값)까지 넓힘 · 0 = 안 넓힘
    nearMin: 0.06, nearK: 0.6   // 뿌리 이웃들의 자리에서 (nearMin + nearK × 뿌리에서의 길이)보다 멀리 떨어진 마디는 안 건드림
    // 돌리는 세기·각도·뿌리 보호·곱슬 처리는 REGROW(42번)의 alignK · alignTol · alignFull · alignFlip · alignCoh · alignRoot · alignRootFade를 그대로 읽습니다
  }, W.NEIGHBOR_ALIGN || {});
  var S = NB.stats = null;

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function qv(a, f) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  var OFFA = 512, SP = 1024, WGT = [1, 0.6, 0.3, 0.15];
  function keyOf(p, cell) {
    var a = Math.floor(p.x / cell) + OFFA, b = Math.floor(p.y / cell) + OFFA, c = Math.floor(p.z / cell) + OFFA;
    if (a < 1 || b < 1 || c < 1 || a >= SP - 1 || b >= SP - 1 || c >= SP - 1) return -1;
    return a + SP * (b + SP * c);
  }

  /* 뿌리 칸 × 길이 칸마다 이웃들의 방향 합(x,y,z) · 마디 수 · 뿌리에서 본 마디 위치 합(x,y,z). own[si] = 그 가닥의 뿌리 칸 번호(-1 = 없음).
     ref가 있으면 그 평균에서 trim° 안쪽인 마디만 넣음 */
  function buildField(strands, nb, ref, cTrim, coh) {
    var cell = NB.cell, bin = NB.bin, n = strands.length, map = new Map(), raw = [], keys = [], own = new Int32Array(n);
    var si, p, m, i, k, id, A, arc, ux, uy, uz, len, b, b0, b1, RF, rx, ry, rz, rn, rl;
    for (si = 0; si < n; si++) {
      own[si] = -1; p = strands[si] && strands[si].pts; if (!p || p.length < 2) continue;
      k = keyOf(p[0], cell); if (k < 0) continue;
      id = map.get(k);
      if (id === undefined) { id = raw.length; map.set(k, id); raw.push(new Float32Array(nb * 7)); keys.push(k); }
      own[si] = id; A = raw[id]; arc = 0; m = p.length;
      RF = ref ? ref.F[ref.own[si]] : null;
      for (i = 1; i < m; i++) {
        ux = p[i].x - p[i - 1].x; uy = p[i].y - p[i - 1].y; uz = p[i].z - p[i - 1].z; len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (!(len > 1e-9)) continue;
        ux /= len; uy /= len; uz /= len;
        var ox = (p[i].x + p[i - 1].x) * 0.5 - p[0].x, oy = (p[i].y + p[i - 1].y) * 0.5 - p[0].y, oz = (p[i].z + p[i - 1].z) * 0.5 - p[0].z;
        b0 = Math.min(nb - 1, Math.floor(arc / bin)); arc += len; b1 = Math.min(nb - 1, Math.floor((arc - 1e-9) / bin));
        for (b = b0; b <= b1; b++) {                                            // 마디가 걸친 길이 칸마다
          if (RF) {
            rx = RF[b * 7]; ry = RF[b * 7 + 1]; rz = RF[b * 7 + 2]; rn = RF[b * 7 + 3]; rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
            if (!(rn >= NB.minN) || !(rl / rn >= coh) || (ux * rx + uy * ry + uz * rz) / rl < cTrim) continue;
          }
          A[b * 7] += ux; A[b * 7 + 1] += uy; A[b * 7 + 2] += uz; A[b * 7 + 3] += 1; A[b * 7 + 4] += ox; A[b * 7 + 5] += oy; A[b * 7 + 6] += oz;
        }
      }
    }
    // 옆 칸과 섞음(칸 경계에서 기준이 뚝 바뀌지 않게)
    var out = new Array(raw.length), dx, dy, dz, j, w, B, R, t, L = nb * 7;
    for (id = 0; id < raw.length; id++) {
      B = new Float32Array(L); k = keys[id];
      for (dz = -1; dz <= 1; dz++) for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        j = map.get(k + dx + SP * (dy + SP * dz)); if (j === undefined) continue;
        w = WGT[Math.abs(dx) + Math.abs(dy) + Math.abs(dz)]; R = raw[j];
        for (t = 0; t < L; t++) if (R[t]) B[t] += w * R[t];
      }
      out[id] = B;
    }
    return { F: out, own: own, cells: raw.length };
  }
  /* 칸별 기준 — M[칸][길이 칸 × 9] = 이웃 방향(x,y,z) · cos(tol) · cos(full) · 쓸 수 있나(0/1) · 뿌리에서 본 이웃들의 평균 위치(x,y,z) */
  function consensus(strands, nb, P) {
    var f0 = buildField(strands, nb, null, 0, P.coh), f1 = buildField(strands, nb, f0, Math.cos(NB.trim * Math.PI / 180), P.coh);
    var M = new Array(f0.F.length), id, b, A, B, R, sx, sy, sz, cn, ml, n0, l0, R1, sig, tol, wid = P.full - P.tol;
    for (id = 0; id < f0.F.length; id++) {
      A = f0.F[id]; B = f1.F[id]; R = M[id] = new Float32Array(nb * 9);
      for (b = 0; b < nb; b++) {
        n0 = A[b * 7 + 3]; if (!(n0 >= NB.minN)) continue;
        l0 = Math.sqrt(A[b * 7] * A[b * 7] + A[b * 7 + 1] * A[b * 7 + 1] + A[b * 7 + 2] * A[b * 7 + 2]);
        if (!(l0 / n0 >= P.coh)) continue;                                     // 이웃이 갈림(가르마·가마)
        sx = B[b * 7]; sy = B[b * 7 + 1]; sz = B[b * 7 + 2]; cn = B[b * 7 + 3]; ml = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (!(cn >= NB.minN) || !(cn >= 0.5 * n0) || !(ml > 1e-6)) continue;   // 평균 둘레에 모인 마디가 절반도 안 됨
        R1 = Math.min(1, ml / cn); sig = Math.sqrt(Math.max(0, -2 * Math.log(Math.max(1e-6, R1)))) * 180 / Math.PI;   // 이웃 퍼짐(도)
        tol = Math.max(P.tol, (NB.spreadK > 0 ? NB.spreadK : 0) * sig);
        R[b * 9] = sx / ml; R[b * 9 + 1] = sy / ml; R[b * 9 + 2] = sz / ml;
        R[b * 9 + 3] = Math.cos(Math.min(170, tol) * Math.PI / 180); R[b * 9 + 4] = Math.cos(Math.min(175, tol + wid) * Math.PI / 180);
        R[b * 9 + 5] = 1;
        R[b * 9 + 6] = B[b * 7 + 4] / cn; R[b * 9 + 7] = B[b * 7 + 5] / cn; R[b * 9 + 8] = B[b * 7 + 6] / cn;
      }
    }
    return { M: M, own: f0.own, cells: f0.cells };
  }

  /* strands를 그 자리에서 고침. kMul = 42번이 넘겨주는 정렬 세기(1 = 직모 · 0 = 곱슬) — v7과 같은 뜻 */
  NB.run = function (strands, CY, kMul) {
    var st = { on: !!NB.on, skipped: '', n: strands ? strands.length : 0, strands: 0, segs: 0, rot: [], kept: 0, flipKept: 0, farKept: 0, pushed: 0, cells: 0, kMul: kMul == null ? 1 : kMul, root: 0, ms: 0 };
    if (!NB.on || !strands || !strands.length) return st;
    if (!G.align) { st.skipped = 'REGROW.align=false'; return st; }
    if (kMul != null && !(kMul > 0.01)) { st.skipped = '곱슬 — 정렬 안 함(42번 alignCurlOff)'; return st; }
    var t0 = now();
    var tolD = num(G.alignTol, 12), fullD = num(G.alignFull, 40), flipD = num(G.alignFlip, 100);
    if (!(fullD > tolD + 1)) fullD = tolD + 1;
    var K = num(G.alignK, 0.75) * (kMul == null ? 1 : Math.min(1, kMul));
    var rootKeep = Math.max(0, num(G.alignRoot, 0.15)), rootFade = Math.max(0, num(G.alignRootFade, 0.1));
    var cFlip = Math.cos(flipD * Math.PI / 180);
    var P = { tol: tolD, full: fullD, coh: num(G.alignCoh, 0.6) };
    st.root = rootKeep;
    var Es = null; try { Es = getScalpEllipsoid(); } catch (e) { Es = null; }
    if (!Es || !(Es.a > 0) || !(Es.b > 0) || !(Es.c > 0)) Es = null;
    if (!isFinite(CY)) CY = 0.15;
    // 길이 칸 수
    var maxArc = 0, si, p, i, a, n = strands.length;
    for (si = 0; si < n; si++) { p = strands[si] && strands[si].pts; if (!p) continue; a = 0; for (i = 1; i < p.length; i++) a += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y, p[i].z - p[i - 1].z); if (a > maxArc) maxArc = a; }
    var nb = Math.max(4, Math.min(NB.maxBins | 0, Math.floor(maxArc / NB.bin) + 2)), bin = NB.bin;
    var fld = consensus(strands, nb, P); st.cells = fld.cells;
    var U = new Float64Array(4 * 256), WR = new Float32Array(256);
    for (si = 0; si < n; si++) {
      if (fld.own[si] < 0) continue;
      var s = strands[si]; p = s.pts; var m = p.length; if (m < 3) continue;
      if (U.length < m * 4) { U = new Float64Array(m * 4 + 128); WR = new Float32Array(m + 32); }
      var B = fld.M[fld.own[si]], arc = 0, lo = m, hi = 0, last = m - 1;
      for (i = 1; i < m; i++) {
        var ux = p[i].x - p[i - 1].x, uy = p[i].y - p[i - 1].y, uz = p[i].z - p[i - 1].z, len = Math.sqrt(ux * ux + uy * uy + uz * uz), wr = 0;
        if (len > 1e-9) {
          ux /= len; uy /= len; uz /= len;
          var b = Math.min(nb - 1, Math.floor((arc + len * 0.5) / bin)); arc += len;
          // 뿌리 보호 — v7과 같은 식(뿌리에서 이 마디 끝까지의 길이로 잼)
          wr = arc <= rootKeep ? 0 : (arc < rootKeep + rootFade ? (arc - rootKeep) / rootFade : 1);
          if (wr > 0 && B[b * 9 + 5]) {
            var mx = B[b * 9], my = B[b * 9 + 1], mz = B[b * 9 + 2], cTol = B[b * 9 + 3], cFull = B[b * 9 + 4];
            var dot = ux * mx + uy * my + uz * mz;
            var ex = (p[i].x + p[i - 1].x) * 0.5 - p[0].x - B[b * 9 + 6], ey = (p[i].y + p[i - 1].y) * 0.5 - p[0].y - B[b * 9 + 7], ez = (p[i].z + p[i - 1].z) * 0.5 - p[0].z - B[b * 9 + 8];
            var gate = NB.nearMin + NB.nearK * arc;
            if (dot <= cFlip) st.flipKept++;                                    // 거의 반대 — 그대로 둠
            else if (ex * ex + ey * ey + ez * ez > gate * gate) st.farKept++;   // 이웃들 자리에서 이미 멀리 떨어짐 — 그대로 둠
            else if (dot < cTol) {
              var tt = (cTol - dot) / Math.max(1e-6, cTol - cFull); if (tt > 1) tt = 1;
              var w = K * tt * tt * (3 - 2 * tt) * wr;
              var tx = ux + (mx - ux) * w, ty = uy + (my - uy) * w, tz = uz + (mz - uz) * w, tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
              if (tl > 1e-3 && w > 0.01) {
                tx /= tl; ty /= tl; tz /= tl;
                st.segs++; if (st.segs % 13 === 0) st.rot.push(Math.acos(Math.max(-1, Math.min(1, ux * tx + uy * ty + uz * tz))) * 180 / Math.PI);
                ux = tx; uy = ty; uz = tz; if (i < lo) lo = i; if (i > hi) hi = i;
              }
            }
          }
        } else { ux = 0; uy = -1; uz = 0; len = 0; }
        U[i * 4] = ux; U[i * 4 + 1] = uy; U[i * 4 + 2] = uz; U[i * 4 + 3] = len; WR[i] = wr;
      }
      if (lo >= m) continue;                                                   // 돌린 마디 없음 — 가닥을 그대로 둠
      // 첫 바뀐 마디 앞의 점은 같은 점 그대로(뿌리 보호 구간은 전부 여기 들어감)
      var out = new Array(m), x = p[lo - 1].x, y = p[lo - 1].y, z = p[lo - 1].z, s1 = Math.min(last, hi + 1), ax, ay, az, al, i1, L = 0, q, q2;
      for (i = 0; i < lo; i++) out[i] = p[i];
      st.kept += lo;
      for (i = lo; i < m; i++) {
        ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2];
        if (i <= s1 && WR[i] >= 1) {                                           // 바뀐 구간은 이웃 마디와 한 번 고르게 — 뿌리 보호(서서히 구간 포함) 밖에서만
          i1 = i < last ? i + 1 : i;
          ax = U[(i - 1) * 4] + 2 * ax + U[i1 * 4]; ay = U[(i - 1) * 4 + 1] + 2 * ay + U[i1 * 4 + 1]; az = U[(i - 1) * 4 + 2] + 2 * az + U[i1 * 4 + 2];
          al = Math.sqrt(ax * ax + ay * ay + az * az);
          if (al > 1e-6) { ax /= al; ay /= al; az /= al; } else { ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2]; }
        }
        len = U[i * 4 + 3];
        x += ax * len; y += ay * len; z += az * len;
        q = { x: x, y: y, z: z };
        if (Es) {                                                              // 옮긴 점이 두상 안으로 들어가면 — 두피를 타고 가게(마디 길이 그대로)
          try {
            q2 = ellipsoidPushOut(q, Es.a, Es.b, Es.c, CY);
            if (q2 !== q) {
              var gx = q2.x / (Es.a * Es.a), gy = (q2.y - CY) / (Es.b * Es.b), gz = q2.z / (Es.c * Es.c), gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1, gd = (ax * gx + ay * gy + az * gz) / gl;
              if (gd < 0) {
                var hx = ax - gd * gx / gl, hy = ay - gd * gy / gl, hz = az - gd * gz / gl, hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
                if (hl > 1e-4) { q = { x: x - ax * len + hx / hl * len, y: y - ay * len + hy / hl * len, z: z - az * len + hz / hl * len }; q2 = ellipsoidPushOut(q, Es.a, Es.b, Es.c, CY); }
              }
              q = q2; x = q.x; y = q.y; z = q.z; st.pushed++;
            }
          } catch (e) {}
        }
        out[i] = q;
      }
      for (i = 1; i < m; i++) L += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y, out[i].z - out[i - 1].z);
      st.strands++;
      try { if (p._rgKeep) out._rgKeep = true; } catch (e) {}
      s.pts = out;
      if (s.rg) { s.rg.L = L; s.rg.tipY = out[m - 1].y; }                      // v7과 같이 길이·끝 높이만 고침(뿌리 쪽 방향 값은 안 바뀜)
    }
    st.ms = now() - t0;
    return st;
  };

  /* 42번의 "다 기른 뒤" 자리에 끼움 — 뿌리 이웃 결 정렬 → (예전 그대로) v7 결 정렬 */
  var inner = G.alignStrands;
  G.alignStrands = function (strands, CY, kMul) {
    var st = null;
    try { st = NB.run(strands, CY, kMul); } catch (e) { st = { on: !!NB.on, err: String(e && e.message || e) }; console.warn(TAG + ' 실패(그대로 둠)', e); }
    S = NB.stats = st;
    try { console.log(NB.lines().join('\n')); } catch (e) {}
    return inner.apply(this, arguments);
  };

  NB.lines = function () {
    var s = S; if (!s) return [TAG + ' ' + (NB.on ? '대기 — 아직 다시 기른 머리가 없음' : '꺼짐')];
    if (s.err) return [TAG + ' ⚠ ' + s.err];
    if (!s.on) return [TAG + ' 꺼짐'];
    if (s.skipped) return [TAG + ' 건너뜀 — ' + s.skipped];
    var cm = 16.4; try { cm = modelCmPerUnit() || 16.4; } catch (e) {}
    return [TAG + ' 가닥 ' + s.n + '개 중 돌린 것 ' + s.strands + '개(' + (s.n ? Math.round(s.strands / s.n * 100) : 0) + '%) · 마디 ' + s.segs +
      ' · 돌린 각 중앙값 ' + (isFinite(qv(s.rot, 0.5)) ? qv(s.rot, 0.5).toFixed(1) : '0') + '° · 90% ' + (isFinite(qv(s.rot, 0.9)) ? qv(s.rot, 0.9).toFixed(1) : '0') + '°' +
      ' · 세기 ×' + (+s.kMul).toFixed(2) + ' · 뿌리 ' + (s.root * cm).toFixed(1) + 'cm까지는 안 건드림 · 거의 반대라 그대로 둔 마디 ' + s.flipKept + ' · 이웃 자리에서 멀어 그대로 둔 마디 ' + s.farKept +
      ' · 뿌리 칸 ' + s.cells + ' · ' + Math.round(s.ms) + 'ms — 끄기 NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild()'];
  };
  /* 값을 바꾼 뒤 — 지금 머리를 다시 기름(마네킹 OFF일 때만) */
  NB.rebuild = function () {
    try {
      if (!G.on) { console.log(TAG + ' 마네킹이 켜져 있습니다 — 마네킹을 끄면 새 값으로 기릅니다'); return; }
      G.model = null; G.src = null; G.failedFor = null;
      if (typeof G.build === 'function') G.build();
    } catch (e) { console.warn(TAG + ' 다시 기르기 실패', e); }
  };

  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { if (G.on) L = L.concat(NB.lines()); } catch (e) {}
    return L;
  };
  console.log(TAG + ' 설치 — 다시 기른 머리를 다 기른 직후, 뿌리가 가까운 가닥을 기준으로 결을 한 번 맞춥니다(뿌리 보호 등 42번 결 정렬 규칙 그대로 · 그 다음 42번 결 정렬). 끄기 NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild()');
})();
