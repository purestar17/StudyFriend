package com.kidslearn.app

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.kidslearn.app.content.Question
import com.kidslearn.app.content.QuestionProvider
import com.kidslearn.app.data.AppDatabase
import com.kidslearn.app.data.Settings
import com.kidslearn.app.data.StudySession
import com.kidslearn.app.data.Subject
import kotlinx.coroutines.launch
import java.util.Calendar

sealed interface Screen {
    data object Home : Screen
    data class Quiz(val state: QuizState) : Screen
    data class Result(val result: QuizResult) : Screen
    data object PinEntry : Screen
    data object Admin : Screen
}

data class QuizState(
    val subject: Subject,
    val level: Int,
    val questions: List<Question>,
    val index: Int = 0,
    val correct: Int = 0,
    /** 현재 문제에 낸 답 (null이면 아직 답하지 않음) */
    val answered: String? = null,
    val wrong: List<String> = emptyList(),
    val startedAt: Long = System.currentTimeMillis(),
) {
    val current: Question get() = questions[index]
    val isLast: Boolean get() = index == questions.lastIndex
}

data class QuizResult(
    val subject: Subject,
    val level: Int,
    val total: Int,
    val correct: Int,
    val wrong: List<String>,
    /** 자동 레벨 조정 결과: +1, -1, 0 */
    val levelChange: Int,
)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    val settings = Settings(app)
    private val dao = AppDatabase.get(app).sessions()

    var screen by mutableStateOf<Screen>(Screen.Home)
        private set

    /** 설정 변경 후 화면을 다시 그리기 위한 카운터 */
    var settingsVersion by mutableStateOf(0)
        private set

    val recentSessions = dao.recent()
    val todaySessions = dao.since(startOfToday())

    fun startQuiz(subject: Subject) {
        val level = settings.level(subject)
        val qs = QuestionProvider.session(subject, level, settings.questionsPerSession)
        screen = Screen.Quiz(QuizState(subject, level, qs))
    }

    fun answer(choice: String) {
        val s = (screen as? Screen.Quiz)?.state ?: return
        if (s.answered != null) return
        val ok = normalize(choice) == normalize(s.current.answer)
        val q = s.current
        val wrongText = listOfNotNull(q.big, q.prompt.takeIf { q.big == null }).joinToString(" ") +
            " → 정답: ${q.answer} (고른 답: $choice)"
        screen = Screen.Quiz(
            s.copy(
                answered = choice,
                correct = s.correct + if (ok) 1 else 0,
                wrong = if (ok) s.wrong else s.wrong + wrongText,
            )
        )
    }

    fun next() {
        val s = (screen as? Screen.Quiz)?.state ?: return
        if (!s.isLast) {
            screen = Screen.Quiz(s.copy(index = s.index + 1, answered = null))
            return
        }
        finish(s)
    }

    fun quitQuiz() {
        screen = Screen.Home
    }

    private fun finish(s: QuizState) {
        val total = s.questions.size
        val rate = if (total == 0) 0.0 else s.correct.toDouble() / total
        var change = 0
        if (settings.autoLevel) {
            if (rate >= 0.9 && s.level < s.subject.maxLevel) change = 1
            else if (rate < 0.5 && s.level > 1) change = -1
            if (change != 0) settings.setLevel(s.subject, s.level + change)
        }
        val durationSec = ((System.currentTimeMillis() - s.startedAt) / 1000).toInt()
        viewModelScope.launch {
            dao.insert(
                StudySession(
                    subject = s.subject.name, level = s.level, total = total, correct = s.correct,
                    startedAt = s.startedAt, durationSec = durationSec, wrongItems = s.wrong.joinToString("\n"),
                )
            )
        }
        settingsVersion++
        screen = Screen.Result(QuizResult(s.subject, s.level, total, s.correct, s.wrong, change))
    }

    fun goHome() { screen = Screen.Home }
    fun openAdmin() { screen = Screen.PinEntry }

    fun checkPin(pin: String): Boolean {
        val ok = pin == settings.adminPin
        if (ok) screen = Screen.Admin
        return ok
    }

    fun updateSettings(block: Settings.() -> Unit) {
        settings.block()
        settingsVersion++
    }

    private fun normalize(s: String) = s.trim().replace(" ", "").lowercase()

    companion object {
        fun startOfToday(): Long = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }
}
