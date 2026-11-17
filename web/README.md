# 공부 친구 웹 버전

Android 앱(`android/`)과 같은 문제와 규칙을 브라우저에서 바로 써 볼 수 있게 옮긴 테스트용 버전입니다. 빌드 과정 없이 파일 그대로 동작합니다.

- 주소: main 브랜치에 반영되면 GitHub Pages로 자동 배포됩니다 (`https://purestar17.github.io/StudyFriend/`).
- 로컬에서 보기: `web/index.html`을 브라우저로 열면 됩니다.
- 학습 기록과 설정은 그 브라우저에만 저장됩니다.
- 예약 시간 자동 실행과 화면 잠금은 Android 앱에서만 됩니다.

## 파일
- `content-data.js` 문제 데이터 (Android `content/` 폴더와 같은 내용)
- `logic.js` 문제 생성, 채점, 레벨 자동 조정 규칙
- `math-workbook.js` 수학 문제집형 문제 (학년별 단원 유형)
- `figures.js` 수학 그림 (시계, 수 모형, 도형, 분수, 각, 막대그래프, 넓이, 직육면체)
- `pen.js` 펜으로 쓴 숫자 답 읽기 (기기 안에서 동작)
- `app.js` 화면 (홈, 문제, 결과, 관리자 비밀번호, 관리자 모드)
- `style.css` 디자인

문제를 추가하거나 고칠 때는 Android 쪽 `content/*.kt`와 `content-data.js`를 함께 바꿔야 합니다.

## 한자 학습
- 급수별 한자: 한국어문회 한자능력검정시험 8급~4급 배정 한자 1,000자 (`content-data.js`, 8급·7급·6급·5급·4급Ⅱ·4급).
- 획순 데이터 (모두 한국식 획순, 급수별로 `strokes/levelN.json`에 묶음, Arphic Public License `strokes/ARPHICPL.TXT`):
  - 8급~5급: [animCJK](https://github.com/parsimonhi/animCJK) 한국 한자(svgsKo) (`strokes/COPYING-animCJK.txt`)
  - 4급Ⅱ·4급: [hanjamaster-kaiti-strokes](https://github.com/heyday07/hanjamaster-kaiti-strokes). 일부 글자는 한국식 자형 대체본(alt)을 썼고, 硏鄕鑛姉鬪 5자는 데이터가 없어 획순 학습에서 빠집니다.
- 쓰기 연습: [Hanzi Writer](https://hanziwriter.org) (MIT, `vendor/`).
- 시험형 문제 데이터: `hanja-exam-data.js` (한자어, 반대자, 사자성어)

## 수학
- 학년(레벨 1~6)마다 교과 단원에 맞춘 유형을 섞어 냅니다. 예: 1학년 시계 보기·수 모형·크기 비교, 3학년 분수·들이와 무게·원, 4학년 각·막대그래프·분수 덧셈, 5학년 약분·평균·넓이, 6학년 비율·비례배분·부피.
- 숫자 답은 펜(손글씨)으로 쓰거나 키패드로 입력합니다. 관리자 모드 > 일반, 또는 문제 화면 아래에서 바꿀 수 있습니다.
- 손글씨 인식은 $P 점구름 인식기로 기기 안에서만 처리합니다 (서버 전송 없음). 소수점은 작은 점으로 씁니다.

## 테스트
`node web/tests/logic.test.js`
