"""Make GigWheels' AI replies not sound like AI.

Two layers, applied to every customer-facing reply (web chat, phone voice, email)
since they all flow through chat-brain's answer():

1. HUMANIZE_GUIDANCE — prompt rules folded into the system prompt so the model
   generates human-sounding text in the first place.
2. humanize(text) — a deterministic, meaning-preserving post-pass that scrubs the
   mechanical AI tells a small model still leaks (em dashes, AI vocabulary,
   throat-clearing openers, emoji, exclamation spam).

Rules distilled from two OSS skills (vendored under skills/):
  - blader/humanizer (Wikipedia "Signs of AI writing", 33 patterns)  [MIT]
  - scanaislop/skills                                                  [MIT]
Kept conservative on purpose: a rental-desk reply must stay accurate, so we only
delete/replace tells that are safe out of context and leave nuanced rewrites
(rule-of-three, negative parallelism) to the prompt.
"""
from __future__ import annotations

import re

HUMANIZE_GUIDANCE = (
    "VOICE & STYLE — sound like a real person at the rental desk, never like an AI:\n"
    "- No em dashes or en dashes (—, –). Use a comma, a period, or restructure.\n"
    "- Banned AI words: delve, leverage, utilize, robust, seamless, elevate, "
    "unlock, tapestry, testament, pivotal, vibrant, intricate, underscore, "
    "showcase, foster, garner, realm, landscape, navigate, embark, holistic, "
    "synergy, crucial. Use plain words (use, not utilize; help, not foster).\n"
    "- No throat-clearing or filler: skip 'Certainly', 'Of course', 'Great "
    "question', 'I'd be happy to', 'It's worth noting', 'Rest assured', 'In "
    "today's world', 'At the end of the day'. Just answer.\n"
    "- No 'It's not just X, it's Y' or 'not only... but also' constructions.\n"
    "- No corporate pep ('game-changer', 'take it to the next level') and no emoji.\n"
    "- Vary sentence length, use contractions (you're, we've, it's), be direct and "
    "warm. Short and specific beats long and polished."
)

# Whole-word AI-vocabulary swaps (lowercase keys; capitalization preserved).
_VOCAB = {
    "utilize": "use", "utilizes": "uses", "utilizing": "using", "utilized": "used",
    "leverage": "use", "leverages": "uses", "leveraging": "using", "leveraged": "used",
    "delve into": "look at", "delve": "dig", "delving": "digging",
    "robust": "solid", "seamless": "smooth", "seamlessly": "smoothly",
    "elevate": "improve", "elevates": "improves",
    "foster": "help", "fosters": "helps", "fostering": "helping",
    "showcase": "show", "showcases": "shows", "showcasing": "showing",
    "underscore": "show", "underscores": "shows",
    "navigate": "handle", "navigating": "handling",
    "crucial": "important", "pivotal": "key", "intricate": "detailed",
    "myriad": "many", "plethora": "plenty", "garner": "get", "garnered": "got",
    "commence": "start", "commences": "starts", "additionally": "also",
}

# Throat-clearing / filler phrases to drop when they lead a sentence or stand alone.
_FILLER = [
    r"certainly[!,.]?", r"of course[!,.]?", r"absolutely[!,.]?",
    r"great question[!,.]?", r"that'?s a great question[!,.]?",
    r"i'?d be happy to(?:\s+help(?:\s+(?:you|with that))?)?[,.]?",
    r"i'?m happy to help[,.]?", r"rest assured[,.]?",
    r"it'?s worth noting that", r"it'?s important to note that",
    r"as an ai(?:\s+language model)?[,.]?", r"in today'?s (?:world|fast-paced world)[,.]?",
    r"at the end of the day[,.]?", r"needless to say[,.]?",
]

_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF✀-➿️]"
)


def _preserve_case(original: str, repl: str) -> str:
    if original[:1].isupper():
        return repl[:1].upper() + repl[1:]
    return repl


def _swap_vocab(text: str) -> str:
    # Longest keys first so "delve into" beats "delve".
    for key in sorted(_VOCAB, key=len, reverse=True):
        pat = re.compile(r"\b" + re.escape(key) + r"\b", re.IGNORECASE)
        text = pat.sub(lambda m: _preserve_case(m.group(0), _VOCAB[key]), text)
    return text


def _strip_dashes(text: str) -> str:
    # Spaced em/en dash or double hyphen used as an aside -> comma.
    text = re.sub(r"\s*[—–]\s*|\s+--\s+", ", ", text)
    # Any stray em/en dash -> comma.
    text = text.replace("—", ", ").replace("–", ", ")
    return text


def _drop_filler(text: str) -> str:
    for ph in _FILLER:
        # At string start or after a sentence break (tolerate extra spaces left by
        # earlier passes). Consume the boundary punctuation and re-emit it.
        text = re.sub(r"(?i)(^|[.!?])\s*" + ph + r"\s*", r"\1 ", text)
    return text


def humanize(text: str) -> str:
    """Deterministic, meaning-preserving scrub of mechanical AI tells."""
    if not text:
        return text
    text = _EMOJI.sub("", text)
    text = _strip_dashes(text)
    text = _drop_filler(text)
    text = _swap_vocab(text)
    text = re.sub(r"!{2,}", "!", text)          # exclamation spam -> one
    text = re.sub(r"!", ".", text)              # rental desk doesn't shout
    text = re.sub(r"[ \t]{2,}", " ", text)      # tidy double spaces
    text = re.sub(r"\s+([,.])", r"\1", text)    # space before punctuation
    text = re.sub(r",\s*,", ", ", text)         # double commas from drops
    # Recapitalize sentence starts that lost their leading word.
    text = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    return text.strip()


def _demo() -> None:
    cases = [
        ("Certainly! I'd be happy to help you utilize our seamless booking — it's robust.",
         lambda o: "—" not in o and "utilize" not in o.lower() and "Certainly" not in o
                   and "seamless" not in o.lower() and "robust" not in o.lower()),
        ("Our rates start at $299/week. 🚗 It's worth noting that insurance is included!",
         lambda o: "🚗" not in o and "worth noting" not in o.lower() and "!" not in o),
        ("We delve into your needs and leverage great cars.",
         lambda o: "delve" not in o.lower() and "leverage" not in o.lower()),
    ]
    for src, ok in cases:
        out = humanize(src)
        assert ok(out), f"FAILED: {src!r} -> {out!r}"
        print(f"OK: {out!r}")
    print("all humanize() checks passed")


if __name__ == "__main__":
    _demo()
