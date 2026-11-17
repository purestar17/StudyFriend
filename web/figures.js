// 수학 문제 그림 (SVG). 색은 CSS 변수로 지정해 밝은/어두운 화면 모두에서 보이게 한다.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs = {}, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svg(w, h, label) {
    const s = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "figure", role: "img", "aria-label": label });
    return s;
  }
  const INK = "var(--ink)", FILL = "var(--fig-fill)", LINE = "var(--fig-line)", MUTED = "var(--muted)";
  const T = (x, y, t, extra = {}) => el("text", { x, y, "text-anchor": "middle", "dominant-baseline": "middle", fill: INK, "font-size": 15, ...extra }, t);
  const rad = (d) => (d * Math.PI) / 180;

  const draw = {
    clock({ h, m }) {
      const s = svg(220, 220, `시계 ${h}시 ${m}분`), c = 110, r = 96;
      s.append(el("circle", { cx: c, cy: c, r, fill: "var(--panel)", stroke: INK, "stroke-width": 4 }));
      for (let i = 0; i < 60; i++) {
        const a = rad(i * 6), long = i % 5 === 0;
        s.append(el("line", { x1: c + Math.sin(a) * (r - (long ? 12 : 6)), y1: c - Math.cos(a) * (r - (long ? 12 : 6)), x2: c + Math.sin(a) * (r - 2), y2: c - Math.cos(a) * (r - 2), stroke: long ? INK : LINE, "stroke-width": long ? 3 : 1.5 }));
      }
      for (let i = 1; i <= 12; i++) { const a = rad(i * 30); s.append(T(c + Math.sin(a) * (r - 28), c - Math.cos(a) * (r - 28) + 1, String(i), { "font-size": 18, "font-weight": 700 })); }
      const ha = rad(((h % 12) + m / 60) * 30), ma = rad(m * 6);
      s.append(el("line", { x1: c, y1: c, x2: c + Math.sin(ha) * 50, y2: c - Math.cos(ha) * 50, stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }));
      s.append(el("line", { x1: c, y1: c, x2: c + Math.sin(ma) * 76, y2: c - Math.cos(ma) * 76, stroke: "var(--c, var(--accent))", "stroke-width": 4, "stroke-linecap": "round" }));
      s.append(el("circle", { cx: c, cy: c, r: 6, fill: INK }));
      return s;
    },
    shape({ shape }) {
      const s = svg(200, 160, "도형");
      const a = { fill: FILL, stroke: INK, "stroke-width": 3 };
      if (shape === "rect") s.append(el("rect", { x: 40, y: 30, width: 120, height: 100, rx: 4, ...a }));
      else if (shape === "tri") s.append(el("polygon", { points: "100,20 175,140 25,140", ...a }));
      else s.append(el("circle", { cx: 100, cy: 80, r: 60, ...a }));
      return s;
    },
    blocks({ tens, ones }) {
      const u = 14, w = Math.max(10 + tens * (u + 8) + 16 + Math.ceil(ones / 5) * (u + 4), 120), s = svg(w, 10 * u + 20, `십 모형 ${tens}개, 일 모형 ${ones}개`);
      for (let t = 0; t < tens; t++) for (let i = 0; i < 10; i++) s.append(el("rect", { x: 10 + t * (u + 8), y: 10 + i * u, width: u, height: u, fill: FILL, stroke: INK, "stroke-width": 1.5 }));
      const ox = 10 + tens * (u + 8) + 16;
      for (let i = 0; i < ones; i++) s.append(el("rect", { x: ox + Math.floor(i / 5) * (u + 4), y: 10 + (i % 5) * (u + 4), width: u, height: u, fill: FILL, stroke: INK, "stroke-width": 1.5 }));
      return s;
    },
    polygon({ n }) {
      const s = svg(200, 180, "도형"), c = [100, 95], r = 75;
      const pts = Array.from({ length: n }, (_, i) => { const a = rad(-90 + (360 / n) * i + (n === 4 ? 45 : 0)); return `${c[0] + Math.cos(a) * r},${c[1] + Math.sin(a) * r}`; });
      s.append(el("polygon", { points: pts.join(" "), fill: FILL, stroke: INK, "stroke-width": 3 }));
      pts.forEach((p) => { const [x, y] = p.split(","); s.append(el("circle", { cx: x, cy: y, r: 4, fill: INK })); });
      return s;
    },
    fraction({ n, d, style }) {
      if (style === "bar") {
        const s = svg(260, 70, `${d}칸 중 ${n}칸 색칠`), w = 240 / d;
        for (let i = 0; i < d; i++) s.append(el("rect", { x: 10 + i * w, y: 10, width: w, height: 50, fill: i < n ? "var(--c, var(--accent))" : "var(--panel)", stroke: INK, "stroke-width": 2 }));
        return s;
      }
      const s = svg(200, 200, `${d}조각 중 ${n}조각 색칠`), c = 100, r = 85;
      for (let i = 0; i < d; i++) {
        const a1 = rad(-90 + (360 / d) * i), a2 = rad(-90 + (360 / d) * (i + 1));
        const path = `M${c},${c} L${c + Math.cos(a1) * r},${c + Math.sin(a1) * r} A${r},${r} 0 ${360 / d > 180 ? 1 : 0} 1 ${c + Math.cos(a2) * r},${c + Math.sin(a2) * r} Z`;
        s.append(el("path", { d: path, fill: i < n ? "var(--c, var(--accent))" : "var(--panel)", stroke: INK, "stroke-width": 2 }));
      }
      return s;
    },
    circle({ label }) {
      const s = svg(200, 200, `반지름 ${label}인 원`), c = 100, r = 80;
      s.append(el("circle", { cx: c, cy: c, r, fill: FILL, stroke: INK, "stroke-width": 3 }));
      s.append(el("circle", { cx: c, cy: c, r: 4, fill: INK }));
      s.append(el("line", { x1: c, y1: c, x2: c + r, y2: c, stroke: INK, "stroke-width": 2.5 }));
      s.append(T(c + r / 2, c - 14, label, { "font-weight": 700 }));
      return s;
    },
    triangle({ a, b }) {
      // 밑변 왼쪽 각 a, 오른쪽 각 b
      const L = 1, C = 180 - a - b, ta = Math.sin(rad(b)) * L / Math.sin(rad(C));
      const apex = [Math.cos(rad(a)) * ta, Math.sin(rad(a)) * ta];
      const xs = [0, L, apex[0]], ys = [0, 0, apex[1]];
      const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
      const k = Math.min(220 / (maxX - minX), 140 / maxY);
      const P = (x, y) => [20 + (x - minX) * k, 170 - y * k];
      const [p1, p2, p3] = [P(0, 0), P(L, 0), P(apex[0], apex[1])];
      const s = svg(260, 190, `두 각이 ${a}도, ${b}도인 삼각형`);
      s.append(el("polygon", { points: [p1, p2, p3].map((p) => p.join(",")).join(" "), fill: FILL, stroke: INK, "stroke-width": 3 }));
      s.append(T(p1[0] + 30, p1[1] - 12, `${a}°`, { "font-weight": 700 }));
      s.append(T(p2[0] - 30, p2[1] - 12, `${b}°`, { "font-weight": 700 }));
      s.append(T(p3[0], p3[1] + 26, "?", { "font-weight": 700, fill: "var(--c, var(--accent))", "font-size": 18 }));
      return s;
    },
    angle({ deg }) {
      const s = svg(240, 170, `${deg}도 각`), o = [deg > 90 ? 150 : 50, 140], r = 110;
      const a = rad(deg);
      s.append(el("line", { x1: o[0], y1: o[1], x2: o[0] + (deg > 90 ? 80 : r), y2: o[1], stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }));
      s.append(el("line", { x1: o[0], y1: o[1], x2: o[0] + Math.cos(a) * r, y2: o[1] - Math.sin(a) * r, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }));
      if (deg === 90) s.append(el("path", { d: `M${o[0] + 22},${o[1]} L${o[0] + 22},${o[1] - 22} L${o[0]},${o[1] - 22}`, fill: "none", stroke: "var(--c, var(--accent))", "stroke-width": 2.5 }));
      else s.append(el("path", { d: `M${o[0] + 30},${o[1]} A30,30 0 0 0 ${o[0] + Math.cos(a) * 30},${o[1] - Math.sin(a) * 30}`, fill: "none", stroke: "var(--c, var(--accent))", "stroke-width": 2.5 }));
      return s;
    },
    bars({ labels, values, unit, title }) {
      const W = 320, H = 230, left = 40, bottom = 190, top = 30, max = Math.ceil(Math.max(...values) / 2) * 2 + 2;
      const s = svg(W, H, title), bw = (W - left - 20) / labels.length;
      s.append(T(W / 2, 14, title, { "font-size": 14, fill: MUTED }));
      for (let v = 0; v <= max; v += 2) {
        const y = bottom - ((bottom - top) * v) / max;
        s.append(el("line", { x1: left, y1: y, x2: W - 10, y2: y, stroke: LINE, "stroke-width": 1 }));
        s.append(T(left - 14, y, String(v), { "font-size": 12, fill: MUTED }));
      }
      s.append(T(left - 14, top - 14, `(${unit})`, { "font-size": 11, fill: MUTED }));
      labels.forEach((lb, i) => {
        const h = ((bottom - top) * values[i]) / max, x = left + i * bw + bw * 0.2;
        s.append(el("rect", { x, y: bottom - h, width: bw * 0.6, height: h, fill: "var(--c, var(--accent))", rx: 3 }));
        s.append(T(x + bw * 0.3, bottom + 16, lb, { "font-size": 14 }));
      });
      s.append(el("line", { x1: left, y1: bottom, x2: W - 10, y2: bottom, stroke: INK, "stroke-width": 2 }));
      return s;
    },
    area({ shape, w, h }) {
      const k = Math.min(200 / w, 120 / h), W = w * k, H = h * k, x0 = 40, y0 = 30, s = svg(W + 90, H + 70, "도형의 넓이");
      const a = { fill: FILL, stroke: INK, "stroke-width": 3 };
      if (shape === "rect") s.append(el("rect", { x: x0, y: y0, width: W, height: H, ...a }));
      else {
        const off = shape === "tri" ? W * 0.35 : W * 0.25;
        const pts = shape === "tri" ? [[x0, y0 + H], [x0 + W, y0 + H], [x0 + off, y0]] : [[x0, y0 + H], [x0 + W, y0 + H], [x0 + W + off, y0], [x0 + off, y0]];
        s.append(el("polygon", { points: pts.map((p) => p.join(",")).join(" "), ...a }));
        s.append(el("line", { x1: x0 + off, y1: y0, x2: x0 + off, y2: y0 + H, stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 5" }));
      }
      s.append(T(x0 + W / 2, y0 + H + 20, `${w}cm`, { "font-weight": 700 }));
      const hx = shape === "rect" ? x0 + W + 28 : x0 + (shape === "tri" ? W * 0.35 : W * 0.25) + 26;
      s.append(T(hx, y0 + H / 2, `${h}cm`, { "font-weight": 700 }));
      return s;
    },
    cuboid({ a, b, c }) {
      const k = Math.min(150 / (a + b * 0.5), 110 / (c + b * 0.4)), A = a * k, B = b * k * 0.5, C = c * k, x0 = 50, y0 = 30 + B * 0.8;
      const s = svg(A + B + 110, C + B + 70, "직육면체");
      const st = { fill: FILL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" };
      s.append(el("polygon", { points: `${x0},${y0} ${x0 + B},${y0 - B * 0.8} ${x0 + A + B},${y0 - B * 0.8} ${x0 + A},${y0}`, ...st }));
      s.append(el("polygon", { points: `${x0 + A},${y0} ${x0 + A + B},${y0 - B * 0.8} ${x0 + A + B},${y0 - B * 0.8 + C} ${x0 + A},${y0 + C}`, ...st }));
      s.append(el("rect", { x: x0, y: y0, width: A, height: C, ...st }));
      s.append(T(x0 + A / 2, y0 + C + 18, `${a}cm`, { "font-weight": 700 }));
      s.append(T(x0 + A + B / 2 + 22, y0 + C - B * 0.4 + 8, `${b}cm`, { "font-weight": 700 }));
      s.append(T(x0 - 18, y0 + C / 2, `${c}cm`, { "font-weight": 700 }));
      return s;
    },
  };

  window.renderFigure = (fig) => {
    const box = document.createElement("div");
    box.className = "fig-box";
    try { box.append(draw[fig.kind](fig)); } catch (e) { box.textContent = "그림을 그리지 못했어요"; }
    return box;
  };
})();
