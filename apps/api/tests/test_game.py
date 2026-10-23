"""Smoke the retained example API over real HTTP; no AI or external services."""
import json
from pathlib import Path
import socket
import subprocess
import sys
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GameApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.base = f'http://127.0.0.1:{port}'
        cls.server = subprocess.Popen(
            [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', str(port)],
            cwd=Path(__file__).resolve().parents[1], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
        )
        for _ in range(100):
            if cls.server.poll() is not None:
                raise RuntimeError(cls.server.stderr.read().decode())
            try:
                with urlopen(cls.base, timeout=1):
                    return
            except URLError:
                time.sleep(.05)
        cls.server.terminate()
        cls.server.wait(timeout=10)
        raise RuntimeError('API startup timed out')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=10)
        cls.server.stderr.close()

    def post(self, payload):
        request = Request(self.base + '/game/next_turn', data=json.dumps(payload).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request, timeout=5) as response:
            return json.load(response)

    def test_borrow_and_repeated_turn_serialize_valid_state(self):
        result = self.post({'user_id': 'synthetic', 'session_id': 'test',
                            'input_text': 'borrow', 'current_state': {}})
        state = result['new_state']
        self.assertEqual((state['turn'], state['stats']['cash'], state['stats']['reputation']), (2, 6000, 40))
        self.assertEqual([o['id'] for o in result['options']], ['A', 'B', 'C'])
        again = self.post({'user_id': 'synthetic', 'session_id': 'test',
                           'input_text': 'wait', 'current_state': state})
        self.assertEqual(again['new_state']['turn'], 3)
        self.assertEqual(again['new_state']['stats'], state['stats'])

    def test_sessions_start_from_independent_defaults(self):
        result = self.post({'user_id': 'other', 'session_id': 'other',
                            'input_text': 'wait', 'current_state': {}})
        self.assertEqual(result['new_state']['stats']['cash'], 1000)

    def test_invalid_state_is_rejected(self):
        with self.assertRaises(HTTPError) as caught:
            self.post({'user_id': 'synthetic', 'session_id': 'test',
                       'input_text': 'wait', 'current_state': {'stats': {'cash': 'invalid'}}})
        self.assertEqual(caught.exception.code, 422)


if __name__ == '__main__':
    unittest.main()
