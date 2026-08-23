# DevShare Python AI & ML Microservice

This microservice powers DevShare's intelligence layer:
1. **CodeBERT ML Defect Classifier**: Pretrained PyTorch transformer predicting code health classes (`NO_ISSUE`, `LOGIC_ERROR`, `RUNTIME_ERROR`, `PERFORMANCE_ISSUE`, `SECURITY_ISSUE`).
2. **Project-Aware RAG**: Uses SentenceTransformers and ChromaDB to vector-index project files and retrieve cross-file code snippets.
3. **Local Coding LLM**: Queries a local Ollama instance (default `qwen2.5-coder:7b` or `deepseek-coder:6.7b`) with synthesized context.

## Setup & Running

```bash
# 1. Create Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start FastAPI service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Training CodeBERT Classifier

```bash
python -m app.ml.train
```

## Ollama Local LLM

Install Ollama from [ollama.com](https://ollama.com) and pull your preferred coding model:
```bash
ollama run qwen2.5-coder:7b
```
