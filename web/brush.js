// 붓펜 효과: 한자 쓰기 칸 위에 투명한 캔버스를 덮어, 펜 압력(스타일러스)이나
// 손가락·마우스는 쓰는 빠르기에 따라 획의 굵기가 달라지게 그린다.
// 실제 채점(획순·방향)은 아래의 Hanzi Writer가 그대로 맡는다.
(() => {
  /**
   * attachBrush(stage, { base }) → { commit(), discard(), clear(), destroy() }
   * 한 획을 다 쓰면 결과가 나올 때까지 '대기' 상태로 두고, 맞으면 commit, 틀리면 discard.
   */
  function attachBrush(stage, opts = {}) {
    const canvas = document.createElement("canvas");
    canvas.className = "brush-layer";
    canvas.setAttribute("aria-hidden", "true");
    stage.append(canvas);
    let ctx, W = 0, H = 0, dpr = 1;
    const done = [];      // 맞은 획
    let pending = null;   // 결과를 기다리는 획
    let cur = null;       // 쓰는 중인 획
    let fading = null;

    const ink = () => getComputedStyle(stage).getPropertyValue("--ink").trim() || "#1d1b22";
    const base = () => (opts.base || 0.075) * Math.min(W, H);

    function size() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height; dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext("2d");
      redraw();
    }

    /** 점마다 굵기 계산: 펜이면 압력, 아니면 빠르기(빠를수록 가늘게). 시작과 끝은 붓처럼 가늘게 */
    function widths(s, final) {
      const b = base(), out = [];
      let w = b * 0.55;
      s.pts.forEach((p, i) => {
        let target;
        if (s.pen && p.pr > 0) target = b * (0.3 + 1.25 * Math.min(p.pr, 1));
        else {
          const q = s.pts[Math.max(0, i - 1)], dt = Math.max(p.t - q.t, 1);
          const v = Math.hypot(p.x - q.x, p.y - q.y) / dt; // px/ms
          target = b * Math.min(1.3, Math.max(0.45, 1.3 - v * 0.55));
        }
        w = w * 0.75 + target * 0.25;
        const start = Math.min(1, 0.45 + i * 0.12); // 붓을 대는 부분
        out.push(w * start);
      });
      if (final) { // 붓을 떼는 부분: 마지막 몇 점을 가늘게
        const n = Math.min(6, out.length);
        for (let k = 0; k < n; k++) out[out.length - 1 - k] *= 0.35 + (0.65 * k) / n;
      }
      return out;
    }
    function drawStroke(s, final, alpha = 1) {
      if (!ctx || !s.pts.length) return;
      const ws = widths(s, final);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ink();
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i], q = s.pts[Math.max(0, i - 1)];
        const r0 = ws[Math.max(0, i - 1)] / 2, r1 = ws[i] / 2;
        const d = Math.hypot(p.x - q.x, p.y - q.y), n = Math.max(1, Math.ceil(d / 1.2));
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          ctx.beginPath();
          ctx.arc(q.x + (p.x - q.x) * t, q.y + (p.y - q.y) * t, r0 + (r1 - r0) * t, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    function redraw() {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const s of done) drawStroke(s, true);
      if (fading) drawStroke(fading.s, true, fading.a);
      if (pending) drawStroke(pending, true);
      if (cur) drawStroke(cur, false);
    }
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, pr: e.pressure, t: e.timeStamp }; };

    // 아래 Hanzi Writer도 같은 입력을 받아야 하므로 막지 않고 엿보기만 한다
    const down = (e) => {
      if (e.button > 0) return;
      if (pending) pending = null; // 결과가 안 나온 이전 획은 버린다
      cur = { pen: e.pointerType === "pen", pts: [pt(e)] };
      redraw();
    };
    const move = (e) => {
      if (!cur) return;
      const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const x of ev.length ? ev : [e]) cur.pts.push(pt(x));
      redraw();
    };
    const up = () => { if (!cur) return; pending = cur; cur = null; redraw(); };
    stage.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    requestAnimationFrame(size);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
    if (ro) ro.observe(stage);

    return {
      commit() { if (pending) { done.push(pending); pending = null; redraw(); } },
      discard() {
        if (!pending) return;
        fading = { s: pending, a: 1 }; pending = null;
        const step = () => { if (!fading) return; fading.a -= 0.12; if (fading.a <= 0) fading = null; redraw(); if (fading) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      },
      clear() { done.length = 0; pending = null; cur = null; fading = null; redraw(); },
      destroy() {
        stage.removeEventListener("pointerdown", down, true);
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", up, true);
        if (ro) ro.disconnect();
        canvas.remove();
      },
    };
  }
  window.attachBrush = attachBrush;
})();
