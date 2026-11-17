package com.kidslearn.app.data

enum class Subject(val title: String, val emoji: String, val maxLevel: Int, val levelLabels: List<String>) {
    MATH("수학", "🔢", 6, listOf("1학년", "2학년", "3학년", "4학년", "5학년", "6학년")),
    HANJA("한자", "漢", 3, listOf("8급", "7급", "6급")),
    ENGLISH_WORD("영어 단어", "🔤", 3, listOf("기초", "초급", "중급")),
    ENGLISH_TALK("영어 회화", "💬", 3, listOf("기초", "초급", "중급")),
    KOREAN("국어 어휘", "📖", 3, listOf("기초", "초급", "중급"));

    fun label(level: Int): String = levelLabels.getOrElse(level - 1) { "레벨 $level" }
}
