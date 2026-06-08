/* map.js — Leaflet.js + OpenStreetMap, Huelva municipal interactive map
 *
 * DISEÑO:
 *  - Mapa interactivo de Leaflet sobre OpenStreetMap.
 *  - Capas GeoJSON transparentes para municipios de Huelva.
 *  - Clic en municipio → hace zoom y filtra/muestra incidencias en panel lateral.
 *  - Agrupado de pines por gravedad/volumen en zoom <= 12.
 *  - Pines individuales detallados con popovers premium en zoom > 12.
 *  - Pulsación larga (1.5 segundos) a zoom de calle para reportar incidencia exacta.
 */

const AppMap = (() => {
  let map = null;
  let geoJsonLayer = null;
  let pinsLayerGroup = null;
  let storedFeatures = null;
  let selectedMun = null;
  let isZoomedIn = false;
  let currentFilter = 'todas';
  const CENTROIDS = {};

  let pressTimer = null;
  let pressStartCoords = null;
  let lastPressedMun = null;
  let lastPressedCoords = null;

  /* ════════════════════════════════════════
     INIT — Inicializa el mapa y carga datos
  ════════════════════════════════════════ */
  function init() {
    // 1. Inicializar el mapa de Leaflet enfocado en la provincia de Huelva
    map = L.map('map-leaflet', {
      zoomControl: true,
      minZoom: 8,
      maxZoom: 19
    }).setView([37.4, -6.9], 9);

    // 2. Añadir capa de mosaicos de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Crear grupo de capas para los pines
    pinsLayerGroup = L.layerGroup().addTo(map);

    // 4. Configurar eventos del mapa
    map.on('click', (e) => {
      deselectAll();
      hidePullPanel();
    });

    map.on('zoomend', () => {
      checkZoomState();
    });

    // 5. Configurar pulsación larga
    setupLongPress(map);

    // 6. Cargar datos geográficos locales (TopoJSON)
    fetch('municipalities.json')
      .then(res => res.json())
      .then(es => handleGeoData(es))
      .catch((err) => {
        console.warn("No se pudo cargar municipalities.json localmente, intentando CDN...", err);
        fetch('https://cdn.jsdelivr.net/npm/es-atlas@0.6.0/es/municipalities.json')
          .then(res => res.json())
          .then(es => handleGeoData(es))
          .catch(() => fallback());
      });
  }

  function handleGeoData(es) {
    const all = topojson.feature(es, es.objects.municipalities).features;
    const huelva = all.filter(f => String(f.id || '').startsWith('21'));
    if (!huelva.length) { fallback(); return; }
    storedFeatures = huelva;
    drawFeatures(huelva);
  }

  /* ════════════════════════════════════════
     DRAW — Polígonos municipales
  ════════════════════════════════════════ */
  function drawFeatures(features) {
    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
    }

    geoJsonLayer = L.geoJSON(features, {
      style: (feature) => {
        const nm = feature.properties?.name || feature.properties?.NAME || '';
        return {
          fillColor: munColor(nm),
          weight: 0.8,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: selectedMun === nm ? 0.65 : 0.35
        };
      },
      onEachFeature: (feature, layer) => {
        const nm = feature.properties?.name || feature.properties?.NAME || '';
        
        // Guardar centroides
        const center = layer.getBounds().getCenter();
        CENTROIDS[nm] = center;
        CENTROIDS[normalise(nm)] = center;

        layer.on({
          mouseover: () => {
            if (selectedMun !== nm) {
              layer.setStyle({
                fillColor: '#8fc87a',
                fillOpacity: 0.5
              });
            }
          },
          mouseout: () => {
            if (selectedMun !== nm) {
              geoJsonLayer.resetStyle(layer);
            }
          },
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            selectMunicipality(nm, layer);
          }
        });
      }
    }).addTo(map);

    // Ajustar vista inicial a los límites de la provincia
    map.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] });

    renderPins();
  }

  /* ════════════════════════════════════════
     SELECCIÓN de municipio
  ════════════════════════════════════════ */
  function selectMunicipality(nm, layer) {
    deselectAllSmooth();
    selectedMun = nm;

    // Resaltar seleccionado y atenuar otros
    if (geoJsonLayer) {
      geoJsonLayer.eachLayer(l => {
        const lName = l.feature.properties?.name || l.feature.properties?.NAME || '';
        if (lName === nm) {
          l.setStyle({
            fillColor: '#22c55e',
            fillOpacity: 0.65
          });
        } else {
          l.setStyle({
            fillOpacity: 0.15
          });
        }
      });
    }

    // Obtener incidencias
    const uid = App.currentUser?.id;
    const inc = uid ? getAll(uid).filter(i => munMatch(i.municipio, nm)) : [];

    // Mostrar panel lateral
    showMunPanel(nm, inc);

    // Zoom a municipio
    let bounds = null;
    if (layer) {
      bounds = layer.getBounds();
    } else if (geoJsonLayer) {
      geoJsonLayer.eachLayer(l => {
        const lName = l.feature.properties?.name || l.feature.properties?.NAME || '';
        if (lName === nm || normalise(lName) === normalise(nm) || munMatch(lName, nm)) {
          bounds = l.getBounds();
        }
      });
    }

    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    checkZoomState();
  }

  function deselectAll() {
    selectedMun = null;

    if (geoJsonLayer) {
      geoJsonLayer.eachLayer(l => {
        geoJsonLayer.resetStyle(l);
      });
    }

    if (geoJsonLayer) {
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] });
    } else {
      map.setView([37.4, -6.9], 9);
    }

    checkZoomState();
    hideMapPopup();
  }

  function deselectAllSmooth() {
    selectedMun = null;
    if (geoJsonLayer) {
      geoJsonLayer.eachLayer(l => {
        geoJsonLayer.resetStyle(l);
      });
    }
  }

  function munColor(nm) {
    if (!App.currentUser || !nm) return '#b2d4a0';
    const uid = App.currentUser.id;
    const inc = getAll(uid).filter(i => munMatch(i.municipio, nm));
    if (!inc.length) return '#b2d4a0';
    if (inc.some(i => i.urgencia === 'urgente')) return '#fbbf24';
    if (inc.some(i => i.status  === 'pendiente')) return '#fca5a5';
    if (inc.some(i => i.status  === 'proceso'))   return '#93c5fd';
    return '#86efac';
  }

  /* ════════════════════════════════════════
     PANEL DE MUNICIPIO
  ════════════════════════════════════════ */
  function showMunPanel(nm, inc) {
    const panel = document.getElementById('pull-panel');
    const title = document.getElementById('pull-count');
    const body  = document.getElementById('pull-body');

    title.textContent = `${nm} · ${inc.length} incidencia${inc.length !== 1 ? 's' : ''}`;

    if (!inc.length) {
      body.innerHTML = `<div style="padding:12px 4px;font-size:13px;color:var(--txt2)">
        Sin incidencias registradas en <strong>${nm}</strong>.<br>
        <span style="font-size:12px;color:var(--txt3)">Pulsa + para reportar una.</span>
      </div>`;
    } else {
      body.innerHTML = inc.map(d => UI.cardHTML(d, true)).join('');
    }

    panel.classList.add('open');
    document.getElementById('pull-panel').querySelector('.pull-header')
      .setAttribute('aria-expanded', 'true');
  }

  function hidePullPanel() {
    document.getElementById('pull-panel').classList.remove('open');
  }

  /* ════════════════════════════════════════
     PINES — Renderizado según zoom / filtro
  ════════════════════════════════════════ */
  function renderPins() {
    if (!App.currentUser || !map) return;

    map.invalidateSize();
    pinsLayerGroup.clearLayers();

    const all = getAll(App.currentUser.id);
    const filtered = all.filter(d => currentFilter === 'todas' || d.status === currentFilter);

    const zoom = map.getZoom();
    const showDetailed = zoom > 12 || selectedMun !== null;

    if (!showDetailed) {
      // ── MODO AGRUPADO POR MUNICIPIO ──
      const groups = {};
      filtered.forEach(d => {
        const k = d.municipio || 'Huelva';
        if (!groups[k]) groups[k] = [];
        groups[k].push(d);
      });

      Object.entries(groups).forEach(([mun, items]) => {
        let pos = CENTROIDS[mun] || CENTROIDS[normalise(mun)];
        if (!pos) {
          const match = Object.keys(CENTROIDS).find(k => munMatch(mun, k));
          if (match) pos = CENTROIDS[match];
        }
        if (!pos) return;

        const n = items.length;
        if (n === 0) return;

        // Calcular peso de gravedad
        let score = 0;
        let urgenteCount = 0;
        let altaCount = 0;
        let mediaCount = 0;
        items.forEach(item => {
          if (item.urgencia === 'urgente') { score += 4; urgenteCount++; }
          else if (item.urgencia === 'alta') { score += 3; altaCount++; }
          else if (item.urgencia === 'media') { score += 2; mediaCount++; }
          else { score += 1; }
        });

        let col = '#86efac'; // Verde claro
        if (score >= 8 || (urgenteCount >= 1 && n >= 2)) {
          col = '#ef4444'; // Rojo
        } else if (score >= 4 || urgenteCount >= 1 || altaCount >= 1) {
          col = '#f97316'; // Naranja
        } else if (score >= 2 || mediaCount >= 1) {
          col = '#f59e0b'; // Amarillo
        }

        const r = Math.min(10 + n * 1.5, 18);

        const iconHtml = `
          <div class="custom-pin">
            <div class="custom-pin-halo" style="background:${col}; width:${2*r+12}px; height:${2*r+12}px; margin-left:${-r-6}px; margin-top:${-r-6}px;"></div>
            <div class="custom-pin-circle" style="background:${col}; width:${2*r}px; height:${2*r}px; line-height:${2*r}px; font-size:${r>12?'11':'10'}px;">
              ${n > 1 ? n : '!'}
            </div>
          </div>
        `;

        const markerIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [2*r, 2*r],
          iconAnchor: [r, r]
        });

        const marker = L.marker(pos, { icon: markerIcon });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          selectMunicipality(mun, null);
        });
        marker.addTo(pinsLayerGroup);
      });
    } else {
      // ── MODO DETALLADO ──
      const munGroups = {};
      filtered.forEach(d => {
        const k = d.municipio || 'Huelva';
        if (!munGroups[k]) munGroups[k] = [];
        munGroups[k].push(d);
      });

      filtered.forEach(d => {
        const mun = d.municipio || 'Huelva';
        let pos = null;

        if (d.coords && d.coords.length === 2 && !isNaN(d.coords[0])) {
          pos = [d.coords[1], d.coords[0]];
        }

        // Jitter si no tiene coordenadas
        if (!pos || isNaN(pos[0]) || isNaN(pos[1])) {
          const centroid = CENTROIDS[mun] || CENTROIDS[normalise(mun)];
          if (centroid) {
            const idx = munGroups[mun].indexOf(d);
            const n = munGroups[mun].length;
            if (idx > 0 && n > 1) {
              const angle = (idx * 2 * Math.PI) / n;
              const dist = 0.0006 + idx * 0.0003;
              pos = [centroid.lat + Math.sin(angle) * dist, centroid.lng + Math.cos(angle) * dist];
            } else {
              pos = [centroid.lat, centroid.lng];
            }
          }
        }

        if (!pos || isNaN(pos[0]) || isNaN(pos[1])) return;

        let col = '#10b981'; // Verde
        if (d.urgencia === 'urgente') col = '#ef4444';
        else if (d.urgencia === 'alta') col = '#f97316';
        else if (d.urgencia === 'media') col = '#f59e0b';

        const r = 8;
        const iconHtml = `
          <div class="custom-pin">
            <div class="custom-pin-halo" style="background:${col}; width:${2*r+10}px; height:${2*r+10}px; margin-left:${-r-5}px; margin-top:${-r-5}px;"></div>
            <div class="custom-pin-circle" style="background:${col}; width:${2*r}px; height:${2*r}px; line-height:${2*r}px; font-size:9px;">
              !
            </div>
          </div>
        `;

        const markerIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [2*r, 2*r],
          iconAnchor: [r, r]
        });

        const marker = L.marker(pos, { icon: markerIcon });

        const cat = getCat(d.cat);
        const popupHtml = `
          <div class="popover-premium">
            <div class="popover-hdr">
              <span class="popover-cat" style="color: ${cat.color}">
                ${UI.ICONS[cat.icon] || ''} ${cat.label}
              </span>
              <span class="badge ${d.status}">${STATUS_LABELS[d.status] || d.status}</span>
            </div>
            <div class="popover-tit">${d.titulo}</div>
            <div class="popover-desc">${d.desc}</div>
            <button class="popover-btn" onclick="App.showDetailedIncidence('${d.id}')">Ver detalles</button>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: 'leaflet-popup-premium'
        });

        marker.on('mouseover', (e) => {
          showTooltip(e, d);
        });
        marker.on('mouseout', () => {
          hideTooltip();
        });

        marker.addTo(pinsLayerGroup);
      });
    }
  }

  /* ════════════════════════════════════════
     BÚSQUEDA
  ════════════════════════════════════════ */
  function search(q) {
    if (!geoJsonLayer) return;

    let matchedLayer = null;
    let matchCount = 0;

    geoJsonLayer.eachLayer(l => {
      const dName = l.feature.properties?.name || l.feature.properties?.NAME || '';
      if (!q) {
        geoJsonLayer.resetStyle(l);
        return;
      }

      const nm = dName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const qn = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (nm.includes(qn)) {
        l.setStyle({
          fillColor: '#22c55e',
          fillOpacity: 0.65
        });
        matchedLayer = l;
        matchCount++;
      } else {
        l.setStyle({
          fillColor: '#d4e8c4',
          fillOpacity: 0.15
        });
      }
    });

    if (q && matchCount === 1 && matchedLayer) {
      const dName = matchedLayer.feature.properties?.name || matchedLayer.feature.properties?.NAME || '';
      selectMunicipality(dName, matchedLayer);
    }

    if (!q) deselectAll();
  }

  /* ════════════════════════════════════════
     FALLBACK
  ════════════════════════════════════════ */
  function fallback() {
    console.warn("Usando polígono de respaldo debido al fallo de municipalities.json");
    const coords = [
      [37.17, -7.34], [37.11, -7.24], [37.09, -7.00], [37.13, -6.80],
      [37.14, -6.62], [37.29, -6.50], [37.55, -6.40], [37.80, -6.50],
      [37.95, -6.59], [37.93, -6.85], [37.83, -7.10], [37.64, -7.22],
      [37.43, -7.28], [37.32, -7.34]
    ];
    L.polygon(coords, { color: '#8ab88a', fillColor: '#b2d4a0', fillOpacity: 0.5 }).addTo(map);
  }

  /* ════════════════════════════════════════
     HELPERS & ZOOM / LONG PRESS
  ════════════════════════════════════════ */
  function normalise(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  function munMatch(inc, geo) {
    const a = normalise(inc).replace(/[^a-z]/g, '');
    const b = normalise(geo).replace(/[^a-z]/g, '');
    if (!a || !b) return false;
    return a.includes(b.slice(0, 6)) || b.includes(a.slice(0, 6));
  }

  function checkZoomState() {
    if (!map) return;
    const zoom = map.getZoom();
    const threshold = 12;
    const nextZoomedIn = zoom > threshold || selectedMun !== null;
    if (nextZoomedIn !== isZoomedIn) {
      isZoomedIn = nextZoomedIn;
    }
    renderPins();
  }

  // Comprobar punto en polígono (Ray Casting)
  function isPointInFeature(lng, lat, feature) {
    const geom = feature.geometry;
    if (!geom) return false;
    if (geom.type === 'Polygon') {
      return isPointInPolygon([lng, lat], geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      return geom.coordinates.some(polygonCoords => isPointInPolygon([lng, lat], polygonCoords));
    }
    return false;
  }

  function isPointInPolygon(point, polygonCoords) {
    const outerRing = polygonCoords[0];
    if (!pointInRing(point, outerRing)) return false;
    for (let i = 1; i < polygonCoords.length; i++) {
      if (pointInRing(point, polygonCoords[i])) return false;
    }
    return true;
  }

  function pointInRing(point, ring) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function findMunicipalityAt(latlng) {
    if (!storedFeatures) return null;
    const lng = latlng.lng;
    const lat = latlng.lat;
    const match = storedFeatures.find(f => isPointInFeature(lng, lat, f));
    if (match) {
      return match.properties?.name || match.properties?.NAME || null;
    }
    return null;
  }

  function setupLongPress(m) {
    m.on('mousedown touchstart', (e) => {
      hideMapPopup();

      if (m.getZoom() < 13) return;

      const origEvent = e.originalEvent;
      const clientX = origEvent.touches ? origEvent.touches[0].clientX : origEvent.clientX;
      const clientY = origEvent.touches ? origEvent.touches[0].clientY : origEvent.clientY;

      pressStartCoords = [clientX, clientY];
      lastPressedCoords = [e.latlng.lng, e.latlng.lat]; // [lon, lat]
      lastPressedMun = findMunicipalityAt(e.latlng) || 'Huelva';

      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        const popupHtml = `
          <div class="leaflet-report-popup">
            <span>¿Reportar incidencia aquí?</span>
            <button onclick="App.reportAtCoords('${lastPressedMun.replace(/'/g, "\\'")}', [${lastPressedCoords[0]}, ${lastPressedCoords[1]}])">Sí, reportar</button>
          </div>
        `;

        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupHtml)
          .openOn(m);

        pressTimer = null;
      }, 1500); // 1.5 segundos
    });

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    m.on('mouseup touchend dragstart zoomstart', cancelPress);

    m.on('mousemove touchmove', (e) => {
      if (pressStartCoords) {
        const origEvent = e.originalEvent;
        const clientX = origEvent.touches ? origEvent.touches[0].clientX : origEvent.clientX;
        const clientY = origEvent.touches ? origEvent.touches[0].clientY : origEvent.clientY;
        if (clientX !== undefined && clientY !== undefined) {
          const dist = Math.hypot(clientX - pressStartCoords[0], clientY - pressStartCoords[1]);
          if (dist > 10) {
            cancelPress();
          }
        }
      }
    });
  }

  function hideMapPopup() {
    map.closePopup();
  }

  function showTooltip(event, d) {
    const tt = document.getElementById('pin-tooltip');
    if (!tt) return;

    const cat = getCat(d.cat);
    tt.innerHTML = `<strong>${d.titulo}</strong>
                    <span>${cat.label} · ${STATUS_LABELS[d.status] || d.status}</span>`;

    const container = document.querySelector('.mapa-container');
    const rect = container.getBoundingClientRect();
    const originalEvent = event.originalEvent;
    const x = originalEvent.clientX - rect.left + 12;
    const y = originalEvent.clientY - rect.top - 46;

    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
    tt.style.display = 'block';
  }

  function hideTooltip() {
    const tt = document.getElementById('pin-tooltip');
    if (tt) tt.style.display = 'none';
  }

  /* ════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════ */
  return {
    init,
    renderPins,
    search,
    refreshColors: () => {
      if (geoJsonLayer) {
        geoJsonLayer.eachLayer(l => {
          const nm = l.feature.properties?.name || l.feature.properties?.NAME || '';
          l.setStyle({ fillColor: munColor(nm) });
        });
      }
    },
    setFilter: (f) => {
      currentFilter = f;
      renderPins();
    },
    getPendingCoords: () => lastPressedCoords,
    getPendingMun: () => lastPressedMun
  };
})();
