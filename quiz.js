(() => {
  const PAGE_SIZE = 20;
  const LIST_PAGE_SIZE = 40;
  const PROGRESS_KEY = "pvprogress";
  const SESSION_KEY = "pvsession";
  const symbols = "①②③④";
  const selectedAnswers = new Map();
  let currentView = "unseen";
  let currentYear = null;
  let currentPool = [];
  let pageIndex = 0;
  let examMode = false;
  let examGraded = false;
  let scrollTimer;
  const actualExams = [...(window.ACTUAL_EXAMS || [])].sort((a,b)=>b.date.localeCompare(a.date));
  const actualQuestions = actualExams.flatMap((exam) => exam.questions);
  const actualCorpus = actualQuestions.map((q)=>`${q.q} ${q.opts.join(" ")}`).join(" ");
  const wordFrequency = new Map();
  (actualCorpus.match(/[가-힣A-Za-z0-9]{2,}/g)||[]).forEach((word)=>wordFrequency.set(word,(wordFrequency.get(word)||0)+1));
  const frequencyScore = (q) => [...new Set(`${q.q} ${q.opts.join(" ")}`.match(/[가-힣A-Za-z0-9]{2,}/g)||[])].reduce((sum,word)=>sum+(wordFrequency.get(word)||0),0);
  // 정답을 질문 안에서 직접 알려 주는 초기 회독형 문항은 모의고사 후보에서 제외한다.
  const mockCandidates = [...Q].filter((q)=>!q.q.includes("정답 개념은"));
  const mockBank = [...new Set(mockCandidates.map((q)=>q.subject))].flatMap((subject)=>
    mockCandidates.filter((q)=>q.subject===subject).sort((a,b)=>frequencyScore(b)-frequencyScore(a)||a.id-b.id).slice(0,60),
  );
  const learningBank = [...actualQuestions, ...mockBank];
  const allQuestions = learningBank;
  const questionById = (id) => allQuestions.find((q) => String(q.id) === String(id));

  window.studyProgress ||= JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  document.querySelector('button[onclick="shuffleAll()"]')?.remove();

  const style = document.createElement("style");
  style.textContent = `
    header{position:relative}
    button.opt{display:block;width:100%;min-height:44px;text-align:left;color:inherit;cursor:pointer}
    button.opt:hover:not(:disabled){border-color:#a8b6d2;background:#f0f3f9}
    button.opt:focus-visible{outline:3px solid rgba(36,87,230,.25);outline-offset:2px}
    button.opt:disabled{cursor:default;opacity:1}
    button.opt.selected{border:2px solid #5878d8;background:#edf2ff;color:#233f91;font-weight:700}
    button.opt.wrong{background:#fff0f1;border:1px solid #e5a7ae;color:#9d2635;font-weight:700}
    .answer.wrong-answer{border-left-color:#c43d4d;background:#fff3f4}.answer.wrong-answer b{color:#b22939}
    .answer-result{display:block;margin-bottom:5px;font-weight:800}
    .explanation-detail{margin-top:9px;padding-top:9px;border-top:1px solid #cfe5db;color:#26354b}
    .wrong-answer .explanation-detail{border-top-color:#eccbd0}.explanation-detail strong{display:block;margin-bottom:4px;color:#087a55}
    .wrong-answer .explanation-detail strong{color:#9d2635}
    .type-guide{margin-top:9px;padding-top:9px;border-top:1px dashed #d9c78f}
    .progress-badge{border-radius:999px;padding:3px 7px;background:#eef6f2;color:#087a55}
    .progress-badge.wrong{background:#fff0f1;color:#b22939}
    .study-nav{background:#e9efff;color:#2448a8}.study-nav.active{background:#2457e6;color:#fff;border-color:#2457e6}
    .quick-bar{position:sticky;top:6px;z-index:15;display:flex;gap:6px;justify-content:center;margin:0 auto 10px;padding:6px;width:max-content;max-width:100%;border:1px solid #d7dfed;border-radius:13px;background:rgba(255,255,255,.94);box-shadow:0 5px 18px rgba(17,27,53,.12);backdrop-filter:blur(8px)}
    .quick-bar button{padding:8px 10px;white-space:nowrap}.quick-bar .quick-next{background:#2457e6;color:#fff;border-color:#2457e6}
    .compact-details{margin:0 0 10px;border:1px solid var(--line);border-radius:12px;background:#fff}
    .compact-details summary{cursor:pointer;padding:11px 13px;font-size:13px;font-weight:750;color:#3a4962}
    .compact-details-body{padding:0 13px 13px;font-size:12px;line-height:1.6;color:#536078}
    .year-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px;margin-top:9px}
    .year-button{display:block;width:100%;text-align:left;padding:10px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--blue);font-weight:700}
    .batch-footer{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;padding:5px 0 24px}
    .batch-footer button{min-width:130px;padding:12px 16px;font-weight:750}.batch-footer .primary-next{background:#2457e6;color:#fff;border-color:#2457e6}
    .batch-progress{font-size:12px;color:#59667b;width:100%;text-align:center}
    .exam-banner{background:#eef3ff;border:1px solid #c8d5f6;border-radius:11px;padding:10px 12px;margin-bottom:10px;font-size:13px;color:#29468e}
    .actual-exam-banner{background:#edf8f3;border-color:#b8dfce;color:#176044}
    .actual-source-image{display:block;width:100%;height:auto;margin:8px 0 12px;border:1px solid #d9dfe8;border-radius:9px;background:#fff}
    .source-details{margin-top:9px;font-size:12px}.source-details summary{cursor:pointer;color:#49617f}.source-details img{margin-top:8px}
    #stats-dialog{border:0;border-radius:18px;padding:0;width:min(92vw,650px);max-height:82vh;box-shadow:0 22px 70px rgba(10,20,40,.24)}
    #stats-dialog::backdrop{background:rgba(10,20,40,.48)}.stats-card{padding:24px;overflow:auto}.stats-card h2{margin:0 0 14px}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.stat-box{border:1px solid var(--line);border-radius:11px;padding:11px}.stat-box b{display:block;margin-bottom:5px}.stat-line{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3px 0}.stats-close{float:right}
    @media(max-width:600px){.quick-bar{top:4px}.quick-bar button{padding:8px;font-size:12px}.main{padding-top:8px}.stats-card{padding:18px}}
  `;
  document.head.appendChild(style);

  const tools = document.querySelector(".tools");
  const firstAction = tools?.querySelector("button");
  [
    ["이어풀기", "showUnseen()", "unseen"],
    ["복습 예정", "showDue()", "due"],
    ["오답 복습", "showWrong()", "wrong"],
    ["반복 오답", "showRepeatedWrong()", "repeated"],
    ["풀어본 문제", "showSeen()", "seen"],
  ].forEach(([label, handler, view]) => {
    const button = document.createElement("button");
    button.className = "study-nav";
    button.dataset.view = view;
    button.setAttribute("onclick", handler);
    button.textContent = label;
    tools?.insertBefore(button, firstAction);
  });
  const statsButton = document.createElement("button");
  statsButton.textContent = "학습 통계";
  statsButton.setAttribute("onclick", "showStats()");
  tools?.appendChild(statsButton);

  cat.setAttribute("aria-label", "과목 선택");
  tag.setAttribute("aria-label", "문제 유형 선택");
  search.setAttribute("aria-label", "문제 키워드 검색");

  const main = document.querySelector("main.main");
  const quickBar = document.createElement("nav");
  quickBar.className = "quick-bar";
  quickBar.setAttribute("aria-label", "빠른 학습 기능");
  quickBar.innerHTML = `<button type="button" onclick="showUnseen()">이어풀기</button><button type="button" class="quick-answer" onclick="toggleAnswers()">정답 보기</button><button type="button" class="quick-next" onclick="nextPage()">다음 문제</button>`;
  main?.insertBefore(quickBar, main.firstChild);

  const notices = [...document.querySelectorAll("main .notice")];
  const helpDetails = document.createElement("details");
  helpDetails.className = "compact-details";
  helpDetails.innerHTML = `<summary>사용법·문제 구성·유형 기준</summary><div class="compact-details-body"><b>사용법:</b> 기본 이어풀기는 최신 실제 기출부터 과거 회차 순으로 20문제씩 제시합니다. 답을 선택하면 실제 기출과 모의고사 모두 정답·오답 색상과 해설이 즉시 표시됩니다. 실제 기출 960문제를 마치면 빈출 모의고사 240문제가 이어집니다.<br><b>문제 구성:</b> 제공된 교사용 PDF 실제 기출 12회·960문제와, 기출의 반복 개념을 기준으로 선별한 모의고사 3회·240문제입니다. 외부 CBT로 이동하지 않습니다.<div class="type-guide"><b>유형:</b> 빈출=반복 출제 포인트 · 핵심=주요 이론·설계 · 안전=감전·화재·보호 · 기초=용어·원리 · 계산=공식·수치 · 회독=빠른 복습</div></div>`;
  const archiveDetails = document.createElement("details");
  archiveDetails.className = "compact-details";
  archiveDetails.innerHTML = `<summary>빈출 기반 모의고사 3회 · 240문제</summary><div class="compact-details-body">12회 실제 기출에서 자주 등장한 용어와 개념을 기준으로 선별한 재구성 문제입니다.<div class="year-grid">${[0,1,2].map((set)=>`<button class="year-button" onclick="openPracticeSet(${set})">빈출 모의고사 ${set+1}회 · 80문제</button>`).join("")}</div></div>`;
  const actualDetails = document.createElement("details");
  actualDetails.className = "compact-details";
  actualDetails.innerHTML = `<summary>실제 기출 원문 12회 · 960문제</summary><div class="compact-details-body">첨부한 교사용 PDF의 문제·보기·정답입니다. 재구성 모의고사와 별도로 기록됩니다.<div class="year-grid">${actualExams.map((exam)=>`<button class="year-button" onclick="openActualExam('${exam.date}')">${exam.title} 실제 기출 · 80문제</button>`).join("")}</div></div>`;
  const statsRow = document.querySelector(".stats");
  statsRow?.insertAdjacentElement("afterend", helpDetails);
  helpDetails.insertAdjacentElement("afterend", actualDetails);
  actualDetails.insertAdjacentElement("afterend", archiveDetails);
  notices.forEach((notice) => notice.remove());

  const secondStat = document.querySelector(".stats .pill:nth-child(2)");
  if (secondStat) secondStat.textContent = `실제 기출 960 + 빈출 모의 240`;

  const batchFooter = document.createElement("div");
  batchFooter.className = "batch-footer";
  list.insertAdjacentElement("afterend", batchFooter);

  const statsDialog = document.createElement("dialog");
  statsDialog.id = "stats-dialog";
  statsDialog.innerHTML = `<section class="stats-card"><button class="stats-close" onclick="document.getElementById('stats-dialog').close()" aria-label="통계 닫기">닫기</button><h2>학습 통계</h2><div id="stats-content"></div></section>`;
  document.body.appendChild(statsDialog);

  const progressEntries = () => learningBank.map((q) => window.studyProgress?.[q.id]).filter(Boolean);
  const completedCount = () => progressEntries().length;
  const reconstructedCompleted = () => mockBank.filter((q) => window.studyProgress[q.id]).length;
  const actualCompleted = () => actualQuestions.filter((q) => window.studyProgress[q.id]).length;
  const wrongCount = () => progressEntries().filter((entry) => entry && !entry.correct).length;
  const dueCount = () => progressEntries().filter((entry) => entry?.correct && (entry.dueAt || 0) <= Date.now()).length;
  const preferredOrder = (questions) => [...questions].sort((a,b) => {
    const rank = (q) => q.id <= 280 ? 0 : q.id >= 841 ? 1 : 2;
    return rank(a) - rank(b) || a.id - b.id;
  });
  const saveProgress = () => localStorage.setItem(PROGRESS_KEY, JSON.stringify(window.studyProgress));
  const scheduleDays = (attempts) => [1, 3, 7, 14, 30][Math.min(Math.max(attempts - 1, 0), 4)];
  const recordAnswer = (question, optionIndex) => {
    const previous = window.studyProgress[question.id] || {};
    const attempts = (previous.attempts || 0) + 1;
    const correct = optionIndex === question.a;
    const wrongAttempts = (previous.wrongAttempts || 0) + (correct ? 0 : 1);
    window.studyProgress[question.id] = {attempts, wrongAttempts, correct, lastAnswer: optionIndex, updatedAt: Date.now(), dueAt: correct ? Date.now() + scheduleDays(attempts) * 86400000 : Date.now()};
  };

  const updateProgressStat = () => {
    const thirdStat = document.querySelector(".stats .pill:nth-child(3)");
    if (thirdStat) thirdStat.textContent = `실제 기출 ${actualCompleted()}/960 · 빈출 모의 ${reconstructedCompleted()}/240 · 오답 ${wrongCount()} · ${window.cloudSyncActive ? "클라우드 동기화" : "이 기기에 저장"}`;
    document.querySelectorAll(".study-nav").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
  };

  const seededScore = (id, year) => { let value = Math.imul(id + year, 2654435761) >>> 0; value ^= value >>> 16; return value >>> 0; };
  const buildYearSet = (year) => {
    const groups = {}; Q.forEach((q) => (groups[q.subject] ??= []).push(q));
    return Object.values(groups).flatMap((group) => [...group].sort((a,b)=>seededScore(a.id,year)-seededScore(b.id,year)).slice(0,20));
  };
  const buildMock = (setIndex=0) => mockBank.slice(setIndex*80,setIndex*80+80);

  const poolFor = (view, year) => {
    const progress = window.studyProgress || {};
    if (view === "unseen") return learningBank.filter((q) => !progress[q.id]);
    if (view === "due") return allQuestions.filter((q) => progress[q.id]?.correct && (progress[q.id].dueAt || 0) <= Date.now());
    if (view === "wrong") return allQuestions.filter((q) => progress[q.id] && !progress[q.id].correct);
    if (view === "repeated") return allQuestions.filter((q) => progress[q.id] && !progress[q.id].correct && (progress[q.id].wrongAttempts || 0) >= 2);
    if (view === "seen") return allQuestions.filter((q) => progress[q.id]);
    if (view === "stars") return allQuestions.filter((q) => stars.has(q.id));
    if (view === "actual") return actualExams.find((exam) => exam.date === String(year))?.questions || [];
    if (view === "year") return buildYearSet(year);
    if (view === "mock") return buildMock(Number(year)||0);
    return [...learningBank];
  };

  const pageSize = () => ["unseen","due","actual","mock"].includes(currentView) ? PAGE_SIZE : LIST_PAGE_SIZE;
  const filteredPool = () => currentPool.filter((q) =>
    (cat.value === "all" || q.subject === cat.value) &&
    (tag.value === "all" || q.tag === tag.value) &&
    (!search.value || JSON.stringify(q).includes(search.value)),
  );
  const selectPage = () => {
    const size = pageSize(), source = filteredPool();
    data = source.slice(pageIndex * size, pageIndex * size + size);
  };
  const resetControls = () => { cat.value="all"; tag.value="all"; search.value=""; selectedAnswers.clear(); answers=false; };
  const persistSession = () => localStorage.setItem(SESSION_KEY, JSON.stringify({view:currentView,year:currentYear,ids:data.map(q=>q.id),scrollY:window.scrollY,examMode,examGraded,updatedAt:Date.now()}));

  const setView = (view, year = null) => {
    currentView=view; currentYear=year; pageIndex=0; examMode=false; examGraded=false; resetControls();
    currentPool=poolFor(view,year); selectPage(); render(); scrollTo(0,0); persistSession();
  };

  const optionMarkup = (question, option, optionIndex) => {
    const selected=selectedAnswers.get(question.id), answered=selected!==undefined, correct=optionIndex===question.a;
    const reveal=answers || examGraded || (!examMode && answered), selectedWrong=reveal && answered && optionIndex===selected && !correct;
    const classes=["opt"];
    if (examMode && !examGraded && answered && optionIndex===selected) classes.push("selected");
    if (reveal && correct) classes.push("correct"); if (selectedWrong) classes.push("wrong");
    const marker=reveal&&correct?" ✓":selectedWrong?" ✕":"";
    return `<button type="button" class="${classes.join(" ")}" onclick='answerQuestion(${JSON.stringify(question.id)},${optionIndex})' ${reveal?"disabled":""}>${symbols[optionIndex]} ${option}${marker}</button>`;
  };
  const answerMarkup = (question) => {
    const selected=selectedAnswers.get(question.id), answered=selected!==undefined, reveal=answers||examGraded||(!examMode&&answered);
    if (!reveal) return "";
    const isWrong=answered&&selected!==question.a;
    const result=answers&&!answered?`정답 ${symbols[question.a]}`:isWrong?`오답입니다. 정답은 ${symbols[question.a]}입니다.`:"정답입니다.";
    const supplement=window.getEnhancedExplanation?.(question)||"";
    const baseExplanation=question.examDate?"":question.exp;
    const explanationLabel=question.examDate&&!window.hasReviewedExplanation?.(question)?"해설 검토 누락":"정답 근거";
    return `<div class="answer ${isWrong?"wrong-answer":""}"><b class="answer-result">${result}</b>${baseExplanation}${supplement?`<div class="explanation-detail"><strong>${explanationLabel}</strong>${supplement}</div>`:""}<div class="src">${question.source}</div></div>`;
  };
  const progressBadge = (id) => {
    const entry=window.studyProgress?.[id]; if(!entry)return '<span class="progress-badge">처음 보는 문제</span>';
    return `<span class="progress-badge ${entry.correct?"":"wrong"}">${entry.attempts||1}회 · ${entry.correct?"최근 정답":(entry.wrongAttempts||0)>=2?"반복 오답":"최근 오답"}</span>`;
  };

  window.answerQuestion = (id, optionIndex) => {
    if (answers || examGraded) return;
    const question=questionById(id); if(!question)return;
    if (examMode) { selectedAnswers.set(id,optionIndex); render(); return; }
    if (selectedAnswers.has(id)) return;
    selectedAnswers.set(id,optionIndex); recordAnswer(question,optionIndex); saveProgress(); window.dispatchEvent(new CustomEvent("study-progress-changed")); render();
  };

  window.render = () => {
    const countElement=document.getElementById("count");
    if(!countElement||!list||!batchFooter)return;
    const shown=filtered();
    const answeredInBatch=data.filter((q)=>selectedAnswers.has(q.id)||(!examMode&&window.studyProgress[q.id])).length;
    countElement.textContent=`표시 ${shown.length}문제 · 현재 묶음 ${answeredInBatch}/${data.length} · 전체 학습 ${completedCount()}/${allQuestions.length}`;
    list.className=answers?"":"quiz-mode";
    const examTitle=currentView==="mock"?`빈출 모의고사 ${Number(currentYear)+1}회`:currentView==="actual"?`${currentYear.slice(0,4)}-${currentYear.slice(4,6)}-${currentYear.slice(6)} 실제 기출 원문`:"";
    const banner=["mock","actual"].includes(currentView)?`<div class="exam-banner ${currentView==="actual"?"actual-exam-banner":""}"><b>${examTitle}</b> · 보기를 선택하면 즉시 채점되고 핵심 해설이 표시됩니다.</div>`:"";
    list.innerHTML=banner+(shown.length?shown.map((q,i)=>{const originalImage=q.image?`<img class="actual-source-image" loading="lazy" src="${q.image}" alt="${q.source} ${q.qnum}번 원문 이미지">`:"";return `<article class="q"><div class="meta"><span class="tag">${q.subject}</span><span class="tag">${q.tag}</span><span>#${q.qnum||q.id}</span>${progressBadge(q.id)}<button class="star" onclick='star(${JSON.stringify(q.id)})' aria-label="${q.qnum||q.id}번 문제 즐겨찾기 ${stars.has(q.id)?"해제":"추가"}">${stars.has(q.id)?"★":"☆"}</button></div><div class="qt">Q${i+1}. ${q.q}</div>${q.hasFigure?originalImage:""}${q.opts.map((o,j)=>optionMarkup(q,o,j)).join("")}${answerMarkup(q)}${q.image&&!q.hasFigure?`<details class="source-details"><summary>PDF 원문 이미지 확인</summary>${originalImage}</details>`:""}</article>`;}).join(""):`<div class="empty">${currentView==="unseen"?"미풀이 문제를 모두 완료했습니다.":"조건에 맞는 문제가 없습니다."}</div>`);
    const totalPages=Math.max(1,Math.ceil(filteredPool().length/pageSize()));
    batchFooter.innerHTML=`<div class="batch-progress">현재 묶음 ${answeredInBatch}/${data.length}${totalPages>1?` · ${pageIndex+1}/${totalPages}쪽`:""}</div>${pageIndex>0?'<button onclick="previousPage()">이전</button>':""}<button class="primary-next" onclick="nextPage()">다음 문제</button>`;
    document.querySelectorAll('button[onclick="toggleAnswers()"]').forEach((b)=>{b.textContent=answers?"정답 가리기":"정답 보기";b.disabled=examMode&&!examGraded;});
    updateProgressStat(); persistSession();
  };

  window.submitExam = () => {
    if(!examMode||examGraded)return;
    selectedAnswers.forEach((answer,id)=>{const q=questionById(id);if(q)recordAnswer(q,answer);});
    saveProgress(); examGraded=true; window.dispatchEvent(new CustomEvent("study-progress-changed")); render();
  };
  window.nextPage = () => {
    if(currentView==="unseen"||currentView==="due"){currentPool=poolFor(currentView,currentYear);pageIndex=0;selectPage();selectedAnswers.clear();render();scrollTo(0,quickBar.offsetTop);return;}
    const total=Math.ceil(filteredPool().length/pageSize());if(pageIndex<total-1){pageIndex++;selectPage();selectedAnswers.clear();render();scrollTo(0,quickBar.offsetTop);}
  };
  window.previousPage = () => {if(pageIndex>0){pageIndex--;selectPage();selectedAnswers.clear();render();scrollTo(0,quickBar.offsetTop);}};
  window.toggleAnswers = () => {if(examMode&&!examGraded)return;answers=!answers;if(!answers&&!examMode)selectedAnswers.clear();render();};
  window.showUnseen=()=>setView("unseen"); window.showDue=()=>setView("due"); window.showWrong=()=>setView("wrong"); window.showRepeatedWrong=()=>setView("repeated"); window.showSeen=()=>setView("seen"); window.showStars=()=>setView("stars"); window.resetAll=()=>setView("all"); window.mock=()=>setView("mock",0); window.openPracticeSet=(set)=>setView("mock",set); window.openYearSet=(year)=>setView("mock",0); window.openActualExam=(date)=>setView("actual",date);
  window.refreshCurrentStudyView=()=>{currentPool=poolFor(currentView,currentYear);selectPage();render();};
  window.showStats = () => {
    const groups=(key)=>[...new Set(mockBank.map(q=>q[key]))].map(name=>{const qs=mockBank.filter(q=>q[key]===name),done=qs.filter(q=>window.studyProgress[q.id]),correct=qs.filter(q=>window.studyProgress[q.id]?.correct).length;return {name,done,correct,total:qs.length};});
    const block=(title,rows)=>`<div class="stat-box"><b>${title}</b>${rows.map(r=>`<div class="stat-line"><span>${r.name}</span><span>${r.done}/${r.total} · 정답률 ${r.done?Math.round(r.correct/r.done*100):0}%</span></div>`).join("")}</div>`;
    const actualRows=actualExams.map((exam)=>{const done=exam.questions.filter(q=>window.studyProgress[q.id]),correct=exam.questions.filter(q=>window.studyProgress[q.id]?.correct).length;return{name:exam.title,done:done.length,correct,total:80};});
    document.getElementById("stats-content").innerHTML=`<div class="stats-grid">${block("재구성 과목별",groups("subject"))}${block("재구성 유형별",groups("tag"))}${block("실제 기출 회차별",actualRows)}</div>`; statsDialog.showModal();
  };

  const applyFilter=()=>{pageIndex=0;selectPage();render();};
  cat.onchange=applyFilter;tag.onchange=applyFilter;search.oninput=applyFilter;
  addEventListener("scroll",()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(persistSession,180);},{passive:true});

  const restore = () => {
    try { const saved=JSON.parse(localStorage.getItem(SESSION_KEY)||"null"); if(!saved||Date.now()-saved.updatedAt>30*86400000)return false;
      const restored=saved.ids.map(id=>questionById(id)).filter(Boolean); if(!restored.length)return false;
      currentView=saved.view||"unseen";currentYear=saved.year||null;examMode=false;examGraded=false;currentPool=[...restored];data=[...restored];answers=false;render();requestAnimationFrame(()=>scrollTo(0,saved.scrollY||0));return true;
    } catch { return false; }
  };
  if(!restore())setView("unseen");
})();
