/* data.js — seed data, constants, localStorage helpers */

const USERS = {
  antonio: { id:'antonio', name:'Antonio', initials:'AN', bg:'#1d3a6e', fg:'#93c5fd' },
  imanol:  { id:'imanol',  name:'Imanol',  initials:'IM', bg:'#14532d', fg:'#86efac' }
};

const CATEGORIAS = [
  { id:'infraestructura', label:'Infraestructura',    icon:'road',    color:'#3b82f6' },
  { id:'luminaria',       label:'Luminaria',           icon:'sun',     color:'#f59e0b' },
  { id:'limpieza',        label:'Limpieza',             icon:'trash',   color:'#22c55e' },
  { id:'seguridad',       label:'Seguridad ciudadana', icon:'shield',  color:'#ef4444' },
  { id:'zonas-verdes',    label:'Zonas verdes',         icon:'tree',    color:'#10b981' },
  { id:'ruidos',          label:'Ruidos / molestias',   icon:'volume',  color:'#8b5cf6' },
  { id:'otros',           label:'Otros',                icon:'info',    color:'#9ca3af' }
];

const STATUS_LABELS = { nueva:'Nueva', pendiente:'Pendiente', proceso:'En proceso', resuelto:'Resuelta' };
const STATUS_COLORS = { pendiente:'#ef4444', proceso:'#3b82f6', resuelto:'#22c55e', nueva:'#f59e0b' };

const SEED = [
  { id:'s1', titulo:'Bache en Av. Andalucía', cat:'infraestructura', municipio:'Huelva', dir:'Av. Andalucía, 15', desc:'Bache enorme lleva 6 meses sin reparar. Han pinchado varios coches.', status:'proceso', urgencia:'alta', fecha:'24/04/2025 09:15', anon:false, uid:'antonio', apoyos:14, coords: [-6.9504, 37.2614] },
  { id:'s2', titulo:'Vertido ilegal en río Odiel', cat:'limpieza', municipio:'Palos de la Frontera', dir:'Paraje El Chorrito', desc:'Escombros vertidos ilegalmente en zona protegida del río.', status:'pendiente', urgencia:'urgente', fecha:'20/04/2025 14:32', anon:false, uid:'antonio', apoyos:8, coords: [-6.8931, 37.2289] },
  { id:'s3', titulo:'Farola rota — Parque Moret', cat:'luminaria', municipio:'Huelva', dir:'Parque Moret, zona norte', desc:'Varias farolas apagadas desde hace semanas. Zona a oscuras de noche.', status:'pendiente', urgencia:'media', fecha:'18/04/2025 21:08', anon:true, uid:'imanol', apoyos:21, coords: [-6.9389, 37.2911] },
  { id:'s4', titulo:'Contenedores sin vaciar', cat:'limpieza', municipio:'Ayamonte', dir:'Av. Libertad, 12', desc:'Contenedores llenos desde hace días. Olor insoportable.', status:'resuelto', urgencia:'alta', fecha:'10/04/2025 08:45', anon:false, uid:'imanol', apoyos:29, coords: [-7.4032, 37.2238] },
  { id:'s5', titulo:'Acera rota por raíces', cat:'infraestructura', municipio:'Lepe', dir:'C/ Real, 23', desc:'Las raíces han levantado el pavimento. Riesgo para personas mayores.', status:'proceso', urgencia:'media', fecha:'15/04/2025 11:20', anon:false, uid:'antonio', apoyos:6, coords: [-7.2023, 37.2541] },
  { id:'s6', titulo:'Columpios rotos en parque', cat:'zonas-verdes', municipio:'Isla Cristina', dir:'Parque Municipal', desc:'Columpios sin reparar meses. Riesgo real para niños.', status:'pendiente', urgencia:'urgente', fecha:'12/04/2025 17:55', anon:false, uid:'imanol', apoyos:17, coords: [-7.3212, 37.2008] },
  { id:'s7', titulo:'Bar sin licencia — ruidos nocturnos', cat:'ruidos', municipio:'Nerva', dir:'C/ Minas, 8', desc:'Música hasta las 5am todos los fines de semana.', status:'nueva', urgencia:'media', fecha:'08/04/2025 03:12', anon:true, uid:'antonio', apoyos:11, coords: [-6.5484, 37.6961] },
  { id:'s8', titulo:'Señal de stop derribada', cat:'seguridad', municipio:'Moguer', dir:'Cruce C/ Colón — Av. América', desc:'La señal lleva 3 días tirada en el suelo. Peligro para conductores.', status:'nueva', urgencia:'urgente', fecha:'06/04/2025 10:33', anon:false, uid:'imanol', apoyos:32, coords: [-6.8532, 37.2721] }
];

/* Storage helpers */
function getPub() {
  let s = []; try { s = JSON.parse(localStorage.getItem('dtc_pub') || '[]'); } catch(_) {}
  const ids = s.map(x => x.id);
  return [...SEED.filter(x => !ids.includes(x.id)), ...s];
}
function getMine(uid) {
  let s = []; try { s = JSON.parse(localStorage.getItem('dtc_u_' + uid) || '[]'); } catch(_) {}
  return s;
}
function getAll(uid) {
  const pub = getPub(), mine = getMine(uid), mids = mine.map(x => x.id);
  return [...pub.filter(x => !mids.includes(x.id)), ...mine];
}
function saveMine(uid, arr) {
  try {
    localStorage.setItem('dtc_u_' + uid, JSON.stringify(arr));
  } catch(_) {}

  if (firebaseEnabled && db && window._syncingFromFirestore !== true) {
    arr.forEach(report => {
      db.collection('incidencias').doc(report.id).set({
        ...report,
        aprobada: report.aprobada !== undefined ? report.aprobada : false
      }).catch(err => console.error("Error al sincronizar reporte privado:", err));
    });
  }
}

function savePub(arr) {
  try {
    localStorage.setItem('dtc_pub', JSON.stringify(arr));
  } catch(_) {}

  if (firebaseEnabled && db && window._syncingFromFirestore !== true) {
    arr.forEach(report => {
      db.collection('incidencias').doc(report.id).set({
        ...report,
        aprobada: true
      }).catch(err => console.error("Error al sincronizar reporte público:", err));
    });
  }
}

function getCat(id) { return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1]; }
function nowStr() {
  return new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})
       + ' ' + new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
}

/* ════════════════════════════════════════
   FIREBASE FIRESTORE SYNC LOGIC
   ════════════════════════════════════════ */
let db = null;
let firebaseEnabled = false;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn("Firebase SDK no cargado. Funcionando en modo local (localStorage).");
    return;
  }
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase no configurado en js/config.js. Funcionando en modo local (localStorage).");
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    firebaseEnabled = true;
    console.log("Firebase Firestore inicializado correctamente.");

    // Escuchar cambios en tiempo real
    db.collection('incidencias').onSnapshot((snapshot) => {
      const allReports = [];
      snapshot.forEach(doc => {
        allReports.push({ id: doc.id, ...doc.data() });
      });

      if (allReports.length === 0) {
        // La base de datos está vacía, inicializar con las semillas SEED
        console.log("Base de datos vacía. Subiendo semillas SEED...");
        SEED.forEach(item => {
          db.collection('incidencias').doc(item.id).set({
            ...item,
            aprobada: true // Todas las semillas se aprueban por defecto
          });
        });
        return;
      }

      // Procesar y guardar en localStorage para mantener el estado sincronizado
      const publicReports = allReports.filter(r => r.aprobada === true);

      // Agrupar por usuario los que no están aprobados
      const userReportsMap = {};
      allReports.forEach(r => {
        if (!r.aprobada) {
          if (!userReportsMap[r.uid]) userReportsMap[r.uid] = [];
          userReportsMap[r.uid].push(r);
        }
      });

      window._syncingFromFirestore = true;
      savePub(publicReports);

      // Limpiar y guardar reportes privados en localStorage
      saveMine('antonio', userReportsMap['antonio'] || []);
      saveMine('imanol', userReportsMap['imanol'] || []);
      window._syncingFromFirestore = false;

      // Forzar renderizado en la UI si la app está activa
      if (typeof App !== 'undefined' && App.currentUser) {
        if (App.renderAll) App.renderAll();
        if (typeof AppMap !== 'undefined' && AppMap.renderPins) {
          AppMap.renderPins();
        }
      }
    }, (error) => {
      console.error("Error en el listener de Firestore:", error);
    });
  } catch (e) {
    console.error("Error al inicializar Firebase:", e);
  }
}

// Ejecutar después de cargar los scripts
setTimeout(initFirebase, 50);
