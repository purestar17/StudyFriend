package com.kidslearn.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.kidslearn.app.data.Subject

private val colors = lightColorScheme(
    primary = Color(0xFF3B6FE0),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDE6FF),
    secondary = Color(0xFFF29B38),
    background = Color(0xFFFFFBF4),
    surface = Color(0xFFFFFBF4),
)

@Composable
fun AppTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = colors, content = content)

fun Subject.color(): Color = when (this) {
    Subject.MATH -> Color(0xFF4A90E2)
    Subject.HANJA -> Color(0xFFD0583F)
    Subject.ENGLISH_WORD -> Color(0xFF3FA36B)
    Subject.ENGLISH_TALK -> Color(0xFF8C5BD6)
    Subject.KOREAN -> Color(0xFFE59A1F)
}

val Correct = Color(0xFF2E9D57)
val Wrong = Color(0xFFD64545)
