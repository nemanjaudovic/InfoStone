import json
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai.services.css_matcher import match_form_css
from ai.services.cv_screener import screen_candidate_batch
from ai.services.discovery_service import run_discovery_service
from ai.services.chatbot_service import ChatbotError, answer_question
from ai.utils.site_extractor import ExtractError, build_knowledge

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
            "/api/screen-candidates-batch",
            "/api/discover",
            "/api/chatbot/knowledge",
            "/api/chatbot/ask"
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



@app.post("/api/discover")
async def discover_resources_endpoint(
    prompt: str = Form(...),
    top_k: int = Form(3)
):
    """
    Discovers venues, sponsors, or speakers by executing multi-query
    web searches and returning Gemma-ranked structured JSON.
    """
    try:
        results = run_discovery_service(user_prompt=prompt, top_k=top_k)
        return {
            "status": "success",
            "query": prompt,
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------
# 4. Event Chatbot
# ------------------------------------------------------------------
# Plain `def` (not async): crawling and Gemma calls block, FastAPI runs these in a thread pool.
MAX_KNOWLEDGE_UPLOAD = 2_000_000


@app.post("/api/chatbot/knowledge")
def chatbot_knowledge_endpoint(
    url: str = Form(""),
    text: str = Form(""),
    file: UploadFile | None = File(None)
):
    """
    Builds chatbot knowledge (small text chunks with heading + source url) from ONE of:
    a website url (crawls up to 10 pages of the same site), pasted text/Markdown/HTML,
    or an uploaded .html/.md/.txt file. Store the result and send it back with /ask.
    """
    try:
        if file is not None and file.filename:
            raw = file.file.read(MAX_KNOWLEDGE_UPLOAD + 1)
            if len(raw) > MAX_KNOWLEDGE_UPLOAD:
                raise HTTPException(status_code=400, detail="File is larger than 2MB.")
            knowledge = build_knowledge(text=raw.decode("utf-8", errors="replace"), source_name=file.filename)
        else:
            knowledge = build_knowledge(url=url or None, text=text or None)
        return {"status": "success", "knowledge": knowledge}
    except ExtractError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chatbot/ask")
def chatbot_ask_endpoint(
    question: str = Form(...),
    knowledge_json: str = Form(...),
    history_json: str = Form("[]")
):
    """
    Answers a visitor's question from the knowledge built by /api/chatbot/knowledge.
    history_json: optional [{question, answer}] of the last turns (for follow-up questions).
    Uses Gemma when GEMMA_BASE_URL is set, otherwise (or if Gemma fails) an extractive "dummy" answer.
    """
    try:
        knowledge = json.loads(knowledge_json)
        history = json.loads(history_json or "[]")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in knowledge_json or history_json.")
    if not isinstance(knowledge, dict) or not isinstance(history, list):
        raise HTTPException(status_code=400, detail="knowledge_json must be an object, history_json a list.")

    try:
        result = answer_question(question, knowledge, history)
        return {"status": "success", **result}
    except ChatbotError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
