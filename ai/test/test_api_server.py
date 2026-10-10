import os
import requests

BASE_URL = "http://127.0.0.1:8000"


def test_root():
    print("Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}\n")


def test_customize_css_api():
    print("Testing /api/customize-css endpoint...")
    payload = {
        "form_html": "<div><label>Name</label><input type='text'/><button>Apply</button></div>",
        "host_css": ".site-input { border: 1px solid red; } .site-button { background: blue; color: white; }"
    }

    response = requests.post(f"{BASE_URL}/api/customize-css", data=payload)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
    print("-" * 40)


def test_screen_cv_api():
    print("Testing /api/screen-cv endpoint...")
    sample_dir = "./sample_cvs"

    if not os.path.exists(sample_dir):
        print(f"⚠️ Skipped CV test: '{sample_dir}' directory not found.")
        return

    pdf_files = [f for f in os.listdir(sample_dir) if f.endswith(".pdf")]
    if not pdf_files:
        print(f"⚠️ Skipped CV test: No sample PDF found in {sample_dir}.")
        return

    sample_pdf_path = os.path.join(sample_dir, pdf_files[0])
    criteria = "Must have strong Python and machine learning engineering experience."

    with open(sample_pdf_path, "rb") as f:
        files = {"file": (pdf_files[0], f, "application/pdf")}
        data = {"criteria": criteria}

        response = requests.post(f"{BASE_URL}/api/screen-cv", files=files, data=data)

    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
    print("-" * 40)


if __name__ == "__main__":
    print("=== STARTING FASTAPI INTEGRATION TESTS ===\n")
    try:
        test_root()
        test_customize_css_api()
        test_screen_cv_api()
        print("=== ALL TESTS COMPLETED ===")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to FastAPI server at http://127.0.0.1:8000.")
        print("Tip: Make sure you ran 'uvicorn ai.main:app --reload --port 8000' in another terminal.")