package com.kidslearn.app.data

import android.content.Context

enum class AiProvider(val title: String) {
    NONE("사용 안 함"),
    CLAUDE("Claude (Anthropic)"),
    OPENAI("GPT (OpenAI)"),
}

/** 관리자 설정. 기기 안에만 저장된다. API 키는 여기에 저장하지 않는다(중계 서버에 보관). */
class Settings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var adminPin: String
        get() = prefs.getString("admin_pin", DEFAULT_PIN) ?: DEFAULT_PIN
        set(v) = prefs.edit().putString("admin_pin", v).apply()

    val isDefaultPin: Boolean get() = adminPin == DEFAULT_PIN

    var studentName: String
        get() = prefs.getString("student_name", "친구") ?: "친구"
        set(v) = prefs.edit().putString("student_name", v).apply()

    var questionsPerSession: Int
        get() = prefs.getInt("questions_per_session", 10)
        set(v) = prefs.edit().putInt("questions_per_session", v).apply()

    var autoLevel: Boolean
        get() = prefs.getBoolean("auto_level", true)
        set(v) = prefs.edit().putBoolean("auto_level", v).apply()

    fun level(subject: Subject): Int = prefs.getInt("level_${subject.name}", 1).coerceIn(1, subject.maxLevel)
    fun setLevel(subject: Subject, level: Int) =
        prefs.edit().putInt("level_${subject.name}", level.coerceIn(1, subject.maxLevel)).apply()

    var aiProvider: AiProvider
        get() = runCatching { AiProvider.valueOf(prefs.getString("ai_provider", "NONE")!!) }.getOrDefault(AiProvider.NONE)
        set(v) = prefs.edit().putString("ai_provider", v.name).apply()

    var aiRelayUrl: String
        get() = prefs.getString("ai_relay_url", "") ?: ""
        set(v) = prefs.edit().putString("ai_relay_url", v.trim()).apply()

    var realtimeVoice: Boolean
        get() = prefs.getBoolean("realtime_voice", false)
        set(v) = prefs.edit().putBoolean("realtime_voice", v).apply()

    companion object {
        const val DEFAULT_PIN = "0000"
    }
}
