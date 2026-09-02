# 언제 — 메인 결정 패널 v3 설계

Date: 2026-09-02
Status: v2 implemented / v3 product design frozen for next polish

## 1. 패널의 역할
메인 패널은 정보 카드가 아니라 사용자가 오늘의 선택을 끝내는 **Decision Surface**다.

사용자가 3초 안에 답을 얻어야 하는 질문:
1. 어디로 갈까?
2. 언제 갈까?
3. 왜 지금 이 선택인가?
4. 마음에 들면 다음 행동은 무엇인가?

따라서 raw weather/dashboard를 넣지 않는다. 패널 안에는 결론과 결론을 행동으로 옮기는 데 필요한 최소 근거만 둔다.

## 2. 현재 v2 구현

### 상단 좌측 — Place
- 오늘의 추천 상태
- 공원명
- 공원 signature / landmark identity
- 한 줄 verdict/subhead

### 상단 우측 — Time
- 가장 좋은 시간 window
- activity label

### 중단 — Evidence
- 이유 3개
- title + 한 줄 detail

### 하단 — Action
- 이 추천 저장
- 지도에서 보기
- 현재 계절 · 시간대 context

### 주변 모듈
- 바로 아래 alternative park strip
- 아래 3개 time alternatives

## 3. v3 시각 설계

### 원칙
- 패널 면적을 더 키우지 않는다.
- 내부 dead-space를 최소화한다.
- 11px 이하 UI text는 원칙적으로 없앤다.
- pill은 상태/행동 선택에만 쓴다. 장식 pill 금지.
- 동일한 radius의 작은 카드 반복을 줄인다.
- 배경이 실제 interface layer가 되도록 glass opacity를 현재보다 약간 더 낮게 유지한다.

### 권장 위계
- 공원명: 38–42px
- 시간: 42–46px, tabular numeral
- evidence title: 14–15px
- evidence detail: 12–13px
- landmark/signature: 13–14px
- status/badge: 11–12px

## 4. v3 기능 설계

### A. 저장 — 구현 완료
`이 추천 저장`은 place+intent+time window를 local plan으로 보관한다.

### B. 지도에서 보기 — 구현 완료
같은 park+intent state로 map tab 이동.

### C. 최근 본 추천 — 구현 완료
추천 결과가 표시될 때 최근 기록에 저장. 기록 탭에서 재확인 가능.

### D. 좋아요 / 아쉬워요 — 다음 후보
패널을 더 길게 만들지 않고 evidence 3개 아래 또는 상세 expand 안에서 compact 2-column으로 제공.

입력 데이터 원칙:
- 기존 verdict reasons에서 긍정 근거 추출.
- warning/gate/quality 데이터가 실제로 있을 때만 `아쉬워요` 표시.
- 없는 단점을 AI가 발명하지 않는다.

예:
좋아요: 한적함 / 노을 각도 / 기온
아쉬워요: 강풍 / 주차 혼잡 / 데이터 지연

### E. 정하기 / 일정화 — staging 이후
`이 시간으로 정하기`는 저장보다 강한 commit action.
후보 기능:
- OS calendar / Google Calendar 추가
- 출발 전 reminder
- 조건 악화 시 재알림

현재는 외부 권한/연결이 필요하므로 production staging 이후 별도 gate로 둔다.

### F. 조건 변동 alert — staging 이후
저장한 추천의 날씨/혼잡/강수/시간 window가 의미 있게 악화되면 재평가.
자동화/notification infrastructure가 필요한 별도 기능.

## 5. 패널 interaction

### default
- 정적인 glass
- 과한 border glow 없음

### hover
- 4px 이내 lift
- 0.6–0.8% scale
- specular sweep
- blur/saturation 소폭 증가
- text/contents는 filter 영향 없음

### clicked action
- 저장 버튼은 즉시 상태 전환 `저장됨 · 취소`
- 별도 toast는 v0.6에서는 생략 가능

## 6. 계절/이벤트 연결

패널 자체 컬러는 계절에 따라 크게 변하지 않는다. 브랜드 안정성을 위해 scene이 변화의 대부분을 담당한다.

우선순위:
1. actual season
2. park native scene
3. recommendation daypart
4. optional explicit theme/event

예:
- 9월 반포 evening → Banpo autumn raster + evening light
- 4월 여의도 + `theme=cherry` → spring scene + cherry event accent
- 불꽃축제 → 실제 event flag가 있을 때 fireworks theme

## 7. 미구현 기능 분류

### 지금 구현 가능하지만 우선순위 낮음
- 상세 evidence expand/collapse
- 저장 항목 개별 memo
- share URL 버튼

### 데이터 구조 확인 후 구현
- 좋아요/아쉬워요
- 주차/접근성 caveat
- 행사/event contextual recommendation

### 외부 integration 필요
- calendar
- notification/reminder
- 위치 기반 `내 주변`

## 8. 최종 패널 성공 기준

- 처음 본 사용자가 공원과 시간을 3초 내 읽음.
- 근거 3개가 읽히되 dashboard처럼 느껴지지 않음.
- 공원 landmark identity가 한 줄로 기억에 남음.
- 저장 또는 지도 이동이라는 명확한 다음 행동이 있음.
- 패널보다 배경이 더 시끄럽지 않고, 패널이 배경을 완전히 가리지도 않음.
- 작은 text/pill/card 반복으로 인한 AI-generated layout 느낌이 최소화됨.
