import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ai.services.css_matcher import match_form_css


def test_matcher():
    sample_form = """
    <div>
        <label>Candidate Email</label>
        <input type="email" placeholder="Enter email" />
        <button>Submit CV</button>
    </div>
    """

    sample_css = """
    .site-input { border: 1px solid #ccc; padding: 10px; border-radius: 4px; font-family: sans-serif; }
    .site-button { background-color: #2563eb; color: white; padding: 10px 20px; border: none; }
    .site-label { font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
    .site-header{ color: black}
    """

    print("Sending form and CSS to Gemma for class injection...")
    result = match_form_css(sample_form, sample_css)

    print("\n=== Result Styled HTML ===")
    print(result.get("styled_html"))
    print("\n=== Applied Classes ===")
    print(result.get("applied_classes"))


if __name__ == "__main__":
    test_matcher()