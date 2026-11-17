# 공부 친구 웹 버전

Android 앱(`android/`)과 같은 문제와 규칙을 브라우저에서 바로 써 볼 수 있게 옮긴 테스트용 버전입니다. 빌드 과정 없이 파일 그대로 동작합니다.

- 주소: main 브랜치에 반영되면 GitHub Pages로 자동 배포됩니다 (`https://purestar17.github.io/StudyFriend/`).
- 로컬에서 보기: `web/index.html`을 브라우저로 열면 됩니다.
- 학습 기록과 설정은 그 브라우저에만 저장됩니다.
- 예약 시간 자동 실행과 화면 잠금은 Android 앱에서만 됩니다.

## 파일
- `content-data.js` 문제 데이터 (Android `content/` 폴더와 같은 내용)
- `logic.js` 문제 생성, 채점, 레벨 자동 조정 규칙
- `app.js` 화면 (홈, 문제, 결과, 관리자 비밀번호, 관리자 모드)
- `style.css` 디자인

문제를 추가하거나 고칠 때는 Android 쪽 `content/*.kt`와 `content-data.js`를 함께 바꿔야 합니다.

## 한자 학습
- 획순 데이터: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) 기반 `hanzi-writer-data` (Arphic Public License, `strokes/ARPHICPL.TXT`). 중국 표준 획순을 따르므로 한국 교과서 획순과 다른 글자가 일부 있을 수 있습니다. 敎·飮·窓·淸 4자는 데이터가 없어 획순 학습에서 빠집니다.
- 쓰기 연습: [Hanzi Writer](https://hanziwriter.org) (MIT, `vendor/`).
- 시험형 문제 데이터: `hanja-exam-data.js` (한자어, 반대자, 사자성어)

## 테스트
`node web/tests/logic.test.js`
