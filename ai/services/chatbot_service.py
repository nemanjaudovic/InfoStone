# Event chatbot: answers visitors' questions from knowledge built by ai/utils/site_extractor.py.
#
#   question -> pick the 3 most relevant chunks (Python, no LLM) -> Gemma answers from them
#
# The site holds plain information ("About us", schedule...), not ready-made Q&A, so retrieval
# looks for the idea of the question, not only its words (SYNONYMS + question type), and Gemma
# reasons over the selected text. Only those chunks go to Gemma, so the prompt stays small
# (the Kaggle Gemma runs out of GPU memory on long inputs).
# Without GEMMA_BASE_URL (or if Gemma fails) a "dummy" mode answers extractively: it returns the
# sentence from the sources that best matches the question.

import json
import math
import os
import re

from ai.prompts.chatbot_prompts import CHATBOT_SYSTEM_PROMPT

MAX_QUESTION_LEN = 500
TOP_K = 3
MIN_SCORE = 1.0
MIN_COVERAGE = 0.5  # share of the question's (IDF-weighted) meaning a chunk must cover
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
    "kontakt": ["mejl", "email", "discord", "pisite", "javite", "pult"],
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
    # Crude stemming for Serbian cases: "osnovana" -> "osnova", "hakatonu" -> "hakato"
    return word[:max(4, len(word) - 2)] if len(word) > 4 else word


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

def select_chunks(question: str, chunks: list[dict], top_k: int = TOP_K) -> list[dict]:
    """Rank chunks by IDF-weighted matches of the question's word groups (heading counts double),
    plus a bonus when the chunk contains what the question type asks for (a year, a number, a name).
    Chunks covering less than MIN_COVERAGE of the question are dropped, so off-topic questions
    ("ko je predsednik Srbije?") get no sources instead of a random paragraph."""
    groups = question_groups(question)
    if not groups or not chunks:
        return []
    texts = [(_normalize(c.get("heading", "")), _normalize(c.get("text", ""))) for c in chunks]
    n = len(chunks)

    def idf(present: int) -> float:
        return math.log(1 + n / (1 + present))

    term_idf = {t: idf(sum(t in h or t in b for h, b in texts)) for g in groups for t in g}
    group_idf = [idf(sum(any(t in h or t in b for t in g) for h, b in texts)) for g in groups]
    total = sum(group_idf)
    wanted = _wanted_patterns(question)

    scored = []
    for chunk, (head, body) in zip(chunks, texts):
        score, covered = 0.0, 0.0
        for g, g_idf in zip(groups, group_idf):
            hits = [t for t in g if t in head or t in body]
            if hits:
                covered += g_idf
                score += max(term_idf[t] for t in hits) * (2 if any(t in head for t in hits) else 1)
        coverage = covered / total if total else 0
        if score and any(p.search(chunk.get("text", "")) for p in wanted):
            score += 0.75
        if coverage >= MIN_COVERAGE and score >= MIN_SCORE:
            scored.append((score, coverage, chunk))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [dict(c, score=round(s, 2), coverage=round(cov, 2)) for s, cov, c in scored[:top_k]]


# ---------- answering ----------

def _dummy_answer(question: str, sources: list[dict], fallback: str) -> tuple[str, list[int]]:
    """Extractive answer without an LLM: the best-matching sentence(s) from the top source
    (the next sources are used only if the top one has no matching sentence)."""
    if not sources:
        return fallback, []
    groups = question_groups(question)
    wanted = _wanted_patterns(question)
    for src in sources:
        candidates = []
        for pos, sentence in enumerate(_split_sentences(src["text"])):
            if len(sentence) < 12:
                continue
            norm = _normalize(sentence)
            score = sum(1 for g in groups if any(t in norm for t in g))
            # "kada" wants the sentence with the year, "gde" the one with the address
            score += 2 if any(p.search(sentence) for p in wanted) else 0
            if score:
                candidates.append((score, pos, sentence))
        if not candidates:
            continue
        candidates.sort(key=lambda c: c[0], reverse=True)  # stable: earlier sentence wins ties
        best = candidates[0][0]
        picked = sorted([c for c in candidates if c[0] >= best * 0.6][:DUMMY_MAX_SENTENCES], key=lambda c: c[1])
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
                return str(data["answer"]).strip(), ids
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return text, []  # Gemma ignored the JSON format: use its plain text


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
    sources = select_chunks(question, chunks) or (select_chunks(f"{last_q} {question}", chunks) if last_q else [])
    fallback = _contact_fallback(knowledge)

    if use_gemma is None:
        use_gemma = bool(os.getenv("GEMMA_BASE_URL"))
    mode = "dummy"
    if use_gemma and sources:
        try:
            from ai.utils.gemma_client import call_kaggle_gemma
            org = knowledge.get("title", "").split("|")[-1].strip() or "the organization"
            user_prompt = (f"SOURCES:\n{_format_sources(sources)}\n\n"
                           + (f"CONVERSATION SO FAR:\n{_format_history(history)}\n\n" if history else "")
                           + f"VISITOR QUESTION: {question}")
            answer, used_ids = _parse_gemma(call_kaggle_gemma(CHATBOT_SYSTEM_PROMPT.format(org_name=org), user_prompt))
            mode = "gemma"
        except Exception as e:  # Gemma down or slow: still answer from the sources
            print(f"Gemma failed, using dummy answer: {e}")
            answer, used_ids = _dummy_answer(question, sources, fallback)
    else:
        answer, used_ids = _dummy_answer(question, sources, fallback)

    used = [s for s in sources if s["id"] in used_ids]
    if not used and mode == "gemma":
        used = sources  # Gemma answered but did not list ids: show what it was given
    return {
        "answer": answer,
        "sources": [{"id": s["id"], "heading": s["heading"], "url": s["url"]} for s in used],
        "mode": mode,
    }
