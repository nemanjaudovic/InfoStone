import os
import sys

# Ensure python can find modules in the ai/ directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ai.services.cv_screener import evaluate_single_cv, screen_cv_directory


def test_cv_screening_pipeline():
    sample_dir = "./sample_cvs"
    criteria = "Must have a background in Python, machine learning, and at least 2 years of software engineering experience."

    if not os.path.exists(sample_dir) or not os.listdir(sample_dir):
        print(f"⚠️ Please create a '{sample_dir}' folder and add at least one sample PDF resume to run this test.")
        return

    print("=== Testing Single CV Evaluation ===")
    first_file = [f for f in os.listdir(sample_dir) if f.endswith(".pdf")][0]
    sample_pdf_path = os.path.join(sample_dir, first_file)

    single_result = evaluate_single_cv(sample_pdf_path, criteria)
    print(f"Result for {first_file}:")
    print(single_result)

    print("\n=== Testing Batch Directory Screening ===")
    batch_results = screen_cv_directory(sample_dir, criteria)
    print(f"Processed {len(batch_results)} resumes successfully.")
    for res in batch_results:
        print(
            f" - {res['filename']} | Score: {res['evaluation'].get('match_score')} | Pass: {res['evaluation'].get('meets_criteria')}")


if __name__ == "__main__":
    test_cv_screening_pipeline()