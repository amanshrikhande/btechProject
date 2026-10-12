import requests
import json

payload = {
    "message": "explain the code",
    "project_id": "6a9506fed3cfeb66dd74c7c8",
    "active_file_name": "main.py",
    "condition": "RAG"
}

r = requests.post("http://127.0.0.1:8000/api/chat", json=payload)
data = r.json()
print("STATUS:", data.get("status"))
print("RESPONSE:", repr(data.get("response")))
print("DIAGNOSTICS:", json.dumps(data.get("diagnostics"), indent=2))
print("WARNING:", data.get("warning"))
