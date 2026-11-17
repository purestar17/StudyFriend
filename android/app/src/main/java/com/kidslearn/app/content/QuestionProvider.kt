package com.kidslearn.app.content

import com.kidslearn.app.data.Subject

object QuestionProvider {
    fun session(subject: Subject, level: Int, count: Int): List<Question> {
        val out = mutableListOf<Question>()
        var tries = 0
        while (out.size < count && tries < count * 20) {
            tries++
            val q = one(subject, level)
            // 같은 문제가 한 세션에 두 번 나오지 않게
            if (out.none { it.big == q.big && it.prompt == q.prompt && it.answer == q.answer }) out += q
        }
        return out
    }

    fun one(subject: Subject, level: Int): Question = when (subject) {
        Subject.MATH -> MathGenerator.generate(level)
        Subject.HANJA -> HanjaBank.generate(level)
        Subject.ENGLISH_WORD -> EnglishBank.word(level)
        Subject.ENGLISH_TALK -> EnglishBank.talk(level)
        Subject.KOREAN -> KoreanBank.generate(level)
    }
}
