# 1. Ensure you are inside your virtual environment
source venv/bin/activate  # or source .venv/bin/activate depending on your folder name

# 2. Force install python-dotenv and required dependencies explicitly
pip install python-dotenv fastapi uvicorn requests pypdf
pip install python-multipart


# 3. Run uvicorn pointing directly to python's module executor to avoid path mismatches
python -m uvicorn ai.main:app --reload --port 8000