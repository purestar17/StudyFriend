package com.kidslearn.app.content

/** 한자와 훈음. 레벨 1=8급, 2=7급, 3=6급 (일부). */
object HanjaBank {
    private fun parse(s: String): List<Pair<String, String>> =
        s.trim().lines().map { it.trim() }.filter { it.isNotEmpty() }.map {
            val (h, m) = it.split(" ", limit = 2); h to m
        }

    val levels: List<List<Pair<String, String>>> = listOf(
        parse("""
            一 한 일
            二 두 이
            三 석 삼
            四 넉 사
            五 다섯 오
            六 여섯 륙
            七 일곱 칠
            八 여덟 팔
            九 아홉 구
            十 열 십
            日 날 일
            月 달 월
            火 불 화
            水 물 수
            木 나무 목
            金 쇠 금
            土 흙 토
            山 메 산
            人 사람 인
            大 큰 대
            小 작을 소
            中 가운데 중
            父 아비 부
            母 어미 모
            兄 형 형
            弟 아우 제
            女 계집 녀
            王 임금 왕
            白 흰 백
            靑 푸를 청
            東 동녘 동
            西 서녘 서
            南 남녘 남
            北 북녘 북
            門 문 문
            生 날 생
            年 해 년
            學 배울 학
            校 학교 교
            敎 가르칠 교
            先 먼저 선
            室 집 실
            長 긴 장
            國 나라 국
            韓 한국 한
            民 백성 민
            軍 군사 군
            萬 일만 만
            外 바깥 외
            寸 마디 촌
        """),
        parse("""
            家 집 가
            歌 노래 가
            間 사이 간
            江 강 강
            車 수레 차
            空 빌 공
            工 장인 공
            記 기록할 기
            氣 기운 기
            男 사내 남
            內 안 내
            農 농사 농
            答 대답 답
            道 길 도
            冬 겨울 동
            動 움직일 동
            同 한가지 동
            登 오를 등
            來 올 래
            力 힘 력
            老 늙을 로
            里 마을 리
            林 수풀 림
            立 설 립
            面 낯 면
            名 이름 명
            文 글월 문
            問 물을 문
            物 물건 물
            百 일백 백
            事 일 사
            算 셈 산
            上 윗 상
            下 아래 하
            色 빛 색
            夕 저녁 석
            手 손 수
            足 발 족
            心 마음 심
            安 편안 안
            語 말씀 어
            午 낮 오
            右 오른 우
            左 왼 좌
            有 있을 유
            入 들 입
            出 날 출
            子 아들 자
            字 글자 자
            自 스스로 자
            電 번개 전
            前 앞 전
            後 뒤 후
            正 바를 정
            地 따 지
            天 하늘 천
            千 일천 천
            川 내 천
            草 풀 초
            村 마을 촌
            春 봄 춘
            夏 여름 하
            秋 가을 추
            花 꽃 화
            話 말씀 화
            海 바다 해
            休 쉴 휴
            孝 효도 효
        """),
        parse("""
            各 각각 각
            角 뿔 각
            感 느낄 감
            強 강할 강
            開 열 개
            京 서울 경
            古 예 고
            苦 쓸 고
            公 공평할 공
            果 실과 과
            科 과목 과
            光 빛 광
            交 사귈 교
            球 공 구
            近 가까울 근
            今 이제 금
            急 급할 급
            多 많을 다
            短 짧을 단
            代 대신할 대
            待 기다릴 대
            圖 그림 도
            讀 읽을 독
            童 아이 동
            頭 머리 두
            樂 즐길 락
            綠 푸를 록
            路 길 로
            明 밝을 명
            目 눈 목
            聞 들을 문
            美 아름다울 미
            米 쌀 미
            病 병 병
            服 옷 복
            本 근본 본
            分 나눌 분
            書 글 서
            石 돌 석
            席 자리 석
            線 줄 선
            雪 눈 설
            成 이룰 성
            速 빠를 속
            習 익힐 습
            勝 이길 승
            始 비로소 시
            身 몸 신
            新 새 신
            失 잃을 실
            愛 사랑 애
            夜 밤 야
            野 들 야
            弱 약할 약
            藥 약 약
            陽 볕 양
            言 말씀 언
            永 길 영
            溫 따뜻할 온
            用 쓸 용
            勇 날랠 용
            遠 멀 원
            音 소리 음
            飮 마실 음
            意 뜻 의
            衣 옷 의
            作 지을 작
            昨 어제 작
            才 재주 재
            庭 뜰 정
            朝 아침 조
            族 겨레 족
            晝 낮 주
            集 모을 집
            窓 창 창
            淸 맑을 청
            體 몸 체
            親 친할 친
            太 클 태
            通 통할 통
            風 바람 풍
            合 합할 합
            幸 다행 행
            行 다닐 행
            向 향할 향
            形 모양 형
            和 화할 화
            黃 누를 황
            會 모일 회
            訓 가르칠 훈
        """),
    )

    fun generate(level: Int): Question {
        val bank = levels[(level - 1).coerceIn(0, levels.lastIndex)]
        val (hanja, meaning) = bank.random()
        return if (Math.random() < 0.7) {
            choiceQuestion("이 한자의 뜻과 소리는?", meaning, bank.map { it.second }, big = hanja,
                explain = "$hanja : $meaning")
        } else {
            choiceQuestion("'$meaning'에 알맞은 한자는?", hanja, bank.map { it.first },
                explain = "$hanja : $meaning")
        }
    }
}
