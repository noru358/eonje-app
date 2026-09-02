# 언제 v0.6 디자인/Scene System 상태

Updated: 2026-09-02 20:xx KST
Branch: `design/visual-polish-v0.6`

## 완료

- 홈: hero → 메인 결정 패널 → 대안 strip → 3개 시간 선택 카드 구조.
- 지도: 실제 OSM/Leaflet + 6개 공원 좌표 + 추천/verdict 연동.
- production artwork를 self-hosted runtime asset으로 사용. CSP/inline-style fallback 문제 제거.
- 실제 서울 날짜를 scene의 1순위 상태로 사용:
  - 봄 3–5월 / 여름 6–8월 / 가을 9–11월 / 겨울 12–2월
  - 시간대 6종: dawn/morning/day/afternoon/evening/night
  - `theme=cherry`, `theme=fireworks` 등 이벤트 테마는 실제 계절과 별도. 벚꽃은 기본 브랜드 톤이 아니라 명시적 테마.
- 현재 계절(가을)용 physical raster master를 봄 master와 별도 생성/후처리:
  - 망원 autumn 완료
  - 여의도 autumn 완료
  - 이촌 autumn 완료
  - 반포 autumn 완료
  - 잠실 autumn 완료
- 장소별 identity metadata 추가:
  - 망원: 넓은 잔디 · 망원정/마포나루 계열의 로컬 수변
  - 여의도: 탁 트인 수변 · 도심 이벤트/스카이라인
  - 이촌: 갈대·억새 · 조용한 생활형 산책로
  - 반포: 잠수교 · 세빛섬 · 달빛무지개분수
  - 뚝섬: 자벌레(한강플플) · 액티브 수변
  - 잠실: 롯데월드타워 · 잠실 수중보 · 도시 스카이라인
- 메인 패널 2차 deslop:
  - 작은 텍스트 확대
  - 패널 내부 dead-space 축소
  - 장소 signature 추가
  - 유리 투명도 소폭 증가
  - 저장 / 지도에서 보기 action row 추가
  - 실제 계절·시간 context 표시
- liquid-glass interaction:
  - lift만이 아니라 specular sweep, blur/saturation, border/depth 변화
  - reduced-motion 대응
- 실제 기능 추가:
  - 추천 저장(localStorage)
  - 저장 취소
  - 최근 본 추천 자동 기록
  - `history.html`에서 나의 저장 / 최근 본 추천 확인 및 최근기록 삭제
  - 홈↔지도↔기록 navigation 연결
  - 지도 추천 패널에서도 저장 가능
- 자동 web contract QC가 season/theme/place identity/save/history/map/verdict source를 검사.
- 최신 GitHub Actions `npm test` 성공.

## 현재 asset coverage

### Spring native masters
- 망원 ✅
- 여의도 ✅
- 이촌 ✅
- 반포 ✅
- 잠실 ✅
- 뚝섬 ❌

### Autumn physical masters
- 망원 ✅
- 여의도 ✅
- 이촌 ✅
- 반포 ✅
- 잠실 ✅
- 뚝섬 ❌

가을 asset은 단순 CSS hue-rotate가 아니라 별도 PNG 파일이며 9–11월에 우선 사용한다. 시간대는 해당 계절 master에 조명/명암 retouch를 적용한다.

## 미완료 / 실제 블로커

### 1. 뚝섬 native scene
이미지 생성 workspace credits 소진으로 뚝섬 native master 생성 불가. 현재 generic/base fallback. 뚝섬은 자벌레/액티브 수변 identity를 native artwork로 재생성해야 한다.

### 2. Summer / Winter native seasonal masters
현재 summer/winter는 장소 master에 계절 retouch를 적용. 최종 품질 목표는 장소별 native seasonal master.

### 3. Autumn native redraw
현재 autumn 5종은 spring artwork에서 핑크/벚꽃 계열을 제거하고 금빛/저채도 녹색 계열로 physical retouch한 별도 raster다. 현재 계절 대응에는 사용 가능하지만, 장기적으로는 낙엽/억새/계절 식생 자체가 다시 그려진 native autumn illustration이 더 좋다.

### 4. Pretendard webfont self-hosting
현재 local Pretendard 우선 + OS 한글 font fallback. font binary는 저장소에 포함하지 않음.

### 5. Visual/browser QC
자동 테스트는 구조·상태·기능 회귀를 잡지만 시안 대비 미감은 사용자 브라우저 최종검수 필요.

## 다음 제품 우선순위

1. 사용자 브라우저 QC: 계절감, 패널 밀도, typography, liquid-glass 강도.
2. 메인 패널 v3: `좋아요 / 아쉬워요` compact evidence와 상황별 caveat를 verdict 데이터 구조에 맞춰 추가 여부 검토.
3. 저장한 계획에 알림/캘린더 연동은 별도 권한/외부 integration이 필요하므로 staging 이후 검토.
4. 뚝섬 + native summer/winter/autumn artwork 보강.
5. Render staging → 실제 URL QC → merge/deploy 결정.

## 완료 판단 기준

- 실제 월이 계절을 결정하고, 벚꽃은 이벤트 테마일 때만 강하게 등장.
- 장소가 바뀌면 화면의 landmark/identity 문구와 scene이 함께 바뀜.
- 추천 시간이 바뀌면 daypart가 바뀜.
- 홈/지도 모두 같은 scene resolver 사용.
- 저장/기록이 실제로 작동하고 새로고침 후 유지됨.
- CSP/asset 실패가 조용히 오래된 SVG로 fallback하지 않음.
- `npm test` / GitHub Actions 통과.
