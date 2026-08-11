"""Audit public CBT explanations against the supplied teacher answer keys.

This is a private review aid. Downloaded comments are never published by this
script; the generated JSON is ignored by git.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATES = ["20200822", "20200606", "20190921", "20190427", "20190303", "20180915",
         "20170507", "20170305", "20161001", "20160508", "20150531", "20140302"]


def clean(fragment: str) -> str:
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"[ \t]+", " ", html.unescape(fragment)).strip()


def load_actual_exams() -> dict[str, list[dict]]:
    source = (ROOT / "actual-exams.js").read_text(encoding="utf-8")
    payload = source.removeprefix("window.ACTUAL_EXAMS=").rstrip().removesuffix(";")
    return {exam["date"]: exam["questions"] for exam in json.loads(payload)}


def fetch(date: str) -> str:
    request = Request(f"https://cbtbank.kr/exam/fi{date}", headers={"User-Agent": "Mozilla/5.0"})
    return urlopen(request, timeout=45).read().decode("utf-8", "replace")


def parse_page(date: str, source: str) -> list[dict]:
    starts = list(re.finditer(rf'question-id="fi{date}-(\d+)"', source))
    rows = []
    for index, match in enumerate(starts):
        number = int(match.group(1))
        end = starts[index + 1].start() if index + 1 < len(starts) else len(source)
        block = source[match.start():end]
        correct = re.search(r'<ol[^>]+correct="(\d+)"', block)
        title = re.search(r'<p class="exam-title">(.*?)</p>', block, re.S)
        comments = []
        for item in re.findall(r"<li class='reply-item.*?</li>", block, re.S):
            nick = re.search(r"<span class='nick'>(.*?)</span>", item, re.S)
            body = re.search(r"<div class='reply-comment'>(.*?)</div>", item, re.S)
            if body:
                comments.append({"author": clean(nick.group(1)) if nick else "", "text": clean(body.group(1))})
        rows.append({"number": number, "question": clean(title.group(1)) if title else "",
                     "answer": int(correct.group(1)) - 1 if correct else None, "comments": comments})
    return rows


def main() -> None:
    actual = load_actual_exams()
    report = []
    for date in DATES:
        public_rows = {row["number"]: row for row in parse_page(date, fetch(date))}
        for question in actual[date]:
            public = public_rows.get(question["qnum"], {})
            comments = public.get("comments", [])
            report.append({"id": question["id"], "date": date, "number": question["qnum"],
                           "answer_pdf": question["a"], "answer_public": public.get("answer"),
                           "answer_matches": question["a"] == public.get("answer"),
                           "comment_count": len(comments),
                           "has_human_comment": any(c["author"] != "CBT문제은행AI" for c in comments),
                           "review_candidates": comments})
        print(date, len(public_rows), "questions")
    output = ROOT / "scripts" / "public-explanation-audit.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("rows", len(report))
    print("answer mismatches", sum(not row["answer_matches"] for row in report))
    print("with comments", sum(bool(row["comment_count"]) for row in report))
    print("with human comments", sum(row["has_human_comment"] for row in report))


if __name__ == "__main__":
    main()
