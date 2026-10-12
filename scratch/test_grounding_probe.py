import asyncio
import httpx
import json

SYSTEM_PROMPT = """You are DevShare's project-aware code analysis engine.

You are analyzing an existing software repository.

PROJECT EVIDENCE is the only authoritative source for claims about the user's project.

GROUNDING RULES:

1. Use ONLY the supplied PROJECT EVIDENCE when making claims about project files, functions, classes, modules, APIs, routes, databases, variables, dependencies, or behavior.
2. NEVER invent files, classes, functions, imports, modules, APIs, database models, variables, routes, or functionality.
3. Do not assume that a commonly used component exists merely because it would normally exist in a similar application.
4. If something is not present in the supplied evidence, explicitly state that it is not established by the evidence.
5. Every project-specific claim must be traceable to supplied evidence.
6. Do not use previous conversation content as evidence for the current repository.
7. If the supplied evidence is insufficient to answer the question, return INSUFFICIENT_EVIDENCE rather than guessing.
8. Never fabricate citations.
9. Never fabricate file paths or line numbers.
10. Never reference a fileId that does not appear in the supplied evidence.

IMPORTANT:
The language model is an interpreter of repository evidence.
It is NOT the source of truth about repository structure.

You MUST respond ONLY with valid JSON. No markdown, no prose outside JSON.
For an explanation:
{
  "status": "ANSWER",
  "summary": "...",
  "claims": [
    {
      "text": "...",
      "evidence": [
        {
          "fileId": "6a9506fed3cfeb66dd74c7ca",
          "filePath": "/main.py",
          "startLine": 3,
          "endLine": 6
        }
      ]
    }
  ]
}

If the question asks about something not in the evidence (e.g. auth, redis, payments):
{
  "status": "INSUFFICIENT_EVIDENCE",
  "summary": "...",
  "claims": []
}
"""

USER_PROMPT = """PROJECT EVIDENCE:

--- FILE: /main.py (File ID: 6a9506fed3cfeb66dd74c7ca, Lines 3-6) | Symbol: Node ---
```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None
```

--- FILE: /main.py (File ID: 6a9506fed3cfeb66dd74c7ca, Lines 8-41) | Symbol: LinkedList ---
```python
class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        last = self.head
        while last.next:
            last = last.next
        last.next = new_node

    def reverse(self):
        prev = None
        current = self.head
        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        self.head = prev
```

--- FILE: /main.py (File ID: 6a9506fed3cfeb66dd74c7ca, Lines 42-57) | Symbol: example_usage ---
```python
# Example usage of LinkedList:
linked_list = LinkedList()
linked_list.append(1)
linked_list.append(2)
linked_list.append(3)
linked_list.append(4)
linked_list.reverse()
```

ANALYZER SIGNALS:
None

USER QUERY:
What is happening in this code?
"""

async def run_probe():
    payload = {
        "model": "qwen2.5-coder:1.5b",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT}
        ],
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.05,
            "top_p": 0.9,
            "num_predict": 280
        }
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post("http://127.0.0.1:11434/api/chat", json=payload)
        print("Status code:", resp.status_code)
        data = resp.json()
        content = data.get("message", {}).get("content")
        print("\n--- RAW OLLAMA JSON RESPONSE ---")
        print(content)
        
        # Test parsing
        parsed = json.loads(content)
        print("\nParsed status:", parsed.get("status"))
        print("Summary:", parsed.get("summary"))
        print("Claims count:", len(parsed.get("claims", [])))
        
        # Check for any hallucinated words
        hallucinations = ["authservice", "userrepository", "logger", "create_auth_service", "auth.service", "database.user_repository", "utils.logger", "login"]
        found = [h for h in hallucinations if h in content.lower()]
        print("Hallucinations found:", found if found else "NONE (100% GROUNDED)")

asyncio.run(run_probe())
