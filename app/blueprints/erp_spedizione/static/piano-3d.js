// MASTERSAPSTYLE Academy — vista 3D del piano di carico, presa dal MasterLogistic WMS (static/js/load-3d.js)
// e adattata ai dati di Spedizione → Piano di carico: altezza reale del vano e dei colli, pedana in legno,
// colli impilati uno sopra l'altro, colore per cliente. Non calcola niente: disegna il piano già calcolato.
// Visualizzatore 3D read-only del medesimo snapshot della vista 2D.
// Non calcola packing e non effettua fetch: disegna solo piano-data.
//
// Aggiornamento stile (Piano di produzione — Visualizzatore grafico del
// camion, sezione 7 "Regole visive"): sfondo blu/antracite invece di nero
// puro, luci morbide da studio con ombre leggere, confezioni più luminose
// del veicolo, contorni sottili senza effetto "videogioco", cabina meno
// dominante del vano, materiali con riflessi controllati. Aggiunti anche i
// comandi mancanti dal documento: mostra/nascondi pareti e tetto del vano
// (prima erano un unico box sempre fisso alla stessa trasparenza), e una
// distinzione visiva reale tra camion e furgone (prima stessa forma, solo
// dimensioni diverse).
(function () {
  'use strict';
  const ALTEZZA_INDICATIVA_MM = 2000;
  // Altezza del pianale di carico rispetto al suolo — un semirimorchio vero
  // ha il piano sopra gli assi/ruote, non a livello del terreno. Prima il
  // pianale era a y=0 (stessa quota delle ruote): funzionava quando la
  // cabina era un parallelepipedo di fantasia, ma con la motrice vera (che
  // ha un piano di aggancio ad altezza reale) il carico restava 'staccato',
  // a un'altra quota, e le ruote del rimorchio finivano dentro il vano
  // invece che sotto.
  const ALTEZZA_PIANALE_M = 1.15;
  const ALTEZZA_PALLET_INDICATIVA_M = 1.5;
  const COLORI = { 'ACA-PLT-VAR': 0xe8c547, 'ACA-PLT-STD': 0x4da6ff, PROVA1: 0x2ecc71, PROVA2: 0x9b59b6 };
  const COLORE_SCARTATO = 0xff4d5e;
  const SCALA = 1 / 1000;
  // Blu/antracite scuro, coordinato alla dashboard — non nero puro, per
  // dare profondità senza spegnere i riflessi dei materiali.
  const COLORE_SFONDO = 0x0a1018;

  let scene = null, camera = null, renderer = null, controls = null, container = null;
  // Raggio dell'ultima scena inquadrata (bounding sphere di gruppoColli),
  // aggiornato da inquadraDaDirezione — serve al loop di rendering per
  // ricalcolare la nebbia ad ogni fotogramma in base alla posizione VIVA
  // della camera (vedi anima()), non solo al momento dell'inquadratura
  // automatica.
  let ultimoRaggioScena = 8;
  let gruppoColli = null, raycaster = null, mouse = null, ultimoDatoPiano = null;
  let attivo = false, frameId = null;
  // Riferimenti separati a pareti/tetto/pavimento del vano — indipendenti
  // dal resto della scena, per poterli mostrare/nascondere/rendere
  // semitrasparenti su comando, senza dover ridisegnare tutto.
  let paretiVano = null, tettoVano = null;
  let statoPareti = 'semitrasparente', statoTetto = 'semitrasparente'; // 'visibile' | 'semitrasparente' | 'nascosto'
  // Ogni geometria/materiale appartiene al render corrente: non esistono cache
  // condivise da riutilizzare dopo dispose().
  let geometrie = new Set(), materiali = new Set();
  // Texture procedurale del battistrada: generata una sola volta e riusata
  // (non dipende dal singolo piano di carico, non va nel ciclo dispose()).
  let texturaBattistrada = null;

  function supportoWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }
  function motivoIndisponibile() {
    if (!supportoWebGL()) return 'WebGL non è disponibile in questo browser.';
    if (!window.THREE) return 'La libreria 3D non è stata caricata (CDN non disponibile).';
    if (!window.THREE.OrbitControls) return 'I controlli 3D non sono stati caricati (CDN non disponibile).';
    return '';
  }
  function disponibile() { return !motivoIndisponibile(); }
  function segnalaFallback(reason) {
    window.dispatchEvent(new CustomEvent('logistics-3d-unavailable', { detail: { reason: reason || motivoIndisponibile() || '3D non disponibile.' } }));
  }
  function registra(geometry, material) {
    if (geometry) geometrie.add(geometry);
    if (Array.isArray(material)) material.forEach(m => materiali.add(m));
    else if (material) materiali.add(material);
  }
  function mesh(geometry, material) { registra(geometry, material); return new THREE.Mesh(geometry, material); }
  function linee(geometry, material) { registra(geometry, material); return new THREE.LineSegments(geometry, material); }
  function pulisciRisorseContenuto() {
    geometrie.forEach(g => { if (g && typeof g.dispose === 'function') g.dispose(); });
    materiali.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
    geometrie = new Set(); materiali = new Set();
    if (scene && gruppoColli) scene.remove(gruppoColli);
    gruppoColli = null; paretiVano = null; tettoVano = null;
  }
  function pulisciScena() {
    pulisciRisorseContenuto();
    gruppoColli = new THREE.Group();
    scene.add(gruppoColli);
  }

  function onResize() {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth || 600, h = container.clientHeight || 420;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  }
  function fermaLoop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  }
  function anima() {
    if (!attivo || !renderer || !scene || !camera) { frameId = null; return; }
    frameId = requestAnimationFrame(anima);
    if (controls) controls.update();
    // BUG REALE TROVATO E CORRETTO (segnalato: 'il colore è sparito di
    // nuovo' — camion sbiadito nello sfondo): la nebbia veniva calcolata
    // SOLO al momento dell'inquadratura automatica (inquadraDaDirezione),
    // mai aggiornata durante zoom/pan/rotazione manuali con OrbitControls
    // — bastava allontanarsi un po' con la rotella del mouse oltre quel
    // punto fisso perché il camion tornasse a sbiadire nel colore di
    // sfondo, stesso sintomo del bug della nebbia fissa già corretto una
    // volta, ma per una causa diversa (camera mossa a mano, non scena
    // grande). Ora la nebbia si ricalcola qui, ad ogni fotogramma, sulla
    // distanza VIVA della camera dal punto inquadrato — mai più fissa.
    if (scene && scene.fog && controls) {
      const distanzaViva = camera.position.distanceTo(controls.target);
      scene.fog.near = distanzaViva + ultimoRaggioScena * 1.4;
      scene.fog.far = distanzaViva + ultimoRaggioScena * 6;
      // Stessa causa della nebbia: anche i piani di clipping della camera
      // erano fissati solo al momento dell'inquadratura automatica. Zoom
      // manuale molto vicino/lontano oltre quei valori fissi rischiava
      // tagli di visualizzazione. Ricalcolati qui insieme, sulla stessa
      // distanza viva.
      camera.near = Math.max(.01, distanzaViva - ultimoRaggioScena * 3);
      camera.far = distanzaViva + ultimoRaggioScena * 4;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }
  function avviaLoop() { if (frameId === null) anima(); }

  function initScene(containerEl) {
    container = containerEl;
    const w = container.clientWidth || 600, h = container.clientHeight || 420;
    scene = new THREE.Scene(); scene.background = new THREE.Color(COLORE_SFONDO);
    // Leggerissima nebbia per dare profondità senza appiattire i colori —
    // percepibile solo sugli oggetti più lontani dalla camera.
    scene.fog = new THREE.Fog(COLORE_SFONDO, 12, 34);
    camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Ombre morbide da studio (regola 7 del documento) — non ombre dure da
    // faretto singolo: PCFSoft le sfuma ai bordi.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // r128 (versione caricata da CDN in questo progetto) usa outputEncoding/
    // sRGBEncoding, non l'API outputColorSpace delle versioni più recenti —
    // verificata la versione prima di scrivere questa riga, non a caso.
    if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    container.replaceChildren(); container.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;

    // Luci da studio: una chiave (key light) che proietta l'ombra
    // principale, una di riempimento (fill) più debole dal lato opposto
    // per non lasciare mai il lato in ombra completamente nero, e
    // un'ambientale bassa per il pavimento sotto il vano.
    scene.add(new THREE.AmbientLight(0xaec6e8, 0.35));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.05);
    key.position.set(4, 6, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.radius = 3; key.shadow.bias = -0.0015;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6fa8dc, 0.35);
    fill.position.set(-3, 2.5, -2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 0.2);
    rim.position.set(0, 3, -6); scene.add(rim);

    raycaster = new THREE.Raycaster(); mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
  }

  // Stati di visibilità per pareti/tetto — regola 'pareti e tetto del vano
  // selezionabili tra visibili, semitrasparenti e nascosti' del documento.
  function opacitaPerStato(s) { return s === 'visibile' ? 0.30 : s === 'nascosto' ? 0 : 0.08; }
  function applicaStatoOggetto(gruppo, stato) {
    if (!gruppo) return;
    const nascosto = stato === 'nascosto';
    gruppo.visible = !nascosto;
    if (nascosto) return;
    const opacita = opacitaPerStato(stato);
    gruppo.traverse(o => { if (o.material && 'opacity' in o.material) o.material.opacity = opacita; });
  }

  function disegnaVano(veicolo) {
    const l = veicolo.piano_lunghezza_mm * SCALA, larg = veicolo.piano_larghezza_mm * SCALA, alt = (veicolo.altezza_mm || ALTEZZA_INDICATIVA_MM) * SCALA;
    const yPianale = ALTEZZA_PIANALE_M;
    const matPianale = new THREE.MeshStandardMaterial({ color: 0x14181d, side: THREE.DoubleSide, roughness: 0.85, metalness: 0.15 });
    const pianale = mesh(new THREE.PlaneGeometry(l, larg), matPianale);
    pianale.rotation.x = -Math.PI / 2; pianale.position.set(l / 2, yPianale, larg / 2);
    pianale.receiveShadow = true; gruppoColli.add(pianale);

    // Pareti (4 facce laterali) e tetto come oggetti SEPARATI e
    // indipendentemente togglabili — prima erano un unico box fisso.
    const matVano = () => new THREE.MeshStandardMaterial({
      color: 0x00d2ff, transparent: true, opacity: opacitaPerStato(statoPareti),
      side: THREE.DoubleSide, roughness: 0.25, metalness: 0.05,
    });
    paretiVano = new THREE.Group();
    const pareteAnteriore = mesh(new THREE.PlaneGeometry(larg, alt), matVano());
    pareteAnteriore.rotation.y = Math.PI / 2; pareteAnteriore.position.set(0, yPianale + alt / 2, larg / 2); paretiVano.add(pareteAnteriore);
    const pareteFondo = mesh(new THREE.PlaneGeometry(larg, alt), matVano());
    pareteFondo.rotation.y = Math.PI / 2; pareteFondo.position.set(l, yPianale + alt / 2, larg / 2); paretiVano.add(pareteFondo);
    const pareteSx = mesh(new THREE.PlaneGeometry(l, alt), matVano());
    pareteSx.position.set(l / 2, yPianale + alt / 2, 0); paretiVano.add(pareteSx);
    const pareteDx = mesh(new THREE.PlaneGeometry(l, alt), matVano());
    pareteDx.position.set(l / 2, yPianale + alt / 2, larg); paretiVano.add(pareteDx);
    gruppoColli.add(paretiVano);
    applicaStatoOggetto(paretiVano, statoPareti);

    tettoVano = new THREE.Group();
    const tetto = mesh(new THREE.PlaneGeometry(l, larg), matVano());
    tetto.rotation.x = Math.PI / 2; tetto.position.set(l / 2, yPianale + alt, larg / 2); tettoVano.add(tetto);
    gruppoColli.add(tettoVano);
    applicaStatoOggetto(tettoVano, statoTetto);

    // Bordi del vano sempre leggibili, indipendentemente dallo stato di
    // pareti/tetto — 'cassone trasparente con bordi ben leggibili'.
    const boxBordi = new THREE.BoxGeometry(l, alt, larg);
    const bordi = linee(new THREE.EdgesGeometry(boxBordi), new THREE.LineBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.55 }));
    bordi.position.set(l / 2, yPianale + alt / 2, larg / 2); gruppoColli.add(bordi);
    disegnaTelaioCabinaRuote(l, larg, veicolo.tipo);
  }
  // Texture procedurale a canvas per il battistrada — bande scure ripetute
  // lungo la circonferenza dello pneumatico, così la gomma non è una
  // superficie piatta uniforme ('non banalmente stilizzato').
  function ottieniTexturaBattistrada() {
    if (texturaBattistrada) return texturaBattistrada;
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0c0e'; ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#1d1f23';
    for (let i = 0; i < 8; i += 1) ctx.fillRect(i * 4, 0, 2, 32);
    texturaBattistrada = new THREE.CanvasTexture(c);
    texturaBattistrada.wrapS = THREE.RepeatWrapping; texturaBattistrada.wrapT = THREE.RepeatWrapping;
    texturaBattistrada.repeat.set(16, 1);
    return texturaBattistrada;
  }
  // Ruota completa: pneumatico con battistrada, cerchione cromato, mozzo.
  // 'doppia' disegna gomme gemellate (assi rimorchio/trazione), come su
  // un vero autoarticolato — l'asse dello sterzo resta invece singolo.
  function disegnaRuota(x, z, doppia) {
    const raggio = 0.42, spessore = 0.26;
    const posizioni = doppia ? [z - spessore * .58, z + spessore * .58] : [z];
    posizioni.forEach(zPos => {
      const pneumatico = mesh(new THREE.CylinderGeometry(raggio, raggio, spessore, 28), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .92, metalness: .04, map: ottieniTexturaBattistrada() }));
      pneumatico.rotation.x = Math.PI / 2; pneumatico.position.set(x, raggio, zPos); pneumatico.castShadow = true; gruppoColli.add(pneumatico);
      const cerchione = mesh(new THREE.CylinderGeometry(raggio * .52, raggio * .52, spessore + .015, 20), new THREE.MeshStandardMaterial({ color: 0x9ea3aa, metalness: .85, roughness: .18 }));
      cerchione.rotation.x = Math.PI / 2; cerchione.position.set(x, raggio, zPos); gruppoColli.add(cerchione);
      const mozzo = mesh(new THREE.CylinderGeometry(raggio * .16, raggio * .16, spessore + .05, 12), new THREE.MeshStandardMaterial({ color: 0x6b6f75, metalness: .9, roughness: .15 }));
      mozzo.rotation.x = Math.PI / 2; mozzo.position.set(x, raggio, zPos); gruppoColli.add(mozzo);
    });
  }
  // --- Modello 3D della motrice (se fornito), al posto della cabina
  // a primitive per il tipo 'camion' (il furgone resta un unico corpo a
  // primitive: nella realtà non è una motrice separabile). Caricato una
  // sola volta e riusato via clone() per ogni piano di carico successivo.
  //
  // Il file sorgente ha il muso lungo +Y con 1 unità = 1 cm; qui lo
  // normalizziamo una volta per tutte in un 'template': ruotato per
  // puntare verso -X (convenzione di questo file: il muso è sempre verso
  // le x negative), centrato in X/Z, ruote a contatto con y=0, e scalato
  // a larghezza unitaria — così al momento dell'uso basta una scala
  // uniforme sulla larghezza reale del veicolo.
  // MASTER-ACADEMY: nessun modello 3D di marca — si usa la cabina disegnata a primitive.
  const URL_MODELLO_CABINA = (window.URL_MODELLO_CABINA || '');
  let modelloCabinaTemplate = null; // { gruppo, lunghezzaRel, altezzaRel } rispetto a larghezza=1
  let statoModelloCabina = 'idle'; // idle | caricando | pronto | errore
  let tentativiModelloCabina = 0;
  function assicuraModelloCabina() {
    if (!URL_MODELLO_CABINA) { statoModelloCabina = 'errore'; return; }
    if (statoModelloCabina === 'caricando' || statoModelloCabina === 'pronto') return;
    if (!window.THREE || !THREE.GLTFLoader) { statoModelloCabina = 'errore'; return; }
    statoModelloCabina = 'caricando';
    new THREE.GLTFLoader().load(URL_MODELLO_CABINA, (gltf) => {
      const radice = gltf.scene;
      // Era ruotato dal verso sbagliato: il muso puntava verso il
      // rimorchio invece che in avanti (lontano da esso) — una motrice
      // deve tirare il carico da davanti, non spingerlo. 180° in più
      // rispetto al primo tentativo.
      radice.rotation.y = -Math.PI / 2;
      radice.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(radice);
      const dimensioni = new THREE.Vector3(); box.getSize(dimensioni);
      const centro = new THREE.Vector3(); box.getCenter(centro);
      const scalaBase = 1 / (dimensioni.z || 1); // normalizza sulla larghezza (asse Z dopo la rotazione)
      radice.position.set(-centro.x, -box.min.y, -centro.z);
      radice.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const gruppo = new THREE.Group(); gruppo.add(radice); gruppo.scale.setScalar(scalaBase);
      modelloCabinaTemplate = { gruppo, scalaBase, lunghezzaRel: dimensioni.x * scalaBase, altezzaRel: dimensioni.y * scalaBase };
      statoModelloCabina = 'pronto';
      // Se un piano era già stato disegnato con la cabina a primitive
      // (caricamento in corso), lo ridisegniamo ora che il modello vero è pronto.
      if (attivo && ultimoDatoPiano) renderPiano(ultimoDatoPiano);
    }, undefined, () => {
      // Un fallimento (rete lenta, hiccup momentaneo) prima restava
      // bloccato sul fallback per tutta la sessione: nessun nuovo
      // tentativo veniva mai fatto. Ora riproviamo con un piccolo
      // backoff, fino a 4 tentativi, poi ci si ferma sul fallback.
      // Stato resta 'caricando' durante l'attesa (non 'idle') apposta:
      // disegnaTelaioCabinaRuote chiama assicuraModelloCabina ad ogni
      // piano ridisegnato, e senza questo accorgimento ogni ridisegno
      // nel frattempo innescherebbe un nuovo tentativo in parallelo.
      tentativiModelloCabina += 1;
      if (tentativiModelloCabina <= 4) {
        setTimeout(() => { statoModelloCabina = 'idle'; assicuraModelloCabina(); if (attivo && ultimoDatoPiano) renderPiano(ultimoDatoPiano); }, 1500 * tentativiModelloCabina);
      } else {
        statoModelloCabina = 'errore'; // rinuncia: resta il fallback a primitive
      }
    });
  }
  // Ingombro cabina condiviso fra disegno motrice/ruote e disegnaScartati —
  // un bug già preso una volta era il calcolo duplicato in due punti che
  // divergeva (v. commit sui colli scartati sovrapposti alla cabina).
  function ingombroCabina(l, larg, tipoVeicolo) {
    const eFurgone = String(tipoVeicolo || '').toLowerCase().includes('furgone');
    if (!eFurgone && statoModelloCabina === 'pronto') {
      const cabinaLarg = larg * .94;
      return {
        eFurgone: false, usaModello: true, cabinaLarg,
        cabinaLung: modelloCabinaTemplate.lunghezzaRel * cabinaLarg,
        cabinaAlt: modelloCabinaTemplate.altezzaRel * cabinaLarg,
        // Era .25, tarato quando la cabina era una scatola stimata piccola
        // (~1.9m). Con la motrice vera (~3.6m reali, ruote comprese nella
        // lunghezza) la stessa distanza lasciava un vuoto enorme di
        // telaio nudo fra cabina e rimorchio (segnalato: 'troppo spazio,
        // mica serve?'). Ridotta: la motrice si avvicina parecchio di
        // più al rimorchio, restando comunque staccata (non sovrapposta).
        distacco: -1.6,
      };
    }
    const cabinaLung = eFurgone ? Math.min(1.3, l * .32) : Math.min(1.9, l * .5);
    const cabinaAlt = eFurgone ? 1.85 : 2.05;
    const cabinaLarg = larg * (eFurgone ? .98 : .94);
    return { eFurgone, usaModello: false, cabinaLung, cabinaAlt, cabinaLarg, distacco: eFurgone ? .04 : .25 };
  }
  // Parafanghi posteriori: semplice lamiera scura sospesa dietro l'ultimo
  // asse, dettaglio minimo ma che spezza l'effetto 'ruota nuda'.
  function disegnaParafango(x, larg) {
    const matFlap = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: .9, metalness: .05, side: THREE.DoubleSide });
    [larg * .06, larg * .94].forEach(z => {
      const flap = mesh(new THREE.PlaneGeometry(.2, .3), matFlap);
      flap.position.set(x + .22, .16, z); gruppoColli.add(flap);
    });
  }
  // Muso della cabina: paraurti, griglia cromata a listelli, fari, cofano
  // del tettuccio, specchietti su braccio, marmitta cromata e serbatoio
  // carburante — gli elementi che nella foto di riferimento distinguono
  // un camion vero da una scatola con le ruote.
  function disegnaDettagliCabina(xCabina, cabinaLung, cabinaAlt, cabinaLarg, zCentro, eFurgone) {
    const xFronte = xCabina - cabinaLung / 2;
    const matCromo = new THREE.MeshStandardMaterial({ color: 0xd7dbe0, metalness: .9, roughness: .15 });
    const matParaurti = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: .25, roughness: .75 });

    const paraurti = mesh(new THREE.BoxGeometry(.1, .22, cabinaLarg * 1.06), matParaurti);
    paraurti.position.set(xFronte - .05, .26, zCentro); paraurti.castShadow = true; gruppoColli.add(paraurti);

    if (!eFurgone) {
      // Griglia a listelli orizzontali cromati, solo sul camion (il
      // furgone ha un muso più semplice, quasi senza griglia in vista).
      for (let i = 0; i < 5; i += 1) {
        const barra = mesh(new THREE.BoxGeometry(.04, .022, cabinaLarg * .66), matCromo);
        barra.position.set(xFronte - .02, cabinaAlt * .26 + i * (cabinaAlt * .3 / 5), zCentro); gruppoColli.add(barra);
      }
      // Cofano leggermente sporgente del tettuccio (silhouette da motrice
      // con cabina alta, non un semplice parallelepipedo).
      const tettuccio = mesh(new THREE.BoxGeometry(cabinaLung * .9, .12, cabinaLarg * .9), new THREE.MeshStandardMaterial({ color: 0x1c3350, metalness: .3, roughness: .55 }));
      tettuccio.position.set(xCabina, cabinaAlt + .06, zCentro); gruppoColli.add(tettuccio);
      // Marmitta cromata verticale con tappo.
      const marmitta = mesh(new THREE.CylinderGeometry(.045, .045, cabinaAlt * 1.3, 12), matCromo);
      marmitta.position.set(xCabina + cabinaLung * .15, cabinaAlt * .68, zCentro - cabinaLarg * .55); gruppoColli.add(marmitta);
      const tappo = mesh(new THREE.CylinderGeometry(.06, .05, .07, 12), matCromo);
      tappo.position.set(xCabina + cabinaLung * .15, cabinaAlt * 1.34, zCentro - cabinaLarg * .55); gruppoColli.add(tappo);
      // Serbatoio carburante cilindrico sul telaio.
      const serbatoio = mesh(new THREE.CylinderGeometry(.22, .22, .55, 16), new THREE.MeshStandardMaterial({ color: 0x333941, metalness: .4, roughness: .5 }));
      serbatoio.rotation.z = Math.PI / 2; serbatoio.position.set(xCabina + cabinaLung * .35, .5, zCentro - cabinaLarg * .5); gruppoColli.add(serbatoio);
    }

    // Fari anteriori (emissivi tenui, non "al neon").
    const matFaro = new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffedb0, emissiveIntensity: .45, metalness: .1, roughness: .3 });
    [zCentro - cabinaLarg * .42, zCentro + cabinaLarg * .42].forEach(zf => {
      const faro = mesh(new THREE.BoxGeometry(.03, .13, .16), matFaro);
      faro.position.set(xFronte - .02, cabinaAlt * .48, zf); gruppoColli.add(faro);
    });

    // Specchietti retrovisori su braccio, accanto al parabrezza.
    const matSpecchio = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: .5, roughness: .4 });
    [zCentro - cabinaLarg * .56, zCentro + cabinaLarg * .56].forEach(zs => {
      const braccio = mesh(new THREE.BoxGeometry(.16, .02, .02), matSpecchio);
      braccio.position.set(xFronte + cabinaLung * .18, cabinaAlt * .62, zs); gruppoColli.add(braccio);
      const specchio = mesh(new THREE.BoxGeometry(.03, .16, .11), matSpecchio);
      specchio.position.set(xFronte + cabinaLung * .18 - .07, cabinaAlt * .58, zs); gruppoColli.add(specchio);
    });
  }
  // Cabina/telaio differenziati per tipo — 'camion grande e furgone come
  // due modelli distinti' (sezione 2 del documento). Il furgone ha il
  // vano che nasce a filo della cabina (un unico corpo), il camion ha una
  // cabina separata, più squadrata e staccata dal pianale di carico.
  function disegnaTelaioCabinaRuote(l, larg, tipoVeicolo) {
    assicuraModelloCabina(); // avvia il caricamento in background al primo utilizzo (no-op se già avviato)
    const ing = ingombroCabina(l, larg, tipoVeicolo);
    const { eFurgone, usaModello, cabinaLung, cabinaAlt, cabinaLarg, distacco } = ing;
    const xCabina = -cabinaLung / 2 - distacco;
    // Il telaio (trave di collegamento verso il rimorchio) prima si
    // estendeva per l'intera cabinaLung — andava bene con la cabina a
    // scatola stimata piccola, ma con la motrice vera (lunghezza reale,
    // ruote comprese) si allungava troppo, creando la stessa striscia di
    // telaio nudo segnalata come 'troppo spazio'. Con il modello vero
    // limitiamo quanto si estende sotto/oltre la cabina: non deve coprire
    // tutta la sua lunghezza, solo la parte di collegamento verso il
    // rimorchio — la cabina ha già il proprio telaio/ruote nel modello.
    const estensioneTelaio = usaModello ? Math.min(cabinaLung, 2.2) : cabinaLung;
    const matTelaio = new THREE.MeshStandardMaterial({ color: 0x1b1f24, metalness: .55, roughness: .45 });
    const telaio = mesh(new THREE.BoxGeometry(l + estensioneTelaio + .6, .18, larg * .82), matTelaio);
    telaio.position.set((l - estensioneTelaio - .5) / 2, ALTEZZA_PIANALE_M - .15, larg / 2); telaio.receiveShadow = true; gruppoColli.add(telaio);
    const zs = larg * .06, zd = larg * .94;

    if (usaModello) {
      // Modello vero: le sue mesh/materiali sono del template persistente,
      // NON passano da mesh()/registra() — non vanno mai in dispose() ad
      // ogni ridisegno, solo il nodo-gruppo (il clone) viene scartato.
      const clone = modelloCabinaTemplate.gruppo.clone(true);
      clone.scale.setScalar(modelloCabinaTemplate.scalaBase * cabinaLarg);
      clone.position.set(xCabina, 0, larg / 2);
      gruppoColli.add(clone);
      // Il modello include già le proprie ruote anteriori: niente ruote a
      // primitive qui, altrimenti si sovrappongono/fluttuano.
    } else {
      // Fallback a primitive: usato per il furgone (sempre) e per il
      // camion mentre il modello vero è ancora in caricamento.
      const matCabina = new THREE.MeshStandardMaterial({ color: eFurgone ? 0x2b3038 : 0x28405c, metalness: .35, roughness: .5 });
      const cabina = mesh(new THREE.BoxGeometry(cabinaLung, cabinaAlt, cabinaLarg), matCabina);
      cabina.position.set(xCabina, cabinaAlt / 2, larg / 2); cabina.castShadow = true; cabina.receiveShadow = true; gruppoColli.add(cabina);
      const bordi = linee(new THREE.EdgesGeometry(cabina.geometry), new THREE.LineBasicMaterial({ color: 0x0a0f14, transparent: true, opacity: .6 })); bordi.position.copy(cabina.position); gruppoColli.add(bordi);
      const parabrezza = mesh(new THREE.PlaneGeometry(cabinaLarg * .88, cabinaAlt * .55), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: .4, side: THREE.DoubleSide, roughness: .1, metalness: .1 }));
      parabrezza.rotation.y = Math.PI / 2; parabrezza.rotation.x = -.15; parabrezza.position.set(xCabina - cabinaLung / 2 - .01, cabinaAlt * .62, larg / 2); gruppoColli.add(parabrezza);
      disegnaDettagliCabina(xCabina, cabinaLung, cabinaAlt, cabinaLarg, larg / 2, eFurgone);
      disegnaRuota(xCabina, zs, false); disegnaRuota(xCabina, zd, false);
    }

    const nAssi = Math.max(2, Math.round(l / 3));
    let ultimaX = xCabina;
    for (let i = 0; i < nAssi; i += 1) { ultimaX = (l / nAssi) * (i + .5); disegnaRuota(ultimaX, zs, true); disegnaRuota(ultimaX, zd, true); }
    disegnaParafango(ultimaX, larg);
  }
  // Materiale dei colli: leggermente più luminoso del veicolo (emissive
  // tenue) — 'confezioni più luminose del veicolo per rendere immediato
  // il piano' — mai un effetto plastico/videogioco, quindi emissive basso
  // e roughness alto (superficie opaca da cartone/pallet, non lucida).
  function materiale(colore0, scartato) {
    const colore = scartato ? COLORE_SCARTATO : (colore0 || COLORI.PROVA1);
    return new THREE.MeshStandardMaterial({
      color: colore, transparent: scartato, opacity: scartato ? .5 : 1,
      emissive: colore, emissiveIntensity: scartato ? 0.03 : 0.12, roughness: .78, metalness: .02,
    });
  }
  function disegnaCollo(c, x, y, scartato) {
    // pedana in legno (pallet o fondo della cassa) + merce sopra; c.base_mm = quota del collo sotto, se impilato
    const l = c.lunghezza_mm * SCALA, larg = c.larghezza_mm * SCALA, altTot = (c.altezza_mm || ALTEZZA_PALLET_INDICATIVA_M * 1000) * SCALA;
    const y0 = ALTEZZA_PIANALE_M + (c.base_mm || 0) * SCALA, pedana = Math.min((c.pedana_mm || 150) * SCALA, altTot * .5), carico = altTot - pedana;
    const legno = mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: scartato ? COLORE_SCARTATO : 0xb08850, roughness: .92, metalness: 0, transparent: scartato, opacity: scartato ? .5 : 1 }));
    legno.scale.set(l, pedana, larg); legno.position.set(x + l / 2, y0 + pedana / 2, y + larg / 2); legno.castShadow = true; legno.receiveShadow = true; gruppoColli.add(legno);
    const box = mesh(new THREE.BoxGeometry(1, 1, 1), materiale(c.colore, scartato));
    box.scale.set(l * .97, carico, larg * .97); box.position.set(x + l / 2, y0 + pedana + carico / 2, y + larg / 2);
    box.castShadow = true; box.receiveShadow = true;
    box.userData = { info: c, tipo: scartato ? 'scartato' : 'piazzato' }; gruppoColli.add(box);
    // Contorni sottili, mai invadenti — 'senza effetto videogioco'.
    const bordi = linee(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x0a0f14, transparent: true, opacity: .35 })); bordi.scale.copy(box.scale); bordi.position.copy(box.position); gruppoColli.add(bordi);
  }
  function disegnaColli(colli) { colli.forEach(c => disegnaCollo(c, c.x_mm * SCALA, c.y_mm * SCALA, false)); }
  // Etichetta di testo fluttuante — sprite con texture da canvas, sempre
  // rivolta verso la camera (comportamento di default di THREE.Sprite).
  // Usata per marcare chiaramente i colli non allocati, così non sembrano
  // '(sconosciuto attaccato alla motrice' — vedi disegnaScartati.
  function creaEtichettaTesto(testo, colore) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(10,14,18,0.88)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = colore; ctx.lineWidth = 4; ctx.strokeRect(2, 2, c.width - 4, c.height - 4);
    ctx.fillStyle = colore; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(testo, c.width / 2, c.height / 2);
    const texture = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(2.6, 0.5, 1);
    return sprite;
  }
  function disegnaScartati(nonAllocati, veicolo) {
    if (!nonAllocati || !nonAllocati.length) return;
    let z = 0;
    // Prima stavano DAVANTI alla motrice (a sinistra della cabina):
    // sembravano un secondo carico attaccato al muso del camion, non
    // 'roba rimasta fuori'. Ora stanno DIETRO al rimorchio — la lettura
    // naturale è 'quello che non è entrato resta indietro' — con
    // un'etichetta sopra per non lasciare dubbi.
    const l = veicolo.piano_lunghezza_mm * SCALA, larg = veicolo.piano_larghezza_mm * SCALA;
    const x = l + 2.2;
    nonAllocati.forEach(c => { disegnaCollo(c, x, z, true); z += c.larghezza_mm * SCALA + .15; });
    const etichetta = creaEtichettaTesto(`⚠ ${nonAllocati.length} NON ALLOCATI`, '#ff4d5e');
    etichetta.position.set(x + .3, ALTEZZA_PIANALE_M + ALTEZZA_PALLET_INDICATIVA_M + .7, larg / 2);
    gruppoColli.add(etichetta);
  }

  function renderPiano(data) {
    ultimoDatoPiano = data; if (!attivo || !scene || !disponibile()) return;
    pulisciScena(); if (!data || !data.veicolo) return;
    disegnaVano(data.veicolo); disegnaColli(data.colli || []); disegnaScartati(data.non_allocati || [], data.veicolo); vistaProspettica();
  }
  function bersagli() { return gruppoColli ? gruppoColli.children.filter(o => o.userData && o.userData.info) : []; }
  function coordinateMouse(ev) { const rect = renderer.domElement.getBoundingClientRect(); mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(mouse, camera); }
  function onMouseMove(ev) {
    if (!renderer || !raycaster) return; const tip = document.getElementById('tooltip-collo'); if (!tip) return; coordinateMouse(ev);
    const hit = raycaster.intersectObjects(bersagli())[0]; if (!hit) { tip.style.display = 'none'; return; }
    const info = hit.object.userData.info, scartato = hit.object.userData.tipo === 'scartato'; const title = document.createElement('b'); title.textContent = info.codice || 'N/D'; const detail = document.createElement('span'); detail.textContent = scartato ? `resta a terra: ${info.motivo || 'N/D'}` : (info.testo || ''); const children = [title, document.createElement('br'), document.createTextNode(`${Math.round(info.lunghezza_mm / 10)} × ${Math.round(info.larghezza_mm / 10)} × ${Math.round((info.altezza_mm || 0) / 10)} cm`), document.createElement('br'), detail]; tip.replaceChildren(...children); tip.style.display = 'block'; tip.style.left = `${ev.clientX + 14}px`; tip.style.top = `${ev.clientY + 14}px`;
  }
  function onClick(ev) { if (!renderer || !raycaster) return; coordinateMouse(ev); const target = bersagli(), hit = raycaster.intersectObjects(target)[0]; target.forEach(o => { o.material.opacity = o.userData.tipo === 'scartato' ? .5 : 1; o.material.transparent = o.userData.tipo === 'scartato'; }); if (hit) target.forEach(o => { if (o !== hit.object) { o.material.transparent = true; o.material.opacity = .25; } }); }
  function inquadraDaDirezione(d, margine) {
    if (!gruppoColli || !camera || !controls) return;
    const box = new THREE.Box3().setFromObject(gruppoColli); if (box.isEmpty()) return;
    const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, .6) * (margine || 1.25), distance = radius / Math.sin(camera.fov * Math.PI / 360);
    camera.position.copy(sphere.center).addScaledVector(d.clone().normalize(), distance);
    camera.near = Math.max(.01, distance - radius * 3); camera.far = distance + radius * 4; camera.updateProjectionMatrix();
    // Imposta subito nebbia/clipping per questa inquadratura; da qui in
    // poi il loop di rendering (anima()) li ricalcola ad ogni fotogramma
    // sulla distanza VIVA della camera, così restano corretti anche
    // durante zoom/pan/rotazione manuali — vedi il commento lì per il
    // perché (bug della nebbia fissa, già corretto una volta per le
    // scene grandi, si ripresentava anche per lo zoom manuale).
    if (scene && scene.fog) { scene.fog.near = distance + radius * 1.4; scene.fog.far = distance + radius * 6; }
    ultimoRaggioScena = radius;
    controls.target.copy(sphere.center); controls.update();
  }
  function vistaProspettica() { inquadraDaDirezione(new THREE.Vector3(.7, .55, 1.1)); } function vistaDallAlto() { inquadraDaDirezione(new THREE.Vector3(.2, 1.6, .35)); } function vistaLaterale() { inquadraDaDirezione(new THREE.Vector3(.05, .28, 1.3)); } function vistaPosteriore() { inquadraDaDirezione(new THREE.Vector3(1.3, .35, .05)); }

  // Comandi mostra/nascondi pareti e tetto — ciclano tra i tre stati
  // richiesti dal documento (visibile/semitrasparente/nascosto), o
  // impostabili direttamente passando lo stato voluto.
  function ciclaStato(attuale) { return attuale === 'semitrasparente' ? 'visibile' : attuale === 'visibile' ? 'nascosto' : 'semitrasparente'; }
  function impostaPareti(stato) { statoPareti = stato || ciclaStato(statoPareti); applicaStatoOggetto(paretiVano, statoPareti); return statoPareti; }
  function impostaTetto(stato) { statoTetto = stato || ciclaStato(statoTetto); applicaStatoOggetto(tettoVano, statoTetto); return statoTetto; }

  function destroy() {
    fermaLoop(); attivo = false;
    if (renderer && renderer.domElement) { renderer.domElement.removeEventListener('click', onClick); renderer.domElement.removeEventListener('mousemove', onMouseMove); }
    window.removeEventListener('resize', onResize);
    pulisciRisorseContenuto();
    if (controls && typeof controls.dispose === 'function') controls.dispose();
    if (renderer) { if (typeof renderer.dispose === 'function') renderer.dispose(); if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss(); }
    if (container) container.replaceChildren();
    scene = null; camera = null; renderer = null; controls = null; container = null; raycaster = null; mouse = null; gruppoColli = null;
  }
  window.Load3D = {
    supportoWebGL, disponibile, motivoIndisponibile,
    init(containerEl) { const reason = motivoIndisponibile(); if (reason) { segnalaFallback(reason); return false; } if (attivo && container === containerEl) return true; if (attivo) destroy(); try { attivo = true; initScene(containerEl); if (ultimoDatoPiano) renderPiano(ultimoDatoPiano); avviaLoop(); return true; } catch (_) { destroy(); segnalaFallback('Impossibile inizializzare il renderer 3D; resta disponibile la vista 2D.'); return false; } },
    // Stop is intentionally a full teardown: repeated 2D/3D toggles cannot
    // retain disposed resources, listeners or animation frames.
    fermaAnimazione: destroy, destroy, aggiorna(data) { ultimoDatoPiano = data; if (attivo) renderPiano(data); }, vistaProspettica, vistaDallAlto, vistaLaterale, vistaPosteriore,
    impostaPareti, impostaTetto,
    statoVano() { return { pareti: statoPareti, tetto: statoTetto }; },
  };
  // This is a module-lifetime listener, not a renderer-lifetime listener:
  // it keeps the latest passive snapshot while 2D is selected, so a later
  // init renders that same snapshot. Per-renderer DOM/window listeners are
  // installed in initScene and removed by destroy().
  window.addEventListener('piano-data', ev => { ultimoDatoPiano = ev.detail; if (attivo) renderPiano(ev.detail); });
  // Do not wait for a click to reveal a failed CDN/WebGL capability. The
  // dashboard stays on its already-visible 2D view and shows this message.
  const reasonAtLoad = motivoIndisponibile();
  if (reasonAtLoad) segnalaFallback(reasonAtLoad);
})();
