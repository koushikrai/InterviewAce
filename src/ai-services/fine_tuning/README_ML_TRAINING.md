# ML Resume Parser Training Guide

This guide explains how to train and use the ML-based resume parser that works as a primary parser with AI fallback.

## Overview

The ML model performs multi-task learning:
- **Skills extraction**: Multi-label classification (predicts which skills are present)
- **Quality score**: Regression (predicts resume quality score 0-100)

## Prerequisites

1. Install dependencies:
```bash
cd src/ai-services
pip install -r requirements.txt
```

2. Ensure you have the dataset:
   - `Datasets/master_resumes.jsonl` (in project root)

## Step 1: Prepare Dataset

Transform the raw resume JSONL into training examples:

```bash
cd src/ai-services/fine_tuning
python prepare_resume_dataset.py \
    --input ../../../Datasets/master_resumes.jsonl \
    --output ../../../Datasets/resume_scores_train.jsonl \
    --val_output ../../../Datasets/resume_scores_val.jsonl \
    --val_split 0.2
```

This will:
- Extract skills, experience, education, and calculate quality scores
- Split into 80% train / 20% validation
- Save as JSONL files

## Step 2: Train Model

Train the multi-task resume parser:

```bash
python train_lora.py \
    --train ../../../Datasets/resume_scores_train.jsonl \
    --val ../../../Datasets/resume_scores_val.jsonl \
    --output_dir ../../models/resume_parser_ml \
    --task resume_parsing
```

Training will:
- Run for 10 epochs
- Save best model based on validation loss
- Output: `src/ai-services/models/resume_parser_ml/model.pt`

## Step 3: Use ML Parser

Once trained, the resume parser service will automatically:
1. **Try ML parser first** (if model exists)
2. **Check confidence** (threshold: 0.7)
3. **Fallback to AI** if ML confidence is low or model unavailable
4. **Final fallback** to dummy data if AI fails

No code changes needed - the service detects the model automatically!

## Model Architecture

- **Input**: Bag-of-words vectorization of resume text (5000 vocab)
- **Encoder**: 2-layer MLP (5000 → 256 → 128)
- **Skills Head**: Linear layer → sigmoid (multi-label classification)
- **Score Head**: Linear layer → regression (0-100)

## Training Output

The model saves:
- `model.pt`: PyTorch checkpoint with:
  - Model state dict
  - Vocabulary (text tokens)
  - Skill vocabulary (skill names → indices)
  - Training metadata

## Troubleshooting

### Model not loading?
- Check path: `src/ai-services/models/resume_parser_ml/model.pt`
- Ensure torch is installed: `pip install torch>=2.0.0`

### Low confidence scores?
- Model may need more training data
- Try adjusting confidence threshold in `resume_parser.py` (line ~330)

### Out of memory?
- Reduce batch size in `train_lora.py` (line ~73)
- Use smaller vocab size (line ~39)

## Next Steps

- **Phase 4**: Upgrade to LoRA fine-tuning on DistilBERT for better accuracy
- **Expand tasks**: Add experience/education extraction to ML model
- **Fine-tune**: Use your own resume data for domain adaptation

