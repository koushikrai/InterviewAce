import argparse
import json
from typing import Dict, Any


def transform(record: Dict[str, Any]) -> Dict[str, Any]:
    """Map raw record to supervised example.
    Expected keys (flexible): question, answer, score, categories -> {technical, communication, behavioral}
    Output: {text, label, score}
    """
    question = (record.get("question") or "").strip()
    answer = (record.get("answer") or record.get("userAnswer") or "").strip()
    text = f"Question: {question}\nAnswer: {answer}".strip()

    # derive label from categories (pick highest)
    label = "general"
    categories = record.get("categories") or {}
    if isinstance(categories, dict) and categories:
        label = max(categories, key=lambda k: categories.get(k) or 0)

    score = record.get("score") or 0
    try:
        score = int(score)
    except Exception:
        score = 0

    return {"text": text, "label": label, "score": score}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f_in, open(args.output, "w", encoding="utf-8") as f_out:
        for line in f_in:
            if not line.strip():
                continue
            raw = json.loads(line)
            ex = transform(raw)
            f_out.write(json.dumps(ex, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()


