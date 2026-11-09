"""Exercise the installed SDK serialization using httpx MockTransport; no network."""
import json
import unittest

import httpx
from openrouter import OpenRouter
from test_audio import clip

from voice.audio import speak, transcribe


class SDKTests(unittest.TestCase):
    def test_real_sdk_wire_contract(self):
        requests = []

        def respond(request):
            payload = json.loads(request.content)
            requests.append(payload)
            if request.url.path.endswith('/transcriptions'):
                self.assertEqual(payload['input_audio']['format'], 'wav')
                return httpx.Response(200, json={'text': 'Hello Gabriel', 'usage': {'seconds': 1, 'cost': 0.001}})
            self.assertEqual(payload['response_format'], 'mp3')
            return httpx.Response(200, headers={'content-type': 'audio/mpeg'}, content=b'ID3fake')

        with (httpx.Client(transport=httpx.MockTransport(respond)) as http,
              OpenRouter(api_key='test-only', client=http, retry_config=None) as client):
            self.assertEqual(transcribe(client, clip())['text'], 'Hello Gabriel')
            self.assertEqual(speak(client, 'Hello.')['bytes'], 7)
        self.assertEqual(len(requests), 2)
