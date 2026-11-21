// 급수별 한자 학습: 학습지처럼 한 묶음(5~10자)을 여러 활동으로 익힌다.
// 훈음 카드 → 짝 맞추기 → 따라 쓰기·혼자 쓰기 → 한자어 → 빈칸 채우기 → 같은 부분(부수) 찾기 → 확인 시험.
// 확인 시험 결과로 글자마다 복습 상자(1~5)를 올리고 내려서, 잊을 만할 때 다시 나오게 한다.
// 여기에는 화면 없이 계산만 둔다 (테스트하기 쉽게). 화면은 app.js.
(() => {
  const g = typeof window !== "undefined" ? window : globalThis;
  const DAY = 864e5;
  /** 상자별 다음 복습까지 날 수 (상자 1: 다음 날, 5: 보름 뒤) */
  const INTERVALS = [0, 1, 2, 4, 7, 15];
  const STEPS = [
    ["cards", "훈음 익히기"], ["match", "짝 맞추기"], ["write", "쓰기"], ["words", "한자어"],
    ["blank", "빈칸 채우기"], ["radical", "같은 부분 찾기"], ["test", "확인 시험"],
  ];

  const shuffle = (a, rand = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n, rand) => shuffle(a, rand).slice(0, n);

  /** 급수(1부터)의 한자를 size자씩 묶는다 → [[ [한자, 훈음], ... ], ...] */
  function chunks(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    // 마지막 묶음이 너무 작으면(절반 미만) 앞 묶음에 붙인다
    if (out.length > 1 && out[out.length - 1].length < size / 2) out[out.length - 2] = out[out.length - 2].concat(out.pop());
    return out;
  }

  /** 글자 기록 { box, due, seen } 을 시험 결과로 바꾼다 */
  function review(rec, ok, now = Date.now()) {
    const box = ok ? Math.min(5, ((rec && rec.box) || 0) + 1) : 1;
    return { box, due: now + INTERVALS[box] * DAY, seen: now, wrong: ((rec && rec.wrong) || 0) + (ok ? 0 : 1) };
  }

  /** 묶음 상태: new(처음) | learning(익히는 중) | done(모두 상자 2 이상) */
  function groupState(group, prog) {
    const recs = group.map(([c]) => prog[c]);
    if (recs.every((r) => !r)) return "new";
    return recs.every((r) => r && r.box >= 2) ? "done" : "learning";
  }

  /** 복습할 때가 된 글자 (오래된 것부터) */
  function dueChars(prog, now = Date.now(), only = null) {
    return Object.entries(prog).filter(([c, r]) => r.box >= 1 && r.due <= now && (!only || only.has(c)))
      .sort((a, b) => a[1].due - b[1].due).map(([c]) => c);
  }

  // ---- 활동 문제 만들기 ----
  // levelList: 그 급수의 [한자, 훈음] 전부, words: 그 급수까지의 한자어 [한자어, 읽기, 뜻, 문장]
  function others(pool, not, n, rand) { return pick(pool.filter((x) => !not.includes(x)), n, rand); }
  const q4 = (prompt, big, answer, wrong, extra = {}, rand) => ({ prompt, big, answer, choices: shuffle([answer, ...wrong], rand), ...extra });

  /** 한자어: 오늘 한자가 들어간 낱말의 읽기·뜻 고르기 */
  function wordQs(group, words, max = 4, rand = Math.random) {
    const chars = group.map(([c]) => c);
    const mine = words.filter((w) => chars.some((c) => w[0].includes(c)));
    const used = pick(mine, max, rand);
    const readings = [...new Set(words.map((w) => w[1]))], means = [...new Set(words.map((w) => w[2]))];
    return used.map((w, i) => (i % 2 === 0
      ? q4("이 한자어는 어떻게 읽을까요?", w[0], w[1], others(readings, [w[1]], 3, rand), { explain: `${w[0]}(${w[1]}): ${w[2]}` }, rand)
      : q4(`'${w[0]}(${w[1]})'의 뜻은?`, w[0], w[2], others(means, [w[2]], 3, rand), { explain: `${w[0]}(${w[1]}): ${w[2]}` }, rand)));
  }

  /** 빈칸 채우기: 문장 속 한자어에서 오늘 한자 한 글자를 비우고 고르기 */
  function blankQs(group, words, levelList, max = 4, rand = Math.random) {
    const chars = group.map(([c]) => c), all = levelList.map(([c]) => c);
    const cands = [];
    for (const w of words) {
      if (!w[3]) continue;
      for (const c of chars) if (w[0].includes(c)) cands.push([w, c]);
    }
    const seen = new Set();
    return pick(cands, cands.length, rand).filter(([w]) => (seen.has(w[0]) ? false : seen.add(w[0]))).slice(0, max).map(([w, c]) => {
      const blank = w[0].replace(c, "□");
      const pool = [...chars.filter((x) => x !== c), ...all].filter((x) => !w[0].includes(x));
      return q4("□에 알맞은 한자를 골라요.", undefined, c, others([...new Set(pool)], [c], 3, rand),
        { sentence: w[3].replace(`[${w[0]}]`, `[${blank}]`), explain: `${w[0]}(${w[1]}): ${w[2]}` }, rand);
    });
  }

  /** 같은 부분(부수) 찾기 */
  function radicalQs(group, levelList, radicals, names, max = 4, rand = Math.random) {
    const has = group.filter(([c]) => radicals[c]);
    return pick(has, max, rand).map(([c, m]) => {
      const r = radicals[c], [disp, name] = names[r];
      const wrong = levelList.filter(([x]) => x !== c && radicals[x] !== r && !x.includes(disp)).map(([x]) => x);
      return q4(`'${disp}'(${name})이 들어간 한자는?`, disp, c, others(wrong, [c], 3, rand), { explain: `${c} ${m} · 부수 ${disp}(${name})` }, rand);
    });
  }

  /** 확인 시험: 한자→훈음, 훈음→한자를 섞는다. review는 복습할 [한자, 훈음] */
  function testQs(group, reviewList, levelList, rand = Math.random) {
    const items = [...group, ...reviewList.filter(([c]) => !group.some(([x]) => x === c))];
    const chars = levelList.map(([c]) => c), means = levelList.map(([, m]) => m);
    return shuffle(items, rand).map(([c, m], i) => (i % 2 === 0
      ? q4("이 한자의 훈과 음은?", c, m, others(means, [m], 3, rand), { hanja: c }, rand)
      : q4(`'${m}'에 맞는 한자는?`, null, c, others(chars, [c], 3, rand), { hanja: c, big: undefined, bigChoices: true }, rand)));
  }

  /** 짝 맞추기 카드: 한자와 훈음을 섞어 늘어놓는다 */
  function matchTiles(group, rand = Math.random) {
    return shuffle(group.flatMap(([c, m]) => [{ key: c, text: c, kind: "hanja" }, { key: c, text: m, kind: "mean" }]), rand);
  }

  const api = { HANJA_STEPS: STEPS, REVIEW_INTERVALS: INTERVALS, chunks, review, groupState, dueChars, wordQs, blankQs, radicalQs, testQs, matchTiles, shuffle };
  if (typeof module !== "undefined") module.exports = api;
  else g.HanjaStudy = api;
})();
