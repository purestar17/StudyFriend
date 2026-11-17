package com.kidslearn.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class ScheduleTest {
    // 2026-11-17은 화요일
    private val json = """{"enabled":true,"slots":[{"days":[1,2,3,4,5],"start":"16:00","end":"18:00"},{"days":[6],"start":"09:30","end":"10:30"}],"tasks":{"MATH":1}}"""
    private val s = Schedule.parse(json)

    @Test fun parsesSlots() {
        assertTrue(s.enabled)
        assertEquals(2, s.slots.size)
        assertEquals(960, s.slots[0].start)
        assertEquals(570, s.slots[1].start)
    }

    @Test fun activeInsideWindowOnly() {
        assertNull(s.activeKey(LocalDateTime.of(2026, 11, 17, 15, 59)))
        assertEquals("2026-11-17#16:00", s.activeKey(LocalDateTime.of(2026, 11, 17, 16, 0)))
        assertEquals("2026-11-17#16:00", s.activeKey(LocalDateTime.of(2026, 11, 17, 17, 59)))
        assertNull(s.activeKey(LocalDateTime.of(2026, 11, 17, 18, 0)))
        // 토요일 오후는 비어 있고 오전 칸만 있다
        assertNull(s.activeKey(LocalDateTime.of(2026, 11, 21, 16, 30)))
        assertEquals("2026-11-21#09:30", s.activeKey(LocalDateTime.of(2026, 11, 21, 10, 0)))
        assertEquals(LocalDateTime.of(2026, 11, 21, 10, 30), s.activeEnd(LocalDateTime.of(2026, 11, 21, 10, 0)))
    }

    @Test fun disabledNeverLocks() {
        val off = Schedule.parse(json.replace("\"enabled\":true", "\"enabled\":false"))
        assertFalse(shouldLock(off, LocalDateTime.of(2026, 11, 17, 16, 30), emptySet()))
        assertNull(off.nextBoundary(LocalDateTime.of(2026, 11, 17, 16, 30)))
    }

    @Test fun doneKeyReleases() {
        val t = LocalDateTime.of(2026, 11, 17, 16, 30)
        assertTrue(shouldLock(s, t, emptySet()))
        assertFalse(shouldLock(s, t, setOf("2026-11-17#16:00")))
        // 어제 끝낸 기록은 오늘에 영향 없음
        assertTrue(shouldLock(s, t, setOf("2026-11-16#16:00")))
    }

    @Test fun nextBoundary() {
        assertEquals(LocalDateTime.of(2026, 11, 17, 16, 0), s.nextBoundary(LocalDateTime.of(2026, 11, 17, 12, 0)))
        assertEquals(LocalDateTime.of(2026, 11, 17, 18, 0), s.nextBoundary(LocalDateTime.of(2026, 11, 17, 16, 0)))
        // 금요일 저녁 다음은 토요일 9:30
        assertEquals(LocalDateTime.of(2026, 11, 21, 9, 30), s.nextBoundary(LocalDateTime.of(2026, 11, 20, 19, 0)))
        // 토요일 수업 뒤는 월요일 16:00
        assertEquals(LocalDateTime.of(2026, 11, 23, 16, 0), s.nextBoundary(LocalDateTime.of(2026, 11, 21, 10, 30)))
    }

    @Test fun badInputIsOff() {
        assertFalse(Schedule.parse("not json").enabled)
        assertFalse(Schedule.parse(null).enabled)
    }
}
