package com.kidslearn.app.content

object EnglishBank {
    private fun parse(s: String): List<Pair<String, String>> =
        s.trim().lines().map { it.trim() }.filter { it.isNotEmpty() }.map {
            val (e, k) = it.split("=", limit = 2); e.trim() to k.trim()
        }

    val words: List<List<Pair<String, String>>> = listOf(
        parse("""
            apple = 사과
            banana = 바나나
            cat = 고양이
            dog = 개
            bird = 새
            fish = 물고기
            book = 책
            pencil = 연필
            bag = 가방
            desk = 책상
            chair = 의자
            door = 문
            red = 빨간색
            blue = 파란색
            yellow = 노란색
            green = 초록색
            one = 하나
            two = 둘
            three = 셋
            mother = 엄마
            father = 아빠
            sister = 여자 형제
            brother = 남자 형제
            milk = 우유
            water = 물
            sun = 해
            moon = 달
            star = 별
            tree = 나무
            flower = 꽃
        """),
        parse("""
            run = 달리다
            jump = 뛰어오르다
            swim = 수영하다
            sing = 노래하다
            dance = 춤추다
            read = 읽다
            write = 쓰다
            eat = 먹다
            drink = 마시다
            sleep = 자다
            happy = 행복한
            sad = 슬픈
            big = 큰
            small = 작은
            hot = 더운
            cold = 추운
            fast = 빠른
            slow = 느린
            school = 학교
            teacher = 선생님
            friend = 친구
            family = 가족
            morning = 아침
            night = 밤
            rain = 비
            snow = 눈
            window = 창문
            kitchen = 부엌
            breakfast = 아침 식사
            weather = 날씨
        """),
        parse("""
            library = 도서관
            hospital = 병원
            museum = 박물관
            village = 마을
            country = 나라
            question = 질문
            answer = 대답
            history = 역사
            science = 과학
            music = 음악
            weekend = 주말
            holiday = 휴일
            vegetable = 채소
            dangerous = 위험한
            beautiful = 아름다운
            important = 중요한
            different = 다른
            difficult = 어려운
            interesting = 재미있는
            remember = 기억하다
            forget = 잊다
            borrow = 빌리다
            arrive = 도착하다
            practice = 연습하다
            travel = 여행하다
            invite = 초대하다
            decide = 결정하다
            healthy = 건강한
            quiet = 조용한
            careful = 조심하는
        """),
    )

    fun word(level: Int): Question {
        val bank = words[(level - 1).coerceIn(0, words.lastIndex)]
        val (en, ko) = bank.random()
        return if (Math.random() < 0.6) {
            choiceQuestion("이 단어의 뜻은?", ko, bank.map { it.second }, big = en, speak = en,
                explain = "$en = $ko")
        } else {
            choiceQuestion("'$ko'을(를) 영어로 하면?", en, bank.map { it.first }, speak = en,
                explain = "$ko = $en")
        }
    }

    /** 상대의 말과 알맞은 대답 */
    private class Talk(val line: String, val reply: String, val wrong: List<String>, val ko: String)

    private val talks: List<List<Talk>> = listOf(
        listOf(
            Talk("Hello!", "Hi!", listOf("Thank you.", "Goodbye.", "I'm nine."), "안녕!"),
            Talk("How are you?", "I'm fine, thank you.", listOf("I'm Mina.", "It's a cat.", "Yes, it is."), "잘 지내?"),
            Talk("What's your name?", "My name is Mina.", listOf("I'm fine.", "It's red.", "See you."), "이름이 뭐야?"),
            Talk("How old are you?", "I'm nine years old.", listOf("I'm happy.", "It's an apple.", "Good morning."), "몇 살이야?"),
            Talk("Nice to meet you.", "Nice to meet you, too.", listOf("You're welcome.", "I'm sorry.", "It's blue."), "만나서 반가워."),
            Talk("Thank you.", "You're welcome.", listOf("Hello.", "I'm ten.", "It's a dog."), "고마워."),
            Talk("Goodbye!", "See you later!", listOf("Nice to meet you.", "I'm fine.", "Yes, I do."), "잘 가!"),
            Talk("What color is it?", "It's yellow.", listOf("It's a pen.", "I'm eight.", "Good night."), "무슨 색이야?"),
            Talk("What is this?", "It's a book.", listOf("It's green.", "I'm fine.", "Me, too."), "이건 뭐야?"),
            Talk("I'm sorry.", "That's okay.", listOf("Thank you.", "Good morning.", "It's big."), "미안해."),
        ),
        listOf(
            Talk("Do you like pizza?", "Yes, I do.", listOf("Yes, it is.", "I'm eleven.", "It's Monday."), "피자 좋아해?"),
            Talk("Can you swim?", "Yes, I can.", listOf("Yes, I am.", "It's sunny.", "At seven."), "수영할 수 있어?"),
            Talk("How's the weather?", "It's sunny.", listOf("It's a desk.", "I'm happy.", "Yes, I can."), "날씨 어때?"),
            Talk("What time is it?", "It's three o'clock.", listOf("It's Tuesday.", "It's a clock.", "I'm fine."), "몇 시야?"),
            Talk("What day is it today?", "It's Friday.", listOf("It's two o'clock.", "It's rainy.", "No, I don't."), "오늘 무슨 요일이야?"),
            Talk("Where is my bag?", "It's on the desk.", listOf("It's blue.", "Yes, it is.", "I'm ten."), "내 가방 어디 있어?"),
            Talk("What do you want?", "I want some juice.", listOf("I'm in the park.", "It's hot.", "Yes, you can."), "뭘 원해?"),
            Talk("Let's play soccer.", "Sounds good!", listOf("I'm sorry to hear that.", "It's mine.", "At nine."), "축구하자."),
            Talk("Whose pencil is this?", "It's mine.", listOf("It's long.", "I'm fine.", "On Sunday."), "이 연필 누구 거야?"),
            Talk("Are you hungry?", "Yes, I am.", listOf("Yes, I do.", "It's cold.", "No, it isn't mine."), "배고프니?"),
        ),
        listOf(
            Talk("What are you doing?", "I'm reading a book.", listOf("I read a book yesterday.", "It's mine.", "Yes, I can."), "뭐 하고 있어?"),
            Talk("What did you do last weekend?", "I visited my grandmother.", listOf("I'll visit my grandmother.", "I'm visiting now.", "It's Saturday."), "지난 주말에 뭐 했어?"),
            Talk("What will you do tomorrow?", "I'm going to go hiking.", listOf("I went hiking.", "I'm hiking now.", "It was fun."), "내일 뭐 할 거야?"),
            Talk("How can I get to the library?", "Go straight and turn left.", listOf("It's a big library.", "I like books.", "At three o'clock."), "도서관에 어떻게 가?"),
            Talk("What's wrong?", "I have a headache.", listOf("That's right.", "I'm twelve.", "It's on the table."), "무슨 일이야?"),
            Talk("What do you want to be?", "I want to be a scientist.", listOf("I want some water.", "I was a student.", "It's interesting."), "뭐가 되고 싶어?"),
            Talk("Why are you happy?", "Because I got a present.", listOf("Yes, I am.", "At the park.", "With my friend."), "왜 기분이 좋아?"),
            Talk("May I help you?", "Yes, I'm looking for a cap.", listOf("No, I can't.", "It's my cap.", "I helped him."), "도와드릴까요?"),
            Talk("How much is it?", "It's five thousand won.", listOf("It's five o'clock.", "I have five books.", "It's very big."), "얼마예요?"),
            Talk("Which season do you like?", "I like winter.", listOf("It's cold today.", "I'm in winter camp.", "Yes, I do."), "어느 계절을 좋아해?"),
        ),
    )

    fun talk(level: Int): Question {
        val t = talks[(level - 1).coerceIn(0, talks.lastIndex)].random()
        return Question(
            prompt = "알맞은 대답을 골라 보세요",
            big = t.line,
            choices = (t.wrong + t.reply).shuffled(),
            answer = t.reply,
            speak = t.line,
            explain = "${t.line} (${t.ko}) → ${t.reply}",
        )
    }
}
