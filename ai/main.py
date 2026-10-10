import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai.services.css_matcher import match_form_css
from ai.services.cv_screener import evaluate_single_cv, screen_cv_directory

app = FastAPI(title="Event AI Microservices API", version="1.0")

# Enable CORS so your frontend team's web app can call these APIs freely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific frontend domains if needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "online", "message": "Event AI Microservices backend is running."}


# ==========================================
# 1. CSS FORM CUSTOMIZER ENDPOINT
# ==========================================
@app.post("/api/customize-css")
async def customize_form_css(
        form_html: str = Form(...),
        host_css: str = Form(...)
):
    """Takes unstyled form HTML and host CSS, returning paste-ready styled HTML."""
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


# ==========================================
# 2. SINGLE CV SCREENER ENDPOINT
# ==========================================
@app.post("/api/screen-cv")
async def screen_single_cv(
        file: UploadFile = File(...),
        criteria: str = Form(...)
):
    """Accepts an uploaded PDF resume and filtering criteria, returning evaluation JSON."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF resumes are accepted.")

    # Save uploaded file temporarily on local disk
    temp_dir = "./temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run evaluation via Gemma service
        evaluation = evaluate_single_cv(temp_path, criteria)

        return {
            "status": "success",
            "filename": file.filename,
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ==========================================
# 3. BATCH DIRECTORY CV SCREENER ENDPOINT (OPTIONAL)
# ==========================================
@app.post("/api/screen-cv-batch")
async def screen_cv_folder(
        directory_path: str = Form(...),
        criteria: str = Form(...)
):
    """Screens all PDFs inside a specified server-side directory."""
    try:
        results = screen_cv_directory(directory_path, criteria)
        return {
            "status": "success",
            "total_screened": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
