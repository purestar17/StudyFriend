package com.kidslearn.app.content

/**
 * 한 문제. [choices]가 null이면 숫자 키패드로 답을 입력한다.
 * [speak]가 있으면 영어 발음 듣기 버튼이 나온다.
 */
data class Question(
    val prompt: String,
    val big: String? = null,
    val choices: List<String>? = null,
    val answer: String,
    val speak: String? = null,
    val explain: String? = null,
)

/** 정답과 오답 후보로 4지선다 문제를 만든다. */
internal fun choiceQuestion(
    prompt: String,
    answer: String,
    pool: List<String>,
    big: String? = null,
    speak: String? = null,
    explain: String? = null,
    count: Int = 4,
): Question {
    val wrong = pool.filter { it != answer }.distinct().shuffled().take(count - 1)
    return Question(prompt, big, (wrong + answer).shuffled(), answer, speak, explain)
}
