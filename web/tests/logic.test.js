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
  if (!SC.checkSchedule({ ...sc, slots: [{ days: [], start: "16:00", end: "18:00" }] })) throw new Error("요일 없음 통과됨");
  if (!SC.checkSchedule({ ...sc, slots: [{ days: [1], start: "18:00", end: "16:00" }] })) throw new Error("거꾸로 시간 통과됨");
  if (!SC.checkSchedule({ ...sc, tasks: { MATH: 0 } })) throw new Error("과제 없음 통과됨");
}
console.log(`통과: 문제 ${n}개 검사, 펜 인식 견본 ${penAll - penMiss.length}/${penAll}`);
