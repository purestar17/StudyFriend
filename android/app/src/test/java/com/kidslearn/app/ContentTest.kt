package com.kidslearn.app

import com.kidslearn.app.content.HanjaBank
import com.kidslearn.app.content.QuestionProvider
import com.kidslearn.app.data.Subject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ContentTest {
    @Test
    fun everySubjectAndLevelProducesValidQuestions() {
        for (s in Subject.entries) for (lv in 1..s.maxLevel) repeat(300) {
            val q = QuestionProvider.one(s, lv)
            if (q.choices == null) {
                val n = q.answer.toIntOrNull()
                assertTrue("$s $lv numeric answer: ${q.big} = ${q.answer}", n != null && n >= 0)
            } else {
                assertEquals("$s $lv choices: $q", 4, q.choices!!.distinct().size)
                assertTrue("$s $lv answer in choices: $q", q.answer in q.choices!!)
            }
        }
    }

    @Test
    fun mathAnswersAreCorrect() {
        for (lv in 1..6) repeat(500) {
            val q = QuestionProvider.one(Subject.MATH, lv)
            val expr = q.big!!.removeSuffix(" = ?")
            val m = Regex("""^(\d+) ([+\-×÷]) (\d+)$""").find(expr) ?: return@repeat
            val (a, op, b) = m.destructured
            val x = a.toInt(); val y = b.toInt()
            val expected = when (op) { "+" -> x + y; "-" -> x - y; "×" -> x * y; else -> { assertEquals(0, x % y); x / y } }
            assertEquals(expr, expected.toString(), q.answer)
        }
    }

    @Test
    fun noDuplicateHanja() {
        val all = HanjaBank.levels.flatten().map { it.first }
        assertEquals(all.toSet().size, all.size)
    }

    @Test
    fun sessionHasNoRepeats() {
        for (s in Subject.entries) {
            val list = QuestionProvider.session(s, 1, 10)
            assertEquals(10, list.size)
        }
    }
}
