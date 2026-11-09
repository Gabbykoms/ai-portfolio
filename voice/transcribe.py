"""Run from repo root: .venv/bin/python -m voice.transcribe --set voice/clips/expected.json."""
import argparse
import json
import os
from pathlib import Path

from voice.audio import STT_MODEL, transcribe
from voice.check import compare


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('audio', nargs='?', type=Path)
    parser.add_argument('--set', type=Path)
    parser.add_argument('--model', default=STT_MODEL)
    parser.add_argument('--language')
    parser.add_argument('--out', type=Path, default=Path('voice/transcripts.json'))
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Output already exists; choose a new --out to preserve evaluation evidence.')
    if not os.environ.get('OPENROUTER_API_KEY'):
        parser.error('OPENROUTER_API_KEY is not set; nothing was billed.')
    if not args.set and not args.audio:
        parser.error('Supply an audio file or --set.')
    from openrouter import OpenRouter
    entries = json.loads(args.set.read_text()) if args.set else [{'file': str(args.audio)}]
    base = args.set.parent if args.set else Path('.')
    results = []
    with OpenRouter(api_key=os.environ['OPENROUTER_API_KEY'], retry_config=None) as client:
        for entry in entries:
            result = transcribe(client, (base / entry['file']).read_bytes(), args.model,
                                args.language or entry.get('language'))
            result['file'] = entry['file']
            if 'text' in entry:
                result['check'] = compare(entry['text'], result['text'], entry.get('must_contain'), entry.get('max_wer', 0.15))
            results.append(result)
            args.out.write_text(json.dumps(results, indent=2) + '\n')
            print(json.dumps(result))


if __name__ == '__main__':
    main()
