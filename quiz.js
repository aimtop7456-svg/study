(() => {
  const selectedAnswers = new Map();
  const symbols = "①②③④";

  document.querySelector('button[onclick="shuffleAll()"]')?.remove();

  const style = document.createElement("style");
  style.textContent = `
    button.opt{display:block;width:100%;text-align:left;color:inherit;cursor:pointer}
    button.opt:hover:not(:disabled){border-color:#a8b6d2;background:#f0f3f9}
    button.opt:focus-visible{outline:3px solid rgba(36,87,230,.25);outline-offset:2px}
    button.opt:disabled{cursor:default;opacity:1}
    button.opt.wrong{background:#fff0f1;border:1px solid #e5a7ae;color:#9d2635;font-weight:700}
    .answer.wrong-answer{border-left-color:#c43d4d;background:#fff3f4}
    .answer.wrong-answer b{color:#b22939}
    .answer-result{display:block;margin-bottom:5px;font-weight:800}
    .type-guide{margin-top:9px;padding-top:9px;border-top:1px dashed #d9c78f}
  `;
  document.head.appendChild(style);

  const firstNotice = document.querySelector(".notice");
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

  const optionMarkup = (question, option, optionIndex) => {
    const selected = selectedAnswers.get(question.id);
    const answered = selected !== undefined;
    const correct = optionIndex === question.a;
    const selectedWrong = answered && optionIndex === selected && !correct;
    const revealCorrect = answers || (answered && correct);
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

    return `<div class="answer ${isWrong ? "wrong-answer" : ""}">
      <b class="answer-result">${result}</b>
      ${question.exp}
      <div class="src">${question.source}</div>
    </div>`;
  };

  window.answerQuestion = (id, optionIndex) => {
    if (answers || selectedAnswers.has(id)) return;
    selectedAnswers.set(id, optionIndex);
    render();
  };

  window.render = () => {
    const filteredQuestions = filtered();
    document.getElementById("count").textContent = `표시 ${filteredQuestions.length}문제`;
    list.className = answers ? "" : "quiz-mode";
    list.innerHTML = filteredQuestions.length
      ? filteredQuestions
          .map(
            (question, index) => `<article class="q">
              <div class="meta">
                <span class="tag">${question.subject}</span>
                <span class="tag">${question.tag}</span>
                <span>#${question.id}</span>
                <button class="star" onclick="star(${question.id})">${stars.has(question.id) ? "★" : "☆"}</button>
              </div>
              <div class="qt">Q${index + 1}. ${question.q}</div>
              ${question.opts.map((option, optionIndex) => optionMarkup(question, option, optionIndex)).join("")}
              ${answerMarkup(question)}
            </article>`,
          )
          .join("")
      : '<div class="empty">조건에 맞는 문제가 없습니다.</div>';

    const toggleButton = document.querySelector('button[onclick="toggleAnswers()"]');
    if (toggleButton) toggleButton.textContent = answers ? "정답 숨기기" : "정답 모두 보기";
  };

  window.toggleAnswers = () => {
    answers = !answers;
    if (!answers) selectedAnswers.clear();
    render();
  };

  render();
})();
