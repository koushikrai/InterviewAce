import argparse
import json
import os
from typing import List, Dict, Any, Set
from collections import Counter

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


def build_skill_vocab(ds: JsonlDataset, min_count: int = 2) -> Dict[str, int]:
    """Build vocabulary of skills from dataset."""
    skill_counter = Counter()
    for item in ds.items:
        skills = item.get("skills", [])
        if isinstance(skills, list):
            for skill in skills:
                if skill and isinstance(skill, str):
                    skill_counter[skill.lower()] += 1
    
    # Filter by min_count and take top skills
    filtered_skills = {skill: count for skill, count in skill_counter.items() 
                      if count >= min_count}
    # Sort by frequency and take top 200
    top_skills = sorted(filtered_skills.items(), key=lambda x: x[1], reverse=True)[:200]
    vocab = {skill: i for i, (skill, _) in enumerate(top_skills)}
    return vocab


class TinyResumeParser(torch.nn.Module):
    """Multi-task model for resume parsing: skills extraction + score prediction."""
    def __init__(self, input_dim: int, num_skills: int):
        super().__init__()
        # Shared encoder
        self.encoder = torch.nn.Sequential(
            torch.nn.Linear(input_dim, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(256, 128),
            torch.nn.ReLU()
        )
        # Task heads
        self.skills_head = torch.nn.Linear(128, num_skills)  # Multi-label classification
        self.score_head = torch.nn.Linear(128, 1)  # Regression
    
    def forward(self, x: torch.Tensor) -> tuple:
        encoded = self.encoder(x)
        skills_logits = self.skills_head(encoded)
        score = self.score_head(encoded)
        return skills_logits, score.squeeze(-1)


def train_resume_parser(train_path: str, val_path: str, output_dir: str) -> None:
    """Train multi-task resume parser model."""
    print("Loading datasets...")
    train_ds = JsonlDataset(train_path)
    val_ds = JsonlDataset(val_path)
    
    print("Building vocabularies...")
    vocab = build_vocab(train_ds, max_tokens=5000)
    skill_vocab = build_skill_vocab(train_ds, min_count=2)
    num_skills = len(skill_vocab)
    
    print(f"Vocabulary size: {len(vocab)}")
    print(f"Skill vocabulary size: {num_skills}")
    
    model = TinyResumeParser(len(vocab), num_skills)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)
    skills_loss_fn = torch.nn.BCEWithLogitsLoss()
    score_loss_fn = torch.nn.MSELoss()
    
    def collate(batch):
        xs = [simple_vectorize(it.get("text") or "", vocab) for it in batch]
        
        # Skills: multi-label binary targets
        skills_targets = []
        for it in batch:
            skills = it.get("skills", [])
            target = torch.zeros(num_skills)
            if isinstance(skills, list):
                for skill in skills:
                    skill_lower = skill.lower() if isinstance(skill, str) else ""
                    if skill_lower in skill_vocab:
                        target[skill_vocab[skill_lower]] = 1.0
            skills_targets.append(target)
        
        # Score: regression target
        scores = [float(it.get("score", 0)) for it in batch]
        
        return (torch.stack(xs), 
                torch.stack(skills_targets), 
                torch.tensor(scores, dtype=torch.float32))
    
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, collate_fn=collate)
    val_loader = DataLoader(val_ds, batch_size=64, shuffle=False, collate_fn=collate)
    
    print("Starting training...")
    best_val_loss = float('inf')
    
    for epoch in range(10):
        model.train()
        total_skills_loss = 0.0
        total_score_loss = 0.0
        total_loss = 0.0
        
        for x, skills_target, score_target in train_loader:
            opt.zero_grad()
            skills_logits, score_pred = model(x)
            
            # Multi-task loss: weighted combination
            skills_loss = skills_loss_fn(skills_logits, skills_target)
            score_loss = score_loss_fn(score_pred, score_target)
            loss = 0.7 * skills_loss + 0.3 * score_loss
            
            loss.backward()
            opt.step()
            
            total_skills_loss += skills_loss.item()
            total_score_loss += score_loss.item()
            total_loss += loss.item()
        
        # Validation
        model.eval()
        val_skills_loss = 0.0
        val_score_loss = 0.0
        val_total = 0.0
        score_mae = 0.0
        score_count = 0
        
        with torch.no_grad():
            for x, skills_target, score_target in val_loader:
                skills_logits, score_pred = model(x)
                
                skills_loss = skills_loss_fn(skills_logits, skills_target)
                score_loss = score_loss_fn(score_pred, score_target)
                loss = 0.7 * skills_loss + 0.3 * score_loss
                
                val_skills_loss += skills_loss.item()
                val_score_loss += score_loss.item()
                val_total += loss.item()
                
                # Calculate MAE for score
                score_mae += torch.abs(score_pred - score_target).sum().item()
                score_count += score_target.size(0)
        
        avg_train_loss = total_loss / len(train_loader)
        avg_val_loss = val_total / len(val_loader)
        avg_score_mae = score_mae / max(score_count, 1)
        
        print(f"Epoch {epoch+1}/10:")
        print(f"  Train - Skills Loss: {total_skills_loss/len(train_loader):.4f}, "
              f"Score Loss: {total_score_loss/len(train_loader):.4f}, "
              f"Total: {avg_train_loss:.4f}")
        print(f"  Val - Skills Loss: {val_skills_loss/len(val_loader):.4f}, "
              f"Score Loss: {val_score_loss/len(val_loader):.4f}, "
              f"Total: {avg_val_loss:.4f}, Score MAE: {avg_score_mae:.2f}")
        
        # Save best model
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            os.makedirs(output_dir, exist_ok=True)
            torch.save({
                "state_dict": model.state_dict(),
                "vocab": vocab,
                "skill_vocab": skill_vocab,
                "num_skills": num_skills,
                "input_dim": len(vocab),
                "epoch": epoch + 1,
                "val_loss": avg_val_loss,
                "score_mae": avg_score_mae
            }, os.path.join(output_dir, "model.pt"))
            print(f"  Saved best model (val_loss={avg_val_loss:.4f})")
    
    print(f"\nTraining complete! Model saved to {output_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--task", choices=["classification", "resume_parsing"], 
                       default="classification")
    args = parser.parse_args()

    if args.task == "classification":
        train_classifier(args.train, args.val, args.output_dir)
    elif args.task == "resume_parsing":
        train_resume_parser(args.train, args.val, args.output_dir)


if __name__ == "__main__":
    main()


