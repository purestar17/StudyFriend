package com.kidslearn.app

import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/**
 * 학습 시간표. 웹의 schedule.js와 같은 규칙.
 * days: 1=월 … 7=일, start/end: 분 단위 (16:00 → 960)
 */
data class Slot(val days: Set<Int>, val start: Int, val end: Int, val startText: String)

data class Schedule(val enabled: Boolean, val slots: List<Slot>) {

    /** 지금 들어가 있는 시간 칸의 열쇠 ("2026-11-17#16:00"), 없으면 null */
    fun activeKey(now: LocalDateTime): String? {
        if (!enabled) return null
        val mins = now.hour * 60 + now.minute
        val day = now.dayOfWeek.value
        val slot = slots.firstOrNull { day in it.days && it.end > it.start && mins >= it.start && mins < it.end } ?: return null
        return "${now.toLocalDate()}#${slot.startText}"
    }

    /** 지금 시간 칸이 끝나는 시각 */
    fun activeEnd(now: LocalDateTime): LocalDateTime? {
        if (activeKey(now) == null) return null
        val mins = now.hour * 60 + now.minute
        val slot = slots.first { now.dayOfWeek.value in it.days && it.end > it.start && mins >= it.start && mins < it.end }
        return now.toLocalDate().atTime(LocalTime.of(slot.end / 60 % 24, slot.end % 60))
    }

    /** 지금 다음으로 시간 칸이 시작하거나 끝나는 시각 (8일 안에 없으면 null) */
    fun nextBoundary(now: LocalDateTime): LocalDateTime? {
        if (!enabled) return null
        var best: LocalDateTime? = null
        for (offset in 0..7) {
            val date: LocalDate = now.toLocalDate().plusDays(offset.toLong())
            for (s in slots) {
                if (date.dayOfWeek.value !in s.days || s.end <= s.start) continue
                for (m in listOf(s.start, s.end)) {
                    if (m >= 24 * 60) continue
                    val t = date.atTime(m / 60, m % 60)
                    if (t.isAfter(now) && (best == null || t.isBefore(best))) best = t
                }
            }
            if (best != null) return best
        }
        return best
    }

    companion object {
        val OFF = Schedule(false, emptyList())

        fun toMin(hhmm: String): Int {
            val p = hhmm.split(":")
            return (p.getOrNull(0)?.trim()?.toIntOrNull() ?: 0) * 60 + (p.getOrNull(1)?.trim()?.toIntOrNull() ?: 0)
        }

        fun parse(json: String?): Schedule {
            if (json.isNullOrBlank()) return OFF
            return try {
                val o = JSONObject(json)
                val arr = o.optJSONArray("slots")
                val slots = (0 until (arr?.length() ?: 0)).map { i ->
                    val s = arr!!.getJSONObject(i)
                    val d = s.optJSONArray("days")
                    val days = (0 until (d?.length() ?: 0)).map { d!!.getInt(it) }.toSet()
                    val start = s.optString("start", "00:00")
                    Slot(days, toMin(start), toMin(s.optString("end", "00:00")), start)
                }
                Schedule(o.optBoolean("enabled", false), slots)
            } catch (e: Exception) {
                OFF
            }
        }
    }
}

/** 잠가야 하는지: 시간 칸 안이고, 그 칸의 과제를 끝냈거나 관리자가 풀어 준 기록이 없으면 잠근다 */
fun shouldLock(schedule: Schedule, now: LocalDateTime, doneKeys: Set<String>): Boolean {
    val key = schedule.activeKey(now) ?: return false
    return key !in doneKeys
}
