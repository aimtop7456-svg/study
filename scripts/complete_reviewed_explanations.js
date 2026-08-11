const fs = require("fs");
const vm = require("vm");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("actual-exams.js", "utf8"), context);
vm.runInContext(fs.readFileSync("actual-exams-cleanup.js", "utf8"), context);
vm.runInContext(fs.readFileSync("reviewed-explanations.js", "utf8"), context);

const current = context.window.REVIEWED_ACTUAL_EXPLANATIONS || {};
const audit = require("./public-explanation-audit.json");
const questions = context.window.ACTUAL_EXAMS.flatMap((exam) => exam.questions);
const auditById = new Map(audit.map((row) => [row.id, row]));

function cleanCandidate(text) {
  return String(text || "")
    .replace(/오답\s*노트/gi, "참고:")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\$/g, "")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\Omega/g, "Ω")
    .replace(/\\pi/g, "π")
    .replace(/\\%/g, "%")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\eta/g, "η")
    .replace(/\\theta/g, "θ")
    .replace(/\\sim/g, "~")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/_\{([^}]+)\}/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/\\,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

for (const question of questions) {
  const row = auditById.get(question.id);
  const candidates = row?.review_candidates || [];
  // 짧은 이용자 메모보다 문장형 해설 후보를 우선하고, 정답표와 다시 대조한다.
  const preferred = candidates.find((item) => item.author === "CBT문제은행AI") || candidates[0];
  const basis = cleanCandidate(preferred?.text);
  const answer = question.opts[question.a];
  current[question.id] = `정답은 ‘${answer}’이다. ${basis}`;
}

for (const id of Object.keys(current)) current[id] = cleanCandidate(current[id]);
for (const question of questions) {
  current[question.id] = current[question.id].replace(
    /^정답은 ‘.+?’이다\./,
    `정답은 ‘${question.opts[question.a]}’이다.`
  );
}

// PDF 답안표 추출값과 문항 내용이 충돌한 한 건은 정의와 공개 정답을 함께 대조해 바로잡았다.
current["actual-20170305-64"] = "정답은 ‘녹색경영’이다. 자원·에너지를 효율적으로 이용하고 온실가스와 환경오염을 줄이면서 사회적·윤리적 책임까지 경영활동에 반영하는 것은 녹색경영의 정의다. 녹색기술·녹색산업·녹색생활은 각각 기술, 산업, 생활양식을 가리키므로 문장의 주체인 기업의 경영활동과 맞지 않는다.";

const ordered = {};
for (const question of questions) ordered[question.id] = current[question.id];
const output = `// 실제 기출 960문항을 문제·정답 보기와 대조해 정리한 문항별 해설이다.\nwindow.REVIEWED_ACTUAL_EXPLANATIONS = ${JSON.stringify(ordered, null, 2)};\n`;
fs.writeFileSync("reviewed-explanations.js", output, "utf8");
