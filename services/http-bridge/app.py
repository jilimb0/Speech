import asyncio
import json
import os
import subprocess
import tempfile
import traceback

import wyoming.asr as wyoming_asr
import wyoming.audio as wyoming_audio
from wyoming.client import AsyncTcpClient
from flask import Flask, jsonify, request

WHISPER_HOST = os.environ.get("WHISPER_HOST", "faster-whisper")
WHISPER_PORT = int(os.environ.get("WHISPER_PORT", "10300"))
SAMPLE_RATE = 16000
SAMPLE_WIDTH = 2
CHANNELS = 1

app = Flask(__name__)


async def transcribe_audio(pcm_path: str, language: str = "ru") -> dict:
    async with AsyncTcpClient(WHISPER_HOST, WHISPER_PORT) as client:
        transcribe = wyoming_asr.Transcribe(language=language)
        await client.write_event(transcribe.event())

        audio_start = wyoming_audio.AudioStart(
            rate=SAMPLE_RATE,
            width=SAMPLE_WIDTH,
            channels=CHANNELS,
        )
        await client.write_event(audio_start.event())

        with open(pcm_path, "rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                audio_chunk = wyoming_audio.AudioChunk(
                    audio=chunk,
                    rate=SAMPLE_RATE,
                    width=SAMPLE_WIDTH,
                    channels=CHANNELS,
                )
                await client.write_event(audio_chunk.event())

        audio_stop = wyoming_audio.AudioStop()
        await client.write_event(audio_stop.event())

        texts = []
        while True:
            event = await client.read_event()
            if event is None:
                break
            if wyoming_asr.Transcript.is_type(event.type):
                transcript = wyoming_asr.Transcript.from_event(event)
                texts.append(transcript.text)
            elif event.type == "transcript-stop":
                break

    return {"text": " ".join(texts)}


def convert_ogg_to_pcm(ogg_path: str, pcm_path: str):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i", ogg_path,
            "-f", "s16le",
            "-acodec", "pcm_s16le",
            "-ar", str(SAMPLE_RATE),
            "-ac", str(CHANNELS),
            pcm_path,
        ],
        check=True,
        capture_output=True,
    )


@app.route("/transcribe", methods=["POST"])
def handle_transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    language = request.form.get("language", "ru")

    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as ogg_tmp:
        file.save(ogg_tmp.name)
        ogg_path = ogg_tmp.name

    pcm_path = ogg_path + ".pcm"

    try:
        convert_ogg_to_pcm(ogg_path, pcm_path)
        result = asyncio.run(transcribe_audio(pcm_path, language))
        return jsonify(result)
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"FFmpeg error: {e.stderr.decode()}"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        for p in (ogg_path, pcm_path):
            try:
                os.unlink(p)
            except OSError:
                pass


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
