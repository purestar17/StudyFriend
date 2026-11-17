// 펜(손가락)으로 쓴 숫자 답을 읽는다. 서버 없이 기기 안에서 동작.
// 1) 획들을 가로 위치로 묶어 글자 단위로 나누고  2) 각 글자를 $P 점구름 인식기로 0~9 견본과 비교한다.
// 작은 점은 소수점(.)으로 본다. 잘못 읽으면 다시 쓰거나 키패드로 바꿀 수 있다.
(() => {
  const N = 32;

  // ---- 견본 숫자 (0~100 칸, y는 아래로) ----
  const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  const L = (...pts) => pts;
  const TEMPLATES = {
    0: [[arc(50, 50, 32, 48, -90, 270, 24)], [arc(50, 50, 26, 48, -100, 260, 24)]],
    1: [[L([50, 0], [50, 100])], [L([34, 18], [52, 0], [52, 100])]],
    2: [[[...arc(50, 30, 30, 26, -165, 30), [16, 96], [86, 96]]],
      [[...arc(48, 28, 32, 26, -170, 20), [15, 92], [88, 96]]],
      [[...arc(50, 30, 30, 26, -165, 40), [20, 95], ...arc(30, 92, 10, 6, 180, 360, 4), [88, 94]]]],
    3: [[[...arc(48, 27, 30, 23, -160, 90), ...arc(48, 73, 33, 25, -90, 155)]],
      [[[18, 4], [80, 4], [45, 42], ...arc(48, 70, 33, 27, -90, 155)]]],
    4: [[L([62, 0], [10, 66], [90, 66]), L([66, 18], [66, 100])],
      [L([20, 0], [16, 60], [86, 60]), L([70, 0], [70, 100])],
      [L([62, 0], [10, 66], [90, 66], [66, 66], [66, 100])]],
    5: [[L([80, 4], [28, 4]), [[28, 4], [24, 44], ...arc(48, 68, 31, 27, -125, 155)]],
      [[[80, 4], [28, 4], [24, 44], ...arc(48, 68, 31, 27, -125, 155)]],
      [[[28, 4], [24, 44], ...arc(48, 68, 31, 27, -125, 155)], L([28, 4], [82, 4])]],
    6: [[[[72, 4], [48, 20], [30, 44], ...arc(50, 72, 28, 24, 180, 540, 20)]],
      [[[66, 0], [36, 30], [24, 62], ...arc(50, 74, 26, 24, 160, 520, 20)]]],
    7: [[L([12, 6], [86, 6], [38, 100])], [L([12, 6], [86, 6], [38, 100]), L([34, 54], [76, 54])],
      [L([12, 20], [14, 6], [86, 6], [46, 100])]],
    8: [[[...arc(50, 27, 24, 22, 90, 450, 18), ...arc(50, 73, 30, 25, -90, 270, 18)]]],
    9: [[[...arc(46, 28, 28, 25, 0, -360, 20), [74, 28], [70, 100]]],
      [[...arc(46, 28, 28, 25, 0, -360, 20), [74, 30], [72, 70], [56, 98], [34, 96]]],
      [[...arc(46, 28, 28, 25, -10, -370, 20)], L([74, 10], [70, 100])]],
  };

  const bbox = (strokes) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) for (const [x, y] of s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };

  // ---- $P 점구름 인식기 (Vatavu, Anthony, Wobbrock 2012) ----
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function resample(pts, n) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) total += dist(pts[i - 1], pts[i]);
    const I = total / (n - 1) || 1, out = [pts[0]];
    let D = 0;
    const p = pts.slice();
    for (let i = 1; i < p.length; i++) {
      if (p[i].id !== p[i - 1].id) continue;
      const d = dist(p[i - 1], p[i]);
      if (D + d >= I) {
        const t = (I - D) / d;
        const q = { x: p[i - 1].x + t * (p[i].x - p[i - 1].x), y: p[i - 1].y + t * (p[i].y - p[i - 1].y), id: p[i].id };
        out.push(q); p.splice(i, 0, q); D = 0;
      } else D += d;
    }
    while (out.length < n) out.push(p[p.length - 1]);
    return out.slice(0, n);
  }
  /** 손떨림 때문에 길이가 부풀지 않도록: 가볍게 평균내고, 너무 가까운 점은 버린다 */
  function smooth(s0, minGap) {
    const s = [s0[0]]; // 먼저 점 사이를 촘촘하게 채운다 (모서리가 깎이지 않게)
    for (let i = 1; i < s0.length; i++) {
      const [ax, ay] = s0[i - 1], [bx, by] = s0[i], k = Math.ceil(Math.hypot(bx - ax, by - ay) / (minGap / 2 || 1));
      for (let j = 1; j <= k; j++) s.push([ax + ((bx - ax) * j) / k, ay + ((by - ay) * j) / k]);
    }
    const avg = s.map((p, i) => {
      const a = s[Math.max(0, i - 1)], c = s[Math.min(s.length - 1, i + 1)];
      return i === 0 || i === s.length - 1 ? p : [(a[0] + 2 * p[0] + c[0]) / 4, (a[1] + 2 * p[1] + c[1]) / 4];
    });
    const out = [avg[0]];
    for (let i = 1; i < avg.length; i++) {
      const q = out[out.length - 1];
      if (Math.hypot(avg[i][0] - q[0], avg[i][1] - q[1]) >= minGap || i === avg.length - 1) out.push(avg[i]);
    }
    return out;
  }
  function normalize(strokes, raw) {
    const b0 = bbox(strokes), gap = Math.max(b0.w, b0.h) * 0.04;
    let pts = [];
    strokes.forEach((s, id) => (raw ? s : smooth(s, gap)).forEach(([x, y]) => pts.push({ x, y, id })));
    if (pts.length === 1) pts.push({ ...pts[0], x: pts[0].x + 0.01 });
    pts = resample(pts, N);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    pts = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, id: p.id }));
    const cx = pts.reduce((a, p) => a + p.x, 0) / N, cy = pts.reduce((a, p) => a + p.y, 0) / N;
    return pts.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
  }
  function cloudDistance(a, b, start) {
    const matched = new Array(N).fill(false);
    let sum = 0, i = start;
    do {
      let min = Infinity, idx = -1;
      for (let j = 0; j < N; j++) if (!matched[j]) { const d = dist(a[i], b[j]); if (d < min) { min = d; idx = j; } }
      matched[idx] = true;
      const w = 1 - ((i - start + N) % N) / N;
      sum += w * min;
      i = (i + 1) % N;
    } while (i !== start);
    return sum;
  }
  function greedyMatch(a, b) {
    const step = Math.floor(Math.sqrt(N));
    let min = Infinity;
    for (let i = 0; i < N; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
    return min;
  }
  const CLOUDS = [];
  for (const [digit, variants] of Object.entries(TEMPLATES)) for (const v of variants) CLOUDS.push({ digit, cloud: normalize(v, true) });


  /** 한 글자(획 묶음)를 0~9 중 하나로 */
  function classifyDigit(strokes) {
    const b = bbox(strokes);
    // 가늘고 긴 한 획은 1
    if (b.w < b.h * 0.22) return { digit: "1", score: 0 };
    const cloud = normalize(strokes);
    let best = { digit: "?", score: Infinity };
    for (const t of CLOUDS) { const d = greedyMatch(cloud, t.cloud); if (d < best.score) best = { digit: t.digit, score: d }; }
    return best;
  }

  /** 여러 획을 글자 단위로 나눈다 (가로로 겹치는 획끼리 한 글자) */
  function segment(strokes, lineH) {
    const items = strokes.filter((s) => s.length).map((s) => ({ strokes: [s], ...bbox([s]) })).sort((a, b) => a.x0 - b.x0);
    const groups = [];
    for (const it of items) {
      const g = groups[groups.length - 1];
      if (g) {
        // 가는 획(1의 세로선, 4의 세로획 등)은 폭을 글자 높이의 15%로 넓혀 본 뒤, 좁은 쪽 폭의 35% 넘게 겹치면 같은 글자
        const pad = (b) => Math.max(0, ((lineH || 0) * 0.15 - b.w) / 2);
        const overlap = Math.min(g.x1 + pad(g), it.x1 + pad(it)) - Math.max(g.x0 - pad(g), it.x0 - pad(it));
        const narrow = Math.max(Math.min(g.w, it.w), (lineH || 0) * 0.15);
        if (overlap > narrow * 0.35) {
          g.strokes.push(...it.strokes); Object.assign(g, bbox(g.strokes)); continue;
        }
      }
      groups.push({ ...it, strokes: [...it.strokes] });
    }
    return groups;
  }

  /** 획 목록 → 읽은 글자열. allowDecimal이면 작은 점을 소수점으로 */
  function recognize(strokes, allowDecimal) {
    if (!strokes.length) return "";
    const all = bbox(strokes);
    const lineH = Math.max(all.h, 1);
    let text = "";
    for (const g of segment(strokes, lineH)) {
      const small = Math.max(g.w, g.h) < lineH * 0.2;
      if (small) {
        if (allowDecimal && g.y0 > all.y0 + lineH * 0.45 && !text.includes(".") && text) text += ".";
        continue; // 작은 점·흠은 무시
      }
      text += classifyDigit(g.strokes).digit;
    }
    return text;
  }

  // ---- 화면: 펜으로 쓰는 칸 ----
  /**
   * PenPad({ allowDecimal, strokes, onChange(strokes, text), onSubmit(text) })
   * strokes 배열은 부르는 쪽 상태에 보관해 다시 그려도 사라지지 않게 한다.
   */
  function PenPad(opts) {
    const strokes = opts.strokes;
    const wrap = document.createElement("div");
    wrap.className = "penpad";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "여기에 답을 펜으로 쓰세요");
    canvas.setAttribute("role", "img");
    const hint = document.createElement("div");
    hint.className = "pen-hint";
    hint.textContent = "여기에 숫자를 크게 써요";
    wrap.append(canvas, hint);
    let ctx, scale = 1, cur = null;

    function size() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx = canvas.getContext("2d"); scale = dpr;
      redraw();
    }
    function redraw() {
      if (!ctx) return;
      const css = getComputedStyle(canvas);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = css.getPropertyValue("--ink").trim() || "#222";
      ctx.lineWidth = 6;
      for (const s of strokes) {
        ctx.beginPath();
        s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]);
        ctx.stroke();
      }
      hint.hidden = strokes.length > 0;
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => {
      if (opts.disabled) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
      cur = [pos(e)]; strokes.push(cur); redraw();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!cur) return;
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) cur.push(pos(ev));
      redraw();
    });
    const end = () => { if (!cur) return; cur = null; opts.onChange && opts.onChange(strokes, recognize(strokes, opts.allowDecimal)); };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    requestAnimationFrame(size);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => size()).observe(canvas);
    return wrap;
  }

  const api = { recognize, segment, classifyDigit, TEMPLATES };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(window, { PenRecognizer: api, PenPad });
})();
