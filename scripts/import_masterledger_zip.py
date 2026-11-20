#!/usr/bin/env python3
"""Importa l'archivio locale MasterLedger FI/CO in una checkout Git esistente.

Esecuzione dalla radice della repository Firenze:
  python scripts/import_masterledger_zip.py /percorso/MASTERSAPSTYLE_MASTERLEDGER_FICO_MIGRAZIONE.zip

Non esegue push, merge, migrazioni, reset o deploy.
"""
import argparse
from pathlib import Path
from zipfile import ZipFile, BadZipFile

PREFIX = "integrations/masterledger_fico/service/"
SKIP_NAMES = {".env", ".DS_Store"}
SKIP_SUFFIXES = {".db", ".sqlite", ".pyc", ".pem", ".key"}


def import_archive(archive, root):
    root = root.resolve()
    target = (root / PREFIX).resolve()
    if not (root / "wsgi.py").is_file():
        raise SystemExit("Eseguire dalla radice della repository Firenze (wsgi.py assente)")
    copied = 0
    with ZipFile(archive) as z:
        for info in z.infolist():
            if info.is_dir() or not info.filename.startswith(PREFIX):
                continue
            relative = Path(info.filename[len(PREFIX):])
            if not relative.parts or relative.is_absolute() or ".." in relative.parts:
                raise ValueError(f"Percorso non sicuro nell'archivio: {info.filename}")
            if "__pycache__" in relative.parts or ".git" in relative.parts:
                continue
            if relative.name in SKIP_NAMES or relative.suffix in SKIP_SUFFIXES:
                continue
            destination = (target / relative).resolve()
            if not destination.is_relative_to(target):
                raise ValueError(f"Percorso fuori destinazione: {info.filename}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(z.read(info))
            copied += 1
    if not (target / "app.py").exists():
        raise RuntimeError("Archivio incompleto: app.py assente")
    print(f"Importati {copied} file in {target}")
    print("Verificare git diff, eseguire test e NON attivare FI/CO prima del collaudo.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    import_archive(args.archive, Path.cwd())
