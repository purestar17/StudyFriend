// 사진 속 단어 목록 읽기 (Tesseract.js, Apache-2.0). 사진은 서버로 보내지 않고 기기 안에서 읽는다.
// 처음 쓸 때 인식 프로그램과 영어·한국어 글자 데이터(약 6MB)를 CDN에서 한 번 받아 온다.
(() => {
  const CDN = "https://cdn.jsdelivr.net/npm/";
  const LIB = CDN + "tesseract.js@5.1.1/dist/tesseract.min.js";
  let loading = null;

  function loadLib() {
    if (window.Tesseract) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = LIB; s.async = true;
      s.onload = () => ok(); s.onerror = () => { loading = null; fail(new Error("인식 프로그램을 받지 못했어요. 인터넷 연결을 확인해 주세요.")); };
      document.head.append(s);
    });
    return loading;
  }

  /** 사진을 적당한 크기·흑백으로 바꿔 인식이 잘 되게 한다 */
  function prepare(file) {
    return new Promise((ok, fail) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        // 작은 사진은 키우고 큰 사진은 줄인다 (글자가 너무 작으면 잘 못 읽음)
        const scale = Math.min(3, 2000 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const x = c.getContext("2d");
        x.filter = "grayscale(1) contrast(1.3)";
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("사진을 열지 못했어요.")); };
      img.src = url;
    });
  }

  /**
   * photoToWords(file, onProgress) → [[영어, 뜻], ...]
   * onProgress(문구, 0~1)
   */
  async function photoToWords(file, onProgress = () => {}) {
    onProgress("인식 준비 중… (처음 한 번은 조금 걸려요)", 0);
    await loadLib();
    const image = await prepare(file);
    const worker = await Tesseract.createWorker(["kor", "eng"], 1, {
      logger: (m) => {
        if (m.status === "recognizing text") onProgress("글자를 읽는 중…", m.progress);
        else if (/loading|initializ/.test(m.status)) onProgress("인식 준비 중… (처음 한 번은 조금 걸려요)", m.progress * 0.5);
      },
    });
    try {
      // 단어 목록처럼 줄이 고르게 있는 글로 보고 읽는다
      await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
      const { data } = await worker.recognize(image);
      return parseOcrText(data.text);
    } finally {
      await worker.terminate();
    }
  }
  window.photoToWords = photoToWords;
})();
