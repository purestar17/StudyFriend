// 수학 문제집형 문제. 학년(레벨 1~6)별로 교과 단원에 맞춘 여러 유형을 섞어 낸다.
// 문제 필드: prompt, big, choices(null이면 직접 입력), answer, explain, tag(유형), figure(그림), input("int"|"decimal"), unit(답 단위)
(() => {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a)); // [a, b)
  const P = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const mix = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const num = (prompt, answer, extra = {}) => ({ prompt, big: null, choices: null, answer: String(answer), input: "int", ...extra });
  const dec = (x) => String(Math.round(x * 1000) / 1000);
  /** 정답과 오답 후보로 4지선다 (오답은 정답과 다르고 서로 달라야 함) */
  function pick4(prompt, answer, wrongs, extra = {}) {
    // 분수는 값이 정답과 같은 오답(약분 전 모양 등)과 분모가 0인 보기를 뺀다
    const fv = (t) => { const m = /^(\d+)\/(\d+)$/.exec(t); return m ? (+m[2] ? +m[1] / +m[2] : NaN) : null; };
    const av = fv(String(answer));
    const w = [...new Set(wrongs.map(String))].filter((x) => x !== String(answer) && !Number.isNaN(fv(x)) && (av === null || fv(x) !== av));
    return { prompt, big: null, choices: mix([...mix(w).slice(0, 3), String(answer)]), answer: String(answer), ...extra };
  }
  const near = (n, spread = 3, min = 0) => {
    const out = new Set();
    while (out.size < 6) { const d = R(-spread, spread + 1); if (d && n + d >= min) out.add(n + d); }
    return [...out];
  };
  const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
  const fracRaw = (n, d) => `${n}/${d}`;
  const NAMES = ["민수", "지아", "서준", "하린", "도윤", "예린", "준호", "수아"];
  const ITEMS = [["사탕", "개"], ["구슬", "개"], ["색종이", "장"], ["연필", "자루"], ["딱지", "장"], ["사과", "개"]];
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b; };

  const T = {
    // ---- 공통: 계산 (기존 연산 문제) ----
    calc: (lv) => ({ ...MathGen[lv](), input: "int" }),

    // ---- 1학년 ----
    blank1() {
      const a = R(1, 10), b = R(1, 10);
      return Math.random() < 0.5
        ? num("□에 알맞은 수를 쓰세요", b, { big: `${a} + □ = ${a + b}` })
        : num("□에 알맞은 수를 쓰세요", a + b, { big: `□ - ${b} = ${a}` });
    },
    compare1() {
      const a = R(10, 50); let b = R(10, 50); if (Math.random() < 0.15) b = a;
      return pick4("두 수의 크기를 비교하여 알맞은 것을 고르세요", a > b ? ">" : a < b ? "<" : "=", [">", "<", "="], { big: `${a} ○ ${b}`, choices: [">", "<", "="] });
    },
    clock1() {
      const h = R(1, 13), m = P([0, 30]);
      const ans = m ? `${h}시 30분` : `${h}시`;
      const wr = [m ? `${h}시` : `${h}시 30분`, `${(h % 12) + 1}시${m ? " 30분" : ""}`, `${h === 1 ? 12 : h - 1}시${m ? " 30분" : ""}`, `${(h % 12) + 1}시 30분`];
      return pick4("시계가 나타내는 시각은?", ans, wr, { figure: { kind: "clock", h, m } });
    },
    shapes1() {
      const s = P([["rect", "□ 모양"], ["tri", "△ 모양"], ["circle", "○ 모양"]]);
      return { prompt: "같은 모양을 찾아 고르세요", big: null, figure: { kind: "shape", shape: s[0] }, choices: ["□ 모양", "△ 모양", "○ 모양"], answer: s[1] };
    },
    tens1() {
      const t = R(1, 10), o = R(0, 10);
      return num("수 모형이 나타내는 수는?", t * 10 + o, { figure: { kind: "blocks", tens: t, ones: o }, explain: `10개씩 묶음 ${t}개와 낱개 ${o}개는 ${t * 10 + o}` });
    },
    word1() {
      const n = P(NAMES), [it, u] = P(ITEMS);
      if (Math.random() < 0.5) {
        const a = R(3, 10), b = R(2, 10);
        return num(`${n}${josa(n, "이는", "는")} ${it} ${a}${u}${josa(u, "을", "를")} 가지고 있었는데, 친구에게 ${b}${u}${josa(u, "을", "를")} 더 받았어요. ${n}${josa(n, "이가", "가")} 가진 ${it}는 모두 몇 ${u}일까요?`, a + b, { unit: u, explain: `${a} + ${b} = ${a + b}` });
      }
      const a = R(8, 19), b = R(2, a);
      return num(`${it} ${a}${u} 중에서 ${b}${u}${josa(u, "을", "를")} 썼어요. 남은 ${it}는 몇 ${u}일까요?`, a - b, { unit: u, explain: `${a} - ${b} = ${a - b}` });
    },
    pattern1() {
      const step = P([1, 2, 5, 10]), s = R(1, 20), k = R(0, 4);
      const seq = [0, 1, 2, 3, 4].map((i) => s + step * i);
      return num("규칙에 맞게 □에 알맞은 수를 쓰세요", seq[k], { big: seq.map((x, i) => (i === k ? "□" : x)).join(", "), explain: `${step}씩 커지는 규칙` });
    },

    // ---- 2학년 ----
    place2() {
      const a = R(1, 10), b = R(0, 10), c = R(0, 10);
      if (Math.random() < 0.5) return num("100이 " + a + "개, 10이 " + b + "개, 1이 " + c + "개인 수는?", a * 100 + b * 10 + c);
      const n = a * 100 + b * 10 + c, which = P([["백", a], ["십", b], ["일", c]]);
      return num(`${n}에서 ${which[0]}의 자리 숫자는?`, which[1], { big: String(n) });
    },
    word2() {
      const n = P(NAMES), [it, u] = P(ITEMS), a = R(2, 10), b = R(2, 10);
      return num(`한 봉지에 ${it}${josa(it, "이", "가")} ${a}${u}씩 들어 있어요. ${b}봉지에는 ${it}${josa(it, "이", "가")} 모두 몇 ${u} 있을까요?`, a * b, { unit: u, explain: `${a} × ${b} = ${a * b}` });
    },
    clock2() {
      const h = R(1, 13), m = R(0, 12) * 5;
      const fmt = (hh, mm) => `${hh}시 ${mm}분`;
      return pick4("시계가 나타내는 시각은?", fmt(h, m), [fmt(h, (m + 5) % 60), fmt(h, (m + 55) % 60), fmt((h % 12) + 1, m), fmt(h, (m + 30) % 60), fmt(h === 1 ? 12 : h - 1, m)], { figure: { kind: "clock", h, m } });
    },
    length2() {
      const m = R(1, 6), cm = R(1, 100);
      return Math.random() < 0.5
        ? num("□ 안에 알맞은 수를 쓰세요", m * 100 + cm, { big: `${m}m ${cm}cm = □cm`, unit: "cm" })
        : num("□ 안에 알맞은 수를 쓰세요", cm, { big: `${m * 100 + cm}cm = ${m}m □cm`, unit: "cm" });
    },
    polygon2() {
      const n = P([3, 4, 5, 6]), name = { 3: "삼각형", 4: "사각형", 5: "오각형", 6: "육각형" }[n];
      if (Math.random() < 0.5) return pick4("이 도형의 이름은?", name, ["삼각형", "사각형", "오각형", "육각형", "원"], { figure: { kind: "polygon", n } });
      return num(`이 도형의 ${P(["꼭짓점", "변"])}은 몇 개일까요?`, n, { figure: { kind: "polygon", n }, unit: "개" });
    },
    blank2() {
      const a = R(2, 10), b = R(2, 10);
      return num("□에 알맞은 수를 쓰세요", b, { big: `${a} × □ = ${a * b}` });
    },

    // ---- 3학년 ----
    fraction3() {
      const d = P([2, 3, 4, 5, 6, 8]), n = R(1, d);
      const wr = [fracRaw(d - n, d), fracRaw(n, d + 1), fracRaw(n + 1 <= d ? n + 1 : n - 1 || 1, d), fracRaw(d, n)];
      return pick4("색칠한 부분은 전체의 얼마일까요?", fracRaw(n, d), wr, { figure: { kind: "fraction", n, d, style: P(["pie", "bar"]) } });
    },
    unit3() {
      const k = P([["L", "mL"], ["kg", "g"]]), a = R(1, 6), b = R(1, 10) * 100;
      return Math.random() < 0.5
        ? num("□ 안에 알맞은 수를 쓰세요", a * 1000 + b, { big: `${a}${k[0]} ${b}${k[1]} = □${k[1]}`, unit: k[1] })
        : num("□ 안에 알맞은 수를 쓰세요", b, { big: `${a * 1000 + b}${k[1]} = ${a}${k[0]} □${k[1]}`, unit: k[1] });
    },
    time3() {
      const h = R(1, 11), m = R(1, 12) * 5, add = R(2, 12) * 5;
      const total = h * 60 + m + add, hh = Math.floor(total / 60), mm = total % 60;
      const f = (a, b) => `${a}시 ${b}분`;
      return pick4(`${f(h, m)}에서 ${add}분이 지나면 몇 시 몇 분일까요?`, f(hh, mm), [f(hh, (mm + 10) % 60), f(h, (m + add) % 60), f(hh + 1, mm), f(hh, (mm + 50) % 60)], { explain: `${m}분 + ${add}분 = ${m + add}분` });
    },
    divword3() {
      const n = R(3, 9), q = R(2, 9), r = R(1, n), total = n * q + r, [it, u] = P(ITEMS);
      return num(`${it} ${total}${u}${josa(u, "을", "를")} ${n}명에게 똑같이 나누어 주면, 한 명에게 몇 ${u}씩 줄 수 있을까요? (남는 것은 빼고)`, q, { unit: u, explain: `${total} ÷ ${n} = ${q} … ${r}` });
    },
    circle3() {
      const r = R(2, 15);
      return Math.random() < 0.5
        ? num("반지름이 " + r + "cm인 원의 지름은 몇 cm일까요?", r * 2, { unit: "cm", figure: { kind: "circle", label: `${r}cm` } })
        : num("지름이 " + r * 2 + "cm인 원의 반지름은 몇 cm일까요?", r, { unit: "cm" });
    },
    decimal3() {
      const a = R(1, 10), b = R(1, 10);
      return Math.random() < 0.5
        ? { ...num(`0.1이 ${a * 10 + b}개인 수는?`, dec((a * 10 + b) / 10)), input: "decimal" }
        : { ...num("□ 안에 알맞은 수를 쓰세요", dec(a + b / 10), { big: `${a}cm ${b}mm = □cm`, unit: "cm" }), input: "decimal" };
    },

    // ---- 4학년 ----
    bignum4() {
      const a = R(1, 10), b = R(1, 10), c = R(1, 10);
      if (Math.random() < 0.5) return num(`10000이 ${a}개, 1000이 ${b}개, 100이 ${c}개인 수는?`, a * 10000 + b * 1000 + c * 100);
      const ok = R(1, 10), man = R(1, 10) * 1000;
      return pick4("다음 수를 숫자로 바르게 쓴 것은?", `${ok}${String(man).padStart(4, "0")}0000`, [`${ok}${String(man).padStart(4, "0")}000`, `${ok}0${man}0000`, `${ok}${String(man).padStart(4, "0")}00000`, `${ok}${man}000`], { big: `${ok}억 ${man}만` });
    },
    angle4() {
      const a = R(30, 100), b = R(20, 150 - a);
      return num("삼각형의 두 각이 다음과 같을 때, 나머지 한 각은 몇 도일까요?", 180 - a - b, { big: `${a}°, ${b}°, □°`, unit: "°", figure: { kind: "triangle", a, b }, explain: `삼각형의 세 각의 합은 180°` });
    },
    angleType4() {
      const deg = P([R(10, 90), 90, R(91, 180)]);
      return { prompt: "이 각은 무엇일까요?", big: null, figure: { kind: "angle", deg }, choices: ["예각", "직각", "둔각"], answer: deg < 90 ? "예각" : deg === 90 ? "직각" : "둔각", explain: `${deg}°` };
    },
    fracAdd4() {
      const d = R(5, 13), a = R(1, d - 1), b = R(1, d - a + 1);
      if (Math.random() < 0.5) {
        const s = a + b;
        return pick4("계산해 보세요", fracRaw(s, d), [fracRaw(s, d * 2), fracRaw(a * b, d), fracRaw(s + 1, d), fracRaw(Math.abs(a - b) || 1, d)], { big: `${a}/${d} + ${b}/${d} = ?` });
      }
      const x = R(2, d), y = R(1, x);
      return pick4("계산해 보세요", fracRaw(x - y, d), [fracRaw(x + y, d), fracRaw(x - y, d * 2), fracRaw(x - y + 1, d), fracRaw(x, d), fracRaw(x - y, d + 1)], { big: `${x}/${d} - ${y}/${d} = ?` });
    },
    decAdd4() {
      const a = R(10, 99) / 10, b = R(10, 99) / 10;
      return Math.random() < 0.5
        ? { ...num("계산해 보세요", dec(a + b), { big: `${a} + ${b} = ?` }), input: "decimal" }
        : { ...num("계산해 보세요", dec(Math.max(a, b) - Math.min(a, b)), { big: `${Math.max(a, b)} - ${Math.min(a, b)} = ?` }), input: "decimal" };
    },
    graph4() {
      const labels = mix(["사과", "포도", "딸기", "귤", "배"]).slice(0, 4);
      const values = labels.map(() => R(2, 11));
      const maxV = Math.max(...values);
      if (values.filter((v) => v === maxV).length > 1) values[0] = maxV + 1;
      const fig = { kind: "bars", labels, values, unit: "명", title: "좋아하는 과일별 학생 수" };
      if (Math.random() < 0.5) {
        const top = labels[values.indexOf(Math.max(...values))];
        return { prompt: "가장 많은 학생이 좋아하는 과일은?", big: null, figure: fig, choices: labels, answer: top };
      }
      const i = R(0, 4);
      return num(`${labels[i]}${josa(labels[i], "을", "를")} 좋아하는 학생은 몇 명일까요?`, values[i], { figure: fig, unit: "명" });
    },

    // ---- 5학년 ----
    reduce5() {
      const g = R(2, 7), n0 = R(1, 9), d0 = R(n0 + 1, 13);
      if (gcd(n0, d0) !== 1) return T.reduce5();
      return pick4("다음 분수를 기약분수로 나타내면?", fracRaw(n0, d0), [fracRaw(d0, n0), fracRaw(n0 + 1, d0), fracRaw(n0, d0 + 1), fracRaw(n0 * g, d0), fracRaw(n0, d0 * g)], { big: `${n0 * g}/${d0 * g}`, explain: `분모와 분자를 ${g}로 나누어요` });
    },
    fracMul5() {
      const d = R(3, 10), n = R(1, d), k = R(2, 6);
      return pick4("계산해 보세요 (기약분수)", frac(n * k, d), [fracRaw(n * k, d * k), fracRaw(n, d * k), frac(n + k, d), frac(n * k + 1, d)], { big: `${n}/${d} × ${k} = ?` });
    },
    average5() {
      const c = R(3, 6), avg = R(5, 30), vals = Array.from({ length: c }, () => avg);
      for (let i = 0; i < c - 1; i++) { const d = R(-4, 5); vals[i] += d; vals[c - 1] -= d; }
      if (vals.some((v) => v < 0)) return T.average5();
      return num("다음 수들의 평균은?", avg, { big: vals.join(", "), explain: `(${vals.join(" + ")}) ÷ ${c} = ${avg}` });
    },
    area5() {
      const kind = P(["rect", "tri", "para"]), w = R(3, 15), hh = R(2, 12);
      const W = kind === "tri" && (w * hh) % 2 ? w + 1 : w;
      const ans = kind === "tri" ? (W * hh) / 2 : W * hh;
      const name = { rect: "직사각형", tri: "삼각형", para: "평행사변형" }[kind];
      return num(`${name}의 넓이는 몇 cm²일까요?`, ans, { figure: { kind: "area", shape: kind, w: W, h: hh }, unit: "cm²", explain: kind === "tri" ? `${W} × ${hh} ÷ 2 = ${ans}` : `${W} × ${hh} = ${ans}` });
    },
    perimeter5() {
      const w = R(3, 20), hh = R(2, 15);
      return num("직사각형의 둘레는 몇 cm일까요?", 2 * (w + hh), { figure: { kind: "area", shape: "rect", w, h: hh }, unit: "cm", explain: `(${w} + ${hh}) × 2 = ${2 * (w + hh)}` });
    },
    decMul5() {
      const a = R(11, 99) / 10, k = R(2, 10);
      return { ...num("계산해 보세요", dec(a * k), { big: `${a} × ${k} = ?` }), input: "decimal" };
    },
    round5() {
      const n = R(1000, 9999), place = P([["십", 10], ["백", 100]]);
      const r = Math.round(n / place[1]) * place[1];
      return num(`다음 수를 반올림하여 ${place[0]}의 자리까지 나타내면?`, r, { big: String(n) });
    },

    // ---- 6학년 ----
    fracDiv6() {
      const d = R(2, 10), n = R(1, 10), k = R(2, 6);
      return pick4("계산해 보세요 (기약분수)", frac(n, d * k), [frac(n * k, d), fracRaw(n, d + k), frac(n, d), frac(d * k, n)], { big: `${n}/${d} ÷ ${k} = ?` });
    },
    decDiv6() {
      const k = R(2, 10), q = R(11, 99) / 10;
      return { ...num("계산해 보세요", dec(q), { big: `${dec(q * k)} ÷ ${k} = ?` }), input: "decimal" };
    },
    ratio6() {
      const b = P([4, 5, 10, 20, 25, 50]), a = R(1, b);
      return num(`비 ${a} : ${b}의 비율을 백분율로 나타내면 몇 %일까요?`, dec((a / b) * 100), { unit: "%", input: "decimal", explain: `${a} ÷ ${b} × 100 = ${dec((a / b) * 100)}` });
    },
    proportion6() {
      const a = R(2, 10), b = R(2, 10), k = R(2, 6);
      return num("비례식에서 □에 알맞은 수를 쓰세요", b * k, { big: `${a} : ${b} = ${a * k} : □`, explain: `${b} × ${k} = ${b * k}` });
    },
    circleArea6() {
      const r = R(2, 11);
      return Math.random() < 0.5
        ? { ...num("원의 넓이는 몇 cm²일까요? (원주율 3.14)", dec(r * r * 3.14), { figure: { kind: "circle", label: `${r}cm` }, unit: "cm²", explain: `${r} × ${r} × 3.14` }), input: "decimal" }
        : { ...num("원의 둘레(원주)는 몇 cm일까요? (원주율 3.14)", dec(2 * r * 3.14), { figure: { kind: "circle", label: `${r}cm` }, unit: "cm", explain: `${r * 2} × 3.14` }), input: "decimal" };
    },
    volume6() {
      const a = R(2, 10), b = R(2, 10), c = R(2, 10);
      return num("직육면체의 부피는 몇 cm³일까요?", a * b * c, { figure: { kind: "cuboid", a, b, c }, unit: "cm³", explain: `${a} × ${b} × ${c} = ${a * b * c}` });
    },
    distribute6() {
      const a = R(1, 6), b = R(1, 6), k = R(2, 10) * 10, [it, u] = P(ITEMS), n1 = P(NAMES), n2 = P(NAMES.filter((x) => x !== n1));
      return num(`${it} ${(a + b) * k}${u}${josa(u, "을", "를")} ${n1}${josa(n1, "과", "와")} ${n2}${josa(n2, "이가", "가")} ${a} : ${b}로 나누어 가지려고 해요. ${n1}${josa(n1, "이는", "는")} 몇 ${u}${josa(u, "을", "를")} 가지게 될까요?`, a * k, { unit: u, explain: `${(a + b) * k} × ${a}/${a + b} = ${a * k}` });
    },
  };


  // ======== 단원별로 더 필요한 기본 유형 ========
  const ceilDiv = (a, b) => Math.ceil(a / b);
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  /** 숫자 뒤 조사: 받침이 있게 읽히면 a, 없으면 b (예: 3을, 2를) */
  const numBat = (n) => { n = Math.abs(Math.round(n)); return n % 10 === 0 || [1, 3, 6, 7, 8].includes(n % 10); };
  const jn = (n, a, b) => `${n}${numBat(n) ? a : b}`;
  const jro = (n) => { const d = Math.abs(n) % 10; return `${n}${d === 0 ? "으로" : [1, 7, 8].includes(d) ? "로" : [3, 6].includes(d) ? "으로" : "로"}`; };
  const digitsCards = (n, zero) => { const out = new Set(); while (out.size < n) out.add(R(zero ? 0 : 1, 10)); return [...out]; };
  Object.assign(T, {
    // 1학년
    seq1() {
      const n = R(11, 90), k = P([0, 1, 2]);
      if (k === 0) return num(`${n}보다 1 큰 수는?`, n + 1);
      if (k === 1) return num(`${n}보다 10 작은 수는?`, n - 10);
      return num(`${jn(n - 1, "과", "와")} ${n + 1} 사이에 있는 수는?`, n);
    },
    add1: (lv) => ({ ...MathGen[1](), input: "int" }),
    make10() {
      const a = R(1, 10);
      return num("두 수를 더해서 10이 되도록 □에 알맞은 수를 쓰세요", 10 - a, { big: `${a} + □ = 10` });
    },
    objShape1() {
      const S = { "○ 모양": ["동전", "접시", "바퀴", "단추"], "□ 모양": ["공책", "액자", "창문", "스케치북"], "△ 모양": ["삼각김밥", "옷걸이", "트라이앵글", "삼각자"] };
      const shape = P(Object.keys(S)), ans = P(S[shape]);
      const others = Object.entries(S).filter(([k]) => k !== shape).flatMap(([, v]) => v);
      return pick4(`다음 중 ${shape}인 물건은?`, ans, others);
    },
    // 2학년
    place4() {
      const a = R(1, 10), b = R(0, 10), c = R(0, 10), d = R(0, 10);
      if (Math.random() < 0.5) return num(`1000이 ${a}개, 100이 ${b}개, 10이 ${c}개, 1이 ${d}개인 수는?`, a * 1000 + b * 100 + c * 10 + d);
      const st = P([10, 100, 1000]), x = R(1000, 8000);
      return num(`${x}부터 ${st}씩 뛰어 세면 □에 알맞은 수는?`, x + st * 3, { big: `${x}, ${x + st}, ${x + st * 2}, □` });
    },
    addsub2() {
      if (Math.random() < 0.5) { const a = R(15, 80), b = R(11, 99 - a + 1); return num("계산해 보세요", a + b, { big: `${a} + ${b} = ?` }); }
      const a = R(30, 100), b = R(11, a); return num("계산해 보세요", a - b, { big: `${a} - ${b} = ?` });
    },
    blankAdd2() {
      const a = R(12, 60), b = R(11, 39);
      return Math.random() < 0.5 ? num("□에 알맞은 수를 쓰세요", b, { big: `${a} + □ = ${a + b}` }) : num("□에 알맞은 수를 쓰세요", a + b, { big: `□ - ${b} = ${a}` });
    },
    wordAdd2() {
      const n = P(NAMES), a = R(35, 70), b = R(11, 30);
      return Math.random() < 0.5
        ? num(`${n}${josa(n, "이네", "네")} 반 학생이 쓴 색종이는 어제 ${a}장, 오늘 ${b}장이에요. 모두 몇 장일까요?`, a + b, { unit: "장", explain: `${a} + ${b} = ${a + b}` })
        : num(`줄넘기를 ${n}${josa(n, "이는", "는")} ${a}번, 동생은 ${b}번 했어요. ${n}${josa(n, "이는", "는")} 동생보다 몇 번 더 했을까요?`, a - b, { unit: "번", explain: `${a} - ${b} = ${a - b}` });
    },
    times2() { const a = R(2, 10), b = R(1, 10); return num("구구단", a * b, { big: `${a} × ${b} = ?` }); },
    lenAdd2() {
      const a = R(1, 4), b = R(10, 60), c = R(1, 4), d = R(10, 40);
      return num("두 길이의 합은 몇 cm일까요?", (a + c) * 100 + b + d, { big: `${a}m ${b}cm + ${c}m ${d}cm`, unit: "cm", explain: `${a + c}m ${b + d}cm` });
    },
    hourMin2() {
      const h = R(1, 4), m = R(0, 6) * 10;
      return num("□ 안에 알맞은 수를 쓰세요", h * 60 + m, { big: `${h}시간${m ? " " + m + "분" : ""} = □분`, unit: "분", explain: `1시간 = 60분` });
    },
    // 3학년
    addsub3() {
      if (Math.random() < 0.5) { const a = R(100, 900), b = R(100, 1000 - a); return num("계산해 보세요", a + b, { big: `${a} + ${b} = ?` }); }
      const a = R(200, 1000), b = R(100, a); return num("계산해 보세요", a - b, { big: `${a} - ${b} = ?` });
    },
    mul3() {
      if (Math.random() < 0.5) { const a = R(11, 100), b = R(2, 10); return num("계산해 보세요", a * b, { big: `${a} × ${b} = ?` }); }
      const a = R(11, 50), b = R(11, 40); return num("계산해 보세요", a * b, { big: `${a} × ${b} = ?` });
    },
    mulWord3() {
      const [it, u] = P(ITEMS), a = R(12, 40), b = R(3, 10);
      return num(`한 상자에 ${it}${josa(it, "이", "가")} ${a}${u}씩 들어 있어요. ${b}상자에는 모두 몇 ${u} 있을까요?`, a * b, { unit: u, explain: `${a} × ${b} = ${a * b}` });
    },
    div3() {
      if (Math.random() < 0.5) { const b = R(2, 10), c = R(2, 10); return num("계산해 보세요", c, { big: `${b * c} ÷ ${b} = ?` }); }
      const b = R(3, 10), q = R(3, 10), r = R(1, b);
      return num(`${b * q + r} ÷ ${b}의 나머지는?`, r, { big: `${b * q + r} ÷ ${b} = ${q} … □`, explain: `${b} × ${q} = ${b * q}, ${b * q + r} - ${b * q} = ${r}` });
    },
    rect3() {
      const k = P([0, 1, 2]);
      if (k === 0) { const a = R(3, 15); return num(`한 변이 ${a}cm인 정사각형의 네 변의 길이의 합은 몇 cm일까요?`, a * 4, { unit: "cm", figure: { kind: "area", shape: "rect", w: a, h: a } }); }
      if (k === 1) return pick4("네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형은?", "정사각형", ["직사각형", "삼각형", "원", "오각형"]);
      return pick4("직각이 있는 삼각형을 무엇이라고 할까요?", "직각삼각형", ["정삼각형", "이등변삼각형", "직사각형", "둔각삼각형"]);
    },
    fracCmp3() {
      const d = R(4, 12), a = R(1, d), b = R(1, d); if (a === b) return T.fracCmp3();
      return { prompt: "두 분수의 크기를 비교하여 알맞은 것을 고르세요", big: `${a}/${d} ○ ${b}/${d}`, choices: [">", "<", "="], answer: a > b ? ">" : "<", explain: "분모가 같으면 분자가 클수록 커요" };
    },
    mm3() {
      const a = R(1, 20), b = R(1, 10);
      return num("□ 안에 알맞은 수를 쓰세요", a * 10 + b, { big: `${a}cm ${b}mm = □mm`, unit: "mm" });
    },
    sec3() {
      const m = R(1, 5), sx = R(1, 6) * 10;
      return num("□ 안에 알맞은 수를 쓰세요", m * 60 + sx, { big: `${m}분 ${sx}초 = □초`, unit: "초" });
    },
    // 4학년
    mul4() { const a = R(101, 999), b = R(11, 60); return num("계산해 보세요", a * b, { big: `${a} × ${b} = ?` }); },
    div4() {
      const b = R(11, 40), q = R(3, 30), r = R(0, b);
      return r ? num(`${b * q + r} ÷ ${b}의 몫은?`, q, { big: `${b * q + r} ÷ ${b}`, explain: `${b} × ${q} = ${b * q}, 나머지 ${r}` }) : num("계산해 보세요", q, { big: `${b * q} ÷ ${b} = ?` });
    },
    quad4() {
      const a = R(60, 120), b = R(60, 120), c = R(50, 110);
      if (360 - a - b - c < 30 || 360 - a - b - c > 170) return T.quad4();
      return num("사각형의 세 각이 다음과 같을 때, 나머지 한 각은 몇 도일까요?", 360 - a - b - c, { big: `${a}°, ${b}°, ${c}°, □°`, unit: "°", explain: "사각형의 네 각의 합은 360°" });
    },
    triKind4() {
      const k = P([["세 변의 길이가 모두 같은 삼각형", "정삼각형"], ["두 변의 길이가 같은 삼각형", "이등변삼각형"], ["한 각이 둔각인 삼각형", "둔각삼각형"], ["세 각이 모두 예각인 삼각형", "예각삼각형"]]);
      return pick4(`${k[0]}을 무엇이라고 할까요?`, k[1], ["정삼각형", "이등변삼각형", "둔각삼각형", "예각삼각형", "직각삼각형"]);
    },
    decCmp4() {
      const a = R(100, 999) / 100, b = R(100, 999) / 100; if (a === b) return T.decCmp4();
      return { prompt: "두 소수의 크기를 비교하여 알맞은 것을 고르세요", big: `${a} ○ ${b}`, choices: [">", "<", "="], answer: a > b ? ">" : "<" };
    },
    mixedFrac4() {
      const d = R(3, 9), w = R(1, 5), n = R(1, d);
      return pick4("대분수를 가분수로 나타내면?", fracRaw(w * d + n, d), [fracRaw(w * n + d, d), fracRaw(w + n, d), fracRaw(w * d, d + n), fracRaw(w * d + n + 1, d)], { big: `${w} ${n}/${d}`, explain: `${w} × ${d} + ${n} = ${w * d + n}` });
    },
    // 5학년
    mixCalc5() {
      const k = R(0, 3), a = R(2, 30), b = R(2, 10), c = R(2, 10), d = R(2, 6);
      if (k === 0) return num("곱셈을 먼저 계산해요", a + b * c, { big: `${a} + ${b} × ${c} = ?` });
      if (k === 1) return num("괄호 안을 먼저 계산해요", (a + b) * d, { big: `(${a} + ${b}) × ${d} = ?` });
      return num("나눗셈을 먼저 계산해요", a + b, { big: `${a} + ${b * d} ÷ ${d} = ?` });
    },
    gcdLcm5() {
      if (Math.random() < 0.5) { const g = R(2, 10), x = R(1, 6); let y = R(1, 7); if (gcd(x, y) !== 1 || x === y) return T.gcdLcm5(); return num("두 수의 최대공약수는?", g, { big: `${g * x}, ${g * y}` }); }
      const a = R(2, 10), b = R(2, 13); if (a === b) return T.gcdLcm5(); return num("두 수의 최소공배수는?", lcm(a, b), { big: `${a}, ${b}` });
    },
    divisors5() {
      const n = P([12, 16, 18, 20, 24, 28, 30, 36, 40, 42, 48]);
      const c = Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0);
      return num(`${n}의 약수는 모두 몇 개일까요?`, c.length, { unit: "개", explain: c.join(", ") });
    },
    common5() {
      const a = R(2, 7), b = R(2, 7); if (a === b) return T.common5();
      return num("두 분수를 통분할 때 가장 작은 공통분모는?", lcm(a, b), { big: `1/${a}, 1/${b}`, explain: `${jn(a, "과", "와")} ${b}의 최소공배수` });
    },
    roundUp5() {
      const n = R(1001, 9999), how = P(["올림", "버림"]), place = P([["십", 10], ["백", 100]]);
      const r = how === "올림" ? Math.ceil(n / place[1]) * place[1] : Math.floor(n / place[1]) * place[1];
      return num(`${how}하여 ${place[0]}의 자리까지 나타내면?`, r, { big: String(n) });
    },
    range5() {
      const a = R(10, 40), b = a + R(3, 10);
      return num(`${a} 이상 ${b} 미만인 자연수는 모두 몇 개일까요?`, b - a, { unit: "개", explain: `${a}, ${a + 1}, … , ${b - 1}` });
    },
    // 6학년
    percentOf6() {
      const p = P([10, 20, 25, 30, 40, 50, 75]), base = R(1, 20) * 20;
      return num(`${base}의 ${p}%는 얼마일까요?`, (base * p) / 100, { explain: `${base} × ${p}/100` });
    },
    surface6() {
      const a = R(2, 10), b = R(2, 10), c = R(2, 10);
      return num("직육면체의 겉넓이는 몇 cm²일까요?", 2 * (a * b + b * c + a * c), { figure: { kind: "cuboid", a, b, c }, unit: "cm²", explain: `(${a}×${b} + ${b}×${c} + ${a}×${c}) × 2` });
    },
    ratioSimple6() {
      const g = R(2, 9), a = R(1, 8), b = R(1, 9); if (gcd(a, b) !== 1 || a === b) return T.ratioSimple6();
      return pick4("가장 간단한 자연수의 비로 나타내면?", `${a} : ${b}`, [`${b} : ${a}`, `${a + 1} : ${b}`, `${a} : ${b + 1}`, `${a * 2} : ${b}`], { big: `${a * g} : ${b * g}` });
    },

    // ======== 심화: 사고력 ========
    th1sumdiff() {
      const small = R(1, 8), diff = R(1, 6), big = small + diff;
      return num(`두 수의 합은 ${small + big}이고, 차는 ${jn(diff, "이에요", "예요")}. 두 수 중 큰 수는?`, big, { explain: `(${small + big} + ${diff}) ÷ 2 = ${big}` });
    },
    th1cards() {
      const c = digitsCards(3, false), s = c.slice().sort((a, b) => b - a);
      const big = Math.random() < 0.5;
      return num(`수 카드 ${c.join(", ")} 중에서 2장을 골라 만들 수 있는 가장 ${big ? "큰" : "작은"} 두 자리 수는?`, big ? s[0] * 10 + s[1] : s[2] * 10 + s[1]);
    },
    th1pattern() {
      const s = R(1, 10), d0 = R(1, 3);
      const seq = [s]; for (let i = 0; i < 4; i++) seq.push(seq[i] + d0 + i);
      return num("규칙을 찾아 □에 알맞은 수를 쓰세요", seq[4], { big: `${seq.slice(0, 4).join(", ")}, □`, explain: `${d0}, ${d0 + 1}, ${d0 + 2}, ${d0 + 3}씩 커져요` });
    },
    th2cards() {
      const c = digitsCards(4, true); if (!c.some((x) => x === 0)) c[R(0, 4)] = 0; if (new Set(c).size < 4) return T.th2cards();
      const desc = c.slice().sort((a, b) => b - a), asc = c.slice().sort((a, b) => a - b);
      if (Math.random() < 0.5) return num(`수 카드 ${c.join(", ")} 중 3장으로 만들 수 있는 가장 큰 세 자리 수는?`, desc[0] * 100 + desc[1] * 10 + desc[2]);
      const first = asc.find((x) => x > 0), rest = asc.filter((x) => x !== first);
      return num(`수 카드 ${c.join(", ")} 중 3장으로 만들 수 있는 가장 작은 세 자리 수는?`, first * 100 + rest[0] * 10 + rest[1], { explain: "0은 맨 앞에 올 수 없어요" });
    },
    th2mul() {
      const a = R(2, 10), x = R(2, 10), b = P([2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== a));
      return num(`어떤 수에 ${jn(a, "을", "를")} 곱했더니 ${jn(a * x, "이", "가")} 되었어요. 어떤 수에 ${jn(b, "을", "를")} 곱하면 얼마일까요?`, x * b, { explain: `어떤 수 = ${a * x} ÷ ${a} = ${x}` });
    },
    th2double() {
      const s = R(1, 6), r = P([2, 3]);
      const seq = [s, s * r, s * r * r, s * r * r * r];
      return num("규칙을 찾아 □에 알맞은 수를 쓰세요", seq[3], { big: `${seq.slice(0, 3).join(", ")}, □`, explain: `${r}배씩 커져요` });
    },
    th3remain() {
      const a = R(3, 10), q = R(3, 15), r = R(1, a);
      return num(`어떤 수를 ${jro(a)} 나누었더니 몫이 ${q}, 나머지가 ${jn(r, "이었어요", "였어요")}. 어떤 수는?`, a * q + r, { explain: `${a} × ${q} + ${r} = ${a * q + r}` });
    },
    th3unit() {
      const ds = mix([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
      const big = Math.random() < 0.5, ans = big ? Math.min(...ds) : Math.max(...ds);
      return { prompt: `가장 ${big ? "큰" : "작은"} 분수를 고르세요`, big: null, choices: ds.map((d) => `1/${d}`), answer: `1/${ans}`, explain: "분자가 1이면 분모가 작을수록 커요" };
    },
    th3cards() {
      const c = digitsCards(4, false), d = c.slice().sort((a, b) => b - a), u = c.slice().sort((a, b) => a - b);
      const mx = d[0] * 100 + d[1] * 10 + d[2], mn = u[0] * 100 + u[1] * 10 + u[2];
      return num(`수 카드 ${c.join(", ")} 중 3장으로 만든 가장 큰 세 자리 수와 가장 작은 세 자리 수의 차는?`, mx - mn, { explain: `${mx} - ${mn}` });
    },
    th4clock() {
      const h = R(1, 7);
      return num(`${h}시 정각에 시계의 긴바늘과 짧은바늘이 이루는 작은 쪽의 각은 몇 도일까요?`, h * 30, { unit: "°", figure: { kind: "clock", h, m: 0 }, explain: `한 칸이 30°, ${h}칸` });
    },
    th4line() {
      const a = R(30, 80), b = R(30, 80);
      return num("한 직선 위에 세 각이 나란히 있어요. □는 몇 도일까요?", 180 - a - b, { big: `${a}° + ${b}° + □° = 일직선`, unit: "°", explain: "일직선은 180°" });
    },
    th4digits() {
      const k = R(2, 6), d = P([3, 4, 5]);
      return num(`${d}자리 수 중에서 가장 작은 수 ${k}개의 합은?`, (10 ** (d - 1)) * k + (k * (k - 1)) / 2, { explain: `${10 ** (d - 1)}부터 ${10 ** (d - 1) + k - 1}까지 더해요` });
    },
    th5lcm() {
      const a = P([4, 6, 8, 10, 12, 15]), b = P([6, 9, 10, 12, 14, 20]); if (a === b) return T.th5lcm();
      return num(`㉮ 버스는 ${a}분마다, ㉯ 버스는 ${b}분마다 출발해요. 오전 9시에 함께 출발했다면 다음에 처음으로 함께 출발하는 것은 몇 분 뒤일까요?`, lcm(a, b), { unit: "분", explain: `${jn(a, "과", "와")} ${b}의 최소공배수` });
    },
    th5avg() {
      const m = R(70, 90), k = R(1, 3), need = m + 5 * k;
      if (need > 100) return T.th5avg();
      return num(`시험 4번의 평균이 ${m}점이에요. 5번째 시험을 보고 평균이 ${m + k}점이 되려면 몇 점을 받아야 할까요?`, need, { unit: "점", explain: `${m + k} × 5 - ${m} × 4 = ${need}` });
    },
    th5divsum() {
      const n = P([6, 8, 10, 12, 14, 15, 16, 18, 20]);
      const c = Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0);
      return num(`${n}의 약수를 모두 더하면 얼마일까요?`, c.reduce((a, b) => a + b, 0), { explain: c.join(" + ") });
    },
    th6profit() {
      const a = R(2, 20) * 1000, p = P([10, 20, 25, 30, 50]);
      return num(`원가가 ${a}원인 물건에 ${p}%의 이익을 붙여 팔아요. 판매 가격은 얼마일까요?`, a * (100 + p) / 100, { unit: "원", explain: `${a} × ${(100 + p) / 100}` });
    },
    th6cube() {
      const s = R(2, 10);
      return num(`겉넓이가 ${6 * s * s}cm²인 정육면체의 부피는 몇 cm³일까요?`, s ** 3, { unit: "cm³", explain: `한 면 ${s * s}cm² → 한 모서리 ${s}cm` });
    },
    th6total() {
      const a = R(1, 6), b = R(1, 6), k = R(2, 10);
      return num(`구슬을 형과 동생이 ${a} : ${b}로 나누었더니 형이 ${a * k}개를 가졌어요. 구슬은 모두 몇 개였을까요?`, (a + b) * k, { unit: "개", explain: `${a * k} ÷ ${a} × ${a + b}` });
    },

    // ======== 심화: 응용력 ========
    ap1steps() {
      const n = P(NAMES), a = R(3, 10), b = R(1, 6), c = R(1, a + b);
      return num(`${n}${josa(n, "이는", "는")} 사탕 ${a}개를 가지고 있었어요. 친구에게 ${b}개를 받고, 동생에게 ${c}개를 주었어요. 지금 몇 개일까요?`, a + b - c, { unit: "개", explain: `${a} + ${b} - ${c}` });
    },
    ap1line() {
      const n = P(NAMES), a = R(2, 10), b = R(2, 10);
      return num(`${n}${josa(n, "이는", "는")} 줄의 앞에서 ${a}번째, 뒤에서 ${b}번째에 서 있어요. 줄에 선 사람은 모두 몇 명일까요?`, a + b - 1, { unit: "명", explain: `${a} + ${b} - 1 (자기를 두 번 세지 않아요)` });
    },
    ap1clock() {
      const h = R(1, 13), k = R(1, 6), ans = ((h + k - 1) % 12) + 1;
      return num(`지금은 ${h}시예요. ${k}시간 뒤는 몇 시일까요?`, ans, { unit: "시", figure: { kind: "clock", h, m: 0 } });
    },
    ap2wrong() {
      const a = R(11, 40), x = R(a + 5, 90);
      return num(`어떤 수에 ${jn(a, "을", "를")} 더해야 할 것을 잘못하여 뺐더니 ${jn(x - a, "이", "가")} 되었어요. 바르게 계산하면 얼마일까요?`, x + a, { explain: `어떤 수 = ${x - a} + ${a} = ${x}, ${x} + ${a} = ${x + a}` });
    },
    ap2wheels() {
      const a = R(2, 9), b = R(2, 9);
      return num(`세발자전거 ${a}대와 두발자전거 ${b}대가 있어요. 바퀴는 모두 몇 개일까요?`, 3 * a + 2 * b, { unit: "개", explain: `3 × ${a} + 2 × ${b}` });
    },
    ap2ribbon() {
      const a = R(5, 21), b = R(2, 5);
      return num(`길이가 1m인 리본에서 ${a}cm씩 ${b}번 잘라 썼어요. 남은 리본은 몇 cm일까요?`, 100 - a * b, { unit: "cm", explain: `100 - ${a} × ${b}` });
    },
    ap3trees() {
      const g = P([2, 3, 4, 5, 10]), k = R(4, 15);
      return num(`길이가 ${g * k}m인 길 한쪽에 처음부터 끝까지 ${g}m 간격으로 나무를 심으려고 해요. 나무는 모두 몇 그루 필요할까요?`, k + 1, { unit: "그루", explain: `${g * k} ÷ ${g} + 1 (처음 나무까지)` });
    },
    ap3water() {
      const a = R(1, 4), b = R(1, 9) * 100, c = R(1, 9) * 100 + 50;
      return num(`물이 ${a}L ${b}mL 있었는데 ${c}mL를 마셨어요. 남은 물은 몇 mL일까요?`, a * 1000 + b - c, { unit: "mL", explain: `${a * 1000 + b} - ${c}` });
    },
    ap3cars() {
      const k = R(3, 9), n = k * R(3, 9) + R(1, k);
      return num(`학생 ${n}명이 한 대에 ${k}명씩 탈 수 있는 차를 타려고 해요. 차는 적어도 몇 대 필요할까요?`, ceilDiv(n, k), { unit: "대", explain: `${n} ÷ ${k} = ${Math.floor(n / k)} … ${n % k} → 남은 학생도 타야 해요` });
    },
    ap4pizza() {
      const d = P([6, 8, 10, 12]), a = R(1, d / 2), b = R(1, d - a);
      return pick4(`피자 한 판을 ${d}조각으로 나누어 형이 ${a}조각, 동생이 ${b}조각 먹었어요. 남은 피자는 전체의 얼마일까요?`, fracRaw(d - a - b, d), [fracRaw(a + b, d), fracRaw(d - a, d), fracRaw(d - b, d), fracRaw(d - a - b, d + 1)], { explain: `${d} - ${a} - ${b} = ${d - a - b}조각` });
    },
    ap4pencil() {
      const a = R(12, 25), b = R(11, 30), c = R(10, 100);
      return num(`연필이 한 상자에 ${a}자루씩 ${b}상자 있어요. 그중 ${c}자루를 나누어 주었다면 남은 연필은 몇 자루일까요?`, a * b - c, { unit: "자루", explain: `${a} × ${b} - ${c}` });
    },
    ap4graph() {
      const labels = mix(["축구", "야구", "농구", "피구", "배구"]).slice(0, 4), values = labels.map(() => R(2, 13));
      const mx = Math.max(...values), mn = Math.min(...values); if (mx === mn) return T.ap4graph();
      return num("가장 많은 학생이 좋아하는 운동과 가장 적은 학생이 좋아하는 운동의 학생 수 차이는 몇 명일까요?", mx - mn, { unit: "명", figure: { kind: "bars", labels, values, unit: "명", title: "좋아하는 운동별 학생 수" } });
    },
    ap5gcd() {
      const g = R(2, 13), x = R(2, 8); let y = R(2, 9); if (gcd(x, y) !== 1 || x === y) return T.ap5gcd();
      return num(`사과 ${g * x}개와 배 ${g * y}개를 남김없이 최대한 많은 사람에게 똑같이 나누어 주려고 해요. 몇 명에게 나누어 줄 수 있을까요?`, g, { unit: "명", explain: `${jn(g * x, "과", "와")} ${g * y}의 최대공약수` });
    },
    ap5square() {
      const a = R(3, 20), b = R(3, 20); if ((a + b) % 2) return T.ap5square();
      return num(`가로 ${a}cm, 세로 ${b}cm인 직사각형과 둘레가 같은 정사각형의 한 변은 몇 cm일까요?`, (a + b) / 2, { unit: "cm", explain: `둘레 ${2 * (a + b)}cm ÷ 4` });
    },
    ap5car() {
      const a = R(81, 160) / 10, k = R(2, 10);
      return { ...num(`휘발유 1L로 ${a}km를 가는 자동차가 있어요. 휘발유 ${k}L로는 몇 km를 갈 수 있을까요?`, dec(a * k), { unit: "km", explain: `${a} × ${k}` }), input: "decimal" };
    },
    ap6sale() {
      const a = R(2, 30) * 1000, p = P([10, 20, 25, 30, 40, 50]);
      return num(`정가가 ${a}원인 옷을 ${p}% 할인해서 팔아요. 할인된 가격은 얼마일까요?`, a * (100 - p) / 100, { unit: "원", explain: `${a} × ${(100 - p) / 100}` });
    },
    ap6map() {
      const k = P([2, 3, 5]), n = R(2, 12);
      return num(`지도에서 1cm가 실제로 ${k}km예요. 지도에서 ${n}cm인 거리는 실제로 몇 km일까요?`, k * n, { unit: "km", explain: `1 : ${k} = ${n} : □` });
    },
    ap6wheel() {
      const r = R(10, 31), n = R(2, 11);
      return { ...num(`반지름이 ${r}cm인 바퀴가 ${n}바퀴 굴러간 거리는 몇 cm일까요? (원주율 3.14)`, dec(2 * r * 3.14 * n), { unit: "cm", explain: `${r * 2} × 3.14 × ${n}` }), input: "decimal" };
    },
    ap6juice() {
      const k = R(2, 9), q = R(11, 99) / 10;
      return { ...num(`주스 ${dec(q * k)}L를 ${k}명이 똑같이 나누어 마시면 한 명이 몇 L씩 마실까요?`, dec(q), { unit: "L", explain: `${dec(q * k)} ÷ ${k}` }), input: "decimal" };
    },
  });

  const LABEL = {
    calc: "계산", blank1: "빈칸 채우기", compare1: "크기 비교", clock1: "시계 보기", shapes1: "모양 찾기", tens1: "수 모형", word1: "문장제", pattern1: "규칙 찾기",
    place2: "자릿값", word2: "곱셈 문장제", clock2: "시각 읽기", length2: "길이 단위", polygon2: "도형", blank2: "빈칸 채우기",
    fraction3: "분수", unit3: "들이·무게", time3: "시간 계산", divword3: "나눗셈 문장제", circle3: "원", decimal3: "소수",
    bignum4: "큰 수", angle4: "삼각형의 각", angleType4: "각의 종류", fracAdd4: "분수의 덧셈·뺄셈", decAdd4: "소수의 덧셈·뺄셈", graph4: "막대그래프",
    reduce5: "약분", fracMul5: "분수의 곱셈", average5: "평균", area5: "넓이", perimeter5: "둘레", decMul5: "소수의 곱셈", round5: "어림하기",
    fracDiv6: "분수의 나눗셈", decDiv6: "소수의 나눗셈", ratio6: "비율", proportion6: "비례식", circleArea6: "원의 넓이·둘레", volume6: "부피", distribute6: "비례배분",
  };
  // 예전 방식(학년 전체 섞기)에서 쓰던 목록
  const BY_LEVEL = {
    1: ["calc", "calc", "blank1", "compare1", "clock1", "shapes1", "tens1", "word1", "pattern1"],
    2: ["calc", "calc", "place2", "word2", "clock2", "length2", "polygon2", "blank2", "pattern1"],
    3: ["calc", "calc", "fraction3", "unit3", "time3", "divword3", "circle3", "decimal3"],
    4: ["calc", "calc", "bignum4", "angle4", "angleType4", "fracAdd4", "decAdd4", "graph4"],
    5: ["calc", "calc", "reduce5", "fracMul5", "average5", "area5", "perimeter5", "decMul5", "round5"],
    6: ["calc", "calc", "fracDiv6", "decDiv6", "ratio6", "proportion6", "circleArea6", "volume6", "distribute6"],
  };
  // 학년별 단원 (교과서 단원을 묶어 정리). types 안에서 고르게 섞어 낸다.
  const U = (id, name, types) => ({ id, name, types });
  const MATH_UNITS = {
    1: [U("n1", "100까지의 수", ["tens1", "compare1", "seq1"]), U("a1", "덧셈과 뺄셈", ["add1", "blank1", "make10", "word1"]),
      U("s1", "여러 가지 모양", ["shapes1", "objShape1"]), U("c1", "시계 보기와 규칙 찾기", ["clock1", "pattern1"])],
    2: [U("n2", "세 자리 수·네 자리 수", ["place2", "place4"]), U("a2", "덧셈과 뺄셈", ["addsub2", "blankAdd2", "wordAdd2"]),
      U("m2", "곱셈구구", ["times2", "blank2", "word2"]), U("g2", "도형과 길이 재기", ["polygon2", "length2", "lenAdd2"]),
      U("t2", "시각과 시간", ["clock2", "hourMin2"])],
    3: [U("a3", "덧셈과 뺄셈", ["addsub3"]), U("m3", "곱셈", ["mul3", "mulWord3"]), U("d3", "나눗셈", ["div3", "divword3"]),
      U("g3", "평면도형과 원", ["rect3", "circle3"]), U("f3", "분수와 소수", ["fraction3", "fracCmp3", "decimal3"]),
      U("l3", "길이와 시간", ["mm3", "sec3", "time3"]), U("w3", "들이와 무게", ["unit3"])],
    4: [U("b4", "큰 수", ["bignum4"]), U("an4", "각도", ["angle4", "angleType4", "quad4"]), U("md4", "곱셈과 나눗셈", ["mul4", "div4"]),
      U("tr4", "삼각형과 사각형", ["triKind4", "quad4"]), U("f4", "분수의 덧셈과 뺄셈", ["fracAdd4", "mixedFrac4"]),
      U("d4", "소수의 덧셈과 뺄셈", ["decAdd4", "decCmp4"]), U("gr4", "막대그래프", ["graph4"])],
    5: [U("mx5", "자연수의 혼합 계산", ["mixCalc5"]), U("dv5", "약수와 배수", ["gcdLcm5", "divisors5"]), U("r5", "약분과 통분", ["reduce5", "common5"]),
      U("fm5", "분수의 곱셈", ["fracMul5"]), U("dm5", "소수의 곱셈", ["decMul5"]), U("ar5", "다각형의 둘레와 넓이", ["area5", "perimeter5"]),
      U("av5", "평균", ["average5"]), U("rd5", "수의 범위와 어림하기", ["round5", "roundUp5", "range5"])],
    6: [U("fd6", "분수의 나눗셈", ["fracDiv6"]), U("dd6", "소수의 나눗셈", ["decDiv6"]), U("ra6", "비와 비율", ["ratio6", "percentOf6", "ratioSimple6"]),
      U("pr6", "비례식과 비례배분", ["proportion6", "distribute6"]), U("c6", "원의 넓이", ["circleArea6"]), U("v6", "직육면체의 부피와 겉넓이", ["volume6", "surface6"])],
  };
  // 학년별 심화: 사고력(규칙·추론·거꾸로 생각하기), 응용력(여러 단계 문장제)
  const MATH_CHALLENGE = {
    1: { think: ["th1sumdiff", "th1cards", "th1pattern"], apply: ["ap1steps", "ap1line", "ap1clock"] },
    2: { think: ["th2cards", "th2mul", "th2double"], apply: ["ap2wrong", "ap2wheels", "ap2ribbon"] },
    3: { think: ["th3remain", "th3unit", "th3cards"], apply: ["ap3trees", "ap3water", "ap3cars"] },
    4: { think: ["th4clock", "th4line", "th4digits"], apply: ["ap4pizza", "ap4pencil", "ap4graph"] },
    5: { think: ["th5lcm", "th5avg", "th5divsum"], apply: ["ap5gcd", "ap5square", "ap5car"] },
    6: { think: ["th6profit", "th6cube", "th6total"], apply: ["ap6sale", "ap6map", "ap6wheel", "ap6juice"] },
  };
  Object.assign(LABEL, {
    seq1: "수의 순서", add1: "계산", make10: "10 만들기", objShape1: "모양 찾기", place4: "네 자리 수", addsub2: "계산", blankAdd2: "빈칸 채우기",
    wordAdd2: "문장제", times2: "구구단", lenAdd2: "길이의 합", hourMin2: "시간 단위", addsub3: "계산", mul3: "계산", mulWord3: "곱셈 문장제",
    div3: "나눗셈", rect3: "사각형·삼각형", fracCmp3: "분수 크기 비교", mm3: "길이 단위", sec3: "시간 단위", mul4: "계산", div4: "계산",
    quad4: "사각형의 각", triKind4: "삼각형 분류", decCmp4: "소수 크기 비교", mixedFrac4: "대분수", mixCalc5: "혼합 계산", gcdLcm5: "공약수·공배수",
    divisors5: "약수", common5: "통분", roundUp5: "올림·버림", range5: "이상·미만", percentOf6: "백분율", surface6: "겉넓이", ratioSimple6: "간단한 비",
    th1sumdiff: "합과 차", th1cards: "수 카드", th1pattern: "규칙 추론", th2cards: "수 카드", th2mul: "거꾸로 생각하기", th2double: "규칙 추론",
    th3remain: "거꾸로 생각하기", th3unit: "단위분수", th3cards: "수 카드", th4clock: "시계와 각", th4line: "직선과 각", th4digits: "큰 수 추론",
    th5lcm: "최소공배수 활용", th5avg: "평균 추론", th5divsum: "약수 추론", th6profit: "백분율 추론", th6cube: "정육면체 추론", th6total: "비례배분 거꾸로",
    ap1steps: "두 단계 문장제", ap1line: "순서와 줄 서기", ap1clock: "시각 문장제", ap2wrong: "잘못 계산한 식", ap2wheels: "곱셈 활용", ap2ribbon: "길이 문장제",
    ap3trees: "나무 심기", ap3water: "들이 문장제", ap3cars: "나눗셈 활용", ap4pizza: "분수 문장제", ap4pencil: "곱셈 활용", ap4graph: "그래프 해석",
    ap5gcd: "최대공약수 활용", ap5square: "둘레 활용", ap5car: "소수 곱셈 활용", ap6sale: "할인 가격", ap6map: "축척", ap6wheel: "원주 활용", ap6juice: "소수 나눗셈 활용",
  });
  const CH_LABEL = { think: "사고력", apply: "응용력" };

  /** 한 문제. type을 주면 그 유형으로 */
  function mathQuestion(lv, type) {
    const L = Math.min(Math.max(lv, 1), 6);
    type = type || P(BY_LEVEL[L]);
    const q = type === "calc" ? T.calc(L) : T[type](L);
    q.tag = q.tag || LABEL[type] || "";
    return q;
  }
  /**
   * 단원·심화 선택에 맞춘 한 문제.
   * unit: 단원 id, "think"(사고력), "apply"(응용력), 또는 "mix"(학년 전체 섞기)
   */
  function mathUnitQuestion(lv, unit) {
    const L = Math.min(Math.max(lv, 1), 6);
    if (unit === "think" || unit === "apply") {
      const type = P(MATH_CHALLENGE[L][unit]);
      const q = T[type](L);
      q.tag = `${CH_LABEL[unit]} · ${LABEL[type] || "심화"}`;
      q.hard = true;
      return q;
    }
    // "mix"(또는 모르는 id)는 그 학년의 모든 단원에서 고르게
    const u = MATH_UNITS[L].find((x) => x.id === unit) || P(MATH_UNITS[L]);
    const type = P(u.types);
    const q = type === "calc" ? T.calc(L) : T[type](L);
    q.tag = LABEL[type] || u.name;
    return q;
  }
  const mathUnitName = (lv, unit) => (unit === "think" ? "사고력" : unit === "apply" ? "응용력" : (MATH_UNITS[lv] || []).find((u) => u.id === unit)?.name || "전체");
  const api = { mathQuestion, mathUnitQuestion, mathUnitName, MATH_TYPES: BY_LEVEL, MATH_UNITS, MATH_CHALLENGE };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, api);
})();
