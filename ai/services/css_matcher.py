import json
from html.parser import HTMLParser

from ai.utils.gemma_client import call_kaggle_gemma

CSS_MATCHER_SYSTEM_PROMPT = """
You are an HTML editor that integrates an unstyled form into a host website's design system.

YOUR ONLY ALLOWED EDIT: add one or more existing class names (taken EXCLUSIVELY from the HOST CSS below)
into the class attributes of the given HTML elements. You are NOT designing a new form.

STRICT RULES:
1. The output HTML MUST be the input HTML, byte for byte, with ONLY these changes:
   - extra class names appended to EXISTING class attributes (keep all existing classes, e.g. infostone-*),
   - or a class="..." attribute added to an element that had none.
2. DO NOT create, remove, reorder, or wrap any element. DO NOT change any tag.
3. DO NOT change, add, or remove ANY other attribute: keep name="...", type="...", required, for="...",
   placeholder, accept and all infostone-* classes EXACTLY as they are.
4. DO NOT change any text content, labels, or option values.
5. DO NOT add <style>, <script>, inline style="..." attributes, or new HTML.
6. Use ONLY class names that literally exist in the HOST CSS. NEVER invent classes and NEVER use classes
   from other design systems (for example, never use Google Forms classes unless they exist in the HOST CSS).
7. If the host CSS has no fitting class for an element, leave that element untouched.
8. Return ONLY a valid JSON object, no markdown, no explanations, exactly in this structure:
{
  "styled_html": "<the input HTML with only classes added>",
  "applied_classes": ["classes", "actually", "used"]
}
"""

# Atributi koji odreduju ponasanje forme — moraju ostati identicni
_KEY_ATTRS = ('name', 'type', 'required', 'for', 'accept', 'placeholder')


class SkeletonParser(HTMLParser):
    """Poredi STRUKTURU dva HTML-a: tagove, redosled, kljucne atribute i tekst.

    Klase se namerno ignorisu — Gemma sme samo da doda klase,
    pa struktura bez klasa mora ostati identicna.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        keep = sorted((k, v) for k, v in attrs if k in _KEY_ATTRS)
        self.out.append(('open', tag, keep))

    def handle_startendtag(self, tag, attrs):
        # <input ... /> i <input ...> se tretiraju isto
        keep = sorted((k, v) for k, v in attrs if k in _KEY_ATTRS)
        self.out.append(('open', tag, keep))

    def handle_endtag(self, tag):
        self.out.append(('close', tag))

    def handle_data(self, data):
        text = ' '.join(data.split())
        if text:
            self.out.append(('text', text))


def skeleton(html: str) -> list:
    p = SkeletonParser()
    p.feed(html)
    return p.out


def same_structure(a: str, b: str) -> bool:
    return skeleton(a) == skeleton(b)


def match_form_css(form_html: str, host_css: str) -> dict:
    """Trazi od Gemme da doda klase sajta na HTML forme, ali strukturu garantuje kod.

    Ako Gemma ista promeni (novi elementi, izbrisana polja, promenjen tekst...),
    vracamo ORIGINALNI HTML — halucinacija nikad ne stize do korisnika.
    """
    user_payload = f"""
    HOST WEBSITE CSS:
    {host_css}

    UNSTYLED FORM HTML (do not rewrite it, only add classes):
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

        data = json.loads(clean_json)
        styled = data.get("styled_html") or ""

        # Kljucna zastita: struktura (bez klasa) mora ostati ista.
        # Time se hvata i "Google Forms" prepisivanje koje je Gemma znala da uradi.
        if not styled or not same_structure(form_html, styled):
            return {
                "styled_html": form_html,
                "applied_classes": [],
                "error": "Gemma je promenila strukturu forme — vracen je originalni HTML (samo CSS sajta se primenjuje).",
            }

        return data
    except json.JSONDecodeError:
        return {
            "styled_html": form_html,  # Fallback to unstyled if parsing fails
            "applied_classes": [],
            "error": f"Failed to parse AI response: {raw_response}"
        }
