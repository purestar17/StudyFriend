package com.kidslearn.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kidslearn.app.AppViewModel

@Composable
fun PinScreen(vm: AppViewModel) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("관리자 비밀번호", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        if (vm.settings.isDefaultPin) Text("처음 비밀번호는 0000 이에요. 들어가서 꼭 바꿔 주세요.", fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        Text(if (pin.isEmpty()) "· · · ·" else "●".repeat(pin.length), fontSize = 36.sp, letterSpacing = 8.sp)
        if (error) Text("비밀번호가 틀렸어요", color = Wrong, fontSize = 16.sp)
        Spacer(Modifier.height(16.dp))
        listOf("123", "456", "789", "<0>").forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(4.dp)) {
                row.forEach { c ->
                    val label = when (c) { '<' -> "지우기"; '>' -> "확인"; else -> c.toString() }
                    Button(
                        onClick = {
                            error = false
                            when (c) {
                                '<' -> pin = pin.dropLast(1)
                                '>' -> if (!vm.checkPin(pin)) { error = true; pin = "" }
                                else -> if (pin.length < 8) pin += c
                            }
                        },
                        modifier = Modifier.size(width = 96.dp, height = 64.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) { Text(label, fontSize = if (label.length == 1) 26.sp else 16.sp) }
                }
            }
        }
        Spacer(Modifier.width(8.dp))
        TextButton(onClick = vm::goHome) { Text("돌아가기", fontSize = 18.sp) }
    }
}
