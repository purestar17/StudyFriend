// 실행: node web/tests/logic.test.js
// 모든 과목·레벨·한자 유형의 문제를 많이 만들어 보고 형식과 정답이 올바른지 검사한다.
const path = require("path");
const W = path.join(__dirname, "..") + "/";
global.CONTENT = require(W + "content-data.js");
global.HANJA_EXAM = require(W + "hanja-exam-data.js");
global.STROKE_COUNTS = require(W + "stroke-counts.js");
const L = require(W + "logic.js");
const { SUBJECTS, oneQuestion, makeSession, hanjaQuestion, HanjaTypes } = L;
global.MathGen = L.MathGen;
const MW = require(W + "math-workbook.js");
const { mathQuestion, MATH_TYPES, mathUnitQuestion, MATH_UNITS, MATH_CHALLENGE } = MW;
global.mathQuestion = mathQuestion;
global.mathUnitQuestion = mathUnitQuestion;
global.TALK_TOPICS = require(W + "talk-topics.js").TALK_TOPICS;

let n = 0;
const fail = (msg, q) => { throw new Error(msg + " " + JSON.stringify(q)); };
for (const s of SUBJECTS) for (let lv = 1; lv <= s.levels.length; lv++) for (let i = 0; i < 500; i++) {
  const q = oneQuestion(s.id, lv); n++;
  if (q.choices === null) {
    const v = Number(q.answer);
    if (!Number.isFinite(v) || v < 0 || (q.input !== "decimal" && !Number.isInteger(v))) fail("숫자 답", q);
    const m = /^(\d+) ([+\-×÷]) (\d+) = \?$/.exec(q.big);
    if (m) {
      const a = +m[1], b = +m[3];
      const e = { "+": a + b, "-": a - b, "×": a * b, "÷": a / b }[m[2]];
      if (String(e) !== q.answer) fail("수학 정답", q);
    }
  } else if (new Set(q.choices).size !== q.choices.length || q.choices.length < (s.id === "MATH" ? 3 : 4) || !q.choices.includes(q.answer)) fail("보기", q);
}
for (let lv = 1; lv <= CONTENT.hanja.length; lv++) for (const t of Object.keys(HanjaTypes)) for (let i = 0; i < 300; i++) {
  const q = hanjaQuestion(lv, t); n++;
  if (new Set(q.choices).size !== 4 || !q.choices.includes(q.answer)) fail("한자 " + t, q);
  if (t === "sentence" && !/\[.+\]/.test(q.sentence)) fail("예문", q);
  if (t === "blank" && q.big.includes(q.answer)) fail("빈칸", q);
  if (t === "strokeOrder" && !(q.stroke && STROKE_COUNTS[q.stroke.char] > q.stroke.highlight)) fail("필순", q);
}
// 수학: 학년별 모든 유형
const evalFrac = (t) => { const m = /^(\d+)\/(\d+)$/.exec(t); return m ? +m[1] / +m[2] : null; };
function checkMath(q, t) {
  n++;
  if (!q.tag) fail("유형 이름 " + t, q);
  if (/undefined|NaN|Infinity|\[object/.test(JSON.stringify(q))) fail("값 오류 " + t, q);
  if (q.choices) {
    if (new Set(q.choices).size !== q.choices.length || q.choices.length < 3 || !q.choices.includes(q.answer)) fail("보기 " + t, q);
    // 분수 보기 중 정답과 값이 같은 오답이 없어야 함
    const av = evalFrac(q.answer);
    if (av !== null && q.choices.some((c) => c !== q.answer && evalFrac(c) === av)) fail("같은 값 분수 " + t, q);
    if (q.choices.some((c) => /\/0$/.test(c))) fail("분모 0 " + t, q);
  } else {
    const v = Number(q.answer);
    if (!Number.isFinite(v) || v < 0) fail("숫자 답 " + t, q);
    if (q.input === "int" && !Number.isInteger(v)) fail("정수 답 " + t, q);
    if (String(q.answer).replace(".", "").length > 7) fail("답이 너무 김(입력 7자 제한) " + t, q);
    const m = /^(\d+(?:\.\d+)?) ([+\-×÷]) (\d+(?:\.\d+)?) = \?$/.exec(q.big || "");
    if (m) {
      const a = +m[1], b = +m[3];
      const e = { "+": a + b, "-": a - b, "×": a * b, "÷": a / b }[m[2]];
      if (Math.abs(e - Number(q.answer)) > 1e-9) fail("계산 정답 " + t, q);
    }
  }
  if (q.figure && q.figure.kind === "fraction" && !(q.figure.n < q.figure.d)) fail("분수 그림", q);
}
for (const [lv, types] of Object.entries(MATH_TYPES)) for (const t of new Set(types)) for (let i = 0; i < 300; i++) checkMath(mathQuestion(+lv, t), t);
// 단원별·심화 문제
for (let lv = 1; lv <= 6; lv++) {
  if (!MATH_UNITS[lv].length || !MATH_CHALLENGE[lv].think.length || !MATH_CHALLENGE[lv].apply.length) throw new Error("단원 없음 " + lv);
  for (const u of [...MATH_UNITS[lv].map((x) => x.id), "think", "apply", "mix"]) for (let i = 0; i < 400; i++) {
    const q = mathUnitQuestion(lv, u);
    checkMath(q, `${lv}학년 ${u}`);
    if ((u === "think" || u === "apply") && !q.hard) fail("심화 표시", q);
  }
  const ses = makeSession("MATH", lv, 10, { unit: MATH_UNITS[lv][0].id });
  if (ses.length < 5) throw new Error(`단원 문제 수가 너무 적음 ${lv}학년 ${ses.length}`);
}
// 관리자 단어장
{
  const { words, bad } = L.parseWordList("apple - 사과\nbanana,바나나\nice cream\t아이스크림\ngo to school: 학교에 가다\nhello\nApple = 사과");
  if (words.length !== 4 || bad.length !== 1 || words[2][0] !== "ice cream") throw new Error("단어장 읽기 " + JSON.stringify(words));
  for (const book of [words, words.slice(0, 2)]) for (let i = 0; i < 300; i++) {
    const q = L.wordQuestion(1, book); n++;
    if (new Set(q.choices).size !== 4 || !q.choices.includes(q.answer) || !book.some((w) => w[0] === q.write)) fail("단어장 문제", q);
  }
  const ses = makeSession("ENGLISH_WORD", 1, 10, { book: words });
  if (!ses.every((q) => words.some((w) => w[0] === q.write))) throw new Error("단어장 세션");
}
// 뜻 여러 개, 사진 글자 정리
{
  const book = [["apple", "사과, 능금"], ["run", "달리다,운영하다"], ["cat", "고양이"], ["red", "빨간"]];
  for (let i = 0; i < 300; i++) {
    const q = L.wordQuestion(1, book); n++;
    if (q.big === "apple" && q.answer !== "사과, 능금") fail("뜻 여러 개", q);
    if (/영어로/.test(q.prompt) && !book.some(([e, k]) => e === q.answer && L.meaningsOf(k).some((m) => q.prompt.includes(`'${m}'`)))) fail("뜻 하나로 묻기", q);
  }
  const r = L.parseOcrText("Unit 5\n1. apple 사과, 능금\n2) run 달리다; 운 영 하 다\n바나나 banana\n| 6. go to school 학교에 가다 |\nbeautiful");
  const want = [["Unit", ""], ["apple", "사과, 능금"], ["run", "달리다, 운영하다"], ["banana", "바나나"], ["go to school", "학교에 가다"], ["beautiful", ""]];
  if (JSON.stringify(r) !== JSON.stringify(want)) throw new Error("사진 글자 정리 " + JSON.stringify(r));
}
for (const t of TALK_TOPICS) if (!t.id || !t.en || !t.ko || t.phrases.length < 3) throw new Error("회화 주제 " + t.id);

// 모든 급수 한자에 획순 데이터가 있어야 한다
const fs = require("fs");
const noStroke = [];
for (const [i, lv] of CONTENT.hanja.entries()) {
  const bundle = JSON.parse(fs.readFileSync(W + `strokes/level${i + 1}.json`, "utf8"));
  for (const [h] of lv) {
    if (!STROKE_COUNTS[h]) { noStroke.push(h); continue; }
    if (!bundle[h] || bundle[h].strokes.length !== STROKE_COUNTS[h] || bundle[h].medians.length !== STROKE_COUNTS[h]) throw new Error("획순 " + h);
  }
}
if (noStroke.length > 5) throw new Error("획순 없는 한자가 너무 많음: " + noStroke.join(""));
for (const s of SUBJECTS) if (makeSession(s.id, 1, 10).length !== 10) throw new Error("세션 " + s.id);

// 펜 손글씨 인식: 견본 숫자를 늘이고 기울여 써도 읽어야 한다
const Pen = require(W + "pen.js");
const warp = (strokes, ox, sx, sl) => strokes.map((st) => st.map(([x, y]) => [ox + (x - 50) * sx + sl * (y - 50), 100 + (y - 50) * 1.2]));
const penMiss = [];
let penAll = 0;
for (const [d, vs] of Object.entries(Pen.TEMPLATES)) for (const v of vs) for (const sx of [0.8, 1, 1.2]) for (const sl of [-0.2, 0, 0.2]) {
  const r = Pen.recognize(warp(v, 100, sx, sl), false);
  penAll++;
  if (r !== d) penMiss.push(`${d}→${r}`);
}
if (penMiss.length > penAll * 0.03) throw new Error("펜 인식 실패가 많음: " + penMiss.join(" "));
const many = [...warp(Pen.TEMPLATES[3][0], 80, 1, 0), ...warp(Pen.TEMPLATES[7][0], 200, 1, 0), [[262, 150], [264, 152]], ...warp(Pen.TEMPLATES[5][0], 320, 1, 0)];
if (Pen.recognize(many, true) !== "37.5") throw new Error("펜 소수 " + Pen.recognize(many, true));
if (Pen.recognize(many, false) !== "375") throw new Error("펜 정수 " + Pen.recognize(many, false));
// 학습 시간표 (Android 쪽 ScheduleTest.kt와 같은 경우를 검사)
{
  const SC = require(W + "schedule.js");
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`시간표 ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const sc = { enabled: true, slots: [{ days: [1, 2, 3, 4, 5], start: "16:00", end: "18:00" }, { days: [6], start: "09:30", end: "10:30" }], tasks: { MATH: 2, HANJA: 1, KOREAN: 0 } };
  const at = (d, hh, mm) => new Date(2026, 10, d, hh, mm); // 2026-11-17 화요일
  eq(SC.activeSlot(sc, at(17, 15, 59)), null, "시작 전");
  eq(SC.activeSlot(sc, at(17, 16, 0)).key, "2026-11-17#16:00", "시작");
  eq(SC.activeSlot(sc, at(17, 17, 59)).key, "2026-11-17#16:00", "끝 직전");
  eq(SC.activeSlot(sc, at(17, 18, 0)), null, "끝");
  eq(SC.activeSlot(sc, at(21, 16, 30)), null, "토요일 오후");
  eq(SC.activeSlot(sc, at(21, 10, 0)).key, "2026-11-21#09:30", "토요일 오전");
  eq(SC.activeSlot({ ...sc, enabled: false }, at(17, 16, 30)), null, "꺼짐");
  const since = at(17, 16, 0), t = since.getTime();
  const ses = [{ subject: "MATH", startedAt: t - 60000 }, { subject: "MATH", startedAt: t + 1000 }, { subject: "HANJA", startedAt: t + 2000 }];
  let p = SC.taskProgress(sc, ses, since);
  eq(p.items, [{ id: "MATH", need: 2, done: 1 }, { id: "HANJA", need: 1, done: 1 }], "진행");
  eq(p.complete, false, "아직");
  p = SC.taskProgress(sc, [...ses, { subject: "MATH", startedAt: t + 3000 }, { subject: "MATH", startedAt: t + 4000 }], since);
  eq([p.items[0].done, p.complete], [2, true], "완료");
  eq(SC.checkSchedule(sc), null, "올바름");
  // 요일별 과제: 화요일은 국어 1회만, 토요일은 비워 두면 오류
  const byDay = { ...sc, tasksByDay: { 1: { MATH: 1 }, 2: { KOREAN: 1 }, 3: { MATH: 1 }, 4: { MATH: 1 }, 5: { MATH: 1 }, 6: { MATH: 1 }, 7: {} } };
  eq(SC.taskProgress(byDay, ses, since).items, [{ id: "KOREAN", need: 1, done: 0 }], "화요일 과제");
  eq(SC.tasksFor(byDay, at(21, 10, 0)), { MATH: 1 }, "토요일 과제");
  eq(SC.checkSchedule(byDay), null, "요일별 올바름");
  if (SC.checkSchedule({ ...byDay, tasksByDay: { ...byDay.tasksByDay, 6: { MATH: 0 } } }) !== "토요일 과제를 하나 이상 정해 주세요") throw new Error("토요일 빈 과제 통과됨");
  if (!SC.checkSchedule({ ...sc, slots: [{ days: [], start: "16:00", end: "18:00" }] })) throw new Error("요일 없음 통과됨");
  if (!SC.checkSchedule({ ...sc, slots: [{ days: [1], start: "18:00", end: "16:00" }] })) throw new Error("거꾸로 시간 통과됨");
  if (!SC.checkSchedule({ ...sc, tasks: { MATH: 0 } })) throw new Error("과제 없음 통과됨");
}
// ---- 포상 ----
{
  const R = require(W + "rewards.js");
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`포상 ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const SC = require(W + "schedule.js");
  const cfg = { enabled: true, when: "finish", minScore: 80, dailyMax: 2, items: [
    { type: "text", text: " 아이스크림 ", chance: 30 }, { type: "subject", subject: "MATH", chance: 10 }, { type: "day", chance: 5 }] };
  eq(R.checkRewards(cfg), null, "포상 설정 올바름");
  eq(R.totalChance(cfg.items), 45, "확률 합");
  if (!R.checkRewards({ ...cfg, items: [...cfg.items, { type: "text", text: "x", chance: 60 }] })) throw new Error("100% 넘는 확률 통과됨");
  if (!R.checkRewards({ ...cfg, items: [{ type: "text", text: "  ", chance: 5 }] })) throw new Error("빈 포상 통과됨");
  if (!R.checkRewards({ ...cfg, items: [{ type: "day", chance: 0 }] })) throw new Error("0% 포상 통과됨");
  const res = { total: 10, correct: 7 };
  eq(R.drawReward(cfg, res, 0, () => 0.1), { type: "text", subject: undefined, text: "아이스크림" }, "10 → 글 포상");
  eq(R.drawReward(cfg, res, 0, () => 0.35), { type: "subject", subject: "MATH", text: undefined }, "35 → 수학 면제권");
  eq(R.drawReward(cfg, res, 0, () => 0.42).type, "day", "42 → 하루 면제권");
  eq(R.drawReward(cfg, res, 0, () => 0.45), null, "45 → 없음");
  eq(R.drawReward(cfg, res, 2, () => 0), null, "하루 최대");
  eq(R.drawReward({ ...cfg, dailyMax: 0 }, res, 99, () => 0).type, "text", "제한 없음");
  eq(R.drawReward({ ...cfg, enabled: false }, res, 0, () => 0), null, "꺼짐");
  const sc = { ...cfg, when: "score" };
  eq(R.drawReward(sc, res, 0, () => 0), null, "70% < 80%");
  eq(R.drawReward(sc, { total: 10, correct: 8 }, 0, () => 0).type, "text", "80% 이상");
  eq(R.drawReward(sc, { kind: "talk", total: 0, correct: 0 }, 0, () => 0), null, "회화는 점수 조건에서 제외");
  eq(R.drawReward(cfg, { kind: "talk", total: 0, correct: 0 }, 0, () => 0).type, "text", "회화도 끝까지 조건");
  // 확률이 대략 맞는지
  let got = 0; const N = 20000;
  for (let i = 0; i < N; i++) if (R.drawReward(cfg, res, 0)) got++;
  if (Math.abs(got / N - 0.45) > 0.02) throw new Error("확률이 어긋남 " + got / N);
  // 면제권이 과제 진행에 들어가는지
  const day = new Date(2026, 10, 17, 16, 30), today = R.ymd(day);
  const ex = R.exemptionsFor([{ type: "subject", subject: "MATH", usedAt: 1, usedDay: today }, { type: "day", usedAt: 1, usedDay: "2026-11-16" }, { type: "day", usedAt: null }], day);
  eq([ex.all, [...ex.subjects]], [false, ["MATH"]], "오늘 쓴 면제권만");
  const sched = { enabled: true, slots: [{ days: [2], start: "16:00", end: "18:00" }], tasks: { MATH: 2, HANJA: 1 } };
  const since = new Date(2026, 10, 17, 16, 0), ses = [{ subject: "HANJA", startedAt: since.getTime() + 1000 }];
  let pr = SC.taskProgress(sched, ses, since, ex);
  eq([pr.items[0], pr.complete], [{ id: "MATH", need: 2, done: 2, exempt: true }, true], "수학 면제로 완료");
  pr = SC.taskProgress(sched, [], since, { all: true, subjects: new Set() });
  eq(pr.complete, true, "하루 면제");
}
// ---- 한자 급수별 학습 ----
{
  const HS = require(W + "hanja-study.js");
  const { HANJA_RADICALS, RADICAL_NAMES } = require(W + "hanja-radicals.js");
  const fail = (m) => { throw new Error("한자 학습 " + m); };
  let r = 0.3; const rand = () => (r = (r * 9301 + 49297) % 233280 / 233280);
  for (let lv = 1; lv <= 6; lv++) {
    const list = CONTENT.hanja[lv - 1], words = HANJA_EXAM.words.slice(0, lv).flat();
    for (const size of [5, 6, 8, 10]) {
      const groups = HS.chunks(list, size);
      if (groups.flat().length !== list.length) fail("묶음 개수");
      for (const g of groups) {
        const qs = [...HS.wordQs(g, words, 4, rand), ...HS.blankQs(g, words, list, 4, rand), ...HS.radicalQs(g, list, HANJA_RADICALS, RADICAL_NAMES, 4, rand), ...HS.testQs(g, [], list, rand)];
        for (const q of qs) {
          if (q.choices.length !== 4 || new Set(q.choices).size !== 4 || !q.choices.includes(q.answer)) fail(`보기 ${JSON.stringify(q)}`);
          if (q.sentence && !q.sentence.includes("□")) fail("빈칸 문장 " + q.sentence);
          n++;
        }
        // 부수 문제: 오답 보기에는 같은 부수가 없어야
        for (const q of HS.radicalQs(g, list, HANJA_RADICALS, RADICAL_NAMES, 4, rand))
          for (const c of q.choices) if (c !== q.answer && HANJA_RADICALS[c] === HANJA_RADICALS[q.answer]) fail("부수 오답 " + c);
        if (HS.matchTiles(g, rand).length !== g.length * 2) fail("짝 카드");
      }
    }
  }
  // 복습 상자
  const now = Date.UTC(2026, 10, 19), DAY = 864e5;
  let rec = HS.review(undefined, true, now);
  if (rec.box !== 1 || rec.due !== now + DAY) fail("처음 맞힘");
  rec = HS.review(rec, true, now); if (rec.box !== 2 || rec.due !== now + 2 * DAY) fail("두 번 맞힘");
  rec = HS.review(rec, false, now); if (rec.box !== 1 || rec.wrong !== 1) fail("틀림");
  const prog = { 一: { box: 2, due: now - 1 }, 二: { box: 1, due: now + DAY }, 三: { box: 1, due: now - 5 } };
  if (HS.dueChars(prog, now).join("") !== "三一") fail("복습 순서");
  if (HS.groupState([["一"], ["二"]], {}) !== "new" || HS.groupState([["一"], ["二"]], prog) !== "learning" || HS.groupState([["一"]], prog) !== "done") fail("묶음 상태");
}
// ---- 룰렛 ----
{
  const RL = require(W + "roulette.js"), SC = require(W + "schedule.js");
  const fail = (m) => { throw new Error("룰렛 " + m); };
  if (RL.indexAt(0, 5) !== 0 || RL.indexAt(1, 5) !== 4 || RL.indexAt(360 - 73, 5) !== 1 || RL.indexAt(720 + 359, 4) !== 0) fail("칸 번호");
  const weak = RL.spinPlan(RL.speedOf(RL.MIN_PULL + 1)).angle, strong = RL.spinPlan(RL.speedOf(RL.MAX_PULL)).angle;
  if (!(weak > 200 && weak < 720 && strong > 1800 && strong > weak * 3)) fail(`세기 ${weak} ${strong}`);
  // 룰렛 과제: 정해진 과제보다 더 한 만큼 채워진다
  const since = new Date(2026, 10, 20, 16, 0), t = since.getTime();
  const sched = { enabled: true, slots: [{ days: [5], start: "16:00", end: "18:00" }], tasks: { MATH: 1, ROULETTE: 2 } };
  const ses = (l) => l.map((id, i) => ({ subject: id, startedAt: t + 1000 * (i + 1) }));
  let p = SC.taskProgress(sched, ses(["MATH"]), since, null, [{ at: t + 500, subject: "MATH" }]);
  let r = p.items.find((x) => x.id === "ROULETTE");
  if (r.done !== 0 || r.pending.join() !== "MATH" || p.complete) fail("수학 1번은 정해진 과제");
  p = SC.taskProgress(sched, ses(["MATH", "MATH", "HANJA"]), since, null, [{ at: t + 500, subject: "MATH" }, { at: t + 600, subject: "HANJA" }, { at: t - 9999, subject: "KOREAN" }]);
  r = p.items.find((x) => x.id === "ROULETTE");
  if (r.done !== 2 || r.pending.length || !p.complete) fail("룰렛 2번 완료 " + JSON.stringify(r));
  p = SC.taskProgress(sched, [], since, { all: true, subjects: new Set() }, []);
  if (!p.complete) fail("하루 면제");
}
console.log(`통과: 문제 ${n}개 검사, 펜 인식 견본 ${penAll - penMiss.length}/${penAll}`);
