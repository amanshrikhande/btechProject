import httpx

client = httpx.Client(timeout=30.0)
resp = client.post('http://127.0.0.1:8000/api/rag/query', json={
    'projectId': '6ab017721a47a46d751af4b7',
    'query': 'How is user authentication and JWT login handled in this project?',
    'top_k': 5
})
print("Status:", resp.status_code)
data = resp.json()
print("Count:", data.get("count"))
for c in data.get("chunks", []):
    print(f"  #{c['rank']} {c['fileName']} (L{c['startLine']}-{c['endLine']}): score={c['score']}, sources={c.get('retrievalSources')}, summary={c.get('reasonSummary')}")
