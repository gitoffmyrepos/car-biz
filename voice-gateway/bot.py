"""
GigWheels voice-gateway — real-time phone agent over Telnyx Media Streaming.

Telnyx opens a bidirectional WebSocket (TeXML <Connect><Stream>) and streams the
caller's audio here. Pipecat runs the pipeline:

    Telnyx audio ─▶ Silero VAD ─▶ faster-whisper STT ─▶ RAG brain (chat-brain
    OpenAI-compatible /v1) ─▶ Kokoro TTS ─▶ Telnyx audio back

Accurate STT (Whisper, not Telnyx's recognizer) + a natural non-Polly voice
(Kokoro), all OSS on the GPU, answering from the same KB as chat/email.
"""
from __future__ import annotations

import os

from fastapi import FastAPI, WebSocket
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.telnyx import TelnyxFrameSerializer
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

# Engines + brain (all cluster-internal, OpenAI-compatible HTTP).
WHISPER_URL = os.environ.get("WHISPER_URL", "http://faster-whisper.gigwheels-voice:8000/v1")
KOKORO_URL = os.environ.get("KOKORO_URL", "http://kokoro-tts.gigwheels-voice:8880/v1")
BRAIN_URL = os.environ.get("BRAIN_URL", "http://gigwheels-chat-brain.gigwheels-chat:8000/v1")
STT_MODEL = os.environ.get("STT_MODEL", "Systran/faster-whisper-small.en")
TTS_VOICE = os.environ.get("TTS_VOICE", "af_heart")  # Kokoro female voice
TTS_MODEL = os.environ.get("TTS_MODEL", "kokoro")
BRAIN_MODEL = os.environ.get("BRAIN_MODEL", "gigwheels")

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


@app.websocket("/ws")
async def ws(ws: WebSocket) -> None:
    await ws.accept()
    # Telnyx sends two setup messages with the stream + call identifiers.
    import json

    first = json.loads(await ws.receive_text())
    second = json.loads(await ws.receive_text())
    stream_id = first.get("stream_id") or first.get("start", {}).get("stream_id")
    call_control_id = second.get("start", {}).get("call_control_id", "")
    logger.info(f"call connected stream={stream_id}")

    serializer = TelnyxFrameSerializer(
        stream_id=stream_id,
        call_control_id=call_control_id,
        api_key=os.environ.get("TELNYX_API_KEY", ""),
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

    # STT/LLM/TTS all speak the OpenAI API — point them at our internal engines.
    stt = OpenAISTTService(api_key="x", base_url=WHISPER_URL, model=STT_MODEL)
    llm = OpenAILLMService(api_key="x", base_url=BRAIN_URL, model=BRAIN_MODEL)
    tts = OpenAITTSService(api_key="x", base_url=KOKORO_URL, model=TTS_MODEL, voice=TTS_VOICE,
                           sample_rate=8000)

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
    task = PipelineTask(pipeline, params=PipelineParams(audio_in_sample_rate=8000,
                                                        audio_out_sample_rate=8000,
                                                        allow_interruptions=True))

    @transport.event_handler("on_client_connected")
    async def _greet(_t, _c):
        await task.queue_frames([context.get_messages_frame()])  # kick off the greeting turn

    await PipelineRunner(handle_sigint=False).run(task)
