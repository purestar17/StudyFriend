// 문제 생성과 채점 규칙. Android 앱(content/, AppViewModel.kt)과 같은 규칙을 따른다.
const SUBJECTS = [
  { id: "MATH", title: "수학", mark: "123", levels: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"] },
  { id: "HANJA", title: "한자", mark: "漢", levels: ["8급", "7급", "6급"] },
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

function hanjaQuestion(lv) {
  const bank = bankAt(CONTENT.hanja, lv);
  const [h, m] = pick(bank);
  if (Math.random() < 0.7)
    return choiceQuestion({ prompt: "이 한자의 뜻과 소리는?", answer: m, pool: bank.map((x) => x[1]), big: h, explain: `${h} : ${m}` });
  return choiceQuestion({ prompt: `'${m}'에 알맞은 한자는?`, answer: h, pool: bank.map((x) => x[0]), explain: `${h} : ${m}` });
}

function wordQuestion(lv) {
  const bank = bankAt(CONTENT.words, lv);
  const [en, ko] = pick(bank);
  if (Math.random() < 0.6)
    return choiceQuestion({ prompt: "이 단어의 뜻은?", answer: ko, pool: bank.map((x) => x[1]), big: en, speak: en, explain: `${en} = ${ko}` });
  return choiceQuestion({ prompt: `'${ko}'을(를) 영어로 하면?`, answer: en, pool: bank.map((x) => x[0]), speak: en, explain: `${ko} = ${en}` });
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
    case "MATH": return MathGen[Math.min(Math.max(lv, 1), 6)]();
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
    if (!out.some((o) => o.big === q.big && o.prompt === q.prompt && o.answer === q.answer)) out.push(q);
  }
  return out;
}

const normalize = (s) => String(s).trim().replace(/ /g, "").toLowerCase();

/** 정답률에 따른 레벨 변화: +1, -1, 0 */
function levelChange(rate, lv, maxLv) {
  if (rate >= 0.9 && lv < maxLv) return 1;
  if (rate < 0.5 && lv > 1) return -1;
  return 0;
}

if (typeof module !== "undefined") module.exports = { SUBJECTS, oneQuestion, makeSession, levelChange, normalize };
