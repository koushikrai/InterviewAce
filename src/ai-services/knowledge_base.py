import os
import json
from typing import List, Dict, Any, Tuple
import math
import google.generativeai as genai


def _l2_norm(vector: List[float]) -> float:
    return math.sqrt(sum(v * v for v in vector)) or 1.0


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (_l2_norm(a) * _l2_norm(b))


def embed_text(text: str) -> List[float]:
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        vec = [0.0] * 64
        for i, ch in enumerate(text[:256]):
            vec[i % 64] += (ord(ch) % 97) / 97.0
        return vec
    try:
        result = genai.embed_content(model="text-embedding-004", content=text)
        return result["embedding"]  # type: ignore
    except Exception:
        vec = [0.0] * 64
        for i, ch in enumerate(text[:256]):
            vec[i % 64] += (ord(ch) % 97) / 97.0
        return vec


class KnowledgeBase:
    def __init__(self, docs_dir: str | None = None) -> None:
        self.docs: List[Dict[str, Any]] = []
        self.embeddings: List[List[float]] = []
        base_dir = docs_dir or os.path.join(os.path.dirname(__file__), "kb_docs")
        self._load_docs(base_dir)

    def _load_docs(self, directory: str) -> None:
        if not os.path.isdir(directory):
            return
        for name in os.listdir(directory):
            if not name.endswith(".json"):
                continue
            path = os.path.join(directory, name)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    doc = json.load(f)
                    text = doc.get("text") or ""
                    vec = embed_text(text[:4000])
                    self.docs.append(doc)
                    self.embeddings.append(vec)
            except Exception as e:
                print(f"KB load failed for {name}: {e}")

    def retrieve(self, query: str, top_k: int = 3, role_hint: str | None = None):
        if not self.docs or not query:
            return []
        qvec = embed_text(query[:4000])
        scored: List[Tuple[float, int]] = []
        for idx, vec in enumerate(self.embeddings):
            score = cosine_similarity(qvec, vec)
            if role_hint:
                title = (self.docs[idx].get("role") or "").lower()
                if role_hint.lower() in title:
                    score += 0.05
            scored.append((score, idx))
        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, idx in scored[:top_k]:
            item = dict(self.docs[idx])
            item["_similarity"] = round(float(score), 4)
            results.append(item)
        return results


