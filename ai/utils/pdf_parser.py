from pypdf import PdfReader

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts and cleans all text from an uploaded PDF resume."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF file at {pdf_path}: {str(e)}")