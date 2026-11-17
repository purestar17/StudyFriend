// 문제 생성과 채점 규칙. Android 앱(content/, AppViewModel.kt)과 같은 규칙을 따른다.
const SUBJECTS = [
  { id: "MATH", title: "수학", mark: "123", levels: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"] },
  { id: "HANJA", title: "한자", mark: "漢", levels: ["8급", "7급", "6급", "5급", "4급Ⅱ", "4급"] },
  { id: "ENGLISH_WORD", title: "영어 단어", mark: "ABC", levels: ["기초", "초급", "중급"] },
  { id: "ENGLISH_TALK", title: "영어 회화", mark: "Hi!", levels: ["기초", "초급", "중급"] },
  { id: "KOREAN", title: "국어 어휘", mark: "가나", levels: ["기초", "초급", "중급"] },
];
const subjectById = (id) => SUBJECTS.find((s) => s.id === id);
const levelLabel = (s, lv) => s.levels[lv - 1] || `레벨 ${lv}`;

const rint = (a, b) => a + Math.floor(Math.random() * (b - a)); // [a, b)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
/** 받침에 따라 을/를 */
const eulReul = (word) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "을" : "를";
};
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

function choiceQuestion({ prompt, answer, pool, big = null, speak = null, explain = null }) {
  const wrong = shuffle([...new Set(pool.filter((x) => x !== answer))]).slice(0, 3);
  return { prompt, big, choices: shuffle([...wrong, answer]), answer, speak, explain };
}

const MathGen = {
  q: (expr, ans, prompt = "계산해 보세요") => ({ prompt, big: `${expr} = ?`, choices: null, answer: String(ans) }),
  1() {
    if (Math.random() < 0.5) { const a = rint(1, 10), b = rint(1, 11); return this.q(`${a} + ${b}`, a + b); }
    const a = rint(5, 20), b = rint(1, a + 1); return this.q(`${a} - ${b}`, a - b);
  },
  2() {
    switch (rint(0, 3)) {
      case 0: { const a = rint(10, 90), b = rint(10, 100 - a); return this.q(`${a} + ${b}`, a + b); }
      case 1: { const a = rint(20, 100), b = rint(10, a); return this.q(`${a} - ${b}`, a - b); }
      default: { const a = rint(2, 10), b = rint(1, 10); return this.q(`${a} × ${b}`, a * b, "구구단"); }
    }
  },
  3() {
    switch (rint(0, 4)) {
      case 0: { const a = rint(100, 900), b = rint(100, 1000 - a); return this.q(`${a} + ${b}`, a + b); }
      case 1: { const a = rint(200, 1000), b = rint(100, a); return this.q(`${a} - ${b}`, a - b); }
      case 2: { const a = rint(11, 100), b = rint(2, 10); return this.q(`${a} × ${b}`, a * b); }
      default: { const b = rint(2, 10), c = rint(2, 10); return this.q(`${b * c} ÷ ${b}`, c); }
    }
  },
  4() {
    switch (rint(0, 3)) {
      case 0: { const a = rint(11, 100), b = rint(11, 100); return this.q(`${a} × ${b}`, a * b); }
      case 1: { const b = rint(2, 10), c = rint(12, 100); return this.q(`${b * c} ÷ ${b}`, c); }
      default: { const b = rint(11, 30), c = rint(2, 20); return this.q(`${b * c} ÷ ${b}`, c); }
    }
  },
  5() {
    switch (rint(0, 4)) {
      case 0: { const a = rint(2, 30), b = rint(2, 10), c = rint(2, 10); return this.q(`${a} + ${b} × ${c}`, a + b * c, "곱셈을 먼저 계산해요"); }
      case 1: { const a = rint(2, 15), b = rint(2, 15), c = rint(2, 9); return this.q(`(${a} + ${b}) × ${c}`, (a + b) * c, "괄호 안을 먼저 계산해요"); }
      case 2: {
        const g = rint(2, 10), x = rint(1, 6); let y = rint(1, 6);
        while (gcd(x, y) !== 1 || x === y) y = rint(1, 7);
        return { prompt: "두 수의 최대공약수는?", big: `${g * x}, ${g * y}`, choices: null, answer: String(g) };
      }
      default: {
        const a = rint(2, 10); let b = rint(2, 13);
        while (b === a) b = rint(2, 13);
        return { prompt: "두 수의 최소공배수는?", big: `${a}, ${b}`, choices: null, answer: String((a / gcd(a, b)) * b) };
      }
    }
  },
  6() {
    switch (rint(0, 4)) {
      case 0: { const a = rint(101, 1000), b = rint(11, 100); return this.q(`${a} × ${b}`, a * b); }
      case 1: {
        const p = pick([10, 20, 25, 50, 75]), base = rint(1, 20) * 4 * 5;
        return { prompt: "백분율 계산", big: `${base} 의 ${p}% = ?`, choices: null, answer: String((base * p) / 100) };
      }
      case 2: { const a = rint(2, 20); return { prompt: "제곱 계산", big: `${a} × ${a} = ?`, choices: null, answer: String(a * a) }; }
      default: { const b = rint(12, 40), c = rint(11, 60); return this.q(`${b * c} ÷ ${b}`, c); }
    }
  },
};

const bankAt = (banks, lv) => banks[Math.min(Math.max(lv - 1, 0), banks.length - 1)];

// ---- 한자: 한자능력검정시험(8급~4급) 유형 ----
const HANJA_LEVEL_NAMES = ["8급", "7급", "6급", "5급", "4급Ⅱ", "4급"];
const hanjaUpTo = (lv) => CONTENT.hanja.slice(0, Math.min(Math.max(lv, 1), CONTENT.hanja.length)).flat();
const hanjaMeaning = (ch) => { for (const lv of CONTENT.hanja) for (const [h, m] of lv) if (h === ch) return m; return null; };
/** 이번 급수 것을 70% 확률로, 아래 급수 것을 30% 확률로 고른다 (급수 시험은 아래 급수 한자도 포함) */
function pickByLevel(levels, lv) {
  const idx = Math.min(Math.max(lv - 1, 0), levels.length - 1);
  const lower = levels.slice(0, idx).flat();
  return pick(lower.length && Math.random() < 0.3 ? lower : levels[idx]);
}
const wordsUpTo = (lv) => HANJA_EXAM.words.slice(0, Math.min(lv, HANJA_EXAM.words.length)).flat();
const charLevel = (ch) => CONTENT.hanja.findIndex((l) => l.some(([h]) => h === ch)) + 1;
const textLevel = (t) => Math.max(...[...t].map(charLevel));
/** 같은 글자 수의 읽기를 오답으로 쓰고, 모자라면 다른 읽기로 채운다 */
function readingPool(lv, r) {
  const all = wordsUpTo(lv).map((x) => x[1]);
  const same = all.filter((x) => x.length === r.length && x !== r);
  return same.length >= 3 ? same : all;
}

const HanjaTypes = {
  meaning(lv) {
    const [h, m] = pickByLevel(CONTENT.hanja, lv);
    return choiceQuestion({ prompt: "다음 漢字의 훈(뜻)과 음(소리)은?", answer: m, pool: hanjaUpTo(lv).map((x) => x[1]), big: h, explain: `${h} : ${m}` });
  },
  pickHanja(lv) {
    const [h, m] = pickByLevel(CONTENT.hanja, lv);
    return choiceQuestion({ prompt: `훈과 음이 '${m}'인 漢字는?`, answer: h, pool: hanjaUpTo(lv).map((x) => x[0]), explain: `${h} : ${m}` });
  },
  wordReading(lv) {
    const [w, r, mean] = pickByLevel(HANJA_EXAM.words, lv);
    const pool = readingPool(lv, r);
    return choiceQuestion({ prompt: "다음 漢字語의 독음(읽는 소리)은?", answer: r, pool, big: w, explain: `${w}(${r}) : ${mean}` });
  },
  sentence(lv) {
    const withSentence = HANJA_EXAM.words.map((l) => l.filter((x) => x[3]));
    const [w, r, mean, sent] = pickByLevel(withSentence, lv);
    const pool = readingPool(lv, r);
    const q = choiceQuestion({ prompt: "밑줄 친 漢字語를 바르게 읽은 것은?", answer: r, pool, explain: `${w}(${r}) : ${mean}` });
    q.sentence = sent;
    return q;
  },
  wordMeaning(lv) {
    const [w, r, mean] = pickByLevel(HANJA_EXAM.words, lv);
    return choiceQuestion({ prompt: "다음 漢字語의 뜻으로 알맞은 것은?", answer: mean, pool: wordsUpTo(lv).map((x) => x[2]), big: w, explain: `${w}(${r}) : ${mean}` });
  },
  opposite(lv) {
    const pairs = HANJA_EXAM.opposites.filter((p) => textLevel(p) <= lv);
    const p = pick(pairs);
    const [a, b] = Math.random() < 0.5 ? [p[0], p[1]] : [p[1], p[0]];
    const pool = [...new Set(pairs.join("").split(""))].filter((c) => c !== a);
    return choiceQuestion({ prompt: "다음 漢字와 뜻이 반대(상대)되는 漢字는?", answer: b, pool, big: a,
      explain: `${a}(${hanjaMeaning(a)}) ↔ ${b}(${hanjaMeaning(b)})` });
  },
  blank(lv) {
    const [w, r, mean] = pickByLevel(HANJA_EXAM.words, lv);
    const i = Math.floor(Math.random() * w.length);
    const shown = [...w].map((c, j) => (j === i ? "□" : c)).join("");
    return choiceQuestion({ prompt: `'${r}'(${mean})${eulReul(mean)} 漢字로 쓸 때 □에 들어갈 漢字는?`, answer: w[i],
      pool: hanjaUpTo(lv).map((x) => x[0]).filter((c) => !w.includes(c)), big: shown, explain: `${w}(${r})` });
  },
  idiom(lv) {
    const list = HANJA_EXAM.idioms.filter((x) => textLevel(x[0]) <= lv);
    const [w, r, mean] = pick(list);
    const k = rint(0, 3);
    if (k === 0) return choiceQuestion({ prompt: "다음 사자성어의 독음은?", answer: r, pool: HANJA_EXAM.idioms.map((x) => x[1]), big: w, explain: `${w}(${r}) : ${mean}` });
    if (k === 1) return choiceQuestion({ prompt: "다음 사자성어의 뜻으로 알맞은 것은?", answer: mean, pool: HANJA_EXAM.idioms.map((x) => x[2]), big: w, explain: `${w}(${r}) : ${mean}` });
    const i = rint(0, 4);
    const shown = [...w].map((c, j) => (j === i ? "□" : c)).join("");
    return choiceQuestion({ prompt: `사자성어 '${r}'의 □에 들어갈 漢字는?`, answer: w[i], pool: hanjaUpTo(lv).map((x) => x[0]).filter((c) => !w.includes(c)), big: shown, explain: `${w}(${r}) : ${mean}` });
  },
  strokeCount(lv) {
    const c = pickByLevel(CONTENT.hanja.map((l) => l.map((x) => x[0]).filter((h) => STROKE_COUNTS[h])), lv);
    const n = STROKE_COUNTS[c];
    const near = [n - 2, n - 1, n + 1, n + 2, n + 3].filter((x) => x >= 1);
    return choiceQuestion({ prompt: "다음 漢字의 총획수(모두 몇 획)는?", answer: `${n}획`, pool: near.map((x) => `${x}획`), big: c, explain: `${c} : 총 ${n}획` });
  },
  strokeOrder(lv) {
    const c = pickByLevel(CONTENT.hanja.map((l) => l.map((x) => x[0]).filter((h) => STROKE_COUNTS[h] >= 4)), lv);
    const n = STROKE_COUNTS[c];
    const k = rint(1, n + 1);
    const pool = Array.from({ length: n }, (_, i) => `${i + 1}번째`);
    const q = choiceQuestion({ prompt: "진하게 표시한 획은 몇 번째에 쓰나요?", answer: `${k}번째`, pool, explain: `${c} : ${k}번째 획 (총 ${n}획)` });
    q.stroke = { char: c, highlight: k - 1 };
    return q;
  },
};
// 유형별 출제 비율 (합 100)
const HANJA_MIX = [["meaning", 18], ["pickHanja", 12], ["wordReading", 15], ["sentence", 12], ["wordMeaning", 10],
  ["opposite", 8], ["blank", 8], ["idiom", 7], ["strokeCount", 5], ["strokeOrder", 5]];
const HANJA_TYPE_LABEL = { meaning: "훈음", pickHanja: "한자 찾기", wordReading: "한자어 읽기", sentence: "문장 속 한자어",
  wordMeaning: "한자어 뜻", opposite: "반대자", blank: "빈칸 채우기", idiom: "사자성어", strokeCount: "총획수", strokeOrder: "필순" };

function hanjaQuestion(lv, type) {
  if (!type) {
    let r = Math.random() * 100;
    type = HANJA_MIX.find(([, w]) => (r -= w) < 0)?.[0] || "meaning";
  }
  const q = HanjaTypes[type](lv);
  q.tag = HANJA_TYPE_LABEL[type];
  return q;
}

function wordQuestion(lv) {
  const bank = bankAt(CONTENT.words, lv);
  const [en, ko] = pick(bank);
  if (Math.random() < 0.6)
    return choiceQuestion({ prompt: "이 단어의 뜻은?", answer: ko, pool: bank.map((x) => x[1]), big: en, speak: en, explain: `${en} = ${ko}` });
  return choiceQuestion({ prompt: `'${ko}'${eulReul(ko)} 영어로 하면?`, answer: en, pool: bank.map((x) => x[0]), speak: en, explain: `${ko} = ${en}` });
}

function talkQuestion(lv) {
  const t = pick(bankAt(CONTENT.talks, lv));
  return { prompt: "알맞은 대답을 골라 보세요", big: t.line, choices: shuffle([...t.wrong, t.reply]), answer: t.reply,
    speak: t.line, explain: `${t.line} (${t.ko}) → ${t.reply}` };
}

function koreanQuestion(lv) {
  const k = pick(bankAt(CONTENT.korean, lv));
  return { prompt: k.prompt, big: k.big, choices: shuffle([...k.wrong, k.answer]), answer: k.answer, explain: `정답: ${k.answer}` };
}

function oneQuestion(subjectId, lv) {
  switch (subjectId) {
    case "MATH": return mathQuestion(lv);
    case "HANJA": return hanjaQuestion(lv);
    case "ENGLISH_WORD": return wordQuestion(lv);
    case "ENGLISH_TALK": return talkQuestion(lv);
    default: return koreanQuestion(lv);
  }
}

function makeSession(subjectId, lv, count) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 20) {
    tries++;
    const q = oneQuestion(subjectId, lv);
    if (!out.some((o) => o.big === q.big && o.prompt === q.prompt && o.answer === q.answer && o.sentence === q.sentence)) out.push(q);
  }
  return out;
}

const normalize = (s) => {
  const t = String(s).trim().replace(/ /g, "").toLowerCase();
  // 숫자 답은 값으로 비교 (예: 0.50 과 0.5)
  return /^-?\d+(\.\d+)?$/.test(t) ? String(Number(t)) : t;
};

/** 정답률에 따른 레벨 변화: +1, -1, 0 */
function levelChange(rate, lv, maxLv) {
  if (rate >= 0.9 && lv < maxLv) return 1;
  if (rate < 0.5 && lv > 1) return -1;
  return 0;
}

if (typeof module !== "undefined") module.exports = { MathGen, SUBJECTS, oneQuestion, makeSession, levelChange, normalize, hanjaQuestion, HanjaTypes, HANJA_LEVEL_NAMES };
