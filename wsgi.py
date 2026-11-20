import os

from app import create_app
from integrations.masterledger_fico.loader import mount_masterledger

firenze_app = create_app()
app = mount_masterledger(firenze_app)

if __name__ == "__main__":
    firenze_app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
