import json
from ai.utils.gemma_client import call_kaggle_gemma

CSS_MATCHER_SYSTEM_PROMPT = """
You are an expert frontend developer and UI/UX AI assistant.
Your task is to integrate an unstyled form structure into an external website based on full-page CSS.

RULES:
1. You will receive an unstyled HTML snippet and the raw CSS from the host website's entire page.
2. The host CSS will contain many irrelevant rules for other parts of the page. IGNORE all rules that do not apply to form elements (inputs, buttons, labels, containers, typography).
3. Do not inject or modify IDs (#id). Use ONLY class names (.class) because IDs must be globally unique.
4. Extract only the necessary CSS rules and place them inside a <style> block.
5. Inject the corresponding class names into the HTML tags.
6. Return ONLY a valid JSON object with no markdown code blocks around it, matching this exact structure:
{
  "styled_html": "<style>/* relevant extracted css rules */</style>\\n<form class='...'>...</form>",
  "applied_classes": ["list", "of", "classes", "used"]
}
"""


def match_form_css(form_html: str, host_css: str) -> dict:
    """Analyzes host CSS and injects matching classes into the unstyled form HTML."""
    user_payload = f"""
    HOST WEBSITE CSS:
    {host_css}

    UNSTYLED FORM HTML:
    {form_html}
    """

    raw_response = call_kaggle_gemma(
        system_prompt=CSS_MATCHER_SYSTEM_PROMPT,
        user_prompt=user_payload
    )

    try:
        # Clean up response formatting artifacts
        clean_json = raw_response.replace("```json", "").replace("```", "").replace("<turn|>", "").strip()
        json_start = clean_json.find("{")
        json_end = clean_json.rfind("}") + 1
        if json_start != -1 and json_end != 0:
            clean_json = clean_json[json_start:json_end]

        return json.loads(clean_json)
    except json.JSONDecodeError:
        return {
            "styled_html": form_html,  # Fallback to unstyled if parsing fails
            "applied_classes": [],
            "error": f"Failed to parse AI response: {raw_response}"
        }