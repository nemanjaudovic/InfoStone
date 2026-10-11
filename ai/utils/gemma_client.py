import os
import requests
from dotenv import load_dotenv

load_dotenv()
KAGGLE_API_URL = os.getenv("GEMMA_BASE_URL")


def call_kaggle_gemma(system_prompt: str, user_prompt: str, timeout: float | None = None) -> str:
    # timeout in seconds: None waits as long as needed (old behaviour); the chatbot passes a short one
    endpoint = f"{KAGGLE_API_URL}/api/generate-text"

    payload = {
        "system_prompt": system_prompt,
        "prompt": user_prompt
    }

    response = requests.post(endpoint, data=payload, timeout=timeout)

    if response.status_code == 200:
        return response.json().get("response")
    else:
        raise Exception(f"Failed to reach Kaggle Gemma backend: {response.text}")
