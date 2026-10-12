import requests
import json
import time

AI_SERVICE_URL = "http://127.0.0.1:8000"
proj_id = f"test_debug_ll_{int(time.time())}"

linked_list_code = """class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

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
            nxt = current.next
            current.next = prev
            prev = current
            current = nxt
        self.head = prev
"""

idx = requests.post(f"{AI_SERVICE_URL}/api/rag/index", json={
    "projectId": proj_id,
    "files": [{
        "fileId": "file_ll_main",
        "projectId": proj_id,
        "fileName": "main.py",
        "filePath": "/main.py",
        "language": "python",
        "content": linked_list_code
    }]
}).json()

chat_payload = {
    "message": "What is happening in this code?",
    "project_id": proj_id,
    "active_file_name": "main.py",
    "active_code": "def temporary_scratch():\n    return 'not linked list'\n",
    "language": "python",
    "condition": "RAG",
    "chat_history": [
        {"role": "user", "content": "How do I configure AuthService and UserRepository for login?"},
        {"role": "assistant", "content": "AuthService uses Redis for caching tokens in database.user_repository.py"},
        {"role": "user", "content": "Is PaymentService connected to Redis?"}
    ]
}

chat_res = requests.post(f"{AI_SERVICE_URL}/api/chat", json=chat_payload).json()
print("CHAT STATUS:", chat_res.get("status"))
print("CHAT DIAGNOSTICS:", json.dumps(chat_res.get("diagnostics"), indent=2))
print("CHAT CLAIMS:", json.dumps(chat_res.get("claims"), indent=2))
print("CHAT RESPONSE:", repr(chat_res.get("response")))
