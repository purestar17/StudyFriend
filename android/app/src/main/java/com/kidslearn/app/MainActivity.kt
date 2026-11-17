package com.kidslearn.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.kidslearn.app.ui.AdminScreen
import com.kidslearn.app.ui.AppTheme
import com.kidslearn.app.ui.HomeScreen
import com.kidslearn.app.ui.PinScreen
import com.kidslearn.app.ui.QuizScreen
import com.kidslearn.app.ui.ResultScreen

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()
    private lateinit var speaker: Speaker

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        speaker = Speaker(this)
        setContent {
            AppTheme {
                Surface(Modifier.fillMaxSize().safeDrawingPadding()) {
                    when (val s = vm.screen) {
                        Screen.Home -> HomeScreen(vm)
                        is Screen.Quiz -> {
                            BackHandler { vm.quitQuiz() }
                            QuizScreen(vm, s.state, speaker::speak)
                        }
                        is Screen.Result -> {
                            BackHandler { vm.goHome() }
                            ResultScreen(s.result, onHome = vm::goHome, onAgain = { vm.startQuiz(s.result.subject) })
                        }
                        Screen.PinEntry -> {
                            BackHandler { vm.goHome() }
                            PinScreen(vm)
                        }
                        Screen.Admin -> {
                            BackHandler { vm.goHome() }
                            AdminScreen(vm)
                        }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        speaker.shutdown()
        super.onDestroy()
    }
}
