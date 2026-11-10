"""Caso pratico indipendente per la prova intermedia UF9 di Pistoia.

Le giacenze sono un dataset di ESAME, NON la fotografia della partita ERP:
il docente può usarlo con ogni allievo senza cancellare o modificare il
proprio esercizio progressivo Ferro & Transenne.
"""
POSIZIONI = [
    {"id":"A-01-1","art":"TR-STD","nome":"Transenna standard","um":"pz","teorico":120,"fisico":120,"costo":31.40,"lotto":"ST-01"},
    {"id":"A-01-2","art":"TR-STD","nome":"Transenna standard","um":"pz","teorico":80,"fisico":77,"costo":31.40,"lotto":"ST-02"},
    {"id":"A-02-1","art":"TR-ALTA","nome":"Transenna alta","um":"pz","teorico":50,"fisico":50,"costo":36.94,"lotto":"AL-01"},
    {"id":"A-02-2","art":"TR-ALTA","nome":"Transenna alta","um":"pz","teorico":40,"fisico":42,"costo":36.94,"lotto":"AL-02"},
    {"id":"A-03-1","art":"TR-PED","nome":"Transenna pedonale","um":"pz","teorico":100,"fisico":100,"costo":30.39,"lotto":"PD-01"},
    {"id":"A-03-2","art":"TR-PED","nome":"Transenna pedonale","um":"pz","teorico":50,"fisico":48,"costo":30.39,"lotto":"PD-02"},
    {"id":"F-01","art":"FERRO","nome":"Ferro grezzo","um":"kg","teorico":1200,"fisico":1200,"costo":0.95,"lotto":"FE-01"},
    {"id":"F-02","art":"FERRO","nome":"Ferro grezzo","um":"kg","teorico":450,"fisico":438,"costo":0.95,"lotto":"FE-02"},
    {"id":"Q-01","art":"TR-ALTA","nome":"Transenna alta – quarantena","um":"pz","teorico":20,"fisico":20,"costo":36.94,"lotto":"AL-Q01"},
    {"id":"PSA-L1","art":"FERRO","nome":"Ferro a bordo linea, non ancora consumato","um":"kg","teorico":200,"fisico":195,"costo":0.95,"lotto":"FE-PSA"},
]
DISTINTE = [
    {"cliente":"Beta Costruzioni","ddt":"DDT-5101","ordine":"10000001","art":"TR-STD","pezzi":350,"per_collo":50,"attesi":7,
     "sscc":["000000000000000101","000000000000000102","000000000000000103","000000000000000104","000000000000000105","000000000000000106","000000000000000107"],
     "scansionati":["000000000000000101","000000000000000102","000000000000000103","000000000000000104","000000000000000105","000000000000000106"]},
    {"cliente":"Delta Cantieri","ddt":"DDT-5102","ordine":"10000002","art":"TR-ALTA","pezzi":150,"per_collo":50,"attesi":3,
     "sscc":["000000000000000201","000000000000000202","000000000000000203"],
     "scansionati":["000000000000000201","000000000000000202","000000000000000203"]},
]
LOTTI = [{"qta":100,"prezzo":1.00},{"qta":100,"prezzo":1.20}]
# Dopo il consumo di 120 kg, residuo 80 kg.
CALCOLI = {"prelievo_kg":120,"residuo_kg":80,"fifo":96.0,"lifo":80.0,"medio":88.0}
TRASFERIMENTO = {"numero":"UB-3107","origine":"W100","destinazione":"D200","art":"TR-PED",
                 "qta":100,"costo_unitario":30.39,"in_viaggio_valore":3039.0,
                 "totale_rete":300,"w100":200,"in_viaggio":100,"d200":0,
                 "w100_arrivo":200,"in_viaggio_arrivo":0,"d200_arrivo":100}
