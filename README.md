# 딱지왕 키우기

추억의 딱지치기로 동네 꼬마에서 전국 딱지왕까지 올라가는 모바일 웹 게임입니다. 빌드 과정이 없는 순수 HTML5 Canvas + ES 모듈이며, PWA로 설치하고 오프라인에서도 할 수 있습니다.

## 게임 구성

- **대결**: 가위바위보로 선공을 정하고 번갈아 칩니다.
  - 내 차례에는 화면을 꾹 눌러 힘을 모으고, 흔들리는 조준점이 가운데 올 때 손을 뗍니다.
  - 상대 차례에는 고리가 딱지에 겹치는 순간 터치해서 버팁니다.
  - 상대 딱지를 모두 뒤집으면 이깁니다.
- **판정**: 불스아이(뒤집기), 이너링(기울어짐 누적), 빗나감, 헛스윙이 있습니다. 크리티컬, 파워 게이트, 기울어짐 스택, 딱지 방어력이 판정에 반영됩니다. 6라운드를 넘기면 결전 보정이 붙습니다.
- **진행**: 6개 지역에 상대 30명이 있고, 지역마다 보스가 있습니다. 4지역과 6지역에는 돌풍이 붑니다. 딱지왕을 이기면 엔딩과 함께 무한 도장깨기가 열립니다.
- **성장**:
  - 스탯 강화(힘·집중·운, 각 6레벨)
  - 소모 아이템 5종
  - 딱지 42종 수집과 장착(방어력과 스탯 보너스)
  - 문방구 뽑기(중복은 코인 환급)
- **리텐션**: 7일 출석 보상(7일차 뽑기권), 도전과제 21종, 광고 보상(홈 무료 코인, 결과 2배, 출석 2배, 하루 1회 무료 뽑기).

## 실행

```bash
python3 -m http.server 8000   # 또는 아무 정적 서버
# http://localhost:8000
```

배포는 정적 호스팅(GitHub Pages 등)에 저장소 그대로 올리면 됩니다. 모든 경로가 상대 경로라 하위 경로에 올려도 동작합니다.

## 배포 절차

1. `python3 tools/stamp.py`를 실행합니다. 이 스크립트가 다음을 한 번에 갱신합니다.
   - `assets/version.json`
   - `index.html`의 `window.__V`
   - JS와 CSS의 `?v=`
   - `sw.js`의 `VERSION`
2. 커밋하고 푸시합니다.
3. 이미 열린 게임은 `version.json`을 확인해 새 버전으로 스스로 갱신합니다.

## 테스트

```bash
node tools/test-aim.mjs          # 판정 코어 단위 테스트
node tools/sim-balance.mjs 120   # 밸런스 시뮬레이션 (사람 반응 오차 120ms 가정)
node tools/smoke-browser.mjs out # Playwright로 전체 화면 순회 + 스크린샷
```

## 수익화 연동

광고와 분석 연동 지점은 `js/platform.js` 한 곳뿐입니다.

- **보상형 광고**: 페이지에서 게임 스크립트보다 먼저 `window.DDAKJI_ADS = { ready(): boolean, show(placement): Promise<boolean> }`를 정의합니다. `show`가 `true`로 끝날 때만 보상을 줍니다. 정의하지 않으면 2초짜리 개발용 가짜 광고가 나옵니다.
  - 광고 위치 이름: `home_coin`, `result_x2`, `daily_x2`, `gacha_free`
- **분석**: 모든 이벤트가 `window.dataLayer`(GTM/GA4)로 push되고, `window.DDAKJI_TRACK(event, props)`가 있으면 그 함수도 호출합니다.
  - 주요 이벤트: `app_open`, `screen`, `battle_start`, `battle_end`, `upgrade`, `gacha`, `buy_item`, `daily_claim`, `achievement`, `ad_rewarded_*`
- **개인정보처리방침**: `privacy.html`. 실제로 연동한 광고·분석 업체 목록을 2항에 추가해야 합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `js/aim.js` | 조준(리사주), 차지, 판정 코어. 단위 테스트 대상 |
| `js/ai.js` | 상대 AI 타격 모델, 버티기 판정 |
| `js/data.js` | 지역, 상대, 딱지, 아이템, 비용, 도전과제 데이터 |
| `js/game.js` | 경제·진행 규칙(보상, 강화, 뽑기, 출석, 무한 모드) |
| `js/save.js` | localStorage 저장. 기본값 병합으로 구버전 세이브와 호환 |
| `js/scene-*.js` | 화면(타이틀, 홈, 지도, 대결, 결과, 강화, 문방구, 딱지첩, 도전과제) |
| `js/gfx.js`, `js/ui.js` | 절차적 그래픽, 즉시모드 UI |
| `js/audio.js` | WebAudio 합성 효과음과 배경음악 |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |

## 밸런스 메모

`tools/sim-balance.mjs`는 적정 성장(지역 r에서 스탯 r-1레벨)을 가정하고 사람 반응 오차 120ms 봇으로 돌립니다. 이 조건에서 첫 지역 승률은 약 90%이고, 후반 보스로 갈수록 약 55~68%까지 내려갑니다. 상대 스탯 곡선은 `data.js`의 `OPPONENTS`에서, 비용은 `STAT_COST`, `GACHA`, `ITEM_INFO`에서 조정합니다.
