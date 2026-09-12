# 언제 v0.6 디자인 / Scene System 상태

Updated: 2026-09-02 21:xx KST
Branch: `design/visual-polish-v0.6`

## 현재 단계

구조/실지도 → production scene → 계절/시간 재설계 → 메인 Decision Surface → 저장/확정/기록 → 자동/브라우저 QC 단계.
Render staging/merge는 사용자 최종 시각 검수 전까지 보류한다.

## 완료

### 제품 구조
- 홈: editorial hero → 메인 결정 패널 → 차선책 → 비대칭 3개 시간 카드.
- 지도: 실제 OSM/Leaflet + 6개 공원 좌표 + 동일 verdict/scene state.
- 기록: 확정한 일정 / 저장 / 최근 본 추천.

### 메인 패널 v3
- 큰 빈 glass card 대신 compact Decision Surface로 재구축.
- 장소 / 장소 signature / 한 줄 verdict / 최적 시간.
- 실제 best slot 기반 조건 strip: 기온·혼잡·풍속·강수확률 중 존재하는 값만 표시.
- `좋아요`: 서버 verdict가 실제 생성한 reasons만 사용.
- `아쉬워요`: 실제 best slot의 붐빔·강풍·고온/저온·강수 가능성·낮은 confidence만 사용. 데이터가 없으면 단점을 발명하지 않음.
- 실제 action: `이 시간으로 정하기`, 저장/취소, 지도, 공유(Web Share / clipboard fallback).
- 작은 pill 남발을 줄이고 intent는 underline text selector로 변경.
- 시간 카드 3장을 0.92 / 1.16 / 0.92 비대칭으로 재배치하고 가운데 추천만 강조.
- glass 투명도 증가, 패널 dead-space 축소.

### 저장 / 결정 / 기록
- `eonje.saved.v1`: 저장 계획.
- `eonje.recent.v1`: 최근 본 추천.
- `eonje.confirmed.v1`: 사용자가 `이 시간으로 정하기`로 확정한 일정.
- 홈/지도 양쪽에서 저장·확정 가능.
- history 화면에서 확정 일정, 저장, 최근 기록을 확인/삭제/취소 가능.

### 실제 계절 우선 scene
- 실제 서울 날짜가 1순위:
  - 봄 3–5 / 여름 6–8 / 가을 9–11 / 겨울 12–2.
- 이벤트 테마는 별도: `theme=cherry`, `theme=fireworks` 등. 벚꽃은 기본 계절 표현이 아님.
- 이전의 `봄 이미지 → hue/saturation 변경` autumn 방식은 폐기.
- 현재 가을 v2는 실제 해당 공원/한강권 사진을 source로 1600×900 crop + 질감/색/명료도 조정해 별도 raster로 생성한다.
- 출처/라이선스는 `public/credits.html`에서 고지.

현재 가을 source coverage:
- 망원: 2024-09-22 실제 망원한강공원 사진 → `autumn/master-v2.png` ✅
- 여의도: November 2019 Yeouido → `autumn/master-v2.png` ✅
- 이촌: 2014-09-12 실제 이촌한강공원 사진 → `autumn/master-v2.png` ✅
- 잠실권: 가을 한강/도시 landmark source → `autumn/master-v2.png` ✅
- 반포 밤: 실제 반포대교 달빛무지개분수 야경 → `autumn/night-v2.png` ✅
- 뚝섬 밤: 2024-11-04 실제 뚝섬한강공원 야경 → `autumn/night-v2.png` ✅

### 시간대 lighting
`밤 = 전체 darkening` 방식 폐기.
- dawn: 낮은 태양/청보라 하늘.
- morning/day/afternoon/evening: 태양 위치·색온도만 이동.
- night: 기본 밝기 `0.94` 유지 + 달 광원 + 도시/가로등/수면 반사 glow.
- 반포/뚝섬은 실제 night source가 있을 때 해당 이미지를 우선 사용.

### 공원 identity
- 망원: 넓은 잔디 · 망원정 · 마포나루 · 느슨한 로컬 수변
- 여의도: 물빛광장 · 여의도 스카이라인 · 넓은 이벤트 수변
- 이촌: 갈대·억새 · 노들섬/철교 조망 · 조용한 생활형 산책
- 반포: 잠수교 · 세빛섬 · 달빛무지개분수
- 뚝섬: 자벌레/한강플플 · 액티브 수변 · 청담대교 조망
- 잠실: 롯데월드타워 · 잠실수중보 · 동쪽 스카이라인

### QC
- `npm test`가 새 Decision Surface, physical autumn source, luminous night, 저장/확정/기록, 지도 evidence를 계약으로 검사.
- CI가 `npm install`까지 실행하여 `sharp` dependency 설치도 검증.
- 실제 Chromium을 띄우는 `scripts/browser-qc.mjs`와 screenshot artifact CI 추가:
  - 홈: September=autumn, physical autumn asset, panel density, conditions/evidence.
  - 지도: 실제 marker, 조건/evidence/확정 action.
  - 기록: confirmed/saved/recent surface.

## 남은 실제 블로커 / 미완료

### 1. 24개 완전 생성형 seasonal illustrations
목표 미술 방향은 공원별 spring/summer/autumn/winter를 동일 일러스트 언어로 완전히 재생성하는 것.
현재 Higgsfield Private workspace 이미지 generation credits가 0이라 `nano_banana_pro` 신규 생성 요청이 `Out of credits on free plan`으로 차단됨.
따라서 이번 라운드는 실제 계절/랜드마크 source 사진을 브랜드 톤으로 파생한 scene을 사용한다.

### 2. Summer / Winter park-specific structural scene
현재 가을은 real-source v2로 해결. Commons 검색에서 여의도 summer source는 확보 가능했지만 모든 6개 공원의 여름/눈 오는 겨울을 동일 품질·명확한 라이선스로 확보하지 못함.
부분 source만 억지로 채우지 않고, 생성 credits 또는 적절한 CC source 확보 시 6개를 세트로 교체한다.
현재 summer/winter fallback은 기존 master + 계절 보정이므로 **최종 미술 완성 상태가 아니다**.

### 3. Pretendard self-hosted webfont
현재 local Pretendard 우선 + OS fallback. 외부 runtime CDN dependency는 넣지 않음.

### 4. 플랫폼 수준 후속 기능
- 브라우저가 닫혀 있어도 동작하는 출발 알림 / 조건 악화 재평가 알림: 서버 notification/automation 필요.
- 계정 간 동기화: 로그인/cloud persistence 필요.
- 정확한 캘린더 일정화: 확정 plan에 canonical start/end 저장을 추가한 뒤 ICS 또는 Google Calendar integration로 구현 가능. 현재 우선순위는 visual/product QC 아래.

## 완료 판단 기준
- 9월 화면이 분홍 벚꽃 recolor로 보이지 않는다.
- 밤에도 공원과 텍스트가 읽히고 광원이 달/가로등/도시빛으로 바뀐다.
- 공원별 landmark/signature/scene이 구별된다.
- 메인 패널이 빈 카드가 아니라 어디/언제/왜/주의/행동을 한 화면에서 끝낸다.
- 홈/지도 모두 같은 server verdict를 단일 decision source로 쓴다.
- 저장/확정/기록이 새로고침 후 유지된다.
- unit/contract + Chromium browser QC 모두 통과한다.
- 이후 사용자 시각 QC 통과 후에만 Render staging으로 이동한다.
