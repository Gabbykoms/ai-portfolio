"""One billed speech call, with a JSON measurement sidecar."""
import argparse
import base64
import json
import os
from pathlib import Path

from voice.audio import TTS_MODEL, TTS_VOICE, speak


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('text')
    parser.add_argument('--model', default=TTS_MODEL)
    parser.add_argument('--voice', default=TTS_VOICE)
    parser.add_argument('--out', type=Path, default=Path('voice/speech.mp3'))
    args = parser.parse_args()
    sidecar = args.out.with_suffix('.json')
    if args.out.suffix != '.mp3' or args.out.exists() or sidecar.exists():
        parser.error('Choose an unused .mp3 output path.')
    if not os.environ.get('OPENROUTER_API_KEY'):
        parser.error('OPENROUTER_API_KEY is not set; nothing was billed.')
    from openrouter import OpenRouter
    with OpenRouter(api_key=os.environ['OPENROUTER_API_KEY'], retry_config=None) as client:
        result = speak(client, args.text, args.model, args.voice)
    args.out.write_bytes(base64.b64decode(result.pop('audio')))
    sidecar.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
