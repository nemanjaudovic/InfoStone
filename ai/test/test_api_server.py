import os
import json

requests = __import__('requests')

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


def test_screen_candidates_batch_api():
    print("Testing /api/screen-candidates-batch endpoint...")

    # MongoDB-style batch payload matching what your frontend will send
    candidates_payload = [
        {
            "_id": "64a7f1b2c3d4e5f6a7b8c9d0",
            "submittedAt": "2026-06-01T12:00:00.000Z",
            "data": {
                "first_name": "Nemanja",
                "last_name": "Udovic",
                "university": "Univerzitet u Beogradu",
                "faculty": "Elektrotehnički fakultet",
                "gpa": 9.4
            },
            "files": [
                {"field": "cv", "filename": "NemanjaUdovicCV_AMD copy.pdf", "path": "/uploads/marko_markovic_cv.pdf",
                 "size": 204800}
            ]
        }
    ]

    criteria = "Filter candidates with a GPA above 9.0 who have strong Python experience."

    # Send as form data with JSON stringified candidates
    form_data = {
        "candidates_json": json.dumps(candidates_payload),
        "criteria": criteria,
        "files_directory": "./sample_cvs"
    }

    response = requests.post(f"{BASE_URL}/api/screen-candidates-batch", data=form_data)

    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
    print("-" * 40)


if __name__ == "__main__":
    print("=== STARTING FASTAPI INTEGRATION TESTS ===\n")
    try:
        test_root()
        test_customize_css_api()
        test_screen_candidates_batch_api()
        print("=== ALL TESTS COMPLETED ===")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to FastAPI server at http://127.0.0.1:8000.")
        print("Tip: Make sure you ran 'python -m uvicorn ai.main:app --reload --port 8000' in another terminal.")