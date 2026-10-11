# Event chatbot: answers visitors' questions from knowledge built by ai/utils/site_extractor.py.
#
#   question -> pick the 3 most relevant chunks (Python, no LLM) -> Gemma answers from them
#
# The site holds plain information ("About us", schedule...), not ready-made Q&A, so retrieval
# looks for the idea of the question, not only its words (SYNONYMS + question type), and Gemma
# reasons over the selected text.
# A typical event site is small (a few thousand characters): up to FULL_CONTEXT_CHARS Gemma gets
# ALL chunks, because word matching misses paraphrases ("koliko traje" -> "36 sati"). Larger
# knowledge goes through retrieval so the prompt stays small (the Kaggle Gemma runs out of GPU
# memory on long inputs).
# Without GEMMA_BASE_URL (or if Gemma fails) a "dummy" mode answers extractively: it returns the
# sentence from the sources that best matches the question.

import json
import math
import os
import re

from ai.prompts.chatbot_prompts import CHATBOT_SYSTEM_PROMPT

MAX_QUESTION_LEN = 500
TOP_K = 4
FULL_CONTEXT_CHARS = 6000  # knowledge up to this size goes to Gemma whole
GEMMA_TIMEOUT_S = float(os.getenv("CHATBOT_GEMMA_TIMEOUT", "60"))  # slower -> extractive answer
MAX_ANSWER_CHARS = 1500
MAX_SECTION_CHARS = 1500  # extractive answer that returns a whole section (list of advice, prizes...)
MIN_SCORE = 1.0
MIN_COVERAGE = 0.5  # share of the question's (IDF-weighted) meaning a chunk must cover
GEMMA_MIN_COVERAGE = 0.25  # Gemma can reject a weak match itself, so it gets more candidates
GEMMA_TOP_K = 5
# Gemma (or the extractive mode) saying it has no answer
NO_ANSWER_RE = re.compile(r"nemam (tu |tu informaciju|informacij|odgovor)|ne znam|nije navedeno|nema informacij|"
                          r"don.t (have|know)|not (mentioned|available|provided|in the sources)|no information", re.I)
MAX_HISTORY_TURNS = 3
DUMMY_MAX_SENTENCES = 2

DIACRITICS = str.maketrans({"š": "s", "č": "c", "ć": "c", "ž": "z", "đ": "dj"})

# Question words and filler (Serbian + English), after diacritics are removed
STOPWORDS = {
    "da", "li", "je", "su", "se", "sam", "si", "smo", "ste", "biti", "bi", "ce", "cu", "a", "i", "ili",
    "u", "na", "za", "od", "do", "sa", "iz", "po", "o", "pre", "posle", "kod", "to", "taj", "ta", "te",
    "koji", "koja", "koje", "kojim", "sta", "ko", "kad", "kada", "gde", "kako", "zasto", "koliko",
    "mogu", "moze", "mozes", "moram", "mora", "treba", "ima", "imate", "imam", "vas", "vam", "nas", "mi",
    "ja", "ti", "on", "ona", "ono", "vi", "oni", "ne", "ni", "jos", "vec", "neko", "nesto", "neki", "sve",
    "ovde", "tamo", "tu", "ako", "dobar", "dobro", "najbolji", "najbolja", "najbolje",
    # filler verbs: they carry no topic, and as "unknown words" would make a question look off-topic
    "bude", "budu", "desava", "desi", "dogadja", "postanem", "postati", "postane", "postanu",
    "zelim", "hocu", "znam", "znati", "ide", "idem", "uradim", "uraditi",
    "the", "is", "are", "what", "when", "where", "who", "how", "much", "many", "can", "does", "you", "your",
    # request words: "tell me the advice for teams", "reci mi nesto o nagradama"
    "tell", "me", "give", "show", "about", "for", "of", "to", "in", "on", "and", "or", "an", "please", "list",
    "some", "any", "there", "do", "my", "we", "our", "it", "this", "that", "with", "more", "info", "explain",
    "describe", "know", "want", "need", "reci", "kazi", "daj", "pokazi", "objasni", "molim", "nabroj",
    "napisi", "informacije", "informacija", "nesto", "malo", "vise", "detalje",
    "should", "have", "has", "had", "would", "could", "will", "be", "was", "were", "am", "if", "which", "why",
    "they", "their", "get", "need", "there", "any",
}

# Small concept map for typical questions about organizations and events: a question term
# that starts with a key also matches text expressing the same idea with other words
# ("kada je osnovan" -> "sve je pocelo 2012", "da li se placa" -> "besplatno").
SYNONYMS = {
    "osnov": ["poce", "nasta", "osnov", "zvanicno"],
    "postoj": ["poce", "nasta", "osnov"],
    "nasta": ["poce", "nasta", "osnov"],
    "found": ["poce", "nasta", "osnov"],
    "kost": ["besplat", "cena", "eur", "naplac"],
    "plac": ["besplat", "cena", "eur", "naplac"],
    "plat": ["besplat", "cena", "eur", "naplac"],
    "cena": ["besplat", "kost", "eur", "naplac"],
    "clanarin": ["besplat", "naplac"],
    "clanov": ["clanov", "zajednic"],
    "hran": ["obrok", "doruc", "ruca", "vecer", "pica"],
    "jest": ["obrok", "doruc", "ruca", "vecer", "pica"],
    "spav": ["smestaj", "odmor", "duse", "vrec"],
    "prenoc": ["smestaj", "odmor", "noci"],
    "kontakt": ["kontakt", "mejl", "email", "discord", "pisite", "javite", "pult"],
    "javi": ["mejl", "email", "discord", "pisite", "javite"],
    "lokacij": ["adres", "ulica", "lokacij", "sala", "sprat"],
    "odrzav": ["lokacij", "odrzava"],
    "dodj": ["autobus", "stanica", "parking"],
    "stig": ["autobus", "stanica", "parking"],
    "autobus": ["autobus", "stanica"],
    "vodi": ["organizator", "vodi", "zaduz"],
    "sponzor": ["partner", "sponzor"],
    "nagrad": ["mesto", "eur", "usd", "nagrad"],
    "novc": ["eur", "usd", "nagrad"],
    "pobed": ["pobed", "mesto", "nagrad"],
    "godin": ["godin", "najmanje"],
    "volont": ["volonter", "javite", "dobrodos"],
    "pravil": ["pravil", "kodeks"],
    "ponasan": ["ponasan", "kodeks"],
    "krs": ["prekrs", "kodeks", "udalj"],
    "predaj": ["preda", "github", "repozitorij"],
    "preda": ["preda", "github", "repozitorij"],
    "tim": ["tim", "clana"],
    "ljud": ["ucesnik", "clana", "osoba"],
    "ucestv": ["ucesni", "ucestv", "prijav"],
    "hakato": ["hakato", "hackathon"],
    # generic event vocabulary
    "pocin": ["pocet", "odrzava", "otvaranj", "pocin"],
    "pocet": ["pocet", "odrzava", "otvaranj"],
    "traj": ["sati", "trajanj", "traje", "odrzava"],
    "ocen": ["kriterij", "ziri", "ocen"],
    "ziri": ["ziri", "kriterij"],
    "kriterij": ["kriterij", "ziri"],
    "parkir": ["parking", "parkir"],
    "pones": ["poneti", "pones"],
    "tem": ["tema", "temu", "temom"],
    "prijav": ["prijav", "forma", "rok"],
    "rok": ["rok", "prijav"],
    "wifi": ["wifi", "bezicn"],
    # English questions about a Serbian site
    "free": ["besplat", "naplac", "free"],
    "price": ["besplat", "cena", "eur", "naplac"],
    "cost": ["besplat", "cena", "eur", "naplac"],
    "pay": ["besplat", "cena", "eur", "naplac"],
    "start": ["pocet", "pocin", "odrzava", "otvaranj"],
    "begin": ["pocet", "pocin", "odrzava", "otvaranj"],
    "end": ["kraj", "zatvaranj"],
    "long": ["sati", "trajanj", "traje"],
    "food": ["obrok", "doruc", "ruca", "vecer", "pica", "hran"],
    "eat": ["obrok", "doruc", "ruca", "vecer", "pica", "hran"],
    "lunch": ["ruca"],
    "breakfast": ["doruc"],
    "dinner": ["vecer"],
    "sleep": ["smestaj", "odmor", "duse", "vrec"],
    "prize": ["nagrad", "mesto", "eur", "usd"],
    "award": ["nagrad", "mesto", "eur", "usd"],
    "win": ["pobed", "nagrad", "mesto"],
    "team": ["tim", "clan"],
    "age": ["godin", "najmanje"],
    "old": ["godin", "najmanje"],
    "regist": ["prijav", "registr"],
    "apply": ["prijav"],
    "deadline": ["prijav", "rok"],
    "contact": ["mejl", "email", "discord", "pisite", "kontakt", "pult"],
    "email": ["mejl", "email"],
    "park": ["parking"],
    "bring": ["poneti", "pones"],
    "rule": ["pravil", "kodeks"],
    "judg": ["ziri", "kriterij"],
    "criteri": ["kriterij", "ziri"],
    "theme": ["tema", "temu"],
    "topic": ["tema", "temu"],
    "sponsor": ["sponzor", "partner"],
    "partner": ["sponzor", "partner"],
    "mentor": ["mentor"],
    "organiz": ["organizator", "organizuje", "vodi"],
    "hackathon": ["hakato", "hackathon"],
    "location": ["lokacij", "adres", "ulica"],
    "address": ["lokacij", "adres", "ulica"],
}

# Question type -> pattern that a good answer usually contains
QUESTION_TYPES = [
    (re.compile(r"\b(kada|kad|kog datuma|koje godine|when)\b"), re.compile(r"\b(19|20)\d{2}\b|\d{1,2}:\d{2}|\b\d{1,2}\.\s")),
    (re.compile(r"\b(koliko|how much|how many)\b"), re.compile(r"\d")),
    (re.compile(r"\b(ko|who)\b"), re.compile(r"\b[A-ZČĆŠŽĐ][a-zčćšžđ]+ [A-ZČĆŠŽĐ][a-zčćšžđ]+")),
    (re.compile(r"\b(gde|where)\b"), re.compile(r"(ulic|adres|bulevar|\b\d+\b,|sprat|sala|lokacij)", re.I)),
]


class ChatbotError(Exception):
    pass


# ---------- text helpers ----------

def _normalize(text: str) -> str:
    return (text or "").lower().translate(DIACRITICS)


def _stem(word: str) -> str:
    # Crude stemming for Serbian cases; matched as a WORD PREFIX (see _hit), so it can be short:
    # "parkiram" -> "parki" (parking), "ponesem" -> "pone" (poneti), "tema" -> "tem" (temu)
    if len(word) >= 6:
        return word[:max(4, len(word) - 3)]
    if len(word) >= 4 and not word.isdigit():
        return word[:-1]
    return word


def _words(text: str) -> list[str]:
    return re.findall(r"\w+", _normalize(text))


def _hit(term: str, words: list[str]) -> bool:
    """A term matches a word that starts with it ("besplat" -> "besplatno"), not any substring,
    so "tim" does not match "optimizacija". Terms with a space or punctuation match as text."""
    if not term.isalnum():
        return term in " ".join(words)
    return any(w.startswith(term) for w in words)


def question_groups(question: str) -> list[set[str]]:
    """One group per meaningful question word: the stem plus related concepts (SYNONYMS).
    A group is matched when any of its terms appears in a chunk."""
    groups = []
    for w in re.findall(r"\w+", _normalize(question)):
        if w in STOPWORDS or (len(w) < 3 and not w.isdigit()):
            continue
        term = _stem(w)
        group = {term}
        for key, related in SYNONYMS.items():
            if w.startswith(key):  # full word, so a short stem ("pravi" from "pravila") still finds "pravil"
                group.update(related)
        if group not in groups:
            groups.append(group)
    return groups


def _wanted_patterns(question: str) -> list:
    q = _normalize(question)
    return [answer_re for q_re, answer_re in QUESTION_TYPES if q_re.search(q)]


def _split_sentences(text: str) -> list[str]:
    # Split on . ! ? only before a capital letter, so "2012. godine" and "22. novembra" stay whole
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZČĆŠŽĐ\"„])|\n", text)
    return [p.strip(" -") for p in parts if p.strip(" -")]


# ---------- retrieval ----------

def select_chunks(question: str, chunks: list[dict], top_k: int = TOP_K,
                  min_coverage: float = MIN_COVERAGE) -> list[dict]:
    """Rank chunks by IDF-weighted matches of the question's word groups (heading counts double),
    plus a bonus when the chunk contains what the question type asks for (a year, a number, a name).
    Chunks covering less than MIN_COVERAGE of the question are dropped, so off-topic questions
    ("ko je predsednik Srbije?") get no sources instead of a random paragraph."""
    groups = question_groups(question)
    if not groups or not chunks:
        return []
    texts = [(_words(c.get("heading", "")), _words(c.get("text", ""))) for c in chunks]
    n = len(chunks)

    def idf(present: int) -> float:
        return math.log(1 + n / (1 + present))

    term_idf = {t: idf(sum(_hit(t, h) or _hit(t, b) for h, b in texts)) for g in groups for t in g}
    group_idf = [idf(sum(any(_hit(t, h) or _hit(t, b) for t in g) for h, b in texts)) for g in groups]
    total = sum(group_idf)
    wanted = _wanted_patterns(question)

    scored = []
    for chunk, (head, body) in zip(chunks, texts):
        score, covered = 0.0, 0.0
        for g, g_idf in zip(groups, group_idf):
            hits = [t for t in g if _hit(t, head) or _hit(t, body)]
            if hits:
                covered += g_idf
                score += max(term_idf[t] for t in hits) * (2 if any(_hit(t, head) for t in hits) else 1)
        coverage = covered / total if total else 0
        if score and any(p.search(chunk.get("text", "")) for p in wanted):
            score += 0.75
        if coverage >= min_coverage and score >= MIN_SCORE:
            scored.append((score, coverage, chunk))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [dict(c, score=round(s, 2), coverage=round(cov, 2)) for s, cov, c in scored[:top_k]]


# ---------- answering ----------

def _section_text(src: dict, chunks: list[dict]) -> str:
    """The whole section of a chunk: a long section is split into several chunks with the same
    heading and url, so the following ones are added back ("Tips for Success" after the cut)."""
    parts, ids = [src["text"]], {src["id"]}
    for c in chunks or []:
        if c["id"] > src["id"] and c["id"] not in ids and c.get("heading") == src.get("heading") \
                and c.get("url") == src.get("url") and c["id"] == max(ids) + 1:
            parts.append(c["text"])
            ids.add(c["id"])
    text = "\n".join(parts)
    if len(text) > MAX_SECTION_CHARS:
        cut = text.rfind("\n", 0, MAX_SECTION_CHARS)
        text = text[:cut if cut > 0 else MAX_SECTION_CHARS].rstrip() + "\n…"
    return text


def _dummy_answer(question: str, sources: list[dict], fallback: str,
                  chunks: list[dict] | None = None) -> tuple[str, list[int]]:
    """Extractive answer without an LLM.
    - The question names a section ("Tell me the advice for teams", "Koje su nagrade?"): the
      top source's heading covers most of the question -> the whole section (all its items).
    - Otherwise the best-matching sentence(s) from the top source (the next sources are used
      only if the top one has no matching sentence)."""
    if not sources:
        return fallback, []
    groups = question_groups(question)
    wanted = _wanted_patterns(question)
    top = sources[0]
    head = _words(top.get("heading", "").split(">")[-1])
    head_hits = sum(1 for g in groups if any(_hit(t, head) for t in g))
    # ...unless it asks for one fact ("do kada", "koliko", "gde"): then the matching sentence
    if groups and not wanted and head_hits / len(groups) > 0.5:
        return _section_text(top, chunks), [top["id"]]
    for src in sources:
        candidates = []
        sentences = _split_sentences(src["text"])
        for pos, sentence in enumerate(sentences):
            if len(sentence) < 12:
                continue
            words = _words(sentence)
            score = sum(1 for g in groups if any(_hit(t, words) for t in g))
            # "kada" wants the sentence with the year, "gde" the one with the address
            score += 2 if any(p.search(sentence) for p in wanted) else 0
            if score:
                candidates.append((score, pos, sentence))
        if not candidates:
            # A list under a matching heading ("Sta poneti" -> "- Laptop...") has no matching
            # sentence: the list itself is the answer
            if any(any(_hit(t, _words(src.get("heading", ""))) for t in g) for g in groups):
                return _section_text(src, chunks), [src["id"]]
            continue
        candidates.sort(key=lambda c: c[0], reverse=True)  # stable: earlier sentence wins ties
        best = candidates[0][0]
        picked = sorted([c for c in candidates if c[0] >= best * 0.6][:DUMMY_MAX_SENTENCES], key=lambda c: c[1])
        if picked[0][2].endswith("?"):
            # FAQ: the matching sentence is the question ("Who can participate?"), the answer follows it
            pos = picked[0][1]
            follow = [t for t in sentences[pos + 1:pos + 1 + DUMMY_MAX_SENTENCES]]
            follow = follow[:next((i for i, t in enumerate(follow) if t.endswith("?")), len(follow))]
            if follow:
                picked = [(0, pos + 1 + i, t) for i, t in enumerate(follow)]
        answer = " ".join(c[2] if c[2].endswith((".", "!", "?")) else c[2] + "." for c in picked)
        return answer, [src["id"]]
    return _split_sentences(sources[0]["text"])[0], [sources[0]["id"]]


def _format_sources(sources: list[dict]) -> str:
    return "\n\n".join(f'<source id="{s["id"]}" section="{s["heading"]}">\n{s["text"]}\n</source>' for s in sources)


def _format_history(history: list[dict]) -> str:
    lines = []
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        q, a = str(turn.get("question", ""))[:300], str(turn.get("answer", ""))[:300]
        if q:
            lines.append(f"Visitor: {q}\nAssistant: {a}")
    return "\n".join(lines)


def _parse_gemma(raw: str) -> tuple[str, list[int]]:
    text = re.sub(r"<[^>]+>|```(?:json)?", "", raw or "").strip()
    start, end = text.find("{"), text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            data = json.loads(text[start:end])
            ids = [int(i) for i in data.get("source_ids", []) if str(i).isdigit()]
            if str(data.get("answer", "")).strip():
                return str(data["answer"]).strip()[:MAX_ANSWER_CHARS], ids
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return text[:MAX_ANSWER_CHARS], []  # Gemma ignored the JSON format: use its plain text


def _contact_fallback(knowledge: dict) -> str:
    contact = next((c for c in knowledge.get("chunks", []) if "kontakt" in _normalize(c.get("heading", ""))), None)
    hint = f" Za više informacija: {_split_sentences(contact['text'])[0]}" if contact else ""
    return "Nažalost, nemam tu informaciju." + hint


def answer_question(question: str, knowledge: dict, history: list[dict] | None = None,
                    use_gemma: bool | None = None) -> dict:
    """Main entry point. Returns {answer, sources: [{id, heading, url}], mode: "gemma"|"dummy"}."""
    question = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", question or "")).strip()[:MAX_QUESTION_LEN]
    if not question:
        raise ChatbotError("Question is empty")
    chunks = (knowledge or {}).get("chunks") or []
    if not chunks:
        raise ChatbotError("Knowledge has no chunks")

    # Follow-up questions ("a koliko to košta?") also search with the previous question
    last_q = str((history or [{}])[-1].get("question", "")) if history else ""

    def retrieve(**kw):
        return select_chunks(question, chunks, **kw) or (select_chunks(f"{last_q} {question}", chunks, **kw) if last_q else [])

    sources = retrieve()  # strict: extractive answer + sources shown to the visitor
    fallback = _contact_fallback(knowledge)

    if use_gemma is None:
        use_gemma = bool(os.getenv("GEMMA_BASE_URL"))
    # What Gemma reads: the best matching chunks (a small Gemma answers much better from a few
    # relevant paragraphs than from the whole site). Only when nothing matches: the whole site if
    # it is small, or the intro for a question made only of question words ("ko ste vi?").
    gemma_sources = retrieve(top_k=GEMMA_TOP_K, min_coverage=GEMMA_MIN_COVERAGE)
    if not gemma_sources:
        if sum(len(c.get("text", "")) for c in chunks) <= FULL_CONTEXT_CHARS:
            gemma_sources = chunks
        elif not question_groups(question):
            gemma_sources = chunks[:TOP_K]
    gemma_sources = sorted(gemma_sources, key=lambda c: c["id"])  # page order reads naturally

    mode, reason = "dummy", "no GEMMA_BASE_URL" if not use_gemma else "no matching text"
    if use_gemma and gemma_sources:
        try:
            from ai.utils.gemma_client import call_kaggle_gemma
            org = knowledge.get("title", "").split("|")[-1].strip() or "the organization"
            # The question goes first AND last: a long prompt cut by the model server keeps it
            user_prompt = (f"VISITOR QUESTION: {question}\n\n"
                           f"SOURCES:\n{_format_sources(gemma_sources)}\n\n"
                           + (f"CONVERSATION SO FAR:\n{_format_history(history)}\n\n" if history else "")
                           + f"Answer this VISITOR QUESTION from the SOURCES above: {question}")
            raw = call_kaggle_gemma(CHATBOT_SYSTEM_PROMPT.format(org_name=org), user_prompt,
                                    timeout=GEMMA_TIMEOUT_S)
            answer, used_ids = _parse_gemma(raw)
            mode, reason = "gemma", "ok"
            # Gemma gave up although the text matches the question: the extractive answer is better
            if (not answer.strip() or NO_ANSWER_RE.search(answer)) and sources:
                answer, used_ids = _dummy_answer(question, sources, fallback, chunks)
                mode, reason = "dummy", f"gemma said no answer: {raw!r:.200}"
        except Exception as e:  # Gemma down or slower than GEMMA_TIMEOUT_S: still answer from the sources
            answer, used_ids = _dummy_answer(question, sources, fallback, chunks)
            reason = f"gemma failed: {e}"
    else:
        answer, used_ids = _dummy_answer(question, sources, fallback, chunks)

    pool = gemma_sources if mode == "gemma" else sources
    used = [s for s in pool if s["id"] in used_ids]
    if not used and mode == "gemma" and not NO_ANSWER_RE.search(answer):
        used = sources  # Gemma answered but did not list ids: show the best matches
    # One line per question in the AI service console: why the bot answered the way it did
    print(f"[chatbot] q={question[:80]!r} chunks={len(chunks)} chars={sum(len(c.get('text', '')) for c in chunks)} matched={[c['id'] for c in sources]} "
          f"to_gemma={len(gemma_sources) if use_gemma else 0} mode={mode} ({reason})", flush=True)
    return {
        "answer": answer,
        "sources": [{"id": s["id"], "heading": s["heading"], "url": s["url"]} for s in used],
        "mode": mode,
    }
