// 화면과 상태. Android 앱의 MainActivity / AppViewModel / ui/* 를 옮긴 것.
(() => {
  const COLORS = { MATH: "--math", HANJA: "--hanja", ENGLISH_WORD: "--word", ENGLISH_TALK: "--talk", KOREAN: "--korean" };
  const AI = [["NONE", "사용 안 함"], ["CLAUDE", "Claude (Anthropic)"], ["OPENAI", "GPT (OpenAI)"]];

  // ---- 저장 (이 브라우저 안에만 저장. 막혀 있으면 메모리에만 둔다) ----
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sf." + k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem("sf." + k, JSON.stringify(v)); } catch { /* 저장 불가: 메모리만 */ } },
  };
  const settings = {
    get pin() { return store.get("pin", "0000"); }, set pin(v) { store.set("pin", v); },
    get name() { return store.get("name", "친구"); }, set name(v) { store.set("name", v); },
    get perSession() { return store.get("perSession", 10); }, set perSession(v) { store.set("perSession", v); },
    get autoLevel() { return store.get("autoLevel", false); }, set autoLevel(v) { store.set("autoLevel", v); },
    get ai() { return store.get("ai", "NONE"); }, set ai(v) { store.set("ai", v); },
    get relay() { return store.get("relay", ""); }, set relay(v) { store.set("relay", v); },
    get realtime() { return store.get("realtime", false); }, set realtime(v) { store.set("realtime", v); },
    /** 영어 회화 주제: { id } 또는 { custom }. 없으면 날마다 바뀌는 추천 주제 */
    /** 연결할 ChatGPT 주소 (빈 값이면 새 채팅). 맞춤 GPT, 프로젝트, 특정 채팅 주소 */
    /** 단어 시험 뒤 손으로 쓰기: "trace"(따라 쓰기) | "free"(혼자 쓰기) | "off" */
    get wordWrite() { return store.get("wordWrite", "trace"); }, set wordWrite(v) { store.set("wordWrite", v); },
    get talkLink() { return store.get("talkLink", ""); }, set talkLink(v) { store.set("talkLink", v); },
    /** 학생이 이 말을 하면 ChatGPT가 대화를 마무리한다 */
    get talkEnd() { return store.get("talkEnd", "Goodbye, teacher!"); }, set talkEnd(v) { store.set("talkEnd", v); },
    get talkTopic() { return store.get("talkTopic", null); }, set talkTopic(v) { store.set("talkTopic", v); },
    get penInput() { return store.get("penInput", true); }, set penInput(v) { store.set("penInput", v); },
    /** 학습 시간표 (schedule.js 참고) */
    get schedule() { return store.get("schedule", DEFAULT_SCHEDULE); }, set schedule(v) { store.set("schedule", v); },
    level(id) { const s = subjectById(id); return Math.min(Math.max(store.get("level." + id, 1), 1), s.levels.length); },
    setLevel(id, lv) { store.set("level." + id, lv); },
  };
  /** 관리자가 만든 영어 단어장: [{ id, name, words: [[영어, 뜻], ...] }] */
  const wordbooks = {
    all() { return store.get("wordbooks", []); },
    get(id) { return this.all().find((b) => b.id === id); },
    save(book) { const l = this.all().filter((b) => b.id !== book.id); store.set("wordbooks", [...l, book]); },
    remove(id) { store.set("wordbooks", this.all().filter((b) => b.id !== id)); },
  };
  const sessions = {
    all() { return store.get("sessions", []); },
    add(s) { store.set("sessions", [s, ...this.all()].slice(0, 200)); },
  };
  /** 오답 노트: 틀린 문제를 저장해 관리자가 본다. { id, at, subject, level, unit, q, given, fixed } */
  const wrongNotes = {
    all() { return store.get("wrongNotes", []); },
    add(list) { if (list.length) store.set("wrongNotes", [...list, ...this.all()].slice(0, 500)); },
    update(id, patch) { store.set("wrongNotes", this.all().map((n) => (n.id === id ? { ...n, ...patch } : n))); },
    remove(id) { store.set("wrongNotes", this.all().filter((n) => n.id !== id)); },
    clear() { store.set("wrongNotes", []); },
  };
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

  // ---- Android 앱 안에서 열렸을 때 쓰는 기능 (없으면 웹 버전) ----
  const native = window.StudyFriendApp || null;
  function nativeStatus() { try { return native ? JSON.parse(native.getStatus()) : null; } catch { return null; } }

  // ---- 영어 발음 (브라우저 내장 음성, 앱에서는 기기 음성) ----
  function speak(text) {
    if (native) { try { native.speak(text); } catch { /* 무시 */ } return; }
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 0.85;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith("en"));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* 음성 미지원 */ }
  }

  // ---- 작은 DOM 도우미 ----
  const app = document.getElementById("app");
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const colorOf = (id) => `var(${COLORS[id]})`;
  const HUB = { HANJA: "hanjaHub", MATH: "mathHub", ENGLISH_WORD: "wordHub", ENGLISH_TALK: "talk" };
  const hubOf = (id) => HUB[id] || "home";
  /** 수학 글자 속 분수(3/4)를 위아래로 쌓아 보여 준다 */
  function mathText(text) {
    const parts = String(text).split(/(\d+\/\d+)/);
    if (parts.length === 1) return text;
    return parts.filter((p) => p !== "").map((p) => {
      const m = /^(\d+)\/(\d+)$/.exec(p);
      return m ? h("span", { class: "frac", role: "math", "aria-label": `${m[2]}분의 ${m[1]}` }, h("span", { class: "num" }, m[1]), h("span", { class: "den" }, m[2])) : p;
    });
  }

  // ---- 상태 ----
  let screen = { name: "home" };
  function go(next) {
    if (writer) { try { writer.cancelQuiz(); } catch { /* 무시 */ } writer = null; }
    if (brush) { brush.destroy(); brush = null; }
    screen = next; render(); window.scrollTo(0, 0);
  }

  function startQuiz(id, opts = {}) {
    const lv = settings.level(id);
    if (opts.bookId) { const b = wordbooks.get(opts.bookId); if (!b) return go({ name: "wordHub" }); opts = { ...opts, book: b.words, bookName: b.name }; }
    go({ name: "quiz", q: { subject: id, level: lv, unit: opts.unit || null, bookId: opts.bookId || null, bookName: opts.bookName || null, questions: makeSession(id, lv, settings.perSession, opts), index: 0, answers: [], answered: null, selected: null, input: "", pen: [], penText: "", phase: "answer", startedAt: Date.now() } });
    const first = screen.q.questions[0];
    if (first.speak && first.big === first.speak) speak(first.speak);
  }

  /** 단어 시험 뒤 손으로 쓰기를 할 문제들 */
  const writeList = (s) => (settings.wordWrite !== "off" && typeof WordWriter === "function" ? s.questions.filter((q) => q.write) : []);
  const clearInput = (s) => { s.answered = null; s.selected = null; s.input = ""; s.wordPad = null; s.writeOk = false; s.writeTries = 0; s.pen = []; s.penText = ""; };

  /** 답을 고르면 맞았는지 알려 주지 않고 다음 문제로 간다. 다시 풀기에서는 바로 알려 준다 */
  function answer(choice) {
    const s = screen.q;
    if (s.retry) {
      if (s.answered !== null) return;
      s.answered = choice;
      const q = s.questions[0];
      if (normalize(choice) === normalize(q.answer)) {
        s.retry.item.fixed = true;
        if (s.retry.item.noteId) wrongNotes.update(s.retry.item.noteId, { fixed: Date.now() });
      } else s.retry.tries++;
      return render();
    }
    s.answers[s.index] = choice;
    if (s.index < s.questions.length - 1) {
      s.index++; clearInput(s); render(); window.scrollTo(0, 0);
      const q = s.questions[s.index];
      if (q.speak && q.big === q.speak) speak(q.speak);
      return;
    }
    if (writeList(s).length) { s.phase = "write"; s.wIndex = 0; clearInput(s); render(); window.scrollTo(0, 0); return; }
    finish();
  }

  /** 단어 쓰기 다음 칸으로, 다 쓰면 결과 */
  function nextWrite() {
    const s = screen.q;
    if (s.wIndex < writeList(s).length - 1) { s.wIndex++; clearInput(s); render(); window.scrollTo(0, 0); return; }
    finish();
  }

  function finish() {
    const s = screen.q, subject = subjectById(s.subject), total = s.questions.length;
    const items = s.questions.map((q, i) => ({ n: i + 1, q, given: s.answers[i], ok: normalize(s.answers[i]) === normalize(q.answer) }));
    const correct = items.filter((x) => x.ok).length;
    let change = 0;
    if (settings.autoLevel) {
      change = levelChange(total ? correct / total : 0, s.level, subject.levels.length);
      if (change) settings.setLevel(s.subject, s.level + change);
    }
    const unitName = s.bookName || (s.unit && typeof mathUnitName === "function" ? mathUnitName(s.level, s.unit) : null);
    const wrongItems = items.filter((x) => !x.ok);
    const now = Date.now();
    wrongItems.forEach((x, i) => { x.noteId = `${now}-${i}`; });
    wrongNotes.add(wrongItems.map((x) => ({ id: x.noteId, at: now, subject: s.subject, level: s.level, unit: unitName, q: x.q, given: x.given, fixed: null })));
    const wrong = wrongItems.map((x) => `${x.q.big ?? x.q.prompt} → 정답: ${x.q.answer} (고른 답: ${x.given})`);
    sessions.add({ id: now, subject: s.subject, level: s.level, unit: unitName, total, correct, startedAt: s.startedAt,
      durationSec: Math.round((now - s.startedAt) / 1000), wrong });
    go({ name: "result", r: { subject: s.subject, level: s.level, unitId: s.unit, bookId: s.bookId, unit: unitName, total, correct, items, change } });
  }

  /** 결과 화면에서 틀린 문제 하나를 다시 푼다 */
  function retry(r, item) {
    go({ name: "quiz", q: { subject: r.subject, level: r.level, questions: [item.q], index: 0, answers: [], answered: null, selected: null, input: "", pen: [], penText: "", phase: "answer",
      retry: { r, item, tries: 0 }, startedAt: Date.now() } });
    if (item.q.speak && item.q.big === item.q.speak) speak(item.q.speak);
  }

  // ---- 화면 ----
  function Home() {
    const today = sessions.all().filter((x) => x.startedAt >= startOfToday());
    const right = today.reduce((a, x) => a + x.correct, 0), total = today.reduce((a, x) => a + x.total, 0);
    return [
      studyBanner(),
      h("div", { class: "row hello" },
        h("div", { class: "grow" },
          h("h1", {}, `${settings.name}, 안녕!`),
          h("div", { class: "muted" }, today.length === 0 ? "오늘은 아직 공부를 시작하지 않았어요. 과목을 골라 볼까요?"
            : `오늘 ${today.length}번 공부했어요 · ${total}문제 중 ${right}개 정답`)),
        h("button", { class: "icon-btn", "aria-label": "관리자 모드", onclick: () => go({ name: "pin" }) }, "⚙ 관리자")),
      h("div", { class: "subjects" }, SUBJECTS.map((s) => {
        const done = today.filter((x) => x.subject === s.id).length;
        return h("button", { class: "subject", style: `--c:${colorOf(s.id)}`, onclick: () => (HUB[s.id] ? go({ name: HUB[s.id] }) : startQuiz(s.id)) },
          h("span", { class: "mark", "aria-hidden": "true" }, s.mark),
          h("span", {}, h("div", { class: "name" }, s.title),
            h("div", { class: "lv" }, levelLabel(s, settings.level(s.id)) + (done ? ` · 오늘 ${done}회 ✔` : ""))));
      })),
      studyCard(),
      native ? null : h("p", { class: "note" }, "웹 테스트 버전이에요. 학습 기록은 이 브라우저에만 저장돼요. 정해진 시간 자동 실행·화면 잠금은 Android 앱에서만 동작해요."),
    ];
  }

  // ---- 학습 시간 (시간표 안일 때 오늘의 과제) ----
  const hm = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  function studyNow() {
    const sc = settings.schedule, slot = activeSlot(sc);
    if (!slot) return null;
    return { slot, ...taskProgress(sc, sessions.all(), slot.start) };
  }
  let reportedKey = null;
  /** 과제를 다 했으면 앱에 알려 잠금을 푼다 (시간 칸마다 한 번) */
  function syncStudy() {
    if (!native) return;
    const st = studyNow();
    if (st && st.complete && reportedKey !== st.slot.key) {
      try { if (native.studyComplete(st.slot.key)) reportedKey = st.slot.key; } catch { /* 무시 */ }
    }
  }
  function studyBanner() {
    const st = studyNow();
    if (!st) return null;
    const left = st.items.filter((i) => i.done < i.need).length;
    return h("div", { class: "study-banner" + (st.complete ? " done" : "") },
      st.complete ? "오늘의 과제를 다 했어요! 이제 쉬어도 좋아요 🎉"
        : `공부 시간이에요 (${hm(st.slot.start)}~${hm(st.slot.end)}) · 남은 과제 ${left}개` + (native ? " · 다 하면 잠금이 풀려요" : ""));
  }
  function studyCard() {
    const st = studyNow();
    if (!st) return null;
    return h("section", { class: "study-card", "aria-label": "오늘의 과제" },
      h("h2", {}, "오늘의 과제"),
      h("div", { class: "tasks" }, st.items.map((i) => {
        const s = subjectById(i.id), ok = i.done >= i.need;
        return h("button", { class: "task" + (ok ? " ok" : ""), style: `--c:${colorOf(i.id)}`, onclick: () => (HUB[i.id] ? go({ name: HUB[i.id] }) : startQuiz(i.id)) },
          h("span", { class: "mark", "aria-hidden": "true" }, ok ? "✔" : s.mark),
          h("span", { class: "grow" }, s.title),
          h("span", { class: "count" }, `${i.done} / ${i.need}회`));
      })),
      h("p", { class: "muted" }, "과목마다 정해진 횟수만큼 끝까지 풀면 과제가 채워져요."));
  }
  /** 앱이 잠금 상태가 바뀌었다고 알려 줄 때 (처음 화면·관리자 화면만 다시 그림) */
  window.onStudyLock = () => { if (screen.name === "home" || screen.name === "admin") render(); };
  /** 기기의 뒤로 버튼: 처음 화면이 아니면 처음으로. 문제 푸는 중에는 무시 */
  window.sfBack = () => {
    if (screen.name === "home") return false;
    if (screen.name !== "quiz") go({ name: screen.name === "learnChar" ? "learnList" : screen.name === "learnList" ? "hanjaHub" : "home" });
    return true;
  };

  /** 문제 내용 (문제 화면, 다시 풀기, 오답 노트에서 같이 쓴다) */
  function questionBody(subjectId, q) {
    const isHanjaBig = subjectId === "HANJA" && q.big && [...q.big].length === 1;
    const isMath = subjectId === "MATH";
    const tx = (t) => (isMath ? mathText(t) : t);
    const body = [];
    if (q.tag) body.push(h("span", { class: "qtag" }, q.tag));
    body.push(h("div", { class: "prompt" }, tx(q.prompt)));
    if (q.sentence) body.push(sentenceEl(q.sentence));
    if (q.stroke) body.push(strokeFigure(q.stroke.char, q.stroke.highlight, "exam"));
    if (q.figure && window.renderFigure) body.push(renderFigure(q.figure));
    if (q.big || q.speak) {
      body.push(h("div", { class: "big-wrap" },
        q.big ? h("div", { class: "big" + (isHanjaBig ? " hanja" : "") + (isMath && String(q.big).length > 14 ? " long" : ""), lang: isHanjaBig ? "zh-Hant" : null }, tx(q.big)) : null,
        q.speak ? h("button", { class: "speak", "aria-label": "발음 듣기", onclick: () => speak(q.speak) }, "🔊") : null));
    }
    return body;
  }

  function Quiz() {
    const s = screen.q, subject = subjectById(s.subject);
    const top = (count, done) => [
      h("div", { class: "quiz-top", style: `--c:${colorOf(s.subject)}` },
        h("button", { class: "icon-btn", "aria-label": s.retry ? "결과로 돌아가기" : "그만하기", onclick: () => (s.retry ? go({ name: "result", r: s.retry.r }) : go({ name: hubOf(s.subject) })) }, "✕"),
        h("div", { class: "title" }, s.retry ? `틀린 문제 다시 풀기 · ${s.retry.item.n}번` : `${subject.title} · ${levelLabel(subject, s.level)}`),
        h("div", { class: "count" }, count)),
      h("div", { class: "bar", style: `--c:${colorOf(s.subject)}` }, h("i", { style: `width:${done * 100}%` })),
    ];

    // 단어 쓰기 단계 (문제를 다 푼 뒤)
    if (s.phase === "write") {
      const list = writeList(s), q = list[s.wIndex];
      if (!s.wordPad) {
        s.wordPad = h("div", { class: "write-step" },
          h("strong", {}, "이 단어를 손으로 써 봐요: ", h("span", { lang: "en", class: "write-word" }, q.write),
            h("button", { class: "speak small-speak", "aria-label": "발음 듣기", onclick: () => speak(q.write) }, "🔊")),
          WordWriter({ word: q.write, guide: settings.wordWrite !== "free", onResult: (okW, tries) => { s.writeOk = okW; s.writeTries = tries; render(); } }));
      }
      const can = s.writeOk || s.writeTries >= 2;
      return [
        ...top(`쓰기 ${s.wIndex + 1} / ${list.length}`, (s.wIndex + (s.writeOk ? 1 : 0)) / list.length),
        h("div", { class: "stage", style: `--c:${colorOf(s.subject)}` }, h("span", { class: "qtag" }, "단어 쓰기"), s.wordPad),
        can ? h("button", { class: "next", style: `--c:${colorOf(s.subject)}`, onclick: nextWrite },
          (s.writeOk ? "" : "건너뛰고 ") + (s.wIndex === list.length - 1 ? "결과 보기" : "다음 단어")) : null,
      ];
    }

    const q = s.questions[s.index];
    const isHanjaChoice = s.subject === "HANJA" && q.choices && q.choices.every((c) => [...c].length === 1);
    const tx = (t) => (s.subject === "MATH" ? mathText(t) : t);
    const ok = s.answered !== null && normalize(s.answered) === normalize(q.answer);
    const showAnswer = s.retry && s.answered !== null && (ok || s.retry.tries >= 2);
    const body = questionBody(s.subject, q);
    if (q.choices) {
      body.push(h("div", { class: "choices", role: "radiogroup" }, q.choices.map((c) => {
        let cls = "choice" + (isHanjaChoice ? " hanja" : "");
        if (s.answered !== null) cls += showAnswer && c === q.answer ? " right" : c === s.answered ? (ok ? " right" : " wrong") : " dim";
        else if (s.selected === c) cls += " selected";
        return h("button", { class: cls, role: "radio", "aria-checked": String(s.selected === c), disabled: s.answered !== null,
          onclick: () => { s.selected = c; render(); } }, tx(c));
      })));
      if (s.answered === null) body.push(h("button", { class: "btn primary confirm", disabled: s.selected === null, onclick: () => { if (s.selected !== null) answer(s.selected); } }, s.retry ? "확인" : s.index === s.questions.length - 1 ? "답 내기" : "다음"));
    } else {
      body.push(...answerInput(s, q, ok));
    }
    // 다시 풀기에서만 바로 맞았는지 알려 준다
    if (s.retry && s.answered !== null) {
      body.push(h("div", { class: "feedback" },
        h("strong", { class: ok ? "ok" : "no" }, ok ? "정답이에요! 잘 고쳤어요" : showAnswer ? ["이번에도 아쉬워요. 정답은 ", tx(q.answer), q.unit && !q.choices ? q.unit : ""] : "아쉬워요. 한 번 더 풀어 볼까요?"),
        showAnswer && q.explain ? h("span", { class: "muted" }, tx(q.explain)) : null));
    }
    const actions = s.retry && s.answered !== null ? h("div", { class: "retry-actions" },
      !ok && !showAnswer ? h("button", { class: "btn primary", onclick: () => { clearInput(s); render(); } }, "다시 풀기") : null,
      h("button", { class: ok || showAnswer ? "next" : "btn", style: `--c:${colorOf(s.subject)}`, onclick: () => go({ name: "result", r: s.retry.r }) }, "결과로 돌아가기")) : null;
    return [
      ...top(s.retry ? "" : `${s.index + 1} / ${s.questions.length}`, s.retry ? (s.answered !== null ? 1 : 0) : s.index / s.questions.length),
      h("div", { class: "stage", style: `--c:${colorOf(s.subject)}` }, body),
      actions,
    ];
  }

  /** 직접 쓰는 답: 펜(손글씨) 또는 숫자 키패드 */
  function answerInput(s, q, ok) {
    const decimal = q.input === "decimal";
    const unit = q.unit ? h("span", { class: "unit" }, q.unit) : null;
    if (s.answered !== null) {
      return [h("div", { class: "entry " + (ok ? "right" : "wrong"), "aria-label": "입력한 답" }, s.answered, unit)];
    }
    const usePen = settings.penInput && typeof PenPad === "function";
    const modeBtn = h("button", { class: "mode-btn", onclick: () => { settings.penInput = !usePen; render(); } }, usePen ? "⌨ 키패드로 입력" : "✏ 펜으로 쓰기");
    if (usePen) {
      const read = h("span", { class: "pen-read" }, s.penText || "?");
      const okBtn = h("button", { class: "btn primary", disabled: !s.penText, onclick: () => { if (s.penText) answer(s.penText); } }, "확인");
      const pad = PenPad({
        strokes: s.pen, allowDecimal: decimal,
        onChange: (_, text) => { s.penText = text; read.textContent = text || "?"; okBtn.disabled = !text; },
      });
      return [
        h("div", { class: "entry pen-entry", "aria-live": "polite", "aria-label": "읽은 답" }, h("span", { class: "muted small" }, "읽은 답"), read, unit),
        pad,
        h("div", { class: "pen-actions" },
          h("button", { class: "btn", onclick: () => { s.pen.pop(); s.penText = PenRecognizer.recognize(s.pen, decimal); render(); } }, "↶ 한 획 지우기"),
          h("button", { class: "btn", onclick: () => { s.pen.length = 0; s.penText = ""; render(); } }, "다시 쓰기"),
          okBtn),
        h("p", { class: "muted small pen-tip" }, (decimal ? "소수점은 아래쪽에 작은 점(.)으로 찍어요. " : "") + "숫자를 한 글자씩 띄어서 크게 써요. 잘못 읽으면 다시 쓰거나 키패드를 써요."),
        modeBtn,
      ];
    }
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", decimal ? "." : "지우기", "0", decimal ? "⌫" : "확인"];
    if (decimal) keys.push("확인");
    return [
      h("div", { class: "entry", "aria-label": "입력한 답" }, s.input || "?", unit),
      h("div", { class: "pad" + (decimal ? " decimal" : "") }, keys.map((k) => h("button", {
        class: (k.length > 1 ? "small" : "") + (k === "확인" && decimal ? " wide" : "") || null,
        onclick: () => {
          if (k === "지우기" || k === "⌫") s.input = s.input.slice(0, -1);
          else if (k === "확인") { if (s.input) return answer(s.input); }
          else if (k === ".") { if (!s.input.includes(".") && s.input) s.input += "."; }
          else if (s.input.length < 7) s.input += k;
          render();
        },
      }, k))),
      modeBtn,
    ];
  }

  function Result() {
    const r = screen.r, subject = subjectById(r.subject);
    if (r.kind === "talk") {
      const min = Math.max(1, Math.round(r.durationSec / 60));
      return [h("div", { class: "result" },
        h("div", { class: "score" }, "👏"),
        h("h2", { style: "font-size:30px" }, "영어로 대화를 마쳤어요!"),
        h("div", { class: "muted" }, `주제: ${r.topic} · 약 ${min}분`),
        h("div", { class: "actions" }, h("button", { class: "btn primary", onclick: () => go({ name: "home" }) }, "처음으로")))];
    }
    const rate = r.total ? Math.floor((r.correct * 100) / r.total) : 0;
    return [h("div", { class: "result" },
      h("div", { class: "score" }, `${r.correct}/${r.total}`),
      h("h2", { style: "font-size:30px" }, rate >= 90 ? "아주 잘했어요!" : rate >= 70 ? "잘했어요!" : "조금만 더 힘내요!"),
      h("div", { class: "muted" }, `${r.unit ? r.unit + " · " : ""}정답률 ${rate}%`),
      r.subject === "HANJA" ? h("div", { class: "pass " + (rate >= 70 ? "ok" : "no") },
        `${levelLabel(subject, r.level)} 합격 기준 70% · ${rate >= 70 ? "합격이에요!" : "아직 불합격이에요"}`) : null,
      r.change === 1 ? h("div", { class: "lvup" }, `레벨 업! 다음부터 ${levelLabel(subject, r.level + 1)} 문제가 나와요`) : null,
      r.change === -1 ? h("div", { class: "lvdown" }, `다음에는 ${levelLabel(subject, r.level - 1)} 문제로 다시 연습해 봐요`) : null,
      resultList(r),
      h("div", { class: "actions" },
        h("button", { class: "btn", onclick: () => go({ name: hubOf(r.subject) }) }, HUB[r.subject] ? `${subject.title} 메뉴로` : "처음으로"),
        h("button", { class: "btn primary", onclick: () => startQuiz(r.subject, { unit: r.unitId, bookId: r.bookId }) }, "한 번 더")))];
  }

  /** 결과: 문제마다 ○/✕, 틀린 문제는 눌러서 다시 풀기 */
  function resultList(r) {
    if (!r.items) return null;
    const wrong = r.items.filter((x) => !x.ok), left = wrong.filter((x) => !x.fixed).length;
    const tx = (t) => (r.subject === "MATH" ? mathText(t) : t);
    return h("div", { class: "wronglist" },
      h("div", { class: "marks", "aria-label": "문제별 결과" }, r.items.map((x) => h("span", { class: "mark-cell " + (x.ok ? "o" : x.fixed ? "fixed" : "x"), title: `${x.n}번` }, h("small", {}, x.n), x.ok ? "○" : x.fixed ? "◎" : "✕"))),
      wrong.length ? [
        h("strong", {}, left ? `틀린 문제 ${left}개: 눌러서 다시 풀어 봐요` : "틀린 문제를 모두 다시 풀었어요! 👏"),
        h("div", { class: "retry-list" }, wrong.map((x) => h("button", { class: "retry-item" + (x.fixed ? " fixed" : ""), onclick: () => retry(r, x), disabled: !!x.fixed },
          h("span", { class: "no" }, `${x.n}번`),
          h("span", { class: "grow" }, h("span", { class: "q" }, tx(x.q.big ?? x.q.prompt)), x.q.big ? h("span", { class: "muted" }, x.q.prompt) : null),
          h("span", { class: "state" }, x.fixed ? "✔ 고쳤어요" : "다시 풀기 ›")))),
      ] : h("strong", {}, "모두 맞혔어요! 🎉"));
  }

  // ---- 한자: 획순 데이터 ----
  // 획순은 급수별 묶음 파일(strokes/levelN.json)에 들어 있다
  const bundleCache = {};
  function loadStrokes(ch) {
    const n = STROKE_FILE[ch];
    if (!n) return Promise.reject(new Error("획순 데이터 없음"));
    if (!bundleCache[n]) bundleCache[n] = fetch(`strokes/level${n}.json`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    return bundleCache[n].then((b) => b[ch]);
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  /** 획순 그림. mode "exam": 한 획만 진하게. mode "step": 앞의 획은 진하게, 이번 획은 강조색 */
  function strokeSvg(data, highlight, mode) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 1024 1024");
    svg.setAttribute("role", "img");
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("transform", "translate(0, 900) scale(1, -1)");
    data.strokes.forEach((d, i) => {
      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", d);
      let fill = "var(--stroke-faint)";
      if (mode === "exam") fill = i === highlight ? "var(--ink)" : "var(--stroke-faint)";
      else if (i < highlight) fill = "var(--ink)";
      else if (i === highlight) fill = "var(--hanja)";
      path.setAttribute("fill", fill);
      g.append(path);
    });
    svg.append(g);
    return svg;
  }
  function strokeFigure(ch, highlight, mode) {
    const box = h("div", { class: mode === "exam" ? "stroke-fig" : "stroke-step" });
    loadStrokes(ch).then((d) => box.replaceChildren(strokeSvg(d, highlight, mode))).catch(() => box.replaceChildren("획순 그림을 불러오지 못했어요"));
    return box;
  }
  function sentenceEl(text) {
    const parts = text.split(/\[|\]/);
    return h("div", { class: "sentence" }, parts.map((t, i) => (i % 2 ? h("u", { lang: "zh-Hant" }, t) : t)));
  }

  const learned = {
    all() { return new Set(store.get("learned", [])); },
    add(ch) { const s = this.all(); s.add(ch); store.set("learned", [...s]); },
  };

  function HanjaHub() {
    const subject = subjectById("HANJA");
    const total = CONTENT.hanja.flat().length, done = learned.all().size;
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "처음으로", onclick: () => go({ name: "home" }) }, "←"),
        h("h1", { style: "font-size:30px" }, "한자")),
      h("div", { class: "hub" },
        h("button", { class: "hub-card", style: `--c:${colorOf("HANJA")}`, onclick: () => go({ name: "learnList", lv: settings.level("HANJA") }) },
          h("span", { class: "mark", lang: "zh-Hant" }, "筆"),
          h("strong", {}, "획순 학습"),
          h("span", {}, "획순을 보고 손가락으로 따라 써요"),
          h("span", { class: "hub-meta" }, `${total}자 중 ${done}자 익힘`)),
        h("button", { class: "hub-card alt", onclick: () => startQuiz("HANJA") },
          h("span", { class: "mark", lang: "zh-Hant" }, "試"),
          h("strong", {}, "급수 문제 풀기"),
          h("span", {}, "훈음, 한자어 읽기, 반대자, 사자성어, 필순까지 시험처럼 풀어요"),
          h("span", { class: "hub-meta" }, `지금 ${levelLabel(subject, settings.level("HANJA"))} · 합격 기준 70%`))),
    ];
  }

  // ---- 영어 단어: 기본 단어 / 내 단어장 ----
  function WordHub() {
    const subject = subjectById("ENGLISH_WORD"), lv = settings.level("ENGLISH_WORD"), books = wordbooks.all();
    const writeLabel = { trace: "답을 맞힌 뒤 따라 쓰기", free: "답을 맞힌 뒤 혼자 쓰기", off: "쓰기 없음" }[settings.wordWrite];
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "처음으로", onclick: () => go({ name: "home" }) }, "←"),
        h("h1", { style: "font-size:30px" }, "영어 단어")),
      h("p", { class: "muted", style: "margin:0" }, `${writeLabel} · 단어장은 관리자 모드에서 만들어요.`),
      h("div", { class: "hub" },
        h("button", { class: "hub-card", style: `--c:${colorOf("ENGLISH_WORD")}`, onclick: () => startQuiz("ENGLISH_WORD") },
          h("span", { class: "mark" }, "ABC"), h("strong", {}, "기본 단어"),
          h("span", {}, "레벨에 맞는 단어로 시험 봐요"),
          h("span", { class: "hub-meta" }, `지금 ${levelLabel(subject, lv)}`)),
        books.map((b) => h("button", { class: "hub-card book", onclick: () => startQuiz("ENGLISH_WORD", { bookId: b.id }) },
          h("span", { class: "mark" }, "📒"), h("strong", {}, b.name),
          h("span", {}, b.words.slice(0, 4).map((w) => w[0]).join(", ") + (b.words.length > 4 ? " …" : "")),
          h("span", { class: "hub-meta" }, `${b.words.length}개 단어`)))),
      books.length ? null : h("p", { class: "note" }, "아직 만든 단어장이 없어요. 관리자 모드 > 영어 단어장에서 단어를 붙여 넣어 만들 수 있어요."),
    ];
  }

  // ---- 수학: 단원 고르기 ----
  function MathHub() {
    const subject = subjectById("MATH"), lv = settings.level("MATH");
    const all = sessions.all().filter((x) => x.subject === "MATH" && x.level === lv);
    const last = (name) => { const x = all.find((y) => y.unit === name); return x ? `지난번 ${x.correct}/${x.total}` : "아직 안 풀었어요"; };
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "처음으로", onclick: () => go({ name: "home" }) }, "←"),
        h("h1", { style: "font-size:30px" }, `수학 · ${levelLabel(subject, lv)}`)),
      h("p", { class: "muted", style: "margin:0" }, "풀고 싶은 단원을 골라요. 학년은 관리자 모드에서 정해요."),
      h("h2", { class: "sec" }, "단원별 문제"),
      h("div", { class: "units", style: `--c:${colorOf("MATH")}` }, MATH_UNITS[lv].map((u, i) =>
        h("button", { class: "unit-card", onclick: () => startQuiz("MATH", { unit: u.id }) },
          h("span", { class: "unit-no" }, `${i + 1}`),
          h("span", { class: "grow" }, h("strong", {}, u.name), h("span", { class: "unit-meta" }, last(u.name)))))),
      h("button", { class: "btn mix-btn", onclick: () => startQuiz("MATH", { unit: "mix" }) }, "모든 단원 섞어서 풀기"),
      h("h2", { class: "sec" }, "도전! 심화 문제"),
      h("div", { class: "hub" },
        h("button", { class: "hub-card", style: `--c:var(--talk)`, onclick: () => startQuiz("MATH", { unit: "think" }) },
          h("span", { class: "mark" }, "💡"), h("strong", {}, "사고력"),
          h("span", {}, "규칙 찾기, 거꾸로 생각하기, 수 카드처럼 생각을 깊게 하는 문제"),
          h("span", { class: "hub-meta" }, last("사고력"))),
        h("button", { class: "hub-card", style: `--c:var(--korean)`, onclick: () => startQuiz("MATH", { unit: "apply" }) },
          h("span", { class: "mark" }, "🧩"), h("strong", {}, "응용력"),
          h("span", {}, "여러 단계를 거쳐 푸는 생활 속 문장제"),
          h("span", { class: "hub-meta" }, last("응용력")))),
    ];
  }

  // ---- 영어 회화: 오늘의 주제로 ChatGPT와 대화 ----
  function todayTopic() {
    const t = settings.talkTopic;
    if (t && t.custom) return { en: t.custom, ko: "", phrases: [], set: true };
    if (t && t.id) { const f = TALK_TOPICS.find((x) => x.id === t.id); if (f) return { ...f, set: true }; }
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
    return { ...TALK_TOPICS[day % TALK_TOPICS.length], set: false };
  }
  const TALK_LEVEL = ["very easy words and very short sentences (absolute beginner)", "easy words and short sentences (beginner)", "simple everyday English (elementary level)"];
  /** 대화 규칙. 맞춤 GPT·프로젝트의 '지침'에 넣거나, 새 채팅이면 첫 메시지에 붙인다 */
  function talkRules(lv, end, withLevel = true) {
    return `You are a friendly English conversation partner for a Korean elementary school student. ` +
      (withLevel ? `Use ${TALK_LEVEL[lv - 1] || TALK_LEVEL[1]}. ` : `Use easy words and short sentences unless I ask for harder English. `) +
      `Talk about the topic I give you. Ask only one short question at a time and wait for my answer. If I make a mistake, gently show the correct sentence and keep going. ` +
      `If I write in Korean or say I don't know, give a short hint in Korean and ask again in English. Praise me often. ` +
      `When I say "${end}", end the lesson: give me a short review with 3 useful expressions I practiced and their Korean meanings, then say goodbye and do not ask any more questions. ` +
      `If I keep talking after that, kindly tell me in Korean that today's conversation is finished and I should go back to the study app. ` +
      `After about 15 turns, remind me that I can say "${end}" to finish.`;
  }
  function talkTopicLine(t, lv) {
    const phrases = t.phrases.length ? ` Try to use these expressions: ${t.phrases.map((p) => p[0].replace(/[.!?]$/, "")).join(" / ")}.` : "";
    return `Today's topic: "${t.en}"${t.ko ? ` (${t.ko})` : ""}. My level: ${["beginner", "elementary", "intermediate"][lv - 1] || "elementary"}.${phrases} Let's start! Greet me and ask the first question.`;
  }
  /** 연결 주소가 있으면 주제만 보내고(규칙은 그쪽 지침에), 없으면 규칙까지 함께 보낸다 */
  function talkPrompt(t, lv) {
    return settings.talkLink ? talkTopicLine(t, lv) : `${talkRules(lv, settings.talkEnd)} ${talkTopicLine(t, lv)}`;
  }
  function talkUrl(prompt) {
    const base = settings.talkLink || "https://chatgpt.com/";
    // 특정 채팅(/c/...)은 이어서 쓰는 곳이라 문장을 넣지 않는다 (붙여 넣기용으로 복사만)
    if (/\/c\//.test(base)) return base;
    return base + (base.includes("?") ? "&" : "?") + "q=" + encodeURIComponent(prompt);
  }
  function copyText(text) { if (native) { try { native.copy(text); } catch { /* 무시 */ } return; } try { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); } catch { /* 복사 불가 */ } }
  function Talk() {
    const subject = subjectById("ENGLISH_TALK"), lv = settings.level("ENGLISH_TALK"), t = todayTopic();
    const prompt = talkPrompt(t, lv), url = talkUrl(prompt), end = settings.talkEnd;
    const pasteMode = /\/c\//.test(settings.talkLink);
    const started = screen.startedAt;
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "처음으로", onclick: () => go({ name: "home" }) }, "←"),
        h("h1", { style: "font-size:30px" }, `영어 회화 · ${levelLabel(subject, lv)}`)),
      h("div", { class: "talk-card", style: `--c:${colorOf("ENGLISH_TALK")}` },
        h("span", { class: "qtag" }, t.set ? "오늘의 대화 주제" : "오늘의 추천 주제"),
        h("h2", { lang: "en" }, t.en), t.ko ? h("div", { class: "muted" }, t.ko) : null,
        t.phrases.length ? h("ul", { class: "phrases" }, t.phrases.map(([en, ko]) => h("li", {},
          h("button", { class: "speak small-speak", "aria-label": "발음 듣기", onclick: () => speak(en.replace(/\.\.\./g, "")) }, "🔊"),
          h("span", {}, h("b", { lang: "en" }, en), h("span", { class: "muted" }, ko))))) : null),
      h("div", { class: "end-phrase" },
        h("span", {}, "대화를 끝낼 때는 이렇게 말해요"),
        h("b", { lang: "en" }, end),
        h("button", { class: "speak small-speak", "aria-label": "발음 듣기", onclick: () => speak(end) }, "🔊")),
      h("ol", { class: "talk-steps muted" },
        h("li", {}, pasteMode ? "아래 버튼을 누르면 우리 대화방이 열려요. 입력칸을 길게 눌러 붙여 넣기 하면 오늘 주제가 들어가요." : "아래 버튼을 누르면 ChatGPT가 열리고 오늘 주제로 대화가 시작돼요."),
        h("li", {}, "ChatGPT 화면의 음성 버튼을 누르면 말로 대화할 수 있어요."),
        h("li", {}, `"${end}"라고 말하면 ChatGPT가 정리해 주고 대화가 끝나요. 그다음 이 화면으로 돌아와 '대화를 마쳤어요'를 눌러요.`)),
      h("a", { class: "btn primary talk-go", href: url, target: "_blank", rel: "noopener noreferrer",
        onclick: () => { copyText(prompt); if (!screen.startedAt) { screen.startedAt = Date.now(); setTimeout(render, 0); } } }, "ChatGPT로 대화 시작"),
      started ? h("button", { class: "btn talk-done", onclick: () => {
        const durationSec = Math.round((Date.now() - started) / 1000);
        sessions.add({ id: Date.now(), subject: "ENGLISH_TALK", kind: "talk", level: lv, unit: t.en, total: 0, correct: 0, startedAt: started, durationSec, wrong: [] });
        go({ name: "result", r: { subject: "ENGLISH_TALK", kind: "talk", topic: t.en, durationSec } });
      } }, "대화를 마쳤어요") : null,
      h("details", { class: "talk-help" }, h("summary", {}, "ChatGPT가 열리지 않으면"),
        h("p", { class: "muted" }, "시작 문장을 복사해서 ChatGPT 앱에 붙여 넣어 주세요. 버튼을 누를 때 자동으로 복사돼요."),
        h("textarea", { readonly: true, rows: "5", "aria-label": "시작 문장" }, prompt),
        h("button", { class: "btn", onclick: (e) => { copyText(prompt); e.target.textContent = "복사했어요"; } }, "시작 문장 복사")),
    ];
  }

  function LearnList() {
    const lv = screen.lv, list = CONTENT.hanja[lv - 1], done = learned.all();
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "한자 메뉴로", onclick: () => go({ name: "hanjaHub" }) }, "←"),
        h("h1", { style: "font-size:28px" }, "획순 학습")),
      h("div", { class: "chips" }, HANJA_LEVEL_NAMES.map((name, i) => h("button", { class: "chip", "aria-pressed": String(lv === i + 1),
        onclick: () => go({ name: "learnList", lv: i + 1 }) }, `${name} (${CONTENT.hanja[i].filter(([c]) => done.has(c)).length}/${CONTENT.hanja[i].length})`))),
      h("div", { class: "char-grid" }, list.map(([c, m], i) => h("button", { class: "char-tile" + (done.has(c) ? " done" : ""),
        onclick: () => go({ name: "learnChar", lv, index: i }) },
        h("span", { class: "c", lang: "zh-Hant" }, c), h("span", { class: "m" }, m)))),
    ];
  }

  let writer = null, brush = null;
  function LearnChar() {
    const { lv, index } = screen;
    const list = CONTENT.hanja[lv - 1];
    const [ch, meaning] = list[index];
    const count = STROKE_COUNTS[ch];
    const words = HANJA_EXAM.words.flat().filter((w) => w[0].includes(ch)).slice(0, 4);
    const status = h("div", { class: "write-status", "aria-live": "polite" }, count ? "획순 보기를 눌러 쓰는 순서를 먼저 봐요." : "");
    const stage = h("div", { class: "writer", id: "writer" });
    const move = (d) => go({ name: "learnChar", lv, index: (index + d + list.length) % list.length });
    const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    function startWriter() {
      writer = null;
      if (!count || typeof HanziWriter === "undefined") return;
      const size = Math.min(320, stage.clientWidth || 320);
      writer = HanziWriter.create(stage, ch, {
        width: size, height: size, padding: 12, showOutline: true, showCharacter: true,
        strokeAnimationSpeed: 0.9, delayBetweenStrokes: 350,
        strokeColor: color("--ink"), outlineColor: color("--stroke-faint"), radicalColor: null,
        highlightColor: color("--hanja"), drawingColor: color("--hanja"), drawingWidth: 22,
        charDataLoader: (c, ok, err) => loadStrokes(c).then(ok).catch(err),
      });
      if (typeof attachBrush === "function") brush = attachBrush(stage);
    }
    /** 붓펜으로 쓸 때: Hanzi Writer가 그리는 선은 감추고, 맞은 획은 흐린 색으로만 보여 준다 */
    function brushMode(on) {
      if (!writer) return;
      writer.updateColor("drawingColor", on ? "rgba(0,0,0,0)" : color("--hanja"));
      writer.updateColor("strokeColor", on ? color("--fig-line") : color("--ink"));
      if (brush) brush.clear();
    }
    function quiz(withOutline) {
      if (!writer) return;
      let mistakes = 0;
      writer.cancelQuiz();
      brushMode(!!brush);
      writer.hideCharacter();
      withOutline ? writer.showOutline() : writer.hideOutline();
      status.textContent = withOutline ? "회색 글자 위에 1번 획부터 순서대로 써 보세요." : "보지 않고 1번 획부터 순서대로 써 보세요.";
      writer.quiz({
        showHintAfterMisses: withOutline ? 2 : 3,
        leniency: 1.2,
        onMistake: () => { if (brush) brush.discard(); mistakes++; status.textContent = "순서나 방향이 달라요. 다시 써 볼까요?"; },
        onCorrectStroke: (d) => { if (brush) brush.commit(); status.textContent = `${d.strokeNum + 1}번째 획 좋아요! (${d.strokeNum + 1}/${count})`; },
        onComplete: (d) => {
          const miss = d.totalMistakes;
          status.textContent = miss === 0 ? "완벽해요! 한 번도 틀리지 않았어요." : `다 썼어요! 틀린 횟수 ${miss}번`;
          if (!withOutline && miss <= 2) { learned.add(ch); status.textContent += " · 익힌 한자로 표시했어요 ✔"; }
          writer.showOutline();
        },
      });
    }
    requestAnimationFrame(startWriter);

    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "목록으로", onclick: () => go({ name: "learnList", lv }) }, "←"),
        h("h1", { class: "grow", style: "font-size:26px" }, `${HANJA_LEVEL_NAMES[lv - 1]} ${index + 1} / ${list.length}`),
        h("button", { class: "icon-btn", "aria-label": "이전 한자", onclick: () => move(-1) }, "‹"),
        h("button", { class: "icon-btn", "aria-label": "다음 한자", onclick: () => move(1) }, "›")),
      h("div", { class: "learn" },
        h("div", { class: "learn-left" },
          count ? stage : h("div", { class: "writer nodata", lang: "zh-Hant" }, ch),
          status,
          count ? h("div", { class: "actions" },
            h("button", { class: "btn", onclick: () => { if (!writer) return; writer.cancelQuiz(); brushMode(false); writer.showCharacter(); writer.showOutline(); status.textContent = "쓰는 순서를 잘 봐요."; writer.animateCharacter({ onComplete: () => (status.textContent = "이제 따라 써 볼까요?") }); } }, "획순 보기"),
            h("button", { class: "btn", onclick: () => quiz(true) }, "따라 쓰기"),
            h("button", { class: "btn primary", onclick: () => quiz(false) }, "혼자 쓰기"))
            : h("p", { class: "muted" }, "이 한자는 아직 획순 데이터가 없어요.")),
        h("div", { class: "learn-right" },
          h("div", { class: "meaning" }, meaning),
          h("div", { class: "muted" }, count ? `총 ${count}획` : ""),
          STROKE_ALT.includes(ch) ? h("p", { class: "note", style: "margin:0" }, "이 글자의 획순 그림은 한국 표준 글씨와 모양이 조금 달라요. 획순은 참고용으로 봐 주세요.") : null,
          count ? h("div", { class: "steps", "aria-label": "획순 차례" }, Array.from({ length: count }, (_, i) =>
            h("figure", {}, strokeFigure(ch, i, "step"), h("figcaption", {}, String(i + 1))))) : null,
          words.length ? h("div", { class: "examples" }, h("strong", {}, "이 한자가 들어간 말"),
            h("ul", {}, words.map(([w, r, m]) => h("li", {}, h("span", { lang: "zh-Hant", class: "ew" }, w), ` ${r} · ${m}`)))) : null)),
    ];
  }

  let pinInput = "", pinError = false;
  function Pin() {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "지우기", "0", "확인"];
    return [h("div", { class: "pin" },
      h("h1", { style: "font-size:30px" }, "관리자 비밀번호"),
      settings.pin === "0000" ? h("div", { class: "muted" }, "처음 비밀번호는 0000 이에요. 들어가서 꼭 바꿔 주세요.") : null,
      h("div", { class: "dots", "aria-label": `${pinInput.length}자리 입력됨` }, pinInput ? "●".repeat(pinInput.length) : "· · · ·"),
      pinError ? h("div", { style: "color:var(--bad)" }, "비밀번호가 틀렸어요") : null,
      h("div", { class: "pad" }, keys.map((k) => h("button", { class: k.length > 1 ? "small" : null, onclick: () => {
        pinError = false;
        if (k === "지우기") pinInput = pinInput.slice(0, -1);
        else if (k === "확인") {
          if (pinInput === settings.pin) { pinInput = ""; return go({ name: "admin", tab: 0 }); }
          pinError = true; pinInput = "";
        } else if (pinInput.length < 8) pinInput += k;
        render();
      } }, k))),
      h("button", { class: "btn", onclick: () => { pinInput = ""; go({ name: "home" }); } }, "돌아가기"))];
  }

  let adminMsg = "";
  /** 관리자가 레벨을 정할 때 참고: 지금 레벨에서 최근 5번 정답률 */
  function recentRate(id) {
    const lv = settings.level(id), l = sessions.all().filter((x) => x.subject === id && x.level === lv && x.total).slice(0, 5);
    if (!l.length) return "";
    const t = l.reduce((a, x) => a + x.total, 0), c = l.reduce((a, x) => a + x.correct, 0);
    return `지금 레벨 최근 ${l.length}회 정답률 ${Math.floor((c * 100) / t)}%`;
  }

  /** 관리자: 오답 노트 (과목별로 보고, 지우기) */
  function WrongNotesView() {
    const all = wrongNotes.all();
    if (!all.length) return h("p", {}, "아직 틀린 문제가 없어요. 문제를 풀고 틀리면 여기에 모여요.");
    const f = screen.noteFilter, list = f ? all.filter((n) => n.subject === f) : all;
    const fmt = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
    const left = all.filter((n) => !n.fixed).length;
    return h("div", { class: "section" },
      h("p", { class: "muted", style: "margin:0" }, `모두 ${all.length}문제 · 아직 다시 풀어 맞히지 못한 문제 ${left}개. 결과 화면에서 다시 풀어 맞히면 '고침'으로 바뀌어요.`),
      h("div", { class: "chips" },
        h("button", { class: "chip", "aria-pressed": String(!f), onclick: () => { screen.noteFilter = null; render(); } }, `전체 ${all.length}`),
        SUBJECTS.filter((x) => all.some((n) => n.subject === x.id)).map((x) => h("button", { class: "chip", "aria-pressed": String(f === x.id), onclick: () => { screen.noteFilter = x.id; render(); } },
          `${x.title} ${all.filter((n) => n.subject === x.id).length}`))),
      h("div", { class: "notes" }, list.map((n) => {
        const sub = subjectById(n.subject), tx = (t) => (n.subject === "MATH" ? mathText(t) : t);
        return h("details", { class: "note-item" + (n.fixed ? " fixed" : "") },
          h("summary", {},
            h("span", { class: "tagc", style: `--c:${colorOf(n.subject)}` }, sub.title),
            h("span", { class: "grow q" }, tx(n.q.big ?? n.q.prompt)),
            h("span", { class: "state" }, n.fixed ? "✔ 고침" : "✕")),
          h("div", { class: "note-body" },
            h("div", { class: "muted" }, `${fmt.format(new Date(n.at))} · ${levelLabel(sub, n.level)}${n.unit ? " · " + n.unit : ""}`),
            h("div", { class: "stage mini", style: `--c:${colorOf(n.subject)}` }, questionBody(n.subject, n.q),
              n.q.choices ? h("div", { class: "muted" }, "보기: ", n.q.choices.flatMap((c, i) => [i ? ", " : "", tx(c)]).flat()) : null),
            h("div", {}, "아이가 쓴 답: ", h("b", { class: "bad" }, n.given === undefined ? "(없음)" : tx(n.given)), "  ·  정답: ", h("b", { class: "good" }, tx(n.q.answer), n.q.unit && !n.q.choices ? n.q.unit : "")),
            n.q.explain ? h("div", { class: "muted" }, tx(n.q.explain)) : null,
            h("button", { class: "btn small-btn", onclick: () => { wrongNotes.remove(n.id); adminMsg = "한 문제를 지웠어요"; render(); } }, "이 문제 지우기")));
      })),
      h("button", { class: "btn", onclick: () => {
        if (!screen.confirmClear) { screen.confirmClear = true; adminMsg = "오답 노트를 모두 지우려면 한 번 더 눌러요"; return render(); }
        screen.confirmClear = false; wrongNotes.clear(); adminMsg = "오답 노트를 모두 지웠어요"; render();
      } }, screen.confirmClear ? "한 번 더 눌러 모두 지우기" : "오답 노트 모두 지우기"));
  }

  /** 관리자: 저장된 연습장 그림 */
  function NotepadGallery() {
    const box = h("div", { class: "section" }, h("p", { class: "muted" }, "불러오는 중…"));
    if (!window.Notepad) return box;
    Notepad.list().then((items) => {
      const fmt = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
      box.replaceChildren(
        h("p", { class: "muted", style: "margin:0" }, "'새 종이'를 누르거나 앱을 닫을 때 연습장이 그림으로 저장돼요. 최근 60장까지 보관해요." + (native ? " 태블릿 갤러리의 '공부친구' 앨범에도 저장돼요." : "")),
        items.length ? h("div", { class: "pad-gallery" }, items.map((it) => {
          const url = URL.createObjectURL(it.blob);
          return h("figure", {},
            h("a", { href: url, target: "_blank", rel: "noopener", "aria-label": "크게 보기" }, h("img", { src: url, alt: `연습장 ${fmt.format(new Date(it.at))}`, loading: "lazy" })),
            h("figcaption", {}, h("span", { class: "grow" }, fmt.format(new Date(it.at))),
              h("a", { class: "btn small-btn", href: url, download: `연습장-${it.id}.png` }, "받기"),
              h("button", { class: "btn small-btn", "aria-label": "지우기", onclick: () => Notepad.remove(it.id).then(render) }, "✕")));
        })) : h("p", {}, "아직 저장된 연습장이 없어요."));
    }).catch(() => box.replaceChildren(h("p", {}, "저장된 연습장을 불러오지 못했어요.")));
    return box;
  }

  /** 관리자: 학습 시간표 · 오늘의 과제 · 잠금 */
  function ScheduleEditor(toggle) {
    if (!screen.sched) screen.sched = JSON.parse(JSON.stringify(settings.schedule));
    const d = screen.sched, st = nativeStatus();
    const save = () => {
      const err = d.enabled ? checkSchedule(d) : null;
      if (err) { adminMsg = err; return render(); }
      settings.schedule = JSON.parse(JSON.stringify(d));
      if (native) { try { native.setSchedule(JSON.stringify(d)); } catch { /* 무시 */ } }
      adminMsg = d.enabled ? "시간표를 저장했어요" : "시간표를 껐어요";
      render();
    };
    const slotRow = (x, i) => h("div", { class: "slot" },
      h("div", { class: "chips", role: "group", "aria-label": `${i + 1}번 시간 요일` }, [1, 2, 3, 4, 5, 6, 7].map((n) =>
        h("button", { class: "chip day", "aria-pressed": String(x.days.includes(n)), onclick: () => {
          x.days = x.days.includes(n) ? x.days.filter((v) => v !== n) : [...x.days, n].sort(); render();
        } }, DAY_NAMES[n]))),
      h("div", { class: "row slot-time" },
        h("input", { type: "time", value: x.start, "aria-label": `${i + 1}번 시작 시각`, onchange: (e) => { x.start = e.target.value || x.start; } }),
        h("span", {}, "부터"),
        h("input", { type: "time", value: x.end, "aria-label": `${i + 1}번 끝 시각`, onchange: (e) => { x.end = e.target.value || x.end; } }),
        h("span", {}, "까지"),
        d.slots.length > 1 ? h("button", { class: "btn small-btn slot-del", "aria-label": `${i + 1}번 시간 지우기`, onclick: () => { d.slots.splice(i, 1); render(); } }, "✕") : null));
    // 요일별 과제: 처음이면 공통 과제를 모든 요일에 복사해 둔다
    if (!d.tasksByDay) { d.tasksByDay = {}; for (let k = 1; k <= 7; k++) d.tasksByDay[k] = { ...d.tasks }; }
    const usedDays = new Set(d.slots.flatMap((x) => x.days));
    if (!screen.taskDay) screen.taskDay = usedDays.has(isoDay(new Date())) ? isoDay(new Date()) : [...usedDays].sort()[0] || 1;
    const day = screen.taskDay, dayTasks = d.tasksByDay[day];
    const sumOf = (k) => Object.values(d.tasksByDay[k] || {}).reduce((a, n) => a + n, 0);
    const dayMenu = h("div", { class: "day-menu", role: "tablist", "aria-orientation": "vertical", "aria-label": "과제 요일" }, [1, 2, 3, 4, 5, 6, 7].map((k) =>
      h("button", { class: "day-tab" + (usedDays.has(k) ? "" : " off"), role: "tab", "aria-selected": String(k === day), onclick: () => { screen.taskDay = k; render(); } },
        h("span", { class: "dn" }, DAY_NAMES[k]), h("span", { class: "sum" }, usedDays.has(k) ? (sumOf(k) ? `${sumOf(k)}회` : "없음") : "쉬는 날"))));
    const taskRows = SUBJECTS.map((s) => {
      const n = dayTasks[s.id] || 0;
      const set = (v) => { dayTasks[s.id] = Math.max(0, Math.min(5, v)); render(); };
      return h("div", { class: "task-set" },
        h("span", { class: "grow" }, s.title),
        h("button", { class: "btn small-btn", "aria-label": `${DAY_NAMES[day]}요일 ${s.title} 줄이기`, disabled: n <= 0, onclick: () => set(n - 1) }, "−"),
        h("b", { class: "n", "aria-live": "polite" }, n ? `${n}회` : "없음"),
        h("button", { class: "btn small-btn", "aria-label": `${DAY_NAMES[day]}요일 ${s.title} 늘리기`, disabled: n >= 5, onclick: () => set(n + 1) }, "+"));
    });
    const tasks = h("div", { class: "day-tasks" }, dayMenu,
      h("div", { class: "day-panel", role: "tabpanel", "aria-label": `${DAY_NAMES[day]}요일 과제` },
        h("div", { class: "day-title" }, h("strong", { class: "grow" }, `${DAY_NAMES[day]}요일 과제`),
          usedDays.has(day) ? null : h("span", { class: "muted small" }, "이 요일에는 학습 시간이 없어요")),
        taskRows,
        h("button", { class: "btn small-btn copy-days", onclick: () => {
          for (let k = 1; k <= 7; k++) if (k !== day) d.tasksByDay[k] = { ...dayTasks };
          adminMsg = `${DAY_NAMES[day]}요일 과제를 모든 요일에 똑같이 넣었어요. 저장을 눌러 주세요`; render();
        } }, "이 과제를 모든 요일에 똑같이")));
    const device = !st ? h("p", { class: "muted" }, "지금은 웹 버전이라 시간표와 과제만 보여 줘요. 정해진 시간에 앱이 켜지고 다른 앱을 막는 것은 Android 앱에서만 돼요.")
      : h("div", { class: "device" },
        h("div", {}, st.deviceOwner ? "✔ 기기 관리자: 정해진 시간에 앱이 저절로 켜지고 다른 앱을 막아요." : "△ 기기 관리자가 아니에요: 학습 시간에 알림이 오고, '화면 고정'을 눌러야 잠겨요. 아래 안내대로 한 번 설정해 주세요."),
        h("div", {}, st.exactAlarm ? "✔ 정확한 시각에 켜기 허용됨" : h("span", {}, "△ 정확한 시각 알람이 꺼져 있어 몇 분 늦게 켜질 수 있어요. ",
          h("button", { class: "btn small-btn", onclick: () => native.openAlarmSettings() }, "허용하러 가기"))),
        h("div", {}, st.chatgpt ? "✔ 잠금 중에도 ChatGPT 앱은 열 수 있어요." : "△ ChatGPT 앱이 없어요. 영어 회화를 과제로 넣으려면 설치해 주세요."),
        st.shouldLock ? h("div", { class: "row" }, h("strong", { class: "grow" }, st.locked ? "🔒 지금 잠겨 있어요" : "지금은 학습 시간이에요"),
          h("button", { class: "btn primary", onclick: () => { native.adminRelease(); adminMsg = "이번 학습 시간의 잠금을 풀었어요"; render(); } }, "지금 잠금 풀기")) : null,
        st.deviceOwner ? null : h("details", { class: "talk-help" }, h("summary", {}, "기기 관리자로 설정하는 방법 (컴퓨터 필요, 한 번만)"),
          h("ol", { class: "muted" },
            h("li", {}, "태블릿 설정 → 계정에서 모든 계정(구글 계정 포함)을 잠시 지워요. 계정이 있으면 설정이 안 돼요."),
            h("li", {}, "설정 → 태블릿 정보 → 빌드 번호를 7번 눌러 개발자 옵션을 켜고, USB 디버깅을 켜요."),
            h("li", {}, "컴퓨터에 USB로 연결하고 아래 명령을 실행해요. 그다음 계정을 다시 추가해요.")),
          h("textarea", { readonly: true, rows: "2", "aria-label": "설정 명령" }, "adb shell dpm set-device-owner com.kidslearn.app/.LockAdminReceiver")),
        st.deviceOwner ? h("details", { class: "talk-help" }, h("summary", {}, "기기 관리자 해제 (앱을 지우기 전에)"),
          h("p", { class: "muted" }, "해제하면 시간표 잠금이 동작하지 않아요. 다시 쓰려면 컴퓨터로 다시 설정해야 해요."),
          h("button", { class: "btn", onclick: () => {
            if (!screen.confirmOwner) { screen.confirmOwner = true; adminMsg = "정말 해제하려면 한 번 더 눌러요"; return render(); }
            screen.confirmOwner = false; native.clearDeviceOwner(); adminMsg = "기기 관리자를 해제했어요"; render();
          } }, screen.confirmOwner ? "한 번 더 눌러 해제" : "기기 관리자 해제")) : null);
    return h("div", { class: "section" },
      h("div", { class: "setting" },
        h("div", { class: "grow" }, h("strong", {}, "학습 시간표 쓰기"),
          h("p", {}, "정한 요일·시각이 되면 앱이 켜지고, 오늘의 과제를 다 할 때까지 다른 앱을 쓸 수 없어요. 시간이 끝나면 저절로 풀려요.")),
        toggle(d.enabled, (v) => { d.enabled = v; save(); }, "학습 시간표 쓰기")),
      h("strong", {}, "학습 시간"),
      h("div", { class: "slots" }, d.slots.map(slotRow)),
      h("button", { class: "add-row", onclick: () => { d.slots.push({ days: [1, 2, 3, 4, 5], start: "19:00", end: "20:00" }); render(); } }, "+ 시간 추가"),
      h("strong", {}, "요일별 과제 (그날 학습 시간마다)"),
      tasks,
      h("button", { class: "btn primary", onclick: save }, "시간표 저장"),
      h("strong", {}, "이 기기"),
      device);
  }

  function Admin() {
    const tabs = ["학습 레벨", "학습 기록", "오답 노트", "연습장", "영어 단어장", "영어 회화", "학습 시간표", "AI 설정", "일반"];
    const tab = screen.tab, name = tabs[tab];
    const setTab = (i) => { adminMsg = ""; screen.tab = i; screen.sched = null; screen.taskDay = null; screen.confirmOwner = false; screen.confirmClear = false; screen.noteFilter = null; render(); };
    const toggle = (on, onChange, label) => h("button", { class: "switch", role: "switch", "aria-checked": String(on), "aria-label": label, onclick: () => { onChange(!on); render(); } });
    let content;
    if (name === "학습 레벨") {
      content = h("div", { class: "section" },
        h("div", { class: "setting" },
          h("div", { class: "grow" }, h("strong", {}, "정답률에 따라 레벨 자동 조정 (기본 꺼짐)"),
            h("p", {}, "꺼 두면 아래에서 관리자가 정한 레벨만 나와요. 켜면 90% 이상 맞힐 때 한 단계 올리고, 50% 미만이면 내려요.")),
          toggle(settings.autoLevel, (v) => (settings.autoLevel = v), "레벨 자동 조정")),
        SUBJECTS.map((s) => h("div", { class: "subject-row" }, h("h3", {}, s.title, h("span", { class: "recent" }, recentRate(s.id))),
          h("div", { class: "chips" }, s.levels.map((label, i) => h("button", { class: "chip", "aria-pressed": String(settings.level(s.id) === i + 1),
            onclick: () => { settings.setLevel(s.id, i + 1); render(); } }, label))))));
    } else if (name === "학습 기록") {
      const all = sessions.all();
      const week = all.filter((x) => x.startedAt >= Date.now() - 7 * 864e5);
      const fmt = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
      content = all.length === 0 ? h("p", {}, "아직 학습 기록이 없어요.") : h("div", { class: "section" },
        h("strong", {}, "최근 7일 과목별 정답률"),
        h("div", { class: "stats" }, SUBJECTS.map((s) => {
          const l = week.filter((x) => x.subject === s.id), t = l.reduce((a, x) => a + x.total, 0), c = l.reduce((a, x) => a + x.correct, 0);
          const talkMin = Math.round(l.filter((x) => x.kind === "talk").reduce((a, x) => a + x.durationSec, 0) / 60);
          return h("div", { class: "stat" }, h("span", { class: "muted" }, s.title), h("b", {}, s.id === "ENGLISH_TALK" ? `${talkMin}분` : t ? `${Math.floor((c * 100) / t)}%` : "-"), h("span", { class: "muted" }, `${l.length}회`));
        })),
        h("div", { class: "log" }, all.map((x) => {
          const s = subjectById(x.subject);
          return h("details", {}, h("summary", {},
            h("span", { class: "grow" }, `${fmt.format(new Date(x.startedAt))}  ${s.title} ${levelLabel(s, x.level)}${x.unit ? " · " + x.unit : ""}`),
            h("b", {}, `${x.kind === "talk" ? "대화" : `${x.correct}/${x.total}`} · ${Math.floor(x.durationSec / 60)}분 ${x.durationSec % 60}초`)),
            x.kind === "talk" ? h("p", { class: "muted" }, "ChatGPT와 영어 대화") : x.wrong.length ? h("ul", {}, x.wrong.map((w) => h("li", {}, w))) : h("p", { class: "muted" }, "모두 맞혔어요"));
        })));
    } else if (name === "오답 노트") {
      content = WrongNotesView();
    } else if (name === "연습장") {
      content = NotepadGallery();
    } else if (name === "영어 단어장") {
      const books = wordbooks.all(), edit = screen.editBook ? wordbooks.get(screen.editBook) : null;
      // 입력 중인 단어장은 화면을 다시 그려도 남도록 screen.draft에 둔다
      if (!screen.draft || screen.draft.id !== (edit ? edit.id : null))
        screen.draft = edit ? { id: edit.id, name: edit.name, rows: edit.words.map((w) => [w[0], w[1]]) } : { id: null, name: "", rows: [["", ""], ["", ""], ["", ""]] };
      const draft = screen.draft;
      const addRow = () => {
        draft.rows.push(["", ""]); render();
        const ins = document.querySelectorAll(".word-row:not(.head) input[lang=en]"); if (ins.length) ins[ins.length - 1].focus();
      };
      /** 빈 칸부터 채우고 남으면 줄을 더한다 */
      const mergeRows = (words) => {
        const keep = draft.rows.filter(([e, k]) => e.trim() || k.trim());
        draft.rows = [...keep, ...words.map((w) => [w[0], w[1]])];
        if (!draft.rows.length) draft.rows.push(["", ""]);
      };
      const readPhoto = async (input) => {
        const file = input.files && input.files[0];
        input.value = "";
        if (!file) return;
        if (typeof photoToWords !== "function") { screen.ocrMsg = "사진 인식 기능을 불러오지 못했어요."; return render(); }
        const show = (t, p) => { screen.ocrMsg = p ? `${t} ${Math.round(p * 100)}%` : t; const m = document.querySelector(".ocr-msg"); if (m) m.textContent = screen.ocrMsg; else render(); };
        try {
          const rows = await photoToWords(file, show);
          mergeRows(rows);
          const empty = rows.filter((r) => !r[1]).length;
          screen.ocrMsg = rows.length ? `사진에서 ${rows.length}개를 읽어 칸에 넣었어요. 틀린 글자가 있을 수 있으니 확인하고 고쳐 주세요.` + (empty ? ` 뜻을 못 읽은 줄 ${empty}개는 직접 써 주세요.` : "")
            : "사진에서 단어를 찾지 못했어요. 밝은 곳에서 단어 목록이 화면에 꽉 차게 찍어 주세요.";
        } catch (err) { screen.ocrMsg = err.message || "사진을 읽지 못했어요."; }
        if (screen.name === "admin") render();
      };
      content = h("div", { class: "section" },
        h("strong", {}, "단어 시험 뒤 손으로 쓰기"),
        h("div", { class: "chips" }, [["trace", "따라 쓰기 (흐린 글자 위에)"], ["free", "혼자 쓰기 (보지 않고)"], ["off", "쓰기 없음"]].map(([v, label]) =>
          h("button", { class: "chip", "aria-pressed": String(settings.wordWrite === v), onclick: () => { settings.wordWrite = v; render(); } }, label))),
        h("p", { class: "muted", style: "margin:0" }, "문제를 푼 뒤 그 영어 단어를 공책 칸에 쓰게 해요. 쓴 모양이 단어와 비슷하면 통과하고, 두 번 틀리면 건너뛸 수 있어요."),
        h("strong", {}, edit ? `'${edit.name}' 고치기` : "새 단어장 만들기"),
        h("label", { for: "bookName" }, "단어장 이름"),
        h("input", { type: "text", id: "bookName", maxlength: "30", value: draft.name, placeholder: "예: 3단원 단어, 이번 주 단어", oninput: (e) => (draft.name = e.target.value) }),
        h("div", { class: "word-rows", role: "list" },
          h("div", { class: "word-row head", "aria-hidden": "true" }, h("span", {}, "영어"), h("span", {}, "뜻 (여러 개는 쉼표로)"), h("span", {})),
          draft.rows.map((r, i) => h("div", { class: "word-row", role: "listitem" },
            h("input", { type: "text", lang: "en", autocapitalize: "off", spellcheck: "false", "aria-label": `${i + 1}번 영어`, value: r[0], placeholder: i === 0 ? "예: apple" : "영어", oninput: (e) => (r[0] = e.target.value) }),
            h("input", { type: "text", class: r[0].trim() && !r[1].trim() ? "need" : null, "aria-label": `${i + 1}번 뜻`, value: r[1], placeholder: i === 0 ? "예: 사과, 능금" : "뜻",
              oninput: (e) => { r[1] = e.target.value; e.target.classList.toggle("need", !!r[0].trim() && !r[1].trim()); },
              onkeydown: (e) => { if (e.key === "Enter" && i === draft.rows.length - 1) { e.preventDefault(); addRow(); } } }),
            h("button", { class: "row-del", "aria-label": `${i + 1}번 단어 빼기`, onclick: () => { draft.rows.splice(i, 1); if (!draft.rows.length) draft.rows.push(["", ""]); render(); } }, "✕")))),
        h("button", { class: "add-row", onclick: addRow }, "+ 단어 추가"),
        h("div", { class: "row wrap" },
          h("label", { class: "btn photo-btn" }, "📷 사진으로 한 번에 추가",
            h("input", { type: "file", accept: "image/*", capture: "environment", class: "visually-hidden", onchange: (e) => readPhoto(e.target) })),
          h("button", { class: "btn", onclick: () => { screen.pasteOpen = !screen.pasteOpen; render(); } }, "여러 줄 붙여 넣기")),
        screen.ocrMsg ? h("div", { class: "ocr-msg", "aria-live": "polite" }, screen.ocrMsg) : null,
        screen.pasteOpen ? h("div", { class: "section" },
          h("textarea", { id: "bookWords", rows: "6", placeholder: "apple - 사과, 능금\nbanana - 바나나" }),
          h("p", { class: "muted", style: "margin:0" }, "한 줄에 하나씩 '영어 - 뜻'. 엑셀에서 두 칸을 복사해 붙여 넣어도 돼요."),
          h("button", { class: "btn", onclick: () => {
            const { words, bad } = parseWordList(document.getElementById("bookWords").value);
            mergeRows(words); screen.pasteOpen = false;
            adminMsg = `${words.length}개를 아래 칸에 넣었어요` + (bad.length ? ` · 읽지 못한 줄 ${bad.length}개` : ""); render();
          } }, "칸에 넣기")) : null,
        h("div", { class: "row" },
          h("button", { class: "btn primary", onclick: () => {
            const name = draft.name.trim();
            const filled = draft.rows.map(([e, k]) => [e.trim().replace(/\s+/g, " "), joinMeanings(k)]).filter(([e, k]) => e || k);
            const words = [], seen = new Set();
            for (const [e, k] of filled) if (e && k && /[A-Za-z]/.test(e) && !seen.has(e.toLowerCase())) { seen.add(e.toLowerCase()); words.push([e, k]); }
            const skipped = filled.length - words.length;
            if (!name) { adminMsg = "단어장 이름을 써 주세요"; return render(); }
            if (words.length < 2) { adminMsg = "영어와 뜻이 모두 있는 단어를 2개 이상 넣어 주세요"; return render(); }
            wordbooks.save({ id: draft.id || "b" + Date.now().toString(36), name, words });
            screen.editBook = null; screen.draft = null;
            adminMsg = `'${name}' 저장: ${words.length}개 단어` + (skipped ? ` · 비었거나 겹친 줄 ${skipped}개는 뺐어요` : "");
            render();
          } }, edit ? "고친 내용 저장" : "단어장 저장"),
          edit ? h("button", { class: "btn", onclick: () => { screen.editBook = null; screen.draft = null; render(); } }, "취소") : null),
        h("strong", {}, `만든 단어장 (${books.length})`),
        books.length ? h("div", { class: "book-list" }, books.map((b) => h("div", { class: "book-row" },
          h("span", { class: "grow" }, h("b", {}, b.name), h("span", { class: "muted" }, ` · ${b.words.length}개`)),
          h("button", { class: "btn small-btn", onclick: () => { screen.editBook = b.id; screen.ocrMsg = ""; adminMsg = ""; render(); window.scrollTo(0, 0); } }, "고치기"),
          h("button", { class: "btn small-btn danger", onclick: () => {
            if (screen.confirmDel !== b.id) { screen.confirmDel = b.id; adminMsg = `'${b.name}'을(를) 지우려면 한 번 더 눌러요`; return render(); }
            wordbooks.remove(b.id); screen.confirmDel = null; adminMsg = `'${b.name}'을(를) 지웠어요`; render();
          } }, screen.confirmDel === b.id ? "정말 지우기" : "지우기")))) : h("p", { class: "muted", style: "margin:0" }, "아직 없어요."));
    } else if (name === "영어 회화") {
      const cur = settings.talkTopic;
      content = h("div", { class: "section" },
        h("strong", {}, "오늘의 대화 주제"),
        h("p", { class: "muted", style: "margin:0" }, "학생이 영어 회화를 누르면 이 주제로 ChatGPT 대화가 시작돼요. 정하지 않으면 날마다 추천 주제가 바뀌어요. 회화 수준은 '학습 레벨' 탭의 영어 회화에서 정해요."),
        h("div", { class: "chips" },
          h("button", { class: "chip", "aria-pressed": String(!cur), onclick: () => { settings.talkTopic = null; render(); } }, "날마다 자동"),
          TALK_TOPICS.map((t) => h("button", { class: "chip", "aria-pressed": String(!!cur && cur.id === t.id), onclick: () => { settings.talkTopic = { id: t.id }; render(); } }, t.ko))),
        h("label", { for: "customTopic" }, h("strong", {}, "직접 쓰기 (영어 또는 한국어)")),
        h("div", { class: "row" }, h("input", { type: "text", id: "customTopic", maxlength: "80", value: cur && cur.custom ? cur.custom : "", placeholder: "예: Talking about my favorite book" }),
          h("button", { class: "btn", onclick: () => { const v = document.getElementById("customTopic").value.trim(); settings.talkTopic = v ? { custom: v } : null; adminMsg = v ? "주제를 저장했어요" : "자동 주제로 바꿨어요"; render(); } }, "저장")),
        h("strong", {}, "ChatGPT 연결 주소 (선택)"),
        h("p", { class: "muted", style: "margin:0" }, "비워 두면 매번 새 채팅이 열리고 규칙과 주제가 함께 들어가요. 맞춤 GPT나 프로젝트 주소를 넣으면 그 지침(아래 규칙)을 쓰는 새 대화가 열리고 오늘 주제만 보내요. 특정 채팅 주소(chatgpt.com/c/…)를 넣으면 그 대화방으로 바로 가고, 주제 문장은 복사돼서 붙여 넣으면 돼요."),
        h("div", { class: "row" }, h("input", { type: "url", id: "talkLink", value: settings.talkLink, placeholder: "https://chatgpt.com/g/... 또는 /c/..." }),
          h("button", { class: "btn", onclick: () => {
            const v = document.getElementById("talkLink").value.trim();
            if (v && !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(v)) { adminMsg = "chatgpt.com 주소만 넣을 수 있어요"; return render(); }
            settings.talkLink = v; adminMsg = v ? "연결 주소를 저장했어요" : "새 채팅으로 열도록 바꿨어요"; render();
          } }, "저장")),
        h("label", { for: "talkEnd" }, h("strong", {}, "대화를 끝내는 말")),
        h("div", { class: "row" }, h("input", { type: "text", id: "talkEnd", maxlength: "40", value: settings.talkEnd }),
          h("button", { class: "btn", onclick: () => { settings.talkEnd = document.getElementById("talkEnd").value.trim() || "Goodbye, teacher!"; adminMsg = "끝내는 말을 저장했어요. 맞춤 GPT·프로젝트를 쓰면 지침도 다시 붙여 넣어 주세요"; render(); } }, "저장")),
        h("details", { class: "talk-help" }, h("summary", {}, "맞춤 GPT·프로젝트에 넣을 지침 보기"),
          h("p", { class: "muted" }, "ChatGPT에서 맞춤 GPT(또는 프로젝트)를 만들고 '지침(Instructions)'에 아래 글을 붙여 넣은 뒤, 그 주소를 위 칸에 저장해요. 수준은 매번 보내는 주제 문장에 들어가요."),
          h("textarea", { readonly: true, rows: "7", "aria-label": "지침" }, talkRules(1, settings.talkEnd, false)),
          h("button", { class: "btn", onclick: (e) => { copyText(talkRules(1, settings.talkEnd, false)); e.target.textContent = "복사했어요"; } }, "지침 복사")),
        h("strong", {}, "ChatGPT 사용 안내"),
        h("p", { class: "muted", style: "margin:0" }, "대화는 이 기기에서 로그인한 ChatGPT 계정으로 진행돼요. OpenAI 약관상 ChatGPT는 13세 이상(18세 미만은 보호자 동의)만 쓸 수 있으니 아이 나이에 맞는지 먼저 확인해 주세요. Android 앱에서는 학습 잠금 중에도 ChatGPT 앱만 열 수 있게 할 예정이에요."));
    } else if (name === "학습 시간표") {
      content = ScheduleEditor(toggle);
    } else if (name === "AI 설정") {
      content = h("div", { class: "section" },
        h("strong", {}, "AI 선생님 (3단계에서 연결 예정)"),
        h("p", { class: "muted", style: "margin:0" }, "AI는 아이의 수준 분석, 새 문제 만들기, 영어 회화 상대를 맡아요. API 키는 기기에 저장하지 않고 중계 서버에 보관해요."),
        AI.map(([id, label]) => h("label", { class: "radio" }, h("input", { type: "radio", name: "ai", id: "ai-" + id, checked: settings.ai === id, onchange: () => { settings.ai = id; render(); } }), label)),
        h("label", { for: "relay" }, "중계 서버 주소"),
        h("div", { class: "row" }, h("input", { type: "url", id: "relay", value: settings.relay, placeholder: "https://" }),
          h("button", { class: "btn", onclick: () => { settings.relay = document.getElementById("relay").value.trim(); adminMsg = "주소를 저장했어요"; render(); } }, "주소 저장")),
        h("div", { class: "setting" },
          h("div", { class: "grow" }, h("strong", {}, "실시간 음성 대화 (OpenAI)"),
            h("p", {}, "끄면 기기 내장 음성 인식·읽기 + 선택한 AI로 대화해요(저렴). 켜면 더 자연스럽지만 비용이 커요.")),
          toggle(settings.realtime, (v) => (settings.realtime = v), "실시간 음성 대화")));
    } else {
      content = h("div", { class: "section" },
        h("label", { for: "name" }, h("strong", {}, "학생 별칭")),
        h("div", { class: "row" }, h("input", { type: "text", id: "name", value: settings.name, maxlength: "10" }),
          h("button", { class: "btn", onclick: () => { settings.name = document.getElementById("name").value.trim() || "친구"; adminMsg = "별칭을 저장했어요"; render(); } }, "저장")),
        h("div", { class: "setting" },
          h("div", { class: "grow" }, h("strong", {}, "숫자 답을 펜으로 쓰기"),
            h("p", {}, "켜면 수학의 숫자 답을 손글씨로 써요. 끄면 숫자 키패드를 보여 줘요. 문제 화면에서도 바꿀 수 있어요.")),
          toggle(settings.penInput, (v) => (settings.penInput = v), "펜으로 쓰기")),
        h("strong", {}, "한 번에 푸는 문제 수"),
        h("div", { class: "chips" }, [5, 10, 15, 20].map((n) => h("button", { class: "chip", "aria-pressed": String(settings.perSession === n), onclick: () => { settings.perSession = n; render(); } }, `${n}문제`))),
        h("label", { for: "newpin" }, h("strong", {}, "관리자 비밀번호 변경 (숫자 4~8자리)")),
        h("div", { class: "row" }, h("input", { type: "password", id: "newpin", inputmode: "numeric", maxlength: "8" }),
          h("button", { class: "btn", onclick: () => {
            const v = document.getElementById("newpin").value.replace(/\D/g, "");
            if (v.length >= 4) { settings.pin = v; adminMsg = "비밀번호를 바꿨어요"; } else adminMsg = "숫자 4자리 이상 입력해 주세요";
            render();
          } }, "변경")));
    }
    return [
      h("div", { class: "row" }, h("button", { class: "icon-btn", "aria-label": "나가기", onclick: () => go({ name: "home" }) }, "←"), h("h1", { style: "font-size:28px" }, "관리자 모드")),
      h("div", { class: "tabs", role: "tablist" }, tabs.map((t, i) => h("button", { class: "tab", role: "tab", "aria-selected": String(tab === i), onclick: () => setTab(i) }, t))),
      adminMsg ? h("div", { class: "msg" }, adminMsg) : null,
      content,
    ];
  }

  function render() {
    const views = { home: Home, quiz: Quiz, result: Result, pin: Pin, admin: Admin, hanjaHub: HanjaHub, mathHub: MathHub, wordHub: WordHub, talk: Talk, learnList: LearnList, learnChar: LearnChar };
    app.replaceChildren(...views[screen.name]().flat().filter(Boolean));
    syncStudy();
  }

  // 키보드로도 풀 수 있게 (숫자 문제)
  document.addEventListener("keydown", (e) => {
    if (screen.name !== "quiz" || document.querySelector(".notepad-wrap.open")) return;
    const s = screen.q;
    if (s.phase === "write") return;
    const q = s.questions[s.index];
    if (s.answered !== null) {
      if (e.key === "Enter" && s.retry) go({ name: "result", r: s.retry.r });
      return;
    }
    if (q.choices) {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < q.choices.length) { s.selected = q.choices[i]; render(); }
      else if (e.key === "Enter" && s.selected !== null) answer(s.selected);
      return;
    }
    if (settings.penInput && typeof PenPad === "function") { if (e.key === "Enter" && s.penText) answer(s.penText); return; }
    if (/^\d$/.test(e.key) && s.input.length < 7) { s.input += e.key; render(); }
    else if (e.key === "." && q.input === "decimal" && s.input && !s.input.includes(".")) { s.input += "."; render(); }
    else if (e.key === "Backspace") { s.input = s.input.slice(0, -1); render(); }
    else if (e.key === "Enter" && s.input) answer(s.input);
  });

  // 앱에 시간표를 알려 준다 (앱을 새로 깔았거나 업데이트했을 때도 맞도록)
  if (native) { try { native.setSchedule(JSON.stringify(settings.schedule)); } catch { /* 무시 */ } }
  // 학습 시간이 시작되거나 끝나면 처음 화면을 새로 그린다
  let lastKey = null;
  setInterval(() => { const s = activeSlot(settings.schedule), k = s && s.key; if (k !== lastKey) { lastKey = k; window.onStudyLock(); } }, 30000);

  render();
})();
