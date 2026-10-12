import requests
import json

payload = {
    "message": "What is happening in this code?",
    "project_id": "6a9506fed3cfeb66dd74c7c8",
    "active_file_name": "main.py",
    "active_code": "",
    "condition": "RAG",
    "language": "python"
}

resp = requests.post("http://127.0.0.1:8000/api/chat", json=payload, timeout=90)
print("HTTP Status:", resp.status_code)
data = resp.json()
print("Response JSON:")
print(json.dumps(data, indent=2))
