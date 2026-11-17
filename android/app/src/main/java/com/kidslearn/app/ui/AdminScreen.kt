package com.kidslearn.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kidslearn.app.AppViewModel
import com.kidslearn.app.data.AiProvider
import com.kidslearn.app.data.StudySession
import com.kidslearn.app.data.Subject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AdminScreen(vm: AppViewModel) {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("학습 레벨", "학습 기록", "AI 설정", "일반")
    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
            IconButton(onClick = vm::goHome) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "나가기") }
            Text("관리자 모드", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
        TabRow(selectedTabIndex = tab) {
            tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t, fontSize = 17.sp) }) }
        }
        Column(Modifier.weight(1f).padding(24.dp)) {
            when (tab) {
                0 -> LevelTab(vm)
                1 -> HistoryTab(vm)
                2 -> AiTab(vm)
                else -> GeneralTab(vm)
            }
        }
    }
}

@Composable
private fun LevelTab(vm: AppViewModel) {
    @Suppress("UNUSED_VARIABLE") val v = vm.settingsVersion
    Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("정답률에 따라 레벨 자동 조정", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("한 번 학습에서 90% 이상 맞히면 한 단계 올리고, 50% 미만이면 한 단계 내려요.", fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = vm.settings.autoLevel, onCheckedChange = { c -> vm.updateSettings { autoLevel = c } })
        }
        HorizontalDivider()
        Subject.entries.forEach { s ->
            Column {
                Text("${s.emoji} ${s.title}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (1..s.maxLevel).forEach { lv ->
                        FilterChip(
                            selected = vm.settings.level(s) == lv,
                            onClick = { vm.updateSettings { setLevel(s, lv) } },
                            label = { Text(s.label(lv), fontSize = 16.sp) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryTab(vm: AppViewModel) {
    val sessions by vm.recentSessions.collectAsState(initial = emptyList())
    if (sessions.isEmpty()) {
        Text("아직 학습 기록이 없어요.", fontSize = 18.sp); return
    }
    val week = sessions.filter { it.startedAt >= System.currentTimeMillis() - 7L * 24 * 3600 * 1000 }
    Text("최근 7일 과목별 정답률", fontSize = 18.sp, fontWeight = FontWeight.Bold)
    Row(horizontalArrangement = Arrangement.spacedBy(20.dp), modifier = Modifier.padding(vertical = 8.dp)) {
        Subject.entries.forEach { s ->
            val list = week.filter { it.subject == s.name }
            val t = list.sumOf { it.total }; val c = list.sumOf { it.correct }
            Column {
                Text(s.title, fontSize = 15.sp)
                Text(if (t == 0) "-" else "${c * 100 / t}% (${list.size}회)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
    HorizontalDivider()
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
        items(sessions, key = { it.id }) { SessionRow(it) }
    }
}

private val dateFmt = SimpleDateFormat("M월 d일 (E) HH:mm", Locale.KOREAN)

@Composable
private fun SessionRow(s: StudySession) {
    var open by remember { mutableStateOf(false) }
    val subject = runCatching { Subject.valueOf(s.subject) }.getOrNull()
    Card(Modifier.fillMaxWidth().selectable(selected = open, onClick = { open = !open })) {
        Column(Modifier.padding(14.dp)) {
            Row {
                Text("${dateFmt.format(Date(s.startedAt))}  ${subject?.title ?: s.subject} ${subject?.label(s.level) ?: ""}",
                    fontSize = 16.sp, modifier = Modifier.weight(1f))
                Text("${s.correct}/${s.total}  ·  ${s.durationSec / 60}분 ${s.durationSec % 60}초", fontSize = 16.sp,
                    fontWeight = FontWeight.Bold)
            }
            if (open && s.wrongItems.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                s.wrongItems.lines().forEach { Text("• $it", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun AiTab(vm: AppViewModel) {
    @Suppress("UNUSED_VARIABLE") val v = vm.settingsVersion
    var url by remember { mutableStateOf(vm.settings.aiRelayUrl) }
    Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("AI 선생님 (3단계에서 연결 예정)", fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text("AI는 아이의 수준 분석, 새 문제 만들기, 영어 회화 상대를 맡아요. API 키는 태블릿에 저장하지 않고 중계 서버에 보관해요.",
            fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        AiProvider.entries.forEach { p ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().selectable(
                    selected = vm.settings.aiProvider == p, onClick = { vm.updateSettings { aiProvider = p } }),
            ) {
                RadioButton(selected = vm.settings.aiProvider == p, onClick = { vm.updateSettings { aiProvider = p } })
                Text(p.title, fontSize = 18.sp)
            }
        }
        OutlinedTextField(
            value = url, onValueChange = { url = it },
            label = { Text("중계 서버 주소") }, singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        )
        Button(onClick = { vm.updateSettings { aiRelayUrl = url } }) { Text("주소 저장") }
        HorizontalDivider()
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("실시간 음성 대화 (OpenAI)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("끄면 태블릿 내장 음성 인식·읽기 + 선택한 AI로 대화해요(저렴). 켜면 더 자연스럽지만 비용이 커요.",
                    fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = vm.settings.realtimeVoice, onCheckedChange = { c -> vm.updateSettings { realtimeVoice = c } })
        }
    }
}

@Composable
private fun GeneralTab(vm: AppViewModel) {
    @Suppress("UNUSED_VARIABLE") val v = vm.settingsVersion
    var name by remember { mutableStateOf(vm.settings.studentName) }
    var newPin by remember { mutableStateOf("") }
    var msg by remember { mutableStateOf("") }
    Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("학생 별칭", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = name, onValueChange = { name = it.take(10) }, singleLine = true)
            Spacer(Modifier.width(12.dp))
            Button(onClick = { vm.updateSettings { studentName = name.ifBlank { "친구" } }; msg = "별칭을 저장했어요" }) { Text("저장") }
        }
        Text("한 번에 푸는 문제 수", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(5, 10, 15, 20).forEach { n ->
                FilterChip(selected = vm.settings.questionsPerSession == n,
                    onClick = { vm.updateSettings { questionsPerSession = n } }, label = { Text("${n}문제", fontSize = 16.sp) })
            }
        }
        Text("관리자 비밀번호 변경 (숫자 4~8자리)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = newPin, onValueChange = { newPin = it.filter(Char::isDigit).take(8) }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            )
            Spacer(Modifier.width(12.dp))
            Button(onClick = {
                if (newPin.length >= 4) { vm.updateSettings { adminPin = newPin }; newPin = ""; msg = "비밀번호를 바꿨어요" }
                else msg = "4자리 이상 입력해 주세요"
            }) { Text("변경") }
        }
        if (msg.isNotEmpty()) Text(msg, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
        HorizontalDivider()
        Text("학습 시간표 · 화면 잠금", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text("정해진 시간에 앱이 자동으로 켜지고 학습을 마칠 때까지 다른 앱을 막는 기능은 2단계에서 추가돼요.",
            fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
