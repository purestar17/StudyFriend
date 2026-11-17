package com.kidslearn.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kidslearn.app.AppViewModel
import com.kidslearn.app.data.Subject

@Composable
fun HomeScreen(vm: AppViewModel) {
    val today by vm.todaySessions.collectAsState(initial = emptyList())
    @Suppress("UNUSED_VARIABLE") val v = vm.settingsVersion
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("${vm.settings.studentName}, 안녕! 👋", fontSize = 32.sp, fontWeight = FontWeight.Bold)
                val done = today.size
                val right = today.sumOf { it.correct }
                val total = today.sumOf { it.total }
                Text(
                    if (done == 0) "오늘은 아직 공부를 시작하지 않았어요. 과목을 골라 볼까요?"
                    else "오늘 ${done}번 공부했어요 · ${total}문제 중 ${right}개 정답",
                    fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = vm::openAdmin) {
                Icon(Icons.Default.Settings, contentDescription = "관리자", tint = Color.Gray)
            }
        }
        Spacer(Modifier.height(24.dp))
        LazyVerticalGrid(
            columns = GridCells.Adaptive(220.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(Subject.entries) { subject ->
                val level = vm.settings.level(subject)
                val doneToday = today.count { it.subject == subject.name }
                SubjectCard(subject, subject.label(level), doneToday) { vm.startQuiz(subject) }
            }
        }
    }
}

@Composable
private fun SubjectCard(subject: Subject, levelLabel: String, doneToday: Int, onClick: () -> Unit) {
    Box(
        Modifier.fillMaxWidth().height(180.dp).clip(RoundedCornerShape(24.dp))
            .background(subject.color()).clickable(onClick = onClick).padding(20.dp)
    ) {
        Column {
            Text(subject.emoji, fontSize = 44.sp, color = Color.White)
            Spacer(Modifier.weight(1f))
            Text(subject.title, fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(levelLabel + if (doneToday > 0) " · 오늘 ${doneToday}회 ✔" else "", fontSize = 16.sp, color = Color.White.copy(alpha = 0.9f))
        }
    }
}
