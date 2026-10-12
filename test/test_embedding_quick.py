import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ai_service"))

print("Testing embedding engine...")
from app.rag.embeddings import embedding_engine

status = embedding_engine.get_status()
print(f"\nModel: {status['model_name']}")
print(f"Loaded: {status['model_loaded']}")
print(f"Fallback: {status['using_fallback']}")
print(f"Semantic: {status['semantic_search_enabled']}")
if status['load_error']:
    print(f"Error: {status['load_error']}")

if status['model_loaded']:
    print("\n✓ Model loaded successfully!")
    test_text = "def calculate_sum(a, b): return a + b"
    emb = embedding_engine.embed_query(test_text)
    print(f"✓ Generated embedding: dim={len(emb)}, norm={sum(x**2 for x in emb)**0.5:.4f}")
else:
    print("\n⚠ Model not loaded, using hash fallback")
