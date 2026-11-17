// 연습장: 화면 오른쪽 손잡이를 당기면 나오는 낙서·계산용 종이.
// 배경(무지·밑줄·한자노트·영어노트)을 고르고 펜으로 마음대로 쓴다. 스타일러스는 누르는 힘에 따라 굵기가 달라진다.
// '새 종이'를 누르거나 앱을 닫으면 지금 종이를 그림(PNG)으로 저장한다 (기기 안 IndexedDB, 앱에서는 갤러리에도).
(() => {
  const PAGES = [["plain", "무지"], ["lined", "밑줄"], ["hanja", "한자노트"], ["english", "영어노트"]];
  const PENS = [["#26252e", "검정"], ["#2f62d6", "파랑"], ["#d23c3c", "빨강"]];
  const SIZES = [[2.2, "가는 선"], [4, "보통 선"], [7, "굵은 선"]];
  const get = (k, d) => { try { const v = localStorage.getItem("sf.pad." + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem("sf.pad." + k, JSON.stringify(v)); } catch { /* 무시 */ } };

  let page = get("page", "plain"), color = get("color", PENS[0][0]), size = get("size", 4), erasing = false;
  const strokes = []; // { color, size, erase, pts: [{x,y,p}] }
  let cur = null, penSeen = false, open = false;
  // 얼마나 꺼낼지(0~1, 당긴 만큼 남는다)와 비치게 보기
  let shownPart = get("shown", 1), seeThrough = get("see", false);
  const maxW = () => Math.min(620, window.innerWidth - 44);
  let paperId = Date.now(), dirty = false;

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
  const tip = el("div", { class: "pad-toast", role: "status", "aria-live": "polite" });
  const paper = el("div", { class: "pad-paper" }, bg, ink, tip);
  const bar = el("div", { class: "pad-bar", role: "toolbar", "aria-label": "연습장 도구" });
  const drawer = el("aside", { class: "notepad", id: "notepad", "aria-label": "연습장", "aria-hidden": "true" }, bar, paper);
  const wrap = el("div", { class: "notepad-wrap" }, handle, drawer);

  function chip(label, pressed, onclick, extra = {}) {
    return el("button", { class: "pad-chip", "aria-pressed": String(pressed), onclick, ...extra }, label);
  }
  /** 선 굵기: 지금 굵기를 그림으로 보여 주는 버튼 → 누르면 굵기 그림 목록이 펼쳐진다 */
  const lineImg = (s) => el("span", { class: "line", style: `height:${Math.max(2, Math.round(s))}px` });
  let sizeMenu = null;
  function closeSizeMenu() { if (sizeMenu) { sizeMenu.remove(); sizeMenu = null; } }
  function sizeSelect() {
    const cur = SIZES.find(([v]) => v === size) || SIZES[1];
    const btn = el("button", { class: "pad-chip pad-size", "aria-haspopup": "listbox", "aria-expanded": "false", "aria-label": `선 굵기: ${cur[1]}`, onclick: (e) => {
      e.stopPropagation();
      if (sizeMenu) return closeSizeMenu();
      const d = drawer.getBoundingClientRect(), b = btn.getBoundingClientRect();
      sizeMenu = el("div", { class: "pad-size-menu", role: "listbox", "aria-label": "선 굵기", style: `left:${b.left - d.left}px;top:${b.bottom - d.top + 4}px` },
        ...SIZES.map(([v, label]) => {
          const o = el("button", { class: "pad-size-opt", role: "option", "aria-selected": String(v === size), "aria-label": label, onclick: (ev) => {
            ev.stopPropagation(); size = v; erasing = false; set("size", v); closeSizeMenu(); buildBar();
          } }, lineImg(v));
          return o;
        }));
      drawer.append(sizeMenu);
      btn.setAttribute("aria-expanded", "true");
      sizeMenu.querySelector('[aria-selected="true"]')?.focus();
    } }, lineImg(cur[0]), el("span", { class: "caret", "aria-hidden": "true" }, "▾"));
    return btn;
  }
  document.addEventListener("pointerdown", (e) => { if (sizeMenu && !sizeMenu.contains(e.target)) closeSizeMenu(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sizeMenu) { e.stopPropagation(); closeSizeMenu(); } }, true);
  function buildBar() {
    const pages = el("div", { class: "pad-group", role: "group", "aria-label": "배경" },
      ...PAGES.map(([id, label]) => chip(label, page === id, () => { page = id; set("page", id); buildBar(); drawBg(); })));
    const pens = el("div", { class: "pad-group", role: "group", "aria-label": "펜" },
      ...PENS.map(([c, label]) => chip(el("span", { class: "dot", style: `background:${c}` }), !erasing && color === c,
        () => { color = c; erasing = false; set("color", c); buildBar(); }, { "aria-label": label + " 펜" })),
      sizeSelect(),
      chip("지우개", erasing, () => { erasing = !erasing; buildBar(); }));
    const acts = el("div", { class: "pad-group pad-acts" },
      el("button", { class: "pad-chip pad-undo", onclick: () => { if (strokes.pop()) dirty = true; redraw(); }, "aria-label": "되돌리기" }, "↶"),
      el("button", { class: "pad-chip pad-see", "aria-pressed": String(seeThrough), onclick: () => { seeThrough = !seeThrough; set("see", seeThrough); applySee(); buildBar(); },
        title: "뒤에 있는 문제가 비쳐 보여요" }, "비치게"),
      el("button", { class: "pad-chip pad-new", onclick: newPaper }, "새 종이"));
    // 버튼 자리는 고정: 1줄 = 되돌리기·비치게·새 종이, 2줄 = 배경, 3줄 = 펜 색·굵기(드롭다운)·지우개 (연습장 폭이 바뀌어도 줄바꿈하지 않음)
    pages.classList.add("pad-pages"); pens.classList.add("pad-pens");
    bar.replaceChildren(el("div", { class: "pad-row" }, acts), el("div", { class: "pad-row" }, pages), el("div", { class: "pad-row" }, pens));
  }
  let toastTimer = 0;
  function toast(text) {
    tip.textContent = text; tip.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => tip.classList.remove("show"), 1800);
  }
  /** 지금 종이를 저장하고 빈 종이를 꺼낸다 */
  async function newPaper() {
    if (!strokes.length) return;
    const saved = await saveNow();
    strokes.length = 0; paperId = Date.now(); dirty = false; redraw();
    toast(saved ? "앞 종이는 그림으로 저장했어요" : "새 종이예요");
  }

  // ---- 그림으로 저장 (IndexedDB 'studyfriend' / notepad) ----
  const KEEP = 60;
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((ok, fail) => {
      const r = indexedDB.open("studyfriend", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("notepad", { keyPath: "id" });
      r.onsuccess = () => ok(r.result); r.onerror = () => { dbp = null; fail(r.error); };
    });
    return dbp;
  }
  const tx = (mode, fn) => db().then((d) => new Promise((ok, fail) => {
    const t = d.transaction("notepad", mode), st = t.objectStore("notepad"), out = fn(st);
    t.oncomplete = () => ok(out && out.result); t.onerror = () => fail(t.error);
  }));
  function snapshot() {
    const c = document.createElement("canvas");
    c.width = bg.width; c.height = bg.height;
    const x = c.getContext("2d");
    x.fillStyle = "#fffdf8";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(bg, 0, 0); x.drawImage(ink, 0, 0);
    return c;
  }
  async function saveNow() {
    if (!strokes.length || !dirty || !W) return false;
    dirty = false;
    const c = snapshot(), id = paperId;
    const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
    try {
      await tx("readwrite", (st) => st.put({ id, at: Date.now(), page, blob }));
      const keys = await tx("readonly", (st) => st.getAllKeys());
      if (keys.length > KEEP) await tx("readwrite", (st) => keys.sort((a, b) => a - b).slice(0, keys.length - KEEP).forEach((k) => st.delete(k)));
    } catch { /* 저장 못 함 */ }
    // 앱에서는 태블릿 갤러리에도 저장
    try { if (window.StudyFriendApp && StudyFriendApp.saveImage) StudyFriendApp.saveImage(`연습장-${id}.png`, c.toDataURL("image/png").split(",")[1]); } catch { /* 무시 */ }
    return true;
  }
  async function list() {
    const all = await tx("readonly", (st) => st.getAll());
    return (all || []).sort((a, b) => b.at - a.at);
  }
  const remove = (id) => tx("readwrite", (st) => st.delete(id));
  // 앱을 닫거나 다른 앱으로 갈 때 저장
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
  window.addEventListener("pagehide", () => saveNow());

  // ---- 종이 그리기 ----
  let W = 0, H = 0, dpr = 1;
  // 종이(캔버스)는 늘 다 꺼냈을 때 크기로 두고, 조금만 꺼내면 왼쪽 부분만 보인다 (쓴 것이 잘리거나 밀리지 않게)
  function sizeCanvas() {
    const r = paper.getBoundingClientRect();
    const w = maxW(), hh = r.height || window.innerHeight;
    if (!w || !hh) return;
    if (w === W && hh === H && bg.width) return;
    W = w; H = hh; dpr = window.devicePixelRatio || 1;
    for (const c of [bg, ink]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + "px"; c.style.height = H + "px"; }
    drawBg(); redraw();
  }
  const applySee = () => wrap.classList.toggle("see-through", seeThrough);
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
  const end = (e) => { if (cur && e.pointerId === cur.id) { if (strokes.length > 2000) strokes.shift(); cur = null; dirty = true; } };
  ink.addEventListener("pointerup", end);
  ink.addEventListener("pointercancel", end);

  // ---- 꺼내기·넣기: 손잡이를 누르거나 왼쪽으로 당긴다. 당긴 만큼만 나와 있다 ----
  const CLOSE_PX = 40;
  const MIN_PART = () => Math.min(1, 280 / maxW());
  const setShown = (v) => wrap.style.setProperty("--shown", v.toFixed(3));
  function toggle(on, part) {
    open = on;
    if (on) {
      shownPart = Math.max(MIN_PART(), Math.min(1, part ?? shownPart));
      set("shown", shownPart);
    }
    setShown(on ? shownPart : 0);
    wrap.classList.toggle("open", on);
    handle.setAttribute("aria-expanded", String(on));
    handle.setAttribute("aria-label", on ? "연습장 넣기" : "연습장 꺼내기");
    drawer.setAttribute("aria-hidden", String(!on));
    drawer.inert = !on;
    if (on) requestAnimationFrame(sizeCanvas);
  }
  let drag = null;
  handle.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, id: e.pointerId, moved: false, wasOpen: open, start: open ? shownPart : 0, now: open ? shownPart : 0 };
    try { handle.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    wrap.classList.add("dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    drag.now = Math.min(1, Math.max(0, drag.start - dx / maxW()));
    setShown(drag.now);
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    wrap.classList.remove("dragging");
    const { moved, now, start, x: drag0x, wasOpen } = drag; drag = null;
    if (!moved) { setShown(open ? shownPart : 0); return; } // 그냥 누르면 click에서 처리
    // 열린 연습장을 오른쪽으로 40px 넘게 밀면 닫는다. 덜 밀면 원래 자리로
    const dx = e.clientX - drag0x;
    if (wasOpen && dx >= CLOSE_PX) toggle(false);
    else if (wasOpen && dx > 0) toggle(true, start);
    else if (now < 0.12) toggle(false); else toggle(true, now);
    handle.dataset.skipClick = "1";
  };
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);
  handle.addEventListener("click", () => { if (handle.dataset.skipClick) { delete handle.dataset.skipClick; return; } toggle(!open); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) toggle(false); }, true);

  buildBar();
  applySee();
  setShown(0);
  drawer.inert = true;
  document.body.append(wrap);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => sizeCanvas()).observe(paper);
  window.addEventListener("resize", () => sizeCanvas());
  requestAnimationFrame(sizeCanvas);
  window.Notepad = { open: () => toggle(true), close: () => toggle(false), saveNow, list, remove, newPaper, get strokes() { return strokes.length; } };
})();
