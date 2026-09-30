import os
from jose import jwt
from dotenv import load_dotenv

load_dotenv()
secret = os.getenv("SUPABASE_JWT_SECRET")

# Create a test token
token = jwt.encode({"sub": "123", "role": "authenticated"}, secret, algorithm="HS256")
print("Encoded:", token)

# Decode it
try:
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    print("Decoded payload:", payload)
except Exception as e:
    print("Decode failed:", type(e).__name__, str(e))
