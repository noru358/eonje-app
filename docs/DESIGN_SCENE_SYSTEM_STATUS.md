# 언제 v0.6 디자인/Scene System 상태

Updated: 2026-09-02 KST
Branch: `design/visual-polish-v0.6`

## 완료

- 홈 구조를 선택 시안의 hero → 메인 추천 패널 → 대안 strip → 3개 시간 카드 구조로 재구축.
- 실제 OSM/Leaflet 지도 및 6개 공원 좌표 연동.
- production 래스터 배경을 self-hosted asset으로 적용하고 CSP/inline-style 문제 제거.
- 공통 `scene-system.js` 추가:
  - 계절: spring / summer / autumn / winter
  - 시간대: dawn / morning / day / afternoon / evening / night
  - Asia/Seoul 시간 기준
  - 추천된 장소와 추천 시간에 맞춰 홈/지도 scene 상태 연동
  - 하단 시간 카드도 각 카드 시간대에 맞춰 scene state 연동
- `scene-system.css` 추가:
  - 장소 master asset 매핑
  - 계절/시간대별 색온도·채도·명도·대비 리터칭
  - liquid-glass specular sweep, blur/saturation, lift interaction
  - `prefers-reduced-motion` 대응
- 시안 쪽으로 typography/panel hierarchy 추가 조정:
  - 한글 Pretendard 우선 stack
  - 시간 숫자 tabular numerals
  - 메인 추천 패널 폭/여백/시간 숫자/이유 아이콘 계층 강화
- asset prestart pipeline이 확보된 scene master를 자동 다운로드.
- 새 web-contract 테스트가 scene resolver, CSP, place/season/daypart, liquid glass, real map, verdict source를 검증하도록 업데이트.

## 현재 확보된 장소 master

- 공통/base spring sunset: 완료
- 망원한강공원 spring master: 완료
- 여의도한강공원 spring master: 완료
- 이촌한강공원 spring master: 완료
- 반포한강공원 spring master: 완료
- 잠실한강공원 spring master: 완료
- 뚝섬한강공원 spring master: 미완료

## 미완료 / 실제 블로커

### 1. 계절별 실제 master 이미지
목표는 6 parks × 4 seasons = 24 seasonal masters이며, 시간대 6종은 각 seasonal master에 일관된 retouch를 적용해 144 scene 조합을 만든다.

현재 이미지 생성 workspace credits가 소진되어 신규 생성이 차단됨:
- plan: free/private workspace
- usable credits: 생성 시점 기준 사실상 소진
- unlimited allowance: unavailable
- 결과: spring 5 park masters까지만 신규 확보. 뚝섬 및 summer/autumn/winter masters는 생성 불가.

코드는 144조합을 이미 처리한다. 실제 master가 없는 계절은 현재 장소 spring master(또는 base) 위에 seasonal/daypart retouch를 적용한다. 향후 이미지 파일만 추가하고 scene mapping을 갱신하면 레이아웃/판정 로직 수정 없이 교체 가능.

### 2. Pretendard webfont self-hosting
현재 CSS는 `Pretendard Variable` local font 우선 + 시스템 한글 font fallback을 사용한다. 외부 font CDN을 새 runtime dependency로 만들지 않기 위해 webfont binary 다운로드는 아직 추가하지 않았다. 실제 사용자 기기에서 Pretendard가 없으면 Apple SD Gothic Neo / Malgun Gothic 등으로 fallback된다.

### 3. Visual/browser QC
자동 계약 테스트는 기능/구조/CSP/scene mapping을 검증하지만, 시안과의 픽셀·미감 차이는 사람의 최종 브라우저 QC가 필요하다.

## 다음 우선순위

1. 사용자 최종검수: 홈/지도 캡처 기준 spacing, typography, liquid-glass 강도 조절.
2. 이미지 생성 credits 확보 후 뚝섬 spring + 18개 summer/autumn/winter masters 생성.
3. 각 seasonal master를 scene asset pipeline에 등록.
4. 최종 Render staging QC 후 merge/deploy 결정.

## 완료 판단 기준

- 장소 선택/추천 변경 시 장소 scene이 실제로 바뀜.
- 추천 시간/시간 카드에 따라 daypart가 바뀜.
- 월에 따라 season state가 바뀜.
- 지도 선택도 동일 scene resolver를 사용함.
- CSP에 의해 artwork가 silently fallback하지 않음.
- UI hover가 단순 translate가 아니라 liquid-glass highlight/blur/depth 변화까지 포함함.
- `npm test` / GitHub Actions가 통과함.
