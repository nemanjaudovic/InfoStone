import os
import json
from ai.utils.pdf_parser import extract_text_from_pdf
from ai.utils.gemma_client import call_kaggle_gemma

CV_SCREENER_SYSTEM_PROMPT = """
You are an expert technical recruiter and AI assistant.
Your task is to evaluate a candidate based strictly on the organizer's custom filtering instructions.
You must analyze both the candidate's structured profile (such as GPA, university, faculty) and their raw resume text to see how well they match what the organizer requested.
You must respond ONLY with a valid JSON object matching this exact structure, with no markdown code blocks around it:
{
  "match_score": <integer between 0 and 100>,
  "meets_criteria": <boolean true or false>,
  "summary": "<brief explanation of how the candidate matches or fails the specific organizer criteria>",
  "key_highlights": ["<highlight 1>", "<highlight 2>"]
}
"""


def evaluate_candidate(candidate_record: dict, pdf_path: str, organizer_criteria: str) -> dict:
    """Evaluates a single candidate combining nested MongoDB form data and PDF text against custom criteria."""
    resume_text = extract_text_from_pdf(pdf_path) if pdf_path and os.path.exists(
        pdf_path) else "No resume file provided."

    data = candidate_record.get("data", {})

    # We pass the full context so Gemma can evaluate GPA, university, skills, or anything requested
    user_payload = f"""
    ORGANIZER'S CUSTOM FILTERING PROMPT:
    {organizer_criteria}

    CANDIDATE STRUCTURED PROFILE (MongoDB Form Data):
    - Name: {data.get('first_name')} {data.get('last_name')}
    - University: {data.get('university')}
    - Faculty: {data.get('faculty')}
    - GPA: {data.get('gpa')}
    - Submitted At: {candidate_record.get('submittedAt')}

    CANDIDATE RESUME TEXT (Extracted from PDF):
    {resume_text}
    """

    raw_response = call_kaggle_gemma(
        system_prompt=CV_SCREENER_SYSTEM_PROMPT,
        user_prompt=user_payload
    )

    try:
        clean_json = raw_response.replace("```json", "").replace("```", "").replace("<turn|>", "").strip()
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


def screen_candidate_batch(candidates_list: list, files_dir: str, organizer_criteria: str) -> list:
    """Processes a list of MongoDB candidate records, maps their PDF files, and evaluates them."""
    results = []

    for candidate in candidates_list:
        data = candidate.get("data", {})
        cv_filename = None

        for f in candidate.get("files", []):
            if f.get("field") == "cv":
                cv_filename = f.get("filename")
                break

        pdf_path = os.path.join(files_dir, cv_filename) if cv_filename else None

        print(f"Screening candidate: {data.get('first_name')} {data.get('last_name')} using criteria...")
        evaluation = evaluate_candidate(candidate, pdf_path, organizer_criteria)

        # Preserve the entire original MongoDB record and attach the evaluation object
        evaluated_record = candidate.copy()
        evaluated_record["evaluation"] = evaluation
        results.append(evaluated_record)

    # Sort candidates by match score descending so top matches appear first
    results.sort(key=lambda x: x["evaluation"].get("match_score", 0), reverse=True)
    return results
