# Dev-only preview page: type a query (plus optional extra queries, normally written by Gemma),
# see scored search results (green/orange/red zones) and the exact text sent to Gemma.
# Run from project root:  python -m uvicorn ai.utils.web_search_preview:app --port 8001 --reload
# Then open:              http://localhost:8001

import os
import time

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from ai.utils.web_search import (
    web_search, format_for_gemma, extract_terms, sanitize_query, build_query_rewrite_prompt,
    WebSearchError,
    DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT, GEMMA_ZONES,
)

app = FastAPI(title="InfoStone web search preview")


class SearchRequest(BaseModel):
    prompt: str
    max_results: int = DEFAULT_MAX_RESULTS
    country: str | None = None
    queries: list[str] = []


@app.post("/search")
def search(req: SearchRequest):
    start = time.perf_counter()
    try:
        results = web_search(req.prompt, req.max_results, country=req.country or None,
                             queries=req.queries)
    except WebSearchError as e:
        return {"error": str(e)}
    return {
        "tavily_key_loaded": bool(os.getenv("TAVILY_API_KEY")),
        "elapsed_ms": round((time.perf_counter() - start) * 1000),
        "terms": extract_terms(sanitize_query(req.prompt)),
        "extra_queries": [q for q in req.queries if q.strip()],
        "rewrite_prompt": build_query_rewrite_prompt(req.prompt),
        "gemma_zones": list(GEMMA_ZONES),
        "results": results,
        "gemma_input": format_for_gemma(req.prompt, results),
    }


@app.get("/", response_class=HTMLResponse)
def index():
    return PAGE.replace("__DEFAULT__", str(DEFAULT_MAX_RESULTS)).replace("__LIMIT__", str(MAX_RESULTS_LIMIT))


PAGE = """<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><title>Web search preview</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 980px; margin: 24px auto; padding: 0 16px; background: #f6f7f9; color: #1d2330; }
  form { display: flex; flex-wrap: wrap; gap: 8px; }
  textarea { flex-basis: 100%; padding: 10px; font: 14px system-ui, sans-serif; border: 1px solid #c8ccd4; border-radius: 6px; }
  input[type=text] { flex: 1; padding: 10px; font-size: 15px; border: 1px solid #c8ccd4; border-radius: 6px; }
  select { padding: 10px; border: 1px solid #c8ccd4; border-radius: 6px; }
  input[type=number] { width: 70px; padding: 10px; border: 1px solid #c8ccd4; border-radius: 6px; }
  button { padding: 10px 18px; background: #2f6fed; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
  .meta { margin: 14px 0; font-size: 14px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #e3e8f4; margin: 0 6px 6px 0; }
  .zone-title { margin: 22px 0 6px; padding: 6px 10px; border-radius: 6px; font-weight: 600; }
  .z-green  { --c: #1a7f37; --bg: #e6f4ea; }
  .z-orange { --c: #c4620a; --bg: #fdf0e1; }
  .z-red    { --c: #b42318; --bg: #fdecea; }
  .zone-title { color: var(--c); background: var(--bg); }
  .card { background: #fff; border: 1px solid #e1e4ea; border-left: 5px solid var(--c); border-radius: 8px; padding: 10px 14px; margin: 8px 0; }
  .card a { font-weight: 600; color: #2f6fed; text-decoration: none; }
  .url { font-size: 12px; color: #6b7280; word-break: break-all; }
  .rel { float: right; font-size: 12px; color: var(--c); font-weight: 600; text-align: right; }
  .terms { font-size: 12px; margin-top: 4px; }
  .ok { color: #1a7f37; } .miss { color: #b42318; text-decoration: line-through; }
  details { margin-top: 6px; font-size: 13px; }
  pre { background: #11151c; color: #d7dde8; padding: 14px; border-radius: 8px; white-space: pre-wrap; font-size: 12.5px; max-height: 500px; overflow: auto; }
  .err { color: #b42318; }
</style></head><body>
<h2>Web search &rarr; Gemma preview</h2>
<form id="f">
  <input type="text" id="q" placeholder="npr. prostor za 150 ljudi u Beogradu do 500 eura" required>
  <input type="number" id="n" value="__DEFAULT__" min="1" max="__LIMIT__" title="max rezultata (1-__LIMIT__)">
  <select id="c" title="drzava (Tavily country boost)">
    <option value="">ceo svet</option><option value="serbia">Srbija</option>
  </select>
  <button>Pretrazi</button>
  <textarea id="x" rows="2" placeholder="Dodatni upiti, po jedan u redu (opciono, max 2). Inace ih pise Gemma, npr: Belgrade event venue conference hall capacity 150"></textarea>
</form>
<div id="out"></div>
<script>
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ZONES = [["green", "Zelena zona"], ["orange", "Narandzasta zona"], ["red", "Crvena zona"]];

const card = (r, i) => `
  <div class="card z-${r.zone}">
    <span class="rel">relevance ${r.relevance.toFixed(2)}<br>
      <small>${r.source}${r.score != null ? " · tavily " + r.score.toFixed(2) : ""}</small></span>
    ${i}. <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
    <div class="url">${esc(r.url)}</div>
    <div>${esc(r.snippet)}</div>
    <div class="terms">${r.matched_terms.map(t => `<span class="ok">${esc(t)}</span>`).join(" ")}
      ${r.missing_terms.map(t => `<span class="miss">${esc(t)}</span>`).join(" ")}</div>
    <details><summary>content (${r.content.length} karaktera)</summary>${esc(r.content)}</details>
  </div>`;

document.getElementById("f").onsubmit = async e => {
  e.preventDefault();
  const out = document.getElementById("out");
  out.innerHTML = "<p class='meta'>Trazim...</p>";
  const res = await fetch("/search", { method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ prompt: q.value, max_results: +n.value, country: c.value,
      queries: x.value.split("
").map(s => s.trim()).filter(Boolean) }) });
  const d = await res.json();
  if (d.error) { out.innerHTML = `<p class="err">${esc(d.error)}</p>`; return; }

  const by = z => d.results.filter(r => r.zone === z);
  const count = s => d.results.filter(r => r.source === s).length;
  let i = 0;
  out.innerHTML = `
    <div class="meta">
      <span class="badge">Tavily kljuc: ${d.tavily_key_loaded ? "ucitan" : "NEMA"}</span>
      <span class="badge">${d.results.length} / ${n.value} rezultata</span>
      <span class="badge">tavily: ${count("tavily")} · duckduckgo: ${count("duckduckgo")}</span>
      <span class="badge">${d.elapsed_ms} ms</span><br>
      <span class="badge">kljucni pojmovi: ${d.terms.map(esc).join(", ")}</span>
      <span class="badge">upita: ${1 + d.extra_queries.length} (${2 * (1 + d.extra_queries.length)}+ kredita)</span>
    </div>
    <details><summary>Prompt kojim Gemma pravi dodatne upite</summary><pre>${esc(d.rewrite_prompt)}</pre></details>
    <h3>1. Rezultati po zonama</h3>
    ${ZONES.map(([z, label]) => by(z).length ? `
      <div class="zone-title z-${z}">${label} — ${by(z).length}
        ${d.gemma_zones.includes(z) ? "(ide Gemmi)" : "(NE ide Gemmi)"}</div>
      ${by(z).map(r => card(r, ++i)).join("")}` : "").join("")}
    <h3>2. Tacno ovo ide Gemmi (${d.gemma_input.length} karaktera)</h3>
    <pre>${esc(d.gemma_input)}</pre>`;
};
</script>
</body></html>"""
