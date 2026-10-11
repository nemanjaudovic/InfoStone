import json
from ai.utils.gemma_client import call_kaggle_gemma
from ai.utils.web_search import (
    build_query_rewrite_prompt,
    parse_rewritten_queries,
    web_search,
)

DISCOVERY_SYNTHESIS_SYSTEM_PROMPT = """
You are an expert AI event coordinator and discovery agent.
Your task is to analyze raw web search results and extract the absolute best matches for the organizer's request.

RULES:
1. Return ONLY the TOP {top_k} best matching options (Venues, Sponsors, or Speakers).
2. Rank them strictly from best match to worst match based on suitability.
3. Ignore broken links, duplicate listings, or generic homepages.
4. Return ONLY a valid JSON object matching this exact structure, with no markdown code blocks around it:
{{
  "total_found": <integer count of matches returned, max {top_k}>,
  "matches": [
    {{
      "title": "<Name of venue, sponsor company, or speaker>",
      "location_or_domain": "<Location, industry, or field of expertise>",
      "url": "<source URL>",
      "match_score": <integer 0-100>,
      "summary": "<2-sentence explanation of why this fits the organizer's prompt>",
      "key_details": ["<detail 1>", "<detail 2>"]
    }}
  ]
}}
"""

def prepare_context_with_zone_fallback(
    search_results: list[dict],
    min_green_threshold: int = 3,
    top_n_fallback: int = 10,
    max_chars_per_item: int = 400
) -> str:
    """
    Selects search entries for Gemma context:
    1. If green entries >= min_green_threshold, uses ONLY green entries.
    2. Otherwise, takes all available green entries and fills the remaining slots
       with orange entries up to top_n_fallback.
    3. Truncates snippets to max_chars_per_item to prevent CUDA OOM errors.
    """
    green_entries = [r for r in search_results if r.get("zone") == "green"]
    orange_entries = [r for r in search_results if r.get("zone") == "orange"]

    if len(green_entries) >= min_green_threshold:
        selected_entries = green_entries[:top_n_fallback]
        print(f"Sufficient Green Zone entries found ({len(green_entries)}). Using Green entries only.")
    else:
        needed_orange = top_n_fallback - len(green_entries)
        selected_entries = green_entries + orange_entries[:needed_orange]
        print(f"Only {len(green_entries)} Green Zone entries found. Backfilled with {len(orange_entries[:needed_orange])} Orange entries.")

    formatted_blocks = []
    for idx, item in enumerate(selected_entries, 1):
        content = item.get("content", "").strip()[:max_chars_per_item]
        formatted_blocks.append(
            f"Source [{idx}] Zone: {item.get('zone', 'unknown').upper()} | Title: {item.get('title')}\n"
            f"URL: {item.get('url')}\n"
            f"Content: {content}"
        )

    return "\n---\n".join(formatted_blocks)


def generate_targeted_queries(user_prompt: str) -> list[str]:
    """Uses Gemma to rewrite user prompt into targeted search strings."""
    rewrite_prompt = build_query_rewrite_prompt(user_prompt)
    raw_response = call_kaggle_gemma(
        system_prompt="You are a search query rewriting specialist. Return short, distinct search queries.",
        user_prompt=rewrite_prompt
    )
    return parse_rewritten_queries(raw_response)


def run_discovery_service(
    user_prompt: str,
    top_k: int = 3,
    max_results: int = 15,
    min_green_threshold: int = 3,
    top_n_fallback: int = 10
) -> dict:
    """
    Complete Discovery RAG Pipeline:
    1. Query Expansion (Gemma)
    2. Multi-Search Retrieval (Tavily/DDG)
    3. Zone-Filtered Context Preparation (Python)
    4. Synthesis & Ranking (Gemma)
    """
    print(f"Generating search query rewrites for: '{user_prompt}'...")
    extra_queries = generate_targeted_queries(user_prompt)

    print("Executing web search...")
    search_results = web_search(
        prompt=user_prompt,
        max_results=max_results,
        queries=extra_queries
    )

    if not search_results:
        return {"total_found": 0, "matches": [], "message": "No search results returned from providers."}

    # Apply the Zone-Fallback Filtering Logic
    formatted_context = prepare_context_with_zone_fallback(
        search_results=search_results,
        min_green_threshold=min_green_threshold,
        top_n_fallback=top_n_fallback,
        max_chars_per_item=400
    )

    if not formatted_context:
        return {"total_found": 0, "matches": [], "message": "No Green or Orange zone search results available."}

    synthesis_payload = f"""
    ORGANIZER'S ORIGINAL REQUEST:
    {user_prompt}

    SEARCH RESULTS RETRIEVED FROM WEB:
    {formatted_context}
    """

    system_prompt = DISCOVERY_SYNTHESIS_SYSTEM_PROMPT.format(top_k=top_k)

    print(f"Synthesizing top {top_k} recommendations with Gemma...")
    raw_response = call_kaggle_gemma(
        system_prompt=system_prompt,
        user_prompt=synthesis_payload
    )

    try:
        clean_json = raw_response.replace("```json", "").replace("```", "").replace("<turn|>", "").strip()
        json_start = clean_json.find("{")
        json_end = clean_json.rfind("}") + 1
        if json_start != -1 and json_end != 0:
            clean_json = clean_json[json_start:json_end]

        result_data = json.loads(clean_json)

        if "matches" in result_data and isinstance(result_data["matches"], list):
            result_data["matches"] = result_data["matches"][:top_k]
            result_data["total_found"] = len(result_data["matches"])

        return result_data
    except json.JSONDecodeError:
        return {
            "total_found": 0,
            "matches": [],
            "raw_response": raw_response,
            "error": "Failed to parse JSON response from Gemma."
        }