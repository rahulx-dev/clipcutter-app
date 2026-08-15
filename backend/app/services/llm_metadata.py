import httpx
from app.core.config import settings

async def generate_metadata(transcript_text: str) -> dict:
    prompt = f'Analyze this transcript and return a JSON object with keys: title (catchy YouTube Shorts title), description (engaging description with emojis), tags (array of relevant tags), hashtags (array of trending hashtags). Transcript: {transcript_text}'
    
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "system": "You are a viral social media strategist. Return ONLY valid JSON with keys title, description, tags, hashtags. No markdown.",
        "stream": False,
        "options": {
            "num_predict": 120,
            "temperature": 0.2
        }
    }
    
    default_resp = {
        "title": "",
        "description": "",
        "tags": ["shorts", "viral", "fyp"],
        "hashtags": ["#Shorts", "#Viral", "#Trending"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(settings.OLLAMA_GENERATE_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            import json
            response_text = data.get("response", "")
            try:
                result = json.loads(response_text)
                return {
                    "title": result.get("title", ""),
                    "description": result.get("description", ""),
                    "tags": result.get("tags", []),
                    "hashtags": result.get("hashtags", [])
                }
            except json.JSONDecodeError:
                return default_resp
    except Exception as e:
        print(f"Error generating metadata: {e}")
        return default_resp
