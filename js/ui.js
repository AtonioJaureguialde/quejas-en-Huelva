/* ui.js — render functions for cards, list, stats, profile */

const UI = (() => {

  /* ── SVG icons (inline, no external fetch needed) ── */
  const ICONS = {
    road:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18l4-12M20 18l-4-12M8 6h8M6 12h12"/></svg>`,
    sun:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    tree:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 22"/><path d="M9.1 9.1C11 11 12 14 12 14s-.5-4 4-8"/><path d="M3 22h18"/></svg>`,
    volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    info:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    pin:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    thumb:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    check:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    chart:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    warn:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    eye:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeoff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    send:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    map:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    list:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    user:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    chevup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`,
    clip:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  };
  function ic(k, cls='') { return `<span class="${cls}" aria-hidden="true">${ICONS[k]||''}</span>`; }

  /* ── Card HTML ── */
  function cardHTML(d, showMine = false) {
    const uid    = App.currentUser?.id || '';
    const isMine = d.uid === uid;
    const apKey  = 'ap_' + d.id + '_' + uid;
    const on     = !!localStorage.getItem(apKey);
    const ap     = d.apoyos || 0;
    const cat    = getCat(d.cat);

    return `<div class="card-item" id="c${d.id}">
      <div class="ca ${d.status}"></div>
      <div class="cb">
        <div class="ctop">
          <div class="ctit">${d.titulo}</div>
          <div class="badges">
            ${d.urgencia ? `<span class="badge ${d.urgencia}">${urg(d.urgencia)}</span>` : ''}
            <span class="badge ${d.status}">${STATUS_LABELS[d.status] || d.status}</span>
          </div>
        </div>
        <div class="cat-pill" style="color:${cat.color}">
          <span aria-hidden="true">${ICONS[cat.icon]||''}</span>${cat.label}
        </div>
        <div class="cmeta">
          <span class="cmeta-item">${ic('pin')}${d.municipio}</span>
          <span class="cmeta-item" style="color:var(--txt3)">${ic('clock')}${d.fecha || ''}</span>
        </div>
        <div class="cdesc">${d.desc}</div>
        <div class="cactions">
          <button class="btn-apoyo${on ? ' on' : ''}" onclick="App.apoyo('${d.id}')" aria-label="Apoyar esta causa">
            ${ic('thumb')}
            <span id="apn${d.id}">${ap}</span>
          </button>
          ${isMine && showMine ? '<span class="mine-tag">Mío</span>' : ''}
        </div>
      </div>
    </div>`;
  }

  function urg(u) { return u ? u.charAt(0).toUpperCase() + u.slice(1) : ''; }

  /* ── Lista ── */
  function renderLista(filtro = 'todas') {
    if (!App.currentUser) return;
    const all   = getAll(App.currentUser.id);
    const lista = filtro === 'todas' ? all : all.filter(x => x.status === filtro);
    const el    = document.getElementById('lista-cards');
    el.innerHTML = lista.length
      ? lista.map(d => cardHTML(d, true)).join('')
      : `<div class="empty-state">${ic('clip')}<p>Sin incidencias en esta categoría</p></div>`;
  }

  /* ── Pull cards (map panel) ── */
  function renderPullCards() {
    if (!App.currentUser) return;
    const all = getAll(App.currentUser.id);
    document.getElementById('pull-count').textContent = all.length + ' total';
    document.getElementById('pull-body').innerHTML = all.slice(0, 5).map(d => cardHTML(d, false)).join('');
  }

  /* ── Stats ── */
  function renderStats() {
    if (!App.currentUser) return;
    const all   = getAll(App.currentUser.id);
    const total = all.length;
    const res   = all.filter(x => x.status === 'resuelto').length;
    const proc  = all.filter(x => x.status === 'proceso').length;
    const pend  = all.filter(x => x.status === 'pendiente').length;
    const pct   = total > 0 ? Math.round(res / total * 100) : 0;
    const uCnt  = { urgente:0, alta:0, media:0, baja:0 };
    all.forEach(x => { if (uCnt[x.urgencia] !== undefined) uCnt[x.urgencia]++; });
    const cCnt  = {};
    CATEGORIAS.forEach(c => { cCnt[c.id] = all.filter(x => x.cat === c.id).length; });
    const maxC  = Math.max(...Object.values(cCnt), 1);
    const rec   = [...all].reverse().slice(0, 5);

    document.getElementById('stats-content').innerHTML = `
      <div class="stats-h">Estadísticas · Huelva</div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-lbl">${ic('clip')} Total</div><div class="kpi-val">${total}</div><div class="kpi-sub">incidencias</div></div>
        <div class="kpi-card"><div class="kpi-lbl" style="color:#16a34a">${ic('check')} Resueltas</div><div class="kpi-val" style="color:#16a34a">${res}</div><div class="kpi-sub">tasa ${pct}%</div></div>
        <div class="kpi-card"><div class="kpi-lbl" style="color:#3b82f6">${ic('info')} En proceso</div><div class="kpi-val" style="color:#3b82f6">${proc}</div><div class="kpi-sub">activas</div></div>
        <div class="kpi-card"><div class="kpi-lbl" style="color:#ef4444">${ic('warn')} Urgentes</div><div class="kpi-val" style="color:#ef4444">${uCnt.urgente}</div><div class="kpi-sub">atención inmediata</div></div>
      </div>
      <div class="sec-card">
        <div class="sec-h">Estado actual</div>
        <div class="status-grid">
          <div class="status-chip" style="background:#fee2e2"><div class="sc-n" style="color:#991b1b">${pend}</div><div class="sc-l" style="color:#991b1b">Pendientes</div></div>
          <div class="status-chip" style="background:#dbeafe"><div class="sc-n" style="color:#1e40af">${proc}</div><div class="sc-l" style="color:#1e40af">En proceso</div></div>
          <div class="status-chip" style="background:#dcfce7"><div class="sc-n" style="color:#15803d">${res}</div><div class="sc-l" style="color:#15803d">Resueltas</div></div>
        </div>
        <div class="prog-wrap">
          <div class="prog-hdr"><span>Progreso global</span><span>${pct}%</span></div>
          <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="sec-card">
        <div class="sec-h">Por categoría</div>
        ${CATEGORIAS.map(c => `
          <div class="bar-row">
            <div class="bar-lbl" style="color:${c.color}"><span aria-hidden="true">${ICONS[c.icon]||''}</span>${c.label}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((cCnt[c.id]||0)/maxC*100)}%;background:${c.color}"></div></div>
            <div class="bar-val">${cCnt[c.id]||0}</div>
          </div>`).join('')}
      </div>
      <div class="sec-card">
        <div class="sec-h">Por urgencia</div>
        <div class="urg-grid">
          <div class="status-chip" style="background:#fef2f2"><div class="sc-n" style="color:#ef4444">${uCnt.urgente}</div><div class="sc-l" style="color:#ef4444">Urgente</div></div>
          <div class="status-chip" style="background:#ffedd5"><div class="sc-n" style="color:#f97316">${uCnt.alta}</div><div class="sc-l" style="color:#f97316">Alta</div></div>
          <div class="status-chip" style="background:#fef3c7"><div class="sc-n" style="color:#f59e0b">${uCnt.media}</div><div class="sc-l" style="color:#f59e0b">Media</div></div>
          <div class="status-chip" style="background:var(--sur)"><div class="sc-n" style="color:var(--txt)">${uCnt.baja}</div><div class="sc-l" style="color:var(--txt2)">Baja</div></div>
        </div>
      </div>
      <div class="sec-card">
        <div class="sec-h">Incidencias recientes</div>
        ${rec.map(d => `
          <div class="rec-item">
            <div class="rec-dot" style="background:${STATUS_COLORS[d.status]}"></div>
            <div style="flex:1;min-width:0">
              <div class="rec-tit">${d.titulo}</div>
              <div class="rec-meta">${d.municipio} · ${d.fecha}</div>
            </div>
            <span class="badge ${d.status}">${STATUS_LABELS[d.status]}</span>
          </div>`).join('')}
      </div>
    `;
  }

  /* ── Perfil ── */
  function renderPerfil() {
    if (!App.currentUser) return;
    const uid  = App.currentUser.id;
    const all  = getAll(uid);
    const mine = all.filter(x => x.uid === uid);
    document.getElementById('pk-total').textContent = mine.length;
    document.getElementById('pk-res').textContent   = mine.filter(x => x.status === 'resuelto').length;
    document.getElementById('pk-pend').textContent  = mine.filter(x => ['pendiente','nueva'].includes(x.status)).length;
    document.getElementById('mis-inc-list').innerHTML = mine.slice(0, 6).map(d => {
      const cat = getCat(d.cat);
      return `<div class="mini-inc">
        <div class="mini-ico" style="color:${cat.color}">${ICONS[cat.icon]||''}</div>
        <div style="flex:1;min-width:0">
          <div class="mini-tit">${d.titulo}</div>
          <div class="mini-meta">${d.municipio} · <span class="badge ${d.status}">${STATUS_LABELS[d.status]}</span></div>
        </div>
      </div>`;
    }).join('') || '<div style="color:var(--txt2);font-size:13px;padding:4px 0">Sin incidencias reportadas aún</div>';
  }

  /* ── Apply user to header + profile ── */
  function applyUser(u) {
    const av = document.getElementById('hdr-av');
    av.textContent = u.initials; av.style.background = u.bg; av.style.color = u.fg;
    document.getElementById('hdr-uname').textContent = u.name;
    const pav = document.getElementById('perf-av');
    pav.textContent = u.initials; pav.style.background = u.bg; pav.style.color = u.fg;
    document.getElementById('perf-name').textContent = u.name;
  }

  return { cardHTML, renderLista, renderPullCards, renderStats, renderPerfil, applyUser, ICONS };
})();
