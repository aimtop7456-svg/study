import argparse
import json
import re
import sys
from pathlib import Path

import pdfplumber


MARKERS = "①②③④❶❷❸❹"
MARKER_TO_INDEX = {char: index % 4 for index, char in enumerate(MARKERS)}
CORRECT_MARKERS = set("❶❷❸❹")
QUESTION_START = re.compile(r"(?m)^(\d{1,2})\.\s+")
DATE_PATTERN = re.compile(r"(20\d{6})")
FIGURE_PATTERN = re.compile(r"그림|회로도|결선도|특성곡선|배선도|단선도|도면|다음 표|그래프")


def clean_text(value: str) -> str:
    value = re.sub(r"신재생에너지발전설비산업기사.*?(?:기출문제|CBT).*", " ", value)
    value = re.sub(r"최강 자격증.*", " ", value)
    value = re.sub(r"\d과목\s*:\s*[^\n]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def subject_for(number: int) -> str:
    if number <= 20:
        return "1과목 · 태양광 발전 시스템 이론"
    if number <= 40:
        return "2과목 · 태양광 발전 시스템 시공"
    if number <= 60:
        return "3과목 · 태양광 발전 시스템 운영"
    return "4과목 · 태양광 발전 시스템 법규"


def parse_segment(segment: str, number: int) -> dict:
    body = QUESTION_START.sub("", segment, count=1).strip()
    matches = list(re.finditer(f"[{MARKERS}]", body))
    if len(matches) < 4:
        raise ValueError(f"Q{number}: only {len(matches)} option markers")
    matches = matches[:4]
    question = clean_text(body[: matches[0].start()])
    options = []
    answer = None
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        option = clean_text(body[match.end() : end])
        options.append(option)
        if match.group() in CORRECT_MARKERS:
            answer = MARKER_TO_INDEX[match.group()]
    if answer is None:
        raise ValueError(f"Q{number}: correct marker missing")
    if not question:
        raise ValueError(f"Q{number}: empty question")
    needs_image = any(not option for option in options)
    options = [option or f"원문 이미지에서 보기 {symbols}" for option, symbols in zip(options, "①②③④")]
    return {"q": question, "opts": options, "a": answer, "needsImage": needs_image}


def question_regions(page, x0: float, x1: float):
    crop = page.crop((x0, 0, x1, page.height))
    words = crop.extract_words(x_tolerance=2, y_tolerance=3)
    starts = []
    for word in words:
        match = re.fullmatch(r"(\d{1,2})\.", word["text"])
        if match:
            starts.append((int(match.group(1)), max(0, word["top"] - 3)))
    starts.sort(key=lambda item: item[1])
    regions = {}
    for index, (number, top) in enumerate(starts):
        bottom = starts[index + 1][1] if index + 1 < len(starts) else page.height - 25
        regions[number] = (x0 + 4, max(0, top - 2), x1 - 4, min(page.height, bottom + 2))
    return regions


def parse_pdf(path: Path, image_root: Path, make_images: bool):
    date = DATE_PATTERN.search(path.name).group(1)
    chunks = []
    regions = {}
    page_by_question = {}
    with pdfplumber.open(path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            midpoint = page.width / 2
            for side, (x0, x1) in enumerate(((0, midpoint), (midpoint, page.width))):
                text = page.crop((x0, 0, x1, page.height)).extract_text(x_tolerance=2, y_tolerance=3) or ""
                chunks.append(text)
                for number, bbox in question_regions(page, x0, x1).items():
                    regions[number] = bbox
                    page_by_question[number] = page_index

        combined = "\n".join(chunks)
        matches = list(QUESTION_START.finditer(combined))
        parsed = {}
        errors = []
        for index, match in enumerate(matches):
            number = int(match.group(1))
            if not 1 <= number <= 80 or number in parsed:
                continue
            end = matches[index + 1].start() if index + 1 < len(matches) else len(combined)
            try:
                parsed[number] = parse_segment(combined[match.start() : end], number)
            except ValueError as exc:
                errors.append(str(exc))

        missing = sorted(set(range(1, 81)) - set(parsed))
        if missing or errors:
            raise ValueError(f"{path.name}: missing={missing}; errors={errors[:8]}")

        exam_questions = []
        output_dir = image_root / date
        if make_images:
            output_dir.mkdir(parents=True, exist_ok=True)
        for number in range(1, 81):
            item = parsed[number]
            image_path = f"assets/exams/{date}/q{number:02d}.webp"
            if make_images:
                page = pdf.pages[page_by_question[number]]
                bbox = regions[number]
                page.crop(bbox).to_image(resolution=105, antialias=True).save(
                    image_root.parent.parent / image_path,
                    format="WEBP",
                    quality=68,
                )
            exam_questions.append(
                {
                    "id": f"actual-{date}-{number:02d}",
                    "examDate": date,
                    "qnum": number,
                    "subject": subject_for(number),
                    "q": item["q"],
                    "opts": item["opts"],
                    "a": item["a"],
                    "exp": "교사용 기출 PDF에 표시된 정답을 기준으로 채점합니다.",
                    "tag": "실제 기출",
                    "source": f"{date[:4]}-{date[4:6]}-{date[6:]} 교사용 기출 PDF",
                    "image": image_path,
                    "hasFigure": item["needsImage"] or bool(FIGURE_PATTERN.search(item["q"])),
                }
            )
    return {"date": date, "title": f"{date[:4]}-{date[4:6]}-{date[6:]}", "questions": exam_questions}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--no-images", action="store_true")
    args = parser.parse_args()

    pdfs = sorted(args.input.glob("신재생에너지발전설비산업기사*(교사용).pdf"))
    if len(pdfs) != 12:
        raise SystemExit(f"Expected 12 PDFs, found {len(pdfs)}")
    exams = [parse_pdf(path, args.assets, not args.no_images) for path in pdfs]
    payload = json.dumps(exams, ensure_ascii=False, separators=(",", ":"))
    args.output.write_text(f"window.ACTUAL_EXAMS={payload};\n", encoding="utf-8")
    count = sum(len(exam["questions"]) for exam in exams)
    print(json.dumps({"pdfs": len(exams), "questions": count, "dates": [exam["date"] for exam in exams]}, ensure_ascii=False))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
