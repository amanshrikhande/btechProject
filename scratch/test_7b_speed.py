import requests
import time

t0 = time.time()
resp = requests.post("http://127.0.0.1:11434/api/generate", json={
    "model": "qwen2.5-coder:7b",
    "prompt": "def add(a, b):\n",
    "stream": False,
    "options": {"num_predict": 50}
}, timeout=60)
elapsed = time.time() - t0
print(f"7B Status: {resp.status_code}, Elapsed: {elapsed:.2f}s")
if resp.status_code == 200:
    data = resp.json()
    print("Eval count:", data.get("eval_count"), "Tokens/s:", round(data.get("eval_count", 0) / (data.get("eval_duration", 1) / 1e9), 2))
