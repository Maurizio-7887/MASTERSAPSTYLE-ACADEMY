"""Test unitari del dispatcher, senza database né applicazioni reali."""
import unittest
from flask import Flask
from werkzeug.test import Client
from werkzeug.wrappers import Response
from integrations.masterledger_fico.dispatcher import build_combined_app

class DispatcherTest(unittest.TestCase):
    def test_separate_paths_and_prefix(self):
        firenze = Flask("firenze_test")
        ledger = Flask("ledger_test")

        @firenze.get("/health")
        def health():
            return "firenze-ok"

        @ledger.get("/health")
        def ledger_health():
            return "fico-ok"

        @ledger.get("/where")
        def where():
            from flask import request
            return f"{request.script_root}|{request.path}"

        client = Client(build_combined_app(firenze, ledger), Response)
        self.assertEqual(client.get("/health").data, b"firenze-ok")
        self.assertEqual(client.get("/fico/health").data, b"fico-ok")
        self.assertEqual(client.get("/fico/where").data, b"/fico|/where")

if __name__ == "__main__":
    unittest.main()
