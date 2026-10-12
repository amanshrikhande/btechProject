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

q_res = requests.post(f"{AI_SERVICE_URL}/api/rag/query", json={
    "projectId": proj_id,
    "query": "What is happening in this code?",
    "top_k": 3
}).json()

print("QUERY CHUNKS COUNT:", len(q_res.get("chunks", [])))
for i, c in enumerate(q_res.get("chunks", [])):
    print(f"Chunk {i} keys:", list(c.keys()))
    print(f"Chunk {i} content:", repr(c.get("content", c.get("text", c.get("snippet", "")))[:60]))
