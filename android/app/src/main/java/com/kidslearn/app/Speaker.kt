package com.kidslearn.app

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/** 영어 발음 듣기 (기기 내장 음성 합성, 인터넷 불필요) */
class Speaker(context: Context) : TextToSpeech.OnInitListener {
    private val tts = TextToSpeech(context.applicationContext, this)
    private var ready = false

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale.US
            tts.setSpeechRate(0.85f)
            ready = true
        }
    }

    fun speak(text: String) {
        if (ready) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "say")
    }

    fun shutdown() = tts.shutdown()
}
