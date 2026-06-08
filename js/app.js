/* app.js — main controller, routing, events */

const App = (() => {
  let currentUser = null;
  let filtro      = 'todas';
  let privSel     = 'pub';
  let pullOpen    = false;
  let pendingCoords = null;

  /* ── Login / logout ── */
  function login(uid) {
    currentUser = USERS[uid];
    document.getElementById('s-login').classList.remove('active');
    document.getElementById('s-app').classList.add('active');
    UI.applyUser(currentUser);
    renderAll();
    AppMap.init();
  }
  function logout() {
    currentUser = null;
    document.getElementById('s-app').classList.remove('active');
    document.getElementById('s-login').classList.add('active');
  }

  /* ── View routing ── */
  function showView(v) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.bn-item').forEach(b  => b.classList.remove('active'));
    document.getElementById('v-' + v).classList.add('active');
    const nb = document.getElementById('bn-' + v);
    if (nb) nb.classList.add('active');
    if (v === 'lista')  UI.renderLista(filtro);
    if (v === 'stats')  UI.renderStats();
    if (v === 'perfil') UI.renderPerfil();
    if (v === 'mapa')   { UI.renderPullCards(); AppMap.renderPins(); }
  }

  function renderAll() {
    UI.renderLista(filtro);
    UI.renderPullCards();
    UI.renderPerfil();
    // Recolorear municipios según incidencias del usuario actual
    if (typeof AppMap !== 'undefined') AppMap.refreshColors();
  }

  /* ── Filtros ── */
  function filtrar(btn, cat) {
    document.querySelectorAll('.fil').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    filtro = cat;
    UI.renderLista(filtro);
    if (typeof AppMap !== 'undefined' && AppMap.setFilter) {
      AppMap.setFilter(cat);
    }
  }

  /* ── Apoyo ── */
  function apoyo(id) {
    if (!currentUser) return;
    const apKey  = 'ap_' + id + '_' + currentUser.id;
    const wasOn  = !!localStorage.getItem(apKey);
    const delta  = wasOn ? -1 : 1;
    if (wasOn) localStorage.removeItem(apKey); else localStorage.setItem(apKey, '1');

    const pub  = getPub();
    const mine = getMine(currentUser.id);
    const pi   = pub.findIndex(x => x.id === id);
    if (pi  > -1) { pub[pi].apoyos  = (pub[pi].apoyos  || 0) + delta; savePub(pub); }
    const mi   = mine.findIndex(x => x.id === id);
    if (mi  > -1) { mine[mi].apoyos = (mine[mi].apoyos || 0) + delta; saveMine(currentUser.id, mine); }

    document.querySelectorAll('#apn' + id).forEach(s => {
      s.textContent = parseInt(s.textContent || '0') + delta;
    });
    document.querySelectorAll('#c' + id + ' .btn-apoyo').forEach(b => b.classList.toggle('on', !wasOn));
  }

  /* ── Pull panel ── */
  function togglePull() {
    pullOpen = !pullOpen;
    document.getElementById('pull-panel').classList.toggle('open', pullOpen);
  }

  /* ── Sheet ── */
  function openSheet() {
    document.getElementById('sheet-bg').classList.add('open');
    document.getElementById('sheet').classList.add('open');
  }
  function closeSheet() {
    document.getElementById('sheet-bg').classList.remove('open');
    document.getElementById('sheet').classList.remove('open');
    clearPendingCoords();
  }
  function clearPendingCoords() {
    pendingCoords = null;
    const el = document.getElementById('f-coords-indicator');
    if (el) el.style.display = 'none';
  }
  function reportAtCoords(mun, coords) {
    pendingCoords = coords || AppMap.getPendingCoords();
    const resolvedMun = mun || AppMap.getPendingMun();
    
    if (resolvedMun) {
      const select = document.getElementById('f-mun');
      let matchedOpt = "";
      for (let i = 0; i < select.options.length; i++) {
        const optText = select.options[i].text;
        const a = (optText || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
        const b = (resolvedMun || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
        if (a === b || a.includes(b) || b.includes(a)) {
          matchedOpt = optText;
          break;
        }
      }
      if (matchedOpt) {
        select.value = matchedOpt;
      }
    }
    
    if (pendingCoords) {
      document.getElementById('f-coords-text').textContent = `Coordenadas: [${pendingCoords[0].toFixed(5)}, ${pendingCoords[1].toFixed(5)}]`;
      document.getElementById('f-coords-indicator').style.display = 'flex';
    }
    
    openSheet();
  }
  function selPriv(v) {
    privSel = v;
    document.getElementById('p-pub').classList.toggle('sel', v === 'pub');
    document.getElementById('p-anon').classList.toggle('sel', v === 'anon');
    document.getElementById('p-pub').setAttribute('aria-checked', v === 'pub');
    document.getElementById('p-anon').setAttribute('aria-checked', v === 'anon');
  }

  /* ── Enviar denuncia ── */
  function enviar() {
    const tipo = document.getElementById('f-tipo').value.trim();
    const cat  = document.getElementById('f-cat').value;
    const urg  = document.getElementById('f-urg').value;
    const mun  = document.getElementById('f-mun').value;
    const dir  = document.getElementById('f-dir').value.trim();
    const desc = document.getElementById('f-desc').value.trim();
    if (!tipo || !cat || !urg || !mun) { alert('Completa los campos obligatorios (*)'); return; }

    const mine = getMine(currentUser.id);
    mine.unshift({
      id: 'u' + Date.now(), titulo: tipo, cat, municipio: mun,
      dir: dir || mun, desc: desc || 'Sin descripción.',
      status: 'nueva', urgencia: urg, fecha: nowStr(),
      anon: privSel === 'anon', uid: currentUser.id, apoyos: 0,
      coords: pendingCoords
    });
    saveMine(currentUser.id, mine);
    closeSheet();
    ['f-tipo','f-cat','f-urg','f-mun','f-dir','f-desc'].forEach(id => { document.getElementById(id).value = ''; });
    selPriv('pub');
    showToast('Incidencia enviada — pendiente de moderación');
    renderAll();
    AppMap.renderPins();
  }

  /* ── Toast ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.querySelector('span').textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function showDetailedIncidence(id) {
    if (!currentUser) return;
    const all = getAll(currentUser.id);
    const item = all.find(x => x.id === id);
    if (!item) return;

    const body = document.getElementById('pull-body');
    if (body) {
      body.innerHTML = UI.cardHTML(item, true);
    }

    const title = document.getElementById('pull-count');
    if (title) {
      title.textContent = `Detalle de incidencia`;
    }

    const panel = document.getElementById('pull-panel');
    if (panel) {
      panel.classList.add('open');
      panel.querySelector('.pull-header').setAttribute('aria-expanded', 'true');
    }
  }

  /* ── Public API ── */
  return {
    get currentUser() { return currentUser; },
    login, logout, showView, filtrar, apoyo,
    togglePull, openSheet, closeSheet, selPriv, enviar,
    mapaSearch: q => AppMap.search(q),
    reportAtCoords,
    clearPendingCoords,
    showDetailedIncidence,
    renderAll
  };
})();
