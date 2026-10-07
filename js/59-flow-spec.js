/* ==========================================================================
 * 59-flow-spec.js — 결 표 · 길이 지도를 스타일 스펙에 넘기기 (원본 머리 = 마네킹 + 숫자 + 결 + 길이)
 *
 * 로드 위치: index.html 맨 끝(57-spec-pass.js · 58-original-on-mannequin.js 다음). 42·16·17·57·58번은 고치지 않습니다.
 *
 * 왜 (2026-10-07 · 사용자): "원본 다시 기르기로 작업한 스타일을 저장한 다음 다시 적용하면 마네킹 모드로 넘어가면서 원래 모양과 완전히 달라진다."
 *   "스타일을 저장한다는 건 그 살롱의 대표 헤어로 다른 손님들에게도 적용하기 위해서다."
 *   "마네킹 기반으로 해서 스펙을 모두(숫자만이 아니라) 올리는 방향으로 가는 게 맞다." "(앞머리) 내려 심기 안 해도 된다. (섹션 길이 자동 맞추기 끄기) 그 방향으로 진행."
 *   2026-10-07 로그(직모 긴 머리 · 가운데 가르마): 저장된 값은 섹션 6개의 끝 높이 · 컬 0 · 볼륨 49 · 넘김 +14뿐.
 *   다시 걸면 마네킹이 앞머리 1,042가닥을 눈높이까지 내려 심고(얼굴을 덮는 가닥 front 1,362/1,527), temple은 슬라이더 100에 걸려 오차 32%.
 *   가르마는 위치 0.0(가운데)이라 57번도 못 넘김. 58번 주석: "자리마다의 결 방향·두께는 아직 스펙에 없습니다."
 *
 * 무엇을 스펙에 더 넣나 (spec.flow — 다시 기른 가닥(42번 · 정렬 뒤)에서 뽑음):
 *   · 결 표 — 두피 칸(뿌리 자리) × 뿌리에서의 길이 칸마다 "가닥이 가는 방향".
 *   · 길이 지도 — 두피 칸마다 가닥 길이의 분포(10·30·50·70·90%).
 *   · 갈리는 칸(가르마) — 한 칸 안에서 가닥이 두 쪽으로 갈리면 두 무리로 나눠 따로 저장하고, 가닥은 뿌리 자리가 가까운 쪽 무리를 따릅니다.
 *   전부 "두상으로 나눈 좌표"(두피 타원체의 반축 a·b·c로 나눔)로 저장합니다 → 다른 손님에게 걸 때는 그 손님 두상의 a·b·c를 곱합니다.
 *   spec.flowBase — 표를 뽑을 때의 넘김·볼륨·컬(= 표에 이미 들어 있는 값). spec.flowLen — 표 위에 걸 섹션 길이 슬라이더 값(처음엔 기본값).
 *
 * 어떻게 거나 (마네킹 가닥 · 걸려 있는 스타일의 스펙에 flow가 있을 때만):
 *   · 가닥의 뼈대 — 마네킹이 만든 뼈대 대신, 제 뿌리 자리의 표를 따라 뿌리에서부터 걸어 만든 뼈대를 씁니다(둘레 8칸을 섞음 · 길이는 제 칸의 분포에서).
 *     모든 가닥이 칸의 결을 따르므로 혼자 뜬 잔머리가 처음부터 없습니다.
 *   · 그 위의 슬라이더 — 42번이 다시 기른 가닥에 하는 것과 같은 방식("기준에서 움직인 만큼만"):
 *     섹션 길이 = 기본값 대비 비율 · 넘김/볼륨/가르마 = flowBase에서 달라진 만큼 · 컬 = 지금 값(표는 컬을 편 뼈대).
 *   · 마네킹의 앞머리 내려 심기(앞머리선에서 자르기)는 안 탑니다 · 섹션 길이 자동 맞추기(tipAt/lenCm 역산)는 건너뜁니다(스펙의 값은 그대로 둠 — 끄면 예전 동작).
 *   · [현재 모델을 스타일로 등록] — 지금 걸린 표를 새 스펙에 그대로 싣고, 그때의 섹션 길이 슬라이더 값을 flowLen에 넣습니다.
 *
 * 그대로 안 되는 것 / 알아둘 것:
 *   · 표 위에서는 섹션의 "길이" 말고 다른 커트 값(기법·각도 등)은 안 걸립니다(42번 원본 화면과 같음). 숱(density) · 색 · 컬 · 페이드는 걸립니다.
 *   · 스타일 하나에 표가 수십 KB 붙습니다. 브라우저 저장소(약 5MB)가 차면 저장이 안 되고 화면에 알립니다.
 *   · 빗질(53번)한 것은 스펙에 안 들어갑니다(지금처럼 그 화면에서만).
 *   · 이미 등록해 둔 스타일에는 표가 없습니다 — 원본 머리에서 다시 등록해야 들어갑니다.
 *
 * (2026-10-07b) 앞쪽 머리가 흩어지던 것 — 사용자(폰 영상·진단): "분명 마네킹 모드가 적용은 됐어. 그런데 앞쪽 머리 흩어짐 손봐야겠네."
 *   영상: 얼굴 앞(볼·눈 옆)에 곧게 내려오는 가닥 몇 개 · 턱 밑 목 앞을 가로지르는 가닥 뭉치. 실루엣·가르마는 원본대로.
 *   진단: 표 502칸(갈린 칸 57) · 102KB · 표로 다시 만든 가닥 ↔ 원래 가닥 1.3cm(중앙값) / 5.1cm(90%) · 얼굴 가림 front 23/1518(예전 1,362/1,527) ·
 *        50번(어깨)이 목 밖으로 민 점 2,632(다시 기른 가닥일 때는 6) = 표로 만든 길이 목 기둥을 지나고 있었음.
 *   원인(합성 머리로 재현한 것 — 실제 가닥을 한 올씩 추적한 것은 아님): 표가 칸마다 "평균 방향"이었습니다.
 *     처음에는 같이 가다가 얼굴·목 양쪽으로 갈라지는 가닥들을 평균 내면 가운데(= 얼굴 앞 · 목 속)로 가는 길이 됩니다.
 *     처음 4cm의 방향만 보고 무리를 갈랐기 때문에, 나중에 갈라지는 칸은 한 무리로 남았습니다. 평균 방향을 이어 걸으면 자리도 조금씩 밀립니다.
 *     재현(앞쪽 가운데 가닥이 3cm 같이 가다 양옆으로 갈라지는 합성 머리 · 원본에서 얼굴 앞을 지나는 가닥 135/20,000):
 *       평균 표 649/30,000 → 지금 90/30,000. 표로 다시 만든 가닥 ↔ 원래 가닥도 0.93 → 0.81cm(잔머리 아닌 가닥 중앙값).
 *   지금:
 *     · 본보기 가닥 — 칸(무리)마다 평균이 아니라 "실제로 있는 가닥 하나"의 길을 저장합니다(길이가 무리의 중간 이상이고, 가는 쪽이 무리 평균과
 *       가장 닮은 가닥). 실제 길이라 얼굴·목을 뚫지 않고, 양쪽의 평균이 아닙니다. 본보기보다 긴 구간만 닮은 가닥들의 평균으로 잇습니다.
 *     · 무리 가르기 — 가는 쪽을 뿌리에서 세 자리(≈ 4 · 11 · 26cm)에서 봅니다. 나중에 갈라지는 칸도 두 무리가 됩니다.
 *     · 이웃 칸과 섞기 — 길이 칸마다, 이웃 칸의 방향이 제 칸 방향과 35° 안일 때만 섞습니다(갈라지는 자리에서 가운데로 평균 내지 않음).
 *     · 목 — 걷는 동안 목 기둥 속으로 들어가는 점은 그 자리에서 밖으로(42번 neckPush) 옮기고 거기서 이어 걷습니다
 *       (나중에 50번이 한 점씩 밀어내면 가로로 지그재그가 됨). 끄기 FLOW_SPEC.guardNeck=false
 *     · 표 형식이 v2로 바뀜(무리마다 끝 쪽 방향 3바이트 추가). 오늘 아침에 v1로 저장한 스타일도 그대로 풀립니다(다만 평균 표라 흩어짐은 그대로 —
 *       원본 머리에서 다시 등록해야 새 표가 들어갑니다).
 *
 * (2026-10-07c) 결이 얽히고 잔머리가 나오던 것 — 사용자(폰 영상·진단): "왜 결이 얽히고 잔머리가 나왔는지, 그 원인을 제거해 줘."
 *   영상(긴 직모 · 10:01 배포본): 옆·뒤가 다발째로 엇갈리고, 밑단 아래로 길게 늘어진 다발, 이마를 가로지르는 가닥.
 *   원인 = (b)에서 제가 넣은 "본보기 가닥"입니다. 칸마다 실제 가닥 하나의 길을 그대로 쓰니
 *     · 그 가닥의 잔 굴곡·엇나감이 칸 전체(수십 가닥)에 복사되고, 이웃 칸은 다른 가닥을 따라가서 칸끼리 결이 엇갈렸습니다.
 *     · 본보기가 잔머리에 가까운 가닥이면 그 칸이 통째로 잔머리 다발이 됐습니다.
 *     · 길이를 칸의 분포(10~90%)에서 가닥마다 뽑아서, 밑단이 들쭉날쭉하고 긴 쪽이 꼬리로 나왔습니다(이건 처음 버전부터).
 *   재현(합성 머리 2만 가닥 — 잔 굴곡 + 잔머리 12% + 중간에 끊긴 가닥 15% + 밑단을 지나친 가닥 5% + 거꾸로 간 가닥 5% → 마네킹 3만 가닥):
 *                              결 어긋남(이웃 평균과의 각 · 중앙/90%)   밑단 들쭉날쭉(끝 높이 10~90%)   밑단보다 3cm 넘게 내려온 가닥   잡음 없는 머리와의 거리(중앙/90%)
 *     평균 표(아침)                    0.7° / 3.5°                        8.8cm                        3.4%                      1.0 / 4.0cm
 *     본보기 표(10:01 배포)            3.3° / 7.1°                        9.3cm                        4.7%                      1.6 / 4.6cm
 *     지금                            0.3° / 3.4°                        4.7cm                        2.1%                      1.0 / 1.7cm
 *     (잡음 없는 머리 자체의 밑단 들쭉날쭉은 3.8cm) · 칸 몇 개가 통째로 밑단을 지나친 원본이면 꼬리 가닥: 평균 8.1% · 본보기 8.9% · 지금 2.4%.
 *     같이 가다 양옆으로 갈라지는 머리에서 얼굴 앞을 지나는 가닥(잡음 없는 머리 197/30,000): 평균 700 · 본보기 124 · 지금 202.
 *   지금:
 *     · 본보기 가닥을 뺐습니다. 칸(무리)의 방향 = 그 무리의 "몸통 가닥"(가는 쪽이 무리 평균과 coreDot 이상 같은 가닥)만의 평균.
 *       잔머리·엇나간 가닥·거꾸로 간 가닥은 표에 안 들어갑니다. 양쪽으로 갈라지는 칸은 (b)의 세 자리 가르기로 이미 두 무리라 가운데로 평균 나지 않습니다.
 *     · 이웃 칸과 고르기 — 같은 쪽으로 가는 이웃 무리끼리 방향·길이를 두 번 섞습니다(갈라지는 길이 칸은 안 섞음). 결이 칸마다 따로 놀지 않습니다.
 *     · 길이 — 칸마다 하나(몸통 가닥 길이의 60% 자리)로 정하고 가닥마다 ±4%만 다르게. 이웃보다 혼자 훨씬 긴 칸은 이웃 길이로 누릅니다(짧은 쪽은 그대로).
 *     · 한 칸의 가닥이 두 쪽으로 갈릴 때, 두 무리의 뿌리 자리가 칸 안에서 섞여 있으면(가르마처럼 자리로 갈리지 않으면) 큰 무리만 씁니다.
 *       예전에는 작은 무리(엇나가거나 거꾸로 간 가닥들)도 그 비율만큼 가닥을 받아서, 여러 가닥이 같이 엇나가는 다발이 됐습니다.
 *       다발은 53번 빗이 "몸통"으로 보기 때문에(같이 가는 가닥이 많음) 빗어도 안 눕습니다.
 *     · 칸의 몸통은 "가장 많은 가닥이 같이 가는 쪽"에서 고릅니다(평균에서 고르면 두 쪽이 섞인 칸은 아무도 안 가는 가운데가 됨).
 *       둘레에 같은 쪽으로 가는 이웃이 하나도 없는 칸은 이웃들 중 여럿이 가는 쪽을 따릅니다(이웃도 제각각인 가마 같은 자리는 그대로).
 *       재현(칸의 15%에서 그 칸 가닥의 30%가 같이 엇나가는 원본 → 깨끗한 길에서 3cm 넘게 벗어난 가닥 / 그런 가닥이 10개 넘게 모인 칸):
 *         평균 표 466 / 12칸 · 본보기 표 185 / 7칸 · 지금 29 / 0칸.  (42%가 엇나가면 890 / 23 · 763 / 15 · 178 / 1.
 *         절반 넘게 엇나가는 칸은 그쪽이 그 칸의 결이므로 그대로 따라갑니다.)
 *     · 표 형식은 v2 그대로(풀기·걷기 코드는 안 바뀜). 10:01 배포본으로 저장한 스타일은 본보기 표가 들어 있으니 원본 머리에서 다시 등록해야 합니다.
 *
 * 확인한 것(합성 머리 — 가운데·옆 가르마 · 앞쪽만 짧은 긴 직모 · 잔머리 12%):
 *   · 표 만들기 → 싣기 → 풀기 → 같은/큰/작은 두상에 걸기: 두피 속 점 0 · 가르마를 건너가는 가닥 0 · 끝 높이(두상 높이 대비) 두상 크기와 무관하게 같음.
 *   · 실제 앱 코드를 브라우저에 올려서(사진 모델·다시 기른 모델은 지어낸 것): 스타일 걸기(applyStyleSpecAndRender → 앱이 직접 만든 마네킹 29,999가닥)에서
 *     전 가닥이 표대로 · 얼굴 앞을 지나는 가닥 0(같은 스타일을 표 없이 걸면 2,305) · 기준 상태의 가닥 = 표 뼈대와 점 단위로 같음 ·
 *     섹션 길이 슬라이더 30/50/70이 그 섹션에만 걸림 · 컬·넘김이 그 위에 걸림 · [현재 모델을 스타일로 등록] → 저장소 → 다시 걸기 · 끄면 예전 동작.
 * 확인 못 한 것: 실제 손님 사진 · 58번의 원본 올리기 경로 전체(42번 재기는 실제 다시 기르기가 있어야 돕니다) · 마네킹이 앞머리를 내려 심는 손님 · 폰 속도.
 *   진단 [결 표] 줄의 "표로 다시 만든 가닥 ↔ 원래 가닥" 거리가 실제 사진에서 표가 얼마나 잃는지를 말해 줍니다.
 *
 * 끄기: FLOW_SPEC.on=false 후 스타일을 다시 걸기(그러면 그 스타일은 예전처럼 숫자만으로 걸립니다) · 표를 스펙에 안 싣기: FLOW_SPEC.save=false
 * ========================================================================== */
(function () {
  'use strict';
  var W = window, TAG = '[결 표]';
  var FS = W.FLOW_SPEC = Object.assign({
    on: true,            // 거는 쪽: 스펙에 flow가 있으면 마네킹 가닥을 표대로
    save: true,          // 싣는 쪽: 원본 머리의 스펙에 flow를 넣음
    cs: 0.14,            // 두피 칸(두상으로 나눈 좌표 · 0.14 ≈ 1cm)
    bin: 0.08,           // 길이 칸(같은 좌표 · ≈ 0.6~0.9cm)
    maxBins: 72,         // 길이 칸 상한(≈ 60cm)
    early: 0.35, mid: 1.0, late: 2.4,   // 가닥이 "어느 쪽으로 가는가"를 보는 세 자리(뿌리에서 ≈ 4 · 11 · 26cm — 가닥이 짧으면 끝)
    minCell: 3,          // 한 칸에 가닥이 이만큼은 있어야 표로 씀
    splitCoh: 0.8,       // 칸 안 가닥들의 방향 모임(0~1)이 이보다 낮으면 두 무리로 갈라 봄
    splitAngle: 50,      // 도: 두 무리의 방향이 이만큼은 벌어져야 가름
    splitMinShare: 0.2,  // 작은 무리가 이 비율은 돼야 가름
    step: 0.05,          // 뼈대를 걸을 때 한 걸음(같은 좌표) — 가닥이 길면 maxPts에 맞춰 넓어짐
    minPts: 6, maxPts: 28,
    matchDot: 0.5,       // 이웃 칸의 무리가 제 무리와 이만큼(cos · 처음과 끝 쪽 평균)은 같은 쪽이어야 섞음
    binGate: 0.82,       // 길이 칸마다: 이웃 칸의 방향이 제 칸 방향과 이만큼(cos ≈ 35°)은 같아야 그 칸에서 섞음 — 양쪽으로 갈라지는 자리에서 가운데로 평균 내지 않게
    dropMixed: true,     // 한 칸의 두 무리가 뿌리 자리로 갈리지 않고 섞여 있으면 큰 무리만 씀(작은 무리 = 엇나간 가닥)
    coreDot: 0.85,       // 무리의 "몸통"으로 치는 기준 — 가는 쪽(세 자리 평균 cos)이 무리 평균과 이만큼 같은 가닥만 표에 넣음(≈ 32°)
    lenQ: 0.6,           // 칸의 길이 = 몸통 가닥 길이의 이 자리(0.5 = 중앙값). 가닥마다 제각각인 길이는 안 씀
    lenVar: 0.04,        // 가닥마다 길이를 ± 이만큼만 다르게
    lonerMin: 4,         // 둘레에 무리가 이만큼은 있는데 같은 쪽으로 가는 이웃이 하나도 없는 칸은 이웃을 따름 · 0 = 안 함
    tailCap: 1.1,        // 같은 쪽 이웃들의 길이(위쪽 75%)보다 이 배수 넘게 긴 칸은 그 길이로 누름 · 0 = 안 누름
    lenStep: 0.25,       // 이웃 칸과 길이를 섞는 한도 — 이보다 크게 다르면(앞머리 ↔ 긴 머리) 안 섞음
    smoothPasses: 2, smoothDot: 0.8,   // 이웃 칸과 고르는 횟수 · 같은 쪽으로 가는 무리로 보는 기준(cos)
    guardNeck: true,     // 걸을 때 목 기둥 속으로 들어가는 점은 밖으로(42번 neckPush)
    fidelityN: 2500      // 진단: 표로 다시 만들어 볼 원래 가닥 수
  }, W.FLOW_SPEC || {});
  var ST = FS.stats = { built: null, shaped: 0, fallback: 0, err: null, saveWarn: null };

  function now() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function qv(a, f) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; }
  var OFF = 64, SPAN = 128;
  function keyOf(ix, iy, iz) { return (ix + OFF) + SPAN * ((iy + OFF) + SPAN * (iz + OFF)); }
  function hash01(p) { var v = Math.sin(p.x * 269.5 + p.y * 183.3 + p.z * 419.2) * 24634.6345; return v - Math.floor(v); }   // 08번 _cutHash01(숱 솎기)과 다른 상수 — 같으면 숱을 줄일 때 짧은 가닥만 남음

  /* ------------------------------------------------------------------------------------------------------------
   * 표 만들기 — strands: [{pts:[{x,y,z}…]}] · E: 두피 타원체 {a,b,c} · CY: 두상 중심 높이
   * ---------------------------------------------------------------------------------------------------------- */
  function buildTable(strands, E, CY, cfg) {
    cfg = cfg || FS;
    var cs = cfg.cs, bin = cfg.bin, NBmax = cfg.maxBins | 0, n = strands.length, recs = [], cells = new Map(), si, i;
    var ia = 1 / E.a, ib = 1 / E.b, ic = 1 / E.c, maxLen = 0, A1 = cfg.early, A2 = cfg.mid, A3 = cfg.late;
    for (si = 0; si < n; si++) {
      var p = strands[si] && strands[si].pts; if (!p || p.length < 3) continue;
      var m = p.length, N = new Float32Array(m * 3);
      for (i = 0; i < m; i++) { N[i * 3] = p[i].x * ia; N[i * 3 + 1] = (p[i].y - CY) * ib; N[i * 3 + 2] = p[i].z * ic; }
      var rl = Math.sqrt(N[0] * N[0] + N[1] * N[1] + N[2] * N[2]); if (!(rl > 0.2)) continue;
      var ux = N[0] / rl, uy = N[1] / rl, uz = N[2] / rl, ix = Math.floor(ux / cs), iy = Math.floor(uy / cs), iz = Math.floor(uz / cs);
      // 길이 · 가는 쪽(뿌리에서 early / mid / late만큼 간 자리까지의 방향 — 가닥이 짧으면 끝까지)
      var len = 0, F = new Float32Array(9), g1 = false, g2 = false, g3 = false, dx, dy, dz, l, k;
      for (i = 1; i < m; i++) {
        dx = N[i * 3] - N[i * 3 - 3]; dy = N[i * 3 + 1] - N[i * 3 - 2]; dz = N[i * 3 + 2] - N[i * 3 - 1]; l = Math.sqrt(dx * dx + dy * dy + dz * dz); len += l;
        if (!g1 && len >= A1) { F[0] = N[i * 3] - N[0]; F[1] = N[i * 3 + 1] - N[1]; F[2] = N[i * 3 + 2] - N[2]; g1 = true; }
        if (!g2 && len >= A2) { F[3] = N[i * 3] - N[0]; F[4] = N[i * 3 + 1] - N[1]; F[5] = N[i * 3 + 2] - N[2]; g2 = true; }
        if (!g3 && len >= A3) { F[6] = N[i * 3] - N[0]; F[7] = N[i * 3 + 1] - N[1]; F[8] = N[i * 3 + 2] - N[2]; g3 = true; }
      }
      if (!(len > bin * 0.5)) continue;
      var tx = N[m * 3 - 3] - N[0], ty = N[m * 3 - 2] - N[1], tz = N[m * 3 - 1] - N[2];
      if (!g1) { F[0] = tx; F[1] = ty; F[2] = tz; } if (!g2) { F[3] = tx; F[4] = ty; F[5] = tz; } if (!g3) { F[6] = tx; F[7] = ty; F[8] = tz; }
      var okF = true;
      for (k = 0; k < 3; k++) { l = Math.sqrt(F[k * 3] * F[k * 3] + F[k * 3 + 1] * F[k * 3 + 1] + F[k * 3 + 2] * F[k * 3 + 2]); if (!(l > 1e-6)) { okF = false; break; } F[k * 3] /= l; F[k * 3 + 1] /= l; F[k * 3 + 2] /= l; }
      if (!okF) continue;
      var rec = { N: N, m: m, len: len, F: F, ox: ux - (ix + 0.5) * cs, oy: uy - (iy + 0.5) * cs, oz: uz - (iz + 0.5) * cs, cl: 0 };
      var key = keyOf(ix, iy, iz), c = cells.get(key);
      if (!c) { c = { ix: ix, iy: iy, iz: iz, recs: [] }; cells.set(key, c); }
      c.recs.push(rec); recs.push(rec); if (len > maxLen) maxLen = len;
    }
    function fdot(a, b) { var s = 0, k; for (k = 0; k < 9; k++) s += a[k] * b[k]; return s / 3; }
    function fmean(R) {                                                      // 세 구간 방향을 따로 평균해 각각 길이 1로 · coh = 세 평균 벡터 길이의 평균
      var M = new Float32Array(9), j, k, l, coh = 0;
      for (j = 0; j < R.length; j++) for (k = 0; k < 9; k++) M[k] += R[j].F[k];
      for (k = 0; k < 3; k++) { l = Math.sqrt(M[k * 3] * M[k * 3] + M[k * 3 + 1] * M[k * 3 + 1] + M[k * 3 + 2] * M[k * 3 + 2]); coh += l / R.length; if (l > 1e-6) { M[k * 3] /= l; M[k * 3 + 1] /= l; M[k * 3 + 2] /= l; } }
      return { M: M, coh: coh / 3 };
    }
    var nb = Math.max(2, Math.min(NBmax, Math.ceil(maxLen / bin))), out = [], nSplit = 0, nMixed = 0, nUsed = 0, nSkipCell = 0, cSplit = Math.cos(cfg.splitAngle * Math.PI / 180);
    var D = new Float32Array(nb * 4), WN = [0, 1, 0.6, 0.35];
    cells.forEach(function (c) {
      var R = c.recs, nr = R.length, j, r, k;
      if (nr < cfg.minCell) { nSkipCell++; return; }
      // 갈리는 칸인가 — 가는 쪽(세 구간)이 두 무리로 나뉘는가
      var fm = fmean(R), groups = [R];
      if (fm.coh < cfg.splitCoh && nr >= 2 * cfg.minCell) {
        var a = R[0], b = R[0], best = 9, d;
        for (j = 0; j < nr; j++) { d = fdot(R[j].F, fm.M); if (d < best) { best = d; a = R[j]; } }
        best = 9; for (j = 0; j < nr; j++) { d = fdot(R[j].F, a.F); if (d < best) { best = d; b = R[j]; } }
        var CA = a.F, CB = b.F, it, GA, GB, mA, mB;
        for (it = 0; it < 6; it++) {
          GA = []; GB = [];
          for (j = 0; j < nr; j++) { r = R[j]; if (fdot(r.F, CA) >= fdot(r.F, CB)) { r.cl = 0; GA.push(r); } else { r.cl = 1; GB.push(r); } }
          if (!GA.length || !GB.length) break;
          mA = fmean(GA); mB = fmean(GB); CA = mA.M; CB = mB.M;
        }
        var minStage = 2;
        for (k = 0; k < 3; k++) { d = CA[k * 3] * CB[k * 3] + CA[k * 3 + 1] * CB[k * 3 + 1] + CA[k * 3 + 2] * CB[k * 3 + 2]; if (d < minStage) minStage = d; }
        if (GA && GB && GA.length >= cfg.minCell && GB.length >= cfg.minCell && Math.min(GA.length, GB.length) / nr >= cfg.splitMinShare && minStage <= cSplit) { groups = [GA, GB]; nSplit++; }
        else for (j = 0; j < nr; j++) R[j].cl = 0;
      }
      // 두 무리의 뿌리 자리가 칸 안에서 섞여 있으면(가르마처럼 자리로 갈리지 않음) 작은 무리는 엇나간 가닥으로 보고 큰 무리만 씀
      if (groups.length === 2 && cfg.dropMixed) {
        var ca = [0, 0, 0], cb = [0, 0, 0];
        groups[0].forEach(function (q0) { ca[0] += q0.ox; ca[1] += q0.oy; ca[2] += q0.oz; }); groups[1].forEach(function (q0) { cb[0] += q0.ox; cb[1] += q0.oy; cb[2] += q0.oz; });
        var na2 = groups[0].length, nb2 = groups[1].length, sx2 = ca[0] / na2 - cb[0] / nb2, sy2 = ca[1] / na2 - cb[1] / nb2, sz2 = ca[2] / na2 - cb[2] / nb2;
        if (sx2 * sx2 + sy2 * sy2 + sz2 * sz2 <= 0.0625 * cs * cs) { groups = [na2 >= nb2 ? groups[0] : groups[1]]; nSplit--; nMixed++; }
      }
      var cell = { ix: c.ix, iy: c.iy, iz: c.iz, cl: [] };
      groups.forEach(function (Gr) {
        // 무리의 "몸통" — 가는 쪽(세 자리)이 무리 평균과 coreDot 이상 같은 가닥만(잔머리·엇나간 가닥은 표에 안 들어감). 평균을 몸통으로 한 번 다시 냄
        //   평균에서 시작하지 않고 "가장 많은 가닥이 같이 가는 쪽"에서 시작합니다(평균은 두 쪽이 섞인 칸에서 아무도 안 가는 가운데가 됨)
        var gm = fmean(Gr).M, core = Gr, pass, j2, r2, o, bb, k2;
        if (Gr.length >= 2 * cfg.minCell) {
          var bestC = -1, bi = 0, lim2 = Math.min(Gr.length, 90), stp = Gr.length / lim2, a3, b3, cnt3;
          for (a3 = 0; a3 < lim2; a3++) {
            var ra = Gr[Math.floor(a3 * stp)]; cnt3 = 0;
            for (b3 = 0; b3 < lim2; b3++) if (fdot(ra.F, Gr[Math.floor(b3 * stp)].F) >= cfg.coreDot) cnt3++;
            if (cnt3 > bestC) { bestC = cnt3; bi = Math.floor(a3 * stp); }
          }
          gm = Gr[bi].F;
        }
        for (pass = 0; pass < 2; pass++) {
          var nx = Gr.filter(function (q0) { return fdot(q0.F, gm) >= cfg.coreDot; });
          if (nx.length < Math.max(cfg.minCell, Math.ceil(Gr.length * 0.3))) nx = Gr.filter(function (q0) { return fdot(q0.F, gm) >= 0.7; });
          if (nx.length < cfg.minCell) { nx = Gr; pass = 2; }
          core = nx; gm = fmean(core).M;
        }
        var cn = core.length, lens = [];
        for (o = 0; o < nb * 4; o++) D[o] = 0;
        for (j2 = 0; j2 < cn; j2++) {
          r2 = core[j2]; lens.push(r2.len);
          var a2 = 0, i3, x2, y2, z2, l2, c0, c1, c2;
          for (i3 = 1; i3 < r2.m; i3++) {
            x2 = r2.N[i3 * 3] - r2.N[i3 * 3 - 3]; y2 = r2.N[i3 * 3 + 1] - r2.N[i3 * 3 - 2]; z2 = r2.N[i3 * 3 + 2] - r2.N[i3 * 3 - 1]; l2 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);
            if (!(l2 > 1e-9)) continue;
            c0 = Math.min(nb - 1, Math.floor(a2 / bin)); a2 += l2; c1 = Math.min(nb - 1, Math.floor((a2 - 1e-9) / bin));
            for (c2 = c0; c2 <= c1; c2++) { o = c2 * 4; D[o] += x2; D[o + 1] += y2; D[o + 2] += z2; D[o + 3] += 1; }
          }
        }
        // 길이 = 몸통 가닥 길이의 lenQ 자리 하나(가닥마다 제각각인 길이는 버림 — 밑단이 들쭉날쭉해지고 긴 꼬리가 생김)
        var L0 = qv(lens, cfg.lenQ), need = Math.min(nb, Math.ceil(L0 * (1 + cfg.lenVar) / bin) + 1), minKeep = Math.max(1, Math.min(3, Math.floor(cn * 0.2)));
        var dirs = [], nbn = 0, vx, vy, vz, vl, lx = 0, ly = -1, lz = 0;
        for (bb = 0; bb < need; bb++) {
          o = bb * 4; vx = D[o]; vy = D[o + 1]; vz = D[o + 2]; vl = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (!(D[o + 3] >= minKeep) || !(vl > 1e-6)) { if (!nbn) break; vx = lx; vy = ly; vz = lz; vl = 1; }   // 몸통 가닥이 여기까지 안 옴 — 직전 방향 그대로
          lx = vx / vl; ly = vy / vl; lz = vz / vl; dirs.push(lx, ly, lz); nbn++;
        }
        if (!nbn) return;
        var ox = 0, oy = 0, oz = 0;
        for (j2 = 0; j2 < Gr.length; j2++) { r2 = Gr[j2]; ox += r2.ox; oy += r2.oy; oz += r2.oz; }
        cell.cl.push({ n: Gr.length, core: cn, e: [gm[0], gm[1], gm[2]], e2: [gm[6], gm[7], gm[8]], rc: [ox / Gr.length, oy / Gr.length, oz / Gr.length], L: Math.min(L0, nbn * bin), nbn: nbn, d: dirs });
        nUsed += cn;
      });
      if (cell.cl.length) out.push(cell);
    });
    // 이웃 칸과 고르기 — 같은 쪽으로 가는 이웃 무리끼리 방향·길이를 섞어 결이 칸마다 따로 놀지 않게(얽힘 방지). 갈라지는 자리는 안 섞음
    var cmap = new Map(), ci, pi;
    out.forEach(function (c) { cmap.set(keyOf(c.ix, c.iy, c.iz), c); });
    function compat(a, b) { return 0.5 * (a.e[0] * b.e[0] + a.e[1] * b.e[1] + a.e[2] * b.e[2] + a.e2[0] * b.e2[0] + a.e2[1] * b.e2[1] + a.e2[2] * b.e2[2]); }
    // 혼자 긴 칸 누르기 — 같은 쪽으로 가는 이웃 무리들보다 훨씬 긴 칸은(다시 기르기가 밑단을 지나쳐 간 자리) 이웃 길이의 위쪽(75%) × tailCap으로.
    //   짧은 쪽(앞머리 등)은 그대로 둠
    var nTail = 0;
    if (cfg.tailCap > 0) {
      var caps = [];
      out.forEach(function (c) {
        c.cl.forEach(function (g) {
          var Ls = [], dx, dy, dz, nc, k;
          for (dz = -1; dz <= 1; dz++) for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
            if (!dx && !dy && !dz) continue;
            nc = cmap.get(keyOf(c.ix + dx, c.iy + dy, c.iz + dz)); if (!nc) continue;
            for (k = 0; k < nc.cl.length; k++) if (compat(g, nc.cl[k]) >= cfg.smoothDot) Ls.push(nc.cl[k].L);
          }
          if (Ls.length >= 3) { var cap = qv(Ls, 0.75) * cfg.tailCap; if (g.L > cap) caps.push([g, cap]); }
        });
      });
      caps.forEach(function (u) { u[0].L = u[1]; nTail++; });
    }
    // 혼자 다른 쪽으로 가는 칸 — 둘레의 무리가 lonerMin개 이상인데 같은 쪽으로 가는 이웃이 하나도 없으면, 이웃들 중 가장 여럿이 가는 쪽을 따름
    var nLone = 0;
    if (cfg.lonerMin > 0) {
      var fixes = [];
      out.forEach(function (c) {
        c.cl.forEach(function (g) {
          var Ns = [], dx, dy, dz, nc, k, any = false;
          for (dz = -1; dz <= 1; dz++) for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
            if (!dx && !dy && !dz) continue;
            nc = cmap.get(keyOf(c.ix + dx, c.iy + dy, c.iz + dz)); if (!nc) continue;
            for (k = 0; k < nc.cl.length; k++) { Ns.push(nc.cl[k]); if (compat(g, nc.cl[k]) >= cfg.smoothDot) any = true; }
          }
          if (any || Ns.length < cfg.lonerMin || c.cl.length > 1) return;
          var best = null, bs = -1, i2, j3, sc;
          for (i2 = 0; i2 < Ns.length; i2++) { sc = 0; for (j3 = 0; j3 < Ns.length; j3++) if (compat(Ns[i2], Ns[j3]) >= cfg.smoothDot) sc += Ns[j3].core; if (sc > bs) { bs = sc; best = Ns[i2]; } }
          if (!best) return;
          var grp = Ns.filter(function (x) { return compat(best, x) >= cfg.smoothDot; });
          if (grp.length < Math.ceil(Ns.length * 0.5)) return;                 // 이웃들도 제각각이면(가마 등) 그대로 둠
          fixes.push([g, grp]);
        });
      });
      fixes.forEach(function (u) {
        var g = u[0], grp = u[1], nbn = g.nbn, nd = new Float32Array(nbn * 3), e = [0, 0, 0], e2 = [0, 0, 0], bb, o, i2, x, w, wn, last;
        for (i2 = 0; i2 < grp.length; i2++) {
          x = grp[i2]; w = Math.min(x.core, 40);
          for (bb = 0; bb < nbn; bb++) { o = bb * 3; last = Math.min(bb, x.nbn - 1) * 3; nd[o] += w * x.d[last]; nd[o + 1] += w * x.d[last + 1]; nd[o + 2] += w * x.d[last + 2]; }
          e[0] += w * x.e[0]; e[1] += w * x.e[1]; e[2] += w * x.e[2]; e2[0] += w * x.e2[0]; e2[1] += w * x.e2[1]; e2[2] += w * x.e2[2];
        }
        for (bb = 0; bb < nbn; bb++) { o = bb * 3; wn = Math.sqrt(nd[o] * nd[o] + nd[o + 1] * nd[o + 1] + nd[o + 2] * nd[o + 2]) || 1; nd[o] /= wn; nd[o + 1] /= wn; nd[o + 2] /= wn; }
        wn = Math.hypot(e[0], e[1], e[2]) || 1; g.e = [e[0] / wn, e[1] / wn, e[2] / wn]; wn = Math.hypot(e2[0], e2[1], e2[2]) || 1; g.e2 = [e2[0] / wn, e2[1] / wn, e2[2] / wn];
        g.d = Array.prototype.slice.call(nd); nLone++;
      });
    }
    for (pi = 0; pi < (cfg.smoothPasses | 0); pi++) {
      var upd = [];
      out.forEach(function (c) {
        c.cl.forEach(function (g) {
          var nd = new Float32Array(g.nbn * 3), wl = Math.min(g.core, 40), sl = g.L * wl, dx, dy, dz, nc, k, gj, w, bb, o, dt, wn, lim;
          for (bb = 0; bb < g.nbn * 3; bb++) nd[bb] = g.d[bb] * wl;
          for (dz = -1; dz <= 1; dz++) for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
            if (!dx && !dy && !dz) continue;
            nc = cmap.get(keyOf(c.ix + dx, c.iy + dy, c.iz + dz)); if (!nc) continue;
            for (k = 0; k < nc.cl.length; k++) {
              gj = nc.cl[k]; if (compat(g, gj) < cfg.smoothDot) continue;
              w = Math.min(gj.core, 40) * WN[Math.abs(dx) + Math.abs(dy) + Math.abs(dz)];
              lim = Math.min(g.nbn, gj.nbn);
              for (bb = 0; bb < lim; bb++) {
                o = bb * 3; dt = g.d[o] * gj.d[o] + g.d[o + 1] * gj.d[o + 1] + g.d[o + 2] * gj.d[o + 2];
                if (dt < cfg.binGate) continue;                              // 이 길이 칸에서는 갈라짐 — 안 섞음
                nd[o] += w * gj.d[o]; nd[o + 1] += w * gj.d[o + 1]; nd[o + 2] += w * gj.d[o + 2];
              }
              if (Math.abs(gj.L - g.L) <= cfg.lenStep * Math.max(g.L, gj.L)) { sl += gj.L * w; wl += w; }   // 길이가 확 다른 이웃(앞머리 ↔ 긴 머리)은 길이를 안 섞음
            }
          }
          for (bb = 0; bb < g.nbn; bb++) { o = bb * 3; wn = Math.sqrt(nd[o] * nd[o] + nd[o + 1] * nd[o + 1] + nd[o + 2] * nd[o + 2]) || 1; nd[o] /= wn; nd[o + 1] /= wn; nd[o + 2] /= wn; }
          upd.push([g, nd, sl / wl]);
        });
      });
      upd.forEach(function (u) { u[0].d = Array.prototype.slice.call(u[1]); u[0].L = Math.min(u[2], u[0].nbn * bin); });
    }
    // 길이 분포(5자리)는 고른 길이 둘레의 좁은 띠로 — 가닥마다 ±lenVar만 다름
    out.forEach(function (c) { c.cl.forEach(function (g) { var v = cfg.lenVar; g.q = [g.L * (1 - v), g.L * (1 - v / 2), g.L, g.L * (1 + v / 2), g.L * (1 + v)]; }); });
    return { cs: cs, bin: bin, nb: nb, cells: out, stats: { strands: recs.length, used: nUsed, cells: out.length, split: nSplit, skipped: nSkipCell, maxLen: maxLen, tailCells: nTail, mixed: nMixed, lone: nLone } };
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 싣기 / 풀기 — 무리 하나 = [ix,iy,iz, 무리번호|무리수<<1, n, e×3, e2×3, rc×3, q×5, nbn, 방향 nbn×3] (전부 1바이트 · v1에는 e2가 없음)
   * ---------------------------------------------------------------------------------------------------------- */
  function c8(v) { v = Math.round(v * 127); return v < -127 ? -127 : v > 127 ? 127 : v; }
  function b64(u8) { var s = '', i, CH = 0x8000; for (i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function encode(t) {
    var lmax = 0, tot = 0, nrec = 0;
    t.cells.forEach(function (c) { c.cl.forEach(function (g) { if (g.q[4] > lmax) lmax = g.q[4]; tot += 20 + g.nbn * 3; nrec++; }); });
    if (!(lmax > 0)) lmax = t.bin;
    var u = new Uint8Array(tot), I = new Int8Array(u.buffer), o = 0;
    t.cells.forEach(function (c) {
      c.cl.forEach(function (g, gi) {
        var k;
        I[o++] = c.ix; I[o++] = c.iy; I[o++] = c.iz; u[o++] = gi | (c.cl.length << 1); u[o++] = Math.min(255, g.n);
        for (k = 0; k < 3; k++) I[o++] = c8(g.e[k]);
        for (k = 0; k < 3; k++) I[o++] = c8(g.e2[k]);
        for (k = 0; k < 3; k++) I[o++] = c8(g.rc[k] / t.cs);
        for (k = 0; k < 5; k++) u[o++] = Math.max(0, Math.min(255, Math.round(g.q[k] / lmax * 255)));
        u[o++] = g.nbn;
        for (k = 0; k < g.nbn * 3; k++) I[o++] = c8(g.d[k]);
      });
    });
    return { v: 2, cs: t.cs, bin: t.bin, lmax: +lmax.toFixed(4), n: nrec, d: b64(u) };
  }
  var RT = (typeof WeakMap === 'function') ? new WeakMap() : null, RTs = { s: null, t: null };
  function decode(f) {
    if (!f || (f.v !== 1 && f.v !== 2) || typeof f.d !== 'string') return null;
    var hit = RT ? RT.get(f) : null; if (hit) return hit;
    if (RTs.s === f.d) { if (RT) RT.set(f, RTs.t); return RTs.t; }        // 같은 표를 복사한 스펙(JSON 복제)
    var u = unb64(f.d), I = new Int8Array(u.buffer), o = 0, map = new Map(), k, nrec = 0, HD = f.v >= 2 ? 20 : 17;
    while (o + HD <= u.length) {
      var ix = I[o++], iy = I[o++], iz = I[o++], fl = u[o++], n = u[o++], e = [I[o++] / 127, I[o++] / 127, I[o++] / 127];
      var e2 = f.v >= 2 ? [I[o++] / 127, I[o++] / 127, I[o++] / 127] : e;
      var rc = [I[o++] / 127 * f.cs, I[o++] / 127 * f.cs, I[o++] / 127 * f.cs], q = new Float32Array(5);
      for (k = 0; k < 5; k++) q[k] = u[o++] / 255 * f.lmax;
      var nbn = u[o++]; if (o + nbn * 3 > u.length) break;
      var d = new Float32Array(nbn * 3), l;
      for (k = 0; k < nbn; k++) { d[k * 3] = I[o++]; d[k * 3 + 1] = I[o++]; d[k * 3 + 2] = I[o++]; l = Math.sqrt(d[k * 3] * d[k * 3] + d[k * 3 + 1] * d[k * 3 + 1] + d[k * 3 + 2] * d[k * 3 + 2]) || 1; d[k * 3] /= l; d[k * 3 + 1] /= l; d[k * 3 + 2] /= l; }
      var key = keyOf(ix, iy, iz), c = map.get(key);
      if (!c) { c = { ix: ix, iy: iy, iz: iz, cl: [] }; map.set(key, c); }
      c.cl[fl & 1] = { n: n, e: e, e2: e2, rc: rc, q: q, nbn: nbn, d: d }; nrec++;
    }
    map.forEach(function (c) { c.cl = c.cl.filter(Boolean); });
    var t = { cs: f.cs, bin: f.bin, lmax: f.lmax, map: map, n: nrec };
    if (RT) RT.set(f, t); RTs.s = f.d; RTs.t = t;
    return t;
  }

  /* ------------------------------------------------------------------------------------------------------------
   * 뼈대 걷기 — root: 가닥 뿌리(모델 좌표) · h: 0~1(길이 분포에서 뽑을 자리) · t: 풀어 둔 표 · E, CY: 걸 두상
   *   lenOver(같은 좌표의 길이)가 있으면 길이 분포 대신 그 길이로(진단용). 못 만들면 null.
   * ---------------------------------------------------------------------------------------------------------- */
  var _C = new Array(8), _G = new Array(8), _Wt = new Float64Array(8);
  function pickCluster(c, ox, oy, oz, h, cs) {
    if (c.cl.length < 2) return c.cl[0];
    var A = c.cl[0], B = c.cl[1], sx = A.rc[0] - B.rc[0], sy = A.rc[1] - B.rc[1], sz = A.rc[2] - B.rc[2];
    if (sx * sx + sy * sy + sz * sz > 0.0625 * cs * cs) {                 // 두 무리의 뿌리 자리가 떨어져 있음(가르마) — 가까운 쪽
      var da = (ox - A.rc[0]) * (ox - A.rc[0]) + (oy - A.rc[1]) * (oy - A.rc[1]) + (oz - A.rc[2]) * (oz - A.rc[2]);
      var db = (ox - B.rc[0]) * (ox - B.rc[0]) + (oy - B.rc[1]) * (oy - B.rc[1]) + (oz - B.rc[2]) * (oz - B.rc[2]);
      return da <= db ? A : B;
    }
    return h < A.n / (A.n + B.n) ? A : B;                                 // 섞여 있음 — 비율대로
  }
  function quant(q, h) { var f = (h < 0 ? 0 : h > 1 ? 1 : h) * 4, i = Math.min(3, Math.floor(f)), t = f - i; return q[i] + (q[i + 1] - q[i]) * t; }
  function shape(root, h, t, E, CY, lenOver, cfg, guard) {
    cfg = cfg || FS;
    var cs = t.cs, bin = t.bin, nx = root.x / E.a, ny = (root.y - CY) / E.b, nz = root.z / E.c, rl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (!(rl > 0.2)) return null;
    var ux = nx / rl, uy = ny / rl, uz = nz / rl, hx = Math.floor(ux / cs), hy = Math.floor(uy / cs), hz = Math.floor(uz / cs);
    var gx = ux / cs - 0.5, gy = uy / cs - 0.5, gz = uz / cs - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), z0 = Math.floor(gz), fx = gx - x0, fy = gy - y0, fz = gz - z0;
    var home = t.map.get(keyOf(hx, hy, hz)), k, dx, dy, dz, c, w, best = -1, i;
    if (!home) {                                                           // 제 칸에 표가 없음 — 둘레 8칸 중 가장 가까운 칸, 없으면 2칸 둘레까지
      for (k = 0; k < 8; k++) {
        dx = k & 1; dy = (k >> 1) & 1; dz = (k >> 2) & 1; c = t.map.get(keyOf(x0 + dx, y0 + dy, z0 + dz)); if (!c) continue;
        w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz); if (w > best) { best = w; home = c; }
      }
      if (!home) {
        var bd = 1e9, ddx, ddy, ddz, dd;
        for (dz = -2; dz <= 2; dz++) for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) {
          c = t.map.get(keyOf(hx + dx, hy + dy, hz + dz)); if (!c) continue;
          ddx = (hx + dx + 0.5) * cs - ux; ddy = (hy + dy + 0.5) * cs - uy; ddz = (hz + dz + 0.5) * cs - uz; dd = ddx * ddx + ddy * ddy + ddz * ddz;
          if (dd < bd) { bd = dd; home = c; }
        }
        if (!home) return null;
      }
    }
    var H = pickCluster(home, ux - (home.ix + 0.5) * cs, uy - (home.iy + 0.5) * cs, uz - (home.iz + 0.5) * cs, h, cs), e = H.e, e2 = H.e2, nC = 0, wsum = 0, g, j, dt, bdot, iH = 0;
    for (k = 0; k < 8; k++) {
      dx = k & 1; dy = (k >> 1) & 1; dz = (k >> 2) & 1; c = t.map.get(keyOf(x0 + dx, y0 + dy, z0 + dz)); if (!c) continue;
      w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz); if (!(w > 1e-4)) continue;
      if (c === home) { g = H; iH = nC; }
      else {
        g = null; bdot = cfg.matchDot;
        for (j = 0; j < c.cl.length; j++) {
          var cj = c.cl[j]; dt = 0.5 * (cj.e[0] * e[0] + cj.e[1] * e[1] + cj.e[2] * e[2] + cj.e2[0] * e2[0] + cj.e2[1] * e2[1] + cj.e2[2] * e2[2]);
          if (dt >= bdot && cj.e2[0] * e2[0] + cj.e2[1] * e2[1] + cj.e2[2] * e2[2] >= 0.3) { bdot = dt; g = cj; }
        }
        if (!g) continue;
      }
      w *= Math.min(1, g.n / 6); _C[nC] = c; _G[nC] = g; _Wt[nC] = w; wsum += w; nC++;
    }
    if (!nC || !(wsum > 1e-6) || _G[iH] !== H) { _G[0] = H; _Wt[0] = 1; wsum = 1; nC = 1; iH = 0; }
    var len = 0;
    if (lenOver > 0) len = lenOver; else { for (i = 0; i < nC; i++) len += _Wt[i] * quant(_G[i].q, h); len /= wsum; }
    if (!(len > 1e-4)) return null;
    var n = Math.max(cfg.minPts, Math.min(cfg.maxPts, Math.round(len / cfg.step))), ds = len / n, out = new Array(n + 1);
    var px = nx, py = ny, pz = nz, vx = e[0], vy = e[1], vz = e[2], s, fb, b0, tt, ax, ay, az, al, bA, bB, d, pl;
    out[0] = { x: root.x, y: root.y, z: root.z };
    for (k = 0; k < n; k++) {
      s = (k + 0.5) * ds; fb = s / bin - 0.5; b0 = Math.floor(fb); tt = fb - b0; if (b0 < 0) { b0 = 0; tt = 0; }
      // 제 칸(제 무리)의 방향을 먼저 — 이웃 칸은 이 자리에서 방향이 binGate 안으로 같을 때만 섞음
      g = H; d = g.d; bA = b0 < g.nbn ? b0 : g.nbn - 1; bB = b0 + 1 < g.nbn ? b0 + 1 : g.nbn - 1; w = _Wt[iH];
      var qx = d[bA * 3] + (d[bB * 3] - d[bA * 3]) * tt, qy = d[bA * 3 + 1] + (d[bB * 3 + 1] - d[bA * 3 + 1]) * tt, qz = d[bA * 3 + 2] + (d[bB * 3 + 2] - d[bA * 3 + 2]) * tt, ql = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1, cx, cy, cz, cl2;
      ax = w * qx; ay = w * qy; az = w * qz;
      for (i = 0; i < nC; i++) {
        if (i === iH) continue;
        g = _G[i]; d = g.d; if (b0 >= g.nbn) continue;                       // 이웃 칸의 표가 여기까지 안 옴 — 안 섞음
        bA = b0; bB = b0 + 1 < g.nbn ? b0 + 1 : g.nbn - 1; w = _Wt[i];
        cx = d[bA * 3] + (d[bB * 3] - d[bA * 3]) * tt; cy = d[bA * 3 + 1] + (d[bB * 3 + 1] - d[bA * 3 + 1]) * tt; cz = d[bA * 3 + 2] + (d[bB * 3 + 2] - d[bA * 3 + 2]) * tt; cl2 = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
        if ((cx * qx + cy * qy + cz * qz) / (cl2 * ql) < cfg.binGate) continue;
        ax += w * cx; ay += w * cy; az += w * cz;
      }
      al = Math.sqrt(ax * ax + ay * ay + az * az);
      if (al > 1e-4) { vx = ax / al; vy = ay / al; vz = az / al; }
      px += vx * ds; py += vy * ds; pz += vz * ds;
      pl = Math.sqrt(px * px + py * py + pz * pz);
      if (pl < 1 && pl > 1e-6) { px /= pl; py /= pl; pz /= pl; }           // 두피 속으로는 안 감
      var pt = { x: px * E.a, y: CY + py * E.b, z: pz * E.c };
      if (guard) { var pg = guard(pt); if (pg && pg !== pt) { pt = pg; px = pt.x / E.a; py = (pt.y - CY) / E.b; pz = pt.z / E.c; } }   // 목 속으로는 안 감
      out[k + 1] = pt;
    }
    return out;
  }
  FS._core = { buildTable: buildTable, encode: encode, decode: decode, shape: shape, hash01: hash01 };

  /* 진단: 원래 가닥을 표로 다시 만들어 얼마나 다른가(모델 단위) */
  function fidelity(strands, t, E, CY, maxN) {
    var n = strands.length, stride = Math.max(1, Math.ceil(n / Math.max(1, maxN))), mean = [], tip = [], si, i, miss = 0;
    function arcOf(p, sc) { var L = 0, k, dx, dy, dz; for (k = 1; k < p.length; k++) { dx = (p[k].x - p[k - 1].x) / (sc ? E.a : 1); dy = (p[k].y - p[k - 1].y) / (sc ? E.b : 1); dz = (p[k].z - p[k - 1].z) / (sc ? E.c : 1); L += Math.sqrt(dx * dx + dy * dy + dz * dz); } return L; }
    function at(p, L, f) {
      var want = L * f, acc = 0, k, l;
      for (k = 1; k < p.length; k++) { l = Math.hypot(p[k].x - p[k - 1].x, p[k].y - p[k - 1].y, p[k].z - p[k - 1].z); if (acc + l >= want && l > 0) { var u = (want - acc) / l; return { x: p[k - 1].x + (p[k].x - p[k - 1].x) * u, y: p[k - 1].y + (p[k].y - p[k - 1].y) * u, z: p[k - 1].z + (p[k].z - p[k - 1].z) * u }; } acc += l; }
      return p[p.length - 1];
    }
    for (si = 0; si < n; si += stride) {
      var p = strands[si] && strands[si].pts; if (!p || p.length < 3) continue;
      var q = shape(p[0], hash01(p[0]), t, E, CY, arcOf(p, true)); if (!q) { miss++; continue; }
      var Lp = arcOf(p, false), Lq = arcOf(q, false), sum = 0, a, b;
      for (i = 1; i <= 8; i++) { a = at(p, Lp, i / 8); b = at(q, Lq, i / 8); sum += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
      mean.push(sum / 8); tip.push(Math.hypot(p[p.length - 1].x - q[q.length - 1].x, p[p.length - 1].y - q[q.length - 1].y, p[p.length - 1].z - q[q.length - 1].z));
    }
    return { n: mean.length, miss: miss, meanMed: qv(mean, 0.5), meanP90: qv(mean, 0.9), tipMed: qv(tip, 0.5), tipP90: qv(tip, 0.9) };
  }
  FS._core.fidelity = fidelity;

  /* ------------------------------------------------------------------------------------------------------------
   * 앱에 끼우기
   * ---------------------------------------------------------------------------------------------------------- */
  var G = W.REGROW;
  function cmPerUnit() { var cm = 16.4; try { cm = modelCmPerUnit() || 16.4; } catch (e) {} return cm; }
  function secOrder() { return (typeof SECTION_ORDER !== 'undefined') ? SECTION_ORDER : ['crown', 'front', 'temple', 'side', 'occipital', 'nape']; }
  function scalpEnv(model) {
    var E = null, CY = 0.15;
    try { E = getScalpEllipsoid(); } catch (e) { E = null; }
    if (!E || !(E.a > 0) || !(E.b > 0) || !(E.c > 0)) return null;
    try { if (model && isFinite(model.CY)) CY = model.CY; else if (typeof SCALP_CENTER_Y !== 'undefined' && isFinite(SCALP_CENTER_Y)) CY = SCALP_CENTER_Y; } catch (e) {}
    return { E: { a: E.a, b: E.b, c: E.c }, CY: CY };
  }

  /* 다시 기른 모델에서 표를 뽑아 스펙 조각으로 */
  var lastFrom = { m: null, f: null };
  FS.fromRegrown = function () {
    if (!G || !G.model || !G.model.strands || !G.model.strands.length) return null;
    if (lastFrom.m === G.model && lastFrom.f) return lastFrom.f;         // 같은 모델이면 다시 안 뽑음(원본 ↔ 마네킹을 오갈 때마다 부르므로)
    var env = scalpEnv(G.model); if (!env) return null;
    var t0 = now(), tb = buildTable(G.model.strands, env.E, env.CY, FS), f = encode(tb), rt = decode(f), fid = null;
    lastFrom.m = G.model; lastFrom.f = f;
    try { fid = fidelity(G.model.strands, rt, env.E, env.CY, FS.fidelityN); } catch (e) { fid = null; }
    ST.built = { at: new Date().toTimeString().slice(0, 8), ms: now() - t0, bytes: f.d.length, stats: tb.stats, nb: tb.nb, fid: fid, cm: cmPerUnit() };
    return f;
  };

  /* 잰 결과(r)에 표를 실음 — r.spec을 그 자리에서 고침. tipAt/lenCm은 지우지 않습니다(끄면 예전 동작 · 걸 때만 가림) */
  FS.enrich = function (r) {
    if (!FS.save || !r || !r.spec) return r;
    var f = null;
    try { f = FS.fromRegrown(); } catch (e) { ST.err = '표 만들기 실패: ' + (e && e.message || e); console.warn(TAG + ' ' + ST.err, e); }
    if (!f || !(f.n > 0)) { ST.err = '표가 비었습니다(다시 기른 가닥에서 칸을 하나도 못 만듦) — 숫자만 넘깁니다'; console.warn(TAG + ' ' + ST.err); return r; }
    var sp = r.spec, sty = sp.styling || {}, perm = sp.perm || {}, len = {};
    secOrder().forEach(function (sec) { try { len[sec] = SECTIONS[sec].defaults.length; } catch (e) { len[sec] = 50; } });
    sp.flow = f;
    sp.flowBase = { sweep: sty.sweep || 0, volume: typeof sty.volume === 'number' ? sty.volume : 50, part: sty.part || 0, partAmt: sty.partAmt || 0,
      curl: perm.curl > 0 ? perm.curl : 0, wave: typeof perm.wave === 'number' ? perm.wave : 50,
      rodScale: (perm.rodScale > 1 ? perm.rodScale : (r.curl && perm.curl > 0 && r.curl.rodScale > 1 ? +(+r.curl.rodScale).toFixed(2) : 1)) };
    sp.flowLen = len;
    try { console.log(FS.lines().join('\n')); } catch (e) {}
    return r;
  };
  // 57번이 있으면 그 "넣기" 뒤에(58번 원본 올리기 · 42번 등록이 둘 다 이 자리를 지남), 없으면 42번 등록에 직접
  if (W.SPEC_PASS && typeof W.SPEC_PASS.enrich === 'function') {
    var innerEnrich = W.SPEC_PASS.enrich;
    W.SPEC_PASS.enrich = function (r) { var o = innerEnrich.apply(this, arguments); try { FS.enrich(o || r); } catch (e) { console.warn(TAG + ' 싣기 실패(없이 진행)', e); } return o; };
  } else if (G && typeof G.register === 'function' && typeof G.measure === 'function') {
    var origRegister = G.register;
    G.register = function () {
      var m = G.measure, stl;
      G.measure = function () { var r = m.apply(G, arguments); try { return r ? FS.enrich(r) : r; } catch (e) { return r; } };
      try { stl = origRegister.apply(this, arguments); } finally { G.measure = m; }
      return stl;
    };
    console.warn(TAG + ' 57-spec-pass.js가 없어 42번 등록에만 끼웠습니다(58번 원본 올리기에는 표가 안 실립니다)');
  }

  /* 지금 걸린(또는 걸고 있는) 스타일의 표 — 마네킹 모델일 때만 */
  var pendingId = null, actId = null, actSpec = null, envModel = null, envVal = null;
  function activeSpec() {
    if (!FS.on) return null;
    var id = null; try { id = pendingId || state.specAppliedId; } catch (e) { return null; }
    if (!id) return null;
    if (id !== actId || !actSpec) { actId = id; actSpec = null; try { actSpec = (typeof getStyleSpec === 'function') ? getStyleSpec(id) : null; } catch (e) { actSpec = null; } }
    return (actSpec && actSpec.flow) ? actSpec : null;
  }
  function refreshActive() { actId = null; actSpec = null; envModel = null; envVal = null; }
  FS.active = function () { var s = activeSpec(); return s ? s.flow : null; };
  function envFor(model) { if (model !== envModel) { envModel = model; envVal = scalpEnv(model); } return envVal; }

  /* 표 위에서 슬라이더 걸기 — 42번 adjustRegrown과 같은 방식(기준에서 움직인 만큼만) */
  function adjustFlow(s, g, base, lenOverride, styOverride) {
    var cur = (state.sections && state.sections[s.sec]) || {};
    var sty = (styOverride !== undefined ? styOverride : uniformStyling()) || stylingForRoot(s.pts[0]) || {};
    var C0 = base.curl || 0, dlen = 50; try { dlen = SECTIONS[s.sec].defaults.length; } catch (e) {}
    var r = sectionLengthRatio(s.sec, typeof lenOverride === 'number' ? lenOverride : cur.length) / (sectionLengthRatio(s.sec, dlen) || 1);
    var curl = Math.max(0, cur.curl || 0), keep = C0 > 0 && G && typeof G.curlRemain === 'function' && G.curlKeepShape !== false, total = r, cover = r;
    if (keep) { total = r / G.curlRemain(C0); var used = total * G.curlRemain(curl); cover = used > 1.0005 ? used : Math.min(1, total); }
    if (Math.abs(cover - 1) > 1e-6) g = lengthStrand3D(g, cover);
    var sweep = Math.max(-100, Math.min(100, (sty.sweep || 0) - (base.sweep || 0)));
    var vol = Math.max(0, Math.min(100, 50 + ((typeof sty.volume === 'number' ? sty.volume : 50) - (typeof base.volume === 'number' ? base.volume : 50))));
    var samePart = (sty.part || 0) === (base.part || 0) && (sty.partAmt || 0) === (base.partAmt || 0);
    var part = samePart ? 0 : (sty.part || 0), partAmt = samePart ? 0 : sty.partAmt, spine = false;
    try { spine = typeof STYLE_ORDER !== 'undefined' && !!STYLE_ORDER.spineFirst; } catch (e) {}
    if (spine) { g = partStrand3D(g, part, curl, partAmt); g = sweepStrand3D(g, sweep * sweepCurlScale(curl), curl, part, partAmt); }
    if (keep && total > cover * 1.0005) g = padArc(g, total / cover);
    var ks = (C0 > 0 && base.rodScale > 1 && curl > 0) ? Math.min(4, base.rodScale) : 1;
    if (ks > 1) g = scalePts(g, 1 / ks);
    g = curlStrand3D(g, curl, (typeof cur.wave === 'number' ? cur.wave : 50) / 100, typeof cur.curlDir === 'number' ? cur.curlDir : 0);
    if (ks > 1) g = scalePts(g, ks);
    if (keep) { if (curl > C0) g = gravityDroop3D(g, curl - C0); } else if (curl > 0) g = gravityDroop3D(g, curl);
    if (!spine) { g = partStrand3D(g, part, curl, partAmt); g = sweepStrand3D(g, sweep, curl, part, partAmt); }
    g = volumeStrand3D(g, vol, s.sec);
    g = flowCurlStrand3D(g, sty.flow || 0);
    g = sleekStrand3D(g, typeof sty.sleek === 'number' ? sty.sleek : 0);
    return g;
  }
  function scalePts(pts, k) { var o = new Array(pts.length), i, p; for (i = 0; i < pts.length; i++) { p = pts[i]; o[i] = { x: p.x * k, y: p.y * k, z: p.z * k }; } return o; }
  function padArc(pts, ratio) {
    var n = pts.length; if (n < 2 || !(ratio > 1)) return pts;
    var L = 0, i; for (i = 1; i < n; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
    var a = pts[n - 2], t = pts[n - 1], dx = t.x - a.x, dy = t.y - a.y, dz = t.z - a.z, dl = Math.hypot(dx, dy, dz);
    if (!(L > 1e-9) || !(dl > 1e-9)) return pts;
    var add = L * (ratio - 1) / dl, out = pts.slice();
    out.push({ x: t.x + dx * add, y: t.y + dy * add, z: t.z + dz * add });
    return out;
  }

  var fjSeq = 0;
  function neckGuard() { return (FS.guardNeck && G && typeof G.neckPush === 'function') ? G.neckPush : null; }
  function frac(v) { return v - Math.floor(v); }
  /* 뿌리를 제 두피 칸 안에서 옮김(17번 격자: x = a·sinφ·sinθ, y = CY + b·cosφ, z = c·sinφ·cosθ) */
  function jitterRoot(root, env, u1, u2) {
    var NT = 64, NP = 32;
    try { var ro = state._hair3Dneutral && state._hair3Dneutral.roots; if (ro && ro.NT > 0 && ro.NP > 0) { NT = ro.NT; NP = ro.NP; } } catch (e) {}
    var E = env.E, nx = root.x / E.a, ny = (root.y - env.CY) / E.b, nz = root.z / E.c, r = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (!(r > 1e-6)) return root;
    var phi = Math.acos(Math.max(-1, Math.min(1, ny / r))) + (u1 - 0.5) * Math.PI / NP, th = Math.atan2(nx, nz) + (u2 - 0.5) * 2 * Math.PI / NT;
    if (phi < 0.01) phi = 0.01;
    return { x: E.a * r * Math.sin(phi) * Math.sin(th), y: env.CY + E.b * r * Math.cos(phi), z: E.c * r * Math.sin(phi) * Math.cos(th) };
  }
  var prevAdj = W.adjustStrandGeom;
  if (typeof prevAdj === 'function') W.adjustStrandGeom = function (s, lenOverride, styOverride) {
    if (s && s.mannequin && s.pts && s.pts.length >= 2) {
      var sp = activeSpec();
      if (sp) {
        try {
          var rt = decode(sp.flow), model = state.hair3Dneutral, env = rt ? envFor(model) : null;
          if (rt && env) {
            var mem = s._fsk;
            if (!mem || mem.t !== rt || mem.e !== env) {
              var root = s.pts[0], hh;
              if (s.fringe) {                                              // 마네킹이 앞머리로 내려 심은 가닥 — 한 칸의 가닥이 전부 같은 뿌리라 칸 안에 흩음
                if (s._fj === undefined) { fjSeq++; s._fj = [frac(fjSeq * 0.6180339887), frac(fjSeq * 0.7548776662), frac(fjSeq * 0.5698402910)]; }
                root = jitterRoot(root, env, s._fj[0], s._fj[1]); hh = s._fj[2];
              } else hh = hash01(root);
              var sk = shape(root, hh, rt, env.E, env.CY, 0, FS, neckGuard());
              mem = s._fsk = { t: rt, e: env, pts: sk };
              if (sk) ST.shaped++; else ST.fallback++;
            }
            if (mem.pts) return adjustFlow(s, mem.pts, sp.flowBase || {}, lenOverride, styOverride);
          }
        } catch (e) { if (!ST.err) console.warn(TAG + ' 가닥 만들기 실패 — 마네킹 뼈대로', e); ST.err = String(e && e.message || e); }
      }
    }
    return prevAdj.apply(this, arguments);
  };
  else console.warn(TAG + ' adjustStrandGeom을 못 찾아 표를 못 겁니다');

  /* 걸 때: 이 스타일의 표로 · 섹션 길이 자동 맞추기는 건너뜀(스펙의 tipAt/lenCm을 잠깐 가리고, 길이 슬라이더는 flowLen으로) */
  var innerApply = W.applyStyleSpec;
  if (typeof innerApply === 'function') W.applyStyleSpec = function (id) {
    var save = pendingId, sp = null, hid = null;
    pendingId = id; refreshActive(); ST.shaped = 0; ST.fallback = 0; ST.err = null;
    try { sp = activeSpec(); } catch (e) { sp = null; }
    if (sp) { hid = { tipAt: sp.tipAt, lenCm: sp.lenCm, lenFallback: sp.lenFallback }; sp.tipAt = undefined; sp.lenCm = undefined; if (sp.flowLen) sp.lenFallback = sp.flowLen; }
    try { return innerApply.apply(this, arguments); }
    finally {
      if (hid) { sp.tipAt = hid.tipAt; sp.lenCm = hid.lenCm; sp.lenFallback = hid.lenFallback; if (sp.tipAt === undefined) delete sp.tipAt; if (sp.lenCm === undefined) delete sp.lenCm; if (sp.lenFallback === undefined) delete sp.lenFallback; }
      pendingId = save; refreshActive();
      try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {}
      if (hid) needLine = true;
    }
  };
  // 걸고 난 뒤 가닥을 처음 다 만든 자리에서 한 줄 찍음
  var needLine = false, innerCA = W.computeAdjustedHair3DStrands;
  if (typeof innerCA === 'function') W.computeAdjustedHair3DStrands = function () {
    var out = innerCA.apply(this, arguments);
    if (needLine && !pendingId && (ST.shaped + ST.fallback) > 0) { needLine = false; try { console.log(FS.applyLine()); } catch (e) {} }
    return out;
  };
  var innerClear = W.clearStyleSpec;
  if (typeof innerClear === 'function') W.clearStyleSpec = function () {
    try { return innerClear.apply(this, arguments); }
    finally { refreshActive(); try { if (typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump(); } catch (e) {} }
  };
  // 미리 만든 헤어의 서명 — 표가 걸렸는지/켜졌는지가 바뀌면 다시
  var origFS = W.adjFilterSig;
  if (typeof origFS === 'function') W.adjFilterSig = function () { var f = null; try { f = FS.active(); } catch (e) {} return origFS.apply(this, arguments) + '|fl' + (f ? f.n + ':' + f.d.length : 0); };

  /* [현재 모델을 스타일로 등록] — 지금 걸린 표를 새 스펙에 그대로 · 지금 섹션 길이 슬라이더 값을 flowLen에 */
  var innerBuildSpec = W.buildSpecFromCurrent;
  if (typeof innerBuildSpec === 'function') W.buildSpecFromCurrent = function () {
    var spec = innerBuildSpec.apply(this, arguments);
    try {
      var sp = activeSpec();
      if (spec && sp && FS.save) {
        spec.flow = sp.flow; spec.flowBase = JSON.parse(JSON.stringify(sp.flowBase || {})); spec.flowLen = {};
        secOrder().forEach(function (sec) { var c = state.sections && state.sections[sec]; if (c && typeof c.length === 'number') spec.flowLen[sec] = c.length; });
        console.log(TAG + ' 스타일 등록 — 지금 걸린 표를 같이 실었습니다(' + Math.round(sp.flow.d.length / 1024) + 'KB · 섹션 길이 슬라이더 ' + secOrder().map(function (k) { return k + ' ' + spec.flowLen[k]; }).join(' · ') + ')');
      }
    } catch (e) { console.warn(TAG + ' 등록에 표 싣기 실패', e); }
    return spec;
  };
  /* 저장소가 차서 표가 든 스타일이 안 들어갔으면 알림 */
  var innerSave = W.saveCustomStylesToStorage;
  if (typeof innerSave === 'function') W.saveCustomStylesToStorage = function () {
    var r = innerSave.apply(this, arguments);
    try {
      var want = STYLES.filter(function (s) { return s.isCustom; }), raw = localStorage.getItem('gyeol_customStyles') || '', last = want[want.length - 1];
      var kb = Math.round(raw.length / 1024), nFlow = want.filter(function (s) { return s.spec && s.spec.flow; }).length;
      if (last && raw.indexOf('"' + last.id + '"') < 0) {
        ST.saveWarn = '저장소가 차서 "' + last.name + '"이(가) 저장되지 않았습니다(지금 ' + kb + 'KB) — 안 쓰는 스타일을 지워 주세요';
        console.warn(TAG + ' ' + ST.saveWarn);
        try { if (typeof showToast === 'function') showToast(ST.saveWarn); } catch (e) {}
      } else { ST.saveWarn = null; if (nFlow) console.log(TAG + ' 저장소 — 등록 스타일 ' + want.length + '개(표가 든 것 ' + nFlow + '개) · ' + kb + 'KB'); }
    } catch (e) {}
    return r;
  };

  FS.applyLine = function () {
    var f = null; try { f = FS.active(); } catch (e) {}
    if (!f) return TAG + ' 지금 걸린 스타일에는 표가 없습니다(숫자만으로 걸림)';
    return TAG + ' 걸림 — 표 ' + f.n + '무리 · ' + Math.round(f.d.length / 1024) + 'KB · 표대로 만든 마네킹 가닥 ' + ST.shaped + '개' + (ST.fallback ? ' · 표가 없는 자리라 마네킹 뼈대 그대로 ' + ST.fallback + '개' : '') +
      ' · 섹션 길이 자동 맞추기 건너뜀 · 앞머리 내려 심기 안 탐' + (ST.err ? ' · ⚠ ' + ST.err : '') + ' — 끄기 FLOW_SPEC.on=false 후 스타일 다시 걸기';
  };
  FS.lines = function () {
    var b = ST.built, L = [];
    if (!b) L.push(TAG + ' ' + (FS.save ? '대기 — 원본 머리를 다시 기르면 표를 뽑습니다' : '싣기 꺼짐(FLOW_SPEC.save=false)'));
    else {
      var cm = b.cm, s = b.stats, f = b.fid;
      L.push(TAG + ' 다시 기른 가닥 ' + s.strands + '개에서 뽑음(' + b.at + ' · ' + Math.round(b.ms) + 'ms) — 두피 칸 ' + s.cells + '개(가닥이 ' + FS.minCell + '개 미만이라 뺀 칸 ' + s.skipped + ') · 그중 두 무리로 가른 칸(가르마 등) ' + s.split + ' · 두 무리가 섞여 있어 큰 무리만 쓴 칸 ' + (s.mixed || 0) + ' · 혼자 다른 쪽으로 가서 이웃을 따르게 한 칸 ' + (s.lone || 0) +
        ' · 표에 넣은 가닥(칸의 결과 같은 쪽으로 가는 몸통만) ' + s.used + '개(' + Math.round(s.used / Math.max(1, s.strands) * 100) + '% — 나머지는 잔머리·엇나간 가닥이라 뺌) · 혼자 길어서 누른 칸 ' + (s.tailCells || 0) +
        ' · 길이 칸 ' + b.nb + ' · 스펙에 싣는 크기 ' + Math.round(b.bytes / 1024) + 'KB');
      if (f && f.n) L.push('    표로 다시 만든 가닥 ↔ 원래 가닥(' + f.n + '개 표본 · 길이는 원래 길이로): 가닥 전체 평균 거리 ' + (f.meanMed * cm).toFixed(1) + 'cm(중앙값) · ' + (f.meanP90 * cm).toFixed(1) + 'cm(90%) | 끝 거리 ' +
        (f.tipMed * cm).toFixed(1) + ' · ' + (f.tipP90 * cm).toFixed(1) + 'cm' + (f.miss ? ' · 표가 없어 못 만든 가닥 ' + f.miss : '') +
        ' — 90% 쪽이 큰 것은 잔머리(표는 칸의 결만 담음)라 정상이고, 중앙값이 크면 표가 머리 모양을 못 담은 것입니다');
    }
    try { if (FS.active()) L.push(FS.applyLine()); } catch (e) {}
    if (ST.saveWarn) L.push(TAG + ' ⚠ ' + ST.saveWarn);
    return L;
  };
  var ppl = W.perfPanelLines;
  if (typeof ppl === 'function') W.perfPanelLines = function () {
    var L = ppl.apply(this, arguments) || [];
    try { L = L.concat(FS.lines()); } catch (e) {}
    return L;
  };
  console.log(TAG + ' 설치 — 원본 머리의 스펙에 결 표·길이 지도를 싣고, 표가 든 스타일은 마네킹 가닥을 표대로 만듭니다(다른 손님 두상에도). 끄기 FLOW_SPEC.on=false · 싣지 않기 FLOW_SPEC.save=false');
})();
