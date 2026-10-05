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
 *   ※ (2026-10-05e) 실제로는 몸통 머리까지 손가락 방향으로 돌아 머리가 쓸려 나갔습니다 → 지금은 "그 자리 머리의 결"에 맞춥니다(아래 e 참고).
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
 * (2026-10-05b) 폰에서 써 본 뒤 — 사용자: "정확히 어떻게 써야 할지 잘 안 잡힌다. 뿌리 기준으로 건드려야 하나? 빗질은 뜬 부분·헝클어진
 *   부분을 보고 거기를 정렬하는 것. 적용되는 구간을 정확히 알 수 있게 작은 빗 모양 하나 올려놔도 좋겠다."
 *   실측(진단): 획 68 · 표본 904 · 바뀐 가닥 5895/10000 · 다시 그리기 426ms. 화면에서는 손가락에 가려 어디가 바뀌는지 안 보였고,
 *   100% 근처에서는 붓(3cm 상한)이 화면에서 반지름 12px쯤이라 손가락보다 작았습니다. 빗은 자리에 잔물결(지그재그)도 생겼습니다.
 *   ① 빗 표시 — 붓이 닿는 자리에 점선 원(= 실제로 바뀌는 범위)과 작은 빗 그림을 띄웁니다. 빗살이 가리키는 쪽 = 머리가 눕는 방향.
 *      터치에서는 손가락에 가리지 않게 빗을 손가락 위쪽 touchOffset px에 둡니다(바뀌는 자리도 거기 — 손가락이 아니라 빗이 닿는 곳).
 *      빗질을 켜면 화면 가운데에 빗이 먼저 보이고, 마우스는 올려놓기만 해도 따라다닙니다.
 *   ② 잔물결 없애기 — 방향을 손가락의 직전 몇 px이 아니라 지나온 길 dirLagPx 뒤의 점에서 지금 점으로 잡고(손떨림 제거),
 *      가닥에 적용한 뒤 이웃 마디끼리 방향을 한 번 고르게 합니다.
 *   ③ 쓰다듬는 동안 다시 그리는 간격을 120 → 250ms(폰에서 한 번 그리는 데 0.4초라 계속 밀렸음). 손을 떼면 바로 한 번 더 그립니다.
 *   쓰는 법: 뿌리와는 상관없습니다. 뜬 머리·헝클어진 자리에 빗(원)을 올리고, 눕히고 싶은 방향으로 쓸어 주면 원 안의 겉머리만 그 방향으로 눕습니다.
 *
 * (2026-10-05c) 화면에 보이는 대로 빗기 — 사용자: "눈에 보이는 가닥을 정리하려고 빗을 움직이는데 3D로는 그 위치가 아닌 것 같다.
 *   뒤에만 빗질했는데 앞으로 돌려 보니 앞이 엉망이 됐다. 목 주변 가닥은 어떻게 정리할지 모르겠다. 2D로 보고 빗질한다는 걸 적용해야."
 *   예전: 붓 = "손가락 아래에서 카메라에 가장 가까운 가닥 점 하나"를 중심으로 한 3cm 공. 그런데
 *        · 윤곽 가장자리나 목 옆 틈에서는 가까운 쪽 머리가 없어서 반대편(앞머리) 점이 잡혔고 → 뒤에서 빗었는데 앞이 바뀜
 *        · 공은 그 한 점 주변만 덮어서, 원 안에 보이는데 깊이가 다른 가닥(튀어나온 잔머리)은 안 바뀜
 *   지금: 붓 = 화면의 원 그 자체. 원 안에 "보이는" 가닥 점(카메라 쪽 절반 — 두상 가운데보다 depthMargin 넘게 뒤에 있는 점은 제외)을
 *        전부 찾아, 그 점들이 있는 3D 자리마다 작게(dab) 방향을 칠합니다. 깊이가 서로 달라도 원 안에 보이면 다 빗깁니다.
 *        두상 반대편은 원 안에 겹쳐 보여도 건드리지 않습니다.
 *        칠하는 자리 = 그 점이 "빗기 전에 있던 자리". 가닥에 적용할 때 빗기 전 자리에서 방향 장을 읽기 때문입니다 —
 *        지금 보이는 자리에 칠하면, 이미 한 번 빗어서 옮겨진 가닥은 다음 빗질이 닿지 않았습니다(합성 테스트에서 확인).
 *        그래서 적용 결과에 빗기 전 점 배열(_pre)을 달아 두고, 50번(어깨)도 그 표시를 넘겨줍니다.
 *
 * (2026-10-05e) 빗으면 머리가 빠지던 것 — 사용자(영상): "comb 기능을 적용하면서 수정하고 있는데 머리가 빠진다."
 *   영상: 옆에서 보고 귀 높이에서 머리 끝까지 두 번 쓸어내리니 목 앞 옆머리가 사라지고 목이 드러남 · 아래에 꺾인 가닥이 삐져나옴.
 *   원인 ① 원 안의 "모든" 가닥 마디를 손가락 방향과 똑같이 돌렸습니다(여러 번 겹치면 세기 1). 손가락은 결과 정확히 나란할 수 없어서
 *          (영상에서는 20°쯤 뒤로 기움) 이미 가지런한 몸통 머리까지 그 각도로 돌고, 붓을 지난 아래쪽은 통째로 따라 옮겨져 옆머리 전체가 뒤로 쓸려 갔습니다.
 *          재현(이 파일 그대로 · 합성 머리 3,368가닥 · 같은 동작): 끝이 1cm 넘게 옮겨진 몸통 가닥 892(중앙 3.6cm · 최대 7.1cm) · 목 앞 옆머리 31%만 남음.
 *          정수리를 지나 쓸면 더 심했습니다(984~1,822가닥 · 최대 40cm) — 가르마·가마 양쪽 머리가 한쪽으로 넘어감.
 *        ② 손가락 방향은 화면 평면 안의 방향이라 둥근 두상에서는 두피 속을 향합니다. 정면·뒤에서 쓸면 가닥이 두상 속에 묻혔습니다(609~953가닥).
 *   지금: "결 따라 빗기"(grain) — 가닥을 손가락 방향이 아니라 그 자리 머리의 결에 맞춥니다.
 *     · 결 격자: 붓을 댈 때, 빗기 전 가닥들의 "큰 방향"(앞뒤 flowSmooth를 이은 현)을 flowCell 칸마다 더해 둡니다(42번 결 정렬과 같은 생각).
 *       빗기 전 자리로 만들므로 빗질을 해도 안 바뀌고, 머리 모양(길이·컬)이 바뀌면 다시 읽습니다.
 *     · 가닥에 적용할 때 마디마다 목표를 따로 정합니다:
 *         제 무리(이 가닥과 flowOwn° 안쪽으로 같이 흐르는 이웃이 충분함)가 있으면 그 결 → 몸통 머리는 사실상 제자리. 가르마 양쪽·겹친 층도 각자 제 쪽 결.
 *         제 무리가 없으면(= 잔머리) 손가락 쪽으로 흐르는 이웃의 결 → 이웃 전체의 결 → 주변에 머리가 없으면 두상 쪽으로 flowReach칸 들어가며 찾음 → 그래도 없으면 손가락 방향.
 *         결이 갈려 어느 쪽인지 정할 수 없는 자리의 잔머리는 그대로 둡니다.
 *     · 마디 하나가 아니라 가닥의 큰 방향이 목표에서 벗어난 만큼만 돌립니다(tolFrom° 안쪽은 안 건드림 · tolFull° 이상은 세기만큼).
 *       회전을 마디에 그대로 적용하므로 잔 컬·웨이브는 모양 그대로 남습니다(예전: 빗은 자리는 직모가 됨).
 *     · 두상·목: 다시 이을 때 두상 속으로 가는 마디는 면을 타고 눕히고, 목 기둥(42번 neckPush) 속 점은 밖으로. 빗기 전부터 안쪽이던 점(뿌리)은 그대로.
 *     · 그래서 손가락 방향은 "어느 쪽 결인가"를 고를 때와 주변에 머리가 없는 잔머리에만 쓰입니다. 결을 가로질러 쓸어도 머리가 넘어가지 않습니다(넘기기는 스타일 쪽에서).
 *   같은 합성 테스트: 영상 동작 → 옮겨진 몸통 가닥 0 · 목 앞 옆머리 100% · 정수리 → 0 · 두상 속 가닥 0 · 마디 길이 오차 0%.
 *     윤곽 밖으로 삐죽 나온 잔머리(정면에서 가장자리를 쓸어내림): 결에서 벗어난 각 중앙 89° → 6~10°.
 *   끄기: COMB3D.grain=false(손가락 방향 그대로) · COMB3D.collide=false 후 COMB3D.refresh()
 *
 * (2026-10-05f) 다듬을수록 더 흐트러지던 것 — 사용자(영상·진단): "comb 테스트 중인데 머리를 다듬을수록 더 흐트러진다."
 *   진단: 획 11 · 표본 217 · 바뀐 가닥 6102/9999(제 무리의 결로 본 마디 37,866). 영상: 가장자리를 쓸 때마다 가닥이 몸통과 나란히 윤곽 밖에 떠서 남고, 더 빗으면 더 늘어남.
 *   원인 ① 몸통 머리까지 돌렸습니다. 실제 머리는 다발이 비스듬히 엇갈려(굽이) 결에서 tolFrom° 넘게 벗어난 마디가 많은데, 그 마디만 골라 돌리면
 *          나갔다 돌아오던 균형이 깨져 그 아래 꼬리가 통째로 옆으로 밀립니다. 밀린 가닥은 결과는 나란해서 다시 빗어도 안 들어갑니다.
 *          재현(합성 머리 29,000가닥 · 굽이 있음 · 영상과 같은 동작 33획): 0.2cm 넘게 옮겨진 가닥 6,976 · 윤곽 밖에 그려진 가닥 길이 1,323 → 1,655cm
 *          (굽이를 1.8배로 하면 1,443 → 14,241cm). 굽이가 없는 매끈한 머리(예전 합성 테스트)에서는 안 나타났습니다.
 *        ② 50번(어깨)이 몸통에 닿은 가닥에 "빗기 전 자리"(_pre)를 안 달아서, 안 빗은 가닥은 어깨에 얹힌 뒤 자리로, 빗은 가닥은 얹히기 전 자리로 결·붓 자리를 읽었습니다.
 *   지금: · flyOnly — 몸통 머리 속 마디는 안 돌립니다. 몸통 밖으로 뜬 구간(주변 3×3×3칸 가닥 수가 적은 자리)만 결 쪽으로 돌립니다.
 *         · anchor — 빗기 전 자리가 몸통 속이던 점은 밀려도 anchorLen 안에 제자리로 돌아옵니다(잔머리 꼬리는 안 붙듦 → 그대로 눕음).
 *         · pullIn — 붓이 닿은 마디가 몸통 밖에 떠 있으면 몸통 쪽으로 조금 기울입니다(결과 나란한 채 떠 있는 가닥도 붙음).
 *         · 50번: 몸통에 닿은 가닥에 언제나 _pre(어깨 전 자리)를 답니다.
 *   같은 테스트: 옮겨진 가닥 664 · 윤곽 밖 길이 1,323 → 856cm(굽이 1.8배: 1,443 → 1,024cm) · 획을 더할수록 줄어듦.
 *   대신: 몸통 겉면에 붙어서 엇갈린 다발은 이제 빗어도 안 펴집니다(예전 동작: COMB3D.flyOnly=false). 붙들기 끄기: COMB3D.anchor=false 후 COMB3D.refresh()
 *
 * 아직 안 되는 것 / 알아둘 것:
 *   · 등록 스타일에는 들어가지 않습니다(이 손님 화면에서만).
 *   · 쓰다듬는 동안 머리는 liveMs마다 다시 그립니다(가닥이 많으면 반 박자 늦게 따라옴).
 *   · 화면 쪽으로 곧장 튀어나온 잔머리는 화면에서 점으로 보여 붓에 조금만 걸립니다 — 옆에서 보이게 돌려 놓고 빗는 편이 잘 됩니다.
 *   · 빗질로 머리를 다른 방향으로 넘길 수는 없습니다(결 정렬만). 결이 갈리는 자리(가르마 바로 위)의 잔머리는 안 눕는 경우가 있습니다.
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
    maxSamples: 1500,
    dab: 0.045,         // 보이는 점마다 칠하는 작은 공의 반지름(모델 단위 ≈ 0.8cm)
    dabCell: 0.03,      // 보이는 점을 이 크기의 3D 칸마다 하나로 줄임(≈ 0.5cm)
    dabMax: 1500,       // 표본 하나가 칠하는 자리 수 상한(넘으면 건너뛰며 고름)
    depthMargin: 0.2,   // 두상 가운데보다 이만큼(≈ 3.5cm) 넘게 뒤에 있는 점은 안 빗음(반대편 머리)
    liveMs: 250,        // 쓰다듬는 동안 다시 그리는 간격
    dirLagPx: 22,       // 방향 = 지나온 길에서 이만큼 뒤의 점 → 지금 점(손떨림 제거)
    touchOffset: 52,    // 터치: 빗을 손가락 위쪽 이 px에 둠(손가락에 안 가리게) · 0 = 손가락 바로 아래
    indicator: true,    // 빗 표시(점선 원 + 빗 그림)
    // (2026-10-05e) 결 따라 빗기 — 가닥을 손가락 방향이 아니라 "그 자리 머리의 결"에 맞춤. 손가락 방향은 결이 갈리는 자리에서 어느 쪽 결인지 고를 때와, 주변에 머리가 없는 잔머리에만 씀
    grain: true,
    flowCell: 0.07,     // 결을 읽는 칸(모델 단위 ≈ 1.3cm · 42번 결 정렬과 같은 크기) — 그 칸과 이웃 칸(3×3×3)을 지나는 가닥들의 큰 방향
    flowSmooth: 0.2,    // 가닥의 "큰 방향"을 재는 길이(앞뒤로 ≈ 3.7cm씩) — 이보다 잔 컬·웨이브는 방향으로 안 침(그래서 빗어도 안 펴짐)
    flowMin: 24,        // 이웃 칸들에 가닥이 적어도 이만큼은 지나가야 "머리가 있다"고 봄(가닥 8000개 기준 · 적으면 비례해서 낮춤)
    flowNear: 2,        // 그리고 몸통 머리의 보통 칸(가닥이 가장 많이 사는 밀도) 가닥 수의 이 배수는 돼야 함 — 겉으로 뜬 잔머리들끼리의 방향이 결이 되지 않게
    flowDense: 0.2,     // 보통 칸의 이 비율 넘게 빽빽한 칸 = 몸통 머리(그 칸의 결과 나란한 마디는 바로 통과)
    flowShare: 1,       // 이웃 머리 가운데 이 가닥과 같은 쪽으로 흐르는 무리가 (flowNear 기준의) 이 비율은 돼야 "제 무리"로 침
    flowOwn: 55,        // 도: 이 가닥의 큰 방향에서 이 안쪽으로 흐르는 이웃 = 제 무리(가르마 양쪽·겹친 층은 각자 제 무리를 따름 → 안 움직임)
    flowFinger: 60,     // 도: 제 무리가 없는 가닥(잔머리)은, 손가락 방향에서 이 안쪽으로 흐르는 이웃 머리의 결을 따름
    flowCoh: 0.6,       // 그것도 없으면 이웃 전체의 결 — 결집도(평균 벡터 길이)가 이보다 낮으면(결이 갈리는 자리) 안 건드림
    flowReach: 3,       // 주변에 머리가 없으면(겉면 밖으로 멀리 뜬 꼬리) 두상 쪽으로 이 칸 수까지 들어가며 결을 찾음 · 그래도 없으면 손가락 방향
    tolFrom: 12, tolFull: 28,  // 도: 가닥의 큰 방향이 목표에서 이 안쪽으로만 벗어나 있으면 안 건드림 · 이 이상이면 세기만큼 돌림(사이는 서서히)
    collide: true,      // 빗은 가닥이 두상·목 안으로 못 들어가게
    // (2026-10-05f) 몸통 머리는 제자리에 — 빗은 뒤 아래쪽이 통째로 밀려 윤곽 밖으로 나가던 것을 막음(머리말 f 참고)
    anchor: true,
    flyOnly: true,      // 몸통 밖으로 뜬 구간(잔머리)만 돌림 — 몸통 속 마디는 결에서 벗어나 있어도 그대로(끄면 몸통의 엇갈린 다발도 펴지만 아래쪽이 밀림)
    anchorLen: 0.13,    // 밀린 가닥이 제자리로 돌아오는 길이(모델 단위 ≈ 2.5cm) — 짧을수록 단단히 붙듦
    bodyFull: 8,        // 주변(3×3×3칸) 가닥 수가 보통 칸의 이 배수면 "몸통 머리 속"(flowNear배 이하는 몸통 밖 = 잔머리 · 사이는 서서히)
    pullIn: 0.3,        // 몸통 밖에 뜬 채로 빗긴 마디를 몸통 쪽으로 기울이는 정도(≈ 17°) · 0 = 끔
    headLift: 1.02,     // 두피 타원체의 이 배수 껍질 밖에 둠(42번 다시 기르기와 같은 값)
    pickStrands: 8000   // 붓 자리 찾기에 쓰는 가닥 수 상한(넘으면 건너뛰며 씀)
  }, W.COMB3D || {});
  C.samples = [];       // {dabs: Float32Array[x,y,z,w …], m, dx,dy,dz, k, g}
  var S = C.stats = { strokes: 0, touched: 0, _t: 0, ms: 0, pickMs: 0, pickPts: 0, dabs: 0, seen: 0, tOwn: 0, tSide: 0, tAll: 0, tReach: 0, tFinger: 0, tSkip: 0, _to: 0, _ts: 0, _ta: 0, _tr: 0, _tf: 0, _tk: 0, pushed: 0, neck: 0, _pu: 0, _nk: 0, anch: 0, pin: 0, _an: 0, _pi: 0, flowRef: 0, flowCells: 0, flowMs: 0, err: null };
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
  function splatPoint(f, x, y, z, r, k, dx, dy, dz) {
    var cell = C.cell, r2 = r * r, x0 = Math.floor((x - r) / cell), x1 = Math.floor((x + r) / cell), y0 = Math.floor((y - r) / cell), y1 = Math.floor((y + r) / cell),
      z0 = Math.floor((z - r) / cell), z1 = Math.floor((z + r) / cell), a, b, c, key, i, d2, w, V;
    if (x0 < -OFF || y0 < -OFF || z0 < -OFF || x1 >= OFF || y1 >= OFF || z1 >= OFF) return;
    for (c = z0; c <= z1; c++) { var ez = (c + 0.5) * cell - z;
      for (b = y0; b <= y1; b++) { var ey = (b + 0.5) * cell - y;
        for (a = x0; a <= x1; a++) { var ex = (a + 0.5) * cell - x;
          d2 = ex * ex + ey * ey + ez * ez; if (d2 >= r2) continue;
          w = k * Math.min(1, 1.6 * (1 - Math.sqrt(d2) / r)); if (w < 0.004) continue;      // 가운데는 고르게, 가장자리만 약하게
          key = (a + OFF) + SPAN * ((b + OFF) + SPAN * (c + OFF));
          i = f.map.get(key);
          if (i === undefined) {
            i = f.n++; f.map.set(key, i);
            if (i * 3 + 3 > f.V.length) { var nv = new Float32Array(f.V.length * 2); nv.set(f.V); f.V = nv; }
          }
          V = f.V; i *= 3;
          V[i] = V[i] * (1 - w) + dx * w; V[i + 1] = V[i + 1] * (1 - w) + dy * w; V[i + 2] = V[i + 2] * (1 - w) + dz * w;
        }
      }
    }
    if (x - r < f.mn[0]) f.mn[0] = x - r; if (y - r < f.mn[1]) f.mn[1] = y - r; if (z - r < f.mn[2]) f.mn[2] = z - r;
    if (x + r > f.mx[0]) f.mx[0] = x + r; if (y + r > f.mx[1]) f.mx[1] = y + r; if (z + r > f.mx[2]) f.mx[2] = z + r;
  }
  function splat(f, s) {
    var D = s.dabs, m = s.m, j, r = C.dab;
    for (j = 0; j < m; j++) splatPoint(f, D[j * 4], D[j * 4 + 1], D[j * 4 + 2], r, s.k * D[j * 4 + 3], s.dx, s.dy, s.dz);
  }
  function syncField() {
    var n = C.samples.length;
    if (!F || fEpoch !== epoch || fDone > n) { F = newField(); fDone = 0; fEpoch = epoch; }
    for (; fDone < n; fDone++) splat(F, C.samples[fDone]);
    return n ? F : null;
  }
  /* 두상(두피 타원체 · 가운데 높이) — 가닥마다 다시 재지 않게 잠깐 기억(47번과 같은 방식) */
  var headMemo = null, headAt = -1e9, headKey = null;
  function headShape() {
    var key = null, t = now();
    try { key = state._hair3Dneutral || state.hair3Dneutral || null; } catch (e) {}
    if (headMemo !== null && key === headKey && t - headAt < 400) return headMemo || null;
    var E = null, cy = 0;
    try { E = (typeof getScalpEllipsoid === 'function') ? getScalpEllipsoid() : getHeadEllipsoid(); } catch (e) { E = null; }
    try { var m = state.hair3Dneutral; if (m && isFinite(m.CY)) cy = m.CY; else if (typeof SCALP_CENTER_Y !== 'undefined') cy = SCALP_CENTER_Y; } catch (e) {}
    headMemo = (E && E.a > 0 && E.b > 0 && E.c > 0 && isFinite(cy)) ? { a2: E.a * E.a, b2: E.b * E.b, c2: E.c * E.c, cy: cy } : false;
    headAt = t; headKey = key;
    return headMemo || null;
  }
  var buf = new Float64Array(4 * 256), rbuf = new Float64Array(3 * 256), wbuf = new Float64Array(256);
  var DEG = Math.PI / 180;
  /* 그 자리에서 이 가닥이 따를 결 → GT(길이 1). 제 칸과 이웃 칸(3×3×3)의 머리를 봄.
     돌려주는 값: 1 = 제 무리(이 가닥과 같은 쪽으로 흐르는 이웃) · 2 = 손가락 쪽으로 흐르는 이웃 · 3 = 이웃 전체 · 0 = 주변에 머리가 없음 · −1 = 결이 갈려 정할 수 없음
     (s = 이 가닥의 큰 방향 · f = 손가락 방향 · cOwn/cFin = 같은 쪽으로 치는 각의 cos) */
  /* (2026-10-05f) 그 자리가 몸통 머리 속인가: 0 = 밖(잔머리 자리) … 1 = 속 */
  function bodyAt(fw, x, y, z) {
    var a = Math.floor((x - fw.x0) * fw.inv), b = Math.floor((y - fw.y0) * fw.inv), c = Math.floor((z - fw.z0) * fw.inv);
    if (a < 0 || b < 0 || c < 0 || a >= fw.nx || b >= fw.ny || c >= fw.nz) return 0;
    var v = (fw.GA[a + fw.nx * (b + fw.ny * c)] - fw.bLo) / (fw.bHi - fw.bLo);
    return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
  }
  var GT = new Float64Array(3);
  function grainAt(fw, x, y, z, sx, sy, sz, fx, fy, fz, cOwn, cFin) {
    var ci = Math.floor((x - fw.x0) * fw.inv), cj = Math.floor((y - fw.y0) * fw.inv), ck = Math.floor((z - fw.z0) * fw.inv), a, b, c, o, gn, gm, gx, gy, gz, l;
    var ox = 0, oy = 0, oz = 0, on = 0, px = 0, py = 0, pz = 0, pn = 0, ax = 0, ay = 0, az = 0, an = 0, GN = fw.GN, GM = fw.GM, GX = fw.GX, GY = fw.GY, GZ = fw.GZ, nx = fw.nx, ny = fw.ny, nz = fw.nz;
    for (c = ck - 1; c <= ck + 1; c++) { if (c < 0 || c >= nz) continue;
      for (b = cj - 1; b <= cj + 1; b++) { if (b < 0 || b >= ny) continue;
        for (a = ci - 1; a <= ci + 1; a++) { if (a < 0 || a >= nx) continue;
          o = a + nx * (b + ny * c); gn = GN[o]; if (!gn) continue;
          an += gn; gm = GM[o]; if (!(gm > 1e-6)) continue;
          gx = GX[o]; gy = GY[o]; gz = GZ[o]; ax += gx; ay += gy; az += gz;
          if (gx * sx + gy * sy + gz * sz > cOwn * gm) { ox += gx; oy += gy; oz += gz; on += gn; }
          if (gx * fx + gy * fy + gz * fz > cFin * gm) { px += gx; py += gy; pz += gz; pn += gn; }
        }
      }
    }
    if (an < fw.near) return 0;
    var need = fw.near * C.flowShare;
    if (on >= need) { l = Math.sqrt(ox * ox + oy * oy + oz * oz); if (l > 1e-6) { GT[0] = ox / l; GT[1] = oy / l; GT[2] = oz / l; return 1; } }
    if (pn >= need) { l = Math.sqrt(px * px + py * py + pz * pz); if (l > 1e-6) { GT[0] = px / l; GT[1] = py / l; GT[2] = pz / l; return 2; } }
    l = Math.sqrt(ax * ax + ay * ay + az * az);
    if (l > 1e-6 && l / an >= C.flowCoh) { GT[0] = ax / l; GT[1] = ay / l; GT[2] = az / l; return 3; }
    return -1;
  }
  function applySamples(g) {
    if (!C.enabled || !C.samples.length || !g || g.length < 2) return g;
    var f = syncField(); if (!f || !f.n) return g;
    var n = g.length, i, p, mn = f.mn, mx = f.mx, any = false;
    for (i = 0; i < n; i++) { p = g[i]; if (p.x >= mn[0] && p.x <= mx[0] && p.y >= mn[1] && p.y <= mx[1] && p.z >= mn[2] && p.z <= mx[2]) { any = true; break; } }
    if (!any) return g;
    if (buf.length < n * 4) { buf = new Float64Array(n * 4 + 128); rbuf = new Float64Array(n * 3 + 96); wbuf = new Float64Array(n + 32); }
    var cell = C.cell, map = f.map, V = f.V, last = n - 1, changed = false, U = buf, R = rbuf;          // U: 마디 i(점 i−1 → i)의 [ux,uy,uz,길이] · R: 그 마디를 돌릴 회전(축×각)
    var px = g[0].x, py = g[0].y, pz = g[0].z, lo = n, hi = 0, L = 0, len, sx, sy, sz, sl;
    // ① 마디 방향·길이
    for (i = 1; i < n; i++) {
      p = g[i];
      sx = p.x - px; sy = p.y - py; sz = p.z - pz; len = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (len > 1e-9) { U[i * 4] = sx / len; U[i * 4 + 1] = sy / len; U[i * 4 + 2] = sz / len; } else { U[i * 4] = 0; U[i * 4 + 1] = -1; U[i * 4 + 2] = 0; }
      U[i * 4 + 3] = len; L += len;
      px = p.x; py = p.y; pz = p.z;
    }
    // ② 마디마다: 그 칸의 목표 방향 쪽으로 가닥의 "큰 방향"(앞뒤 hw 마디를 이은 현)을 돌리는 회전을 구함.
    //    마디 하나의 방향이 아니라 큰 방향을 보므로 — 이미 나란한 머리는 안 움직이고(tolFrom 안쪽), 잔 컬·웨이브는 모양 그대로 통째로 돕니다.
    var hw = L > 0 ? Math.round(C.flowSmooth / (L / last)) : 1; if (!(hw >= 1)) hw = 1; else if (hw > 16) hw = 16;
    var t0 = Math.max(0, C.tolFrom) * DEG, t1 = Math.max(t0 + 1e-3, C.tolFull * DEG);
    var A, B, q0, a, b, c, k, vx, vy, vz, vl, w, t, tx, ty, tz, dot, th, fr, ang, cx, cy, cz, cl, ax, ay, az;
    // 결 격자(붓을 댈 때 빗기 전 가닥들로 만들어 둔 것). 없으면(grain=false) 손가락 방향이 그대로 목표.
    var FW = (C.grain && flowMemo && flowMemo.flow) ? flowMemo.flow : null, HD0 = null, code, hh, mpx, mpy, mpz, o0, gnn, gmm, reach = Math.max(0, C.flowReach | 0);
    var WB = wbuf, AFW = (C.anchor && flowMemo && flowMemo.flow && flowMemo.flow.GA) ? flowMemo.flow : null;
    var cT0 = Math.cos(t0), cOwn = Math.cos(C.flowOwn * DEG), cFin = Math.cos(C.flowFinger * DEG), yCap = 0.45;
    if (FW) { HD0 = headShape(); yCap = (HD0 ? HD0.cy : 0.15) + 0.3; }
    for (i = 1; i < n; i++) {
      R[i * 3] = 0; R[i * 3 + 1] = 0; R[i * 3 + 2] = 0; WB[i] = 0;
      if (!(U[i * 4 + 3] > 1e-9)) continue;
      p = g[i]; q0 = g[i - 1];
      a = Math.floor((p.x + q0.x) * 0.5 / cell) + OFF; b = Math.floor((p.y + q0.y) * 0.5 / cell) + OFF; c = Math.floor((p.z + q0.z) * 0.5 / cell) + OFF;
      if (a < 0 || b < 0 || c < 0 || a >= SPAN || b >= SPAN || c >= SPAN) continue;
      k = map.get(a + SPAN * (b + SPAN * c));
      if (k === undefined) continue;
      k *= 3; vx = V[k]; vy = V[k + 1]; vz = V[k + 2]; vl = Math.sqrt(vx * vx + vy * vy + vz * vz); w = vl;
      if (!(w > 0.01)) continue;
      t = i / last; if (t < C.gripFrom) w *= t / C.gripFrom;
      if (w > 1) w = 1;
      if (AFW && C.flyOnly) { w *= 1 - bodyAt(AFW, (p.x + q0.x) * 0.5, (p.y + q0.y) * 0.5, (p.z + q0.z) * 0.5); if (!(w > 0.01)) continue; }   // 몸통 머리 속 마디는 안 돌림 — 몸통 밖으로 뜬 구간만
      WB[i] = w;
      if (AFW && C.pullIn > 0 && bodyAt(AFW, p.x, p.y, p.z) < 0.5) { changed = true; if (i < lo) lo = i; if (i > hi) hi = i; }   // 몸통 밖에 뜬 마디 — 결과 나란해도 몸통 쪽으로 붙임
      // 큰 방향 = 뒤쪽 현(i−1−hw → i) · 앞쪽 현(i−1 → i+hw) · 가운데 현 중 이 마디와 가장 나란한 것.
      //   가운데 현만 쓰면 잔머리가 꺾여 나가는 자리에서 꺾이기 전(몸통)과 후(삐죽 나온 꼬리)가 섞여, 몸통 쪽은 괜히 돌고 꼬리는 덜 돕니다.
      A = g[i - 1 - hw < 0 ? 0 : i - 1 - hw]; B = g[i + hw > last ? last : i + hw];
      ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2];
      sx = B.x - A.x; sy = B.y - A.y; sz = B.z - A.z; sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (sl > 1e-9) { sx /= sl; sy /= sl; sz /= sl; dot = sx * ax + sy * ay + sz * az; } else { sx = ax; sy = ay; sz = az; dot = 1; }
      tx = p.x - A.x; ty = p.y - A.y; tz = p.z - A.z; cl = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (cl > 1e-9) { th = (tx * ax + ty * ay + tz * az) / cl; if (th > dot) { dot = th; sx = tx / cl; sy = ty / cl; sz = tz / cl; } }
      tx = B.x - q0.x; ty = B.y - q0.y; tz = B.z - q0.z; cl = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (cl > 1e-9) { th = (tx * ax + ty * ay + tz * az) / cl; if (th > dot) { dot = th; sx = tx / cl; sy = ty / cl; sz = tz / cl; } }
      tx = vx / vl; ty = vy / vl; tz = vz / vl;                            // 손가락 방향
      if (FW) {
        // 목표 = 이 자리 머리의 결. 가닥마다 따로 정함: 제 무리가 있으면 그 결(가르마 양쪽·겹친 층은 각자 제 쪽 → 몸통 머리는 안 움직임),
        //   제 무리가 없는 가닥(잔머리)은 손가락 쪽으로 흐르는 이웃의 결 → 이웃 전체의 결 → (주변에 머리가 없으면) 두상 쪽으로 들어가며 찾고 → 손가락 방향.
        mpx = (p.x + q0.x) * 0.5; mpy = (p.y + q0.y) * 0.5; mpz = (p.z + q0.z) * 0.5;
        a = Math.floor((mpx - FW.x0) * FW.inv); b = Math.floor((mpy - FW.y0) * FW.inv); c = Math.floor((mpz - FW.z0) * FW.inv);
        if (a >= 0 && b >= 0 && c >= 0 && a < FW.nx && b < FW.ny && c < FW.nz) {      // 빠른 길: 빽빽하고 결이 뚜렷한 칸에서 그 결과 나란한 마디 = 몸통 머리 → 통과
          o0 = a + FW.nx * (b + FW.ny * c); gnn = FW.GN[o0]; gmm = FW.GM[o0];
          if (gnn >= FW.dense && gmm >= 0.85 * gnn && FW.GX[o0] * sx + FW.GY[o0] * sy + FW.GZ[o0] * sz >= cT0 * gmm) continue;
        }
        code = grainAt(FW, mpx, mpy, mpz, sx, sy, sz, tx, ty, tz, cOwn, cFin);
        if (code === 0) {
          for (hh = 1; hh <= reach; hh++) {
            cx = -mpx; cy = (mpy < yCap ? 0 : yCap - mpy); cz = -mpz; cl = Math.sqrt(cx * cx + cy * cy + cz * cz); if (!(cl > 1e-6)) break;
            mpx += cx / cl * FW.fc; mpy += cy / cl * FW.fc; mpz += cz / cl * FW.fc;
            code = grainAt(FW, mpx, mpy, mpz, sx, sy, sz, tx, ty, tz, cOwn, cFin);
            if (code !== 0) { if (code > 0) code = 4; break; }
          }
        }
        if (code < 0) { S._tk++; continue; }                               // 결이 갈리는 자리(가르마·가마)의 잔머리 — 어느 쪽인지 정할 수 없어 그대로 둠
        if (code === 0) S._tf++;                                           // 주변에 머리가 없음 → 손가락 방향
        else { tx = GT[0]; ty = GT[1]; tz = GT[2]; if (code === 1) S._to++; else if (code === 2) S._ts++; else if (code === 3) S._ta++; else S._tr++; }
      }
      dot = sx * tx + sy * ty + sz * tz; if (dot > 1) dot = 1; else if (dot < -1) dot = -1;
      th = Math.acos(dot);
      if (th <= t0) continue;                                              // 이미 그 방향 — 안 건드림
      fr = th >= t1 ? 1 : (th - t0) / (t1 - t0); if (fr < 1) fr = fr * fr * (3 - 2 * fr);
      ang = th * fr * w; if (ang < 0.003) continue;
      cx = sy * tz - sz * ty; cy = sz * tx - sx * tz; cz = sx * ty - sy * tx; cl = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (cl < 1e-4) {                                                     // 목표와 거의 정반대 — 아무 수직축으로
        if (Math.abs(sx) < 0.9) { cx = 0; cy = sz; cz = -sy; } else { cx = -sz; cy = 0; cz = sx; }
        cl = Math.sqrt(cx * cx + cy * cy + cz * cz); if (!(cl > 1e-9)) continue;
      }
      ang /= cl; R[i * 3] = cx * ang; R[i * 3 + 1] = cy * ang; R[i * 3 + 2] = cz * ang;
      changed = true; if (i < lo) lo = i; if (i > hi) hi = i;
    }
    if (!changed) return g;
    // ③ 회전을 이웃 마디끼리 한 번 고르게 — 칸마다 방향이 조금씩 달라 생기는 잔물결을 없앰(방향이 아니라 회전을 고르게 하므로 컬은 그대로)
    var s0 = Math.max(1, lo - 1), s1 = Math.min(last, hi + 1), o0x, o0y, o0z, c0x, c0y, c0z, j;
    j = (s0 > 1 ? s0 - 1 : s0) * 3; o0x = R[j]; o0y = R[j + 1]; o0z = R[j + 2];
    for (i = s0; i <= s1; i++) {
      j = i * 3; c0x = R[j]; c0y = R[j + 1]; c0z = R[j + 2];
      if (i < last) { R[j] = (o0x + 2 * c0x + R[j + 3]) * 0.25; R[j + 1] = (o0y + 2 * c0y + R[j + 4]) * 0.25; R[j + 2] = (o0z + 2 * c0z + R[j + 5]) * 0.25; }
      else { R[j] = (o0x + 3 * c0x) * 0.25; R[j + 1] = (o0y + 3 * c0y) * 0.25; R[j + 2] = (o0z + 3 * c0z) * 0.25; }
      o0x = c0x; o0y = c0y; o0z = c0z;
    }
    // ④ 다시 잇기 — 바뀐 첫 마디부터 끝까지(그 앞은 빗기 전과 같은 점). 마디 길이는 그대로.
    //    두상·목 안으로는 못 들어감: 빗기 전부터 겉면보다 안쪽이던 점(뿌리 등)은 그 깊이까지만 허용.
    var out = new Array(n), HD = C.collide ? headShape() : null, NK = null, lift = C.headLift > 0 ? C.headLift : 1.02;
    var a2 = 1, b2 = 1, c2 = 1, hcy = 0, kx, ky, kz, cs, sn, kd, ex, ey, ez, ee, fl, o, kk, pt, r, yy, nx, ny, nz, nl, dn;
    if (HD) { a2 = HD.a2; b2 = HD.b2; c2 = HD.c2; hcy = HD.cy; try { NK = (W.REGROW && typeof W.REGROW.neckPush === 'function') ? W.REGROW.neckPush : null; } catch (e3) { NK = null; } }
    for (i = 0; i < s0; i++) out[i] = g[i];
    var qx = g[s0 - 1].x, qy = g[s0 - 1].y, qz = g[s0 - 1].z;
    for (i = s0; i < n; i++) {
      ax = U[i * 4]; ay = U[i * 4 + 1]; az = U[i * 4 + 2]; len = U[i * 4 + 3];
      if (i <= s1) {
        kx = R[i * 3]; ky = R[i * 3 + 1]; kz = R[i * 3 + 2]; ang = Math.sqrt(kx * kx + ky * ky + kz * kz);
        if (ang > 1e-5) {                                                  // 축 k 둘레로 ang만큼 돌림(로드리게스)
          kx /= ang; ky /= ang; kz /= ang; cs = Math.cos(ang); sn = Math.sin(ang); kd = (kx * ax + ky * ay + kz * az) * (1 - cs);
          tx = ax * cs + (ky * az - kz * ay) * sn + kx * kd; ty = ay * cs + (kz * ax - kx * az) * sn + ky * kd; tz = az * cs + (kx * ay - ky * ax) * sn + kz * kd;
          ax = tx; ay = ty; az = tz;
        }
      }
      ex = qx + ax * len; ey = qy + ay * len; ez = qz + az * len;
      if (AFW && len > 1e-9) {
        // (2026-10-05f) ⓐ 붙들기 — 빗기 전 자리가 몸통 속이던 점은 제자리 쪽으로 되돌림.
        //    두상 바깥쪽(겉으로 뜨는) 성분은 언제나, 옆으로 밀린 성분은 새 자리가 몸통을 벗어날 때만. 잔머리(몸통 밖이던 점)는 붙들지 않음 → 그대로 눕음.
        o = g[i]; var e0x = ex - o.x, e0y = ey - o.y, e0z = ez - o.z, e02 = e0x * e0x + e0y * e0y + e0z * e0z, bo = 0, bn = 1;
        if (e02 > 1e-10) {
          bo = bodyAt(AFW, o.x, o.y, o.z);
          if (bo > 0) {
            var kap = len / (C.anchorLen > 0.01 ? C.anchorLen : 0.13); if (kap > 0.5) kap = 0.5; kap *= bo;
            nx = o.x; ny = o.y > yCap ? o.y - yCap : 0; nz = o.z; nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl > 1e-9) { nx /= nl; ny /= nl; nz /= nl; } else { nx = 0; ny = 1; nz = 0; }
            bn = bodyAt(AFW, ex, ey, ez);
            var en = e0x * nx + e0y * ny + e0z * nz, kt = kap * (1 - bn), ktU = C.flyOnly ? kap : (WB[i] > 0.01 ? kt : Math.max(kt, kap * 0.5));   // 붓이 안 닿은 구간은 옆으로 밀린 것도 서서히 제자리로
            var cxx = -(en * nx * kap + (e0x - en * nx) * ktU), cyy = -(en * ny * kap + (e0y - en * ny) * ktU), czz = -(en * nz * kap + (e0z - en * nz) * ktU);
            var cmag = Math.sqrt(cxx * cxx + cyy * cyy + czz * czz), cmax = 0.5 * len; if (cmag > cmax) { cxx *= cmax / cmag; cyy *= cmax / cmag; czz *= cmax / cmag; }
            tx = ex + cxx - qx; ty = ey + cyy - qy; tz = ez + czz - qz; sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (sl > 1e-9) { ex = qx + tx / sl * len; ey = qy + ty / sl * len; ez = qz + tz / sl * len; S._an++; }
          }
        }
        // ⓑ 몸통 쪽으로 — 붓이 닿은 마디가 몸통 밖에 떠 있고, 두상 쪽으로 flowReach칸 안에 몸통이 있으면 그쪽으로 기울임(나란히 뜬 채 남지 않게)
        if (C.pullIn > 0 && WB[i] > 0.01 && bo < 0.5) {
          bn = bodyAt(AFW, ex, ey, ez);
          if (bn < 1) {
            nx = -ex; ny = ey > yCap ? yCap - ey : 0; nz = -ez; nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl > 1e-6) {
              nx /= nl; ny /= nl; nz /= nl; var found = false, hq;
              for (hq = 1; hq <= reach + 1; hq++) if (bodyAt(AFW, ex + nx * AFW.fc * hq, ey + ny * AFW.fc * hq, ez + nz * AFW.fc * hq) >= 0.5) { found = true; break; }
              if (found) {
                var pk2 = C.pullIn * WB[i] * (1 - bn);
                tx = (ex - qx) / len + nx * pk2; ty = (ey - qy) / len + ny * pk2; tz = (ez - qz) / len + nz * pk2; sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
                if (sl > 1e-9) { ex = qx + tx / sl * len; ey = qy + ty / sl * len; ez = qz + tz / sl * len; S._pi++; }
              }
            }
          }
        }
      }
      if (HD && len > 1e-9) {
        o = g[i]; yy = o.y - hcy;
        fl = Math.sqrt(o.x * o.x / a2 + yy * yy / b2 + o.z * o.z / c2); if (fl > lift) fl = lift;
        yy = ey - hcy; ee = Math.sqrt(ex * ex / a2 + yy * yy / b2 + ez * ez / c2);
        if (ee < fl - 1e-6) {
          // 이 마디가 두상 속으로 들어감 → 발(직전 점)에서 안쪽 성분을 빼고 면을 타고 눕힘(볼록한 면이라 면을 따라 한 걸음 가면 밖)
          yy = qy - hcy; nx = qx / a2; ny = yy / b2; nz = qz / c2; nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (nl > 1e-9) {
            nx /= nl; ny /= nl; nz /= nl; dn = ax * nx + ay * ny + az * nz;
            if (dn < 0) {
              tx = ax - dn * nx; ty = ay - dn * ny; tz = az - dn * nz; sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
              if (sl < 0.35) {                                             // 두피에 거의 수직으로 누른 방향(눕힐 쪽이 없음) → 이 마디는 빗기 전 방향으로
                q0 = g[i - 1]; tx = (o.x - q0.x) / len; ty = (o.y - q0.y) / len; tz = (o.z - q0.z) / len;
                dn = tx * nx + ty * ny + tz * nz; if (dn < 0) { tx -= dn * nx; ty -= dn * ny; tz -= dn * nz; }
                sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
              }
              if (sl > 1e-3) { ex = qx + tx / sl * len; ey = qy + ty / sl * len; ez = qz + tz / sl * len; }
            }
          }
          // 안전망: 그래도 속이면 겉면으로 밀어내고 마디 길이를 다시 맞춤
          yy = ey - hcy; ee = Math.sqrt(ex * ex / a2 + yy * yy / b2 + ez * ez / c2);
          if (ee < fl - 1e-6 && ee > 1e-9) {
            kk = fl / ee; ex *= kk; ey = hcy + yy * kk; ez *= kk;
            tx = ex - qx; ty = ey - qy; tz = ez - qz; sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (sl > 1e-9) { ex = qx + tx / sl * len; ey = qy + ty / sl * len; ez = qz + tz / sl * len; }
          }
          S._pu++;
        }
      }
      pt = { x: ex, y: ey, z: ez };
      if (NK && len > 1e-9) {                                              // 목 기둥 — 빗기 전에 밖에 있던 점만 · 밀어낸 뒤 마디 길이를 다시 맞춤
        try {
          r = NK(pt);
          if (r && r !== pt && NK(g[i]) === g[i]) {
            tx = r.x - qx; ty = r.y - qy; tz = r.z - qz; sl = Math.sqrt(tx * tx + ty * ty + tz * tz);
            if (sl > 1e-9) { pt = { x: qx + tx / sl * len, y: qy + ty / sl * len, z: qz + tz / sl * len }; S._nk++; }
          }
        } catch (e4) {}
      }
      qx = pt.x; qy = pt.y; qz = pt.z;
      out[i] = pt;
    }
    S._t++;
    try { out._pre = g._pre || g; } catch (e2) {}                         // 빗기 전 자리(붓은 여기에 칠함 — 아래 buildPick 참고)
    return out;
  }
  C._apply = applySamples;
  /* 진단용: 그 자리 칸에 칠해진 목표 방향 × 세기(없으면 null) */
  C._cell = function (x, y, z) {
    var f = syncField(); if (!f) return null;
    var k = f.map.get((Math.floor(x / C.cell) + OFF) + SPAN * ((Math.floor(y / C.cell) + OFF) + SPAN * (Math.floor(z / C.cell) + OFF)));
    return k === undefined ? null : [f.V[k * 3], f.V[k * 3 + 1], f.V[k * 3 + 2]];
  };

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
    try { checkModel(); S._t = 0; S._pu = 0; S._nk = 0; S._an = 0; S._pi = 0; S._to = S._ts = S._ta = S._tr = S._tf = S._tk = 0; } catch (e) {}
    var t0 = now(), out = origCA.apply(this, arguments);
    try {                                                                 // 빗질이 있는데 머리 모양(길이·컬 등)이 바뀌었으면 결을 다시 읽어 둠(전체 목록을 만든 호출에서만)
      if (C.grain && C.samples.length && out && out.length && !arguments[0] && !(arguments[1] > 1) && modelRef) {
        var fmB = flowMemo; flowGrid(out, Math.max(1, Math.ceil(out.length / C.pickStrands)), modelRef);
        if (fmB && fmB !== flowMemo && typeof ADJ_CACHE !== 'undefined' && ADJ_CACHE.bump) ADJ_CACHE.bump();      // 방금 목록은 옛 결로 만든 것 → 다음 호출에서 새로
      }
    } catch (eF) {}
    if (S._t > 0 || S._tk > 0) { S.touched = S._t; S.ms = now() - t0; S.pushed = S._pu; S.neck = S._nk; S.anch = S._an; S.pin = S._pi; S.tOwn = S._to; S.tSide = S._ts; S.tAll = S._ta; S.tReach = S._tr; S.tFinger = S._tf; S.tSkip = S._tk; }          // 캐시에서 나온 호출은 세지 않음
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
  /* ── 결 격자 ── 빗기 전 가닥들의 "큰 방향"(앞뒤 flowSmooth를 이은 현)을 자리(flowCell 칸)마다 가닥당 한 번씩 더해 둠.
     빗기 전 자리로 만들기 때문에 빗질을 해도 안 바뀝니다 → 머리 모양(모델·길이·컬)이 그대로면 다시 만들지 않고 씀. */
  var flowMemo = null;
  function flowGrid(list, stepS, model) {
    var t0 = now(), i, k, pp, q, np, acc = 0, fpStep = Math.max(1, Math.floor(list.length / 97));
    for (i = 0; i < list.length; i += fpStep) {                                    // 지문: 가닥 몇 개의 끝점(빗기 전)과 점 수
      pp = list[i].pts; if (!pp || !pp.length) continue; if (pp._pre && pp._pre.length === pp.length) pp = pp._pre;
      q = pp[pp.length - 1]; acc += q.x * 1.3 + q.y * 2.1 + q.z * 3.7 + pp.length;
    }
    var fp = list.length + ':' + stepS + ':' + acc.toFixed(4) + ':' + C.flowCell + ':' + C.flowSmooth + ':' + C.flowMin + ':' + C.flowNear + ':' + C.flowDense;
    if (flowMemo && flowMemo.fp === fp && flowMemo.model === model) return flowMemo.flow;
    if (flowMemo && flowMemo.flow) { ver++; S.flowRebuilt = (S.flowRebuilt || 0) + 1; }      // 머리 모양이 바뀌어 결을 다시 읽음 → 빗질 결과도 다음에 다시 계산
    var fc = C.flowCell > 0.01 ? C.flowCell : 0.07, b0x = Infinity, b0y = Infinity, b0z = Infinity, b1x = -Infinity, b1y = -Infinity, b1z = -Infinity, used = 0;
    for (i = 0; i < list.length; i += stepS) {
      pp = list[i].pts; if (!pp) continue; if (pp._pre && pp._pre.length === pp.length) pp = pp._pre;
      used++;
      for (k = 0; k < pp.length; k += 2) { q = pp[k]; if (q.x < b0x) b0x = q.x; if (q.x > b1x) b1x = q.x; if (q.y < b0y) b0y = q.y; if (q.y > b1y) b1y = q.y; if (q.z < b0z) b0z = q.z; if (q.z > b1z) b1z = q.z; }
    }
    var flow = null;
    if (b1x >= b0x && isFinite(b0x + b1x + b0y + b1y + b0z + b1z)) {
      var cyF = isFinite(model.CY) ? model.CY : 0, lim = 64 * fc;                   // 멀리 튄 점 하나 때문에 격자가 커지지 않게(두상 가운데에서 ±64칸)
      b0x = Math.max(b0x, -lim) - fc; b1x = Math.min(b1x, lim) + fc; b0y = Math.max(b0y, cyF - lim) - fc; b1y = Math.min(b1y, cyF + lim) + fc; b0z = Math.max(b0z, -lim) - fc; b1z = Math.min(b1z, lim) + fc;
      var nx = Math.floor((b1x - b0x) / fc) + 1, ny = Math.floor((b1y - b0y) / fc) + 1, nz = Math.floor((b1z - b0z) / fc) + 1, nn = nx * ny * nz;
      if (nx > 0 && ny > 0 && nz > 0) {
        var GX = new Float32Array(nn), GY = new Float32Array(nn), GZ = new Float32Array(nn), GN = new Uint16Array(nn), GL = new Int32Array(nn).fill(-1), inv = 1 / fc;
        var hw, arc, na, u0, u1, qa, qb, fx, fy, fz, fl, gi, gj, gk, gc, stride;
        for (i = 0; i < list.length; i += stepS) {
          pp = list[i].pts; if (!pp) continue; if (pp._pre && pp._pre.length === pp.length) pp = pp._pre;
          np = pp.length; if (np < 2) continue;
          arc = 0; na = np - 1 < 8 ? np - 1 : 8; u0 = pp[0];                        // 마디 길이는 앞쪽 몇 마디로 어림
          for (k = 1; k <= na; k++) { u1 = pp[k]; arc += Math.sqrt((u1.x - u0.x) * (u1.x - u0.x) + (u1.y - u0.y) * (u1.y - u0.y) + (u1.z - u0.z) * (u1.z - u0.z)); u0 = u1; }
          arc /= na;
          hw = arc > 0 ? Math.round(C.flowSmooth / arc) : 1; if (!(hw >= 1)) hw = 1; else if (hw > 16) hw = 16;
          stride = arc > 0 ? Math.floor(fc * 0.8 / arc) : 1; if (!(stride >= 1)) stride = 1; else if (stride > 6) stride = 6;   // 칸보다 촘촘히 찍을 필요 없음
          for (k = 0; k < np; k += stride) {
            q = pp[k];
            gi = (q.x - b0x) * inv | 0; gj = (q.y - b0y) * inv | 0; gk = (q.z - b0z) * inv | 0;
            if (!(q.x >= b0x && q.y >= b0y && q.z >= b0z && gi < nx && gj < ny && gk < nz)) continue;
            gc = gi + nx * (gj + ny * gk); if (GL[gc] === i) continue;              // 가닥당·칸당 한 번
            qa = pp[k - hw < 0 ? 0 : k - hw]; qb = pp[k + hw >= np ? np - 1 : k + hw];
            fx = qb.x - qa.x; fy = qb.y - qa.y; fz = qb.z - qa.z; fl = Math.sqrt(fx * fx + fy * fy + fz * fz); if (!(fl > 1e-9)) continue;
            GL[gc] = i; if (GN[gc] < 65535) GN[gc]++; GX[gc] += fx / fl; GY[gc] += fy / fl; GZ[gc] += fz / fl;
          }
        }
        // 몸통 머리의 보통 밀도 = 가닥 점이 가장 많이 사는 칸의 가닥 수(칸을 가닥 수로 가중한 중앙값) — 겉으로 뜬 잔머리 칸(1~몇 가닥)에 끌려가지 않음
        var gv = [], gs = 0, ga = 0, ref = 1; for (k = 0; k < nn; k++) if (GN[k]) { gv.push(GN[k]); gs += GN[k]; }
        gv.sort(function (x, y) { return x - y; });
        for (k = 0; k < gv.length; k++) { ga += gv[k]; if (ga * 2 >= gs) { ref = gv[k]; break; } }
        var mn = Math.max(6, Math.round(C.flowMin * Math.min(1, used / 8000)));
        var GM = new Float32Array(nn); for (k = 0; k < nn; k++) if (GN[k]) GM[k] = Math.sqrt(GX[k] * GX[k] + GY[k] * GY[k] + GZ[k] * GZ[k]);
        // (2026-10-05f) 몸통 격자: 칸마다 이웃 3×3×3칸의 가닥 수(축마다 한 번씩 더함)
        var GA = new Float32Array(nn), GT2 = new Float32Array(nn), ia, ib, ic, oo, sm;
        for (ic = 0; ic < nz; ic++) for (ib = 0; ib < ny; ib++) for (ia = 0; ia < nx; ia++) { oo = ia + nx * (ib + ny * ic); sm = GN[oo]; if (ia > 0) sm += GN[oo - 1]; if (ia < nx - 1) sm += GN[oo + 1]; GT2[oo] = sm; }
        for (ic = 0; ic < nz; ic++) for (ib = 0; ib < ny; ib++) for (ia = 0; ia < nx; ia++) { oo = ia + nx * (ib + ny * ic); sm = GT2[oo]; if (ib > 0) sm += GT2[oo - nx]; if (ib < ny - 1) sm += GT2[oo + nx]; GA[oo] = sm; }
        for (ic = 0; ic < nz; ic++) for (ib = 0; ib < ny; ib++) for (ia = 0; ia < nx; ia++) { oo = ia + nx * (ib + ny * ic); sm = GA[oo]; if (ic > 0) sm += GA[oo - nx * ny]; if (ic < nz - 1) sm += GA[oo + nx * ny]; GT2[oo] = sm; }
        var nearV = Math.max(mn, C.flowNear * ref);
        flow = { fc: fc, inv: inv, x0: b0x, y0: b0y, z0: b0z, nx: nx, ny: ny, nz: nz, GX: GX, GY: GY, GZ: GZ, GN: GN, GM: GM, GA: GT2, bLo: nearV, bHi: Math.max(nearV * 1.5, C.bodyFull * ref), ref: ref, cells: gv.length, dense: Math.max(2, C.flowDense * ref), near: nearV };
      }
    }
    flowMemo = { fp: fp, model: model, flow: flow };
    S.flowRef = flow ? flow.ref : 0; S.flowCells = flow ? flow.cells : 0; S.flowMs = now() - t0;
    return flow;
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
    if (C.grain) { try { flowGrid(list, stepS, model); } catch (eF) { S.err = String(eF && eF.message || eF); } }      // (2026-10-05e) 결 격자 준비(머리 모양이 그대로면 다시 안 만듦)
    var cell = Math.max(8, C.pickPx), gw = Math.ceil(rect.width / cell) + 1, gh = Math.ceil(rect.height / cell) + 1, head = new Int32Array(gw * gh).fill(-1), next = new Int32Array(total), n = 0;
    for (i = 0; i < list.length; i += stepS) {
      var pts = list[i].pts; if (!pts) continue;
      var pre = (pts._pre && pts._pre.length === pts.length) ? pts._pre : pts;      // 빗질로 옮겨지기 전 자리
      for (k = 0; k < pts.length; k++) {
        var p = pts[k], w = e[3] * p.x + e[7] * p.y + e[11] * p.z + e[15];
        if (!(w > 1e-6)) continue;
        var sx = ((e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12]) / w * 0.5 + 0.5) * rect.width, sy = (1 - ((e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13]) / w * 0.5 + 0.5)) * rect.height;
        if (sx < 0 || sy < 0 || sx >= rect.width || sy >= rect.height) continue;
        var b = (sy / cell | 0) * gw + (sx / cell | 0);
        SX[n] = sx; SY[n] = sy; SW[n] = w; PX[n] = pre[k].x; PY[n] = pre[k].y; PZ[n] = pre[k].z; next[n] = head[b]; head[b] = n; n++;
      }
    }
    // 화면 → 모델 방향: 카메라의 오른쪽·위 벡터를 머리 객체 좌표로
    var inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    var right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).transformDirection(inv), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).transformDirection(inv);
    // 두상 가운데의 깊이 — 이보다 depthMargin 넘게 뒤에 있는 점은 반대편 머리
    var cyH = isFinite(model.CY) ? model.CY : 0, wC = e[7] * cyH + e[15];
    S.pickMs = now() - t0; S.pickPts = n;
    return { wMax: wC + C.depthMargin, SX: SX, SY: SY, SW: SW, PX: PX, PY: PY, PZ: PZ, head: head, next: next, cell: cell, gw: gw, gh: gh, rect: rect, right: right, up: up,
      perPx: function (w) { return 2 * w * Math.tan(cam.fov * Math.PI / 360) / rect.height; } };
  }
  function pickAt(pk, x, y, rad) {
    var c = pk.cell, bx = x / c | 0, by = y / c | 0, span = Math.ceil(rad / c), best = -1, bw = Infinity, r2 = rad * rad, a, b, i;
    for (b = by - span; b <= by + span; b++) { if (b < 0 || b >= pk.gh) continue;
      for (a = bx - span; a <= bx + span; a++) { if (a < 0 || a >= pk.gw) continue;
        for (i = pk.head[b * pk.gw + a]; i >= 0; i = pk.next[i]) {
          if (pk.SW[i] > pk.wMax) continue;                               // 반대편 머리
          var dx = pk.SX[i] - x, dy = pk.SY[i] - y; if (dx * dx + dy * dy > r2) continue;
          if (pk.SW[i] < bw) { bw = pk.SW[i]; best = i; }
        }
      }
    }
    return best;
  }
  /* 화면의 원(반지름 rad px) 안에 보이는 가닥 점 전부 → [x,y,z,가중] 묶음. 너무 많으면 건너뛰며 고름 */
  var gatherBuf = new Int32Array(8192);
  function gather(pk, x, y, rad) {
    var c = pk.cell, bx = x / c | 0, by = y / c | 0, span = Math.ceil(rad / c), r2 = rad * rad, a, b, i, n = 0;
    for (b = by - span; b <= by + span; b++) { if (b < 0 || b >= pk.gh) continue;
      for (a = bx - span; a <= bx + span; a++) { if (a < 0 || a >= pk.gw) continue;
        for (i = pk.head[b * pk.gw + a]; i >= 0; i = pk.next[i]) {
          if (pk.SW[i] > pk.wMax) continue;
          var dx = pk.SX[i] - x, dy = pk.SY[i] - y; if (dx * dx + dy * dy > r2) continue;
          if (n >= gatherBuf.length) { var nb = new Int32Array(gatherBuf.length * 2); nb.set(gatherBuf); gatherBuf = nb; }
          gatherBuf[n++] = i;
        }
      }
    }
    if (!n) return null;
    // 3D 칸(dabCell)마다 점 하나만 — 머리가 빽빽한 자리와 혼자 떠 있는 잔머리가 같은 세기로 칠해지게(점 수에 비례하지 않게)
    var dc = C.dabCell, uniq = new Map(), k, key, wgt, ddx, ddy, prev;
    for (k = 0; k < n; k++) {
      i = gatherBuf[k];
      ddx = pk.SX[i] - x; ddy = pk.SY[i] - y; wgt = Math.pow(1 - Math.sqrt(ddx * ddx + ddy * ddy) / rad, C.falloff);
      key = (Math.floor(pk.PX[i] / dc) + 2048) + 4096 * ((Math.floor(pk.PY[i] / dc) + 2048) + 4096 * (Math.floor(pk.PZ[i] / dc) + 2048));
      prev = uniq.get(key);
      if (prev === undefined || wgt > prev[1]) uniq.set(key, [i, wgt]);
    }
    var m0 = uniq.size, step = Math.max(1, Math.ceil(m0 / C.dabMax)), D = new Float32Array(Math.ceil(m0 / step) * 4), j = 0, q = 0;
    uniq.forEach(function (v) {
      if (q++ % step) return;
      i = v[0]; D[j * 4] = pk.PX[i]; D[j * 4 + 1] = pk.PY[i]; D[j * 4 + 2] = pk.PZ[i]; D[j * 4 + 3] = v[1]; j++;
    });
    return { dabs: D, m: j, seen: n };
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
  /* 지나온 길에서 dirLagPx 뒤의 점 → 지금 점 = 빗질 방향(화면) */
  function lagDir(st, x, y) {
    var tr = st.trail, n = tr.length, acc = 0, i;
    for (i = n - 2; i >= 0; i -= 2) {
      acc += Math.hypot((i + 2 < n ? tr[i + 2] : x) - tr[i], (i + 3 < n ? tr[i + 3] : y) - tr[i + 1]);
      if (acc >= C.dirLagPx) break;
    }
    if (i < 0) i = 0;
    return [x - tr[i], y - tr[i + 1]];
  }
  function addSample(x, y) {
    var st = stroke, pk = st.pk; if (!pk) return;
    var mvx = x - st.lx, mvy = y - st.ly, mv = Math.sqrt(mvx * mvx + mvy * mvy);
    if (mv < C.minMovePx) return;
    var ld = lagDir(st, x, y);
    st.trail.push(x, y); if (st.trail.length > 240) st.trail.splice(0, 120);
    var ll = Math.hypot(ld[0], ld[1]) || 1;                               // 방향만(길이 1) — 직전 방향과 섞어 손떨림을 한 번 더 누름
    if (st.vx === 0 && st.vy === 0) { st.vx = ld[0] / ll; st.vy = ld[1] / ll; }
    else { st.vx = st.vx * 0.7 + ld[0] / ll * 0.3; st.vy = st.vy * 0.7 + ld[1] / ll * 0.3; }
    // 원의 크기: 원 안에서 가장 가까운 점의 깊이로(상한 maxRadius)
    var i = pickAt(pk, x, y, C.radiusPx);
    if (i >= 0) st.w = pk.SW[i];
    var rPx = st.w > 0 ? Math.min(C.maxRadius, C.radiusPx * pk.perPx(st.w)) / pk.perPx(st.w) : null;
    showMark(x, y, rPx, Math.atan2(st.vy, st.vx));
    st.lx = x; st.ly = y;
    if (rPx == null) return;                                              // 아직 머리 위를 지난 적 없음
    var dx = pk.right.x * st.vx - pk.up.x * st.vy, dy = pk.right.y * st.vx - pk.up.y * st.vy, dz = pk.right.z * st.vx - pk.up.z * st.vy, dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(dl > 1e-9)) return;
    if (st.has && Math.hypot(x - st.sx, y - st.sy) < C.spacing * rPx) return;        // 원 반지름의 spacing만큼 움직일 때마다 한 번
    var gth = gather(pk, x, y, rPx);
    if (!gth) return;                                                     // 원 안에 보이는 머리가 없음
    if (C.samples.length >= C.maxSamples) { if (!st.full) { st.full = true; try { showToast(lang() === 'ko' ? '빗질이 너무 많아요 — ↶로 되돌리거나 지워 주세요' : 'Too many comb strokes — undo or clear some'); } catch (e) {} } return; }
    C.samples.push({ dabs: gth.dabs, m: gth.m, dx: dx / dl, dy: dy / dl, dz: dz / dl, k: C.strength, g: st.g });
    st.sx = x; st.sy = y; st.has = true; st.n++; S.dabs = gth.m; S.seen = gth.seen;
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
    var rc = pk.rect, oy = e.pointerType === 'touch' ? C.touchOffset : 0, x0 = e.clientX - rc.left, y0 = e.clientY - rc.top - oy;
    stroke = { id: e.pointerId, pk: pk, oy: oy, lx: x0, ly: y0, vx: 0, vy: 0, trail: [x0, y0], has: false, n: 0, g: ++gid, cx: 0, cy: 0, cz: 0, sx: 0, sy: 0, sz: 0, w: 0 };
    var i0 = pickAt(pk, x0, y0, C.radiusPx);
    if (i0 >= 0) stroke.w = pk.SW[i0];
    showMark(x0, y0, i0 >= 0 ? Math.min(C.maxRadius, C.radiusPx * pk.perPx(pk.SW[i0])) / pk.perPx(pk.SW[i0]) : null, null);
    e.stopPropagation();
  }
  function onMove(e) {
    if (ptrs.has(e.pointerId)) { var q = ptrs.get(e.pointerId); q.x = e.clientX; q.y = e.clientY; }
    if (!stroke && C.on && !pass && e.pointerType === 'mouse' && usable() && onCanvas(e)) {      // 마우스: 올려놓기만 해도 빗이 따라다님
      var r0 = e.target.getBoundingClientRect(); showMark(e.clientX - r0.left, e.clientY - r0.top, null, null);
    }
    if (!stroke || e.pointerId !== stroke.id) return;
    e.stopPropagation();
    var rc = stroke.pk.rect, oy = stroke.oy, ev = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null;
    if (ev && ev.length > 1) { for (var i = 0; i < ev.length; i++) addSample(ev[i].clientX - rc.left, ev[i].clientY - rc.top - oy); }
    else addSample(e.clientX - rc.left, e.clientY - rc.top - oy);
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
   * 빗 표시 — 점선 원(실제로 바뀌는 범위) + 작은 빗(빗살이 가리키는 쪽 = 머리가 눕는 방향)
   * ────────────────────────────────────────────────────────────────────── */
  var mark = null, markR = 14;
  function restRadiusPx() {                 // 붓 자리를 아직 못 찾았을 때: 머리 가운데 깊이 기준
    try {
      var m = m3(), rect = m.renderer.domElement.getBoundingClientRect(), dist = MODEL3D_VIEW.base ? MODEL3D_VIEW.base.dist / MODEL3D_VIEW.zoom : m.camera.position.length();
      var pp = 2 * dist * Math.tan(m.camera.fov * Math.PI / 360) / rect.height;
      return Math.min(C.maxRadius, C.radiusPx * pp) / pp;
    } catch (e) { return C.radiusPx; }
  }
  function ensureMark() {
    var m = m3(); if (!m || !m.container || m.container.id !== 'adjust3dHost') return null;
    if (mark && mark.parentNode === m.container) return mark;
    mark = document.createElement('div'); mark.id = 'comb3dMark';
    mark.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:5;pointer-events:none;display:none;';
    mark.innerHTML = '<svg width="120" height="120" viewBox="-60 -60 120 120" style="position:absolute;left:-60px;top:-60px;overflow:visible">' +
      '<circle id="comb3dRing" r="14" fill="rgba(201,135,74,0.10)" stroke="#fff" stroke-width="2.5" opacity="0.9"/>' +
      '<circle id="comb3dRing2" r="14" fill="none" stroke="#c9874a" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<g id="comb3dGlyph"><g transform="translate(0,0)">' +
      '<rect x="-13" y="-8" width="26" height="6" rx="2" fill="#c9874a" stroke="#1a1410" stroke-width="1"/>' +
      [-10.5, -7, -3.5, 0, 3.5, 7, 10.5].map(function (x) { return '<rect x="' + (x - 0.9) + '" y="-2.5" width="1.8" height="10" rx="0.8" fill="#c9874a" stroke="#1a1410" stroke-width="0.6"/>'; }).join('') +
      '</g></g></svg>';
    m.container.appendChild(mark);
    return mark;
  }
  /* (x,y) = 그림판 안 좌표 · rPx = 실제 반지름(px · null이면 직전 값) · ang = 빗질 방향(rad · null이면 아래) */
  function showMark(x, y, rPx, ang) {
    if (!C.indicator) return;
    var el = ensureMark(); if (!el) return;
    if (rPx != null && isFinite(rPx)) markR = Math.max(4, rPx);
    el.style.display = 'block';
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    try {
      el.querySelector('#comb3dRing').setAttribute('r', markR.toFixed(1)); el.querySelector('#comb3dRing2').setAttribute('r', markR.toFixed(1));
      // 빗살이 진행 방향을 가리키게(빗 그림은 빗살이 +y) — 화면 각도 ang에서 90° 뺌
      var deg = ang == null ? 0 : ang * 180 / Math.PI - 90;
      el.querySelector('#comb3dGlyph').setAttribute('transform', 'rotate(' + deg.toFixed(1) + ')');
    } catch (e) {}
  }
  function hideMark() { if (mark) mark.style.display = 'none'; }
  function restMark() {                      // 빗질을 켰을 때: 화면 가운데에 빗을 보여 둠
    try {
      var m = m3(); if (!m || !C.on) { hideMark(); return; }
      var rect = m.renderer.domElement.getBoundingClientRect();
      showMark(rect.width / 2, rect.height / 2, restRadiusPx(), null);
    } catch (e) {}
  }
  C._mark = function () { return mark; };

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
    if (C.on) {
      restMark();
      try { showToast(lang() === 'ko' ? '뜬 머리에 빗(원)을 올리고 결대로 쓸어 주세요 — 주변 머리의 결에 맞춰 눕습니다 · 빗은 손가락 조금 위에 있어요 · 두 손가락: 이동·확대'
        : 'Put the comb (circle) on the flyaways and sweep along the hair — they lie down into the surrounding flow · the comb sits just above your finger · two fingers: move / zoom'); } catch (e) {}
    } else hideMark();
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
      try { if (name === 'activateScreen' && arguments[0] !== 'adjust' && C.on) { C.on = false; if (stroke) endStroke(); hideMark(); } syncBtn(); } catch (e) {}
      return r;
    };
  });
  var oApplyV = W.model3dApplyView;
  if (typeof oApplyV === 'function') W.model3dApplyView = function () {
    var r = oApplyV.apply(this, arguments);
    try { if (C.on && !stroke && mark && mark.style.display !== 'none') { markR = Math.max(4, restRadiusPx()); mark.querySelector('#comb3dRing').setAttribute('r', markR.toFixed(1)); mark.querySelector('#comb3dRing2').setAttribute('r', markR.toFixed(1)); } } catch (e) {}
    return r;
  };
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
        ' · 직전에 바뀐 가닥 ' + S.touched + ' · 가닥 만들기 ' + Math.round(S.ms) + 'ms(빗질 포함) · 붓 자리 찾기 준비 ' + Math.round(S.pickMs) + 'ms(점 ' + S.pickPts + ') · 직전 표본이 칠한 점 ' + S.dabs + '(원 안에 보인 점 ' + S.seen + ')' +
        ' · 방향 장 ' + (F ? F.n : 0) + '칸 · 붓 ' + C.radiusPx + 'px(상한 ' + C.maxRadius + ' · 지금 화면에서 ' + Math.round(markR) + 'px) · 세기 ' + C.strength + ' · 터치 빗 위치 손가락 위 ' + C.touchOffset + 'px' + (S.err ? ' · ⚠ ' + S.err : ''));
      L.push('  결 따라 빗기 ' + (C.grain ? (flowMemo && flowMemo.flow ? '켜짐 — 결 칸 ' + S.flowCells + ' · 몸통 머리 보통 밀도 칸당 ' + S.flowRef + '가닥 · 결 읽기 ' + Math.round(S.flowMs) + 'ms' : '켜짐(아직 결을 안 읽음 — 빗을 대면 읽음)') : '꺼짐(손가락 방향 그대로)') +
        ' · 직전에 본 마디의 목표: 제 무리의 결 ' + S.tOwn + ' / 손가락 쪽 이웃의 결 ' + S.tSide + ' / 이웃 전체의 결 ' + S.tAll + ' / 두상 쪽에서 찾은 결 ' + S.tReach + ' / 손가락 방향(주변에 머리 없음) ' + S.tFinger + ' / 결이 갈려 그대로 둠 ' + S.tSkip +
        ' · 허용 각 ' + C.tolFrom + '~' + C.tolFull + '° · ' + (C.collide ? '두상에 막혀 눕힌 마디 ' + S.pushed + ' / 목 밖으로 민 점 ' + S.neck : '두상 막기 꺼짐') +
        ' · ' + (C.anchor ? '몸통 붙들기 켜짐 — 제자리로 되돌린 점 ' + S.anch + ' / 몸통 쪽으로 기울인 마디 ' + S.pin : '몸통 붙들기 꺼짐'));
    } catch (e) {}
    return L;
  };

  console.log(TAG + ' 설치 — 3D 조정 화면에서 [빗질]을 켜고 잔머리를 결 방향으로 쓰다듬으면 그 방향으로 눕습니다. 지우기 COMB3D.clear() · 되돌리기 COMB3D.undo()');
})();
