// 학습 시간표: 관리자가 정한 요일·시각에 앱이 켜지고, 오늘의 과제를 끝낼 때까지 잠근다.
// 잠금 자체는 Android 앱(StudyFriendApp 브리지)이 하고, 여기서는 시간 계산과 과제 진행만 다룬다.
// Android 쪽 Schedule.kt와 같은 규칙을 따른다.
(() => {
  /** 기본 시간표: 꺼짐, 평일 오후 4시~6시, 수학·한자 1회씩 */
  const DEFAULT_SCHEDULE = {
    enabled: false,
    slots: [{ days: [1, 2, 3, 4, 5], start: "16:00", end: "18:00" }],
    tasks: { MATH: 1, HANJA: 1, ENGLISH_WORD: 0, ENGLISH_TALK: 0, KOREAN: 0 },
  };
  const DAY_NAMES = ["", "월", "화", "수", "목", "금", "토", "일"];
  const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
  /** JS 요일(0=일) → 1=월 … 7=일 */
  const isoDay = (d) => ((d.getDay() + 6) % 7) + 1;

  /** 지금 들어가 있는 시간 칸 (없으면 null). { slot, start: Date, end: Date, key } */
  function activeSlot(schedule, now = new Date()) {
    if (!schedule || !schedule.enabled) return null;
    const mins = now.getHours() * 60 + now.getMinutes(), day = isoDay(now);
    for (const slot of schedule.slots || []) {
      const s = toMin(slot.start), e = toMin(slot.end);
      if (!slot.days.includes(day) || !(e > s) || mins < s || mins >= e) continue;
      const start = new Date(now); start.setHours(Math.floor(s / 60), s % 60, 0, 0);
      const end = new Date(now); end.setHours(Math.floor(e / 60), e % 60, 0, 0);
      const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return { slot, start, end, key: `${ymd}#${slot.start}` };
    }
    return null;
  }

  /** 과제 진행: 이 시간 칸이 시작된 뒤 끝낸 학습 횟수를 과목별로 센다 */
  function taskProgress(schedule, sessions, since) {
    const t = since ? since.getTime() : 0;
    const items = Object.entries(schedule.tasks || {}).filter(([, n]) => n > 0).map(([id, need]) => {
      const done = sessions.filter((x) => x.subject === id && x.startedAt >= t).length;
      return { id, need, done: Math.min(done, need) };
    });
    return { items, complete: items.every((i) => i.done >= i.need) };
  }

  /** 시간표가 올바른지 확인. 문제가 있으면 문장, 없으면 null */
  function checkSchedule(s) {
    if (!s.slots.length) return "시간을 하나 이상 넣어 주세요";
    for (const [i, x] of s.slots.entries()) {
      if (!x.days.length) return `${i + 1}번 시간에 요일을 골라 주세요`;
      if (!(toMin(x.end) > toMin(x.start))) return `${i + 1}번 시간: 끝나는 시각이 시작보다 늦어야 해요`;
    }
    if (!Object.values(s.tasks).some((n) => n > 0)) return "오늘의 과제를 하나 이상 정해 주세요";
    return null;
  }

  const api = { DEFAULT_SCHEDULE, DAY_NAMES, activeSlot, taskProgress, checkSchedule, toMin };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, api);
})();
