# 공부 친구 웹 버전

Android 앱(`android/`)과 같은 문제와 규칙을 브라우저에서 바로 써 볼 수 있게 옮긴 테스트용 버전입니다. 빌드 과정 없이 파일 그대로 동작합니다.

- 주소: main 브랜치에 반영되면 GitHub Pages로 자동 배포됩니다 (`https://purestar17.github.io/StudyFriend/`).
- 로컬에서 보기: `web/index.html`을 브라우저로 열면 됩니다.
- 학습 기록과 설정은 그 브라우저에만 저장됩니다.
- 예약 시간 자동 실행과 화면 잠금은 Android 앱에서만 됩니다.

## 파일
- `content-data.js` 문제 데이터 (Android `content/` 폴더와 같은 내용)
- `logic.js` 문제 생성, 채점, 레벨 자동 조정 규칙
- `math-workbook.js` 수학 문제 (학년별 단원, 심화 사고력·응용력)
- `talk-topics.js` 영어 회화 "오늘의 대화" 주제와 미리 볼 표현
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
- 학년은 관리자가 정합니다(자동 레벨 조정은 기본 꺼짐, 관리자 모드에서 켤 수 있음).
- 학생은 수학 메뉴에서 단원을 골라 풉니다. 학년마다 교과 단원을 4~8개로 묶었습니다 (`MATH_UNITS`).
- 학년마다 심화 문제 두 가지: 사고력(규칙 추론, 거꾸로 생각하기, 수 카드 등)과 응용력(여러 단계 문장제) (`MATH_CHALLENGE`).
- 객관식은 보기를 고른 뒤 확인을 눌러야 채점됩니다.
- 숫자 답은 펜(손글씨)으로 쓰거나 키패드로 입력합니다. 관리자 모드 > 일반, 또는 문제 화면 아래에서 바꿀 수 있습니다.
- 손글씨 인식은 $P 점구름 인식기로 기기 안에서만 처리합니다 (서버 전송 없음). 소수점은 작은 점으로 씁니다.

## 영어 회화
- 관리자가 '오늘의 대화 주제'를 고르거나 직접 씁니다 (정하지 않으면 날마다 추천 주제).
- 학생 화면에서 주제와 표현을 미리 보고, 버튼을 누르면 ChatGPT(`chatgpt.com/?q=`)가 시작 문장과 함께 열립니다. 시작 문장은 클립보드에도 복사됩니다.
- 관리자 모드에서 연결 주소를 정할 수 있습니다: 비우면 새 채팅(규칙+주제를 함께 보냄), 맞춤 GPT·프로젝트 주소면 그 지침을 쓰는 새 대화에 주제만 보냄, 특정 채팅(`/c/…`) 주소면 그 대화방으로 이동하고 주제 문장은 복사됨.
- '대화를 끝내는 말'(기본 "Goodbye, teacher!")을 학생이 말하면 ChatGPT가 배운 표현 3개를 정리하고 대화를 마치도록 규칙에 넣습니다. 앱이 ChatGPT 대화를 직접 닫거나 내용을 받아 올 수는 없습니다.
- ChatGPT는 보안 설정 때문에 다른 페이지 안에 넣어(iframe) 보여 줄 수 없어서 새 창(앱)으로 엽니다. 돌아와서 '대화를 마쳤어요'를 누르면 대화 시간이 기록됩니다.

## 테스트
`node web/tests/logic.test.js`
