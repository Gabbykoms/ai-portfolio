import io
import unittest
import wave
from types import SimpleNamespace

from voice.audio import speak, transcribe, validate_wav


def clip(seconds=1):
    out = io.BytesIO()
    with wave.open(out, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(8000)
        f.writeframes(b'\0\0' * (8000 * seconds))
    return out.getvalue()


class AudioTests(unittest.TestCase):
    def test_duration_and_corrupt_audio(self):
        self.assertEqual(validate_wav(clip()), 1)
        for data in (b'bad', clip(31), clip()[:-20]):
            with self.assertRaises(ValueError):
                validate_wav(data)

    def test_empty_transcript_is_reported(self):
        client = SimpleNamespace(stt=SimpleNamespace(create_transcription=lambda **kw: SimpleNamespace(text='', usage=None)))
        self.assertTrue(transcribe(client, clip())['empty'])

    def test_non_audio_response_rejected(self):
        response = SimpleNamespace(headers={'content-type': 'application/json'}, read=lambda: b'{}', close=lambda: None)
        client = SimpleNamespace(tts=SimpleNamespace(create_speech=lambda **kw: response))
        with self.assertRaises(ValueError):
            speak(client, 'Hello.')

    def test_unknown_speech_cost_stays_unknown(self):
        response = SimpleNamespace(headers={'content-type': 'audio/mpeg'}, read=lambda: b'ID3audio', close=lambda: None)
        client = SimpleNamespace(tts=SimpleNamespace(create_speech=lambda **kw: response))
        result = speak(client, 'Hello.')
        self.assertIsNone(result['cost'])
        self.assertEqual(result['chars'], 6)
