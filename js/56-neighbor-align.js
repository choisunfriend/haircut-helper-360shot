/* ==========================================================================
 * 56-neighbor-align.js — 다시 기른 머리: 1차로 다 기른 뒤 "뿌리 이웃"을 보고 정렬
 *
 * 로드 위치: index.html 맨 끝(55-fly-trim.js 다음).
 *
 * 왜 (2026-10-06 · 사용자): "원본헤어 다시기르기를 하면 잔머리들이 많이 생겨. 스타일 만들어둔 거는 잔머리가 거의 없는데."
 *   · 스타일(마네킹 · 17a)은 모든 가닥이 같은 공식(뿌리에서 솟았다가 아래로)이라 이웃끼리 저절로 나란합니다.
 *   · 다시 기르기(42)는 가닥을 하나씩 따로 기릅니다 — 가닥마다 사진 결을 따로 읽고, 결의 앞뒤도 따로 정하고,
 *     결을 못 읽은 걸음은 직전 방향으로 그냥 갑니다. 그래서 바로 옆 뿌리에서 난 가닥이 혼자 다른 쪽으로 갑니다.
 *   · 42번 v7 결 정렬은 "같은 공간 칸을 지나는 가닥"을 이웃으로 봅니다. 그래서
 *       - 뿌리에서 2.5cm까지는 못 건드립니다(뿌리 볼륨을 눕힐까 봐) → 짧은 머리는 거의 정렬이 안 됩니다.
 *       - 거꾸로 자란 가닥(100° 넘게 반대)은 그대로 둡니다.
 *       - 사진 컬이 있으면 약해지고(40 이상이면 꺼짐) 꼬리 자르기도 같이 꺼집니다.
 *
 * 무엇을 (42번이 가닥을 다 기른 직후 · v7 결 정렬 "앞"에 한 번):
 *   ① 이웃 = 뿌리가 가까운 가닥. 뿌리 자리를 칸(cell ≈ 1.2cm)으로 나누고, 칸마다 "뿌리에서 몇 cm 간 자리에서는 어느 쪽으로 가는가"를
 *      냅니다(길이 칸 bin ≈ 0.5cm마다 그 칸 가닥들의 평균 방향 · 옆 칸 26개와 섞어서 칸 경계가 안 보이게).
 *   ② 가닥의 마디가 이웃 평균에서 tol° 넘게 벗어나면 평균 쪽으로 돌립니다(full° 이상이면 k만큼 · 사이는 부드럽게).
 *      마디 길이는 그대로라 가닥 길이는 안 변합니다.
 *      · 이웃 평균은 "평균에서 trim° 안쪽인 가닥"만으로 다시 냅니다(잔머리·거꾸로 자란 가닥이 평균을 끌고 가지 않게).
 *      · 이웃끼리 원래 벌어져 있는 자리(가르마 둘레 · 가마 · 옆으로 퍼지는 앞머리)는 그 벌어진 만큼 기준 각을 넓힙니다
 *        (tol = 이웃 퍼짐 × spreadK 이상). 그래서 "이웃이 다 같이 벌어진 것"은 그대로 두고 "혼자 벗어난 것"만 돌립니다.
 *      · 이웃이 둘로 갈리는 자리(결집도 < coh)는 건드리지 않습니다. 거꾸로 자란 가닥(90° 넘게 반대)은 이웃의 대부분이
 *        한쪽일 때만(결집도 ≥ flipCoh ≈ 열에 아홉) 이웃 쪽으로 돌립니다 — 가르마에서 반대편 머리를 넘겨 버리지 않게.
 *   ③ 뿌리 볼륨은 그대로 — 뿌리에서 rootKeep(≈ 2.5cm)까지는 가닥이 "두피에서 솟는 정도"를 제 것 그대로 두고 "두피 위에서 향하는 쪽"만
 *      이웃에 맞춥니다(그 뒤 rootFade에 걸쳐 서서히 전체 방향 정렬로 넘어감). 그래서 뿌리부터 정렬해도 눕지 않습니다.
 *   ④ 혼자 긴 꼬리 — 뿌리 이웃의 tailFrac(5%)만 거기까지 자란 구간이 끝에 tailMinSeg 마디 넘게 이어지면 그 꼬리를 잘라 냅니다.
 *   ⑤ 곱슬머리 — 끄지 않고 "크게 벗어난 가닥만" 돌립니다(tol·full을 curlTol·curlFull까지 넓힘). 곱슬의 뼈대는 일부러 엇갈려 있고
 *      그 엇갈림이 컬의 부피를 만들기 때문입니다(42번 2026-10-06p 참고).
 *   그 다음 42번 v7 결 정렬(공간 이웃)이 예전 그대로 한 번 더 돕니다.
 *
 * ⚠ 합성 머리로만 확인했습니다(실제 사진으로는 안 돌려 봤습니다). 특히 ⑤의 넓힌 각도는 어림값입니다 —
 *   곱슬 손님 사진에서 컬이 죽어 보이면 NEIGHBOR_ALIGN.curly=false(곱슬은 건너뜀)로 두세요.
 *   진단 [이웃 정렬] 줄에 돌린 가닥 수 · 돌린 각 · 정렬 전후 "이웃에서 크게 벗어난 마디" 비율이 찍힙니다.
 *
 * 끄기: NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild() (값을 바꾼 뒤에도 rebuild — 머리를 다시 기릅니다)
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[이웃 정렬]';
  var G = W.REGROW;
  if (!G || typeof G.alignStrands !== 'function') { console.warn(TAG + ' REGROW.alignStrands를 못 찾아 건너뜀(42-regrow.js 다음에 넣어야 합니다)'); return; }

  var NB = W.NEIGHBOR_ALIGN = Object.assign({
    on: true,
    cell: 0.07,          // 뿌리 이웃 칸(모델 단위 ≈ 1.2cm)
    bin: 0.03,           // 뿌리에서 잰 길이 칸(≈ 0.5cm)
    maxBins: 160,        // 길이 칸 상한(≈ 79cm) — 그보다 긴 구간은 마지막 칸으로
    tol: 15, full: 45,   // 도: 이 안쪽은 그대로 · 이 이상은 k만큼
    k: 0.85,             // 많이 벗어난 마디를 이웃 평균 쪽으로 돌리는 세기(0~1)
    coh: 0.55,           // 이웃 결집도(평균 벡터 길이)가 이보다 낮으면 기준으로 안 씀(가르마·가마)
    flipCoh: 0.8,        // 90° 넘게 반대인 마디는 결집도가 이 이상일 때만 돌림(이웃 열에 아홉이 한쪽)
    trim: 45,            // 도: 이웃 평균을 다시 낼 때 첫 평균에서 이 안쪽인 가닥만 씀
    spreadK: 1.3,        // 이웃이 원래 벌어진 자리는 기준 각을 (퍼짐 × 이 값)까지 넓힘 · 0 = 안 넓힘
    minN: 6,             // 그 자리까지 자란 이웃이 이만큼은 돼야 기준으로 씀
    passes: 2,           // 되풀이 횟수(한 번 정렬한 이웃으로 다시 한 번)
    rootKeep: 0.15, rootFade: 0.1,   // 뿌리에서 이 길이까지는 솟는 정도를 그대로(향하는 쪽만 맞춤) · 그 뒤 이 길이에 걸쳐 서서히
    curly: true,         // 곱슬머리도 정렬(크게 벗어난 가닥만)
    curlTol: 40, curlFull: 75,       // 곱슬(42번이 넘겨주는 정렬 세기 0)일 때의 tol · full — 그 사이는 비례
    tail: true, tailFrac: 0.05, tailMinSeg: 3,   // 혼자 긴 꼬리 자르기
    keepPts: 3           // 가닥은 최소 이 점 수는 남김
  }, W.NEIGHBOR_ALIGN || {});
  var S = NB.stats = null;

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function qv(a, f) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; }

  var OFFA = 512, SP = 1024, WGT = [1, 0.6, 0.3, 0.15];
  function keyOf(p, cell) {
    var a = Math.floor(p.x / cell) + OFFA, b = Math.floor(p.y / cell) + OFFA, c = Math.floor(p.z / cell) + OFFA;
    if (a < 1 || b < 1 || c < 1 || a >= SP - 1 || b >= SP - 1 || c >= SP - 1) return -1;
    return a + SP * (b + SP * c);
  }

  /* ① 뿌리 칸 × 길이 칸마다 이웃들의 방향 합(x,y,z)과 가닥 수. own[si] = 그 가닥의 뿌리 칸 번호(-1 = 없음) */
  function buildField(strands, nb, ref, cTrim) {
    var cell = NB.cell, bin = NB.bin, n = strands.length, map = new Map(), raw = [], keys = [], own = new Int32Array(n);
    var si, p, m, i, k, id, A, arc, ux, uy, uz, len, b, b0, b1;
    for (si = 0; si < n; si++) {
      own[si] = -1; p = strands[si] && strands[si].pts; if (!p || p.length < 2) continue;
      k = keyOf(p[0], cell); if (k < 0) continue;
      id = map.get(k);
      if (id === undefined) { id = raw.length; map.set(k, id); raw.push(new Float32Array(nb * 4)); keys.push(k); }
      own[si] = id; A = raw[id]; arc = 0; m = p.length;
      var RF = ref ? ref.F[ref.own[si]] : null, rx, ry, rz, rn, rl;
      for (i = 1; i < m; i++) {
        ux = p[i].x - p[i - 1].x; uy = p[i].y - p[i - 1].y; uz = p[i].z - p[i - 1].z; len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (!(len > 1e-9)) continue;
        ux /= len; uy /= len; uz /= len;
        b0 = Math.min(nb - 1, Math.floor(arc / bin)); arc += len; b1 = Math.min(nb - 1, Math.floor((arc - 1e-9) / bin));
        for (b = b0; b <= b1; b++) {                                            // 마디가 걸친 길이 칸마다
          if (RF) {                                                            // 첫 평균에서 trim° 안쪽인 마디만
            rx = RF[b * 4]; ry = RF[b * 4 + 1]; rz = RF[b * 4 + 2]; rn = RF[b * 4 + 3]; rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
            if (!(rn >= NB.minN) || !(rl / rn >= NB.coh) || (ux * rx + uy * ry + uz * rz) / rl < cTrim) continue;
          }
          A[b * 4] += ux; A[b * 4 + 1] += uy; A[b * 4 + 2] += uz; A[b * 4 + 3] += 1;
        }
      }
    }
    // 옆 칸과 섞음(칸 경계에서 기준이 뚝 바뀌지 않게)
    var out = new Array(raw.length), dx, dy, dz, j, w, B, R, t, L = nb * 4;
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
  /* 칸별 기준 — M[칸][길이 칸 × 7] = 이웃 방향(x,y,z) · cos(tol) · cos(full) · 쓸 수 있나(0 못 씀 · 1 씀 · 2 거꾸로 간 것도 돌림) · 거기까지 자란 이웃 수 */
  function consensus(strands, nb, P) {
    var f0 = buildField(strands, nb, null, 0), f1 = buildField(strands, nb, f0, Math.cos(NB.trim * Math.PI / 180));
    var M = new Array(f0.F.length), id, b, A, B, R, sx, sy, sz, cn, ml, n0, l0, R0, R1, sig, tol, wid = P.full - P.tol;
    for (id = 0; id < f0.F.length; id++) {
      A = f0.F[id]; B = f1.F[id]; R = M[id] = new Float32Array(nb * 7);
      for (b = 0; b < nb; b++) {
        n0 = A[b * 4 + 3]; R[b * 7 + 6] = n0;
        if (!(n0 >= NB.minN)) continue;
        l0 = Math.sqrt(A[b * 4] * A[b * 4] + A[b * 4 + 1] * A[b * 4 + 1] + A[b * 4 + 2] * A[b * 4 + 2]); R0 = l0 / n0;
        if (!(R0 >= NB.coh)) continue;                                         // 이웃이 둘로 갈림
        sx = B[b * 4]; sy = B[b * 4 + 1]; sz = B[b * 4 + 2]; cn = B[b * 4 + 3]; ml = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (!(cn >= NB.minN) || !(cn >= 0.5 * n0) || !(ml > 1e-6)) continue;   // 평균 둘레에 모인 가닥이 절반도 안 됨
        R1 = Math.min(1, ml / cn); sig = Math.sqrt(Math.max(0, -2 * Math.log(Math.max(1e-6, R1)))) * 180 / Math.PI;   // 이웃 퍼짐(도)
        tol = Math.max(P.tol, (NB.spreadK > 0 ? NB.spreadK : 0) * sig);
        R[b * 7] = sx / ml; R[b * 7 + 1] = sy / ml; R[b * 7 + 2] = sz / ml;
        R[b * 7 + 3] = Math.cos(Math.min(170, tol) * Math.PI / 180); R[b * 7 + 4] = Math.cos(Math.min(175, tol + wid) * Math.PI / 180);
        R[b * 7 + 5] = R0 >= NB.flipCoh ? 2 : 1;
      }
    }
    return { M: M, own: f0.own, cells: f0.cells };
  }

  /* 이웃에서 full° 넘게 벗어난 마디의 비율(%) — 정렬 전후 비교용(가닥 7개 중 1개만 봄) */
  function offShare(strands, fld, nb) {
    var bin = NB.bin, n = strands.length, off = 0, tot = 0, si, p, m, i, B, arc, ux, uy, uz, len, b;
    for (si = 0; si < n; si += 7) {
      if (fld.own[si] < 0) continue; p = strands[si].pts; m = p.length; B = fld.M[fld.own[si]]; arc = 0;
      for (i = 1; i < m; i++) {
        ux = p[i].x - p[i - 1].x; uy = p[i].y - p[i - 1].y; uz = p[i].z - p[i - 1].z; len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (!(len > 1e-9)) continue;
        b = Math.min(nb - 1, Math.floor((arc + len * 0.5) / bin)); arc += len;
        if (!B[b * 7 + 5]) continue;
        tot++; if ((ux * B[b * 7] + uy * B[b * 7 + 1] + uz * B[b * 7 + 2]) / len < B[b * 7 + 4]) off++;
      }
    }
    return tot ? off / tot * 100 : 0;
  }

  /* ②③④ 한 번 돌기 */
  function onePass(strands, fld, nb, P, st) {
    var bin = NB.bin, n = strands.length, Es = P.Es, CY = P.CY, a2 = 0, b2 = 0, c2 = 0;
    if (Es) { a2 = Es.a * Es.a; b2 = Es.b * Es.b; c2 = Es.c * Es.c; }
    var U = new Float64Array(4 * 256), lone = new Uint8Array(256), si, i;
    for (si = 0; si < n; si++) {
      if (fld.own[si] < 0) continue;
      var s = strands[si], p = s.pts, m = p.length; if (m < 3) continue;
      if (U.length < m * 4) { U = new Float64Array(m * 4 + 128); lone = new Uint8Array(m + 32); }
      var B = fld.M[fld.own[si]], n0 = B[6], arc = 0, changed = false, lo = m, hi = 0, last = m - 1;
      for (i = 1; i < m; i++) {
        var ux = p[i].x - p[i - 1].x, uy = p[i].y - p[i - 1].y, uz = p[i].z - p[i - 1].z, len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        lone[i] = 0;
        if (len > 1e-9) {
          ux /= len; uy /= len; uz /= len;
          var am = arc + len * 0.5, b = Math.min(nb - 1, Math.floor(am / bin)); arc += len;
          var use = B[b * 7 + 5];
          if (B[b * 7 + 6] < NB.tailFrac * n0) lone[i] = 1;                    // 이웃이 거의 안 오는 길이
          if (use) {
            var mx = B[b * 7], my = B[b * 7 + 1], mz = B[b * 7 + 2], cTol = B[b * 7 + 3], cFull = B[b * 7 + 4];
            var r = am <= NB.rootKeep ? 0 : Math.min(1, (am - NB.rootKeep) / Math.max(1e-6, NB.rootFade));   // 0 = 뿌리 구간 · 1 = 전체 방향 정렬
            var dotF = ux * mx + uy * my + uz * mz, dot = dotF, nx = 0, ny = 0, nz = 0, un = 0, ok = true;
            if (r < 1) {
              // 뿌리 구간 — 두피 위에서 향하는 쪽(접선 성분)끼리 비교
              if (!Es) ok = false;
              else {
                var qx = (p[i].x + p[i - 1].x) * 0.5, qy = (p[i].y + p[i - 1].y) * 0.5 - CY, qz = (p[i].z + p[i - 1].z) * 0.5;
                nx = qx / a2; ny = qy / b2; nz = qz / c2; var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (!(nl > 1e-9)) ok = false;
                else {
                  nx /= nl; ny /= nl; nz /= nl;
                  un = ux * nx + uy * ny + uz * nz; var mn = mx * nx + my * ny + mz * nz;
                  var utx = ux - un * nx, uty = uy - un * ny, utz = uz - un * nz, utl = Math.sqrt(utx * utx + uty * uty + utz * utz);
                  var mtx = mx - mn * nx, mty = my - mn * ny, mtz = mz - mn * nz, mtl = Math.sqrt(mtx * mtx + mty * mty + mtz * mtz);
                  if (utl > 0.15 && mtl > 0.15) dot = (utx * mtx + uty * mty + utz * mtz) / (utl * mtl) * (1 - r) + dotF * r;
                  else if (r > 0) dot = 1 * (1 - r) + dotF * r;
                  else ok = false;                                             // 곧게 솟는 마디 — 향하는 쪽이 없음
                }
              }
            }
            if (ok && dotF < 0 && use < 2) ok = false;                         // 거꾸로 가는 마디 — 이웃 대부분이 한쪽일 때만
            if (ok && dot < cTol) {
              var tt = (cTol - dot) / Math.max(1e-6, cTol - cFull); if (tt > 1) tt = 1;
              var w = NB.k * tt * tt * (3 - 2 * tt);
              var tx = ux + (mx - ux) * w, ty = uy + (my - uy) * w, tz = uz + (mz - uz) * w, tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
              if (!(tl > 1e-3)) { tx = mx; ty = my; tz = mz; tl = 1; }             // 정반대 — 이웃 방향을 그대로
              if (w > 0.01) {
                tx /= tl; ty /= tl; tz /= tl;
                if (r < 1) {
                  // 솟는 정도(법선 성분)는 제 것과 섞고, 나머지를 접선 쪽에 줌
                  var tn = tx * nx + ty * ny + tz * nz, keepN = un * (1 - r) + tn * r;
                  if (keepN > 0.98) keepN = 0.98; else if (keepN < -0.98) keepN = -0.98;
                  var px = tx - tn * nx, py = ty - tn * ny, pz = tz - tn * nz, pl = Math.sqrt(px * px + py * py + pz * pz);
                  if (pl > 1e-4) { var ks = Math.sqrt(1 - keepN * keepN) / pl; tx = px * ks + keepN * nx; ty = py * ks + keepN * ny; tz = pz * ks + keepN * nz; }
                }
                st.segs++; if (st.segs % 13 === 0) st.rot.push(Math.acos(Math.max(-1, Math.min(1, ux * tx + uy * ty + uz * tz))) * 180 / Math.PI);
                if (dotF < -0.17) st.flipSegs++;                               // 100° 넘게 반대였던 마디(v7은 못 건드리던 것)
                ux = tx; uy = ty; uz = tz; changed = true; if (i < lo) lo = i; if (i > hi) hi = i;
              }
            }
          }
        } else { ux = 0; uy = -1; uz = 0; len = 0; }
        U[i * 4] = ux; U[i * 4 + 1] = uy; U[i * 4 + 2] = uz; U[i * 4 + 3] = len;
      }
      // ④ 혼자 긴 꼬리
      var cut = m;
      if (NB.tail && P.lastPass) {
        var run = 0; for (i = last; i >= 1 && lone[i]; i--) run++;
        if (run >= NB.tailMinSeg && m - run >= NB.keepPts) cut = m - run;
      }
      if (!changed && cut === m) continue;
      var out = new Array(cut), x = p[0].x, y = p[0].y, z = p[0].z, s0 = Math.max(1, lo - 1), s1 = Math.min(last, hi + 1), ax, ay, az, al, i0, i1, L = 0, q, q2;
      out[0] = p[0];
      for (i = 1; i < cut; i++) {
        ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2];
        if (changed && i >= s0 && i <= s1) {                                   // 바뀐 구간은 이웃 마디와 한 번 고르게(꺾인 자국이 안 남게)
          i0 = i > 1 ? i - 1 : i; i1 = i < last ? i + 1 : i;
          ax = U[i0 * 4] + 2 * ax + U[i1 * 4]; ay = U[i0 * 4 + 1] + 2 * ay + U[i1 * 4 + 1]; az = U[i0 * 4 + 2] + 2 * az + U[i1 * 4 + 2];
          al = Math.sqrt(ax * ax + ay * ay + az * az);
          if (al > 1e-6) { ax /= al; ay /= al; az /= al; } else { ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2]; }
        }
        len = U[i * 4 + 3]; L += len;
        x += ax * len; y += ay * len; z += az * len;
        q = { x: x, y: y, z: z };
        if (changed) {
          if (Es) {                                                            // 두상 안으로는 못 들어감 — 두피를 타고 미끄러지게(길이는 그대로)
            try {
              q2 = ellipsoidPushOut(q, Es.a, Es.b, Es.c, CY);
              if (q2 !== q) {
                var gx = q2.x / a2, gy = (q2.y - CY) / b2, gz = q2.z / c2, gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1, gd = (ax * gx + ay * gy + az * gz) / gl;
                if (gd < 0) {
                  var hx = ax - gd * gx / gl, hy = ay - gd * gy / gl, hz = az - gd * gz / gl, hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
                  if (hl > 1e-4) { q = { x: x - ax * len + hx / hl * len, y: y - ay * len + hy / hl * len, z: z - az * len + hz / hl * len }; q2 = ellipsoidPushOut(q, Es.a, Es.b, Es.c, CY); }
                }
                q = q2; st.pushed++;
              }
            } catch (e) {}
          }
          try { if (typeof G.neckPush === 'function') q = G.neckPush(q); } catch (e) {}
          x = q.x; y = q.y; z = q.z;
        }
        out[i] = q;
      }
      if (cut < m) { st.trimmed++; for (i = cut; i < m; i++) st.trimLen += U[i * 4 + 3]; }
      if (changed) st.changed[si] = 1;
      try { if (p._rgKeep) out._rgKeep = true; } catch (e) {}
      s.pts = out;
      if (s.rg) {                                                              // 42번이 치수 잴 때 쓰는 값도 같이 고침
        s.rg.L = L; s.rg.tipY = out[cut - 1].y;
        var qi = Math.min(cut - 1, 6), ex = out[qi].x - out[0].x, ey = out[qi].y - out[0].y, ez = out[qi].z - out[0].z, el = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (el > 1e-9) { s.rg.dx = ex / el; s.rg.dy = ey / el; s.rg.dz = ez / el; }
      }
    }
  }

  /* strands를 그 자리에서 고침. kMul = 42번이 넘겨주는 정렬 세기(1 = 직모 · 0 = 곱슬) */
  NB.run = function (strands, CY, kMul) {
    var st = { on: !!NB.on, skipped: '', n: strands ? strands.length : 0, strands: 0, segs: 0, flipSegs: 0, rot: [], trimmed: 0, trimLen: 0, pushed: 0, cells: 0, offBefore: 0, offAfter: 0, tol: NB.tol, full: NB.full, curlK: 1, ms: 0, changed: null };
    if (!NB.on || !strands || !strands.length) return st;
    var cK = (kMul == null || !isFinite(kMul)) ? 1 : Math.max(0, Math.min(1, kMul)), c = 1 - cK;
    st.curlK = cK;
    if (c > 0.01 && !NB.curly) { st.skipped = '곱슬(NEIGHBOR_ALIGN.curly=false)'; return st; }
    var t0 = now(), tol = NB.tol + (NB.curlTol - NB.tol) * c, full = NB.full + (NB.curlFull - NB.full) * c;
    if (!(full > tol + 1)) full = tol + 1;
    st.tol = tol; st.full = full;
    var Es = null; try { Es = getScalpEllipsoid(); } catch (e) { Es = null; }
    if (!Es || !(Es.a > 0) || !(Es.b > 0) || !(Es.c > 0)) Es = null;
    var P = { tol: tol, full: full, Es: Es, CY: isFinite(CY) ? CY : 0.15, lastPass: false };
    // 길이 칸 수
    var maxArc = 0, si, p, i, a;
    for (si = 0; si < strands.length; si++) { p = strands[si] && strands[si].pts; if (!p) continue; a = 0; for (i = 1; i < p.length; i++) a += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y, p[i].z - p[i - 1].z); if (a > maxArc) maxArc = a; }
    var nb = Math.max(4, Math.min(NB.maxBins | 0, Math.floor(maxArc / NB.bin) + 2));
    st.changed = new Uint8Array(strands.length);
    var passes = Math.max(1, NB.passes | 0), it, fld;
    for (it = 0; it < passes; it++) {
      fld = consensus(strands, nb, P);
      if (it === 0) { st.cells = fld.cells; st.offBefore = offShare(strands, fld, nb); }
      P.lastPass = it === passes - 1;
      onePass(strands, fld, nb, P, st);
    }
    fld = consensus(strands, nb, P);
    st.offAfter = offShare(strands, fld, nb);
    for (si = 0; si < st.changed.length; si++) if (st.changed[si]) st.strands++;
    st.changed = null;
    st.ms = now() - t0;
    return st;
  };

  /* v7 결 정렬은 돌린 뒤 두상 안으로 들어간 점을 밀어내지 않습니다 — 마지막에 한 번 두피 밖으로(이미 밖인 점은 그대로) */
  function settle(strands, CY) {
    var Es = null, n = 0, si, p, i, x, y, z, e, k;
    try { Es = getScalpEllipsoid(); } catch (e0) { Es = null; }
    if (!Es || !(Es.a > 0) || !(Es.b > 0) || !(Es.c > 0)) return 0;
    if (!isFinite(CY)) CY = 0.15;
    var a2 = Es.a * Es.a, b2 = Es.b * Es.b, c2 = Es.c * Es.c;
    for (si = 0; si < strands.length; si++) {
      p = strands[si] && strands[si].pts; if (!p) continue;
      for (i = 1; i < p.length; i++) {
        x = p[i].x; y = p[i].y - CY; z = p[i].z; e = x * x / a2 + y * y / b2 + z * z / c2;
        if (e >= 0.998 || !(e > 0)) continue;
        k = 1 / Math.sqrt(e); p[i] = { x: x * k, y: CY + y * k, z: z * k }; n++;
      }
    }
    return n;
  }

  /* 42번의 "다 기른 뒤" 자리에 끼움 — 뿌리 이웃 정렬 → (예전 그대로) v7 공간 이웃 정렬 */
  var inner = G.alignStrands;
  G.alignStrands = function (strands, CY, kMul) {
    var st = null;
    try { st = NB.run(strands, CY, kMul); } catch (e) { st = { on: !!NB.on, err: String(e && e.message || e) }; console.warn(TAG + ' 실패(그대로 둠)', e); }
    S = NB.stats = st;
    try { console.log(NB.lines().join('\n')); } catch (e) {}
    var r = inner.apply(this, arguments);
    try { if (st && st.on && !st.skipped && !st.err) st.settled = settle(strands, CY); } catch (e) {}
    return r;
  };

  NB.lines = function () {
    var s = S; if (!s) return [TAG + ' ' + (NB.on ? '대기 — 아직 다시 기른 머리가 없음' : '꺼짐')];
    if (s.err) return [TAG + ' ⚠ ' + s.err];
    if (!s.on) return [TAG + ' 꺼짐'];
    if (s.skipped) return [TAG + ' 건너뜀 — ' + s.skipped];
    var cm = 16.4; try { cm = modelCmPerUnit() || 16.4; } catch (e) {}
    return [TAG + ' 가닥 ' + s.n + '개 중 돌린 것 ' + s.strands + '개(' + (s.n ? Math.round(s.strands / s.n * 100) : 0) + '%) · 마디 ' + s.segs +
      ' · 돌린 각 중앙값 ' + (isFinite(qv(s.rot, 0.5)) ? qv(s.rot, 0.5).toFixed(1) : '0') + '° · 90% ' + (isFinite(qv(s.rot, 0.9)) ? qv(s.rot, 0.9).toFixed(1) : '0') + '°' +
      ' · 거꾸로 가던 마디 ' + s.flipSegs + ' · 혼자 긴 꼬리 자름 ' + s.trimmed + (s.trimmed ? '(평균 ' + (s.trimLen / s.trimmed * cm).toFixed(1) + 'cm)' : '') +
      ' · 이웃에서 크게(' + Math.round(s.full) + '°+) 벗어난 마디 ' + s.offBefore.toFixed(1) + '% → ' + s.offAfter.toFixed(1) + '%' +
      ' · 기준 ' + Math.round(s.tol) + '~' + Math.round(s.full) + '°' + (s.curlK < 0.99 ? '(곱슬이라 넓힘)' : '') +
      (s.settled ? ' · 두피 밖으로 민 점 ' + s.settled : '') + ' · 뿌리 칸 ' + s.cells + ' · ' + Math.round(s.ms) + 'ms — 끄기 NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild()'];
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
  console.log(TAG + ' 설치 — 다시 기른 머리를 다 기른 직후, 뿌리가 가까운 가닥끼리 나란히 맞춥니다(그 다음 42번 결 정렬). 끄기 NEIGHBOR_ALIGN.on=false 후 NEIGHBOR_ALIGN.rebuild()');
})();
