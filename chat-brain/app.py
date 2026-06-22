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

from humanize import HUMANIZE_GUIDANCE, humanize

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
# TeXML <Say> voice — neural female by default (Amazon Polly via Telnyx).
VOICE_TTS = os.environ.get("VOICE_TTS", "Polly.Joanna-Neural")
VOICE_LANG = os.environ.get("VOICE_LANG", "en-US")
# Forward to a human (Google Voice) when the caller asks for a rep, or as a
# fallback after repeated unrecognized speech so callers are never stuck.
HUMAN_FORWARD_NUMBER = os.environ.get("HUMAN_FORWARD_NUMBER", "+18328003103")

# Real-time media-streaming voice path (pipecat voice-gateway: Whisper STT +
# Kokoro TTS + this brain as the LLM). When enabled, /voice returns a TeXML
# <Connect><Stream> that hands the call to the gateway WebSocket instead of the
# turn-by-turn <Gather>/<Say> (Telnyx STT + Polly) path. Default OFF so the
# proven TeXML path keeps working until the gateway is deployed + the number is
# pointed at it.
VOICE_STREAM_ENABLED = os.environ.get("VOICE_STREAM_ENABLED", "false").lower() == "true"
VOICE_WS_URL = os.environ.get("VOICE_WS_URL", "wss://gigwheels.strategybase.io/ws")

# Email agent (Gmail via OAuth2 / XOAUTH2). Enabled when a refresh token is set.
GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "")
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET", "")
GMAIL_REFRESH_TOKEN = os.environ.get("GMAIL_REFRESH_TOKEN", "")
EMAIL_POLL_INTERVAL = float(os.environ.get("EMAIL_POLL_INTERVAL", "60"))
EMAIL_AUTO_SEND = os.environ.get("EMAIL_AUTO_SEND", "true").lower() == "true"

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


def answer(question: str, *, model: str = CHAT_MODEL, brief: bool = False, full_context: bool = False) -> str:
    # The KB is tiny, so for latency-critical voice we skip the embed/retrieve
    # round-trip and pass the whole KB as context (one model call, no embed).
    context = "\n\n".join(t for t, _ in _KB) if (full_context and _KB) else _retrieve(question)
    if not context:
        return ("I'm not able to look that up right now. Please reach us through the "
                "Contact page and a team member will help.")
    sys_prompt = SYSTEM_PROMPT + "\n\n" + HUMANIZE_GUIDANCE
    if brief:
        sys_prompt += (" This answer will be SPOKEN aloud on a phone call. Reply with ONLY "
                       "the spoken words, 1-2 short sentences, no labels, brackets, stage "
                       "directions, emoji, URLs, markdown, or lists.")
    opts = {"temperature": 0.2}
    if brief:
        opts["num_predict"] = 80  # shorter = faster spoken replies
    r = httpx.post(
        f"{OLLAMA_URL}/api/chat",
        json={
            "model": model,
            "stream": False,
            # Keep the model resident so phone replies don't pay a cold-load each call.
            "keep_alive": "30m",
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question}"},
            ],
            "options": opts,
        },
        timeout=120,
    )
    r.raise_for_status()
    out = r.json()["message"]["content"].strip()
    if brief:  # belt-and-braces: strip any leading [label]/*stage direction* a small model may emit
        out = re.sub(r"^\s*(\[[^\]]*\]|\*[^*]*\*)\s*", "", out).strip()
    # Deterministic humanizer pass: scrub mechanical AI tells (em dashes, AI
    # vocabulary, throat-clearing, emoji) the model may still leak. Covers web
    # chat, phone voice, and email since they all return through here.
    return humanize(out)


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
    threading.Thread(target=_email_loop, daemon=True).start()


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "kb_chunks": len(_KB)}


@app.post("/chat")
async def chat(req: Request) -> dict:
    """Direct test endpoint (cluster-internal): {"message": "..."} -> {"reply": "..."}."""
    body = await req.json()
    return {"reply": answer((body.get("message") or "").strip())}


@app.post("/v1/chat/completions")
async def openai_completions(req: Request):
    """OpenAI-compatible chat endpoint so the pipecat voice-gateway can use this
    RAG brain as its LLM. Answers the last user turn from the KB (voice-brief)."""
    from fastapi.responses import StreamingResponse
    import json as _json
    body = await req.json()
    msgs = body.get("messages", [])
    question = next((m.get("content", "") for m in reversed(msgs) if m.get("role") == "user"), "")
    reply = answer(question.strip(), model=VOICE_MODEL, brief=True, full_context=True)
    model = body.get("model", "gigwheels")
    created = int(time.time())
    if body.get("stream"):
        def _gen():
            delta = {"id": "cb", "object": "chat.completion.chunk", "created": created, "model": model,
                     "choices": [{"index": 0, "delta": {"role": "assistant", "content": reply}, "finish_reason": None}]}
            yield f"data: {_json.dumps(delta)}\n\n"
            stop = {"id": "cb", "object": "chat.completion.chunk", "created": created, "model": model,
                    "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
            yield f"data: {_json.dumps(stop)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_gen(), media_type="text/event-stream")
    return {"id": "cb", "object": "chat.completion", "created": created, "model": model,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": reply}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}}


# ---- Voice agent (Telnyx TeXML) ----
from fastapi.responses import Response as _Resp  # noqa: E402
from xml.sax.saxutils import escape as _xesc  # noqa: E402

_GREETING = ("Hi, thanks for calling GigWheels, the weekly car rental service. "
             "How can I help you today?")


def _texml(inner: str) -> _Resp:
    return _Resp(content=f'<?xml version="1.0" encoding="UTF-8"?>\n<Response>{inner}</Response>',
                 media_type="application/xml")


def _say(text: str) -> str:
    return f'<Say voice="{VOICE_TTS}" language="{VOICE_LANG}">{_xesc(text)}</Say>'


_VOICE_HINTS = ("price, weekly rate, how much, rent a car, lease, insurance, requirements, "
                "payment, deposit, credit check, gps, fleet, switch vehicle, contact")


def _gather(say_text: str, empties: int = 0) -> str:
    """A <Say> followed by a speech <Gather> that posts back to /voice/gather.
    Telnyx 'auto' speechTimeout is unreliable — use a numeric end-of-speech timeout
    and bias the recognizer with domain hints. `empties` tracks consecutive
    no-speech rounds through the action URL so we can fall back to a human."""
    return (f'<Gather input="speech" language="{VOICE_LANG}" speechTimeout="3" '
            f'speechModel="default" hints="{_xesc(_VOICE_HINTS)}" '
            f'action="{VOICE_BASE_URL}/voice/gather?empties={empties}" method="POST">'
            f'{_say(say_text)}</Gather>'
            f'<Redirect>{VOICE_BASE_URL}/voice</Redirect>')


_HUMAN_WORDS = ("human", "representative", "rep ", "real person", "someone", "agent",
                "customer service", "customer rep", "person", "operator", "talk to a")


def _wants_human(said: str) -> bool:
    s = said.lower()
    return any(w in s for w in _HUMAN_WORDS)


def _dial_human() -> str:
    return (f'{_say("Sure, connecting you with a team member now. Please hold.")}'
            f'<Dial>{_xesc(HUMAN_FORWARD_NUMBER)}</Dial>')


def _connect_stream() -> str:
    """Hand the whole call to the pipecat voice-gateway over a bidirectional
    media stream (Telnyx streams 8kHz μ-law both ways)."""
    return f'<Connect><Stream url="{_xesc(VOICE_WS_URL)}"/></Connect>'


@app.api_route("/voice", methods=["GET", "POST"])
async def voice() -> _Resp:
    """Telnyx voice webhook entrypoint. With streaming enabled, connect the call
    to the real-time gateway (Whisper+Kokoro); otherwise greet + <Gather>."""
    if VOICE_STREAM_ENABLED:
        return _texml(_connect_stream())
    return _texml(_gather(_GREETING))


@app.post("/voice/gather")
async def voice_gather(req: Request) -> _Resp:
    """Telnyx posts the recognized speech (SpeechResult); answer via RAG, then keep listening."""
    # Parse x-www-form-urlencoded manually (avoids the python-multipart dep).
    from urllib.parse import parse_qs
    data = parse_qs((await req.body()).decode("utf-8", "ignore"))
    log.info("voice gather fields: %s", {k: v[0][:80] for k, v in data.items()})
    # Telnyx/Twilio post the transcript under one of these (be liberal).
    said = ""
    for key in ("SpeechResult", "Result", "speech_result", "TranscriptionText", "UnstableSpeechResult"):
        if data.get(key, [""])[0].strip():
            said = data[key][0].strip()
            break
    empties = int((req.query_params.get("empties") or "0") or "0")
    # No speech recognized → after 2 misses, hand to a human so callers aren't stuck.
    if not said:
        if empties >= 2:
            return _texml(_dial_human())
        return _texml(_gather("Sorry, I didn't catch that. What would you like to know?", empties + 1))
    # Explicit request for a person → forward to the human line.
    if _wants_human(said):
        return _texml(_dial_human())
    try:
        reply = answer(said, model=VOICE_MODEL, brief=True, full_context=True)
    except Exception as e:  # noqa: BLE001
        log.error("voice answer failed: %s", e)
        reply = "Sorry, I'm having trouble right now. Please try our website's contact page."
    return _texml(f'{_say(reply)}{_gather("Is there anything else I can help with?")}')


# ---- Email agent (Gmail XOAUTH2) ----
import base64  # noqa: E402
import email as _email  # noqa: E402
import imaplib  # noqa: E402
import smtplib  # noqa: E402
import time as _time  # noqa: E402
from email.header import decode_header as _decode_header  # noqa: E402
from email.message import EmailMessage, Message as _Message  # noqa: E402
from email.utils import mktime_tz as _mktime_tz, parseaddr as _parseaddr, parsedate_tz as _parsedate_tz  # noqa: E402

_gmail_tok: dict = {"access": "", "exp": 0.0}


def _gmail_access_token() -> str:
    """Mint + cache a Gmail access token from the refresh token."""
    now = _time.time()
    if _gmail_tok["access"] and _gmail_tok["exp"] - 60 > now:
        return _gmail_tok["access"]
    r = httpx.post("https://oauth2.googleapis.com/token", data={
        "client_id": GMAIL_CLIENT_ID, "client_secret": GMAIL_CLIENT_SECRET,
        "refresh_token": GMAIL_REFRESH_TOKEN, "grant_type": "refresh_token"}, timeout=20)
    r.raise_for_status()
    j = r.json()
    _gmail_tok["access"] = j["access_token"]
    _gmail_tok["exp"] = now + float(j.get("expires_in", 3600))
    return _gmail_tok["access"]


def _xoauth2(access_token: str) -> bytes:
    return base64.b64encode(f"user={GMAIL_ADDRESS}\x01auth=Bearer {access_token}\x01\x01".encode())


def _hdr(raw: str) -> str:
    out = []
    for txt, enc in _decode_header(raw or ""):
        out.append(txt.decode(enc or "utf-8", "ignore") if isinstance(txt, bytes) else txt)
    return "".join(out)


def _plain_body(msg: "_Message") -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition")):
                try:
                    return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "ignore")
                except Exception:  # noqa: BLE001
                    continue
        return ""
    try:
        return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", "ignore")
    except Exception:  # noqa: BLE001
        return str(msg.get_payload())


def _skip_sender(from_addr: str, msg: "_Message") -> bool:
    """Don't auto-reply to bots, lists, our own address, or bulk mail (loop-safe)."""
    a = (from_addr or "").lower()
    if not a or a == GMAIL_ADDRESS.lower():
        return True
    if any(s in a for s in ("no-reply", "noreply", "donotreply", "mailer-daemon", "postmaster", "notifications@")):
        return True
    if msg.get("List-Unsubscribe") or msg.get("Auto-Submitted", "no").lower() != "no":
        return True
    if (msg.get("Precedence") or "").lower() in ("bulk", "list", "junk"):
        return True
    return False


def _send_reply(to_addr: str, subject: str, body: str, in_reply_to: str) -> None:
    msg = EmailMessage()
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_addr
    msg["Subject"] = subject if subject.lower().startswith("re:") else f"Re: {subject}"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg["Auto-Submitted"] = "auto-replied"  # tell other auto-responders not to loop
    msg.set_content(body + "\n\n— GigWheels Assistant (automated). For anything else: "
                           "https://gigwheels.strategybase.io/contact")
    at = _gmail_access_token()
    s = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
    s.starttls()
    s.ehlo()
    s.docmd("AUTH", "XOAUTH2 " + _xoauth2(at).decode())
    s.send_message(msg)
    s.quit()


_email_handled: set = set()  # UIDs we've already acted on this process (mailbox flags untouched)


def _email_once(imap: imaplib.IMAP4_SSL, start_epoch: float) -> None:
    imap.select("INBOX")
    typ, data = imap.search(None, "UNSEEN")
    if typ != "OK":
        return
    ids = data[0].split() if data and data[0] else []
    # Newest first; PEEK so we never mark the owner's mail read. Once we reach a
    # message older than startup, every remaining one is too — stop (don't churn
    # the whole backlog of an active personal mailbox).
    for num in reversed(ids):
        uid = num.decode() if isinstance(num, bytes) else str(num)
        if uid in _email_handled:
            continue
        typ, hraw = imap.fetch(num, "(BODY.PEEK[HEADER])")
        if typ != "OK" or not hraw or not hraw[0]:
            continue
        hmsg = _email.message_from_bytes(hraw[0][1])
        try:
            if _mktime_tz(_parsedate_tz(hmsg.get("Date"))) < start_epoch:
                break
        except Exception:  # noqa: BLE001
            pass
        _email_handled.add(uid)
        from_name, from_addr = _parseaddr(hmsg.get("From", ""))
        if _skip_sender(from_addr, hmsg):
            continue
        typ, fraw = imap.fetch(num, "(BODY.PEEK[])")
        if typ != "OK" or not fraw or not fraw[0]:
            continue
        msg = _email.message_from_bytes(fraw[0][1])
        subject = _hdr(msg.get("Subject", ""))
        body = _plain_body(msg).strip()
        question = f"{subject}\n\n{body}"[:2000]
        log.info("email from %s subj=%r", from_addr, subject[:60])
        try:
            reply = answer(question)
            if EMAIL_AUTO_SEND:
                _send_reply(from_addr, subject, reply, msg.get("Message-ID", ""))
                log.info("email replied to %s", from_addr)
            else:
                log.info("email DRAFT (auto-send off) to %s: %s", from_addr, reply[:160])
            _ensure_lead({"id": from_addr, "name": from_name or from_addr, "email": from_addr}, 0, question)
        except Exception as e:  # noqa: BLE001
            log.error("email handle failed for %s: %s", from_addr, e)


def _email_loop() -> None:
    if not (GMAIL_REFRESH_TOKEN and GMAIL_ADDRESS):
        log.info("email agent disabled (no GMAIL_REFRESH_TOKEN)")
        return
    start_epoch = float(os.environ.get("EMAIL_START_EPOCH", "0")) or _time.time()
    log.info("email agent started: %s every %ss (auto_send=%s)", GMAIL_ADDRESS, EMAIL_POLL_INTERVAL, EMAIL_AUTO_SEND)
    while True:
        try:
            imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
            imap.authenticate("XOAUTH2", lambda x: base64.b64decode(_xoauth2(_gmail_access_token())))
            _email_once(imap, start_epoch)
            imap.logout()
        except Exception as e:  # noqa: BLE001 — never let the loop die
            log.error("email loop error: %s", e)
        _time.sleep(EMAIL_POLL_INTERVAL)


if __name__ == "__main__":  # ponytail self-check: KB splits + cosine + latest-message logic
    sample = "# GigWheels Knowledge\nintro\n\n## Pricing\n$150/week.\n\n## GPS\nAll cars tracked."
    cs = _chunks(sample)
    assert cs == ["## Pricing\n$150/week.", "## GPS\nAll cars tracked."], cs
    assert abs(_cosine([1, 0], [1, 0]) - 1.0) < 1e-9 and abs(_cosine([1, 0], [0, 1])) < 1e-9
    msgs = [{"message_type": 0, "content": "hi"}, {"message_type": 2, "content": "x joined"}]
    assert _latest_meaningful(msgs)["content"] == "hi"
    assert _latest_meaningful([{"message_type": 1, "content": "bot"}])["message_type"] == 1
    print("self-check ok")
