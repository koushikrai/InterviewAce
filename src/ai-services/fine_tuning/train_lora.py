import argparse
import json
from typing import List, Dict, Any

import torch
from torch.utils.data import Dataset, DataLoader


class JsonlDataset(Dataset):
    def __init__(self, path: str):
        self.items: List[Dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                self.items.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.items[idx]


def simple_vectorize(text: str, vocab: Dict[str, int]) -> torch.Tensor:
    vec = torch.zeros(len(vocab), dtype=torch.float32)
    for token in text.lower().split():
        if token in vocab:
            vec[vocab[token]] += 1.0
    return vec


def build_vocab(ds: JsonlDataset, max_tokens: int = 5000) -> Dict[str, int]:
    from collections import Counter
    c = Counter()
    for item in ds.items:
        for token in (item.get("text") or "").lower().split():
            c[token] += 1
    vocab = {tok: i for i, (tok, _) in enumerate(c.most_common(max_tokens))}
    return vocab


def labels_to_index(ds: JsonlDataset) -> Dict[str, int]:
    labels = sorted({(it.get("label") or "general") for it in ds.items})
    return {label: i for i, label in enumerate(labels)}


class TinyClassifier(torch.nn.Module):
    def __init__(self, input_dim: int, num_labels: int):
        super().__init__()
        self.linear = torch.nn.Linear(input_dim, num_labels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear(x)


def train_classifier(train_path: str, val_path: str, output_dir: str) -> None:
    train_ds = JsonlDataset(train_path)
    val_ds = JsonlDataset(val_path)
    vocab = build_vocab(train_ds)
    label_map = labels_to_index(train_ds)
    num_labels = len(label_map)

    model = TinyClassifier(len(vocab), num_labels)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)
    loss_fn = torch.nn.CrossEntropyLoss()

    def collate(batch):
        xs = [simple_vectorize(it.get("text") or "", vocab) for it in batch]
        ys = [label_map.get(it.get("label") or "general", 0) for it in batch]
        return torch.stack(xs), torch.tensor(ys, dtype=torch.long)

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, collate_fn=collate)
    val_loader = DataLoader(val_ds, batch_size=64, shuffle=False, collate_fn=collate)

    for epoch in range(5):
        model.train()
        total = 0.0
        for x, y in train_loader:
            opt.zero_grad()
            logits = model(x)
            loss = loss_fn(logits, y)
            loss.backward()
            opt.step()
            total += loss.item()
        model.eval()
        correct = 0
        count = 0
        with torch.no_grad():
            for x, y in val_loader:
                logits = model(x)
                pred = torch.argmax(logits, dim=1)
                correct += (pred == y).sum().item()
                count += y.size(0)
        acc = (correct / max(count, 1)) * 100.0
        print(f"epoch {epoch+1} train_loss={total/len(train_loader):.4f} val_acc={acc:.2f}")

    import os
    os.makedirs(output_dir, exist_ok=True)
    torch.save({
        "state_dict": model.state_dict(),
        "vocab": vocab,
        "label_map": label_map,
    }, os.path.join(output_dir, "tiny_classifier.pt"))
    print(f"Saved classifier to {output_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--task", choices=["classification"], default="classification")
    args = parser.parse_args()

    if args.task == "classification":
        train_classifier(args.train, args.val, args.output_dir)


if __name__ == "__main__":
    main()


