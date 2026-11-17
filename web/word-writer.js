// 영어 단어 손글씨 쓰기. 네 줄 공책 칸에 단어를 쓰면 글자 모양과 얼마나 겹치는지로 확인한다.
// 글자를 하나하나 읽는(인식) 방식이 아니라 "정답 단어의 모양을 따라 썼는지"를 보는 방식이라,
// 비슷한 모양의 다른 단어를 쓰면 통과할 수도 있다. 서버 없이 기기 안에서만 처리.
(() => {
  const FONT = '"Andika", "Comic Sans MS", "Noto Sans", sans-serif';
  const GRID = 3; // 확인할 때 3px을 한 칸으로 줄여 비교

  /** 칸 크기에 맞는 글자 크기와 위치 (네 줄 공책 기준) */
  function layout(ctx, word, W, H) {
    const top = H * 0.16, base = H * 0.72;
    let size = (base - top) / 0.95;
    ctx.font = `${size}px ${FONT}`;
    const w = ctx.measureText(word).width;
    if (w > W * 0.9) size *= (W * 0.9) / w;
    ctx.font = `${size}px ${FONT}`;
    const tw = ctx.measureText(word).width;
    return { size, x: (W - tw) / 2, base, top, xh: base - size * 0.48, bottom: base + size * 0.25 };
  }

  function drawLines(ctx, L, W, line) {
    ctx.save();
    ctx.strokeStyle = line; ctx.lineWidth = 1.5;
    for (const [y, dash] of [[L.base - L.size * 0.72, [6, 6]], [L.xh, [6, 6]], [L.base, []], [L.bottom, [6, 6]]]) {
      ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke();
    }
    ctx.restore();
  }

  /** 마스크(0/1 배열) 만들기 */
  function mask(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#000"; x.strokeStyle = "#000"; x.lineCap = "round"; x.lineJoin = "round";
    draw(x);
    const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    return m;
  }
  const count = (m) => m.reduce((a, v) => a + v, 0);
  const both = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] && b[i]) n++; return n; };

  /**
   * 쓴 획과 정답 단어 비교.
   * - 따라 쓰기(guide): 흐린 글자가 있던 자리에 그대로 썼는지 본다 (위치 그대로 비교).
   * - 혼자 쓰기: 쓴 글씨의 테두리를 정답 글자 테두리에 맞춘 뒤, 겹침 정도와
   *   글자마다 위로 올라가는 획(b, d, h, l, t…)·아래로 내려가는 획(g, p, y…)이 같은 자리에 있는지 본다.
   */
  function score(word, strokes, W, H, guide) {
    const pts = strokes.flat();
    if (pts.length < 2) return { pass: false, precision: 0, recall: 0, zones: 0 };
    const w = Math.ceil(W / GRID), h = Math.ceil(H / GRID);
    const probe = document.createElement("canvas").getContext("2d");
    const L = layout(probe, word, W, H);
    const fs = L.size / GRID, gx = L.x / GRID, gb = L.base / GRID;
    const g = mask(w, h, (x) => { x.font = `${fs}px ${FONT}`; x.fillText(word, gx, gb); });
    let gx0 = w, gy0 = h, gx1 = 0, gy1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y * w + x]) { gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x); gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y); }
    const xs = pts.map((p) => p[0] / GRID), ys = pts.map((p) => p[1] / GRID);
    const ix0 = Math.min(...xs), ix1 = Math.max(...xs), iy0 = Math.min(...ys), iy1 = Math.max(...ys);
    const sx = (gx1 - gx0) / Math.max(ix1 - ix0, 1), sy = (gy1 - gy0) / Math.max(iy1 - iy0, 1);
    const map = guide ? ([px, py]) => [px / GRID, py / GRID] : ([px, py]) => [gx0 + (px / GRID - ix0) * sx, gy0 + (py / GRID - iy0) * sy];
    const stem = Math.max(2, fs * 0.09); // 글자 획 굵기쯤
    const inkLine = (x, lw) => { x.lineWidth = lw; for (const s of strokes) { x.beginPath(); s.map(map).forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); if (s.length === 1) x.lineTo(map(s[0])[0] + 0.1, map(s[0])[1]); x.stroke(); } };
    const tol = guide ? 2.2 : 1.6;
    const ink = mask(w, h, (x) => inkLine(x, 1.5));
    const inkMid = mask(w, h, (x) => inkLine(x, stem * 0.8));
    const inkWide = mask(w, h, (x) => inkLine(x, stem * tol * 1.3));
    const gWide = mask(w, h, (x) => { x.font = `${fs}px ${FONT}`; x.lineWidth = stem * tol; x.fillText(word, gx, gb); x.strokeText(word, gx, gb); });
    const precision = both(ink, gWide) / Math.max(count(ink), 1);
    const recall = both(g, inkWide) / Math.max(count(g), 1);
    // 글자마다 위·아래로 나가는 획 비교
    probe.font = `${fs}px ${FONT}`;
    const asc = gb - fs * 0.62, desc = gb + fs * 0.08;
    const letters = [...word];
    let agree = 0, judged = 0;
    letters.forEach((ch, i) => {
      if (ch === " ") return;
      const l0 = gx + probe.measureText(word.slice(0, i)).width, l1 = gx + probe.measureText(word.slice(0, i + 1)).width;
      const a0 = Math.floor(l0 + (l1 - l0) * 0.2), a1 = Math.ceil(l1 - (l1 - l0) * 0.2);
      const has = (m, y0, y1) => { for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, y1); y++) for (let x = Math.max(0, a0); x < Math.min(w, a1); x++) if (m[y * w + x]) return true; return false; };
      judged++;
      if (has(g, 0, asc) === has(inkMid, 0, asc - stem * 0.5) && has(g, desc, h) === has(inkMid, desc + stem * 0.5, h)) agree++;
    });
    const zones = judged ? agree / judged : 1;
    const ratioOk = guide || (sx / sy < 2.5 && sy / sx < 2.5);
    const pass = ratioOk && precision >= 0.7 && recall >= 0.6 && (guide || zones >= 0.75);
    return { pass, precision, recall, zones };
  }

  /**
   * WordWriter({ word, guide, onResult(ok, tries) })
   * guide: true면 흐린 글자 위에 따라 쓰고, false면 빈 공책 칸에 혼자 쓴다.
   */
  function WordWriter(opts) {
    const { word } = opts;
    const strokes = [];
    let tries = 0, cur = null, ctx, W = 0, H = 0, dpr = 1, locked = false;
    const wrap = document.createElement("div");
    wrap.className = "wordpad";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${word} 쓰는 칸`);
    const status = document.createElement("div");
    status.className = "wordpad-status";
    status.setAttribute("aria-live", "polite");
    status.textContent = opts.guide ? "흐린 글자를 따라 써 보세요." : `'${word}'를 보지 않고 써 보세요.`;
    const bar = document.createElement("div");
    bar.className = "pen-actions";
    const btn = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn" + (cls ? " " + cls : ""); b.textContent = label; b.onclick = fn; bar.append(b); return b; };
    btn("다시 쓰기", "", () => { if (locked) return; strokes.length = 0; redraw(); status.textContent = "다시 써 볼까요?"; });
    const check = btn("다 썼어요", "primary", () => {
      if (locked || !strokes.length) return;
      tries++;
      const r = score(word, strokes, W, H, opts.guide);
      if (r.pass) { locked = true; status.textContent = "잘 썼어요! ✔"; wrap.classList.add("ok"); bar.querySelectorAll("button").forEach((b) => (b.disabled = true)); }
      else status.textContent = tries >= 2 ? "모양이 조금 달라요. 다시 쓰거나 건너뛸 수 있어요." : "모양이 조금 달라요. 글자를 크게, 칸에 맞춰 다시 써 볼까요?";
      opts.onResult && opts.onResult(r.pass, tries, r);
    });
    wrap.append(canvas, status, bar);

    function colors() {
      const cs = getComputedStyle(wrap);
      return { ink: cs.getPropertyValue("--ink").trim() || "#222", faint: cs.getPropertyValue("--stroke-faint").trim() || "#ddd", line: cs.getPropertyValue("--grid-line").trim() || "#e9b8ad" };
    }
    function size() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height; dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext("2d");
      redraw();
    }
    function redraw() {
      if (!ctx) return;
      const c = colors();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const L = layout(ctx, word, W, H);
      drawLines(ctx, L, W, c.line);
      if (opts.guide) { ctx.fillStyle = c.faint; ctx.font = `${L.size}px ${FONT}`; ctx.fillText(word, L.x, L.base); }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const s of strokes) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]); ctx.stroke(); }
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => { if (locked) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* 무시 */ } cur = [pos(e)]; strokes.push(cur); redraw(); });
    canvas.addEventListener("pointermove", (e) => { if (!cur) return; const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : []; for (const x of ev.length ? ev : [e]) cur.push(pos(x)); redraw(); });
    const end = () => { cur = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    // 글꼴을 받은 뒤 다시 그린다
    try { document.fonts && document.fonts.load(`48px ${FONT}`).then(() => redraw()).catch(() => {}); } catch { /* 무시 */ }
    requestAnimationFrame(size);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => size()).observe(canvas);
    wrap._check = check;
    return wrap;
  }

  window.WordWriter = WordWriter;
  window.WordWriterScore = score;
})();
