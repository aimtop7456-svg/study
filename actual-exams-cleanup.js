(() => {
  const exams = window.ACTUAL_EXAMS || [];
  const clean = (value) => String(value || "")
    .replace(/전자문제집 CBT 홈페이지\s*:[\s\S]*$/g, "")
    .replace(/최강 자격 기 기출문제\s*◑\s*전자문제집 CBT\s*:\s*www\.comcbt\.com/g, "")
    .replace(/격증 기출문제 전자문제집 CBT\s*:\s*www\.comcbt\.com\s*신재생에너지발전설비산업기사\s*◐\s*\d{4}년\s*\d{2}월\s*\d{2}일\s*필기/g, "")
    .replace(/격증 기출문제 전자문제집 CBT\s*:\s*www\.comcbt\.com/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const exam of exams) {
    for (const question of exam.questions || []) {
      question.q = clean(question.q);
      question.opts = (question.opts || []).map(clean);
    }
  }

  const byId = new Map(exams.flatMap((exam) => exam.questions || []).map((question) => [question.id, question]));
  const mpp = byId.get("actual-20190427-05");
  if (mpp) {
    mpp.q = "태양광발전 모듈에서 최대출력(Pmpp)의 의미는?";
    mpp.opts = ["Isc × Voc", "Impp × Voc", "Isc × Vmpp", "Impp × Vmpp"];
  }
  const greenManagement = byId.get("actual-20170305-64");
  if (greenManagement) greenManagement.a = 3;
})();
