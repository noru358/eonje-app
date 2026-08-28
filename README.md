# 언제 v0.3

> **Working brand**: `언제`는 현재 개발용 이름입니다. 최종 네이밍과 코드 구조를 분리해 제품명 변경이 개발을 막지 않도록 합니다.

`Data → Verdict → Action` 문법을 검증하는 모바일 우선 웹 제품입니다. v0.3의 질문은 하나입니다.

> **오늘 한강 언제 가지?**

## v0.3에서 달라진 것

- 큰 카드형 대시보드 대신 **답 자체가 첫 화면**이 되도록 UI 재설계
- 가짜 `알림 예약됨` 제거
- 실제 동작하는 `.ics` **캘린더 저장** 추가
- Web Share API / 클립보드 fallback으로 **결과 공유** 추가
- 장소 선택을 모바일 bottom sheet 형태로 변경
- loading / error / demo / live 상태를 명확하게 분리
- `?place=yeouido` 식 공유 가능한 장소 URL + 최근 장소 localStorage 저장
- `왜 이 시간이야?` 아래에만 시간별 근거를 progressive disclosure
- 판정 로직을 브라우저가 아니라 서버의 `/api/verdict`에서 실행해 **판정의 단일 원본** 유지
- 6개 한강공원, 서울 API proxy, KMA optional merge, snapshot 저장 구조 유지

## 실행

Node 20+:

```bash
npm start
```

브라우저에서 `http://localhost:4173`.

API 키가 없으면 데모 데이터로 동작합니다.

### macOS

```bash
SEOUL_API_KEY="YOUR_KEY" npm start
```

### Windows PowerShell

```powershell
$env:SEOUL_API_KEY="YOUR_KEY"
npm start
```

기상청 단기예보도 붙이려면:

```bash
DATA_GO_KR_API_KEY="YOUR_KEY"
```

추천 사후 검증용 5분 스냅샷을 저장하려면:

```bash
STORE_SNAPSHOTS=1
```

저장 위치: `data/snapshots/YYYY-MM-DD.jsonl`

## GitHub를 단일 원본으로 쓰기

맥과 윈도우는 같은 repo를 clone한 두 클라이언트로 취급합니다.

### 처음 한 번 — macOS

```bash
./bootstrap-github.command
```

### 처음 한 번 — Windows PowerShell

```powershell
./bootstrap-github.ps1
```

이후 공통:

```bash
git pull --rebase
npm test
```

작업 후:

```bash
git add .
git commit -m "설명"
git push
```

GitHub Actions는 macOS / Windows / Linux에서 테스트합니다.

## API

### `GET /api/places`
지원 장소 목록.

### `GET /api/city?place=yeouido`
정규화된 원천 데이터. 디버깅/검증용.

### `GET /api/verdict?place=yeouido`
제품이 실제 소비하는 endpoint. `place + data metadata + verdict`를 반환합니다. 추천 판단은 서버에서 한 번만 실행됩니다.

## 테스트

```bash
npm test
```

현재 엔진/서울 파서/KMA 파서/웹 제품 계약 회귀 테스트 15개.

## 바로 다음 순서

1. 서울 열린데이터광장 키로 6곳 실제 응답 fixture 확보
2. 실제 payload 기반 parser regression test 추가
3. 6개 공원 live verdict를 하루 동안 수동 QC
4. 추천창과 실제 혼잡/강수 결과 비교용 evaluation script 추가
5. 공개 배포 후 2-second / decision / return test
6. 검증 뒤에만 `오늘 어디 한강 가지?`, 러닝/산책 등으로 확장

**지금은 기능 수보다 판정 신뢰성이 병목입니다.**
