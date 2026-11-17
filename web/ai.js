// AI 선생님: Android 앱에서 관리자의 ChatGPT 계정(정액제)으로 묻고 답을 받는다.
// 로그인·토큰·요청은 앱(ChatGpt.kt)이 하고, 여기서는 묻는 글을 만들고 답을 읽는다.
// 웹 버전에는 앱이 없어서 쓸 수 없다.
(() => {
  const native = window.StudyFriendApp && window.StudyFriendApp.aiStatus ? window.StudyFriendApp : null;
  const pending = {};
  let seq = 0;
  window.__aiDone = (id, ok, value) => {
    const p = pending[id];
    if (!p) return;
    delete pending[id];
    if (ok) p.ok(value); else p.fail(new Error(value));
  };
  function call(fn, ...args) {
    if (!native) return Promise.reject(new Error("AI는 Android 앱에서만 쓸 수 있어요."));
    return new Promise((ok, fail) => {
      const id = `ai${++seq}`;
      pending[id] = { ok, fail };
      try { native[fn](id, ...args); } catch (e) { delete pending[id]; fail(new Error("AI를 부르지 못했어요.")); }
    });
  }
  const getModel = () => { try { return JSON.parse(localStorage.getItem("sf.aiModel") || "null"); } catch { return null; } };

  function status() {
    if (!native) return { inApp: false, signedIn: false };
    try { return { inApp: true, ...JSON.parse(native.aiStatus()) }; } catch { return { inApp: true, signedIn: false }; }
  }
  /** 바로 쓸 수 있는지: 앱 + 로그인 + 모델 */
  const ready = () => { const s = status(); return s.signedIn && !!getModel(); };

  async function ask(system, user) {
    const model = getModel();
    if (!model) throw new Error("관리자 → AI 설정에서 모델을 골라 주세요.");
    return call("aiChat", model, system, user);
  }

  /** 답에서 JSON만 꺼낸다 (```json … ``` 같은 꾸밈을 벗긴다) */
  function parseJson(text) {
    const t = String(text).replace(/```(?:json)?/gi, "").trim();
    const a = Math.min(...["{", "["].map((c) => (t.indexOf(c) < 0 ? Infinity : t.indexOf(c))));
    const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (!isFinite(a) || b < a) throw new Error("AI 답을 읽지 못했어요. 다시 해 주세요.");
    return JSON.parse(t.slice(a, b + 1));
  }

  const KID = "너는 한국 초등학생을 돕는 다정한 선생님이야. 아이가 읽을 글이니 짧고 쉬운 한국어로, 존댓말 대신 다정한 반말(\"~해 볼까?\", \"~야\")로 써. 꾸밈 기호(#, *, 표)는 쓰지 마.";

  /** 틀린 문제 도움말. reveal=false면 정답을 말하지 않고 힌트만 */
  function explain({ subject, level, q, given, reveal }) {
    const lines = [
      `과목: ${subject} (${level})`,
      `문제: ${q.prompt}${q.big ? `\n문제 속 내용: ${q.big}` : ""}${q.sentence ? `\n문장: ${q.sentence}` : ""}`,
      q.choices ? `보기: ${q.choices.join(" / ")}` : null,
      `아이가 쓴 답: ${given ?? "(없음)"}`,
      `정답: ${q.answer}${q.unit && !q.choices ? q.unit : ""}`,
      q.explain ? `참고 설명: ${q.explain}` : null,
    ].filter(Boolean).join("\n");
    const task = reveal
      ? "아이가 왜 틀렸을지 한 문장으로 짚어 주고, 정답이 왜 맞는지 3~4문장으로 차근차근 설명해 줘. 비슷한 문제를 풀 때 쓸 요령을 마지막에 한 문장으로 덧붙여."
      : "정답은 절대 말하지 말고, 아이가 스스로 다시 풀 수 있게 생각할 거리를 2~3문장 힌트로 줘. 보기 중 답을 가리키는 말(몇 번째, 그 낱말 자체)도 쓰지 마.";
    return ask(KID + "\n" + task, lines);
  }

  /**
   * 수준 분석. data: { name, subjects: [{ id, title, levels: [...], level, recent: [...], wrong: [...] }] }
   * → { summary, subjects: [{ id, level(1부터), reason }], tips: [...] }
   */
  async function analyze(data) {
    const system = "너는 초등학생 학습을 돕는 교육 전문가야. 보호자(관리자)에게 보고하는 글이니 존댓말로 간결하게 써. " +
      "아래 학습 기록을 보고 과목마다 알맞은 레벨을 추천해. 기록이 적으면 지금 레벨을 그대로 두고 그렇다고 말해. " +
      "반드시 JSON 하나만 답해: {\"summary\":\"전체 2~3문장\",\"subjects\":[{\"id\":\"과목 id\",\"level\":추천 레벨 번호(1부터),\"reason\":\"1~2문장\"}],\"tips\":[\"집에서 도와줄 방법 1문장\", ...최대 3개]}";
    const text = await ask(system, JSON.stringify(data));
    const r = parseJson(text);
    const ids = new Map(data.subjects.map((s) => [s.id, s]));
    return {
      summary: String(r.summary || ""),
      subjects: (Array.isArray(r.subjects) ? r.subjects : []).filter((x) => ids.has(x.id)).map((x) => {
        const s = ids.get(x.id), lv = Math.round(Number(x.level));
        return { id: x.id, level: lv >= 1 && lv <= s.levels.length ? lv : s.level, reason: String(x.reason || "") };
      }),
      tips: (Array.isArray(r.tips) ? r.tips : []).slice(0, 3).map(String),
    };
  }

  /** 틀린 문제와 비슷한 객관식 문제 만들기 → 문제 화면에서 쓰는 형식 */
  async function similar({ subject, subjectId, level, wrong, count = 5 }) {
    const system = "너는 한국 초등학생용 문제를 만드는 선생님이야. 아이가 틀린 문제와 같은 개념을 연습하는 새 객관식 문제를 만들어. " +
      "숫자나 낱말만 바꾼 똑같은 문제는 피하고, 난이도는 비슷하게. 수학은 정답을 두 번 계산해서 확인해. " +
      "보기는 4개이고 서로 달라야 하며 정답은 보기 중 하나와 글자가 똑같아야 해. " +
      `반드시 JSON 배열 하나만 답해: [{"prompt":"묻는 말","big":"크게 보여 줄 식·낱말(없으면 빈 문자열)","choices":["","","",""],"answer":"","explain":"정답 풀이 1문장"}] 정확히 ${count}개.`;
    const user = `과목: ${subject} (${level})\n아이가 틀린 문제:\n` + wrong.map((x, i) =>
      `${i + 1}. ${x.prompt}${x.big ? ` [${x.big}]` : ""}${x.choices ? ` 보기: ${x.choices.join(" / ")}` : ""} → 정답 ${x.answer}, 아이 답 ${x.given ?? "(없음)"}`).join("\n");
    const list = parseJson(await ask(system, user));
    const out = (Array.isArray(list) ? list : []).map((x) => {
      const choices = Array.isArray(x.choices) ? x.choices.map((c) => String(c).trim()).filter(Boolean) : [];
      const answer = String(x.answer ?? "").trim();
      if (!x.prompt || choices.length < 3 || new Set(choices).size !== choices.length || !choices.includes(answer)) return null;
      // 보기 순서를 섞는다 (AI가 정답을 늘 같은 자리에 둘 수 있어서)
      for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
      const big = String(x.big || "").trim();
      return { prompt: String(x.prompt).trim(), big: big || undefined, choices, answer, explain: x.explain ? String(x.explain) : undefined, tag: "AI 문제" };
    }).filter(Boolean);
    if (!out.length) throw new Error("AI가 쓸 만한 문제를 만들지 못했어요. 다시 해 주세요.");
    return out.slice(0, count);
  }

  window.AiTutor = {
    inApp: !!native, status, ready, getModel,
    setModel: (m) => { try { localStorage.setItem("sf.aiModel", JSON.stringify(m)); } catch { /* 무시 */ } },
    signIn: () => call("aiSignIn"), signOut: () => call("aiSignOut"), cancel: () => { try { native && native.aiCancel(); } catch { /* 무시 */ } },
    models: async () => JSON.parse(await call("aiModels")),
    explain, analyze, similar, parseJson,
  };
})();
