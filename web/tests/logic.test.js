// 실행: node web/tests/logic.test.js
// 모든 과목·레벨·한자 유형의 문제를 많이 만들어 보고 형식과 정답이 올바른지 검사한다.
const path = require("path");
const W = path.join(__dirname, "..") + "/";
global.CONTENT = require(W + "content-data.js");
global.HANJA_EXAM = require(W + "hanja-exam-data.js");
global.STROKE_COUNTS = require(W + "stroke-counts.js");
const { SUBJECTS, oneQuestion, makeSession, hanjaQuestion, HanjaTypes } = require(W + "logic.js");

let n = 0;
const fail = (msg, q) => { throw new Error(msg + " " + JSON.stringify(q)); };
for (const s of SUBJECTS) for (let lv = 1; lv <= s.levels.length; lv++) for (let i = 0; i < 500; i++) {
  const q = oneQuestion(s.id, lv); n++;
  if (q.choices === null) {
    const v = Number(q.answer);
    if (!Number.isInteger(v) || v < 0) fail("숫자 답", q);
    const m = /^(\d+) ([+\-×÷]) (\d+) = \?$/.exec(q.big);
    if (m) {
      const a = +m[1], b = +m[3];
      const e = { "+": a + b, "-": a - b, "×": a * b, "÷": a / b }[m[2]];
      if (String(e) !== q.answer) fail("수학 정답", q);
    }
  } else if (new Set(q.choices).size !== 4 || !q.choices.includes(q.answer)) fail("보기", q);
}
for (let lv = 1; lv <= CONTENT.hanja.length; lv++) for (const t of Object.keys(HanjaTypes)) for (let i = 0; i < 300; i++) {
  const q = hanjaQuestion(lv, t); n++;
  if (new Set(q.choices).size !== 4 || !q.choices.includes(q.answer)) fail("한자 " + t, q);
  if (t === "sentence" && !/\[.+\]/.test(q.sentence)) fail("예문", q);
  if (t === "blank" && q.big.includes(q.answer)) fail("빈칸", q);
  if (t === "strokeOrder" && !(q.stroke && STROKE_COUNTS[q.stroke.char] > q.stroke.highlight)) fail("필순", q);
}
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
console.log(`통과: 문제 ${n}개 검사`);
