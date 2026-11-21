// 포상: 학습을 끝내거나 점수가 기준 이상이면 관리자가 정한 확률로 포상이 나온다.
// 포상 종류: 과목 면제권(그 과목 오늘 과제 면제), 하루 면제권(오늘 과제 모두 면제), 직접 쓴 포상(보호자가 준다).
// 여기에는 화면 없이 계산만 둔다 (테스트하기 쉽게).
(() => {
  const DEFAULT_REWARDS = {
    enabled: false,
    when: "finish", // "finish": 끝까지 풀면 | "score": 점수가 minScore% 이상이면
    minScore: 80,
    dailyMax: 3,
    items: [
      { id: "r1", type: "text", text: "칭찬 스티커 1장", chance: 30 },
      { id: "r2", type: "subject", subject: "MATH", chance: 5 },
      { id: "r3", type: "day", chance: 1 },
    ],
  };
  const TYPES = { subject: "과목 면제권", day: "하루 면제권", text: "직접 쓰기" };
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const clampChance = (n) => Math.max(0, Math.min(100, Math.round(Number(n) * 10) / 10 || 0));
  const totalChance = (items) => Math.round(items.reduce((a, x) => a + clampChance(x.chance), 0) * 10) / 10;

  /** 설정이 올바른지. 문제가 있으면 문장, 없으면 null */
  function checkRewards(cfg) {
    if (!cfg.items.length) return cfg.enabled ? "포상을 하나 이상 넣어 주세요" : null;
    for (const [i, x] of cfg.items.entries()) {
      if (x.type === "text" && !String(x.text || "").trim()) return `${i + 1}번 포상 내용을 적어 주세요`;
      if (x.type === "subject" && !x.subject) return `${i + 1}번 면제권 과목을 골라 주세요`;
      if (!(clampChance(x.chance) > 0)) return `${i + 1}번 포상 확률을 0보다 크게 정해 주세요`;
    }
    if (totalChance(cfg.items) > 100) return `확률을 모두 더하면 ${totalChance(cfg.items)}%예요. 100% 이하로 맞춰 주세요`;
    if (cfg.when === "score" && !(cfg.minScore >= 1 && cfg.minScore <= 100)) return "기준 점수는 1~100% 사이로 정해 주세요";
    return null;
  }

  /** 이번 학습으로 포상을 뽑을 수 있는지. result: { total, correct, kind } */
  function eligible(cfg, result, todayCount) {
    if (!cfg || !cfg.enabled || !cfg.items || !cfg.items.length) return false;
    if (cfg.dailyMax > 0 && todayCount >= cfg.dailyMax) return false;
    if (cfg.when === "score") {
      if (result.kind === "talk" || !result.total) return false; // 점수가 없는 학습(회화)은 '끝까지' 조건에서만
      return (result.correct * 100) / result.total >= cfg.minScore;
    }
    return true;
  }

  /** 확률대로 하나를 뽑는다. 안 나오면 null. rand는 0 이상 1 미만 */
  function drawReward(cfg, result, todayCount, rand = Math.random) {
    if (!eligible(cfg, result, todayCount)) return null;
    let roll = rand() * 100;
    for (const x of cfg.items) {
      const c = clampChance(x.chance);
      if (roll < c) return { type: x.type, subject: x.type === "subject" ? x.subject : undefined, text: x.type === "text" ? String(x.text).trim() : undefined };
      roll -= c;
    }
    return null;
  }

  /** 그 날 쓴 면제권: { all, subjects: Set } */
  function exemptionsFor(rewards, date = new Date()) {
    const day = ymd(date), out = { all: false, subjects: new Set() };
    for (const r of rewards || []) {
      if (!r.usedAt || r.usedDay !== day) continue;
      if (r.type === "day") out.all = true;
      else if (r.type === "subject") out.subjects.add(r.subject);
    }
    return out;
  }

  const api = { DEFAULT_REWARDS, REWARD_TYPES: TYPES, checkRewards, eligible, drawReward, exemptionsFor, totalChance, clampChance, ymd };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, api);
})();
