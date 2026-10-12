import requests
import json

r = requests.post('http://127.0.0.1:8000/api/chat', json={
    'message': 'What is happening in this code?',
    'project_id': 'test_ll_contam_1',
    'active_file_name': 'main.py',
    'condition': 'RAG'
})
data = r.json()
print("STATUS:", data.get("status"))
print("RESPONSE:", data.get("response"))
print("DIAGNOSTICS:", json.dumps(data.get("diagnostics"), indent=2))
