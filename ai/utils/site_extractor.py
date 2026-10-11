# Site extractor for the event chatbot: turns a website (or pasted text) into small,
# self-contained knowledge chunks. No external search API and no extra libraries:
# requests + Python's built-in HTMLParser.
#
# Usage:  from ai.utils.site_extractor import build_knowledge
#         knowledge = build_knowledge(url="https://event.example.com")      # crawl a site
#         knowledge = build_knowledge(text=open("event.md").read())         # pasted text / .md / .html
#
# Result:
#   {"title": str, "source": str,
#    "chunks": [{"id": int, "heading": str, "url": str, "text": str}],
#    "stats": {"pages": int, "chunks": int, "chars": int}, "warnings": [str]}
#
# Pages rendered by JavaScript (Angular/React apps) come back almost empty when fetched;
# a warning is added and the organizer should paste the text instead.

import re
from collections import deque
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlparse

import requests

MAX_PAGES = 10
MAX_PAGE_BYTES = 2_000_000
MAX_CHUNK_CHARS = 800
MIN_PAGE_CHARS = 200  # less text than this usually means a JavaScript-rendered page
TIMEOUT_S = 15
USER_AGENT = "InfoStone-Chatbot/1.0 (+event knowledge builder)"

# Content inside these tags is navigation, scripts or UI chrome, not knowledge
SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "nav", "header", "footer",
             "form", "button", "iframe", "select", "aside"}
HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
BLOCK_TAGS = HEADING_TAGS | {"p", "li", "tr", "dt", "dd", "blockquote", "pre", "div",
                             "section", "article", "main", "table", "ul", "ol", "dl", "br"}
# Not worth following when crawling
SKIP_EXTENSIONS = (".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".zip",
                   ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".mp4", ".mp3")


class ExtractError(Exception):
    pass


# ---------- HTML -> blocks ----------

class _BlockParser(HTMLParser):
    """Collects readable blocks: ("h", level, text) for headings, ("p", 0, text) otherwise.
    Table rows become "cell | cell", list items get a "- " prefix."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.links = [], []
        self.title, self.description = "", ""
        self._buf, self._cells = [], None
        self._skip_depth = 0
        self._in_title = False
        self._heading = None
        self._li = False

    def _flush(self):
        text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
        self._buf = []
        if not text:
            return
        if self._heading:
            self.blocks.append(("h", self._heading, text))
        else:
            self.blocks.append(("p", 0, f"- {text}" if self._li else text))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])  # links are collected even from <nav> (for crawling)
        if tag == "meta" and attrs.get("name", "").lower() == "description":
            self.description = attrs.get("content", "").strip()
        if tag == "title":
            self._in_title = True
        if tag in SKIP_TAGS or attrs.get("aria-hidden") == "true":
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag in BLOCK_TAGS:
            self._flush()
        if tag in HEADING_TAGS:
            self._heading = int(tag[1])
        elif tag == "li":
            self._li = True
        elif tag == "tr":
            self._cells = []
        elif tag in ("td", "th") and self._cells is not None:
            self._buf = []

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag in SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth:
            return
        if tag in ("td", "th") and self._cells is not None:
            self._cells.append(re.sub(r"\s+", " ", "".join(self._buf)).strip())
            self._buf = []
            return
        if tag == "tr" and self._cells is not None:
            row = " | ".join(c for c in self._cells if c)
            self._cells = None
            if row:
                self.blocks.append(("p", 0, row))
            return
        if tag in BLOCK_TAGS:
            self._flush()
        if tag in HEADING_TAGS:
            self._heading = None
        elif tag == "li":
            self._li = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip_depth:
            self._buf.append(data)

    def close(self):
        super().close()
        self._flush()


def parse_html(html: str) -> dict:
    parser = _BlockParser()
    parser.feed(html)
    parser.close()
    return {
        "title": re.sub(r"\s+", " ", parser.title).strip(),
        "description": parser.description,
        "blocks": parser.blocks,
        "links": parser.links,
    }


def parse_text(text: str) -> dict:
    """Plain text / Markdown: '#' lines are headings, blank lines separate paragraphs."""
    blocks, para = [], []

    def flush():
        if para:
            blocks.append(("p", 0, " ".join(para)))
            para.clear()

    for line in text.splitlines():
        stripped = line.strip()
        heading = re.match(r"^(#{1,6})\s+(.*)", stripped)
        if heading:
            flush()
            blocks.append(("h", len(heading.group(1)), heading.group(2).strip()))
        elif not stripped:
            flush()
        elif re.match(r"^([-*•]|\d+[.)])\s+", stripped):
            flush()
            blocks.append(("p", 0, "- " + re.sub(r"^([-*•]|\d+[.)])\s+", "", stripped)))
        else:
            para.append(stripped)
    flush()
    title = next((t for kind, _, t in blocks if kind == "h"), "")
    return {"title": title, "description": "", "blocks": blocks, "links": []}


def _looks_like_html(text: str) -> bool:
    return bool(re.search(r"<(html|body|p|div|h[1-6]|ul|table)\b", text[:5000], re.I))


# ---------- blocks -> chunks ----------

def chunk_blocks(blocks: list, url: str, page_title: str = "", max_chars: int = MAX_CHUNK_CHARS) -> list[dict]:
    """Group blocks into chunks of up to max_chars, each under its nearest heading.
    The heading keeps its parent (e.g. "Satnica > Dan 1") so a chunk makes sense on its own."""
    chunks, path, body = [], {}, []

    def heading_text():
        parts = [path[level] for level in sorted(path) if level > 1] or [path.get(1) or page_title]
        return " > ".join(p for p in parts if p)

    def emit():
        if body:
            chunks.append({"heading": heading_text(), "url": url, "text": "\n".join(body)})
            body.clear()

    for kind, level, text in blocks:
        if kind == "h":
            emit()
            path = {lvl: t for lvl, t in path.items() if lvl < level}
            path[level] = text
            continue
        while len(text) > max_chars:  # very long paragraph: split on a sentence or space
            cut = max(text.rfind(". ", 0, max_chars), text.rfind(" ", 0, max_chars))
            cut = cut + 1 if cut > 0 else max_chars
            emit()
            body.append(text[:cut].strip())
            emit()
            text = text[cut:].strip()
        if body and len("\n".join(body)) + len(text) + 1 > max_chars:
            emit()
        body.append(text)
    emit()
    return chunks


# ---------- fetching ----------

def fetch_page(url: str) -> str:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_S, stream=True)
    resp.raise_for_status()
    if "html" not in resp.headers.get("Content-Type", "text/html"):
        raise ExtractError(f"Not an HTML page: {url}")
    content = resp.raw.read(MAX_PAGE_BYTES + 1, decode_content=True)
    if len(content) > MAX_PAGE_BYTES:
        raise ExtractError(f"Page too large: {url}")
    return content.decode(_detect_encoding(resp, content), errors="replace")


def _detect_encoding(resp, content: bytes) -> str:
    """Header charset, then <meta charset> in the page, then UTF-8. (requests alone falls back
    to Latin-1 when the header has no charset, which breaks č/ć/š/ž/đ.)"""
    if "charset=" in resp.headers.get("Content-Type", "").lower():
        return resp.encoding
    meta = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", content[:4096], re.I)
    if meta:
        return meta.group(1).decode("ascii", errors="ignore")
    try:
        content.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return resp.apparent_encoding or "utf-8"


def _same_site_links(base_url: str, links: list[str]) -> list[str]:
    host = urlparse(base_url).netloc
    out = []
    for href in links:
        absolute = urldefrag(urljoin(base_url, href)).url
        parsed = urlparse(absolute)
        if parsed.scheme in ("http", "https") and parsed.netloc == host \
                and not parsed.path.lower().endswith(SKIP_EXTENSIONS):
            out.append(absolute)
    return out


def crawl(start_url: str, max_pages: int = MAX_PAGES) -> list[dict]:
    """Breadth-first crawl of pages on the same host. Returns parsed pages with their url."""
    if urlparse(start_url).scheme not in ("http", "https"):
        raise ExtractError("URL must start with http:// or https://")
    queue, seen, pages = deque([start_url]), {start_url}, []
    while queue and len(pages) < max_pages:
        url = queue.popleft()
        try:
            page = parse_html(fetch_page(url))
        except (requests.RequestException, ExtractError) as e:
            if not pages and url == start_url:
                raise ExtractError(f"Could not load {url}: {e}") from e
            continue
        page["url"] = url
        pages.append(page)
        for link in _same_site_links(url, page["links"]):
            if link not in seen:
                seen.add(link)
                queue.append(link)
    return pages


# ---------- public API ----------

def build_knowledge(url: str | None = None, text: str | None = None, source_name: str = "",
                    max_pages: int = MAX_PAGES) -> dict:
    """Build chatbot knowledge from a website URL or from pasted text/Markdown/HTML."""
    if url:
        pages = crawl(url.strip(), max_pages)
        source = url.strip()
    elif text and text.strip():
        page = parse_html(text) if _looks_like_html(text) else parse_text(text)
        page["url"] = source_name or "uploaded-text"
        pages = [page]
        source = page["url"]
    else:
        raise ExtractError("Provide a url or text")

    chunks, seen_texts, warnings = [], set(), []
    for page in pages:
        if sum(len(t) for _, _, t in page["blocks"]) < MIN_PAGE_CHARS:
            warnings.append(f"Very little text on {page['url']} - the page is probably rendered by "
                            "JavaScript. Paste the page text instead.")
        title = page["title"].split("|")[0].strip()
        for chunk in chunk_blocks(page["blocks"], page["url"], title):
            key = re.sub(r"\W+", " ", chunk["text"].lower()).strip()
            if key in seen_texts:  # same boilerplate repeated on every page
                continue
            seen_texts.add(key)
            chunks.append({"id": len(chunks) + 1, **chunk})

    if not chunks:
        raise ExtractError("No readable text found. " + " ".join(warnings))

    first = pages[0]
    return {
        "title": first["title"] or (chunks[0]["heading"] if chunks else ""),
        "description": first.get("description", ""),
        "source": source,
        "chunks": chunks,
        "stats": {"pages": len(pages), "chunks": len(chunks), "chars": sum(len(c["text"]) for c in chunks)},
        "warnings": warnings,
    }


if __name__ == "__main__":
    # python -m ai.utils.site_extractor https://example.com      (or a path to a local .html/.md file)
    import json
    import sys
    from pathlib import Path

    arg = sys.argv[1] if len(sys.argv) > 1 else "ai/test/sample_site/index.html"
    if arg.startswith("http"):
        result = build_knowledge(url=arg)
    else:
        result = build_knowledge(text=Path(arg).read_text(encoding="utf-8"), source_name=Path(arg).name)
    print(json.dumps(result, ensure_ascii=False, indent=2))
