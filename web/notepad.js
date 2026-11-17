// 연습장: 화면 오른쪽 손잡이를 당기면 나오는 낙서·계산용 종이.
// 배경(무지·밑줄·한자노트·영어노트)을 고르고 펜으로 마음대로 쓴다. 스타일러스는 누르는 힘에 따라 굵기가 달라진다.
// 쓴 내용은 앱을 켜 둔 동안만 남는다 (저장하지 않음).
(() => {
  const PAGES = [["plain", "무지"], ["lined", "밑줄"], ["hanja", "한자노트"], ["english", "영어노트"]];
  const PENS = [["#26252e", "검정"], ["#2f62d6", "파랑"], ["#d23c3c", "빨강"]];
  const SIZES = [[2.2, "가는 펜"], [4, "보통 펜"], [7, "굵은 펜"]];
  const get = (k, d) => { try { const v = localStorage.getItem("sf.pad." + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem("sf.pad." + k, JSON.stringify(v)); } catch { /* 무시 */ } };

  let page = get("page", "plain"), color = get("color", PENS[0][0]), size = get("size", 4), erasing = false;
  const strokes = []; // { color, size, erase, pts: [{x,y,p}] }
  let cur = null, penSeen = false, open = false;

  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
    e.append(...kids);
    return e;
  };

  // ---- 화면 구성 ----
  const handle = el("button", { class: "pad-handle", "aria-label": "연습장 꺼내기", "aria-expanded": "false", "aria-controls": "notepad" },
    el("span", { class: "grip", "aria-hidden": "true" }), el("span", { class: "label" }, "연습장"));
  const bg = el("canvas", { class: "pad-bg", "aria-hidden": "true" });
  const ink = el("canvas", { class: "pad-ink", role: "img", "aria-label": "연습장 쓰는 칸" });
  const paper = el("div", { class: "pad-paper" }, bg, ink);
  const bar = el("div", { class: "pad-bar", role: "toolbar", "aria-label": "연습장 도구" });
  const drawer = el("aside", { class: "notepad", id: "notepad", "aria-label": "연습장", "aria-hidden": "true" }, bar, paper);
  const wrap = el("div", { class: "notepad-wrap" }, handle, drawer);

  function chip(label, pressed, onclick, extra = {}) {
    return el("button", { class: "pad-chip", "aria-pressed": String(pressed), onclick, ...extra }, label);
  }
  function buildBar() {
    const pages = el("div", { class: "pad-group", role: "group", "aria-label": "배경" },
      ...PAGES.map(([id, label]) => chip(label, page === id, () => { page = id; set("page", id); buildBar(); drawBg(); })));
    const pens = el("div", { class: "pad-group", role: "group", "aria-label": "펜" },
      ...PENS.map(([c, label]) => chip(el("span", { class: "dot", style: `background:${c}` }), !erasing && color === c,
        () => { color = c; erasing = false; set("color", c); buildBar(); }, { "aria-label": label + " 펜" })),
      ...SIZES.map(([s, label]) => chip(el("span", { class: "line", style: `height:${s}px` }), size === s,
        () => { size = s; set("size", s); buildBar(); }, { "aria-label": label })),
      chip("지우개", erasing, () => { erasing = !erasing; buildBar(); }));
    const acts = el("div", { class: "pad-group" },
      el("button", { class: "pad-chip pad-undo", onclick: () => { strokes.pop(); redraw(); }, "aria-label": "되돌리기" }, "↶"),
      el("button", { class: "pad-chip", onclick: clearAll }, clearArmed ? "한 번 더" : "모두 지우기"),
      el("button", { class: "pad-chip pad-close", onclick: () => toggle(false), "aria-label": "연습장 넣기" }, "✕"));
    bar.replaceChildren(pages, pens, acts);
  }
  let clearArmed = false, clearTimer = 0;
  function clearAll() {
    if (!strokes.length) return;
    if (!clearArmed) { clearArmed = true; buildBar(); clearTimeout(clearTimer); clearTimer = setTimeout(() => { clearArmed = false; buildBar(); }, 2500); return; }
    clearArmed = false; strokes.length = 0; redraw(); buildBar();
  }

  // ---- 종이 그리기 ----
  let W = 0, H = 0, dpr = 1;
  function sizeCanvas() {
    const r = paper.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height; dpr = window.devicePixelRatio || 1;
    for (const c of [bg, ink]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    drawBg(); redraw();
  }
  function drawBg() {
    const x = bg.getContext("2d");
    if (!x || !W) return;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const line = (x0, y0, x1, y1, c, w = 1, dash = []) => { x.strokeStyle = c; x.lineWidth = w; x.setLineDash(dash); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
    const M = 20;
    if (page === "lined") {
      line(56, 0, 56, H, "#e7a6a0", 1.5); // 왼쪽 여백 선
      for (let y = 64; y < H - 8; y += 44) line(0, y, W, y, "#b9cbe4", 1.2);
    } else if (page === "hanja") {
      // 田자 칸: 바깥 테두리는 진하게, 가운데 십자는 점선
      const n = Math.max(4, Math.floor((W - M * 2) / 96)), s = (W - M * 2) / n, rows = Math.floor((H - M * 2) / s);
      const top = (H - rows * s) / 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) {
        const x0 = M + c * s, y0 = top + r * s;
        line(x0 + s / 2, y0 + 4, x0 + s / 2, y0 + s - 4, "#efc3bb", 1, [5, 5]);
        line(x0 + 4, y0 + s / 2, x0 + s - 4, y0 + s / 2, "#efc3bb", 1, [5, 5]);
      }
      for (let c = 0; c <= n; c++) line(M + c * s, top, M + c * s, top + rows * s, "#d77f72", 1.5);
      for (let r = 0; r <= rows; r++) line(M, top + r * s, W - M, top + r * s, "#d77f72", 1.5);
    } else if (page === "english") {
      // 영어 네 줄: 맨 위·가운데(점선)·밑줄(진하게)·맨 아래
      const gap = 18, block = gap * 3 + 30;
      for (let y = 40; y + gap * 3 < H - 10; y += block) {
        line(M, y, W - M, y, "#9dbbe0", 1);
        line(M, y + gap, W - M, y + gap, "#9dbbe0", 1, [6, 6]);
        line(M, y + gap * 2, W - M, y + gap * 2, "#d77f72", 1.6);
        line(M, y + gap * 3, W - M, y + gap * 3, "#9dbbe0", 1);
      }
    }
  }
  const widthAt = (s, p) => s.size * (s.pen ? 0.35 + 1.3 * Math.min(p.p || 0.5, 1) : 1) * (s.erase ? 5 : 1);
  function drawStroke(x, s, from = 1) {
    x.save();
    x.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    x.strokeStyle = x.fillStyle = s.color; x.lineCap = "round"; x.lineJoin = "round";
    const P = s.pts;
    if (P.length === 1) { x.beginPath(); x.arc(P[0].x, P[0].y, widthAt(s, P[0]) / 2, 0, Math.PI * 2); x.fill(); }
    for (let i = Math.max(1, from); i < P.length; i++) {
      x.lineWidth = (widthAt(s, P[i - 1]) + widthAt(s, P[i])) / 2;
      x.beginPath(); x.moveTo(P[i - 1].x, P[i - 1].y); x.lineTo(P[i].x, P[i].y); x.stroke();
    }
    x.restore();
  }
  function redraw() {
    const x = ink.getContext("2d");
    if (!x || !W) return;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    for (const s of strokes) drawStroke(x, s);
  }

  // ---- 쓰기 ----
  const pt = (e) => { const r = ink.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure }; };
  ink.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "pen") penSeen = true;
    else if (e.pointerType === "touch" && penSeen) return; // 펜을 쓰는 중이면 손바닥 닿는 것은 무시
    if (e.button > 0) return;
    e.preventDefault();
    try { ink.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    cur = { id: e.pointerId, color, size, erase: erasing, pen: e.pointerType === "pen", pts: [pt(e)] };
    strokes.push(cur);
    drawStroke(ink.getContext("2d"), cur);
  });
  ink.addEventListener("pointermove", (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    const n = cur.pts.length;
    for (const x of (e.getCoalescedEvents && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e])) cur.pts.push(pt(x));
    drawStroke(ink.getContext("2d"), cur, n);
  });
  const end = (e) => { if (cur && e.pointerId === cur.id) { if (strokes.length > 300) strokes.shift(); cur = null; } };
  ink.addEventListener("pointerup", end);
  ink.addEventListener("pointercancel", end);

  // ---- 꺼내기·넣기: 손잡이를 누르거나 왼쪽으로 당긴다 ----
  function toggle(on) {
    open = on;
    wrap.classList.toggle("open", on);
    wrap.style.removeProperty("--pull");
    handle.setAttribute("aria-expanded", String(on));
    handle.setAttribute("aria-label", on ? "연습장 넣기" : "연습장 꺼내기");
    drawer.setAttribute("aria-hidden", String(!on));
    drawer.inert = !on;
    if (on) requestAnimationFrame(sizeCanvas);
  }
  let drag = null;
  handle.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, id: e.pointerId, moved: false, w: drawer.getBoundingClientRect().width };
    try { handle.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    wrap.classList.add("dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    // 얼마나 나와 있는지 0~1
    const shown = Math.min(1, Math.max(0, (open ? 1 : 0) - dx / drag.w));
    wrap.style.setProperty("--pull", shown.toFixed(3));
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    wrap.classList.remove("dragging");
    const shown = parseFloat(wrap.style.getPropertyValue("--pull"));
    const moved = drag.moved; drag = null;
    if (!moved) return; // 그냥 누르면 click에서 처리
    toggle(isNaN(shown) ? open : shown > (open ? 0.7 : 0.3));
    handle.dataset.skipClick = "1";
  };
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);
  handle.addEventListener("click", () => { if (handle.dataset.skipClick) { delete handle.dataset.skipClick; return; } toggle(!open); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) toggle(false); }, true);

  buildBar();
  drawer.inert = true;
  document.body.append(wrap);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => sizeCanvas()).observe(paper);
  requestAnimationFrame(sizeCanvas);
  window.Notepad = { open: () => toggle(true), close: () => toggle(false), get strokes() { return strokes.length; } };
})();
