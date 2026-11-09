"""Bounded JSON stdin/stdout interface used only by the Node server."""
import base64
import json
import os
import sys

from voice.audio import STT_MODEL, TTS_MODEL, TTS_VOICE, speak, transcribe, validate_wav


def main():
    request = json.loads(sys.stdin.read(15 * 1024 * 1024))
    operation = request['operation']
    if operation == 'validate':
        return {'seconds': validate_wav(base64.b64decode(request['audio'], validate=True))}
    from openrouter import OpenRouter
    key = os.environ.get('OPENROUTER_API_KEY')
    if not key:
        raise ValueError('Voice is not configured yet.')
    with OpenRouter(api_key=key, retry_config=None, timeout_ms=30000) as client:
        if operation == 'transcribe':
            return transcribe(client, base64.b64decode(request['audio'], validate=True),
                              os.environ.get('STT_MODEL', STT_MODEL))
        if operation == 'speak':
            return speak(client, request['text'], os.environ.get('TTS_MODEL', TTS_MODEL),
                         os.environ.get('TTS_VOICE', TTS_VOICE))
        raise ValueError('Unknown voice operation.')


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except ValueError as exc:
        print(json.dumps({'error': str(exc), 'status': 422}))
        sys.exit(1)
    except Exception:  # noqa: BLE001 - sanitize all provider exceptions at process boundary
        print(json.dumps({'error': 'The voice provider is unavailable. Please try again.', 'status': 502}))
        sys.exit(1)
