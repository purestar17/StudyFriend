// 과목 룰렛: 오른쪽 줄을 아래로 당겼다 놓으면, 당긴 만큼 세게 돈다.
// Roulette.create({ items: [{ id, label, mark, color }], onResult(id), locked }) → { el, destroy }
// 돌아가는 계산(spinPlan, indexAt)은 따로 내보내 테스트한다.
(() => {
  const MAX_PULL = 170, MIN_PULL = 24;
  /** 당긴 길이(px) → 처음 속도(도/초). 약하게 당기면 1바퀴 남짓, 끝까지 당기면 6바퀴 넘게 */
  const speedOf = (pull) => 360 + 1900 * Math.min(1, Math.max(0, (pull - MIN_PULL) / (MAX_PULL - MIN_PULL)));
  const DECAY = 1.15; // 1초에 속도가 e^-1.15 배로 준다 (+ 일정한 마찰)
  const FRICTION = 40;
  /** 시작 속도로 돌 때 멈출 때까지 도는 각도 (시뮬레이션과 같은 계산) */
  function spinPlan(v0, dt = 1 / 60) {
    let v = v0, a = 0, t = 0;
    while (v > 4 && t < 20) { a += v * dt; v = v * Math.exp(-DECAY * dt) - FRICTION * dt; t += dt; }
    return { angle: a, time: t };
  }
  /** 바늘(위쪽)에 걸린 칸 번호. rot: 바퀴가 시계 방향으로 돈 각도 */
  function indexAt(rot, n) {
    const seg = 360 / n, a = ((360 - (rot % 360)) % 360 + 360) % 360;
    return Math.floor(a / seg) % n;
  }

  function create({ items, onResult, locked = null, rotation = null }) {
    const n = items.length, seg = 360 / n;
    const el = document.createElement("div");
    el.className = "roulette";
    el.innerHTML = `<div class="rl-wheel-wrap"><div class="rl-pointer" aria-hidden="true"></div><canvas class="rl-wheel" role="img"></canvas><div class="rl-hub" aria-hidden="true"></div></div>
      <div class="rl-cord" aria-hidden="true"><div class="rl-line"></div><button class="rl-knob" type="button" aria-label="줄을 아래로 당겼다 놓아요"></button><div class="rl-hint">당겨요!</div></div>
      <div class="rl-status" role="status" aria-live="polite"></div>`;
    const canvas = el.querySelector("canvas"), knob = el.querySelector(".rl-knob"), line = el.querySelector(".rl-line"), status = el.querySelector(".rl-status");
    canvas.setAttribute("aria-label", "과목 룰렛: " + items.map((x) => x.label).join(", "));
    let rot = rotation ?? Math.random() * 360, spinning = false, raf = 0, dead = false;

    function draw() {
      const size = Math.min(340, Math.max(220, (el.clientWidth || 360) - 110));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.height = Math.round(size * dpr);
      canvas.style.width = canvas.style.height = size + "px";
      const x = canvas.getContext("2d"), r = size / 2;
      if (!x) return;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      items.forEach((it, i) => {
        const a0 = (-90 + i * seg) * Math.PI / 180, a1 = (-90 + (i + 1) * seg) * Math.PI / 180;
        x.beginPath(); x.moveTo(r, r); x.arc(r, r, r - 4, a0, a1); x.closePath();
        x.fillStyle = (it.color.startsWith("--") ? css.getPropertyValue(it.color).trim() : it.color) || "#888";
        x.fill(); x.lineWidth = 3; x.strokeStyle = "#fff"; x.stroke();
        x.save(); x.translate(r, r); x.rotate((a0 + a1) / 2);
        x.fillStyle = "#fff"; x.textAlign = "right"; x.textBaseline = "middle";
        const fs = Math.max(13, Math.min(20, size / 15));
        x.font = `800 ${fs}px "Noto Sans KR", sans-serif`;
        x.fillText(it.label, r - 16, 0);
        x.restore();
      });
      x.beginPath(); x.arc(r, r, r - 2, 0, Math.PI * 2); x.lineWidth = 4; x.strokeStyle = css.getPropertyValue("--line").trim() || "#ccc"; x.stroke();
      canvas.style.transform = `rotate(${rot}deg)`;
    }

    function spin(pull) {
      if (pull < MIN_PULL) { status.textContent = "조금 더 세게 당겨 봐요!"; return; }
      spinning = true; el.classList.add("spinning");
      status.textContent = "빙글빙글…";
      let v = speedOf(pull) * (0.92 + Math.random() * 0.16), last = performance.now(); // 같은 세기라도 조금씩 다르게
      const step = (now) => {
        if (dead) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        rot += v * dt; v = v * Math.exp(-DECAY * dt) - FRICTION * dt;
        canvas.style.transform = `rotate(${rot}deg)`;
        if (v > 4) { raf = requestAnimationFrame(step); return; }
        // 칸 경계에 딱 걸리면 칸 가운데 쪽으로 조금 민다
        const into = (((360 - (rot % 360)) % 360) + 360) % 360 % seg;
        if (into < 2 || into > seg - 2) { rot += into < 2 ? -(3 - into) : (into - seg + 3); canvas.style.transform = `rotate(${rot}deg)`; }
        spinning = false; el.classList.remove("spinning");
        const it = items[indexAt(rot, n)];
        status.textContent = "";
        if (onResult) onResult(it.id, rot % 360);
      };
      raf = requestAnimationFrame(step);
    }

    // ---- 줄 당기기 ----
    let drag = null;
    const setPull = (p) => { el.style.setProperty("--pull", p + "px"); };
    knob.addEventListener("pointerdown", (e) => {
      if (spinning) return;
      if (locked) { status.textContent = locked; return; }
      drag = { y: e.clientY, id: e.pointerId, pull: 0 };
      try { knob.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
      el.classList.add("pulling");
      e.preventDefault();
    });
    knob.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.pull = Math.max(0, Math.min(MAX_PULL, e.clientY - drag.y));
      setPull(drag.pull);
      status.textContent = drag.pull >= MAX_PULL ? "최고로 세게!" : drag.pull > MIN_PULL ? `세기 ${Math.round((drag.pull / MAX_PULL) * 100)}%` : "";
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = drag.pull; drag = null;
      el.classList.remove("pulling");
      setPull(0);
      spin(p);
    };
    knob.addEventListener("pointerup", release);
    knob.addEventListener("pointercancel", release);
    // 키보드: Enter/Space는 중간 세기로 돌린다
    knob.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !spinning) { e.preventDefault(); if (locked) status.textContent = locked; else spin(110 + Math.random() * 60); }
    });
    if (locked) status.textContent = locked;
    requestAnimationFrame(draw);
    const onResize = () => { if (!spinning) draw(); };
    window.addEventListener("resize", onResize);
    return { el, destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); } };
  }

  const api = { create, spinPlan, indexAt, speedOf, MAX_PULL, MIN_PULL };
  if (typeof module !== "undefined") module.exports = api;
  else window.Roulette = api;
})();
