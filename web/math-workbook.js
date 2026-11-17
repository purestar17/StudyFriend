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

  const LABEL = {
    calc: "계산", blank1: "빈칸 채우기", compare1: "크기 비교", clock1: "시계 보기", shapes1: "모양 찾기", tens1: "수 모형", word1: "문장제", pattern1: "규칙 찾기",
    place2: "자릿값", word2: "곱셈 문장제", clock2: "시각 읽기", length2: "길이 단위", polygon2: "도형", blank2: "빈칸 채우기",
    fraction3: "분수", unit3: "들이·무게", time3: "시간 계산", divword3: "나눗셈 문장제", circle3: "원", decimal3: "소수",
    bignum4: "큰 수", angle4: "삼각형의 각", angleType4: "각의 종류", fracAdd4: "분수의 덧셈·뺄셈", decAdd4: "소수의 덧셈·뺄셈", graph4: "막대그래프",
    reduce5: "약분", fracMul5: "분수의 곱셈", average5: "평균", area5: "넓이", perimeter5: "둘레", decMul5: "소수의 곱셈", round5: "어림하기",
    fracDiv6: "분수의 나눗셈", decDiv6: "소수의 나눗셈", ratio6: "비율", proportion6: "비례식", circleArea6: "원의 넓이·둘레", volume6: "부피", distribute6: "비례배분",
  };
  // 학년별 유형 (계산은 비중을 조금 더 둔다)
  const BY_LEVEL = {
    1: ["calc", "calc", "blank1", "compare1", "clock1", "shapes1", "tens1", "word1", "pattern1"],
    2: ["calc", "calc", "place2", "word2", "clock2", "length2", "polygon2", "blank2", "pattern1"],
    3: ["calc", "calc", "fraction3", "unit3", "time3", "divword3", "circle3", "decimal3"],
    4: ["calc", "calc", "bignum4", "angle4", "angleType4", "fracAdd4", "decAdd4", "graph4"],
    5: ["calc", "calc", "reduce5", "fracMul5", "average5", "area5", "perimeter5", "decMul5", "round5"],
    6: ["calc", "calc", "fracDiv6", "decDiv6", "ratio6", "proportion6", "circleArea6", "volume6", "distribute6"],
  };

  function mathQuestion(lv, type) {
    const L = Math.min(Math.max(lv, 1), 6);
    type = type || P(BY_LEVEL[L]);
    const q = type === "calc" ? T.calc(L) : T[type](L);
    q.tag = LABEL[type];
    return q;
  }
  const api = { mathQuestion, MATH_TYPES: BY_LEVEL };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, api);
})();
