import os
import sys

# Ensure python can find modules in the ai/ directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ai.utils.pdf_parser import extract_text_from_pdf


def test_pdf_extraction():
    sample_dir = "./sample_cvs"

    if not os.path.exists(sample_dir):
        print(f"❌ Directory not found: {sample_dir}")
        return

    pdf_files = [f for f in os.listdir(sample_dir) if f.endswith(".pdf")]

    if not pdf_files:
        print(f"⚠️ No PDF files found in {sample_dir}. Please add one to test.")
        return

    first_pdf = os.path.join(sample_dir, pdf_files[0])
    print(f"=== Extracting Text From: {pdf_files[0]} ===")

    extracted_text = extract_text_from_pdf(first_pdf)

    print(f"\nSuccessfully extracted {len(extracted_text)} characters.")
    print("--- First 500 Characters Preview ---")
    print(extracted_text[:500])
    print("------------------------------------")


if __name__ == "__main__":
    test_pdf_extraction()