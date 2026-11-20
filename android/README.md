# 공부 친구 Android 앱 (0.4.1)

웹 버전(`../web`)을 앱 안에 그대로 넣은 앱입니다. 학습 화면은 인터넷 없이 열리고,
여기에 **학습 시간표 자동 실행과 화면 잠금**(2단계)이 더해졌습니다.

## 학습 시간표와 잠금
- 관리자 모드 → **학습 시간표** 탭에서 요일·시각(여러 개 가능)과 **요일별 과제**(과목별 몇 회)를 정합니다.
- 정한 시각이 되면 앱이 저절로 켜지고 화면이 잠깁니다. 홈 버튼을 눌러도, 화면을 껐다 켜도 이 앱이 나옵니다.
- 오늘의 과제를 다 하면(과목마다 정한 횟수만큼 끝까지 풀기) 잠금이 바로 풀립니다.
- 과제를 못 마쳐도 정한 시간이 끝나면 저절로 풀립니다.
- 잠금 중에도 **ChatGPT 앱**(영어 회화)은 열 수 있습니다. 다른 앱, 설정, 알림창은 막힙니다.
- 관리자는 비밀번호를 넣고 **지금 잠금 풀기**로 언제든 풀 수 있습니다.
- 전원 메뉴(끄기·다시 시작)와 기기 화면 잠금(비밀번호)은 그대로 둡니다.

## 설치
1. `공부친구-0.4.1-debug.apk`를 태블릿으로 옮겨 설치합니다(출처를 알 수 없는 앱 허용).
   0.1.0이 깔려 있으면 먼저 지워 주세요(서명이 달라 업데이트가 안 될 수 있음).
2. 앱을 열고 관리자 모드(처음 비밀번호 0000)에서 시간표를 정합니다.

### 기기 관리자로 지정 (잠금을 제대로 쓰려면 꼭, 컴퓨터로 한 번만)
기기 관리자(Device Owner)가 아니면 학습 시간에 **알림**만 오고, 아이가 '화면 고정'을 눌러야 잠깁니다(풀기도 쉬움).
1. 태블릿 **설정 → 계정**에서 모든 계정(구글·삼성 계정 포함)을 잠시 삭제합니다. 계정이 있으면 지정이 안 됩니다.
2. **설정 → 태블릿 정보 → 소프트웨어 정보 → 빌드 번호**를 7번 눌러 개발자 옵션을 켜고, **USB 디버깅**을 켭니다.
3. 컴퓨터에 [Android platform-tools](https://developer.android.com/tools/releases/platform-tools)를 받고, USB로 연결한 뒤:
   ```
   adb shell dpm set-device-owner com.kidslearn.app/.LockAdminReceiver
   ```
   `Success: Device owner set to package ...`가 나오면 됩니다.
4. 계정을 다시 추가합니다. USB 디버깅은 꺼도 됩니다.
5. 안드로이드 12 이상에서 정확한 시각에 켜려면 관리자 → 학습 시간표 → **허용하러 가기**를 눌러 "알람 및 리마인더"를 허용합니다.
   (허용하지 않으면 몇 분 늦게 켜질 수 있습니다.)

### 앱 지우기
기기 관리자 앱은 바로 지워지지 않습니다. 관리자 → 학습 시간표 → **기기 관리자 해제**를 두 번 누른 뒤 지우세요.

## AI 선생님 (ChatGPT 계정 연결)
1. 학습 시간이 아닐 때(잠금이 풀린 상태) 관리자 → **AI 설정** → **ChatGPT로 로그인**을 누릅니다.
2. 브라우저에서 ChatGPT에 로그인하고 정액제 사용을 **허용**합니다. Go·Plus·Pro 플랜이어야 합니다.
3. 공부 친구로 돌아오면 모델을 고릅니다(mini 같은 가벼운 모델 추천).
- API 키가 필요 없고, ChatGPT 정액제 사용량으로 계산됩니다. 한도는 ChatGPT 설정 › 사용량에서 앱별로 정할 수 있습니다.
- 로그인 정보는 Android 보안 저장소의 열쇠로 잠가 이 태블릿에만 두고, 1시간마다 저절로 새로 받습니다. ChatGPT 대화 기록은 볼 수 없습니다.
- OpenAI의 이 기능은 아직 미리보기 단계라 바뀔 수 있습니다.

## 직접 빌드
```
./gradlew assembleDebug        # ../web 을 자동으로 복사해 넣음
./gradlew testDebugUnitTest    # 시간표 계산 검사
```

## 구조
- `MainActivity.kt` WebView(https://appassets.androidplatform.net/assets/web/index.html)와 웹에서 부르는 기능 `StudyFriendApp`
  (`speak` 발음, `copy`, `getStatus`, `setSchedule`, `studyComplete`, `adminRelease`, `openExternal`, `clearDeviceOwner`, `saveImage`, `aiStatus`·`aiSignIn`·`aiSignOut`·`aiModels`·`aiChat`)
- `Schedule.kt` 시간표 계산 (웹의 `schedule.js`와 같은 규칙)
- `Lock.kt` 시간표 저장, 알람, 기기 관리자·잠금(Lock Task)·학습 시간 홈 화면 지정
- `Receivers.kt` 알람·부팅·기기 관리자 수신
- `ChatGpt.kt` ChatGPT 계정 로그인(127.0.0.1 수신, PKCE, ID 토큰 서명 확인), 토큰 잠가 보관·갱신·해제, Responses API 흘려 받기. 사용자의 HaniClinicApp `chatgpt.ts`와 같은 흐름
- 과제 완료 판단은 웹 쪽(학습 기록)에서 하고, 앱은 지금 시간 칸이 맞을 때만 잠금을 풉니다.
