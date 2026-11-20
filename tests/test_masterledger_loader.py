"""Test di sicurezza del caricatore FI/CO.

Eseguire con: python -m unittest discover -s tests -p 'test_masterledger_*.py'
"""
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest.mock import patch
from flask import Flask
from integrations.masterledger_fico.loader import mount_masterledger

ROOT = Path(__file__).resolve().parent.parent


class LoaderSafetyTest(unittest.TestCase):
    def setUp(self):
        self.firenze = Flask("firenze_loader_test")

    def test_default_disabled_keeps_original_app(self):
        with patch.dict(os.environ, {"MASTERLEDGER_FICO_ENABLED": "0"}):
            self.assertIs(mount_masterledger(self.firenze), self.firenze)

    def test_service_code_is_present(self):
        service = ROOT / "integrations" / "masterledger_fico" / "service"
        self.assertTrue((service / "app.py").is_file())

    def test_missing_config_fails_closed(self):
        env = {"MASTERLEDGER_FICO_ENABLED": "1",
               "MASTERLEDGER_FICO_DATABASE_URL": "", "MASTERLEDGER_FICO_SECRET_KEY": ""}
        with patch.dict(os.environ, env):
            with self.assertRaisesRegex(RuntimeError, "Configurare MASTERLEDGER_FICO_DATABASE_URL"):
                mount_masterledger(self.firenze)

    def test_shared_database_or_secret_is_refused(self):
        env = {"MASTERLEDGER_FICO_ENABLED": "1", "DATABASE_URL": "sqlite:///firenze.db",
               "MASTERLEDGER_FICO_DATABASE_URL": "sqlite:///firenze.db",
               "SECRET_KEY": "a" * 40, "MASTERLEDGER_FICO_SECRET_KEY": "b" * 40}
        with patch.dict(os.environ, env):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL di Firenze"):
                mount_masterledger(self.firenze)
        env["MASTERLEDGER_FICO_DATABASE_URL"] = "sqlite:///fico.db"
        env["MASTERLEDGER_FICO_SECRET_KEY"] = env["SECRET_KEY"]
        with patch.dict(os.environ, env):
            with self.assertRaisesRegex(RuntimeError, "SECRET_KEY distinta"):
                mount_masterledger(self.firenze)

    def test_mount_serves_fico_and_never_touches_firenze_database(self):
        """Montaggio reale in un processo separato (il loader modifica sys.path).

        Il DATABASE_URL di Firenze punta a un file che NON deve essere creato:
        se il servizio aprisse quel database all'import, il file comparirebbe.
        """
        with tempfile.TemporaryDirectory() as tmp:
            firenze_db = Path(tmp) / "firenze_non_toccare.db"
            fico_db = Path(tmp) / "fico.db"
            script = textwrap.dedent(f"""
                import os, sys
                sys.path.insert(0, {str(ROOT)!r})
                os.environ.update({{
                    "MASTERLEDGER_FICO_ENABLED": "1",
                    "DATABASE_URL": "sqlite:///{firenze_db}",
                    "SECRET_KEY": "firenze-" + "x" * 40,
                    "MASTERLEDGER_FICO_DATABASE_URL": "sqlite:///{fico_db}",
                    "MASTERLEDGER_FICO_SECRET_KEY": "fico-" + "y" * 40,
                    "BOOTSTRAP_DEMO_USERS": "true",
                }})
                from flask import Flask
                from werkzeug.test import Client
                from integrations.masterledger_fico.loader import mount_masterledger
                firenze = Flask("firenze")
                firenze.add_url_rule("/", "home", lambda: "FIRENZE")
                combined = mount_masterledger(firenze)
                c = Client(combined)
                assert c.get("/").get_data(as_text=True) == "FIRENZE"
                r = c.get("/fico/auth/login")
                assert r.status_code == 200, r.status_code
                print("OK")
            """)
            res = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True,
                                 cwd=tmp, timeout=120)
            self.assertEqual(res.returncode, 0, res.stderr[-2000:])
            self.assertIn("OK", res.stdout)
            self.assertFalse(firenze_db.exists(), "il servizio FI/CO ha aperto il database di Firenze")


if __name__ == "__main__":
    unittest.main()
