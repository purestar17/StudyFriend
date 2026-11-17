package com.kidslearn.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kidslearn.app.AppViewModel
import com.kidslearn.app.QuizState
import com.kidslearn.app.content.Question

@Composable
fun QuizScreen(vm: AppViewModel, s: QuizState, speak: (String) -> Unit) {
    val q = s.current
    LaunchedEffect(s.index) { q.speak?.let { if (q.choices != null && q.big == q.speak) speak(it) } }
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = vm::quitQuiz) { Icon(Icons.Default.Close, "그만하기") }
            Text("${s.subject.title} · ${s.subject.label(s.level)}", fontSize = 20.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f))
            Text("${s.index + 1} / ${s.questions.size}", fontSize = 20.sp)
        }
        LinearProgressIndicator(
            progress = { (s.index + if (s.answered != null) 1 else 0).toFloat() / s.questions.size },
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            color = s.subject.color(),
        )
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(16.dp))
            Text(q.prompt, fontSize = 24.sp, textAlign = TextAlign.Center)
            q.big?.let {
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(it, fontSize = if (it.length <= 2) 96.sp else 48.sp, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center)
                    if (q.speak != null) {
                        Spacer(Modifier.width(12.dp))
                        FilledTonalIconButton(onClick = { speak(q.speak) }) {
                            Icon(Icons.AutoMirrored.Filled.VolumeUp, "듣기")
                        }
                    }
                }
            }
            if (q.big == null && q.speak != null) {
                Spacer(Modifier.height(12.dp))
                FilledTonalIconButton(onClick = { speak(q.speak) }) { Icon(Icons.AutoMirrored.Filled.VolumeUp, "듣기") }
            }
            Spacer(Modifier.height(24.dp))
            if (q.choices != null) Choices(q, s.answered, vm::answer)
            else NumberPad(key = s.index, answered = s.answered, correct = q.answer, onSubmit = vm::answer)
            if (s.answered != null) {
                Spacer(Modifier.height(20.dp))
                Feedback(q, s.answered)
            }
        }
        if (s.answered != null) {
            Button(
                onClick = vm::next,
                modifier = Modifier.fillMaxWidth().height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = s.subject.color()),
            ) { Text(if (s.isLast) "결과 보기" else "다음 문제", fontSize = 22.sp) }
        }
    }
}

@Composable
private fun Choices(q: Question, answered: String?, onPick: (String) -> Unit) {
    Column(Modifier.widthIn600(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        q.choices!!.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { c ->
                    val border = when {
                        answered == null -> MaterialTheme.colorScheme.outline
                        c == q.answer -> Correct
                        c == answered -> Wrong
                        else -> MaterialTheme.colorScheme.outlineVariant
                    }
                    OutlinedButton(
                        onClick = { onPick(c) },
                        enabled = answered == null || c == q.answer || c == answered,
                        modifier = Modifier.weight(1f).heightIn(min = 72.dp),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(if (answered != null && (c == q.answer || c == answered)) 4.dp else 2.dp, border),
                    ) { Text(c, fontSize = if (c.length <= 2) 40.sp else 22.sp, textAlign = TextAlign.Center) }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NumberPad(key: Int, answered: String?, correct: String, onSubmit: (String) -> Unit) {
    var input by remember(key) { mutableStateOf("") }
    Column(Modifier.width(360.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.fillMaxWidth().height(72.dp).padding(bottom = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                answered ?: input.ifEmpty { "?" }, fontSize = 44.sp, fontWeight = FontWeight.Bold,
                color = when { answered == null -> Color.Unspecified; answered == correct -> Correct; else -> Wrong },
            )
        }
        val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "지우기", "0", "확인")
        keys.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 4.dp)) {
                row.forEach { k ->
                    Button(
                        onClick = {
                            when (k) {
                                "지우기" -> input = input.dropLast(1)
                                "확인" -> if (input.isNotEmpty()) onSubmit(input)
                                else -> if (input.length < 7) input += k
                            }
                        },
                        enabled = answered == null,
                        modifier = Modifier.weight(1f).height(64.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) { Text(k, fontSize = if (k.length == 1) 28.sp else 18.sp) }
                }
            }
        }
    }
}

@Composable
private fun Feedback(q: Question, answered: String) {
    val ok = answered.replace(" ", "").lowercase() == q.answer.replace(" ", "").lowercase()
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(if (ok) "정답이에요! 🎉" else "아쉬워요. 정답은 ${q.answer}", fontSize = 26.sp,
            fontWeight = FontWeight.Bold, color = if (ok) Correct else Wrong)
        q.explain?.let { Text(it, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

private fun Modifier.widthIn600(): Modifier = this.then(Modifier.fillMaxWidth(0.9f))
