(() => {
  const PAGE_SIZE = 20;
  const PROGRESS_KEY = "pvprogress";
  const symbols = "①②③④";
  const selectedAnswers = new Map();
  let currentView = "unseen";
  let currentYear = null;

  window.studyProgress ||= JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");

  document.querySelector('button[onclick="shuffleAll()"]')?.remove();

  const style = document.createElement("style");
  style.textContent = `
    button.opt{display:block;width:100%;min-height:44px;text-align:left;color:inherit;cursor:pointer}
    button.opt:hover:not(:disabled){border-color:#a8b6d2;background:#f0f3f9}
    button.opt:focus-visible{outline:3px solid rgba(36,87,230,.25);outline-offset:2px}
    button.opt:disabled{cursor:default;opacity:1}
    button.opt.wrong{background:#fff0f1;border:1px solid #e5a7ae;color:#9d2635;font-weight:700}
    .answer.wrong-answer{border-left-color:#c43d4d;background:#fff3f4}
    .answer.wrong-answer b{color:#b22939}
    .answer-result{display:block;margin-bottom:5px;font-weight:800}
    .explanation-detail{margin-top:9px;padding-top:9px;border-top:1px solid #cfe5db;color:#26354b}
    .wrong-answer .explanation-detail{border-top-color:#eccbd0}
    .explanation-detail strong{display:block;margin-bottom:4px;color:#087a55}
    .wrong-answer .explanation-detail strong{color:#9d2635}
    .choice-review{margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.68);font-size:12px}
    .type-guide{margin-top:9px;padding-top:9px;border-top:1px dashed #d9c78f}
    .progress-badge{border-radius:999px;padding:3px 7px;background:#eef6f2;color:#087a55}
    .progress-badge.wrong{background:#fff0f1;color:#b22939}
    .study-nav{background:#e9efff;color:#2448a8}.study-nav.active{background:#2457e6;color:#fff;border-color:#2457e6}
    .year-button{display:block;width:100%;text-align:left;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--blue);font-weight:700}
  `;
  document.head.appendChild(style);

  const tools = document.querySelector(".tools");
  const firstAction = tools?.querySelector("button");
  [
    ["이어풀기", "showUnseen()", "unseen"],
    ["오답 복습", "showWrong()", "wrong"],
    ["풀어본 문제", "showSeen()", "seen"],
  ].forEach(([label, handler, view]) => {
    const button = document.createElement("button");
    button.className = "study-nav";
    button.dataset.view = view;
    button.setAttribute("onclick", handler);
    button.textContent = label;
    tools?.insertBefore(button, firstAction);
  });

  const firstNotice = document.querySelector(".notice");
  if (firstNotice) {
    firstNotice.innerHTML = `<b>사용법:</b> 기본 화면에는 아직 풀지 않은 문제 20개가 표시됩니다.
      보기를 누르면 정답은 녹색, 선택한 오답은 붉은색으로 표시되고 해설이 열립니다.
      풀어본 문제와 오답은 자동 저장되며 ★는 다시 볼 문제를 모아 둡니다.<br>
      <b>문제 구성:</b> 사이트 안에서 바로 풀 수 있는 자체 재구성 문제 총 ${Q.length}개입니다.
      실제 기출 원문을 그대로 복제한 자료가 아니라 출제기준과 공개 기출의 핵심 개념을 바탕으로 만든
      기본·개념 응용·계산·설계 연습문제이며, 외부 CBT 사이트로 이동하지 않습니다.`;
  }
  firstNotice?.insertAdjacentHTML(
    "beforeend",
    `<div class="type-guide"><b>유형 기준:</b>
      빈출=반복적으로 다뤄지는 출제 포인트 ·
      핵심=출제기준의 주요 이론·설계 내용 ·
      안전=감전·화재·보호·작업안전 ·
      기초=용어·정의·기본원리 ·
      계산=공식·수치 계산 ·
      회독=빠른 OX형 복습 문제</div>`,
  );

  const archive = document.getElementById("archive");
  if (archive?.parentElement) {
    archive.parentElement.innerHTML = `
      <b>연도별 기출 경향 모의세트 (사이트 내부 재구성)</b><br>
      외부 CBT 사이트로 이동하지 않습니다. 아래 세트는 해당 연도의 실제 원문을 복제한 것이 아니라,
      공개 기출의 출제 포인트와 현재 문제은행을 바탕으로 구성한 80문제 연습세트입니다.
      <div id="archive" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-top:10px"></div>`;
    const internalArchive = document.getElementById("archive");
    for (let year = 2014; year <= 2020; year += 1) {
      internalArchive.insertAdjacentHTML(
        "beforeend",
        `<button class="year-button" onclick="openYearSet(${year})">${year}년 기출 경향 80문제 풀기</button>`,
      );
    }
  }

  const secondStat = document.querySelector(".stats .pill:nth-child(2)");
  if (secondStat) secondStat.textContent = `자체 재구성 문제 ${Q.length} · 외부 CBT 이동 없음`;

  const progressEntries = () => Object.values(window.studyProgress || {});
  const completedCount = () => progressEntries().length;
  const wrongCount = () => progressEntries().filter((entry) => entry && !entry.correct).length;

  const updateProgressStat = () => {
    const thirdStat = document.querySelector(".stats .pill:nth-child(3)");
    if (thirdStat) {
      thirdStat.textContent = `풀이 완료 ${completedCount()}/${Q.length} · 현재 오답 ${wrongCount()}문제 · 자동 동기화`;
    }
    document.querySelectorAll(".study-nav").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === currentView);
    });
  };

  const resetControls = () => {
    cat.value = "all";
    tag.value = "all";
    search.value = "";
    selectedAnswers.clear();
    answers = false;
  };

  const seededScore = (id, year) => {
    let value = Math.imul(id + year, 2654435761) >>> 0;
    value ^= value >>> 16;
    return value >>> 0;
  };

  const buildYearSet = (year) => {
    const groups = {};
    Q.forEach((question) => (groups[question.subject] ??= []).push(question));
    return Object.values(groups).flatMap((group) =>
      [...group].sort((a, b) => seededScore(a.id, year) - seededScore(b.id, year)).slice(0, 20),
    );
  };

  const setView = (view, year = null) => {
    currentView = view;
    currentYear = year;
    resetControls();
    const progress = window.studyProgress || {};

    if (view === "unseen") data = Q.filter((question) => !progress[question.id]).slice(0, PAGE_SIZE);
    if (view === "wrong") data = Q.filter((question) => progress[question.id] && !progress[question.id].correct);
    if (view === "seen") data = Q.filter((question) => progress[question.id]);
    if (view === "stars") data = Q.filter((question) => stars.has(question.id));
    if (view === "all") data = [...Q];
    if (view === "year") data = buildYearSet(year);
    if (view === "mock") {
      const groups = {};
      Q.forEach((question) => (groups[question.subject] ??= []).push(question));
      data = Object.values(groups).flatMap((group) =>
        [...group].sort(() => Math.random() - 0.5).slice(0, 20),
      );
    }
    render();
    scrollTo(0, 0);
  };

  const optionMarkup = (question, option, optionIndex) => {
    const selected = selectedAnswers.get(question.id);
    const answered = selected !== undefined;
    const correct = optionIndex === question.a;
    const selectedWrong = answered && optionIndex === selected && !correct;
    const revealCorrect = correct && (answers || answered);
    const classNames = ["opt"];
    if (revealCorrect) classNames.push("correct");
    if (selectedWrong) classNames.push("wrong");

    let marker = "";
    if (revealCorrect) marker = " ✓";
    if (selectedWrong) marker = " ✕";

    return `<button type="button" class="${classNames.join(" ")}"
      onclick="answerQuestion(${question.id},${optionIndex})"
      ${answers || answered ? "disabled" : ""}>
      ${symbols[optionIndex]} ${option}${marker}
    </button>`;
  };

  const answerMarkup = (question) => {
    const selected = selectedAnswers.get(question.id);
    const answered = selected !== undefined;
    if (!answers && !answered) return "";

    const isWrong = answered && selected !== question.a;
    const result = answers
      ? `정답 ${symbols[question.a]}`
      : isWrong
        ? `오답입니다. 정답은 ${symbols[question.a]}입니다.`
        : "정답입니다.";
    const supplement = window.getEnhancedExplanation?.(question) || "";
    const choiceReview = answered
      ? `<div class="choice-review"><b>선택지 확인</b><br>
          내가 고른 답: ${symbols[selected]} ${question.opts[selected]}<br>
          정답: ${symbols[question.a]} ${question.opts[question.a]}</div>`
      : "";

    return `<div class="answer ${isWrong ? "wrong-answer" : ""}">
      <b class="answer-result">${result}</b>
      ${question.exp}
      ${supplement ? `<div class="explanation-detail"><strong>시험 포인트</strong>${supplement}</div>` : ""}
      ${choiceReview}
      <div class="src">${question.source}</div>
    </div>`;
  };

  const progressBadge = (id) => {
    const entry = window.studyProgress?.[id];
    if (!entry) return '<span class="progress-badge">처음 보는 문제</span>';
    return `<span class="progress-badge ${entry.correct ? "" : "wrong"}">
      ${entry.attempts || 1}회 풀이 · 최근 ${entry.correct ? "정답" : "오답"}
    </span>`;
  };

  window.answerQuestion = (id, optionIndex) => {
    if (answers || selectedAnswers.has(id)) return;
    const question = Q.find((item) => item.id === id);
    if (!question) return;
    selectedAnswers.set(id, optionIndex);
    const previous = window.studyProgress[id] || {};
    window.studyProgress[id] = {
      attempts: (previous.attempts || 0) + 1,
      correct: optionIndex === question.a,
      lastAnswer: optionIndex,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(window.studyProgress));
    window.dispatchEvent(new CustomEvent("study-progress-changed"));
    render();
  };

  window.render = () => {
    const filteredQuestions = filtered();
    document.getElementById("count").textContent =
      `표시 ${filteredQuestions.length}문제 · 완료 ${completedCount()}/${Q.length}`;
    list.className = answers ? "" : "quiz-mode";
    list.innerHTML = filteredQuestions.length
      ? filteredQuestions
          .map(
            (question, index) => `<article class="q">
              <div class="meta">
                <span class="tag">${question.subject}</span>
                <span class="tag">${question.tag}</span>
                <span>#${question.id}</span>
                ${progressBadge(question.id)}
                <button class="star" onclick="star(${question.id})">${stars.has(question.id) ? "★" : "☆"}</button>
              </div>
              <div class="qt">Q${index + 1}. ${question.q}</div>
              ${question.opts.map((option, optionIndex) => optionMarkup(question, option, optionIndex)).join("")}
              ${answerMarkup(question)}
            </article>`,
          )
          .join("")
      : `<div class="empty">
          ${currentView === "unseen"
            ? "아직 풀지 않은 문제를 모두 완료했습니다. 오답 복습으로 이동해 보세요."
            : "조건에 맞는 문제가 없습니다."}
        </div>`;

    const toggleButton = document.querySelector('button[onclick="toggleAnswers()"]');
    if (toggleButton) toggleButton.textContent = answers ? "정답 숨기기" : "정답 모두 보기";
    updateProgressStat();
  };

  window.toggleAnswers = () => {
    answers = !answers;
    if (!answers) selectedAnswers.clear();
    render();
  };
  window.showUnseen = () => setView("unseen");
  window.showWrong = () => setView("wrong");
  window.showSeen = () => setView("seen");
  window.showStars = () => setView("stars");
  window.resetAll = () => setView("all");
  window.mock = () => setView("mock");
  window.openYearSet = (year) => setView("year", year);
  window.refreshCurrentStudyView = () => setView(currentView, currentYear);

  cat.onchange = () => render();
  tag.onchange = () => render();
  search.oninput = () => render();

  setView("unseen");
})();
