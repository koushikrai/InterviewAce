import os
import json
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# 1. Model and Tokenizer Configuration
base_model = "meta-llama/Llama-2-7b-chat-hf"  # You can choose a different base model
new_model = "llama-2-7b-interview-ace"
tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# 2. Quantization Configuration
quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=False,
)

# 3. Load Base Model
model = AutoModelForCausalLM.from_pretrained(
    base_model,
    quantization_config=quant_config,
    device_map={"": 0},
)
model.config.use_cache = False
model.config.pretraining_tp = 1

# 4. LoRA Configuration
lora_config = LoraConfig(
    r=64,
    lora_alpha=16,
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)

# 5. Load and Format Dataset
def format_instruction(sample):
    return f"""### Instruction:
Analyze the following resume and return a JSON object with the extracted information.

### Input:
{sample["resume_text"]}

### Response:
{json.dumps(sample["ideal_analysis"])}"""

dataset = load_dataset("json", data_files="train_dataset.jsonl", split="train")

# 6. Training Arguments
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=1,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=1,
    evaluation_strategy="steps",
    eval_steps=100,
    logging_steps=10,
    optim="paged_adamw_32bit",
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    save_steps=100,
    warmup_ratio=0.05,
    weight_decay=0.001,
    max_steps=-1,
)

# 7. Initialize Trainer
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=lora_config,
    dataset_text_field="resume_text",  # rreplac this by the formatted instruction
    formatting_func=format_instruction,
    max_seq_length=1024,
    tokenizer=tokenizer,
    args=training_args,
)

# 8. Start Training
trainer.train()

# 9. Save the Fine-Tuned Model
trainer.model.save_pretrained(new_model)

print("LoRA model training complete and saved.")
