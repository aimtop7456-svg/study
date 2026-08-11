(() => {
  const original = [...Q];
  const symbols = ["①", "②", "③", "④"];

  const shuffled = (options, answer, seed) => {
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = (Math.imul(seed + i, 1103515245) >>> 0) % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      opts: order.map((index) => options[index]),
      a: order.indexOf(answer),
    };
  };

  const frames = [
    (question) => `“${question}” 문항의 정답을 판단하는 핵심 근거로 가장 적절한 것은?`,
    (question) => `현장 적용 상황을 가정할 때, 다음 물음에 가장 적절한 것은? ${question}`,
  ];
  const rationaleDistractors = [
    "관련 값은 운전 조건과 관계없이 항상 일정하기 때문이다.",
    "설비 안전 기준보다 작업 편의성을 우선해야 하기 때문이다.",
    "모든 회로에서 전압과 전류가 언제나 동시에 증가하기 때문이다.",
  ];

  original.forEach((base, index) => {
    frames.forEach((frame, variant) => {
      const id = 281 + index * 2 + variant;
      const rationaleMode = variant === 0;
      const choice = rationaleMode
        ? shuffled([base.exp, ...rationaleDistractors], 0, id)
        : shuffled(base.opts, base.a, id);
      Q.push({
        id,
        subject: base.subject,
        q: frame(base.q),
        opts: choice.opts,
        a: choice.a,
        exp: rationaleMode
          ? `핵심 근거는 다음과 같다. ${base.exp}`
          : `${base.exp} 보기의 순서나 표현이 달라져도 핵심 원리와 적용 조건을 기준으로 판단해야 한다.`,
        tag: rationaleMode || base.tag === "회독" ? "핵심" : base.tag,
        source: `자체 재구성 · ${rationaleMode ? "근거 판단" : "현장 응용"} (기반문항 #${base.id})`,
      });
    });
  });

  const subjects = {
    review: "1. 태양광발전 사전검토",
    design: "2. 태양광발전시스템 구성·선정",
    build: "3. 태양광발전 시공",
    maintain: "4. 태양광발전 유지·관리",
  };

  const addNumeric = ({ id, subject, q, answer, wrong, exp, tag = "계산" }) => {
    const raw = [String(answer), ...wrong.map(String)];
    const choice = shuffled(raw, 0, id);
    Q.push({
      id,
      subject,
      q,
      opts: choice.opts,
      a: choice.a,
      exp,
      tag,
      source: "자체 재구성 · 계산·설계 응용",
    });
  };

  for (let n = 0; n < 20; n += 1) {
    const voltage = 36 + n * 12;
    const current = 3 + (n % 8);
    const power = voltage * current;
    addNumeric({
      id: 841 + n,
      subject: subjects.design,
      q: `직류 회로의 전압이 ${voltage} V이고 전류가 ${current} A일 때 전력은?`,
      answer: `${power} W`,
      wrong: [`${power + voltage} W`, `${Math.max(1, voltage - current)} W`, `${voltage * (current + 2)} W`],
      exp: `직류 전력은 P=VI이므로 ${voltage}×${current}=${power} W이다.`,
    });
  }

  for (let n = 0; n < 20; n += 1) {
    const modules = 8 + n;
    const moduleVoltage = 36 + (n % 7) * 2;
    const total = modules * moduleVoltage;
    addNumeric({
      id: 861 + n,
      subject: subjects.design,
      q: `동작전압 ${moduleVoltage} V인 동일 모듈 ${modules}장을 직렬 연결할 때 스트링 동작전압은?`,
      answer: `${total} V`,
      wrong: [`${moduleVoltage} V`, `${modules + moduleVoltage} V`, `${total + moduleVoltage} V`],
      exp: `직렬 연결에서는 전압이 합산되므로 ${modules}×${moduleVoltage}=${total} V이다.`,
    });
  }

  for (let n = 0; n < 20; n += 1) {
    const strings = 2 + n;
    const stringCurrent = 7 + (n % 6);
    const total = strings * stringCurrent;
    addNumeric({
      id: 881 + n,
      subject: subjects.design,
      q: `각 스트링 전류가 ${stringCurrent} A인 동일 스트링 ${strings}개를 병렬 연결할 때 합성 전류는?`,
      answer: `${total} A`,
      wrong: [`${total + stringCurrent} A`, `${total + strings} A`, `${Math.max(1, total - stringCurrent)} A`],
      exp: `동일 스트링의 병렬 연결에서는 전류가 합산되므로 ${strings}×${stringCurrent}=${total} A이다.`,
    });
  }

  for (let n = 0; n < 20; n += 1) {
    const capacity = 20 + n * 5;
    const hours = 3 + (n % 5) * 0.5;
    const ratio = 0.72 + (n % 4) * 0.04;
    const energy = Math.round(capacity * hours * ratio * 10) / 10;
    addNumeric({
      id: 901 + n,
      subject: subjects.review,
      q: `설비용량 ${capacity} kW, 등가발전시간 ${hours}시간, 종합손실 반영계수 ${ratio}일 때 하루 예상 발전량은?`,
      answer: `${energy} kWh`,
      wrong: [`${Math.round(energy * 0.8 * 10) / 10} kWh`, `${Math.round(energy * 1.1 * 10) / 10} kWh`, `${Math.round(energy * 1.25 * 10) / 10} kWh`],
      exp: `예상 발전량은 설비용량×등가발전시간×손실 반영계수이므로 ${capacity}×${hours}×${ratio}=${energy} kWh이다.`,
    });
  }

  for (let n = 0; n < 20; n += 1) {
    const input = 10 + n * 2;
    const efficiency = 92 + (n % 7);
    const output = Math.round(input * efficiency) / 100;
    addNumeric({
      id: 921 + n,
      subject: subjects.design,
      q: `인버터 DC 입력이 ${input} kW이고 변환효율이 ${efficiency}%일 때 AC 출력은?`,
      answer: `${output} kW`,
      wrong: [`${input} kW`, `${Math.round(input * (100 - efficiency)) / 100} kW`, `${Math.round((input + efficiency / 10) * 100) / 100} kW`],
      exp: `AC 출력은 DC 입력×효율이므로 ${input}×${efficiency / 100}=${output} kW이다.`,
    });
  }

  for (let n = 0; n < 20; n += 1) {
    const operating = 300 + n * 20;
    const drop = 3 + (n % 8);
    const percent = Math.round((drop / operating) * 10000) / 100;
    addNumeric({
      id: 941 + n,
      subject: n % 2 ? subjects.build : subjects.design,
      q: `회로의 운전전압이 ${operating} V이고 배선 전압강하가 ${drop} V일 때 전압강하율은?`,
      answer: `${percent}%`,
      wrong: [`${Math.round(percent * 0.7 * 100) / 100}%`, `${Math.round(percent * 1.3 * 100) / 100}%`, `${Math.round(percent * 1.8 * 100) / 100}%`],
      exp: `전압강하율은 (전압강하/운전전압)×100이므로 (${drop}/${operating})×100=${percent}%이다.`,
    });
  }

  if (Q.length !== 960) throw new Error(`문제은행 생성 오류: ${Q.length}문제`);
  window.studyBankInfo = {
    total: Q.length,
    original: original.length,
    conceptApplications: 560,
    numericApplications: 120,
    symbols,
  };
})();
