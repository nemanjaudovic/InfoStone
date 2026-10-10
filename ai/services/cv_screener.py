# PDF parser & criteria matcher

import os
import json
from ..utils.pdf_parser import extract_text_from_pdf
from ..utils.gemma_client import call_kaggle_gemma

CV_SCREENER_SYSTEM_PROMPT = """
You are an expert technical recruiter and AI assistant.
Evaluate the provided candidate resume text against the organizer's custom filtering criteria.
You must respond ONLY with a valid JSON object matching this exact structure, with no markdown code blocks around it:
{
  "match_score": <integer between 0 and 100>,
  "meets_criteria": <boolean true or false>,
  "summary": "<brief 2-sentence explanation of why they match or fail>",
  "key_highlights": ["<highlight 1>", "<highlight 2>"]
}
"""


def evaluate_single_cv(pdf_path: str, organizer_criteria: str) -> dict:
    """Parses a single PDF CV and queries Gemma for structured evaluation."""
    resume_text = extract_text_from_pdf(pdf_path)

    user_payload = f"""
    ORGANIZER'S FILTERING CRITERIA:
    {organizer_criteria}

    CANDIDATE RESUME TEXT:
    {resume_text}
    """

    raw_response = call_kaggle_gemma(
        system_prompt=CV_SCREENER_SYSTEM_PROMPT,
        user_prompt=user_payload
    )

    try:
        # Clean up markdown code blocks and unwanted chat template tokens like <turn|>
        clean_json = raw_response.replace("```json", "").replace("```", "").replace("<turn|>", "").strip()

        # In case there's trailing text after the json closing brace
        json_start = clean_json.find("{")
        json_end = clean_json.rfind("}") + 1
        if json_start != -1 and json_end != 0:
            clean_json = clean_json[json_start:json_end]

        return json.loads(clean_json)
    except json.JSONDecodeError:
        return {
            "match_score": 0,
            "meets_criteria": False,
            "summary": f"Error parsing AI response: {raw_response}",
            "key_highlights": []
        }


def screen_cv_directory(directory_path: str, organizer_criteria: str) -> list:
    """Scans a directory of PDF resumes, evaluates each one, and returns sorted results."""
    results = []

    if not os.path.exists(directory_path):
        raise ValueError(f"Directory not found: {directory_path}")

    files = [f for f in os.listdir(directory_path) if f.lower().endswith(".pdf")]

    for filename in files:
        pdf_path = os.path.join(directory_path, filename)
        print(f"Screening candidate resume: {filename}...")

        evaluation = evaluate_single_cv(pdf_path, organizer_criteria)

        results.append({
            "filename": filename,
            "evaluation": evaluation
        })

    # Sort results by match score descending
    results.sort(key=lambda x: x["evaluation"].get("match_score", 0), reverse=True)
    return results