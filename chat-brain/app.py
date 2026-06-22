"""
GigWheels chat-brain — a tiny RAG agent for the Chatwoot live-chat widget.

Chatwoot's agent-bot webhook delivery refuses private/internal hostnames, so
instead of receiving pushes we POLL: a background loop lists open conversations
via the Chatwoot API (with the agent-bot token) and, whenever a conversation's
latest message is an unanswered incoming customer message, embeds it with Ollama
`nomic-embed-text`, cosine-retrieves the KB, asks `gemma3:12b` to answer ONLY
from that context, and posts the reply back. Everything stays cluster-internal.

Out-of-scope questions are handed to a human. The KB is a handful of markdown
sections, so in-memory cosine over precomputed embeddings is plenty — no vector DB.
# ponytail: poll loop, in-memory KB; swap to webhook+pgvector only if scale demands.
"""
from __future__ import annotations

import logging
import math
import os
import pathlib
import re
import threading
import time

import httpx
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("chat-brain")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama.prod-forex:11434").rstrip("/")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "gemma3:12b")
KB_DIR = pathlib.Path(os.environ.get("KB_DIR", "/app/kb"))
TOP_K = int(os.environ.get("TOP_K", "4"))

CW_API = os.environ.get("CHATWOOT_API_URL", "http://chatwoot-web.gigwheels-chat:3000").rstrip("/")
CW_BOT_TOKEN = os.environ.get("CHATWOOT_BOT_TOKEN", "")
CW_ACCOUNT_ID = int(os.environ.get("CHATWOOT_ACCOUNT_ID", "1"))
POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL", "4"))

# Voice agent (Telnyx TeXML). Telnyx does STT (Gather) + TTS (Say); we bridge the
# transcript to the RAG brain. VOICE_MODEL defaults to a fast model so spoken
# replies stay snappy. VOICE_BASE_URL is the public origin Telnyx fetched us at.
VOICE_MODEL = os.environ.get("VOICE_MODEL", "gemma3:4b")
VOICE_BASE_URL = os.environ.get("VOICE_BASE_URL", "https://gigwheels.strategybase.io").rstrip("/")

# EspoCRM lead-sync (optional — enabled when ESPOCRM_URL is set). Auth as a
# regular EspoCRM user via the Espo-Authorization header (base64 user:pass).
ESPOCRM_URL = os.environ.get("ESPOCRM_URL", "").rstrip("/")
ESPOCRM_USER = os.environ.get("ESPOCRM_USER", "admin")
ESPOCRM_PASSWORD = os.environ.get("ESPOCRM_PASSWORD", "")
import base64 as _b64
_ESPO_AUTH = _b64.b64encode(f"{ESPOCRM_USER}:{ESPOCRM_PASSWORD}".encode()).decode()

# Chatwoot message_type ints.
INCOMING, OUTGOING, ACTIVITY = 0, 1, 2

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


def _load_kb() -> None:
    for f in sorted(KB_DIR.glob("*.md")):
        for ch in _chunks(f.read_text()):
            try:
                _KB.append((ch, _embed(ch)))
            except Exception as e:  # noqa: BLE001 — startup best-effort
                log.error("embed failed for a chunk in %s: %s", f.name, e)
    log.info("KB loaded: %d chunks from %s", len(_KB), KB_DIR)


def _retrieve(question: str) -> str:
    if not _KB:
        return ""
    qv = _embed(question)
    ranked = sorted(_KB, key=lambda kv: _cosine(qv, kv[1]), reverse=True)
    return "\n\n".join(text for text, _ in ranked[:TOP_K])


def answer(question: str, *, model: str = CHAT_MODEL, brief: bool = False) -> str:
    context = _retrieve(question)
    if not context:
        return ("I'm not able to look that up right now. Please reach us through the "
                "Contact page and a team member will help.")
    sys_prompt = SYSTEM_PROMPT
    if brief:
        sys_prompt += (" This answer will be SPOKEN aloud on a phone call — keep it to "
                       "1-2 short sentences, no URLs, no markdown, no lists.")
    opts = {"temperature": 0.2}
    if brief:
        opts["num_predict"] = 120  # cap length so phone replies stay snappy
    r = httpx.post(
        f"{OLLAMA_URL}/api/chat",
        json={
            "model": model,
            "stream": False,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question}"},
            ],
            "options": opts,
        },
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["message"]["content"].strip()


# ---- Chatwoot polling ----
def _cw(method: str, path: str, **kw) -> httpx.Response:
    return httpx.request(method, f"{CW_API}{path}", headers={"api_access_token": CW_BOT_TOKEN}, timeout=30, **kw)


def _post_reply(conversation_id: int, content: str) -> None:
    r = _cw("POST", f"/api/v1/accounts/{CW_ACCOUNT_ID}/conversations/{conversation_id}/messages",
            json={"content": content, "message_type": "outgoing"})
    if r.status_code >= 300:
        log.error("reply failed conv=%s %s: %s", conversation_id, r.status_code, r.text[:200])


def _latest_meaningful(messages: list[dict]) -> dict | None:
    """Last non-activity message (Chatwoot returns messages oldest→newest)."""
    for m in reversed(messages):
        if m.get("message_type") != ACTIVITY:
            return m
    return None


# ---- EspoCRM lead-sync ----
def _espo(method: str, path: str, **kw) -> httpx.Response:
    return httpx.request(method, f"{ESPOCRM_URL}{path}",
                         headers={"Espo-Authorization": _ESPO_AUTH}, timeout=30, **kw)


def _ensure_lead(contact: dict, conv_id: int, first_msg: str) -> None:
    """Upsert a Chatwoot contact as an EspoCRM Lead (deduped by a description marker)."""
    if not ESPOCRM_URL or not contact:
        return
    contact_id = contact.get("id")
    marker = f"chatwoot:contact={contact_id}"
    try:
        # dedupe: skip if a lead already carries this contact's marker
        q = _espo("GET", "/api/v1/Lead", params={
            "where[0][type]": "contains", "where[0][attribute]": "description",
            "where[0][value]": marker, "maxSize": 1})
        if q.status_code < 300 and (q.json() or {}).get("total", 0) > 0:
            return
        name = (contact.get("name") or "Chat Visitor").strip()
        payload = {
            "lastName": name or "Chat Visitor",
            "emailAddress": contact.get("email") or None,
            "phoneNumber": contact.get("phone_number") or contact.get("phone") or None,
            "source": "Web Site",
            "description": f"{marker} conv={conv_id}. First chat: {first_msg[:240]}",
        }
        cr = _espo("POST", "/api/v1/Lead", json=payload)
        if cr.status_code < 300:
            log.info("CRM lead created for chatwoot contact=%s conv=%s", contact_id, conv_id)
        else:
            log.warning("CRM lead create %s: %s", cr.status_code, cr.text[:160])
    except Exception as e:  # noqa: BLE001 — sync is best-effort, never break the poll
        log.error("lead-sync error conv=%s: %s", conv_id, e)


def _poll_once() -> None:
    r = _cw("GET", f"/api/v1/accounts/{CW_ACCOUNT_ID}/conversations", params={"status": "open"})
    if r.status_code >= 300:
        log.warning("list conversations %s: %s", r.status_code, r.text[:160])
        return
    convs = (r.json().get("data") or {}).get("payload") or []
    for c in convs:
        cid = c.get("id")
        mr = _cw("GET", f"/api/v1/accounts/{CW_ACCOUNT_ID}/conversations/{cid}/messages")
        if mr.status_code >= 300:
            continue
        payload = mr.json().get("payload") if isinstance(mr.json(), dict) else mr.json()
        last = _latest_meaningful(payload or [])
        # Sync the contact into the CRM as a lead (deduped, best-effort).
        sender = (c.get("meta") or {}).get("sender") or {}
        first_in = next((m.get("content") for m in (payload or []) if m.get("message_type") == INCOMING and m.get("content")), "")
        _ensure_lead(sender, cid, first_in or "")
        # Only act when the customer's message is the most recent thing said.
        if last and last.get("message_type") == INCOMING:
            content = (last.get("content") or "").strip()
            if content:
                log.info("answering conv=%s msg=%s", cid, last.get("id"))
                try:
                    _post_reply(cid, answer(content))
                except Exception as e:  # noqa: BLE001
                    log.error("answer/post failed conv=%s: %s", cid, e)


def _poll_loop() -> None:
    if not CW_BOT_TOKEN:
        log.warning("CHATWOOT_BOT_TOKEN unset — poller disabled")
        return
    log.info("poller started: every %ss against %s account %s", POLL_INTERVAL, CW_API, CW_ACCOUNT_ID)
    while True:
        try:
            _poll_once()
        except Exception as e:  # noqa: BLE001 — never let the loop die
            log.error("poll error: %s", e)
        time.sleep(POLL_INTERVAL)


@app.on_event("startup")
def _startup() -> None:
    threading.Thread(target=_load_kb, daemon=True).start()  # don't block serving on embeds
    threading.Thread(target=_poll_loop, daemon=True).start()


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "kb_chunks": len(_KB)}


@app.post("/chat")
async def chat(req: Request) -> dict:
    """Direct test endpoint (cluster-internal): {"message": "..."} -> {"reply": "..."}."""
    body = await req.json()
    return {"reply": answer((body.get("message") or "").strip())}


# ---- Voice agent (Telnyx TeXML) ----
from fastapi.responses import Response as _Resp  # noqa: E402
from xml.sax.saxutils import escape as _xesc  # noqa: E402

_GREETING = ("Hi, thanks for calling GigWheels, the weekly car rental service. "
             "How can I help you today?")


def _texml(inner: str) -> _Resp:
    return _Resp(content=f'<?xml version="1.0" encoding="UTF-8"?>\n<Response>{inner}</Response>',
                 media_type="application/xml")


def _gather(say_text: str) -> str:
    """A <Say> followed by a speech <Gather> that posts back to /voice/gather."""
    return (f'<Gather input="speech" language="en-US" speechTimeout="auto" '
            f'action="{VOICE_BASE_URL}/voice/gather" method="POST">'
            f'<Say>{_xesc(say_text)}</Say></Gather>'
            f'<Redirect>{VOICE_BASE_URL}/voice</Redirect>')


@app.api_route("/voice", methods=["GET", "POST"])
async def voice() -> _Resp:
    """Telnyx voice webhook entrypoint — greet + listen."""
    return _texml(_gather(_GREETING))


@app.post("/voice/gather")
async def voice_gather(req: Request) -> _Resp:
    """Telnyx posts the recognized speech (SpeechResult); answer via RAG, then keep listening."""
    # Parse x-www-form-urlencoded manually (avoids the python-multipart dep).
    from urllib.parse import parse_qs
    data = parse_qs((await req.body()).decode("utf-8", "ignore"))
    said = (data.get("SpeechResult", [""])[0] or data.get("Result", [""])[0]).strip()
    if not said:
        return _texml(_gather("Sorry, I didn't catch that. What would you like to know?"))
    try:
        reply = answer(said, model=VOICE_MODEL, brief=True)
    except Exception as e:  # noqa: BLE001
        log.error("voice answer failed: %s", e)
        reply = "Sorry, I'm having trouble right now. Please try our website's contact page."
    return _texml(f'<Say>{_xesc(reply)}</Say>{_gather("Is there anything else I can help with?")}')


if __name__ == "__main__":  # ponytail self-check: KB splits + cosine + latest-message logic
    sample = "# GigWheels Knowledge\nintro\n\n## Pricing\n$150/week.\n\n## GPS\nAll cars tracked."
    cs = _chunks(sample)
    assert cs == ["## Pricing\n$150/week.", "## GPS\nAll cars tracked."], cs
    assert abs(_cosine([1, 0], [1, 0]) - 1.0) < 1e-9 and abs(_cosine([1, 0], [0, 1])) < 1e-9
    msgs = [{"message_type": 0, "content": "hi"}, {"message_type": 2, "content": "x joined"}]
    assert _latest_meaningful(msgs)["content"] == "hi"
    assert _latest_meaningful([{"message_type": 1, "content": "bot"}])["message_type"] == 1
    print("self-check ok")
