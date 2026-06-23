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

import datetime
import json
import os
from zoneinfo import ZoneInfo

from fastapi import FastAPI, WebSocket
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (EndFrame, TTSSpeakFrame, UserStartedSpeakingFrame,
                                    BotStoppedSpeakingFrame)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.telnyx import TelnyxFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.frames.frames import ErrorFrame, TTSAudioRawFrame
from pipecat.services.tts_service import TTSService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

import httpx


class TelnyxStreamSerializer(TelnyxFrameSerializer):
    """pipecat 0.0.108's TelnyxFrameSerializer omits `stream_id` from OUTBOUND
    media messages. Telnyx needs it to route audio back to the caller, so without
    it the bot's speech is silently dropped (the caller hears nothing). Inject it.
    """

    async def serialize(self, frame):
        out = await super().serialize(frame)
        if isinstance(out, str):
            try:
                d = json.loads(out)
            except ValueError:
                return out
            if d.get("event") == "media" and "stream_id" not in d:
                d["stream_id"] = self._stream_id
                return json.dumps(d)
        return out


class KokoroHTTPTTSService(TTSService):
    """Kokoro TTS over a plain full-body POST to our server.

    We do NOT use pipecat's OpenAITTSService here: it (a) validates `voice`
    against OpenAI's fixed list (KeyErrors on "af_heart") and (b) reads the
    response with the OpenAI client's *streaming* reader, which deadlocks on our
    server's blocking synth (the response only completes once, so a streaming
    read hangs while a full-body read — what we do here — works). The base class
    handles TTSStarted/TTSStopped frames; we just yield 24kHz PCM audio.
    """

    def __init__(self, *, base_url: str, voice: str, sample_rate: int = 24000, **kwargs):
        super().__init__(sample_rate=sample_rate, **kwargs)
        self._url = base_url.rstrip("/") + "/audio/speech"
        self._voice = voice

    def can_generate_metrics(self) -> bool:
        return True

    async def run_tts(self, text: str, context_id: str):
        await self.start_ttfb_metrics()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    self._url,
                    json={"input": text, "voice": self._voice, "response_format": "pcm"},
                )
            if r.status_code != 200:
                yield ErrorFrame(error=f"kokoro tts status {r.status_code}")
                return
            await self.start_tts_usage_metrics(text)
            await self.stop_ttfb_metrics()
            pcm = r.content  # raw 24kHz s16le mono (full body — the working path)
            chunk = 9600     # ~0.2s @ 24kHz s16 mono
            for i in range(0, len(pcm), chunk):
                yield TTSAudioRawFrame(pcm[i : i + chunk], self.sample_rate, 1, context_id=context_id)
        except Exception as e:  # noqa: BLE001
            yield ErrorFrame(error=f"kokoro tts error: {e}")

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
# Inbound calls cost us per minute, so don't let a silent line sit open. After
# the bot finishes speaking, if the caller is silent for IDLE_SECS we re-prompt
# once; if still silent, we say a time-appropriate goodbye and hang up.
IDLE_SECS = float(os.environ.get("VOICE_IDLE_SECS", "5"))
REPROMPT = os.environ.get(
    "VOICE_REPROMPT", "Are you still there? Is there anything else I can help you with?")
CENTRAL = ZoneInfo("America/Chicago")


def _day_or_night() -> str:
    """day vs night by US Central time (when the caller is on the line)."""
    hour = datetime.datetime.now(CENTRAL).hour
    return "day" if 5 <= hour < 18 else "night"


def _signoff() -> str:
    return f"No worries. Thanks for calling GigWheels, and have an awesome {_day_or_night()}."
SYSTEM = (
    "You are the GigWheels assistant on a weekly car-rental phone line. Answer "
    "ONLY from what the knowledge base provides (the brain handles retrieval). "
    "Speak in 1-2 short, natural sentences — no markdown, lists, or URLs. If you "
    "are unsure, offer to connect the caller with a team member."
)

class CallState(FrameProcessor):
    """Tracks call state so the idle handler never fires over the bot's own
    speech or during LLM/TTS latency.

    - caller speaks  -> reset strikes AND set responding=True (we now owe a reply,
      and the next several seconds are *bot latency*, not caller silence).
    - bot finishes   -> responding=False (reply delivered; real silence can start).

    BotStartedSpeaking/StoppedSpeaking frames travel upstream from the output
    transport, so this processor (placed early) sees both the caller's and the
    bot's speaking frames."""

    def __init__(self, state: dict):
        super().__init__()
        self._st = state

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, UserStartedSpeakingFrame):
            self._st["strikes"] = 0
            self._st["responding"] = True
        elif isinstance(frame, BotStoppedSpeakingFrame):
            self._st["responding"] = False
        await self.push_frame(frame, direction)


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

    serializer = TelnyxStreamSerializer(
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
    # sample_rate is Kokoro's native 24kHz; pipecat resamples to the 8kHz transport.
    tts = KokoroHTTPTTSService(base_url=KOKORO_URL, voice=TTS_VOICE,
                               sample_rate=KOKORO_NATIVE_SR)

    context = OpenAILLMContext([{"role": "system", "content": SYSTEM}])
    agg = llm.create_context_aggregator(context)

    call_state = {"strikes": 0, "responding": False, "done": False}
    pipeline = Pipeline([
        transport.input(),
        CallState(call_state),
        stt,
        agg.user(),
        llm,
        tts,
        transport.output(),
        agg.assistant(),
    ])
    # Idle = no Bot/User speaking frames for IDLE_SECS. We handle it ourselves
    # (don't auto-cancel) so we can re-prompt once, then sign off + hang up.
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=TELEPHONY_SR,
            audio_out_sample_rate=TELEPHONY_SR,
            allow_interruptions=True,
        ),
        idle_timeout_secs=IDLE_SECS,
        cancel_on_idle_timeout=False,
    )

    @transport.event_handler("on_client_connected")
    async def _greet(_t, _c):
        # Speak a fixed greeting immediately (no LLM round-trip for the open).
        await task.queue_frames([TTSSpeakFrame(GREETING)])

    @task.event_handler("on_idle_timeout")
    async def _on_idle(_t):
        # Already saying goodbye -> never re-fire (was repeating the signoff 4x
        # because the timer kept tripping during the goodbye's own TTS latency).
        if call_state["done"]:
            return
        # Bot is mid-answer or the LLM/TTS is still producing the reply: this is
        # OUR latency, not caller silence. Don't talk over ourselves — wait.
        if call_state["responding"]:
            logger.info("idle: bot still responding, ignoring")
            return
        call_state["strikes"] += 1
        if call_state["strikes"] == 1:
            logger.info("idle: re-prompting caller")
            await task.queue_frames([TTSSpeakFrame(REPROMPT)])
        else:
            # Still genuinely silent: polite goodbye once, then EndFrame ends the
            # pipeline + closes the WS, completing the TeXML so Telnyx drops the
            # call (the Telnyx API hangup also fires if TELNYX_API_KEY is set).
            call_state["done"] = True
            logger.info("idle: signing off + hanging up")
            await task.queue_frames([TTSSpeakFrame(_signoff()), EndFrame()])

    # A caller turn resets the strike counter (they're engaged again).
    @transport.event_handler("on_client_disconnected")
    async def _bye(_t, _c):
        await task.cancel()

    await PipelineRunner(handle_sigint=False).run(task)
