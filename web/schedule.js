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

  /** 그 날(요일)의 과제. 요일별로 정해 두지 않았으면 공통 과제 */
  function tasksFor(schedule, date = new Date()) {
    const byDay = schedule.tasksByDay;
    return (byDay && byDay[isoDay(date)]) || schedule.tasks || {};
  }

  /** 요일별 과제에서 '룰렛으로 정하기' 칸의 이름 */
  const ROULETTE = "ROULETTE";

  /**
   * 과제 진행: 이 시간 칸이 시작된 뒤 끝낸 학습 횟수를 과목별로 센다.
   * exempt: 포상 면제권 { all, subjects: Set } — 면제된 과목은 다 한 것으로 친다
   * rolls: 룰렛 기록 [{ at, subject }] — 룰렛 과제는 룰렛이 고른 과목을 정해진 과제보다 더 한 만큼 채워진다
   */
  function taskProgress(schedule, sessions, since, exempt, rolls = []) {
    const t = since ? since.getTime() : 0;
    const tasks = tasksFor(schedule, since || new Date());
    const count = (id) => sessions.filter((x) => x.subject === id && x.startedAt >= t).length;
    const isExempt = (id) => exempt && (exempt.all || (exempt.subjects && exempt.subjects.has(id)));
    const items = Object.entries(tasks).filter(([id, n]) => n > 0 && id !== ROULETTE).map(([id, need]) => {
      if (isExempt(id)) return { id, need, done: need, exempt: true };
      return { id, need, done: Math.min(count(id), need) };
    });
    const rNeed = tasks[ROULETTE] || 0;
    if (rNeed > 0) {
      if (exempt && exempt.all) items.push({ id: ROULETTE, need: rNeed, done: rNeed, exempt: true, pending: [] });
      else {
        // 룰렛이 고른 과목마다: (그 과목 학습 수 - 정해진 과제 수) 만큼 룰렛 과제로 친다
        const mine = rolls.filter((r) => r.at >= t), by = {};
        for (const r of mine) by[r.subject] = (by[r.subject] || 0) + 1;
        let done = 0; const pending = [];
        for (const [id, n] of Object.entries(by)) {
          const extra = isExempt(id) ? n : Math.max(0, count(id) - (tasks[id] || 0));
          done += Math.min(n, extra);
          for (let k = Math.min(n, extra); k < n; k++) pending.push(id);
        }
        items.push({ id: ROULETTE, need: rNeed, done: Math.min(done, rNeed), pending, rolled: mine.length });
      }
    }
    return { items, complete: items.every((i) => i.done >= i.need) };
  }

  /** 시간표가 올바른지 확인. 문제가 있으면 문장, 없으면 null */
  function checkSchedule(s) {
    if (!s.slots.length) return "시간을 하나 이상 넣어 주세요";
    for (const [i, x] of s.slots.entries()) {
      if (!x.days.length) return `${i + 1}번 시간에 요일을 골라 주세요`;
      if (!(toMin(x.end) > toMin(x.start))) return `${i + 1}번 시간: 끝나는 시각이 시작보다 늦어야 해요`;
    }
    const days = [...new Set(s.slots.flatMap((x) => x.days))].sort();
    for (const d of days) {
      const t = (s.tasksByDay && s.tasksByDay[d]) || s.tasks || {};
      if (!Object.values(t).some((n) => n > 0)) return `${DAY_NAMES[d]}요일 과제를 하나 이상 정해 주세요`;
    }
    return null;
  }

  const api = { DEFAULT_SCHEDULE, DAY_NAMES, ROULETTE, activeSlot, taskProgress, tasksFor, checkSchedule, toMin, isoDay };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, api);
})();
