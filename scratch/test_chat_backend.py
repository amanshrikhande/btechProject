import urllib.request
import json

payload = {
    "message": "Explain step-by-step how main.py connects to the rest of the project",
    "projectId": "6a8afcb61aec3360c2bde4f1",
    "activeFileName": "main.py",
    "activeCode": "def greet(name: str):\n    return f'Hello, {name}!'\n",
    "language": "python",
    "condition": "RAG"
}

req = urllib.request.Request(
    "http://localhost:5000/api/ai/chat",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("HTTP Status: 200")
        print("Success:", data.get("success"))
        print("Fallback:", data.get("data", {}).get("fallback"))
        print("Engine:", data.get("data", {}).get("engine"))
        print("Model:", data.get("data", {}).get("model"))
        print("\nResponse:\n" + data.get("data", {}).get("response", ""))
except Exception as e:
    print("Error:", e)
