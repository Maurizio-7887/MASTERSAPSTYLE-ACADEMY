"""Test di sicurezza del caricatore FI/CO.

Eseguire con: python -m unittest discover -s tests -p 'test_masterledger_*.py'
"""
import os
import unittest
from unittest.mock import patch
from flask import Flask
from integrations.masterledger_fico.loader import mount_masterledger


class LoaderSafetyTest(unittest.TestCase):
    def setUp(self):
        self.firenze = Flask("firenze_loader_test")

    def test_default_disabled_keeps_original_app(self):
        with patch.dict(os.environ, {"MASTERLEDGER_FICO_ENABLED": "0"}):
            self.assertIs(mount_masterledger(self.firenze), self.firenze)

    def test_missing_service_fails_closed(self):
        with patch.dict(os.environ, {"MASTERLEDGER_FICO_ENABLED": "1"}):
            with self.assertRaisesRegex(RuntimeError, "Codice MasterLedger FI/CO mancante"):
                mount_masterledger(self.firenze)


if __name__ == "__main__":
    unittest.main()
