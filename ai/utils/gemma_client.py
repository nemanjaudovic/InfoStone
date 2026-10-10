import os
import requests
from dotenv import load_dotenv

load_dotenv()
KAGGLE_API_URL = os.getenv("GEMMA_BASE_URL")


def call_kaggle_gemma(system_prompt: str, user_prompt: str) -> str:
    endpoint = f"{KAGGLE_API_URL}/api/generate-text"

    payload = {
        "system_prompt": system_prompt,
        "prompt": user_prompt
    }

    response = requests.post(endpoint, data=payload)

    if response.status_code == 200:
        return response.json().get("response")
    else:
        raise Exception(f"Failed to reach Kaggle Gemma backend: {response.text}")