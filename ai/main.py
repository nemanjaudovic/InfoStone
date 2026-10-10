from fastapi import FastAPI, Form, HTTPException
import json
from ai.services.cv_screener import screen_candidate_batch


# (Assuming app is already initialized in main.py)

@app.post("/api/screen-candidates-batch")
async def screen_candidates_batch_endpoint(
        candidates_json: str = Form(...),
        criteria: str = Form(...),
        files_directory: str = Form("./temp_uploads")
):
    """
    Accepts a JSON string of the candidate list and filtering criteria,
    evaluating each candidate against the custom rules.
    """
    try:
        candidates_list = json.loads(candidates_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for candidates_json.")

    try:
        results = screen_candidate_batch(candidates_list, files_directory, criteria)
        return {
            "status": "success",
            "total_screened": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
