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
# Pages rendered by JavaScript (React/Angular/Vue apps) come back almost empty when fetched.
# Such pages are opened in a headless Chromium (Playwright) and read after the JavaScript ran.
# Playwright is optional: without it those pages get a warning (paste the text instead).
#   pip install playwright
#   python -m playwright install chromium

import asyncio
import json
import re
import sys
from collections import deque
from html.parser import HTMLParser
from urllib.parse import urldefrag, urljoin, urlparse

import requests

MAX_PAGES = 10
MAX_PAGE_BYTES = 2_000_000
MAX_CHUNK_CHARS = 1200  # a typical section (a list of advice, the prizes) stays in one chunk
MIN_PAGE_CHARS = 200  # less text than this usually means a JavaScript-rendered page
MIN_KNOWLEDGE_CHARS = 150  # less than this in total: the bot could not answer anything
TIMEOUT_S = 15
RENDER_TIMEOUT_MS = 20000  # headless browser: page load
RENDER_SETTLE_MS = 8000    # headless browser: wait for the app to draw its text
INSTALL_HINT = "pip install playwright && python -m playwright install chromium"
# Browser-like, so sites do not serve a bot page instead of their content
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/124.0 Safari/537.36 InfoStone-Chatbot/1.0")

# Content inside these tags is navigation, scripts or UI chrome, not knowledge.
# (<form> is NOT skipped: some sites wrap the whole page in one, e.g. ASP.NET.)
SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "nav", "button", "iframe", "select", "aside"}
# The site's banner/footer is chrome, but a <header> inside <main>/<article> holds the title and date
PAGE_CHROME_TAGS = {"header", "footer"}
CONTENT_TAGS = {"main", "article"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
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
        # Skipping a subtree: the tag that started it and how deep the same tag is nested in it
        # (only that tag's end closes the subtree, so <span aria-hidden="true"> ends at </span>)
        self._skip_tag, self._skip_nest = None, 0
        self._content_depth = 0  # inside <main>/<article>
        self._ld = None  # text of a <script type="application/ld+json"> being read
        self.structured = []  # blocks from schema.org Event data (date, place, price...)
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
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json" and not self._skip_tag:
            self._ld = []
        if self._skip_tag:
            if tag == self._skip_tag:
                self._skip_nest += 1
            return
        if tag not in VOID_TAGS and (tag in SKIP_TAGS or attrs.get("aria-hidden") == "true"
                                     or (tag in PAGE_CHROME_TAGS and not self._content_depth)):
            self._flush()
            self._skip_tag, self._skip_nest = tag, 1
            return
        if tag in CONTENT_TAGS:
            self._content_depth += 1
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
        if self._skip_tag:
            if tag == self._skip_tag:
                self._skip_nest -= 1
                if self._skip_nest == 0:
                    self._skip_tag = None
                    if tag == "script" and self._ld is not None:
                        self.structured += _structured_blocks("".join(self._ld))
                        self._ld = None
            return
        if tag in CONTENT_TAGS:
            self._content_depth = max(0, self._content_depth - 1)
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
        if self._ld is not None:
            self._ld.append(data)
        elif self._in_title:
            self.title += data
        elif not self._skip_tag:
            self._buf.append(data)

    def close(self):
        super().close()
        self._flush()


def _structured_blocks(raw: str) -> list:
    """schema.org Event data that event platforms put in <script type="application/ld+json">
    (often the most reliable source of date, place and price, even on JavaScript sites)."""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return []
    items = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
    blocks = []
    for item in items:
        if not isinstance(item, dict) or "Event" not in str(item.get("@type", "")):
            continue
        place = item.get("location") or {}
        place = place[0] if isinstance(place, list) and place else place
        address = place.get("address") if isinstance(place, dict) else None
        if isinstance(address, dict):
            address = ", ".join(str(address[k]) for k in ("streetAddress", "addressLocality", "addressCountry")
                                if address.get(k))
        offers = item.get("offers") or {}
        offers = offers[0] if isinstance(offers, list) and offers else offers
        organizer = item.get("organizer") or {}
        organizer = organizer[0] if isinstance(organizer, list) and organizer else organizer
        lines = [
            ("Naziv", item.get("name")),
            ("Početak", item.get("startDate")),
            ("Kraj", item.get("endDate")),
            ("Mesto", ", ".join(str(x) for x in (place.get("name") if isinstance(place, dict) else place, address) if x)),
            ("Organizator", organizer.get("name") if isinstance(organizer, dict) else organizer),
            ("Cena", ("besplatno" if str(offers.get("price")).strip() in ("0", "0.0", "0.00") else
                      f'{offers.get("price")} {offers.get("priceCurrency", "")}'.strip())
             if isinstance(offers, dict) and offers.get("price") not in (None, "") else None),
            ("Opis", item.get("description")),
        ]
        text = [f"- {label}: {re.sub(r'<[^>]+>', ' ', str(value)).strip()}" for label, value in lines if value]
        if text:
            blocks.append(("h", 2, "Podaci o događaju"))
            blocks += [("p", 0, t) for t in text]
    return blocks


def parse_html(html: str) -> dict:
    parser = _BlockParser()
    parser.feed(html)
    parser.close()
    return {
        "title": re.sub(r"\s+", " ", parser.title).strip(),
        "description": parser.description,
        "blocks": parser.blocks + parser.structured,
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


def _text_chars(page: dict) -> int:
    return sum(len(t) for _, _, t in page["blocks"])


class _BrowserRenderer:
    """Headless Chromium for JavaScript-rendered pages. Started on the first page that needs it
    (one browser for the whole crawl), closed by crawl(). If Playwright or its Chromium is not
    installed, render() returns None and `missing` explains why."""

    def __init__(self):
        self._pw = self._browser = self._context = None
        self.missing = None
        self.used = False

    def _start(self) -> bool:
        if self._context:
            return True
        if self.missing:
            return False
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.missing = f"Playwright is not installed ({INSTALL_HINT})"
            return False
        # Windows: Playwright starts Chromium as a subprocess, which needs the Proactor event loop;
        # uvicorn --reload switches the policy to Selector, so use Proactor just for this start
        old_policy = asyncio.get_event_loop_policy()
        if sys.platform == "win32" and not isinstance(old_policy, asyncio.WindowsProactorEventLoopPolicy):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        try:
            self._pw = sync_playwright().start()
            self._browser = self._pw.chromium.launch(headless=True)
            self._context = self._browser.new_context(user_agent=USER_AGENT)
            # Text is all we need: skip images, fonts and media
            self._context.route("**/*", lambda route: route.abort()
                                if route.request.resource_type in ("image", "media", "font")
                                else route.continue_())
            return True
        except Exception as e:  # e.g. Chromium not downloaded yet
            self.missing = f"Headless browser could not start ({INSTALL_HINT}): {e!r}"
            self.close()
            return False
        finally:
            if asyncio.get_event_loop_policy() is not old_policy:
                asyncio.set_event_loop_policy(old_policy)

    def render(self, url: str) -> str | None:
        if not self._start():
            return None
        page = self._context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=RENDER_TIMEOUT_MS)
            try:  # wait until the app has drawn some text (dev servers keep a socket open,
                  # so "network idle" alone is not reliable)
                page.wait_for_function("document.body && document.body.innerText.trim().length > 50",
                                       timeout=RENDER_SETTLE_MS)
                page.wait_for_load_state("networkidle", timeout=2000)
            except Exception:
                pass  # take whatever is there
            self.used = True
            return page.content()
        except Exception as e:
            print(f"Headless render failed for {url}: {e}")
            return None
        finally:
            page.close()

    def close(self):
        for obj, method in ((self._context, "close"), (self._browser, "close"), (self._pw, "stop")):
            try:
                if obj:
                    getattr(obj, method)()
            except Exception:
                pass
        self._pw = self._browser = self._context = None


def crawl(start_url: str, max_pages: int = MAX_PAGES, renderer: "_BrowserRenderer | None" = None) -> list[dict]:
    """Breadth-first crawl of pages on the same host. Returns parsed pages with their url.
    A page with almost no text (JavaScript app) is opened again in the headless browser."""
    if urlparse(start_url).scheme not in ("http", "https"):
        raise ExtractError("URL must start with http:// or https://")
    renderer = renderer or _BrowserRenderer()
    queue, seen, pages = deque([start_url]), {start_url}, []
    try:
        while queue and len(pages) < max_pages:
            url = queue.popleft()
            try:
                page = parse_html(fetch_page(url))
            except (requests.RequestException, ExtractError) as e:
                if not pages and url == start_url:
                    raise ExtractError(f"Could not load {url}: {e}") from e
                continue
            if _text_chars(page) < MIN_PAGE_CHARS:
                rendered_html = renderer.render(url)
                if rendered_html:
                    rendered = parse_html(rendered_html)
                    if _text_chars(rendered) > _text_chars(page):
                        rendered["rendered"] = True
                        page = rendered
            page["url"] = url
            pages.append(page)
            for link in _same_site_links(url, page["links"]):
                if link not in seen:
                    seen.add(link)
                    queue.append(link)
    finally:
        renderer.close()
    return pages


# ---------- public API ----------

def build_knowledge(url: str | None = None, text: str | None = None, source_name: str = "",
                    max_pages: int = MAX_PAGES) -> dict:
    """Build chatbot knowledge from a website URL or from pasted text/Markdown/HTML."""
    renderer = _BrowserRenderer()
    if url:
        pages = crawl(url.strip(), max_pages, renderer)
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
        if _text_chars(page) < MIN_PAGE_CHARS and not page.get("rendered"):
            hint = f" {renderer.missing}." if renderer.missing else ""
            warnings.append(f"Very little text on {page['url']} - the page is probably rendered by "
                            f"JavaScript.{hint} Paste the page text instead.")
        title = page["title"].split("|")[0].strip()
        for chunk in chunk_blocks(page["blocks"], page["url"], title):
            key = re.sub(r"\W+", " ", chunk["text"].lower()).strip()
            if key in seen_texts:  # same boilerplate repeated on every page
                continue
            seen_texts.add(key)
            chunks.append({"id": len(chunks) + 1, **chunk})

    if not chunks:
        raise ExtractError("No readable text found. " + " ".join(warnings))
    total_chars = sum(len(c["text"]) for c in chunks)
    if total_chars < MIN_KNOWLEDGE_CHARS:
        # Saving this would give a bot that answers "nemam tu informaciju" to every question
        hint = f" {renderer.missing}." if renderer.missing else ""
        raise ExtractError(f"Only {total_chars} characters of text were found ({source}). The site is probably "
                           f"rendered by JavaScript (Angular/React).{hint} Use 'Paste text' or upload an "
                           ".html/.md file instead.")

    first = pages[0]
    return {
        "title": first["title"] or (chunks[0]["heading"] if chunks else ""),
        "description": first.get("description", ""),
        "source": source,
        "chunks": chunks,
        "stats": {"pages": len(pages), "chunks": len(chunks), "chars": sum(len(c["text"]) for c in chunks),
                  "rendered_pages": sum(1 for p in pages if p.get("rendered"))},
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
