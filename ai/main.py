import json
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai.services.css_matcher import match_form_css
from ai.services.cv_screener import screen_candidate_batch

# Initialize FastAPI App
app = FastAPI(
    title="InfoStone Event AI Backend",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Root / Health Check
# ------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "InfoStone Event AI Microservices",
        "endpoints": [
            "/api/customize-css",
            "/api/screen-candidates-batch"
        ]
    }

# ------------------------------------------------------------------
# 1. CSS Matcher Endpoint
# ------------------------------------------------------------------
@app.post("/api/customize-css")
async def customize_form_css(
    form_html: str = Form(...),
    host_css: str = Form(...)
):
    """
    Injects site CSS classes into unstyled form HTML.
    """
    try:
        result = match_form_css(form_html, host_css)
        return {
            "status": "success",
            "styled_html": result.get("styled_html"),
            "applied_classes": result.get("applied_classes"),
            "error": result.get("error")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# 2. Batch Candidate CV Screening Endpoint
# ------------------------------------------------------------------
@app.post("/api/screen-candidates-batch")
async def screen_candidates_batch_endpoint(
    candidates_json: str = Form(...),
    criteria: str = Form(...),
    files_directory: str = Form("./temp_uploads")
):
    """
    Accepts a MongoDB-style candidate JSON list and criteria prompt,
    evaluating each candidate's metadata and PDF resume using Gemma.
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