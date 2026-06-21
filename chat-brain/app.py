"""
GigWheels chat-brain — a tiny RAG agent for the Chatwoot live-chat widget.

Flow: Chatwoot agent-bot POSTs message events here → we embed the customer's
question with Ollama `nomic-embed-text`, cosine-retrieve the most relevant KB
chunks, ask `gemma3:12b` to answer ONLY from that context, then post the reply
back to Chatwoot. Out-of-scope questions are handed to a human.

Deliberately dependency-light: the KB is a handful of markdown sections, so an
in-memory cosine search over precomputed embeddings is plenty — no vector DB.
# ponytail: in-memory KB; swap to pgvector only if the KB grows past ~hundreds of chunks.
"""
from __future__ import annotations

import logging
import math
import os
import pathlib
import re

import httpx
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("chat-brain")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama.prod-forex:11434").rstrip("/")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "gemma3:12b")
KB_DIR = pathlib.Path(os.environ.get("KB_DIR", "/app/kb"))
TOP_K = int(os.environ.get("TOP_K", "4"))

# Chatwoot reply target (cluster-internal) + agent-bot token.
CW_API = os.environ.get("CHATWOOT_API_URL", "http://chatwoot-web.gigwheels-chat:3000").rstrip("/")
CW_BOT_TOKEN = os.environ.get("CHATWOOT_BOT_TOKEN", "")

SYSTEM_PROMPT = (
    "You are the GigWheels assistant on a weekly car-leasing website. "
    "Answer ONLY from the CONTEXT below. Be concise, friendly, and accurate. "
    "If the answer is not in the context, say you are not certain and offer to "
    "connect them with a human via the Contact page — never invent prices, "
    "policies, or terms. Use plain text suitable for a chat bubble."
)

app = FastAPI(title="GigWheels chat-brain")
_KB: list[tuple[str, list[float]]] = []  # (chunk_text, embedding)


def _chunks(md: str) -> list[str]:
    """Split KB markdown into one chunk per `##` section (drop the H1 preamble heading)."""
    parts = re.split(r"\n(?=## )", md.strip())
    return [p.strip() for p in parts if p.strip() and not p.strip().startswith("# GigWheels Knowledge")]


def _embed(text: str) -> list[float]:
    r = httpx.post(f"{OLLAMA_URL}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text}, timeout=60)
    r.raise_for_status()
    return r.json()["embedding"]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


@app.on_event("startup")
def _load_kb() -> None:
    for f in sorted(KB_DIR.glob("*.md")):
        for ch in _chunks(f.read_text()):
            try:
                _KB.append((ch, _embed(ch)))
            except Exception as e:  # noqa: BLE001 — startup best-effort; log and continue
                log.error("embed failed for a chunk in %s: %s", f.name, e)
    log.info("KB loaded: %d chunks from %s", len(_KB), KB_DIR)


def _retrieve(question: str) -> str:
    if not _KB:
        return ""
    qv = _embed(question)
    ranked = sorted(_KB, key=lambda kv: _cosine(qv, kv[1]), reverse=True)
    return "\n\n".join(text for text, _ in ranked[:TOP_K])


def answer(question: str) -> str:
    context = _retrieve(question)
    if not context:
        return ("I'm not able to look that up right now. Please reach us via the "
                "Contact page at https://gigwheels.strategybase.io/contact and a "
                "team member will help.")
    prompt = f"CONTEXT:\n{context}\n\nQUESTION: {question}"
    r = httpx.post(
        f"{OLLAMA_URL}/api/chat",
        json={
            "model": CHAT_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0.2},
        },
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["message"]["content"].strip()


def _cw_reply(account_id: int, conversation_id: int, content: str) -> None:
    if not CW_BOT_TOKEN:
        log.warning("CHATWOOT_BOT_TOKEN unset — cannot post reply")
        return
    url = f"{CW_API}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages"
    resp = httpx.post(
        url,
        headers={"api_access_token": CW_BOT_TOKEN},
        json={"content": content, "message_type": "outgoing"},
        timeout=30,
    )
    if resp.status_code >= 300:
        log.error("chatwoot reply failed %s: %s", resp.status_code, resp.text[:200])


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "kb_chunks": len(_KB)}


@app.post("/chat")
async def chat(req: Request) -> dict:
    """Direct test endpoint: {"message": "..."} -> {"reply": "..."}."""
    body = await req.json()
    return {"reply": answer((body.get("message") or "").strip())}


@app.post("/chatwoot")
async def chatwoot(req: Request) -> dict:
    """Chatwoot agent-bot webhook. Reply only to incoming customer messages."""
    body = await req.json()
    if body.get("event") != "message_created" or body.get("message_type") != "incoming":
        return {"status": "ignored"}
    content = (body.get("content") or "").strip()
    conv = (body.get("conversation") or {}).get("id")
    account = (body.get("account") or {}).get("id")
    if not (content and conv and account):
        return {"status": "ignored"}
    try:
        _cw_reply(int(account), int(conv), answer(content))
    except Exception as e:  # noqa: BLE001
        log.error("handler error: %s", e)
        return {"status": "error"}
    return {"status": "ok"}


if __name__ == "__main__":  # ponytail self-check: KB splits + cosine sanity, no network
    sample = "# GigWheels Knowledge\nintro\n\n## Pricing\n$150/week.\n\n## GPS\nAll cars tracked."
    cs = _chunks(sample)
    assert cs == ["## Pricing\n$150/week.", "## GPS\nAll cars tracked."], cs
    assert abs(_cosine([1, 0], [1, 0]) - 1.0) < 1e-9
    assert abs(_cosine([1, 0], [0, 1])) < 1e-9
    print("self-check ok:", cs)
