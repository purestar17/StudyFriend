package com.kidslearn.app.content

import kotlin.random.Random

/** 학년(레벨 1~6)에 맞는 연산 문제를 자동으로 만든다. 답은 항상 0 이상의 정수. */
object MathGenerator {
    fun generate(level: Int, rnd: Random = Random.Default): Question = when (level.coerceIn(1, 6)) {
        1 -> level1(rnd)
        2 -> level2(rnd)
        3 -> level3(rnd)
        4 -> level4(rnd)
        5 -> level5(rnd)
        else -> level6(rnd)
    }

    private fun q(expr: String, ans: Int, prompt: String = "계산해 보세요") =
        Question(prompt = prompt, big = "$expr = ?", answer = ans.toString())

    private fun level1(r: Random): Question = if (r.nextBoolean()) {
        val a = r.nextInt(1, 10); val b = r.nextInt(1, 11)
        q("$a + $b", a + b)
    } else {
        val a = r.nextInt(5, 20); val b = r.nextInt(1, a + 1)
        q("$a - $b", a - b)
    }

    private fun level2(r: Random): Question = when (r.nextInt(3)) {
        0 -> { val a = r.nextInt(10, 90); val b = r.nextInt(10, 100 - a); q("$a + $b", a + b) }
        1 -> { val a = r.nextInt(20, 100); val b = r.nextInt(10, a); q("$a - $b", a - b) }
        else -> { val a = r.nextInt(2, 10); val b = r.nextInt(1, 10); q("$a × $b", a * b, "구구단") }
    }

    private fun level3(r: Random): Question = when (r.nextInt(4)) {
        0 -> { val a = r.nextInt(100, 900); val b = r.nextInt(100, 1000 - a); q("$a + $b", a + b) }
        1 -> { val a = r.nextInt(200, 1000); val b = r.nextInt(100, a); q("$a - $b", a - b) }
        2 -> { val a = r.nextInt(11, 100); val b = r.nextInt(2, 10); q("$a × $b", a * b) }
        else -> { val b = r.nextInt(2, 10); val c = r.nextInt(2, 10); q("${b * c} ÷ $b", c) }
    }

    private fun level4(r: Random): Question = when (r.nextInt(3)) {
        0 -> { val a = r.nextInt(11, 100); val b = r.nextInt(11, 100); q("$a × $b", a * b) }
        1 -> { val b = r.nextInt(2, 10); val c = r.nextInt(12, 100); q("${b * c} ÷ $b", c) }
        else -> { val b = r.nextInt(11, 30); val c = r.nextInt(2, 20); q("${b * c} ÷ $b", c) }
    }

    private fun level5(r: Random): Question = when (r.nextInt(4)) {
        0 -> { val a = r.nextInt(2, 30); val b = r.nextInt(2, 10); val c = r.nextInt(2, 10)
            q("$a + $b × $c", a + b * c, "곱셈을 먼저 계산해요") }
        1 -> { val a = r.nextInt(2, 15); val b = r.nextInt(2, 15); val c = r.nextInt(2, 9)
            q("($a + $b) × $c", (a + b) * c, "괄호 안을 먼저 계산해요") }
        2 -> { val g = r.nextInt(2, 10); val x = r.nextInt(1, 6); var y = r.nextInt(1, 6)
            while (gcd(x, y) != 1 || x == y) y = r.nextInt(1, 7)
            Question("두 수의 최대공약수는?", big = "${g * x}, ${g * y}", answer = g.toString()) }
        else -> { val a = r.nextInt(2, 10); var b = r.nextInt(2, 13)
            while (b == a) b = r.nextInt(2, 13)
            Question("두 수의 최소공배수는?", big = "$a, $b", answer = (a / gcd(a, b) * b).toString()) }
    }

    private fun level6(r: Random): Question = when (r.nextInt(4)) {
        0 -> { val a = r.nextInt(101, 1000); val b = r.nextInt(11, 100); q("$a × $b", a * b) }
        1 -> { val p = listOf(10, 20, 25, 50, 75).random(r); val base = r.nextInt(1, 20) * 4 * 5
            Question("백분율 계산", big = "$base 의 $p% = ?", answer = (base * p / 100).toString()) }
        2 -> { val a = r.nextInt(2, 20); Question("제곱 계산", big = "$a × $a = ?", answer = (a * a).toString()) }
        else -> { val b = r.nextInt(12, 40); val c = r.nextInt(11, 60); q("${b * c} ÷ $b", c) }
    }

    private tailrec fun gcd(a: Int, b: Int): Int = if (b == 0) a else gcd(b, a % b)
}
