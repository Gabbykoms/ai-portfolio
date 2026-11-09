"""Audio adapters. SDK clients are injected so tests never call a model."""
import base64
import io
import math
import time
import wave

STT_MODEL = 'openai/whisper-large-v3-turbo'
TTS_MODEL = 'microsoft/mai-voice-2.1-flash'
TTS_VOICE = 'en-US-Harper:MAI-Voice-2.1-Flash'


def validate_wav(data):
    if len(data) > 10 * 1024 * 1024:
        raise ValueError('Recording exceeds 10 MB.')
    try:
        with wave.open(io.BytesIO(data), 'rb') as audio:
            frames, rate = audio.getnframes(), audio.getframerate()
            if (audio.getcomptype() != 'NONE' or audio.getsampwidth() != 2
                    or audio.getnchannels() not in (1, 2) or not 8000 <= rate <= 96000):
                raise ValueError('Use 16-bit PCM WAV, mono or stereo, 8–96 kHz.')
            duration = frames / rate
            if not 0 < duration <= 30:
                raise ValueError('Recording must be between 0 and 30 seconds.')
            expected = frames * audio.getnchannels() * 2
            if len(audio.readframes(frames)) != expected:
                raise ValueError('Recording is truncated.')
            return duration
    except (wave.Error, EOFError) as exc:
        raise ValueError('Invalid WAV recording.') from exc


def valid_cost(value):
    return value if isinstance(value, (int, float)) and math.isfinite(value) and value >= 0 else None


def transcribe(client, data, model=STT_MODEL, language=None):
    duration = validate_wav(data)
    start = time.monotonic()
    result = client.stt.create_transcription(
        model=model, input_audio={'data': base64.b64encode(data).decode(), 'format_': 'wav'},
        language=language, retries=None, timeout_ms=30000)
    usage = result.usage
    text = result.text or ''
    return {'text': text, 'empty': not any(c.isalnum() for c in text), 'model': model,
            'audio_seconds': getattr(usage, 'seconds', None), 'validated_seconds': duration,
            'cost': valid_cost(getattr(usage, 'cost', None)),
            'seconds': round(time.monotonic() - start, 3)}


def speak(client, text, model=TTS_MODEL, voice=TTS_VOICE):
    if not text.strip() or len(text) > 2500:
        raise ValueError('Speech text must be between 1 and 2,500 characters.')
    start = time.monotonic()
    response = client.tts.create_speech(model=model, input=text, voice=voice,
                                        response_format='mp3', retries=None, timeout_ms=30000)
    try:
        content_type = response.headers.get('content-type', '').split(';')[0]
        if content_type not in ('audio/mpeg', 'audio/mp3'):
            raise ValueError('Speech provider returned non-MP3 audio or an error response.')
        data = response.read()
        if not data or len(data) > 10 * 1024 * 1024:
            raise ValueError('Speech provider returned empty or oversized audio.')
        generation_id = response.headers.get('x-generation-id')
    finally:
        response.close()
    cost = None
    if generation_id:
        try:
            cost = valid_cost(client.generations.get_generation(id=generation_id,
                              retries=None, timeout_ms=5000).data.total_cost)
        except Exception:  # noqa: BLE001 - usage lookup must not discard paid audio
            cost = None  # Usage may not yet exist; unknown is not zero.
    return {'audio': base64.b64encode(data).decode(), 'mime': 'audio/mpeg',
            'model': model, 'voice': voice, 'chars': len(text), 'bytes': len(data),
            'cost': cost, 'cost_is_estimate': False, 'generation_id': generation_id,
            'seconds': round(time.monotonic() - start, 3)}
