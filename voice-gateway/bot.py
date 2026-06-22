"""
GigWheels voice-gateway — real-time phone agent over Telnyx Media Streaming.

Telnyx opens a bidirectional WebSocket (TeXML <Connect><Stream>) and streams the
caller's audio here as 8kHz μ-law (PCMU). Pipecat runs the pipeline:

    Telnyx PCMU ─▶ Silero VAD ─▶ faster-whisper STT ─▶ RAG brain (chat-brain
    OpenAI-compatible /v1) ─▶ Kokoro TTS ─▶ Telnyx PCMU back

Accurate STT (Whisper, not Telnyx's recognizer) + a natural non-Polly voice
(Kokoro), all OSS in-cluster, answering from the same KB as web chat + email.

Pinned to pipecat-ai 0.0.108 (the context-aggregator API this file uses).
"""
from __future__ import annotations

import json
import os

from fastapi import FastAPI, WebSocket
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.telnyx import TelnyxFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai import tts as _openai_tts
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

# pipecat's OpenAITTSService validates `voice` against OpenAI's fixed voice list
# (VALID_VOICES[...]), which would KeyError on Kokoro voices like "af_heart".
# Register our voice so the lookup passes it straight through to our Kokoro
# server (which is what actually resolves the voice).
_openai_tts.VALID_VOICES.setdefault(
    os.environ.get("TTS_VOICE", "af_heart"),
    os.environ.get("TTS_VOICE", "af_heart"),
)

# Engines + brain (all cluster-internal, OpenAI-compatible HTTP).
WHISPER_URL = os.environ.get("WHISPER_URL", "http://faster-whisper.gigwheels-voice:8000/v1")
KOKORO_URL = os.environ.get("KOKORO_URL", "http://kokoro-tts.gigwheels-voice:8880/v1")
BRAIN_URL = os.environ.get("BRAIN_URL", "http://gigwheels-chat-brain.gigwheels-chat:8000/v1")
STT_MODEL = os.environ.get("STT_MODEL", "whisper-1")          # our server ignores it
TTS_VOICE = os.environ.get("TTS_VOICE", "af_heart")           # Kokoro female voice
TTS_MODEL = os.environ.get("TTS_MODEL", "kokoro")
BRAIN_MODEL = os.environ.get("BRAIN_MODEL", "gigwheels")
TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY", "")         # needed for auto hang-up

# Telephony is 8kHz; our Kokoro server returns OpenAI-style 24kHz PCM, which
# pipecat resamples down to the 8kHz transport before μ-law encoding to Telnyx.
TELEPHONY_SR = 8000
KOKORO_NATIVE_SR = 24000

GREETING = os.environ.get(
    "VOICE_GREETING",
    "Hi, thanks for calling GigWheels, the weekly car rental service. How can I help you today?",
)
SYSTEM = (
    "You are the GigWheels assistant on a weekly car-rental phone line. Answer "
    "ONLY from what the knowledge base provides (the brain handles retrieval). "
    "Speak in 1-2 short, natural sentences — no markdown, lists, or URLs. If you "
    "are unsure, offer to connect the caller with a team member."
)

app = FastAPI()


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


async def _read_stream_ids(ws: WebSocket) -> tuple[str, str]:
    """Telnyx sends a 'connected' event then a 'start' event before media.
    Both stream_id and call_control_id live in the 'start' event. Read messages
    until we see it (tolerates ordering / extra frames)."""
    stream_id, call_control_id = "", ""
    for _ in range(5):
        msg = json.loads(await ws.receive_text())
        if msg.get("event") == "start":
            start = msg.get("start", {})
            stream_id = msg.get("stream_id") or start.get("stream_id", "")
            call_control_id = start.get("call_control_id", "")
            break
    return stream_id, call_control_id


@app.websocket("/ws")
async def ws(ws: WebSocket) -> None:
    await ws.accept()
    stream_id, call_control_id = await _read_stream_ids(ws)
    logger.info(f"call connected stream={stream_id} call={call_control_id}")

    serializer = TelnyxFrameSerializer(
        stream_id=stream_id,
        outbound_encoding="PCMU",
        inbound_encoding="PCMU",
        call_control_id=call_control_id,
        api_key=TELNYX_API_KEY,
    )
    transport = FastAPIWebsocketTransport(
        websocket=ws,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=serializer,
        ),
    )

    # STT / LLM / TTS all speak the OpenAI API — point them at our in-cluster engines.
    stt = OpenAISTTService(api_key="x", base_url=WHISPER_URL, model=STT_MODEL)
    llm = OpenAILLMService(api_key="x", base_url=BRAIN_URL, model=BRAIN_MODEL)
    # sample_rate MUST be Kokoro's native 24kHz: pipecat requests response_format=pcm
    # and labels the raw PCM frames at this rate, then resamples to the 8kHz transport.
    tts = OpenAITTSService(api_key="x", base_url=KOKORO_URL, model=TTS_MODEL,
                           voice=TTS_VOICE, sample_rate=KOKORO_NATIVE_SR)

    context = OpenAILLMContext([{"role": "system", "content": SYSTEM}])
    agg = llm.create_context_aggregator(context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        agg.user(),
        llm,
        tts,
        transport.output(),
        agg.assistant(),
    ])
    task = PipelineTask(pipeline, params=PipelineParams(
        audio_in_sample_rate=TELEPHONY_SR,
        audio_out_sample_rate=TELEPHONY_SR,
        allow_interruptions=True,
    ))

    @transport.event_handler("on_client_connected")
    async def _greet(_t, _c):
        # Speak a fixed greeting immediately (no LLM round-trip for the open).
        await task.queue_frames([TTSSpeakFrame(GREETING)])

    @transport.event_handler("on_client_disconnected")
    async def _bye(_t, _c):
        await task.cancel()

    await PipelineRunner(handle_sigint=False).run(task)
