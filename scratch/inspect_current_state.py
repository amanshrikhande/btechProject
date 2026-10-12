from pymongo import MongoClient
from bson import ObjectId

def inspect():
    client = MongoClient("mongodb://127.0.0.1:27017")
    db = client["devshare"]
    files = list(db["projectfiles"].find({"projectId": ObjectId("6a9506fed3cfeb66dd74c7c8")}).limit(10))
    print("Files found in project 6a9506fed3cfeb66dd74c7c8:")
    for f in files:
        print(f"ID: {f['_id']}, Name: {f.get('name')}, Path: {f.get('path')}")
        print("Content preview (first 10 lines):")
        lines = (f.get("content") or "").split("\n")[:10]
        for l in lines:
            print("  ", l)
        print("-" * 50)

inspect()
