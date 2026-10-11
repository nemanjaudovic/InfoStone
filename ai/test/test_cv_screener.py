import os
import sys

# Ensure python can find modules in the root directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ai.services.cv_screener import screen_candidate_batch


def run_test_case(case_title, criteria, candidates_data, sample_dir):
    print(f"\n" + "=" * 50)
    print(f"TEST CASE: {case_title}")
    print(f"ORGANIZER PROMPT: '{criteria}'")
    print("=" * 50)

    results = screen_candidate_batch(candidates_data, sample_dir, criteria)

    for res in results:
        data = res.get("data", {})
        eval_data = res.get("evaluation", {})
        print(
            f" -> {data.get('first_name')} {data.get('last_name')} | GPA: {data.get('gpa')} | Univ: {data.get('university')}")
        print(f"    Score: {eval_data.get('match_score')} | Meets Criteria: {eval_data.get('meets_criteria')}")
        print(f"    Summary: {eval_data.get('summary')}")
        print(f"    Highlights: {eval_data.get('key_highlights')}")


def test_all_screening_cases():
    # Dataset containing candidates with CVs and candidates with NO CVs
    candidates_data = [
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
                {
                    "field": "cv",
                    "filename": "NemanjaUdovicCV_AMD copy.pdf",
                    "path": "/uploads/NemanjaUdovicCV_AMD copy.pdf",
                    "size": 204800
                }
            ]
        },
        {
            "_id": "64a7f1b2c3d4e5f6a7b8c9d1",
            "submittedAt": "2026-06-01T12:30:00.000Z",
            "data": {
                "first_name": "Stefan",
                "last_name": "Stefanović",
                "university": "Univerzitet u Novom Sadu",
                "faculty": "Fakultet tehničkih nauka",
                "gpa": 8.5
            },
            "files": [] # No CV attached
        },
        {
            "_id": "64a7f1b2c3d4e5f6a7b8c9d2",
            "submittedAt": "2026-06-01T13:00:00.000Z",
            "data": {
                "first_name": "Ana",
                "last_name": "Anić",
                "university": "Univerzitet u Nišu",
                "faculty": "Elektronski fakultet",
                "gpa": 9.1
            },
            "files": [
                {
                    "field": "other_document",
                    "filename": "motivation_letter.pdf",
                    "path": "/uploads/motivation_letter.pdf",
                    "size": 95000
                }
            ] # Missing 'cv' field file
        }
    ]

    sample_dir = "./sample_cvs"
    if not os.path.exists(sample_dir):
        print(f"⚠️ Warning: '{sample_dir}' directory not found. Ensure sample PDFs are present.")

    # Case 1: Filter purely by Academic GPA threshold
    run_test_case(
        case_title="Case 1: Strict GPA Filter",
        criteria="Filter candidates who have a GPA (prosek) strictly greater than 9.0.",
        candidates_data=candidates_data,
        sample_dir=sample_dir
    )

    # Case 2: Filter by Resume Skills / Technical Competencies
    run_test_case(
        case_title="Case 2: Technical Skills Filter",
        criteria="Must have strong background in Python, C++, GPU optimization, or machine learning engineering.",
        candidates_data=candidates_data,
        sample_dir=sample_dir
    )


if __name__ == "__main__":
    test_all_screening_cases()