import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

KAGGLE_API_URL = os.getenv("GEMMA_BASE_URL")


def test_gemma_connection():
    if not KAGGLE_API_URL:
        print("❌ ERROR: GEMMA_BASE_URL is not set in your environment or .env file.")
        return

    endpoint = f"{KAGGLE_API_URL}/api/generate-text"

    # Payload simulating a system prompt and a test prompt
    payload = {
        "system_prompt": "You are a helpful assistant. Reply concisely in one sentence.",
        "prompt": "Say hello and confirm you are online by stating your model name."
    }

    print(f"Connecting to Kaggle tunnel at: {endpoint}...")

    try:
        response = requests.post(endpoint, data=payload, timeout=30)

        if response.status_code == 200:
            data = response.json()
            print("\n✅ SUCCESS! Connection established.")
            print(f"Server Status: {data.get('status')}")
            print(
                f"Model Response:\n----------------------------------------\n{data.get('response')}\n----------------------------------------")
        else:
            print(f"\n❌ FAILED: Server returned status code {response.status_code}")
            print(response.text)

    except requests.exceptions.RequestException as e:
        print(f"\n❌ CONNECTION ERROR: Could not reach the Kaggle endpoint.")
        print(f"Details: {e}")
        print("Tip: Check if your Kaggle notebook is still running and your ngrok URL hasn't expired.")


if __name__ == "__main__":
    test_gemma_connection()