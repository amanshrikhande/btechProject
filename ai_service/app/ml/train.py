import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, get_linear_schedule_with_warmup
from model import CodeBERTClassifier, DEFECT_CLASSES
from dataset import BENCHMARK_CODE_SAMPLES, CodeDefectDataset

def train_classifier(
    epochs: int = 5,
    batch_size: int = 4,
    learning_rate: float = 2e-5,
    output_dir: str = "./saved_models",
):
    os.makedirs(output_dir, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Training] Using compute device: {device}")

    # Load Tokenizer & Model
    try:
        tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
        model = CodeBERTClassifier(num_classes=len(DEFECT_CLASSES))
    except Exception as e:
        print(f"[Training Error] HuggingFace offline or unreachable: {e}")
        return

    model.to(device)

    # Prepare Dataset & DataLoader
    dataset = CodeDefectDataset(BENCHMARK_CODE_SAMPLES, tokenizer)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01)
    criterion = nn.CrossEntropyLoss()
    total_steps = len(dataloader) * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=int(total_steps * 0.1), num_training_steps=total_steps)

    print(f"[Training] Starting CodeBERT fine-tuning over {epochs} epochs ({len(dataset)} samples)...")

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for batch in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["label"].to(device)

            optimizer.zero_grad()
            logits = model(input_ids, attention_mask)
            loss = criterion(logits, labels)
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()

            total_loss += loss.item()
            preds = torch.argmax(logits, dim=-1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        epoch_acc = (correct / total) * 100 if total > 0 else 0
        avg_loss = total_loss / len(dataloader)
        print(f"[Epoch {epoch + 1}/{epochs}] Loss: {avg_loss:.4f} | Training Accuracy: {epoch_acc:.2f}%")

    # Save model weights
    save_path = os.path.join(output_dir, "codebert_classifier.pt")
    torch.save(model.state_dict(), save_path)
    print(f"[Training Complete] Checkpoint saved successfully to: {save_path}")

if __name__ == "__main__":
    train_classifier()
