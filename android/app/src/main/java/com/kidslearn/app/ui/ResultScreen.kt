package com.kidslearn.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kidslearn.app.QuizResult

@Composable
fun ResultScreen(r: QuizResult, onHome: () -> Unit, onAgain: () -> Unit) {
    val rate = if (r.total == 0) 0 else r.correct * 100 / r.total
    Column(
        Modifier.fillMaxSize().padding(32.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(when { rate >= 90 -> "🏆"; rate >= 70 -> "⭐"; else -> "💪" }, fontSize = 96.sp)
        Text("${r.total}문제 중 ${r.correct}개 정답!", fontSize = 36.sp, fontWeight = FontWeight.Bold)
        Text("정답률 $rate%", fontSize = 22.sp)
        Spacer(Modifier.height(12.dp))
        when (r.levelChange) {
            1 -> Text("레벨 업! 다음부터 ${r.subject.label(r.level + 1)} 문제가 나와요 🚀", fontSize = 22.sp,
                color = Correct, fontWeight = FontWeight.Bold)
            -1 -> Text("다음에는 ${r.subject.label(r.level - 1)} 문제로 다시 연습해 봐요", fontSize = 20.sp,
                color = MaterialTheme.colorScheme.primary)
        }
        if (r.wrong.isNotEmpty()) {
            Spacer(Modifier.height(20.dp))
            Text("틀린 문제 다시 보기", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            r.wrong.forEach { Text("• $it", fontSize = 17.sp, modifier = Modifier.padding(vertical = 2.dp)) }
        }
        Spacer(Modifier.height(32.dp))
        Row(horizontalArrangement = Arrangement.Center) {
            OutlinedButton(onClick = onHome, modifier = Modifier.height(60.dp).width(200.dp)) { Text("처음으로", fontSize = 20.sp) }
            Spacer(Modifier.width(16.dp))
            Button(onClick = onAgain, modifier = Modifier.height(60.dp).width(200.dp)) { Text("한 번 더", fontSize = 20.sp) }
        }
    }
}
