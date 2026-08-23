import torch
from torch.utils.data import Dataset
from typing import List, Dict, Tuple

# Curated benchmark training dataset samples for code defect classification
BENCHMARK_CODE_SAMPLES = [
    # NO_ISSUE
    ("function add(a, b) { return a + b; }", 0),
    ("def fibonacci(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a", 0),
    ("class Stack:\n    def __init__(self):\n        self.items = []\n    def push(self, val):\n        self.items.append(val)\n    def pop(self):\n        return self.items.pop() if self.items else None", 0),
    ("const users = ['alice', 'bob'];\nusers.forEach(u => console.log(u.toUpperCase()));", 0),
    
    # LOGIC_ERROR
    ("function isEven(n) { if (n % 2 == 1) return true; else return false; }", 1),
    ("def calculateDiscount(price, discount):\n    return price + (price * discount)", 1),
    ("function search(arr, target) {\n  for (let i = 0; i <= arr.length; i++) {\n    if (arr[i] === target) return false;\n  }\n  return true;\n}", 1),
    ("def findMax(a, b):\n    if a > b:\n        return b\n    return a", 1),

    # RUNTIME_ERROR
    ("function parseData(jsonStr) {\n  const data = JSON.parse(jsonStr);\n  return data.user.profile.details.age;\n}", 2),
    ("def divideList(numbers, divisor):\n    return [n / divisor for n in numbers]\nprint(divideList([1, 2, 3], 0))", 2),
    ("const arr = null;\nconsole.log(arr.map(x => x * 2));", 2),
    ("int main() { int* ptr = NULL; *ptr = 10; return 0; }", 2),

    # PERFORMANCE_ISSUE
    ("def fib_slow(n):\n    if n <= 1: return n\n    return fib_slow(n-1) + fib_slow(n-2)", 3),
    ("function findDuplicates(arr) {\n  let duplicates = [];\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = 0; j < arr.length; j++) {\n      if (i !== j && arr[i] === arr[j]) duplicates.push(arr[i]);\n    }\n  }\n  return duplicates;\n}", 3),
    ("def slowSearch(items, target):\n    for i in range(len(items)):\n        for j in range(len(items)):\n            if items[i] == target: return True\n    return False", 3),

    # SECURITY_ISSUE
    ("function executeUserQuery(userInput) {\n  return eval('(' + userInput + ')');\n}", 4),
    ("def runCommand(param):\n    import os\n    os.system('cat ' + param)", 4),
    ("const query = `SELECT * FROM users WHERE email = '${userSuppliedInput}'`;\ndb.execute(query);", 4),
    ("import pickle\ndef loadUserData(raw_bytes):\n    return pickle.loads(raw_bytes)", 4),
]

class CodeDefectDataset(Dataset):
    def __init__(self, samples: List[Tuple[str, int]], tokenizer, max_length: int = 256):
        self.samples = samples
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        code, label = self.samples[idx]
        if self.tokenizer:
            encoding = self.tokenizer(
                code,
                truncation=True,
                padding="max_length",
                max_length=self.max_length,
                return_tensors="pt",
            )
            return {
                "input_ids": encoding["input_ids"].squeeze(0),
                "attention_mask": encoding["attention_mask"].squeeze(0),
                "label": torch.tensor(label, dtype=torch.long),
            }
        else:
            return {
                "input_ids": torch.zeros(self.max_length, dtype=torch.long),
                "attention_mask": torch.ones(self.max_length, dtype=torch.long),
                "label": torch.tensor(label, dtype=torch.long),
            }
