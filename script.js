/*
StreamsVip Sistema Oficial
Mejorado
2026
*/

const numero = "51916252754";

/* =========================
FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyC3rYEe4akJ0w8zcNM4q-25yG7q6CaUHhY",
  authDomain: "streamsvip-b7d91.firebaseapp.com",
  databaseURL: "https://streamsvip-b7d91-default-rtdb.firebaseio.com",
  projectId: "streamsvip-b7d91",
  storageBucket: "streamsvip-b7d91.firebasestorage.app",
  messagingSenderId: "440618225611",
  appId: "1:440618225611:web:eeb4230a10499e1dfff04e"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

/* =========================
VARIABLES GLOBALES
========================= */

let precioBase = 0;
let cantidadProducto = 1;
let productoActual = "";
let productoBaseActual = "";
let stockDisponible = 0;
let usuarioActual = null;
let slideIndex = 1;
let sliderInterval = null;

let productoSeleccionadoId = "";
let productoSeleccionadoData = null;
let productosTiendaCache = {};
let badgeComprasRef = null;
let usuarioPerfilRef = null;
let redireccionPorBloqueoEnCurso = false;
let compraEnProceso = false;

let filtroBusqueda = "";
let filtroCategoria = "todos";

/* caches de stock real */
let cuentasStockCache = {};
let codigosStockCache = {};
let cuentasDataCache = {};
let codigosDataCache = {};

/* refs para evitar listeners innecesarios */
let productosRef = null;
let comprasHoyRef = null;
let comprasLiveRef = null;
let ventasRefs = [];
let cuentasRootRef = null;
let codigosRootRef = null;

/* control inactividad / presencia */
const TIEMPO_INACTIVIDAD_USUARIO = 5 * 60 * 1000;
const TIEMPO_INACTIVIDAD_ADMIN = 7 * 60 * 1000;
const TIEMPO_AVISO_INACTIVIDAD = 1 * 60 * 1000;
const TIEMPO_ESPERA_OFFLINE = 2500;

let temporizadorInactividad = null;
let temporizadorAvisoInactividad = null;
let controlInactividadIniciado = false;
let avisoInactividadMostrado = false;

let onlineRefActual = null;
let connectedRefActual = null;
let connectedCallbackActual = null;
let cierrePorPestanaRegistrado = false;
let timeoutOfflinePendiente = null;

/* =========================
UTILIDADES
========================= */

function obtenerPaginaActual() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function existeElemento(id) {
  return document.getElementById(id);
}

function esPaginaTienda() {
  return obtenerPaginaActual() === "tienda.html";
}

function esPaginaMisCompras() {
  return obtenerPaginaActual() === "mis-compras.html";
}

function esPaginaRecargas() {
  return obtenerPaginaActual() === "recargas.html";
}

function esPaginaComoComprar() {
  return obtenerPaginaActual() === "como-comprar.html";
}

function esPaginaOfertas() {
  return obtenerPaginaActual() === "ofertas.html";
}

function esPaginaAdmin() {
  return obtenerPaginaActual() === "admin.html";
}

function esPaginaPrivadaInterna() {
  const pagina = obtenerPaginaActual();
  return [
    "tienda.html",
    "mis-compras.html",
    "recargas.html",
    "ofertas.html",
    "como-comprar.html",
    "admin.html",
    "streampro.html"
  ].includes(pagina);
}

function formatearSaldo(saldo) {
  const monto = Number(saldo || 0);
  const montoFormateado = monto.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `S/ ${montoFormateado} <span class="panelSaldoMoneda">PEN</span>`;
}

function mostrarMensajeAuth(texto, color = "#fff") {
  const box = document.getElementById("mensajeAuth");
  if (!box) return;
  box.innerText = texto;
  box.style.color = color;
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatearPrecioProducto(precio) {
  return "S/ " + Number(precio || 0).toFixed(2);
}

function actualizarVisualCantidadYTotal() {
  const cantidadEl = document.getElementById("cantidadProducto");
  const totalEl = document.getElementById("precioTotal");

  if (cantidadEl) cantidadEl.innerText = String(cantidadProducto);
  if (totalEl) totalEl.innerText = (precioBase * cantidadProducto).toFixed(2);
}

function normalizarTextoBusqueda(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerNombreSimpleDesdeCorreo(email) {
  return String(email || "").split("@")[0] || "usuario";
}

function formatearFechaEntregaLocal() {
  return new Date().toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function normalizarIdSimple(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "");
}

function redondearMonto(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

function fechaMsSegura(valor) {
  if (typeof valor === "number") return valor;
  const ms = new Date(valor || "").getTime();
  return isNaN(ms) ? 0 : ms;
}

function sumarDiasMs(baseMs, dias) {
  return Number(baseMs || 0) + (Number(dias || 0) * 24 * 60 * 60 * 1000);
}

function formatearReglasHTML(reglasTexto = "") {
  const limpio = String(reglasTexto || "").trim();
  if (!limpio) return "";

  const partes = limpio
    .split(/\n|•|- /)
    .map((t) => t.trim())
    .filter(Boolean);

  if (!partes.length) {
    return `<li>${escaparHTML(limpio)}</li>`;
  }

  return partes.map((linea) => `<li>${escaparHTML(linea)}</li>`).join("");
}

/* =========================
STOCK REAL DESDE CUENTAS / CODIGOS
========================= */

function esNodoCuentaDirecta(data = {}) {
  if (!data || typeof data !== "object") return false;

  return (
    String(data.cuenta || "").trim() !== "" ||
    String(data.correo || "").trim() !== "" ||
    String(data.email || "").trim() !== "" ||
    String(data.usuario || "").trim() !== "" ||
    String(data.codigo || "").trim() !== ""
  );
}

function cuentaEstaDisponible(data = {}) {
  const vendida = data.vendida === true || data.vendido === true || data.usada === true;
  const disponibleFalse = data.disponible === false;
  const estado = String(data.estado || "").toLowerCase().trim();

  if (vendida) return false;
  if (disponibleFalse) return false;
  if (["vendida", "usada", "ocupada", "inactiva", "agotada"].includes(estado)) return false;

  const cuenta = data.cuenta || data.correo || data.email || data.usuario || data.codigo || "";
  return String(cuenta || "").trim() !== "";
}

function contarCuentasDisponiblesEnNodo(nodoActual) {
  if (!nodoActual || typeof nodoActual !== "object") return 0;

  if (esNodoCuentaDirecta(nodoActual)) {
    return cuentaEstaDisponible(nodoActual) ? 1 : 0;
  }

  let total = 0;
  Object.keys(nodoActual).forEach((key) => {
    const subNodo = nodoActual[key];
    if (subNodo && typeof subNodo === "object") {
      total += contarCuentasDisponiblesEnNodo(subNodo);
    }
  });

  return total;
}

function codigoEstaDisponible(data = {}) {
  const activo = data.activo !== false;
  const usado = data.usado === true;
  const codigo = String(data.codigo || "").trim();

  return activo && !usado && codigo !== "";
}

function reconstruirStockCuentasDesdeCache() {
  const nuevoMapa = {};

  Object.keys(cuentasDataCache || {}).forEach((productoId) => {
    nuevoMapa[productoId] = contarCuentasDisponiblesEnNodo(cuentasDataCache[productoId]);
  });

  cuentasStockCache = nuevoMapa;
}

function reconstruirStockCodigosDesdeCache() {
  const nuevoMapa = {};
  const data = codigosDataCache || {};

  Object.keys(data).forEach((key) => {
    const item = data[key] || {};
    if (!codigoEstaDisponible(item)) return;

    const productoId = String(item.productoId || item.producto || "").trim();
    if (!productoId) return;

    nuevoMapa[productoId] = (nuevoMapa[productoId] || 0) + 1;
  });

  codigosStockCache = nuevoMapa;
}

function obtenerStockRealProducto(productoId, itemProducto = {}) {
  if (esProductoStockIlimitado(productoId, itemProducto)) {
    return "Ilimitado";
  }

  if (esProductoCodigo(productoId, itemProducto) || esProductoLicencia(productoId, itemProducto)) {
    return Number(codigosStockCache[productoId] || 0);
  }

  return Number(cuentasStockCache[productoId] || 0);
}

function escucharStockRealTienda() {
  if (!esPaginaTienda()) return;

  if (cuentasRootRef) {
    cuentasRootRef.off();
    cuentasRootRef = null;
  }

  if (codigosRootRef) {
    codigosRootRef.off();
    codigosRootRef = null;
  }

  cuentasRootRef = db.ref("cuentas");
  cuentasRootRef.on("value", (snap) => {
    cuentasDataCache = snap.val() || {};
    reconstruirStockCuentasDesdeCache();
    if (Object.keys(productosTiendaCache).length) {
      renderizarProductosTienda(productosTiendaCache);
    }
  }, () => {
    cuentasDataCache = {};
    cuentasStockCache = {};
    if (Object.keys(productosTiendaCache).length) {
      renderizarProductosTienda(productosTiendaCache);
    }
  });

  codigosRootRef = db.ref("codigos");
  codigosRootRef.on("value", (snap) => {
    codigosDataCache = snap.val() || {};
    reconstruirStockCodigosDesdeCache();
    if (Object.keys(productosTiendaCache).length) {
      renderizarProductosTienda(productosTiendaCache);
    }
  }, () => {
    codigosDataCache = {};
    codigosStockCache = {};
    if (Object.keys(productosTiendaCache).length) {
      renderizarProductosTienda(productosTiendaCache);
    }
  });
}

/* =========================
UI OVERLAY / MODALES / MENU
========================= */

function inyectarEstilosUIOverlay() {
  if (document.getElementById("estilosUIOverlay")) return;

  const style = document.createElement("style");
  style.id = "estilosUIOverlay";
  style.textContent = `
    body.modal-abierto{
      overflow:hidden;
    }

    @media (max-width: 1024px){
      body.modal-abierto .menuIcon{
        opacity:0 !important;
        visibility:hidden !important;
        pointer-events:none !important;
        transform:scale(.92);
      }
    }
  `;
  document.head.appendChild(style);
}

function elementoEstaVisible(el) {
  if (!el) return false;
  const estilos = window.getComputedStyle(el);
  return estilos.display !== "none" && estilos.visibility !== "hidden" && estilos.opacity !== "0";
}

function hayOverlayActivo() {
  const modalCompra = document.getElementById("modalCompra");
  const modalOferta = document.getElementById("modalOfertaVigente");
  const modalTerminos = document.getElementById("modalTerminos");
  const avisoSistema = document.getElementById("avisoSistemaOverlay");

  return (
    elementoEstaVisible(modalCompra) ||
    elementoEstaVisible(modalOferta) ||
    elementoEstaVisible(modalTerminos) ||
    !!avisoSistema
  );
}

function actualizarEstadoUIOverlay() {
  inyectarEstilosUIOverlay();

  const overlayActivo = hayOverlayActivo();

  if (overlayActivo) {
    document.body.classList.add("modal-abierto");
    cerrarMenu();
  } else {
    document.body.classList.remove("modal-abierto");
  }
}

/* =========================
PRESENCIA / ONLINE
========================= */

function limpiarReferenciaOnline() {
  if (onlineRefActual) {
    try {
      onlineRefActual.onDisconnect().cancel();
    } catch (e) {}
  }

  if (connectedRefActual && connectedCallbackActual) {
    try {
      connectedRefActual.off("value", connectedCallbackActual);
    } catch (e) {}
  }

  onlineRefActual = null;
  connectedRefActual = null;
  connectedCallbackActual = null;
}

function cancelarOfflinePendiente() {
  if (timeoutOfflinePendiente) {
    clearTimeout(timeoutOfflinePendiente);
    timeoutOfflinePendiente = null;
  }
}

function marcarOfflineSiExiste() {
  if (!usuarioActual || !usuarioActual.uid) return;
  db.ref("online/" + usuarioActual.uid).set(false).catch(() => {});
}

function programarOfflineConEspera() {
  cancelarOfflinePendiente();

  timeoutOfflinePendiente = setTimeout(() => {
    marcarOfflineSiExiste();
    timeoutOfflinePendiente = null;
  }, TIEMPO_ESPERA_OFFLINE);
}

function registrarPresenciaUsuario(user) {
  if (!user || !user.uid) return;

  cancelarOfflinePendiente();
  limpiarReferenciaOnline();

  onlineRefActual = db.ref("online/" + user.uid);
  connectedRefActual = db.ref(".info/connected");

  connectedCallbackActual = (snap) => {
    if (snap.val() === true && onlineRefActual) {
      cancelarOfflinePendiente();
      onlineRefActual.onDisconnect().set(false).catch(() => {});
      onlineRefActual.set(true).catch(() => {});
    }
  };

  connectedRefActual.on("value", connectedCallbackActual);
  onlineRefActual.set(true).catch(() => {});
}

/* =========================
INACTIVIDAD / AUTO LOGOUT
========================= */

function limpiarTemporizadoresInactividad() {
  if (temporizadorInactividad) {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = null;
  }

  if (temporizadorAvisoInactividad) {
    clearTimeout(temporizadorAvisoInactividad);
    temporizadorAvisoInactividad = null;
  }
}

function obtenerTiempoInactividadPorPagina() {
  return esPaginaAdmin()
    ? TIEMPO_INACTIVIDAD_ADMIN
    : TIEMPO_INACTIVIDAD_USUARIO;
}

function mostrarAvisoInactividad() {
  if (avisoInactividadMostrado) return;
  avisoInactividadMostrado = true;

  mostrarAvisoSistema(
    "Sesión próxima a finalizar",
    "Se detectó inactividad prolongada en la sesión actual. Por seguridad, el acceso será finalizado automáticamente en 1 minuto si no registras interacción.",
    "warn",
    {
      textoBoton: "Entendido"
    }
  );
}

function cerrarSesionPorInactividad() {
  limpiarTemporizadoresInactividad();
  avisoInactividadMostrado = false;
  cancelarOfflinePendiente();
  marcarOfflineSiExiste();
  limpiarReferenciaOnline();
  limpiarTodoListeners();

  try {
    sessionStorage.setItem("streamsvip_motivo_salida", "inactividad");
  } catch (e) {}

  auth.signOut()
    .then(() => {
      window.location.replace("index.html");
    })
    .catch(() => {
      window.location.replace("index.html");
    });
}

function reiniciarTemporizadorInactividad() {
  if (!usuarioActual || !esPaginaPrivadaInterna()) return;

  limpiarTemporizadoresInactividad();
  avisoInactividadMostrado = false;

  const tiempoInactividad = obtenerTiempoInactividadPorPagina();

  if (tiempoInactividad > TIEMPO_AVISO_INACTIVIDAD) {
    temporizadorAvisoInactividad = setTimeout(() => {
      mostrarAvisoInactividad();
    }, tiempoInactividad - TIEMPO_AVISO_INACTIVIDAD);
  }

  temporizadorInactividad = setTimeout(() => {
    cerrarSesionPorInactividad();
  }, tiempoInactividad);
}

function iniciarControlInactividad() {
  if (!esPaginaPrivadaInterna()) return;

  if (controlInactividadIniciado) {
    reiniciarTemporizadorInactividad();
    return;
  }

  const eventos = [
    "mousemove",
    "mousedown",
    "click",
    "scroll",
    "keypress",
    "keydown",
    "touchstart",
    "touchmove"
  ];

  eventos.forEach((evento) => {
    document.addEventListener(evento, reiniciarTemporizadorInactividad, true);
  });

  window.addEventListener("focus", () => {
    cancelarOfflinePendiente();
    reiniciarTemporizadorInactividad();
  });

  document.addEventListener("visibilitychange", () => {
    if (!usuarioActual) return;

    if (!document.hidden) {
      cancelarOfflinePendiente();
      reiniciarTemporizadorInactividad();
      if (usuarioActual && usuarioActual.uid) {
        db.ref("online/" + usuarioActual.uid).set(true).catch(() => {});
      }
    } else {
      programarOfflineConEspera();
    }
  });

  controlInactividadIniciado = true;
  reiniciarTemporizadorInactividad();
}

/* =========================
CIERRE POR PESTAÑA / NAVEGADOR
========================= */

function registrarCierrePorPestana() {
  if (cierrePorPestanaRegistrado) return;
  cierrePorPestanaRegistrado = true;

  window.addEventListener("beforeunload", () => {
    limpiarListenersPagina();
    programarOfflineConEspera();
  });

  window.addEventListener("pagehide", () => {
    programarOfflineConEspera();
  });
}

/* =========================
AVISOS PROFESIONALES
========================= */

function inyectarEstilosAvisoSistema() {
  if (document.getElementById("estilosAvisoSistema")) return;

  const style = document.createElement("style");
  style.id = "estilosAvisoSistema";
  style.textContent = `
    .avisoSistemaOverlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.68);
      backdrop-filter:blur(6px);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:999999;
      padding:20px;
      animation:fadeAviso .18s ease;
    }

    .avisoSistemaBox{
      width:100%;
      max-width:500px;
      background:
        radial-gradient(circle at top right, rgba(255,38,38,0.08), transparent 30%),
        linear-gradient(180deg,#0f141d,#090d14);
      color:#fff;
      border:1px solid rgba(255,255,255,0.08);
      border-radius:22px;
      box-shadow:0 24px 70px rgba(0,0,0,0.52);
      overflow:hidden;
      animation:subirAviso .22s ease;
    }

    .avisoSistemaBox.stockLimitado{
      border:1px solid rgba(255,59,59,0.22);
      box-shadow:0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,40,40,0.04) inset;
    }

    .avisoSistemaHead{
      display:flex;
      align-items:center;
      gap:12px;
      padding:18px 20px 14px;
      border-bottom:1px solid rgba(255,255,255,0.06);
      background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));
    }

    .avisoSistemaIcono{
      width:46px;
      height:46px;
      border-radius:15px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:22px;
      flex:0 0 46px;
      box-shadow:0 10px 24px rgba(0,0,0,0.24);
    }

    .avisoSistemaIcono.info{
      background:linear-gradient(180deg,#2563eb,#1d4ed8);
    }

    .avisoSistemaIcono.warn{
      background:linear-gradient(180deg,#f59e0b,#d97706);
    }

    .avisoSistemaIcono.error{
      background:linear-gradient(180deg,#ef4444,#dc2626);
    }

    .avisoSistemaIcono.stock{
      background:linear-gradient(180deg,#ff3b3b,#c91010);
      box-shadow:0 14px 28px rgba(201,16,16,0.28);
    }

    .avisoSistemaTitulo{
      margin:0;
      font-size:19px;
      font-weight:800;
      letter-spacing:.2px;
    }

    .avisoSistemaBody{
      padding:18px 20px 10px;
      color:rgba(255,255,255,0.90);
      font-size:15px;
      line-height:1.6;
      white-space:pre-line;
    }

    .avisoSistemaBodyHtml{
      white-space:normal;
    }

    .avisoSistemaStockCard{
      margin-top:4px;
      background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));
      border:1px solid rgba(255,255,255,0.06);
      border-radius:18px;
      padding:16px;
    }

    .avisoSistemaStockTop{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:10px;
    }

    .avisoSistemaStockLabel{
      font-size:13px;
      color:rgba(255,255,255,0.68);
      letter-spacing:.4px;
      text-transform:uppercase;
      font-weight:700;
    }

    .avisoSistemaStockBadge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:74px;
      padding:8px 12px;
      border-radius:999px;
      font-size:14px;
      font-weight:900;
      color:#fff;
      background:linear-gradient(180deg,#ff2f2f,#b90f0f);
      box-shadow:0 10px 24px rgba(185,15,15,0.28);
    }

    .avisoSistemaStockTexto{
      color:rgba(255,255,255,0.92);
      font-size:15px;
      line-height:1.7;
    }

    .avisoSistemaResaltado{
      color:#fff;
      font-weight:900;
    }

    .avisoSistemaSub{
      margin-top:10px;
      font-size:13px;
      color:rgba(255,255,255,0.62);
    }

    .avisoSistemaFooter{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      padding:10px 20px 20px;
      flex-wrap:wrap;
    }

    .avisoSistemaBtn{
      border:none;
      outline:none;
      cursor:pointer;
      min-width:128px;
      padding:12px 18px;
      border-radius:14px;
      font-size:14px;
      font-weight:800;
      color:#fff;
      background:linear-gradient(180deg,#ff2a2a,#c90f0f);
      box-shadow:0 10px 24px rgba(201,15,15,0.34);
      transition:transform .16s ease, opacity .16s ease, filter .16s ease;
    }

    .avisoSistemaBtn:hover{
      transform:translateY(-1px);
      opacity:.97;
      filter:brightness(1.03);
    }

    .avisoSistemaBtn.secundario{
      background:linear-gradient(180deg,#1f2937,#111827);
      box-shadow:none;
      border:1px solid rgba(255,255,255,0.10);
      color:#fff;
    }

   .toastCompraExitosa{
  position:fixed;
  top:18px;
  right:18px;
  left:auto;
  bottom:auto;
  z-index:999999;
  width:auto !important;
  min-width:0 !important;
  max-width:360px !important;
  height:auto !important;
  min-height:0 !important;
  max-height:none !important;
  padding:12px 14px;
  display:flex;
  align-items:center;
  gap:12px;
  background:linear-gradient(180deg,#0f172a,#0b1220);
  color:#fff;
  border:1px solid rgba(255,255,255,.08);
  border-radius:16px;
  box-shadow:0 16px 34px rgba(0,0,0,.34);
  opacity:0;
  transform:translateY(-14px) scale(.98);
  pointer-events:none;
  overflow:hidden;
  box-sizing:border-box;
  transition:opacity .22s ease, transform .22s ease;
}

.toastCompraExitosa.show{
  opacity:1;
  transform:translateY(0) scale(1);
}

.toastCompraIcon{
  width:40px;
  height:40px;
  min-width:40px;
  min-height:40px;
  border-radius:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg,#22c55e,#16a34a);
  font-size:20px;
  flex:0 0 40px;
}

.toastCompraTexto{
  display:flex;
  flex-direction:column;
  gap:3px;
  min-width:0;
  flex:1;
}

.toastCompraTexto strong{
  font-size:13.5px;
  font-weight:800;
  line-height:1.25;
  margin:0;
}

.toastCompraTexto span{
  font-size:12px;
  color:rgba(255,255,255,.75);
  line-height:1.35;
  word-break:break-word;
}

@media (max-width: 768px){
  .toastCompraExitosa{
    top:12px;
    right:12px;
    left:12px;
    max-width:none !important;
  }
}eight:1.45;
    }

    @keyframes fadeAviso{
      from{opacity:0;}
      to{opacity:1;}
    }

    @keyframes subirAviso{
      from{opacity:0; transform:translateY(10px) scale(.98);}
      to{opacity:1; transform:translateY(0) scale(1);}
    }
  `;
  document.head.appendChild(style);
}

function mostrarAvisoSistema(titulo, mensaje, tipo = "info", opciones = {}) {
  inyectarEstilosAvisoSistema();

  const anterior = document.getElementById("avisoSistemaOverlay");
  if (anterior) anterior.remove();

  const overlay = document.createElement("div");
  overlay.id = "avisoSistemaOverlay";
  overlay.className = "avisoSistemaOverlay";

  const icono = opciones.icono || (tipo === "error" ? "⛔" : tipo === "warn" ? "⚠" : "ℹ");
  const claseCajaExtra = opciones.claseCajaExtra ? ` ${opciones.claseCajaExtra}` : "";
  const claseIconoExtra = opciones.claseIconoExtra ? ` ${opciones.claseIconoExtra}` : "";
  const usarHtml = opciones.usarHtml === true;
  const textoBoton = opciones.textoBoton || "Entendido";
  const textoBotonSecundario = opciones.textoBotonSecundario || "";

  overlay.innerHTML = `
    <div class="avisoSistemaBox${claseCajaExtra}">
      <div class="avisoSistemaHead">
        <div class="avisoSistemaIcono ${tipo}${claseIconoExtra}">${icono}</div>
        <h3 class="avisoSistemaTitulo">${escaparHTML(titulo)}</h3>
      </div>
      <div class="avisoSistemaBody${usarHtml ? " avisoSistemaBodyHtml" : ""}" id="avisoSistemaBodyContenido"></div>
      <div class="avisoSistemaFooter">
        ${textoBotonSecundario ? `<button class="avisoSistemaBtn secundario" id="btnSecundarioAvisoSistema">${escaparHTML(textoBotonSecundario)}</button>` : ""}
        <button class="avisoSistemaBtn" id="btnCerrarAvisoSistema">${escaparHTML(textoBoton)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  actualizarEstadoUIOverlay();

  const body = document.getElementById("avisoSistemaBodyContenido");
  if (body) {
    if (usarHtml) body.innerHTML = mensaje;
    else body.textContent = mensaje;
  }

  function cerrarAviso() {
    overlay.remove();
    actualizarEstadoUIOverlay();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cerrarAviso();
  });

  const btn = document.getElementById("btnCerrarAvisoSistema");
  if (btn) {
    btn.addEventListener("click", () => {
      cerrarAviso();
      if (typeof opciones.onConfirmar === "function") opciones.onConfirmar();
    });
  }

  const btnSec = document.getElementById("btnSecundarioAvisoSistema");
  if (btnSec) {
    btnSec.addEventListener("click", () => {
      cerrarAviso();
      if (typeof opciones.onSecundario === "function") opciones.onSecundario();
    });
  }
}

function mostrarAvisoStockPremium(stockMaximo) {
  const stock = Number(stockMaximo || 0);

  mostrarAvisoSistema(
    "Stock limitado",
    `
      <div class="avisoSistemaStockCard">
        <div class="avisoSistemaStockTop">
          <div class="avisoSistemaStockLabel">Disponibilidad actual</div>
          <div class="avisoSistemaStockBadge">${stock} ${stock === 1 ? "unidad" : "unidades"}</div>
        </div>

        <div class="avisoSistemaStockTexto">
          Ajustamos automáticamente tu cantidad al <span class="avisoSistemaResaltado">máximo disponible</span> para que puedas continuar con la compra sin errores.
        </div>

        <div class="avisoSistemaSub">
          Puedes seguir comprando con la cantidad disponible actual.
        </div>
      </div>
    `,
    "warn",
    {
      icono: "🔥",
      claseCajaExtra: "stockLimitado",
      claseIconoExtra: " stock",
      usarHtml: true,
      textoBoton: "Continuar",
      textoBotonSecundario: "Cerrar"
    }
  );
}

/* =========================
MODAL DESCARGA / PLUGIN
========================= */

function esEntregaDescargaOPlugin(itemProducto = {}) {
  const tipoEntrega = String(itemProducto?.tipoEntrega || "").toLowerCase().trim();
  const categoria = String(itemProducto?.categoria || "").toLowerCase().trim();

  return (
    tipoEntrega === "descarga" ||
    tipoEntrega === "plugin" ||
    tipoEntrega === "daw" ||
    categoria === "plugin" ||
    categoria === "daw" ||
    categoria === "descarga"
  );
}

function asegurarUIEntregaDescarga() {
  const modalInfo = document.querySelector(".modalInfo");
  if (!modalInfo) return;

  let wrap = document.getElementById("bloqueEntregaDescarga");
  if (wrap) return;

  wrap = document.createElement("div");
  wrap.id = "bloqueEntregaDescarga";
  wrap.className = "bloqueEntregaDescarga";
  wrap.style.display = "none";
  wrap.innerHTML = `
    <div class="selectorEntregaBox" style="
      margin:14px 0 8px;
      padding:14px;
      border-radius:16px;
      background:linear-gradient(180deg,#10141c,#0b0f16);
      border:1px solid rgba(255,255,255,.08);
    ">
      <div style="
        font-size:12px;
        font-weight:800;
        letter-spacing:.5px;
        text-transform:uppercase;
        color:#9fb6d9;
        margin-bottom:8px;
      ">Plataforma de instalación</div>

      <select id="selectorPlataformaPlugin" style="
        width:100%;
        height:46px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.10);
        background:#0f131b;
        color:#fff;
        padding:0 14px;
        outline:none;
        font-size:14px;
        font-weight:700;
      ">
        <option value="windows">Windows</option>
        <option value="mac">Mac</option>
        <option value="general">General</option>
      </select>

      <div id="textoEntregaPlugin" style="
        margin-top:10px;
        font-size:12.5px;
        line-height:1.5;
        color:#aeb8c6;
      ">
        Selecciona la plataforma donde instalarás el archivo.
      </div>
    </div>
  `;

  const garantiaBox = modalInfo.querySelector(".garantiaBox");
  if (garantiaBox) {
    garantiaBox.insertAdjacentElement("beforebegin", wrap);
  } else {
    modalInfo.appendChild(wrap);
  }
}

function actualizarVisualModalSegunTipoEntrega(itemProducto = {}) {
  asegurarUIEntregaDescarga();

  const esDescarga = esEntregaDescargaOPlugin(itemProducto);
  const cantidadBox = document.querySelector(".cantidadBox");
  const bloqueEntrega = document.getElementById("bloqueEntregaDescarga");
  const btnComprar = document.querySelector(".btnComprarAhora");
  const totalTitulo = document.querySelector(".modalInfo h3");
  const textoEntrega = document.getElementById("textoEntregaPlugin");

  if (cantidadBox) {
    cantidadBox.style.display = esDescarga ? "none" : "flex";
  }

  if (bloqueEntrega) {
    bloqueEntrega.style.display = esDescarga ? "block" : "none";
  }

  if (btnComprar) {
    btnComprar.innerText = esDescarga ? "Comprar descarga" : "Comprar ahora";
  }

  if (totalTitulo) {
    totalTitulo.style.marginTop = esDescarga ? "10px" : "";
  }

  if (textoEntrega) {
    textoEntrega.innerHTML = esDescarga
      ? "Se entregará el acceso de descarga según la plataforma seleccionada. Verifica si necesitas <strong>Windows</strong>, <strong>Mac</strong> o una versión <strong>General</strong> antes de continuar."
      : "Entrega configurada para acceso estándar.";
  }
}

/* =========================
NORMALIZACION PRODUCTOS
========================= */

function normalizarProductoBase(nombre) {
  const texto = String(nombre || "").toLowerCase();

  if (texto.includes("netflix")) return "Netflix";
  if (texto.includes("disney")) return "Disney";
  if (texto.includes("prime")) return "Prime";
  if (texto.includes("hbo max platinium")) return "HBOPlatinium";
  if (texto.includes("hbomax platinium")) return "HBOPlatinium";
  if (texto.includes("hbo platinium")) return "HBOPlatinium";
  if (texto.includes("hbo")) return "HBO";
  if (texto.includes("paramount")) return "Paramount";
  if (texto.includes("spotify")) return "Spotify";
  if (texto.includes("vix")) return "Vix";
  if (texto.includes("crunchy")) return "Crunchyroll";
  if (texto.includes("canva")) return "Canva";
  if (texto.includes("youtube premium")) return "YouTubePremium";
  if (texto.includes("youtube")) return "YouTubePremium";
  if (texto.includes("chatgpt")) return "ChatGPT";

  if (
    texto.includes("windows 11 pro") ||
    texto.includes("win11pro") ||
    texto.includes("windows11pro")
  ) {
    return "Windows11Pro";
  }

  return "";
}

function obtenerCategoriaVisualProducto(idProducto, itemProducto = {}) {
  const id = String(idProducto || "").toLowerCase();
  const nombre = normalizarTextoBusqueda(itemProducto.nombre || "");
  const categoriaDb = normalizarTextoBusqueda(itemProducto.categoria || "");
  const tipoEntrega = normalizarTextoBusqueda(itemProducto.tipoEntrega || "");

  if (
    tipoEntrega === "codigo" ||
    categoriaDb.includes("licencia") ||
    categoriaDb.includes("codigo") ||
    categoriaDb.includes("clave") ||
    id.includes("windows") ||
    nombre.includes("windows 11 pro")
  ) {
    return "licencias";
  }

  if (
    categoriaDb === "plugin" ||
    categoriaDb.includes("plugin") ||
    tipoEntrega === "plugin" ||
    nombre.includes("plugin") ||
    nombre.includes("vst") ||
    nombre.includes("au")
  ) {
    return "plugin";
  }

  if (
    categoriaDb === "daw" ||
    categoriaDb.includes("daw") ||
    tipoEntrega === "daw" ||
    nombre.includes("fl studio") ||
    nombre.includes("ableton") ||
    nombre.includes("cubase") ||
    nombre.includes("logic pro") ||
    nombre.includes("reaper") ||
    nombre.includes("pro tools") ||
    nombre.includes("studio one")
  ) {
    return "daw";
  }

  if (
    categoriaDb === "descarga" ||
    categoriaDb.includes("descarga") ||
    tipoEntrega === "descarga"
  ) {
    return "descarga";
  }

  if (
    categoriaDb.includes("musica") ||
    categoriaDb.includes("música") ||
    nombre.includes("spotify")
  ) {
    return "musica";
  }

  if (
    nombre.includes("canva") ||
    categoriaDb.includes("diseno") ||
    categoriaDb.includes("diseño")
  ) {
    return "diseno";
  }

  if (
    nombre.includes("chatgpt") ||
    categoriaDb.includes("ia") ||
    categoriaDb.includes("inteligencia artificial")
  ) {
    return "ia";
  }

  return "streaming";
}

function productoCoincideBusquedaYCategoria(idProducto, itemProducto = {}) {
  const nombre = normalizarTextoBusqueda(itemProducto.nombre || idProducto);
  const categoriaProducto = obtenerCategoriaVisualProducto(idProducto, itemProducto);

  const coincideBusqueda =
    !filtroBusqueda ||
    nombre.includes(normalizarTextoBusqueda(filtroBusqueda));

  const coincideCategoria =
    filtroCategoria === "todos" ||
    categoriaProducto === filtroCategoria;

  return coincideBusqueda && coincideCategoria;
}

function esProductoLicencia(productoId = "", itemProducto = {}) {
  const id = String(productoId || "").toLowerCase();
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();
  const tipoEntrega = String(itemProducto.tipoEntrega || "").toLowerCase();

  return (
    tipoEntrega === "codigo" ||
    categoria.includes("licencia") ||
    id === "windows11pro" ||
    nombre.includes("windows 11 pro") ||
    nombre.includes("licencia")
  );
}

function esProductoDescarga(productoId = "", itemProducto = {}) {
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();
  const tipoEntrega = String(itemProducto.tipoEntrega || "").toLowerCase();

  return (
    tipoEntrega === "descarga" ||
    tipoEntrega === "plugin" ||
    tipoEntrega === "daw" ||
    categoria.includes("plugin") ||
    categoria.includes("daw") ||
    categoria.includes("descarga") ||
    nombre.includes("plugin") ||
    nombre.includes("vst") ||
    nombre.includes("au") ||
    nombre.includes("fl studio") ||
    nombre.includes("ableton") ||
    nombre.includes("cubase") ||
    nombre.includes("logic pro") ||
    nombre.includes("reaper") ||
    nombre.includes("pro tools") ||
    nombre.includes("studio one")
  );
}

function esProductoStockIlimitado(productoId = "", itemProducto = {}) {
  const tipoEntrega = String(itemProducto.tipoEntrega || "").toLowerCase().trim();
  const categoria = String(itemProducto.categoria || "").toLowerCase().trim();

  return (
    tipoEntrega === "descarga" ||
    tipoEntrega === "plugin" ||
    tipoEntrega === "daw" ||
    categoria === "plugin" ||
    categoria === "daw" ||
    categoria === "descarga"
  );
}

function esProductoCodigo(productoId = "", itemProducto = {}) {
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();
  const tipoEntrega = String(itemProducto.tipoEntrega || "").toLowerCase();

  return (
    tipoEntrega === "codigo" ||
    categoria.includes("codigo") ||
    categoria.includes("código") ||
    categoria.includes("clave") ||
    categoria.includes("key") ||
    nombre.includes("licencia") ||
    nombre.includes("clave") ||
    nombre.includes("key") ||
    nombre.includes("código")
  );
}

function obtenerImagenProducto(item, idProducto) {
  const imagenPersonalizada = String(item?.imagen || "").trim();
  if (imagenPersonalizada) return imagenPersonalizada;

  const mapa = {
    netflix: "img/Netflix.jpg",
    disney: "img/Disney.jpg",
    prime: "img/Primevideo.jpg",
    hbo: "img/Hbomax.jpg",
    hboprime: "img/Hbomax.jpg",
    hboplatinium: "img/hbop.png",
    paramount: "img/Paramount.jpg",
    spotify: "img/Spotify.jpg",
    vix: "img/logo.jpg",
    crunchyroll: "img/cr.png",
    canva: "img/cv.jpg",
    youtubepremium: "img/yt.png",
    chatgpt: "img/logo.jpg",
    windows11pro: "img/win11pro.png"
  };

  const clave = String(idProducto || "").toLowerCase();
  return mapa[clave] || "img/logo.jpg";
}

function obtenerDuracionTexto(item) {
  const nombre = String(item?.nombre || "").toLowerCase().trim();
  const tipoEntrega = String(item?.tipoEntrega || "").toLowerCase().trim();
  const dias = Number(item?.duracionDias || 30);
  const esPermanente = dias >= 3650 || dias === 3065 || nombre.includes("permanente");

  if (tipoEntrega === "descarga" || tipoEntrega === "plugin" || tipoEntrega === "daw") {
    if (esPermanente) return "Instalación: Permanente";
    return "Instalación: " + dias + " días";
  }

  if (tipoEntrega === "codigo") {
    if (esPermanente) return "Activación: Permanente";
    return "Activación: " + dias + " días";
  }

  if (esPermanente) return "Duración: Permanente";
  if (dias === 365) return "Duración: 1 año";
  if (dias === 180) return "Duración: 6 meses";
  if (dias === 90) return "Duración: 3 meses";
  if (dias === 60) return "Duración: 2 meses";
  if (dias === 30) return "Duración: 1 mes";
  if (dias === 15) return "Duración: 15 días";
  if (dias === 7) return "Duración: 7 días";
  if (dias === 1) return "Duración: 1 día";

  return "Duración: " + dias + " días";
}

function calcularRepartoVenta(precioUnitario, cantidad, itemProducto = {}) {
  const total = Number(precioUnitario || 0) * Number(cantidad || 1);
  const porcentajePlataforma = Number(itemProducto.comisionPlataforma ?? 4);
  const porcentajeProveedor = Number(itemProducto.comisionProveedor ?? (100 - porcentajePlataforma));

  const montoPlataforma = Number((total * porcentajePlataforma / 100).toFixed(2));
  const montoProveedor = Number((total - montoPlataforma).toFixed(2));

  return {
    total: Number(total.toFixed(2)),
    porcentajePlataforma,
    porcentajeProveedor,
    montoPlataforma,
    montoProveedor
  };
}

function obtenerReglasProducto(productoBase) {
  const item = productoSeleccionadoData || {};
  const reglasPersonalizadas = String(item?.reglas || "").trim();

  if (reglasPersonalizadas) {
    return formatearReglasHTML(reglasPersonalizadas);
  }

  const tipoEntrega = String(item?.tipoEntrega || "").toLowerCase().trim();
  const categoria = String(item?.categoria || "").toLowerCase().trim();

  if (
    tipoEntrega === "descarga" ||
    tipoEntrega === "plugin" ||
    tipoEntrega === "daw" ||
    categoria === "plugin" ||
    categoria === "daw" ||
    categoria === "descarga"
  ) {
    return `
      <li>Selecciona correctamente la plataforma de instalación: <strong>Windows</strong>, <strong>Mac</strong> o <strong>General</strong>.</li>
      <li>Descarga el archivo completo y espera a que finalice antes de abrirlo.</li>
      <li>Descomprime el paquete si viene en formato ZIP, RAR o similar.</li>
      <li>En Windows, ejecuta el instalador <strong>.exe</strong> como administrador cuando sea necesario.</li>
      <li>En Mac, abre el archivo correspondiente y concede permisos del sistema si el instalador lo solicita.</li>
      <li>No modifiques la estructura interna de carpetas del paquete entregado.</li>
      <li>No compartas el enlace recibido ni redistribuyas el contenido descargable.</li>
      <li>Guarda una copia del instalador en tu equipo para futuras reinstalaciones si aplica.</li>
      <li>El soporte cubre problemas de entrega o acceso al archivo, no configuraciones avanzadas externas del sistema.</li>
    `;
  }

  if (productoBase === "Netflix") {
    return `
      <li>Perfil únicamente para un dispositivo.</li>
      <li>No cambiar correo ni contraseña de la cuenta.</li>
      <li>No eliminar ni modificar perfiles existentes.</li>
      <li>No alterar configuraciones de la cuenta.</li>
      <li>Uso exclusivo para ver contenido.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Disney") {
    return `
      <li>Perfil para uso personal.</li>
      <li>No cambiar correo ni contraseña.</li>
      <li>No eliminar perfiles existentes.</li>
      <li>No compartir el acceso con terceros.</li>
      <li>Uso exclusivo para ver contenido en la plataforma.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Prime") {
    return `
      <li>Perfil para uso personal.</li>
      <li>No modificar correo ni contraseña.</li>
      <li>No eliminar perfiles ni cambiar configuraciones.</li>
      <li>No compartir el acceso con terceros.</li>
      <li>No comprar ni alquilar películas dentro de la plataforma.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "HBO" || productoBase === "HBOPlatinium") {
    return `
      <li>Perfil de uso exclusivamente personal e individual.</li>
      <li>No cambiar correo, contraseña ni parámetros de seguridad.</li>
      <li>No modificar, renombrar o eliminar perfiles existentes.</li>
      <li>No alterar configuraciones internas de reproducción o cuenta.</li>
      <li>No compartir el acceso con terceros ajenos a la compra.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Paramount") {
    return `
      <li>Acceso para uso personal.</li>
      <li>No modificar credenciales de la cuenta.</li>
      <li>No eliminar perfiles existentes.</li>
      <li>No compartir acceso con terceros.</li>
      <li>Uso exclusivo dentro de la plataforma.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Spotify") {
    return `
      <li>Cuenta para uso personal.</li>
      <li>No cambiar correo ni contraseña.</li>
      <li>No modificar el plan de la cuenta.</li>
      <li>No compartir el acceso con terceros.</li>
      <li>No cambiar país o región de la cuenta.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Crunchyroll") {
    return `
      <li>Acceso destinado exclusivamente a consumo personal de contenido.</li>
      <li>No modificar correo, contraseña ni configuraciones maestras.</li>
      <li>No compartir el acceso con terceros no autorizados.</li>
      <li>No alterar perfiles ni parámetros internos del servicio.</li>
      <li>No vincular métodos de pago propios en la cuenta entregada.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Canva") {
    return `
      <li>Acceso digital orientado a uso personal o profesional individual.</li>
      <li>No cambiar correo principal, contraseña ni configuración administrativa.</li>
      <li>No eliminar miembros, recursos compartidos ni configuraciones base.</li>
      <li>No revender, compartir o transferir el acceso a terceros.</li>
      <li>No realizar acciones que comprometan la estabilidad operativa de la cuenta.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "YouTubePremium") {
    return `
      <li>Servicio destinado a uso personal dentro del periodo contratado.</li>
      <li>No modificar credenciales ni información principal de la cuenta.</li>
      <li>No cambiar país, región o configuraciones sensibles del servicio.</li>
      <li>No compartir acceso con terceros fuera del uso autorizado.</li>
      <li>No asociar compras, suscripciones o métodos de pago adicionales.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  if (productoBase === "Windows11Pro") {
    return `
      <li>Licencia digital OEM para activación de Windows 11 Pro.</li>
      <li>Abre Configuración &gt; Sistema &gt; Activación.</li>
      <li>Selecciona “Cambiar clave de producto”.</li>
      <li>Ingresa la clave recibida y confirma la activación.</li>
      <li>Se recomienda usar la licencia en un solo equipo compatible.</li>
      <li>No se realizan cambios manuales en BIOS o hardware desde la tienda.</li>
    `;
  }

  return `
    <li>Uso exclusivamente personal.</li>
    <li>No modificar credenciales ni configuraciones.</li>
    <li>No compartir el acceso con terceros.</li>
    <li>El incumplimiento de estas condiciones anula la garantía.</li>
  `;
}

function obtenerDescripcionProductoFallback(productoBase) {
  const item = productoSeleccionadoData || {};
  const tipoEntrega = String(item?.tipoEntrega || "").toLowerCase().trim();
  const categoria = String(item?.categoria || "").toLowerCase().trim();

  if (
    tipoEntrega === "descarga" ||
    tipoEntrega === "plugin" ||
    tipoEntrega === "daw" ||
    categoria === "plugin" ||
    categoria === "daw" ||
    categoria === "descarga"
  ) {
    return "Producto digital descargable con entrega técnica según la plataforma seleccionada. El acceso se orienta a instalación en Windows, Mac o versión general, según disponibilidad configurada para el producto.";
  }

  if (productoBase === "Crunchyroll") {
    return "Suscripción digital Crunchyroll Premium con vigencia de 12 meses. Acceso a catálogo anime en alta definición, simulcast, reproducción sin interrupciones publicitarias y compatibilidad multidispositivo según las condiciones operativas del servicio asignado.";
  }

  if (productoBase === "Canva") {
    return "Acceso digital a Canva Pro con vigencia de 12 meses. Incluye herramientas avanzadas de diseño, exportación premium, biblioteca extendida de recursos gráficos, plantillas profesionales y funciones orientadas a productividad visual y branding.";
  }

  if (productoBase === "HBOPlatinium") {
    return "Perfil digital HBO Max Platinium con duración de 30 días. Acceso a contenido premium en streaming, series, películas y catálogo exclusivo, con uso destinado a reproducción personal bajo las condiciones del perfil entregado.";
  }

  if (productoBase === "YouTubePremium") {
    return "Suscripción digital YouTube Premium con vigencia de 30 días. Incluye reproducción sin anuncios, reproducción en segundo plano, acceso optimizado desde múltiples dispositivos compatibles y funciones premium asociadas al servicio.";
  }

  if (productoBase === "Netflix") {
    return "Acceso digital a Netflix mediante perfil asignado, con reproducción orientada a consumo personal y disponibilidad durante el periodo contratado.";
  }

  if (productoBase === "Disney") {
    return "Acceso digital a Disney+ mediante perfil asignado, habilitado para visualización de contenido premium durante el periodo contratado.";
  }

  if (productoBase === "Prime") {
    return "Acceso digital a Prime Video mediante perfil asignado, con visualización de series y películas durante la vigencia del servicio.";
  }

  if (productoBase === "HBO") {
    return "Perfil digital HBO Max con acceso a catálogo premium de series y películas durante el tiempo de servicio contratado.";
  }

  if (productoBase === "Spotify") {
    return "Cuenta digital Spotify Premium para reproducción musical sin anuncios y acceso a funciones avanzadas durante el periodo contratado.";
  }

  if (productoBase === "Windows11Pro") {
    return "Licencia digital OEM para activar Windows 11 Pro de forma rápida y segura. Después de la compra, ve a Configuración > Sistema > Activación > Cambiar clave de producto, ingresa la key recibida y confirma la activación. Producto digital, no requiere envío físico.";
  }

  return "Producto digital disponible.";
}
/* =========================
RUTAS CUENTAS SEGUN FIREBASE
========================= */

function obtenerRutaCuentasPorProducto(productoId, itemProducto = {}) {
  const id = String(productoId || "").toLowerCase().trim();
  const nombre = String(itemProducto.nombre || productoActual || "").toLowerCase();

  if (id === "netflix" || nombre.includes("netflix")) return "netflix";
  if (id === "disney" || nombre.includes("disney")) return "disney";
  if (
    id === "hboprime" ||
    nombre.includes("hbo max + prime") ||
    (nombre.includes("hbo") && nombre.includes("prime"))
  ) return "hboprime";
  if (id === "prime" || nombre.includes("prime video")) return "prime";
  if (
    id === "hboplatinium" ||
    nombre.includes("hbo max platinium") ||
    nombre.includes("hbomax platinium") ||
    nombre.includes("hbo platinium")
  ) return "hboplatinium";
  if (id === "hbo" || nombre.includes("hbo")) return "hbo";
  if (id === "paramount" || nombre.includes("paramount")) return "paramount";
  if (id === "spotify" || nombre.includes("spotify")) return "spotify";
  if (id === "vix" || nombre.includes("vix")) return "vix";
  if (id === "crunchyroll" || nombre.includes("crunchyroll")) return "crunchyroll";
  if (id === "canva" || nombre.includes("canva")) return "canva";
  if (id === "youtubepremium" || nombre.includes("youtube premium") || nombre.includes("youtube")) return "youtubepremium";
  if (id === "chatgpt" || nombre.includes("chatgpt")) return "chatgpt";
  if (id === "windows11pro" || nombre.includes("windows 11 pro")) return "windows11pro";

  return id;
}

function obtenerRutasCuentasCompatibles(productoId, itemProducto = {}) {
  const rutaBase = obtenerRutaCuentasPorProducto(productoId, itemProducto);
  const nombre = String(itemProducto.nombre || "").trim();
  const variantes = new Set();

  if (rutaBase) variantes.add(rutaBase);
  if (rutaBase) variantes.add(rutaBase.toLowerCase());
  if (rutaBase) variantes.add(rutaBase.toUpperCase());
  if (rutaBase) variantes.add(rutaBase.charAt(0).toUpperCase() + rutaBase.slice(1));

  if (productoId) variantes.add(String(productoId).trim());
  if (productoId) variantes.add(String(productoId).trim().toLowerCase());
  if (productoId) variantes.add(String(productoId).trim().charAt(0).toUpperCase() + String(productoId).trim().slice(1));

  if (nombre) variantes.add(nombre);

  const mapaEspecial = {
    netflix: ["Netflix"],
    disney: ["Disney"],
    prime: ["Prime"],
    hbo: ["HBO"],
    hboprime: ["hboprime", "HBOPrime", "HboPrime"],
    hboplatinium: ["HBOPlatinium", "hboplatinium", "HboPlatinium"],
    paramount: ["Paramount"],
    spotify: ["Spotify"],
    vix: ["Vix"],
    crunchyroll: ["Crunchyroll"],
    canva: ["Canva"],
    youtubepremium: ["YouTubePremium", "YoutubePremium", "youtubepremium"],
    chatgpt: ["ChatGPT", "chatgpt"],
    windows11pro: ["Windows11Pro", "windows11pro"]
  };

  if (mapaEspecial[rutaBase]) {
    mapaEspecial[rutaBase].forEach(v => variantes.add(v));
  }

  return Array.from(variantes).filter(Boolean);
}

function mostrarToastCompraExitosa(producto, total) {
  let toast = document.getElementById("toastCompraExitosa");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastCompraExitosa";
    toast.className = "toastCompraExitosa";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="toastCompraIcon">✅</div>
    <div class="toastCompraTexto">
      <strong>Compra realizada con éxito</strong>
      <span>${escaparHTML(producto)} - S/ ${Number(total || 0).toFixed(2)}</span>
    </div>
  `;

  toast.classList.remove("show");

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}
function convertirVentasANumero(data) {
  if (data == null) return 0;
  if (typeof data === "number") return data;

  if (typeof data === "object") {
    let total = 0;
    Object.keys(data).forEach((key) => {
      const item = data[key];
      if (typeof item === "number") total += Number(item || 0);
      else if (item && typeof item === "object") total += Number(item.cantidad || 1);
    });
    return total;
  }

  return 0;
}

/* =========================
LIMPIEZA DE LISTENERS
========================= */

function limpiarListenersSesion() {
  if (badgeComprasRef) {
    badgeComprasRef.off();
    badgeComprasRef = null;
  }

  if (usuarioPerfilRef) {
    usuarioPerfilRef.off();
    usuarioPerfilRef = null;
  }
}

function limpiarListenersPagina() {
  if (productosRef) {
    productosRef.off();
    productosRef = null;
  }

  if (comprasHoyRef) {
    comprasHoyRef.off();
    comprasHoyRef = null;
  }

  if (comprasLiveRef) {
    comprasLiveRef.off();
    comprasLiveRef = null;
  }

  if (cuentasRootRef) {
    cuentasRootRef.off();
    cuentasRootRef = null;
  }

  if (codigosRootRef) {
    codigosRootRef.off();
    codigosRootRef = null;
  }

  if (ventasRefs.length) {
    ventasRefs.forEach((item) => {
      try {
        item.ref.off("value", item.callback);
      } catch (e) {}
    });
    ventasRefs = [];
  }
}

function limpiarTodoListeners() {
  limpiarListenersSesion();
  limpiarListenersPagina();
}

function cerrarSesionPorBloqueo() {
  if (redireccionPorBloqueoEnCurso) return;
  redireccionPorBloqueoEnCurso = true;

  limpiarTemporizadoresInactividad();
  cancelarOfflinePendiente();
  limpiarTodoListeners();
  marcarOfflineSiExiste();
  limpiarReferenciaOnline();
  actualizarBadgeMisCompras(0);

  mostrarAvisoSistema("Cuenta bloqueada", "Tu cuenta ha sido bloqueada. Contacta con soporte.", "error");

  setTimeout(() => {
    auth.signOut()
      .then(() => window.location.href = "index.html")
      .catch(() => window.location.href = "index.html");
  }, 700);
}

/* =========================
BADGE MIS COMPRAS
========================= */

function inyectarEstilosBadgeMisCompras() {
  if (document.getElementById("estilosBadgeMisCompras")) return;

  const style = document.createElement("style");
  style.id = "estilosBadgeMisCompras";
  style.textContent = `
    .menuBadgeCompras{
      margin-left:auto;
      min-width:22px;
      height:22px;
      padding:0 7px;
      border-radius:999px;
      display:none;
      align-items:center;
      justify-content:center;
      background:linear-gradient(180deg,#ff3b3b,#d91111);
      color:#fff;
      font-size:12px;
      font-weight:800;
      box-shadow:0 6px 14px rgba(255,0,0,0.28);
      border:1px solid rgba(255,255,255,0.12);
      line-height:1;
    }

    .menuLateral a[data-menu="mis-compras"]{
      position:relative;
    }

    .menuLateral a.activo .menuBadgeCompras{
      background:linear-gradient(180deg,#ffffff,#e9e9e9);
      color:#111;
      box-shadow:none;
    }
  `;
  document.head.appendChild(style);
}

function insertarBadgeMisComprasSiNoExiste() {
  inyectarEstilosBadgeMisCompras();

  const link = document.querySelector('#menuLateral a[data-menu="mis-compras"]');
  if (!link) return null;

  let badge = document.getElementById("badgeMisCompras");
  if (badge) return badge;

  badge = document.createElement("span");
  badge.id = "badgeMisCompras";
  badge.className = "menuBadgeCompras";
  badge.textContent = "0";
  link.appendChild(badge);

  return badge;
}

function obtenerClaveComprasVistas(uid) {
  return "misComprasVistas_" + uid;
}

function obtenerComprasVistas(uid) {
  try {
    return JSON.parse(localStorage.getItem(obtenerClaveComprasVistas(uid)) || "[]");
  } catch {
    return [];
  }
}

function guardarComprasComoVistas(uid, ids) {
  if (!uid) return;
  localStorage.setItem(obtenerClaveComprasVistas(uid), JSON.stringify(ids || []));
  actualizarBadgeMisCompras(0);
}

function actualizarBadgeMisCompras(total) {
  const badge = insertarBadgeMisComprasSiNoExiste();
  if (!badge) return;

  const cantidad = Number(total || 0);

  if (cantidad > 0) {
    badge.style.display = "inline-flex";
    badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
  } else {
    badge.style.display = "none";
    badge.textContent = "0";
  }
}

function actualizarBadgeMisComprasDesdeIds(uid, idsActuales = []) {
  if (!uid) return;

  const vistas = obtenerComprasVistas(uid);
  const nuevas = idsActuales.filter((id) => !vistas.includes(id));

  if (obtenerPaginaActual() === "mis-compras.html") {
    actualizarBadgeMisCompras(0);
    return;
  }

  actualizarBadgeMisCompras(nuevas.length);
}

function escucharBadgeMisCompras(uid) {
  insertarBadgeMisComprasSiNoExiste();

  if (!uid) {
    actualizarBadgeMisCompras(0);
    return;
  }

  if (badgeComprasRef) {
    badgeComprasRef.off();
    badgeComprasRef = null;
  }

  badgeComprasRef = db.ref("ordenes/" + uid);

  badgeComprasRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const ids = Object.keys(data);

    if (obtenerPaginaActual() === "mis-compras.html") {
      guardarComprasComoVistas(uid, ids);
      return;
    }

    actualizarBadgeMisComprasDesdeIds(uid, ids);
  });
}

/* =========================
AUTH / SESION
========================= */

auth.onAuthStateChanged((user) => {
  usuarioActual = user || null;
  redireccionPorBloqueoEnCurso = false;

  const pagina = obtenerPaginaActual();
  const paginasProtegidas = [
    "tienda.html",
    "ofertas.html",
    "recargas.html",
    "como-comprar.html",
    "mis-compras.html",
    "admin.html",
    "streampro.html"
  ];

  if (!user) {
    limpiarTemporizadoresInactividad();
    cancelarOfflinePendiente();
    limpiarReferenciaOnline();
    limpiarTodoListeners();

    if (paginasProtegidas.includes(pagina)) {
      window.location.href = "index.html";
      return;
    }

    actualizarBadgeMisCompras(0);
    return;
  }

  registrarPresenciaUsuario(user);

  if (!paginasProtegidas.includes(pagina)) {
    limpiarListenersSesion();
    actualizarBadgeMisCompras(0);
    return;
  }

  limpiarListenersSesion();

  usuarioPerfilRef = db.ref("usuarios/" + user.uid);

  usuarioPerfilRef.on("value", (snap) => {
    const data = snap.val() || {};
    const estado = String(data.estado || "activo").toLowerCase();
    const rol = String(data.rol || "").toLowerCase();

    if (estado === "bloqueado") {
      cerrarSesionPorBloqueo();
      return;
    }

    if (rol === "proveedor" && pagina !== "streampro.html") {
      window.location.replace("streampro.html");
      return;
    }

    if (pagina === "admin.html" && rol !== "admin") {
      if (rol === "proveedor") {
        window.location.replace("streampro.html");
      } else {
        window.location.replace("tienda.html");
      }
      return;
    }

    if (pagina === "streampro.html" && rol !== "proveedor") {
      if (rol === "admin") {
        window.location.replace("admin.html");
      } else {
        window.location.replace("tienda.html");
      }
      return;
    }

    cargarPanelUsuario(user, data);
    escucharBadgeMisCompras(user.uid);
    iniciarControlInactividad();
  }, () => {
    cargarPanelUsuario(user, {});
    escucharBadgeMisCompras(user.uid);
    iniciarControlInactividad();
  });
});

function cargarPanelUsuario(user, dataPerfil = null) {
  if (!user) return;

  const nombreBox = document.getElementById("panelUsuarioNombre");
  const handleBox = document.getElementById("panelUsuarioHandle");
  const saldoBox = document.getElementById("panelUsuarioSaldo");

  const correoAuth = user.email || "";
  const usuarioCorreo = correoAuth ? correoAuth.split("@")[0] : "usuario";

  if (nombreBox) nombreBox.innerText = "Cargando...";
  if (handleBox) handleBox.innerText = "@" + usuarioCorreo;
  if (saldoBox) saldoBox.innerHTML = formatearSaldo(0);

  const aplicarDatos = (data = {}) => {
    const nombreCompleto =
      data.nombreCompleto ||
      [data.nombre, data.apellido].filter(Boolean).join(" ").trim() ||
      data.nombre ||
      user.displayName ||
      usuarioCorreo ||
      "Usuario";

    const usuario = data.usuario || usuarioCorreo || "usuario";
    const saldo = Number(data.saldo || 0);

    if (nombreBox) nombreBox.innerText = String(nombreCompleto).toUpperCase();
    if (handleBox) handleBox.innerText = "@" + String(usuario);
    if (saldoBox) saldoBox.innerHTML = formatearSaldo(saldo);
  };

  if (dataPerfil && typeof dataPerfil === "object") {
    aplicarDatos(dataPerfil);
    return;
  }

  db.ref("usuarios/" + user.uid).once("value")
    .then((snap) => aplicarDatos(snap.val() || {}))
    .catch(() => {
      if (nombreBox) nombreBox.innerText = "USUARIO";
      if (handleBox) handleBox.innerText = "@" + usuarioCorreo;
      if (saldoBox) saldoBox.innerHTML = formatearSaldo(0);
    });
}

function salir() {
  const toast = document.getElementById("toastGracias");
  if (toast) toast.classList.add("show");

  setTimeout(() => {
    limpiarTemporizadoresInactividad();
    cancelarOfflinePendiente();
    marcarOfflineSiExiste();
    limpiarReferenciaOnline();
    limpiarTodoListeners();

    auth.signOut()
      .then(() => window.location.href = "index.html")
      .catch(() => window.location.href = "index.html");
  }, 1200);
}

/* =========================
TERMINOS
========================= */

function abrirTerminos() {
  const modal = document.getElementById("modalTerminos");
  if (modal) {
    modal.style.display = "flex";
    actualizarEstadoUIOverlay();
  }
}

function cerrarTerminos() {
  const modal = document.getElementById("modalTerminos");
  if (modal) {
    modal.style.display = "none";
    actualizarEstadoUIOverlay();
  }
}

function aceptarTerminos() {
  const check = document.getElementById("terminos");
  const modal = document.getElementById("modalTerminos");

  if (check) {
    check.disabled = false;
    check.checked = true;
  }

  if (modal) {
    modal.style.display = "none";
  }

  actualizarEstadoUIOverlay();
}

/* =========================
PASSWORD
========================= */

function togglePassword(inputId = "password", btn = null) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    if (btn) btn.innerText = "🙈";
  } else {
    input.type = "password";
    if (btn) btn.innerText = "👁";
  }
}

/* =========================
COPIAR YAPE
========================= */

function copiarYape() {
  navigator.clipboard.writeText("917107386");

  const boton = document.getElementById("btnCopiar");
  if (!boton) return;

  boton.innerText = "✔ Copiado";

  setTimeout(() => {
    boton.innerText = "📋 Copiar número";
  }, 3000);
}

/* =========================
ABRIR YAPE
========================= */

function abrirYape() {
  const telefono = "917107386";
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (esMovil) {
    window.location.href = "yape://pay?phone=" + telefono;
  } else {
    mostrarAvisoSistema("Yape disponible en móvil", "Para abrir Yape debes usar un celular.", "info");
  }
}

/* =========================
CLIENTES HOY
========================= */

function escucharClientesHoy() {
  const span = document.getElementById("clientesHoy");
  if (!span) return;

  if (comprasHoyRef) comprasHoyRef.off();

  comprasHoyRef = db.ref("comprasHoy");
  comprasHoyRef.on("value", (snap) => {
    const data = snap.val();

    if (typeof data === "number") {
      span.innerText = data;
      return;
    }

    if (data && typeof data === "object") {
      span.innerText = Object.keys(data).length;
      return;
    }

    span.innerText = "0";
  }, () => {
    span.innerText = "0";
  });
}

/* =========================
VENTAS POR PRODUCTO
========================= */

const productosVentas = {
  netflix: "ventasNetflix",
  disney: "ventasDisney",
  prime: "ventasPrime",
  hbo: "ventasHBO",
  paramount: "ventasParamount",
  spotify: "ventasSpotify",
  crunchyroll: "ventasCrunchyroll",
  canva: "ventasCanva",
  hboplatinium: "ventasHBOPlatinium",
  youtubepremium: "ventasYouTubePremium",
  windows11pro: "ventasWindows11Pro"
};

function escucharVentasProductos() {
  if (ventasRefs.length) {
    ventasRefs.forEach((item) => {
      try {
        item.ref.off("value", item.callback);
      } catch (e) {}
    });
    ventasRefs = [];
  }

  Object.keys(productosVentas).forEach((prod) => {
    const spanId = productosVentas[prod];
    const span = document.getElementById(spanId);
    if (!span) return;

    const ref = db.ref("ventas/" + prod);
    const callback = (snap) => {
      span.innerText = convertirVentasANumero(snap.val());
    };

    ref.on("value", callback, () => {
      span.innerText = "0";
    });

    ventasRefs.push({ ref, callback });
  });
}/* =========================
NOTIFICACION COMPRA
========================= */

function escucharNotificacionCompra() {
  const box = document.getElementById("notificacionCompra");
  const texto = document.getElementById("textoCompra");

  if (!box || !texto) return;

  if (comprasLiveRef) comprasLiveRef.off();

  comprasLiveRef = db.ref("comprasLive").limitToLast(1);
  comprasLiveRef.on("child_added", (snap) => {
    const data = snap.val();
    if (!data) return;

    const productoMostrar = String(data.producto || "").replace(/ x\d+$/i, "");
    texto.innerText = `${data.nombre || "Cliente"} compró ${productoMostrar}`;

    box.style.display = "block";
    box.classList.add("show");

    setTimeout(() => {
      box.classList.remove("show");
      box.style.display = "none";
    }, 5000);
  }, () => {});
}

/* =========================
FILTROS TIENDA
========================= */

function obtenerTextoResultadoFiltros(totalMostrados, totalGeneral) {
  const partes = [];

  if (filtroCategoria === "todos") partes.push("categoría: todas");
  else partes.push("categoría: " + filtroCategoria);

  if (filtroBusqueda) partes.push('búsqueda: "' + filtroBusqueda + '"');

  return `Mostrando ${totalMostrados} de ${totalGeneral} productos (${partes.join(" | ")})`;
}

function actualizarTextoResultadoFiltros(totalMostrados, totalGeneral) {
  const box = document.getElementById("resultadoFiltroInfo");
  if (!box) return;

  if (!filtroBusqueda && filtroCategoria === "todos") {
    box.innerText = "Mostrando todos los productos";
    return;
  }

  box.innerText = obtenerTextoResultadoFiltros(totalMostrados, totalGeneral);
}

function configurarFiltrosTienda() {
  const input = document.getElementById("buscadorProductos");
  const btnLimpiar = document.getElementById("btnLimpiarBusqueda");
  const botonesCategoria = document.querySelectorAll(".categoriaBtn");

  if (input) {
    input.addEventListener("input", function () {
      filtroBusqueda = this.value || "";
      renderizarProductosTienda(productosTiendaCache);
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", function () {
      filtroBusqueda = "";
      filtroCategoria = "todos";

      if (input) input.value = "";

      document.querySelectorAll(".categoriaBtn").forEach((btn) => {
        btn.classList.remove("activo");
        if (btn.dataset.categoria === "todos") btn.classList.add("activo");
      });

      renderizarProductosTienda(productosTiendaCache);
    });
  }

  if (botonesCategoria.length) {
    botonesCategoria.forEach((btn) => {
      btn.addEventListener("click", function () {
        filtroCategoria = this.dataset.categoria || "todos";

        botonesCategoria.forEach((b) => b.classList.remove("activo"));
        this.classList.add("activo");

        renderizarProductosTienda(productosTiendaCache);
      });
    });
  }
}

/* =========================
PRODUCTOS DINAMICOS TIENDA
========================= */

function renderizarProductosTienda(data) {
  const contenedor = document.getElementById("contenedorProductos");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!data || typeof data !== "object") {
    contenedor.innerHTML = '<div class="cargandoProductos">No hay productos disponibles.</div>';
    actualizarTextoResultadoFiltros(0, 0);
    return;
  }

  const idsActivos = Object.keys(data).filter((id) => {
    const item = data[id] || {};
    return item.activo !== false;
  });

  if (idsActivos.length === 0) {
    contenedor.innerHTML = '<div class="cargandoProductos">No hay productos activos disponibles.</div>';
    actualizarTextoResultadoFiltros(0, 0);
    return;
  }

  idsActivos.sort((a, b) => {
    const nombreA = String((data[a] || {}).nombre || a).toLowerCase();
    const nombreB = String((data[b] || {}).nombre || b).toLowerCase();
    return nombreA.localeCompare(nombreB);
  });

  const idsFiltrados = idsActivos.filter((id) => {
    return productoCoincideBusquedaYCategoria(id, data[id] || {});
  });

  actualizarTextoResultadoFiltros(idsFiltrados.length, idsActivos.length);

  if (idsFiltrados.length === 0) {
    contenedor.innerHTML = `
      <div class="sinResultadosBusqueda">
        <strong>No se encontraron productos</strong>
        <span>Prueba buscando otro nombre o cambiando la categoría seleccionada.</span>
      </div>
    `;
    return;
  }

  idsFiltrados.forEach((id) => {
    const item = data[id] || {};
    const nombre = item.nombre || id;
    const precio = Number(item.precio || 0);
    const proveedorNombre = item.proveedorNombre || "Josking";
    const imagen = obtenerImagenProducto(item, id);
    const duracionTexto = obtenerDuracionTexto(item);
    const stockReal = obtenerStockRealProducto(id, item);
    const stockIlimitado = stockReal === "Ilimitado";
    const agotado = !stockIlimitado && Number(stockReal || 0) <= 0;
    const textoStock = stockIlimitado ? "Ilimitado" : String(stockReal);

    const html = `
      <div class="producto" id="producto_${escaparHTML(id)}">
        <img src="${escaparHTML(imagen)}" alt="${escaparHTML(nombre)}">
        <h2>${escaparHTML(nombre)}</h2>
        <div class="productoProveedor">
          <span class="productoProveedorTop">Proveedor</span>
          <span class="productoProveedorNombre">🛡 ${escaparHTML(proveedorNombre)}</span>
        </div>
        <p class="precio">${escaparHTML(formatearPrecioProducto(precio))}</p>
        <p class="stock">Stock: <span id="stock_${escaparHTML(id)}">${escaparHTML(textoStock)}</span></p>
        <p class="duracionServicio">${escaparHTML(duracionTexto)}</p>
        <button
          class="btnComprar"
          ${agotado ? "disabled" : ""}
          onclick="abrirProductoPorId('${String(id).replace(/'/g, "\\'")}')">
          ${agotado ? "AGOTADO" : "🛒Agregar al carrito"}
        </button>
      </div>
    `;

    contenedor.insertAdjacentHTML("beforeend", html);
  });

  document.querySelectorAll(".producto").forEach((producto) => {
    producto.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;

      const boton = this.querySelector("button");
      if (boton && !boton.disabled) boton.click();
    });
  });
}

function cargarProductosTienda() {
  const contenedor = document.getElementById("contenedorProductos");
  if (!contenedor) return;

  if (productosRef) productosRef.off();

  productosRef = db.ref("productos");
  productosRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};
    productosTiendaCache = data;
    renderizarProductosTienda(productosTiendaCache);
  }, () => {
    contenedor.innerHTML = '<div class="cargandoProductos">No se pudieron cargar los productos.</div>';
  });
}

function abrirProductoPorId(productoId) {
  const item = productosTiendaCache[productoId];
  if (!item) {
    mostrarAvisoSistema("Producto no encontrado", "No se encontró el producto seleccionado.", "error");
    return;
  }

  if (item.activo === false) {
    mostrarAvisoSistema("Producto no disponible", "Este producto no está disponible.", "warn");
    return;
  }

  const nombre = item.nombre || productoId;
  const precio = Number(item.precio || 0);
  const productoBaseNormalizado = normalizarProductoBase(nombre);
  const descripcion = item.descripcion || obtenerDescripcionProductoFallback(productoBaseNormalizado);
  const imagen = obtenerImagenProducto(item, productoId);
  const stockReal = obtenerStockRealProducto(productoId, item);
  const proveedorNombre = item.proveedorNombre || "Josking";
  const stockIlimitado = stockReal === "Ilimitado";

  if (!stockIlimitado && Number(stockReal || 0) <= 0) {
    mostrarAvisoSistema("Producto agotado", "Este producto no tiene stock disponible en este momento.", "warn");
    return;
  }

  productoSeleccionadoId = productoId;
  productoSeleccionadoData = item;
  productoActual = nombre;
  precioBase = precio;
  cantidadProducto = 1;
  stockDisponible = stockIlimitado ? 999999 : Number(stockReal || 0);
  productoBaseActual = productoBaseNormalizado;

  const modal = document.getElementById("modalCompra");
  const modalNombre = document.getElementById("modalNombre");
  const modalProveedor = document.getElementById("modalProveedor");
  const modalDescripcion = document.getElementById("modalDescripcion");
  const modalImagen = document.getElementById("modalImagen");
  const cantidadEl = document.getElementById("cantidadProducto");
  const totalEl = document.getElementById("precioTotal");
  const lista = document.getElementById("listaReglas");

  if (modalNombre) modalNombre.innerText = nombre;

  if (modalProveedor) {
    modalProveedor.innerHTML = `
      <span class="proveedorLabel">Vendido por</span>
      <span class="proveedorNombreWrap">
        <span class="proveedorIcono">🛡</span>
        <span class="proveedorNombreTexto">${escaparHTML(proveedorNombre)}</span>
      </span>
      <span class="proveedorEstado">Proveedor activo</span>
    `;
  }

  if (modalDescripcion) modalDescripcion.innerText = descripcion;
  if (modalImagen) modalImagen.src = imagen;
  if (cantidadEl) cantidadEl.innerText = "1";
  if (totalEl) totalEl.innerText = precio.toFixed(2);
  if (lista) lista.innerHTML = obtenerReglasProducto(productoBaseNormalizado);

  actualizarVisualModalSegunTipoEntrega(item);

  if (modal) {
    modal.style.display = "flex";
    actualizarEstadoUIOverlay();
  }
}

/* =========================
MODAL PRODUCTO
========================= */

function agregarCarrito(nombre) {
  const productoEncontradoId = Object.keys(productosTiendaCache).find((id) => {
    const item = productosTiendaCache[id] || {};
    return String(item.nombre || "").trim().toLowerCase() === String(nombre || "").trim().toLowerCase();
  });

  if (!productoEncontradoId) {
    mostrarAvisoSistema("Producto no encontrado", "No se encontró el producto solicitado.", "error");
    return;
  }

  abrirProductoPorId(productoEncontradoId);
}

function cerrarModal() {
  const modal = document.getElementById("modalCompra");
  if (modal) {
    modal.style.display = "none";
    actualizarEstadoUIOverlay();
  }
}

function cambiarCantidad(valor) {
  const item = productoSeleccionadoData || {};
  const stockIlimitado = esProductoStockIlimitado(productoSeleccionadoId, item);

  if (stockIlimitado) {
    cantidadProducto = 1;
    actualizarVisualCantidadYTotal();
    return;
  }

  let nuevaCantidad = cantidadProducto + valor;

  if (nuevaCantidad < 1) nuevaCantidad = 1;

  if (nuevaCantidad > stockDisponible) {
    cantidadProducto = Math.max(1, stockDisponible);
    actualizarVisualCantidadYTotal();
    mostrarAvisoStockPremium(stockDisponible);
    return;
  }

  cantidadProducto = nuevaCantidad;
  actualizarVisualCantidadYTotal();
}

/* =========================
CUENTAS / CODIGOS / ORDENES
========================= */

async function obtenerPerfilUsuario(uid) {
  const snap = await db.ref("usuarios/" + uid).once("value");
  return snap.val() || {};
}

function obtenerNombreComprador(user, perfil = {}) {
  return (
    perfil.nombreCompleto ||
    [perfil.nombre, perfil.apellido].filter(Boolean).join(" ").trim() ||
    perfil.nombre ||
    user?.displayName ||
    perfil.usuario ||
    obtenerNombreSimpleDesdeCorreo(user?.email) ||
    "Cliente"
  );
}

function obtenerCuentaValor(data = {}) {
  return data.cuenta || data.correo || data.email || data.usuario || data.codigo || "";
}

function obtenerClaveValor(data = {}) {
  return data.clave || data.password || data.contrasena || data.contraseña || "";
}

function obtenerPerfilValor(data = {}) {
  return data.perfil || "";
}

function obtenerPinValor(data = {}) {
  return data.pin || "";
}

function obtenerObservacionValor(data = {}) {
  return data.observacion || "";
}

function recolectarCuentasDesdeNodo(nodoActual, rutaProducto, cantidadNecesaria, acumulado = [], rutaRelativa = "") {
  if (!nodoActual || typeof nodoActual !== "object") return acumulado;
  if (acumulado.length >= cantidadNecesaria) return acumulado;

  if (esNodoCuentaDirecta(nodoActual)) {
    if (cuentaEstaDisponible(nodoActual)) {
      const keyFinal = rutaRelativa.split("/").filter(Boolean).pop() || "";

      acumulado.push({
        tipo: "cuenta",
        key: keyFinal,
        ruta: rutaProducto,
        nodePath: rutaRelativa,
        cuenta: obtenerCuentaValor(nodoActual),
        clave: obtenerClaveValor(nodoActual),
        perfil: obtenerPerfilValor(nodoActual),
        pin: obtenerPinValor(nodoActual),
        observacion: obtenerObservacionValor(nodoActual),
        raw: nodoActual
      });
    }

    return acumulado;
  }

  Object.keys(nodoActual).forEach((subKey) => {
    if (acumulado.length >= cantidadNecesaria) return;

    const subNodo = nodoActual[subKey];
    const nuevaRuta = rutaRelativa ? `${rutaRelativa}/${subKey}` : subKey;

    if (subNodo && typeof subNodo === "object") {
      recolectarCuentasDesdeNodo(subNodo, rutaProducto, cantidadNecesaria, acumulado, nuevaRuta);
    }
  });

  return acumulado;
}

async function obtenerCuentasDisponibles(productoId, itemProducto, cantidadNecesaria) {
  const rutasCompatibles = obtenerRutasCuentasCompatibles(productoId, itemProducto);
  const cuentasEncontradas = [];
  const rutasYaProcesadas = new Set();

  for (const ruta of rutasCompatibles) {
    if (!ruta || rutasYaProcesadas.has(ruta)) continue;
    rutasYaProcesadas.add(ruta);

    try {
      const snap = await db.ref("cuentas/" + ruta).once("value");
      const data = snap.val();

      if (!data || typeof data !== "object") continue;

      const cuentasRuta = recolectarCuentasDesdeNodo(data, ruta, cantidadNecesaria, [], "");

      for (const cuenta of cuentasRuta) {
        const claveUnica = `${cuenta.ruta}::${cuenta.nodePath || cuenta.key}`;
        const yaExiste = cuentasEncontradas.some(
          (c) => `${c.ruta}::${c.nodePath || c.key}` === claveUnica
        );

        if (!yaExiste) {
          cuentasEncontradas.push(cuenta);
        }

        if (cuentasEncontradas.length >= cantidadNecesaria) {
          return cuentasEncontradas.slice(0, cantidadNecesaria);
        }
      }
    } catch (error) {
      console.error("Error leyendo cuentas en ruta:", ruta, error);
    }
  }

  return cuentasEncontradas.slice(0, cantidadNecesaria);
}

async function obtenerCodigosDisponibles(productoId, cantidadNecesaria) {
  const productoNormalizado = String(productoId || "").trim().toLowerCase();
  const snap = await db.ref("codigos").once("value");
  const data = snap.val() || {};
  const codigos = [];

  Object.keys(data).forEach((key) => {
    const item = data[key] || {};
    const productoCodigo = String(item.producto || item.productoId || item.productoNombre || "").trim().toLowerCase();

    if (
      productoCodigo !== productoNormalizado &&
      String(item.productoId || "").trim().toLowerCase() !== productoNormalizado
    ) return;

    if (!codigoEstaDisponible(item)) return;
    if (codigos.length >= cantidadNecesaria) return;

    codigos.push({
      tipo: "codigo",
      key,
      ruta: "codigos",
      cuenta: String(item.codigo || ""),
      clave: "",
      perfil: "",
      pin: "",
      observacion: String(item.observacion || ""),
      raw: item
    });
  });

  return codigos;
}

function descontarSaldoUsuario(uid, monto) {
  return new Promise((resolve, reject) => {
    const ref = db.ref("usuarios/" + uid + "/saldo");

    ref.transaction((saldoActual) => {
      const saldo = Number(saldoActual || 0);
      if (saldo < monto) return;
      return Number((saldo - monto).toFixed(2));
    }, (error, committed, snapshot) => {
      if (error) {
        reject(error);
        return;
      }

      if (!committed) {
        reject(new Error("SALDO_INSUFICIENTE"));
        return;
      }

      resolve(Number(snapshot.val() || 0));
    });
  });
}

function devolverSaldoUsuario(uid, monto) {
  return new Promise((resolve, reject) => {
    db.ref("usuarios/" + uid + "/saldo").transaction((saldoActual) => {
      const saldo = Number(saldoActual || 0);
      return Number((saldo + monto).toFixed(2));
    }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function sincronizarStockProductoConInventario(productoId, itemProducto = null) {
  const item = itemProducto || productosTiendaCache[productoId] || {};
  if (!productoId || esProductoStockIlimitado(productoId, item)) return;

  const stockReal = Number(obtenerStockRealProducto(productoId, item) || 0);
  try {
    await db.ref("productos/" + productoId + "/stock").set(stockReal);
    if (productosTiendaCache[productoId]) {
      productosTiendaCache[productoId].stock = stockReal;
    }
  } catch (e) {
    console.error("No se pudo sincronizar stock del producto:", productoId, e);
  }
}

function acreditarSaldoProveedor(uidProveedor, monto) {
  return new Promise((resolve, reject) => {
    if (!uidProveedor || Number(monto || 0) <= 0) {
      resolve({ ok: false, motivo: "SIN_PROVEEDOR_O_MONTO" });
      return;
    }

    db.ref("usuarios/" + uidProveedor + "/saldo").transaction((saldoActual) => {
      const saldo = Number(saldoActual || 0);
      return Number((saldo + Number(monto || 0)).toFixed(2));
    }, (error, committed, snapshot) => {
      if (error) {
        reject(error);
        return;
      }

      if (!committed) {
        reject(new Error("NO_SE_PUDO_ACREDITAR_PROVEEDOR"));
        return;
      }

      resolve({
        ok: true,
        saldo: Number(snapshot.val() || 0)
      });
    });
  });
}

function revertirSaldoProveedor(uidProveedor, monto) {
  return new Promise((resolve, reject) => {
    if (!uidProveedor || Number(monto || 0) <= 0) {
      resolve();
      return;
    }

    db.ref("usuarios/" + uidProveedor + "/saldo").transaction((saldoActual) => {
      const saldo = Number(saldoActual || 0);
      const nuevoSaldo = saldo - Number(monto || 0);
      return Number((nuevoSaldo < 0 ? 0 : nuevoSaldo).toFixed(2));
    }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function registrarMovimientoProveedor({
  proveedorId = "",
  productoId = "",
  productoNombre = "",
  compradorNombre = "",
  monto = 0,
  ventaId = ""
} = {}) {
  if (!proveedorId || Number(monto || 0) <= 0) return "";

  const ref = db.ref("movimientosSaldo").push();

  await ref.set({
    proveedorId: proveedorId,
    tipo: "venta",
    detalle: `Venta de ${productoNombre || productoId || "producto"} a ${compradorNombre || "cliente"}`,
    monto: Number(Number(monto || 0).toFixed(2)),
    signo: "+",
    productoId: productoId || "",
    productoNombre: productoNombre || "",
    compradorNombre: compradorNombre || "",
    ventaId: ventaId || "",
    fecha: Date.now()
  });

  return ref.key;
}

async function eliminarMovimientoProveedor(movimientoId) {
  if (!movimientoId) return;
  await db.ref("movimientosSaldo/" + movimientoId).remove();
}

async function marcarItemsVendidos(items, user, nombreComprador, ordenIdsAsignados = []) {
  const updates = {};
  const fechaEntrega = formatearFechaEntregaLocal();

  items.forEach((itemObj, index) => {
    const ordenIdAsignado = ordenIdsAsignados[index] || "";

    if (itemObj.tipo === "descarga") return;

    if (itemObj.tipo === "codigo") {
      const base = `codigos/${itemObj.key}`;
      updates[`${base}/usado`] = true;
      updates[`${base}/activo`] = false;
      updates[`${base}/uidUsuario`] = user.uid;
      updates[`${base}/comprador`] = nombreComprador;
      updates[`${base}/fechaUso`] = Date.now();
      return;
    }

    const rutaInterna = itemObj.nodePath || itemObj.key;
    const base = `cuentas/${itemObj.ruta}/${rutaInterna}`;

    updates[`${base}/estado`] = "usada";
    updates[`${base}/uidUsuario`] = user.uid;
    updates[`${base}/comprador`] = nombreComprador;
    updates[`${base}/fechaEntrega`] = fechaEntrega;
    updates[`${base}/vendida`] = true;
    updates[`${base}/vendido`] = true;
    updates[`${base}/usada`] = true;
    updates[`${base}/disponible`] = false;
    updates[`${base}/uidComprador`] = user.uid;
    updates[`${base}/compradorNombre`] = nombreComprador;
    updates[`${base}/fechaVenta`] = Date.now();
    updates[`${base}/ordenId`] = ordenIdAsignado;
  });

  if (Object.keys(updates).length === 0) return;
  return db.ref().update(updates);
}

async function revertirItemsVendidos(items) {
  if (!Array.isArray(items) || !items.length) return;

  const updates = {};

  items.forEach((itemObj) => {
    if (itemObj.tipo === "descarga") return;

    if (itemObj.tipo === "codigo") {
      const base = `codigos/${itemObj.key}`;
      updates[`${base}/usado`] = false;
      updates[`${base}/activo`] = true;
      updates[`${base}/uidUsuario`] = "";
      updates[`${base}/comprador`] = "";
      updates[`${base}/fechaUso`] = "";
      return;
    }

    const rutaInterna = itemObj.nodePath || itemObj.key;
    const base = `cuentas/${itemObj.ruta}/${rutaInterna}`;

    updates[`${base}/estado`] = "disponible";
    updates[`${base}/uidUsuario`] = null;
    updates[`${base}/comprador`] = null;
    updates[`${base}/fechaEntrega`] = null;
    updates[`${base}/vendida`] = false;
    updates[`${base}/vendido`] = false;
    updates[`${base}/usada`] = false;
    updates[`${base}/disponible`] = true;
    updates[`${base}/uidComprador`] = null;
    updates[`${base}/compradorNombre`] = null;
    updates[`${base}/fechaVenta`] = null;
    updates[`${base}/ordenId`] = null;
  });

  return db.ref().update(updates);
}

function obtenerDuracionTextoOrden(itemProducto, tipoEntrega) {
  const nombre = String(itemProducto?.nombre || "").toLowerCase().trim();
  const tipo = String(tipoEntrega || itemProducto?.tipoEntrega || "").toLowerCase().trim();
  const dias = Number(itemProducto?.duracionDias || 0);
  const esPermanente = dias >= 3650 || dias === 3065 || nombre.includes("permanente");

  if (tipo === "descarga" || tipo === "plugin" || tipo === "daw") {
    if (esPermanente) return "Instalación: Permanente";
    return "Instalación: " + dias + " días";
  }

  if (tipo === "codigo") {
    if (esPermanente) return "Activación: Permanente";
    return "Activación: " + dias + " días";
  }

  if (esPermanente) return "Duración: Permanente";
  return obtenerDuracionTexto(itemProducto);
}

function obtenerFechaExpiraOrden(itemProducto, tipoEntrega, ahora) {
  const nombre = String(itemProducto?.nombre || "").toLowerCase().trim();
  const tipo = String(tipoEntrega || itemProducto?.tipoEntrega || "").toLowerCase().trim();
  const dias = Number(itemProducto?.duracionDias || 30);
  const esPermanente = dias >= 3650 || dias === 3065 || nombre.includes("permanente");

  if (tipo === "codigo") return "";
  if ((tipo === "descarga" || tipo === "plugin" || tipo === "daw") && esPermanente) return "";
  if (esPermanente) return "";

  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
}

function obtenerPlataformaDescargaSeleccionada() {
  const select = document.getElementById("selectorPlataformaPlugin");
  if (!select) return "windows";

  const valor = String(select.value || "windows").toLowerCase().trim();
  if (valor === "mac") return "mac";
  if (valor === "general") return "general";
  return "windows";
}

function obtenerLinkDescargaSegunPlataforma(itemProducto = {}, plataforma = "windows") {
  const opciones = itemProducto.opcionesEntrega || {};
  const plataformaFinal = ["windows", "mac", "general"].includes(plataforma) ? plataforma : "windows";

  const linkDirecto = String(opciones?.[plataformaFinal]?.link || "").trim();
  if (linkDirecto) return linkDirecto;

  const linkGeneral = String(opciones?.general?.link || "").trim();
  if (linkGeneral) return linkGeneral;

  const linkBase = String(itemProducto.linkDescarga || "").trim();
  return linkBase;
}

async function guardarOrdenesUsuario(itemProducto, itemsAsignados, nombreComprador) {
  const uid = usuarioActual && usuarioActual.uid ? usuarioActual.uid : "";
  if (!uid || !itemsAsignados.length) return [];

  const ahora = new Date();
  const precioUnitario = Number(itemProducto.precio || precioBase || 0);
  const ordenesGeneradas = [];

  for (const itemObj of itemsAsignados) {
    const nuevaOrdenRef = db.ref("ordenes/" + uid).push();

    const esDescarga = itemObj.tipo === "descarga";
    const tipoEntrega = esDescarga
      ? (itemObj.subtipoEntrega || "descarga")
      : (itemObj.tipo === "codigo" ? "codigo" : "cuenta");

    const esCodigo = tipoEntrega === "codigo";
    const esLicencia = esCodigo || esProductoLicencia(productoSeleccionadoId, itemProducto);

    const fechaExpira = obtenerFechaExpiraOrden(itemProducto, tipoEntrega, ahora);
    const duracionTexto = obtenerDuracionTextoOrden(itemProducto, tipoEntrega);

    await nuevaOrdenRef.set({
      servicio: itemProducto.nombre || productoActual || "",
      producto: productoSeleccionadoId || "",
      cuenta: itemObj.cuenta || "",
      clave: itemObj.clave || "",
      perfil: itemObj.perfil || "",
      pin: itemObj.pin || "",
      observacion: itemObj.observacion || "",
      nombreCliente: "",
      comprador: nombreComprador || "",
      precio: Number(precioUnitario.toFixed(2)),
      fechaCompra: ahora.toISOString(),
      fechaExpira: fechaExpira,
      fechaExpiraTexto: (!fechaExpira && duracionTexto.includes("Permanente")) ? "Permanente" : "",
      estado: "activa",
      uid: uid,
      soporteNumero: numero,
      tipoEntrega: tipoEntrega,
      esCodigo: esCodigo,
      esLicencia: esLicencia,
      entregaVisual: esDescarga ? "descarga" : (esCodigo ? "codigo" : "cuenta"),
      duracionTexto: duracionTexto,
      linkEntrega: itemObj.linkEntrega || "",
      plataformaElegida: itemObj.plataformaElegida || ""
    });

    ordenesGeneradas.push({
      ordenId: nuevaOrdenRef.key,
      item: itemObj
    });
  }

  return ordenesGeneradas;
}

async function registrarCompraFinal(itemsAsignados, nombreComprador, ordenesGeneradas = []) {
  const item = productoSeleccionadoData || {};
  const productoId = productoSeleccionadoId;
  const reparto = calcularRepartoVenta(precioBase, cantidadProducto, item);

  const compraHoyRef = db.ref("comprasHoy").push();
  await compraHoyRef.set({
    producto: item.nombre || productoActual,
    cliente: nombreComprador,
    operacion: "compra",
    monto: reparto.total,
    fecha: Date.now(),
    estado: "entregada"
  });

  const ventaRef = db.ref("ventas/" + productoId).push();
  await ventaRef.set({
    productoId: productoId,
    producto: item.nombre || productoActual,
    productoNombre: item.nombre || productoActual,
    proveedorId: item.proveedorId || "",
    proveedorNombre: item.proveedorNombre || "Josking",
    porcentajeProveedor: reparto.porcentajeProveedor,
    porcentajePlataforma: reparto.porcentajePlataforma,
    montoProveedor: reparto.montoProveedor,
    montoPlataforma: reparto.montoPlataforma,
    montoTotal: reparto.total,
    precio: Number(precioBase || 0),
    cantidad: cantidadProducto,
    nombre: nombreComprador,
    uidUsuario: usuarioActual?.uid || "",
    fecha: Date.now(),
    estado: "entregada",
    comisionProveedorPendiente: false
  });

  const compraLiveRef = db.ref("comprasLive").push();
  await compraLiveRef.set({
    nombre: nombreComprador,
    producto: item.nombre || productoActual,
    time: Date.now()
  });

  return {
    ordenesGeneradas,
    ventaId: ventaRef.key,
    compraLiveId: compraLiveRef.key,
    compraHoyId: compraHoyRef.key,
    proveedorId: item.proveedorId || "",
    montoProveedor: reparto.montoProveedor || 0,
    productoId: productoId,
    productoNombre: item.nombre || productoActual,
    reparto
  };
}

async function procesarComisionProveedorSilenciosa(resultadoRegistro, nombreComprador) {
  try {
    if (!resultadoRegistro) {
      return { ok: false, motivo: "SIN_RESULTADO_REGISTRO" };
    }

    const proveedorId = String(resultadoRegistro.proveedorId || "").trim();
    const montoProveedor = Number(resultadoRegistro.montoProveedor || 0);
    const ventaId = String(resultadoRegistro.ventaId || "").trim();
    const productoId = String(resultadoRegistro.productoId || "").trim();
    const productoNombre = String(resultadoRegistro.productoNombre || "").trim();

    if (!proveedorId || montoProveedor <= 0) {
      return { ok: true, omitido: true };
    }

    await acreditarSaldoProveedor(proveedorId, montoProveedor);

    let movimientoId = "";
    try {
      movimientoId = await registrarMovimientoProveedor({
        proveedorId,
        productoId,
        productoNombre,
        compradorNombre: nombreComprador || "",
        monto: montoProveedor,
        ventaId
      });
    } catch (movError) {
      console.warn("No se pudo registrar movimiento del proveedor:", movError);
    }

    try {
      if (productoId && ventaId) {
        await db.ref("ventas/" + productoId + "/" + ventaId).update({
          comisionProveedorPendiente: false,
          comisionProveedorProcesada: true,
          fechaComisionProveedor: Date.now(),
          movimientoProveedorId: movimientoId || ""
        });
      }
    } catch (e) {
      console.warn("No se pudo actualizar bandera de comisión procesada:", e);
    }

    return {
      ok: true,
      movimientoId: movimientoId || ""
    };
  } catch (error) {
    console.warn("Comisión proveedor pendiente:", error);

    try {
      const productoId = String(resultadoRegistro?.productoId || "").trim();
      const ventaId = String(resultadoRegistro?.ventaId || "").trim();

      if (productoId && ventaId) {
        await db.ref("ventas/" + productoId + "/" + ventaId).update({
          comisionProveedorPendiente: true,
          comisionProveedorProcesada: false,
          errorComisionProveedor: String(error?.message || error || "ERROR_COMISION")
        });
      }
    } catch (markError) {
      console.warn("No se pudo marcar comisión pendiente:", markError);
    }

    return {
      ok: false,
      motivo: String(error?.message || error || "ERROR_COMISION")
    };
  }
}

/* =========================
COMPRAR
========================= */

async function comprarAhora() {
  if (compraEnProceso) return;
  compraEnProceso = true;

  let saldoDescontado = false;
  let itemsMarcados = false;
  let itemsDisponibles = [];
  let uid = "";
  let totalCompra = 0;

  let ventaRegistradaId = "";
  let compraLiveRegistradaId = "";
  let compraHoyRegistradaId = "";

  try {
    if (!usuarioActual) {
      mostrarAvisoSistema("Acceso requerido", "Debes iniciar sesión para comprar.", "info");
      return;
    }

    if (!productoSeleccionadoData || !productoSeleccionadoId) {
      mostrarAvisoSistema("Producto no válido", "Selecciona un producto válido.", "error");
      return;
    }

    const item = productoSeleccionadoData || {};
    const productoEsDescarga = esProductoDescarga(productoSeleccionadoId, item);
    const productoEsLicencia = esProductoLicencia(productoSeleccionadoId, item);
    const productoEsCodigo = esProductoCodigo(productoSeleccionadoId, item);
    const stockRealActual = obtenerStockRealProducto(productoSeleccionadoId, item);

    if (!productoEsDescarga) {
      stockDisponible = Number(stockRealActual || 0);

      if (cantidadProducto < 1) {
        mostrarAvisoSistema("Cantidad inválida", "La cantidad seleccionada no es válida.", "warn");
        return;
      }

      if (cantidadProducto > stockDisponible) {
        cantidadProducto = Math.max(1, stockDisponible);
        actualizarVisualCantidadYTotal();
        mostrarAvisoStockPremium(stockDisponible);
        return;
      }

      if (stockDisponible <= 0) {
        mostrarAvisoSistema("Producto agotado", "Este producto ya no tiene stock disponible.", "warn");
        return;
      }
    } else {
      cantidadProducto = 1;
      actualizarVisualCantidadYTotal();
    }

    uid = usuarioActual.uid;
    totalCompra = Number((Number(precioBase || 0) * Number(cantidadProducto || 1)).toFixed(2));

    const perfil = await obtenerPerfilUsuario(uid);
    const estadoUsuario = String(perfil.estado || "activo").toLowerCase();

    if (estadoUsuario === "bloqueado") {
      cerrarSesionPorBloqueo();
      return;
    }

    const nombreComprador = obtenerNombreComprador(usuarioActual, perfil);
    const saldoActual = Number(perfil.saldo || 0);

    if (saldoActual < totalCompra) {
      mostrarAvisoSistema("Saldo insuficiente", "Tu saldo no alcanza para completar esta compra.", "warn");
      return;
    }

    if (productoEsDescarga) {
      const plataformaElegida = obtenerPlataformaDescargaSeleccionada();
      const linkEntrega = obtenerLinkDescargaSegunPlataforma(item, plataformaElegida);
      const subtipoEntrega = String(item.tipoEntrega || "descarga").toLowerCase().trim();

      if (!linkEntrega) {
        mostrarAvisoSistema(
          "Descarga incompleta",
          "Este producto no tiene configurado el link de descarga para la plataforma seleccionada.",
          "error"
        );
        return;
      }

      itemsDisponibles = [{
        tipo: "descarga",
        subtipoEntrega: subtipoEntrega,
        key: "descarga_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        ruta: "descarga",
        cuenta: linkEntrega,
        clave: "",
        perfil: "",
        pin: "",
        observacion: "Descarga para " + (
          plataformaElegida === "mac"
            ? "Mac"
            : plataformaElegida === "general"
              ? "General"
              : "Windows"
        ),
        plataformaElegida: plataformaElegida,
        linkEntrega: linkEntrega,
        raw: item
      }];
    } else if (productoEsLicencia || productoEsCodigo) {
      itemsDisponibles = await obtenerCodigosDisponibles(productoSeleccionadoId, cantidadProducto);
    } else {
      itemsDisponibles = await obtenerCuentasDisponibles(productoSeleccionadoId, item, cantidadProducto);
    }

    if (itemsDisponibles.length < cantidadProducto) {
      await sincronizarStockProductoConInventario(productoSeleccionadoId, item);

      mostrarAvisoSistema(
        "Configuración incompleta",
        (productoEsLicencia || productoEsCodigo)
          ? "Hay diferencia entre el stock mostrado y los códigos realmente disponibles. Ya se actualizó el stock real del producto."
          : "Hay diferencia entre el stock mostrado y las cuentas realmente disponibles. Ya se actualizó el stock real del producto.",
        "error"
      );
      return;
    }

    await descontarSaldoUsuario(uid, totalCompra);
    saldoDescontado = true;

    const ordenesGeneradas = await guardarOrdenesUsuario(item, itemsDisponibles, nombreComprador);
    const ordenIds = ordenesGeneradas.map((o) => o.ordenId);

    if (!productoEsDescarga) {
      await marcarItemsVendidos(itemsDisponibles, usuarioActual, nombreComprador, ordenIds);
      itemsMarcados = true;
    }

    await sincronizarStockProductoConInventario(productoSeleccionadoId, item);

    const resultadoRegistro = await registrarCompraFinal(itemsDisponibles, nombreComprador, ordenesGeneradas);

    ventaRegistradaId = resultadoRegistro?.ventaId || "";
    compraLiveRegistradaId = resultadoRegistro?.compraLiveId || "";
    compraHoyRegistradaId = resultadoRegistro?.compraHoyId || "";

    cerrarModal();
    mostrarToastCompraExitosa(item.nombre || productoActual, totalCompra);

    procesarComisionProveedorSilenciosa(resultadoRegistro, nombreComprador)
      .then((res) => {
        if (!res?.ok) {
          console.warn("La compra salió bien, pero la comisión del proveedor quedó pendiente.");
        }
      })
      .catch((e) => {
        console.warn("Error silencioso procesando comisión proveedor:", e);
      });

  } catch (error) {
    console.error("Error al comprar:", error);
    console.error("Mensaje:", error?.message);
    console.error("Código:", error?.code);

    if (ventaRegistradaId) {
      try {
        await db.ref("ventas/" + productoSeleccionadoId + "/" + ventaRegistradaId).remove();
      } catch (e) {
        console.error("No se pudo eliminar venta registrada:", e);
      }
    }

    if (compraLiveRegistradaId) {
      try {
        await db.ref("comprasLive/" + compraLiveRegistradaId).remove();
      } catch (e) {
        console.error("No se pudo eliminar compraLive:", e);
      }
    }

    if (compraHoyRegistradaId) {
      try {
        await db.ref("comprasHoy/" + compraHoyRegistradaId).remove();
      } catch (e) {
        console.error("No se pudo eliminar compraHoy:", e);
      }
    }

    if (itemsMarcados) {
      try {
        await revertirItemsVendidos(itemsDisponibles);
      } catch (e) {
        console.error("No se pudieron revertir los items:", e);
      }
    }

    if (productoSeleccionadoId) {
      try {
        await sincronizarStockProductoConInventario(productoSeleccionadoId, productoSeleccionadoData || {});
      } catch (e) {
        console.error("No se pudo resincronizar stock:", e);
      }
    }

    if (saldoDescontado && uid && totalCompra > 0) {
      try {
        await devolverSaldoUsuario(uid, totalCompra);
      } catch (e) {
        console.error("No se pudo devolver saldo:", e);
      }
    }

    if (String(error?.message || "").includes("SALDO_INSUFICIENTE")) {
      mostrarAvisoSistema("Saldo insuficiente", "Tu saldo no alcanza para completar esta compra.", "warn");
      return;
    }

    mostrarAvisoSistema(
      "Compra no completada",
      "Ocurrió un error real al procesar la compra. El saldo fue revertido y el stock se volvió a sincronizar.",
      "error"
    );
  } finally {
    compraEnProceso = false;
  }
}
/* =========================
FORMULARIO / QR
========================= */

function mostrarFormulario() {
  const qr = document.getElementById("pantallaQR");
  const form = document.getElementById("formulario");

  if (qr) qr.style.display = "none";
  if (form) form.style.display = "block";
}

/* =========================
BANNER SLIDER
========================= */

function mostrarSlides(n) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  if (!slides.length) return;

  if (n > slides.length) slideIndex = 1;
  if (n < 1) slideIndex = slides.length;

  slides.forEach((slide) => {
    slide.classList.remove("active");
  });

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  if (slides[slideIndex - 1]) slides[slideIndex - 1].classList.add("active");
  if (dots[slideIndex - 1]) dots[slideIndex - 1].classList.add("active");
}

function plusSlides(n) {
  slideIndex += n;
  mostrarSlides(slideIndex);
}

function currentSlide(n) {
  slideIndex = n;
  mostrarSlides(slideIndex);
}

function iniciarSlider() {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  mostrarSlides(slideIndex);

  if (slides.length > 1) {
    if (sliderInterval) clearInterval(sliderInterval);

    sliderInterval = setInterval(() => {
      plusSlides(1);
    }, 5000);
  }
}

/* =========================
MENU
========================= */

function esModoMovilOTablet() {
  return window.innerWidth <= 1024;
}

function toggleMenu(e) {
  if (e) e.stopPropagation();

  if (document.body.classList.contains("modal-abierto")) return;

  const menu = document.getElementById("menuLateral");
  if (!menu) return;

  menu.classList.toggle("activo");
}

function cerrarMenu() {
  const menu = document.getElementById("menuLateral");
  if (!menu) return;

  menu.classList.remove("activo");
}

/* =========================
MODAL OFERTA VIGENTE
========================= */

function ofertaSigueActiva() {
  const tiempoGuardado = localStorage.getItem("ofertaTiempo");
  if (!tiempoGuardado) return false;

  const tiempoFinal = Number(tiempoGuardado);
  if (isNaN(tiempoFinal)) return false;

  return Date.now() < tiempoFinal;
}

function mostrarModalOfertaVigente() {
  const modal = document.getElementById("modalOfertaVigente");
  if (!modal) return;

  if (ofertaSigueActiva()) {
    modal.style.display = "flex";
    actualizarEstadoUIOverlay();
  } else {
    modal.style.display = "none";
    actualizarEstadoUIOverlay();
  }
}

function cerrarModalOfertaVigente() {
  const modal = document.getElementById("modalOfertaVigente");
  if (!modal) return;
  modal.style.display = "none";
  actualizarEstadoUIOverlay();
}

function verificarUrgenciaOferta() {
  const tiempoGuardado = localStorage.getItem("ofertaTiempo");
  if (!tiempoGuardado) return;

  const tiempoFinal = Number(tiempoGuardado);
  const ahora = Date.now();
  const tiempoRestante = tiempoFinal - ahora;

  const badge = document.querySelector(".modalOfertaBadge");
  if (!badge) return;

  if (tiempoRestante <= 1800000 && tiempoRestante > 0) {
    badge.innerText = "⚠ ÚLTIMOS MINUTOS DE PROMOCIÓN";
    badge.style.background = "linear-gradient(180deg,#ff8a65,#ff5722)";
    badge.style.borderColor = "#ff5722";
  }
}

/* =========================
INICIO POR PAGINA
========================= */

function iniciarPaginaTienda() {
  iniciarSlider();
  verificarUrgenciaOferta();
  configurarFiltrosTienda();
  cargarProductosTienda();
  escucharStockRealTienda();
  escucharClientesHoy();
  escucharVentasProductos();
  escucharNotificacionCompra();

  if (ofertaSigueActiva() && !localStorage.getItem("visitoOfertas")) {
    mostrarModalOfertaVigente();
  }
}

function iniciarPaginaGeneralConMenu() {
  insertarBadgeMisComprasSiNoExiste();
  inyectarEstilosAvisoSistema();
  inyectarEstilosUIOverlay();
}

function iniciarFormularioReservado() {
  const form = document.getElementById("formCompra");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      mostrarAvisoSistema(
        "Función reservada",
        "Este formulario quedará reservado para futuras recargas de saldo.",
        "info"
      );
    });
  }
}

function iniciarComportamientoMenu() {
  const menu = document.getElementById("menuLateral");
  const menuIcon = document.querySelector(".menuIcon");

  if (menu) {
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  if (menuIcon) {
    menuIcon.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  document.querySelectorAll("#menuLateral a").forEach((link) => {
    link.addEventListener("click", function () {
      if (esModoMovilOTablet()) cerrarMenu();
    });
  });

  window.addEventListener("resize", function () {
    if (!esModoMovilOTablet()) cerrarMenu();
    actualizarEstadoUIOverlay();
  });
}

/* =========================
DOM READY
========================= */

document.addEventListener("DOMContentLoaded", function () {
  const pagina = obtenerPaginaActual();

  iniciarPaginaGeneralConMenu();
  iniciarComportamientoMenu();
  registrarCierrePorPestana();

  if (pagina === "tienda.html") {
    iniciarPaginaTienda();
    iniciarFormularioReservado();
  }

  if (pagina === "ofertas.html") {
    verificarUrgenciaOferta();
  }

  actualizarEstadoUIOverlay();
});

/* =========================
CLICK GLOBAL
========================= */

document.addEventListener("click", function (e) {
  const modalCompra = document.getElementById("modalCompra");
  const modalOferta = document.getElementById("modalOfertaVigente");
  const modalTerminos = document.getElementById("modalTerminos");
  const menu = document.getElementById("menuLateral");
  const menuIcon = document.querySelector(".menuIcon");

  if (
    menu &&
    esModoMovilOTablet() &&
    menu.classList.contains("activo") &&
    !document.body.classList.contains("modal-abierto")
  ) {
    const clicDentroMenu = menu.contains(e.target);
    const clicEnIcono = menuIcon && menuIcon.contains(e.target);

    if (!clicDentroMenu && !clicEnIcono) cerrarMenu();
  }

  if (modalCompra && e.target === modalCompra) {
    cerrarModal();
    return;
  }

  if (modalTerminos && e.target === modalTerminos) {
    cerrarTerminos();
    return;
  }

  if (modalOferta) {
    if (e.target.closest("#btnVerOferta")) {
      e.preventDefault();
      window.location.href = "ofertas.html";
      return;
    }

    if (e.target.closest("#btnCerrarOferta")) {
      e.preventDefault();
      cerrarModalOfertaVigente();
      return;
    }

    if (e.target.closest("#cerrarOfertaX")) {
      e.preventDefault();
      cerrarModalOfertaVigente();
      return;
    }

    if (e.target === modalOferta) {
      cerrarModalOfertaVigente();
    }
  }
});

/* =========================
ESCAPE
========================= */

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    cerrarModal();
    cerrarTerminos();

    const modalOferta = document.getElementById("modalOfertaVigente");
    if (modalOferta && modalOferta.style.display === "flex") {
      cerrarModalOfertaVigente();
    }

    const aviso = document.getElementById("avisoSistemaOverlay");
    if (aviso) {
      aviso.remove();
      actualizarEstadoUIOverlay();
    }

    if (esModoMovilOTablet() && !document.body.classList.contains("modal-abierto")) {
      cerrarMenu();
    }
  }
});

/* =========================
LIMPIEZA AL SALIR DE PAGINA
========================= */

window.addEventListener("beforeunload", () => {
  limpiarListenersPagina();
});
