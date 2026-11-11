import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

PROVIDERS = {
    "groq": {
        "url": "https://api.groq.com/openai/v1/models",
        "key": os.getenv("GROQ_API_KEY"),
    },
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/models",
        "key": os.getenv("GEMINI_API_KEY"),
    },
    "nvidia": {
        "url": "https://integrate.api.nvidia.com/v1/models",
        "key": os.getenv("NVIDIA_API_KEY"),
    },
    "openrouter": {
        "url": "https://openrouter.ai/api/v1/models",
        "key": os.getenv("OPENROUTER_API_KEY"),
    },
}

async def check_key(name, p):
    if not p["key"]:
        return f"{name.upper()}: No API Key found in .env"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # We ping the /models endpoint to verify authorization without consuming chat tokens
            response = await client.get(
                p["url"],
                headers={"Authorization": f"Bearer {p['key']}"}
            )
            
            if response.status_code == 200:
                return f"{name.upper()}: Alive (Authorized)"
            elif response.status_code == 401:
                return f"{name.upper()}: Failed (Unauthorized/Invalid Key)"
            else:
                return f"{name.upper()}: Failed (Status: {response.status_code}, Response: {response.text[:50]})"
        except Exception as e:
            return f"{name.upper()}: Network Error ({str(e)})"

async def main():
    print("Checking API Keys...")
    tasks = [check_key(name, p) for name, p in PROVIDERS.items()]
    results = await asyncio.gather(*tasks)
    for result in results:
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
