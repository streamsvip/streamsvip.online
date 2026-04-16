const firebaseConfig = {
  apiKey: "AIzaSyC3rYEe4akJ0w8zcNM4q-25yG7q6CaUHhY",
  authDomain: "streamsvip-b7d91.firebaseapp.com",
  databaseURL: "https://streamsvip-b7d91-default-rtdb.firebaseio.com",
  projectId: "streamsvip-b7d91",
  storageBucket: "streamsvip-b7d91.firebasestorage.app",
  messagingSenderId: "440618225611",
  appId: "1:440618225611:web:eeb4230a10499e1dfff04e"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

const ADMIN_EMAIL = "velithaz@gmail.com".toLowerCase();
const LIMITE_REEMBOLSO_MS = 24 * 60 * 60 * 1000;

const loginSection = document.getElementById("loginSection");
const panelSection = document.getElementById("panelSection");
const loginMsg = document.getElementById("loginMsg");
const adminInfo = document.getElementById("adminInfo");
const loginBtn = document.getElementById("loginBtn");
const adminEmailInput = document.getElementById("adminEmail");
const adminPasswordInput = document.getElementById("adminPassword");
const toggleBtn = document.getElementById("toggleBtn");
const stockMsg = document.getElementById("stockMsg");
const productoMsg = document.getElementById("productoMsg");
const codigoMsg = document.getElementById("codigoMsg");
const toggleTiempoActivoBtn = document.getElementById("toggleTiempoActivoBtn");

let stockCache = {};
let productosCache = {};
let recargasCacheAdmin = {};
let ventasCache = {};
let comprasHoyCache = {};
let comprasHoyEliminadasCache = {};
let ordenesCache = {};
let usuariosCache = {};
let retirosProveedoresCache = {};
let reembolsosCache = {};
let codigosCache = {};
let cuentasCache = {};
let modalRecargaActual = null;
let recargaProcesando = false;

let panelAdminYaCargado = false;
let recargasInicializadas = false;
let recargasPendientesCache = {};
let recargasListenerActivo = false;
let stockAutoSyncEscuchando = false;
let stockRecalcTimeout = null;

let procesandoComisionesProveedores = false;
let listenerComisionesProveedoresActivo = false;
let timeoutComisionesProveedores = null;

const TIEMPO_INACTIVIDAD_ADMIN = 7 * 60 * 1000;
const TIEMPO_AVISO_ADMIN = 1 * 60 * 1000;

let adminTimeoutLogout = null;
let adminTimeoutAviso = null;
let adminControlIniciado = false;
let adminAvisoMostrado = false;

let tiempoActivoAdmin = localStorage.getItem("streamsvip_admin_tiempo_activo") === "true";

/* =========================
FILTROS ADMIN
========================= */

let filtroUsuariosAdmin = "";
let filtroProductosAdmin = "";
let filtroStockAdmin = "";
let filtroCuentasDisponiblesAdmin = "";
let filtroCuentasUsadasAdmin = "";
let filtroRecargasAdmin = "";
let filtroReembolsosAdmin = "";
let filtroRetirosAdmin = "";
let filtroCodigosAdmin = "";
let filtroDescargasAdmin = "";
let filtroDescargasVendidasAdmin = "";
let filtroVentasAdmin = "";
let filtroComprasHoyAdmin = "";
let filtroProveedoresAdmin = "";

/* =========================
UTILS
========================= */

function textoSeguro(valor, fallback = "-") {
  if (valor === undefined || valor === null || valor === "") return fallback;
  return valor;
}

function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escaparParaJS(valor) {
  return String(valor ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function safeDomKey(valor) {
  return String(valor ?? "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatearDinero(valor) {
  return "S/ " + Number(valor || 0).toFixed(2);
}

function redondearMonto(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

function permitirSoloNumerosDecimales(input) {
  if (!input) return;

  let valor = String(input.value || "");
  valor = valor.replace(/,/g, ".");
  valor = valor.replace(/[^0-9.]/g, "");
  valor = valor.replace(/(\..*)\./g, "$1");
  input.value = valor;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function coincideFiltroTexto(textoBase, filtro) {
  if (!filtro) return true;
  return normalizarTexto(textoBase).includes(normalizarTexto(filtro));
}

function inicializarFiltroMontoRecarga() {
  const montoEditable = document.getElementById("modalRecargaMontoEditable");
  if (!montoEditable) return;

  montoEditable.setAttribute("type", "text");
  montoEditable.setAttribute("inputmode", "decimal");
  montoEditable.setAttribute("autocomplete", "off");

  if (!montoEditable.dataset.filtroNumericoInicializado) {
    montoEditable.addEventListener("input", function () {
      permitirSoloNumerosDecimales(this);
    });

    montoEditable.addEventListener("paste", function () {
      setTimeout(() => permitirSoloNumerosDecimales(this), 0);
    });

    montoEditable.addEventListener("keypress", function (e) {
      const tecla = e.key;
      const esControl =
        tecla === "Backspace" ||
        tecla === "Delete" ||
        tecla === "ArrowLeft" ||
        tecla === "ArrowRight" ||
        tecla === "Tab" ||
        tecla === "Enter";

      if (esControl) return;
      if (!/[0-9.]/.test(tecla)) e.preventDefault();
      if (tecla === "." && this.value.includes(".")) e.preventDefault();
    });

    montoEditable.dataset.filtroNumericoInicializado = "true";
  }
}

function inicializarFiltroSaldoUsuarios() {
  if (document.body.dataset.filtroSaldoUsuariosInicializado === "true") return;

  document.addEventListener("input", function (e) {
    const target = e.target;
    if (!target || !target.id) return;
    if (target.id.startsWith("saldoUser_")) permitirSoloNumerosDecimales(target);
  });

  document.addEventListener("paste", function (e) {
    const target = e.target;
    if (!target || !target.id) return;
    if (target.id.startsWith("saldoUser_")) {
      setTimeout(() => permitirSoloNumerosDecimales(target), 0);
    }
  });

  document.addEventListener("keypress", function (e) {
    const target = e.target;
    if (!target || !target.id) return;
    if (!target.id.startsWith("saldoUser_")) return;

    const tecla = e.key;
    const esControl =
      tecla === "Backspace" ||
      tecla === "Delete" ||
      tecla === "ArrowLeft" ||
      tecla === "ArrowRight" ||
      tecla === "Tab" ||
      tecla === "Enter";

    if (esControl) return;
    if (!/[0-9.]/.test(tecla)) e.preventDefault();
    if (tecla === "." && target.value.includes(".")) e.preventDefault();
  });

  document.body.dataset.filtroSaldoUsuariosInicializado = "true";
}

function prepararInputSaldoUsuario(input) {
  if (!input) return;
  input.setAttribute("type", "text");
  input.setAttribute("inputmode", "decimal");
  input.setAttribute("autocomplete", "off");
  permitirSoloNumerosDecimales(input);
}

function formatearFecha(valor) {
  if (valor === undefined || valor === null || valor === "") return "-";

  if (typeof valor === "number") {
    const d = new Date(valor);
    if (isNaN(d.getTime())) return String(valor);
    return d.toLocaleString("es-PE");
  }

  const d = new Date(valor);
  if (!isNaN(d.getTime())) return d.toLocaleString("es-PE");

  return String(valor);
}

function timestampSeguro(valor) {
  if (typeof valor === "number") return valor;
  const ms = new Date(valor || "").getTime();
  return isNaN(ms) ? 0 : ms;
}

function obtenerDuracionTextoAdmin(dias) {
  const n = Number(dias || 0);
  if (n >= 3650 || n === 3065) return "Permanente";
  if (n === 365) return "1 año";
  if (n === 180) return "6 meses";
  if (n === 90) return "3 meses";
  if (n === 60) return "2 meses";
  if (n === 30) return "1 mes";
  if (n === 15) return "15 días";
  if (n === 7) return "7 días";
  if (n === 1) return "1 día";
  return n + " días";
}

function sumarDias(fechaBase, dias) {
  const base = new Date(fechaBase);
  if (isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + Number(dias || 0));
  return base.toISOString();
}

function reembolsoDentroDeTiempo(fechaCompra) {
  if (!fechaCompra) return false;
  const compraMs = new Date(fechaCompra).getTime();
  if (isNaN(compraMs)) return false;
  return (Date.now() - compraMs) <= LIMITE_REEMBOLSO_MS;
}

function esMismoDiaHoy(valor) {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return false;
  const ahora = new Date();
  return (
    d.getFullYear() === ahora.getFullYear() &&
    d.getMonth() === ahora.getMonth() &&
    d.getDate() === ahora.getDate()
  );
}

function normalizarEstadoRecarga(estado) {
  return String(estado || "pendiente").toLowerCase().trim();
}

function recargaEsFinalizada(estado) {
  const e = normalizarEstadoRecarga(estado);
  return e === "aprobada" || e === "rechazada";
}

function normalizarTipoEntregaAdmin(productoId, item = {}) {
  const id = String(productoId || "").toLowerCase().trim();
  const categoria = String(item.categoria || "").toLowerCase().trim();
  const nombre = String(item.nombre || "").toLowerCase().trim();
  const tipoEntrega = String(item.tipoEntrega || "").toLowerCase().trim();

  if (["cuenta", "codigo", "descarga", "plugin", "daw"].includes(tipoEntrega)) {
    return tipoEntrega;
  }

  if (
    categoria.includes("licencia") ||
    id === "windows11pro" ||
    nombre.includes("windows 11 pro")
  ) return "codigo";

  if (categoria.includes("plugin")) return "plugin";
  if (categoria.includes("daw")) return "daw";
  if (categoria.includes("descarga")) return "descarga";

  return "cuenta";
}

function esProductoCodigoAdmin(productoId, item = {}) {
  return normalizarTipoEntregaAdmin(productoId, item) === "codigo";
}

function esProductoDescargaAdmin(productoId, item = {}) {
  const tipo = normalizarTipoEntregaAdmin(productoId, item);
  return tipo === "descarga" || tipo === "plugin" || tipo === "daw";
}

function esProductoCuentaAdmin(productoId, item = {}) {
  return normalizarTipoEntregaAdmin(productoId, item) === "cuenta";
}

function tipoStockVisual(productoId, item = {}) {
  return esProductoDescargaAdmin(productoId, item) ? "manual" : "auto";
}

function badgeEstado(texto) {
  texto = (texto || "").toString().toLowerCase().trim();

  if (texto.includes("desactiv")) return '<span class="badge off">desactivado</span>';
  if (
    texto.includes("aprob") ||
    texto.includes("activo") ||
    texto.includes("complet") ||
    texto.includes("disponible") ||
    texto.includes("activa") ||
    texto === "true"
  ) return '<span class="badge ok">' + escaparHTML(texto) + '</span>';
  if (texto.includes("pend")) return '<span class="badge warn">' + escaparHTML(texto) + '</span>';
  if (texto.includes("manual")) return '<span class="badge warn">manual</span>';
  if (texto.includes("auto")) return '<span class="badge off">auto</span>';
  return '<span class="badge bad">' + escaparHTML(texto) + '</span>';
}

function badgeEstadoRecargaModal(estado) {
  const badge = document.getElementById("modalRecargaEstadoBadge");
  if (!badge) return;
  const e = normalizarEstadoRecarga(estado);

  badge.className = "badge";
  if (e === "aprobada") {
    badge.classList.add("ok");
    badge.textContent = "Aprobada";
  } else if (e === "rechazada") {
    badge.classList.add("bad");
    badge.textContent = "Rechazada";
  } else {
    badge.classList.add("warn");
    badge.textContent = "Pendiente";
  }
}

function mostrarMensajeStock(texto, error = false) {
  if (!stockMsg) return;
  stockMsg.textContent = texto;
  stockMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.stockMsgTimeout);
  window.stockMsgTimeout = setTimeout(() => stockMsg.textContent = "", 3000);
}

function mostrarMensajeProducto(texto, error = false) {
  if (!productoMsg) return;
  productoMsg.textContent = texto;
  productoMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.productoMsgTimeout);
  window.productoMsgTimeout = setTimeout(() => productoMsg.textContent = "", 3000);
}

function mostrarMensajeCuenta(texto, error = false) {
  const cuentaMsg = document.getElementById("cuentaMsg");
  if (!cuentaMsg) return;
  cuentaMsg.textContent = texto;
  cuentaMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.cuentaMsgTimeout);
  window.cuentaMsgTimeout = setTimeout(() => cuentaMsg.textContent = "", 3000);
}

function mostrarMensajeRecarga(texto, error = false) {
  const recargaMsg = document.getElementById("recargaMsg");
  if (!recargaMsg) return;
  recargaMsg.textContent = texto;
  recargaMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.recargaMsgTimeout);
  window.recargaMsgTimeout = setTimeout(() => recargaMsg.textContent = "", 3500);
}

function mostrarMensajeReembolso(texto, error = false) {
  const reembolsoMsg = document.getElementById("reembolsoMsg");
  if (!reembolsoMsg) return;
  reembolsoMsg.textContent = texto;
  reembolsoMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.reembolsoMsgTimeout);
  window.reembolsoMsgTimeout = setTimeout(() => reembolsoMsg.textContent = "", 3000);
}

function mostrarMensajeCodigo(texto, error = false) {
  if (!codigoMsg) return;
  codigoMsg.textContent = texto;
  codigoMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.codigoMsgTimeout);
  window.codigoMsgTimeout = setTimeout(() => codigoMsg.textContent = "", 3000);
}

function mostrarMensajeDescarga(texto, error = false) {
  const descargaMsg = document.getElementById("descargaMsg");
  if (!descargaMsg) return;
  descargaMsg.textContent = texto;
  descargaMsg.style.color = error ? "#ff8a8a" : "#9fe3b8";
  clearTimeout(window.descargaMsgTimeout);
  window.descargaMsgTimeout = setTimeout(() => descargaMsg.textContent = "", 3000);
}

/* =========================
HELPERS VENTAS / PROVEEDORES / DESCARGAS VENDIDAS
========================= */

function obtenerProveedorNombreVentaAdmin(item = {}) {
  const proveedorDirecto = String(
    item.proveedorNombre ||
    item.proveedor ||
    ""
  ).trim();

  if (proveedorDirecto) return proveedorDirecto;

  const proveedorId = String(item.proveedorId || "").trim();
  if (proveedorId && usuariosCache[proveedorId]) {
    const prov = usuariosCache[proveedorId] || {};
    return prov.nombreCompleto || prov.nombre || prov.usuario || proveedorId;
  }

  const productoId = String(item.productoId || item.producto || "").trim();
  if (productoId && productosCache[productoId]) {
    const prod = productosCache[productoId] || {};
    return prod.proveedorNombre || prod.proveedorId || "-";
  }

  return "-";
}

function obtenerGananciaPlataformaVenta(item = {}) {
  const montoDirecto = Number(
    item.montoPlataforma ??
    item.gananciaPlataforma ??
    0
  );

  if (!isNaN(montoDirecto) && montoDirecto > 0) {
    return redondearMonto(montoDirecto);
  }

  const montoTotal = Number(
    item.montoTotal ??
    item.total ??
    item.precioTotal ??
    item.monto ??
    item.precio ??
    0
  );

  if (isNaN(montoTotal) || montoTotal <= 0) return 0;

  const porcentajePlataforma = Number(
    item.porcentajePlataforma ??
    item.comisionPlataforma ??
    4
  );

  return redondearMonto((montoTotal * porcentajePlataforma) / 100);
}

function obtenerGananciaProveedorVenta(item = {}) {
  const montoDirecto = Number(item.montoProveedor ?? 0);
  if (!isNaN(montoDirecto) && montoDirecto > 0) return redondearMonto(montoDirecto);

  const montoTotal = Number(
    item.montoTotal ??
    item.total ??
    item.precioTotal ??
    item.monto ??
    item.precio ??
    0
  );

  if (isNaN(montoTotal) || montoTotal <= 0) return 0;

  const porcentajeProveedor = Number(
    item.porcentajeProveedor ??
    item.comisionProveedor ??
    96
  );

  return redondearMonto((montoTotal * porcentajeProveedor) / 100);
}

function obtenerTipoEntregaDesdeOrdenOProducto(item = {}) {
  const tipoEntrega = String(item.tipoEntrega || "").toLowerCase().trim();
  if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(tipoEntrega)) {
    return tipoEntrega;
  }

  const entregaVisual = String(item.entregaVisual || "").toLowerCase().trim();
  if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(entregaVisual)) {
    return entregaVisual;
  }

  const productoId = String(item.producto || item.productoId || "").trim();
  const prod = productosCache[productoId] || {};
  const tipoProducto = String(prod.tipoEntrega || "").toLowerCase().trim();
  const categoria = String(prod.categoria || "").toLowerCase().trim();
  const nombre = String(prod.nombre || item.servicio || item.producto || "").toLowerCase().trim();

  if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(tipoProducto)) return tipoProducto;
  if (categoria.includes("plugin")) return "plugin";
  if (categoria.includes("daw")) return "daw";
  if (categoria.includes("descarga")) return "descarga";
  if (categoria.includes("licencia")) return "codigo";
  if (nombre.includes("plugin")) return "plugin";
  if (nombre.includes("fl studio") || nombre.includes("ableton") || nombre.includes("cubase") || nombre.includes("studio one")) return "daw";
  if (nombre.includes("windows 11 pro") || nombre.includes("licencia") || nombre.includes("key")) return "codigo";

  return "cuenta";
}

function esOrdenDescargaOPlugin(item = {}) {
  const tipoDetectado = obtenerTipoEntregaDesdeOrdenOProducto(item);
  const linkEntrega = String(item.linkEntrega || "").trim();
  const plataforma = String(item.plataformaElegida || "").trim();

  return (
    tipoDetectado === "descarga" ||
    tipoDetectado === "plugin" ||
    tipoDetectado === "daw" ||
    linkEntrega !== "" ||
    plataforma !== ""
  );
}

function obtenerComisionPlataformaOrden(item = {}) {
  const precio = Number(
    item.precio ??
    item.total ??
    item.precioTotal ??
    item.montoTotal ??
    0
  );

  if (precio <= 0) return 0;

  if (item.montoPlataforma !== undefined && item.montoPlataforma !== null) {
    return redondearMonto(item.montoPlataforma);
  }

  const porcentaje = Number(item.porcentajePlataforma ?? item.comisionPlataforma ?? 4);
  return redondearMonto(precio * porcentaje / 100);
}

function obtenerGananciaProveedorOrden(item = {}) {
  const precio = Number(
    item.precio ??
    item.total ??
    item.precioTotal ??
    item.montoTotal ??
    0
  );

  if (precio <= 0) return 0;

  if (item.montoProveedor !== undefined && item.montoProveedor !== null) {
    return redondearMonto(item.montoProveedor);
  }

  return redondearMonto(precio - obtenerComisionPlataformaOrden(item));
}

function obtenerProveedorOrden(item = {}) {
  if (item.proveedorNombre) return item.proveedorNombre;
  if (item.proveedor) return item.proveedor;
  if (item.vendedor) return item.vendedor;

  const proveedorId = String(item.proveedorId || "").trim();
  if (proveedorId && usuariosCache[proveedorId]) {
    const proveedor = usuariosCache[proveedorId] || {};
    return proveedor.nombreCompleto || proveedor.nombre || proveedor.usuario || proveedorId;
  }

  const productoId = String(item.producto || item.productoId || "").trim();
  if (productoId && productosCache[productoId]) {
    const producto = productosCache[productoId] || {};
    return producto.proveedorNombre || producto.proveedorId || "-";
  }

  return proveedorId || "-";
}

function ventaRequiereComisionProveedor(item = {}) {
  const proveedorId = String(item.proveedorId || "").trim();
  const montoProveedor = Number(item.montoProveedor || 0);
  const procesada = item.comisionProveedorProcesada === true;
  const procesando = item.comisionProveedorProcesando === true;
  const movimientoId = String(item.movimientoProveedorId || "").trim();

  if (!proveedorId) return false;
  if (proveedorId === "admin_principal") return false;
  if (isNaN(montoProveedor) || montoProveedor <= 0) return false;
  if (procesada) return false;
  if (procesando) return false;
  if (movimientoId) return false;

  return true;
}

function extraerVentasPendientesProveedor(data = {}) {
  const lista = [];

  Object.keys(data || {}).forEach((clavePadre) => {
    const bloque = data[clavePadre];
    if (!bloque || typeof bloque !== "object") return;

    const esVentaDirecta =
      Object.prototype.hasOwnProperty.call(bloque, "proveedorId") ||
      Object.prototype.hasOwnProperty.call(bloque, "montoProveedor") ||
      Object.prototype.hasOwnProperty.call(bloque, "montoTotal") ||
      Object.prototype.hasOwnProperty.call(bloque, "productoId");

    if (esVentaDirecta) {
      if (ventaRequiereComisionProveedor(bloque)) {
        lista.push({
          path: "ventas/" + clavePadre,
          ventaId: clavePadre,
          productoId: String(bloque.productoId || clavePadre || "").trim(),
          item: bloque
        });
      }
      return;
    }

    Object.keys(bloque).forEach((ventaId) => {
      const item = bloque[ventaId];
      if (!item || typeof item !== "object") return;

      if (ventaRequiereComisionProveedor(item)) {
        lista.push({
          path: "ventas/" + clavePadre + "/" + ventaId,
          ventaId,
          productoId: String(item.productoId || clavePadre || "").trim(),
          item
        });
      }
    });
  });

  return lista;
}

/* =========================
BUSCADORES ADMIN
========================= */

function conectarInputBusquedaAdmin(inputId, onChange) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.listenerAdminBusqueda === "true") return;

  input.addEventListener("input", function () {
    onChange(this.value || "");
  });

  input.dataset.listenerAdminBusqueda = "true";
}

function inicializarBuscadoresAdmin() {
  conectarInputBusquedaAdmin("buscarUsuariosAdmin", (valor) => {
    filtroUsuariosAdmin = normalizarTexto(valor);
    renderUsuarios();
  });

  conectarInputBusquedaAdmin("buscarProductosAdmin", (valor) => {
    filtroProductosAdmin = normalizarTexto(valor);
    renderProductos();
  });

  conectarInputBusquedaAdmin("buscarStockAdmin", (valor) => {
    filtroStockAdmin = normalizarTexto(valor);
    renderStock();
  });

  conectarInputBusquedaAdmin("buscarCuentasDisponiblesAdmin", (valor) => {
    filtroCuentasDisponiblesAdmin = normalizarTexto(valor);
    renderCuentas();
  });

  conectarInputBusquedaAdmin("buscarCuentasUsadasAdmin", (valor) => {
    filtroCuentasUsadasAdmin = normalizarTexto(valor);
    renderCuentas();
  });

  conectarInputBusquedaAdmin("buscarRecargasAdmin", (valor) => {
    filtroRecargasAdmin = normalizarTexto(valor);
    renderRecargasDesdeCache(recargasCacheAdmin);
  });

  conectarInputBusquedaAdmin("buscarReembolsosAdmin", (valor) => {
    filtroReembolsosAdmin = normalizarTexto(valor);
    renderReembolsosDesdeCache(reembolsosCache);
  });

  conectarInputBusquedaAdmin("buscarRetirosAdmin", (valor) => {
    filtroRetirosAdmin = normalizarTexto(valor);
    renderRetirosProveedoresDesdeCache(retirosProveedoresCache);
  });

  conectarInputBusquedaAdmin("buscarCodigosAdmin", (valor) => {
    filtroCodigosAdmin = normalizarTexto(valor);
    renderCodigos();
  });

  conectarInputBusquedaAdmin("buscarDescargasAdmin", (valor) => {
    filtroDescargasAdmin = normalizarTexto(valor);
    renderDescargas();
  });

  conectarInputBusquedaAdmin("buscarDescargasVendidasAdmin", (valor) => {
    filtroDescargasVendidasAdmin = normalizarTexto(valor);
    renderDescargasEntregadas();
  });

  conectarInputBusquedaAdmin("buscarVentasAdmin", (valor) => {
    filtroVentasAdmin = normalizarTexto(valor);
    renderVentas();
  });

  conectarInputBusquedaAdmin("buscarComprasHoyAdmin", (valor) => {
    filtroComprasHoyAdmin = normalizarTexto(valor);
    renderComprasHoy();
  });

  conectarInputBusquedaAdmin("buscarProveedoresAdmin", (valor) => {
    filtroProveedoresAdmin = normalizarTexto(valor);
    renderProveedores();
  });
}

/* =========================
IDs ÚNICOS PRODUCTOS ADMIN
========================= */

function normalizarIdProductoBase(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function asegurarPrefijoAdminEnId(valor) {
  const limpio = normalizarIdProductoBase(valor);
  if (!limpio) return "";
  return limpio.startsWith("adm-") ? limpio : "adm-" + limpio;
}

async function productoIdYaExiste(idProducto) {
  const snap = await db.ref("productos/" + idProducto).once("value");
  return snap.exists();
}

function limpiarFormularioCrearProductoAdmin() {
  const ids = [
    "nuevoIdProducto",
    "nuevoNombreProducto",
    "nuevoPrecioProducto",
    "nuevoStockProducto",
    "nuevaDuracionProducto",
    "nuevaCategoriaProducto",
    "nuevaImagenProducto",
    "nuevoTipoEntregaProducto",
    "nuevoLinkDescargaProducto",
    "nuevaDescripcionProducto",
    "nuevasReglasProducto"
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* =========================
INACTIVIDAD
========================= */

function actualizarBotonTiempoActivoAdmin() {
  if (!toggleTiempoActivoBtn) return;

  if (tiempoActivoAdmin) {
    toggleTiempoActivoBtn.textContent = "Tiempo activo: Activado";
    toggleTiempoActivoBtn.classList.add("btnTiempoActivoOn");
    toggleTiempoActivoBtn.classList.remove("btnTiempoActivoOff");
  } else {
    toggleTiempoActivoBtn.textContent = "Tiempo activo: Desactivado";
    toggleTiempoActivoBtn.classList.add("btnTiempoActivoOff");
    toggleTiempoActivoBtn.classList.remove("btnTiempoActivoOn");
  }
}

function toggleTiempoActivoAdmin() {
  tiempoActivoAdmin = !tiempoActivoAdmin;
  localStorage.setItem("streamsvip_admin_tiempo_activo", tiempoActivoAdmin ? "true" : "false");
  actualizarBotonTiempoActivoAdmin();

  if (tiempoActivoAdmin) limpiarAdminInactividad();
  else reiniciarAdminInactividad();
}

function limpiarAdminInactividad() {
  if (adminTimeoutLogout) clearTimeout(adminTimeoutLogout);
  if (adminTimeoutAviso) clearTimeout(adminTimeoutAviso);
  adminTimeoutLogout = null;
  adminTimeoutAviso = null;
}

function avisoAdminInactividad() {
  if (adminAvisoMostrado) return;
  adminAvisoMostrado = true;
  alert("Panel administrador inactivo. La sesión se cerrará en 1 minuto si no realizas ninguna acción.");
}

function cerrarAdminPorInactividad() {
  limpiarAdminInactividad();
  adminAvisoMostrado = false;

  auth.signOut()
    .then(() => {
      alert("La sesión del administrador se cerró por inactividad.");
      window.location.replace("admin.html");
    })
    .catch(() => {
      alert("La sesión del administrador se cerró por inactividad.");
      window.location.replace("admin.html");
    });
}

function reiniciarAdminInactividad() {
  limpiarAdminInactividad();
  adminAvisoMostrado = false;
  if (tiempoActivoAdmin) return;

  adminTimeoutAviso = setTimeout(() => {
    avisoAdminInactividad();
  }, TIEMPO_INACTIVIDAD_ADMIN - TIEMPO_AVISO_ADMIN);

  adminTimeoutLogout = setTimeout(() => {
    cerrarAdminPorInactividad();
  }, TIEMPO_INACTIVIDAD_ADMIN);
}

function iniciarControlAdminInactividad() {
  if (adminControlIniciado) {
    reiniciarAdminInactividad();
    return;
  }

  const eventos = ["mousemove", "mousedown", "click", "scroll", "keypress", "touchstart", "touchmove", "keydown"];
  eventos.forEach((evento) => document.addEventListener(evento, reiniciarAdminInactividad, true));

  window.addEventListener("focus", reiniciarAdminInactividad);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reiniciarAdminInactividad();
  });

  adminControlIniciado = true;
  reiniciarAdminInactividad();
}

/* =========================
UI BÁSICA
========================= */

function reproducirSonidoRecarga() {
  const audio = document.getElementById("audioRecarga");
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function togglePassword() {
  if (!adminPasswordInput || !toggleBtn) return;
  adminPasswordInput.type = adminPasswordInput.type === "password" ? "text" : "password";
  toggleBtn.textContent = adminPasswordInput.type === "password" ? "👁️" : "🙈";
}

function toggleCuentaPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  if (btn) btn.textContent = input.type === "password" ? "👁️" : "🙈";
}

function toggleSection(button) {
  const card = button.closest(".collapsibleCard");
  if (!card) return;
  card.classList.toggle("closed");
}

function irATiendaAdmin() {
  window.open("tienda.html", "_blank");
}

if (adminEmailInput) {
  adminEmailInput.addEventListener("keydown", e => {
    if (e.key === "Enter") loginAdmin();
  });
}

if (adminPasswordInput) {
  adminPasswordInput.addEventListener("keydown", e => {
    if (e.key === "Enter") loginAdmin();
  });
}

function setLoading(estado) {
  if (!loginBtn) return;
  loginBtn.disabled = estado;
  loginBtn.textContent = estado ? "Ingresando..." : "Iniciar sesión";
}

/* =========================
LOGIN
========================= */

function loginAdmin() {
  const email = adminEmailInput.value.trim().toLowerCase();
  const password = adminPasswordInput.value.trim();
  loginMsg.textContent = "";

  if (!email || !password) {
    loginMsg.textContent = "Completa correo y contraseña.";
    return;
  }

  setLoading(true);

  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => auth.signInWithEmailAndPassword(email, password))
    .then((userCredential) => {
      const user = userCredential.user;

      if (!user || !user.email) {
        return auth.signOut().then(() => {
          throw new Error("No se pudo validar el usuario.");
        });
      }

      if (user.email.toLowerCase() !== ADMIN_EMAIL) {
        return auth.signOut().then(() => {
          throw new Error("Acceso denegado. Este usuario no es administrador.");
        });
      }

      return db.ref("usuarios/" + user.uid).once("value").then((snap) => {
        const data = snap.val() || {};
        const rol = data.rol || "";
        const estado = String(data.estado || "activo").toLowerCase();

        if (rol !== "admin") {
          return auth.signOut().then(() => {
            throw new Error("Tu cuenta no tiene rol administrador.");
          });
        }

        if (estado === "bloqueado") {
          return auth.signOut().then(() => {
            throw new Error("Tu cuenta administrativa está bloqueada.");
          });
        }
      });
    })
    .then(() => setLoading(false))
    .catch((error) => {
      setLoading(false);

      if (error.code === "auth/user-not-found") {
        loginMsg.textContent = "Ese correo no existe en Firebase Authentication.";
      } else if (error.code === "auth/wrong-password") {
        loginMsg.textContent = "La contraseña es incorrecta.";
      } else if (error.code === "auth/invalid-login-credentials") {
        loginMsg.textContent = "Correo o contraseña incorrectos.";
      } else if (error.code === "auth/invalid-credential") {
        loginMsg.textContent = "Correo o contraseña incorrectos.";
      } else {
        loginMsg.textContent = error.message || "Correo o contraseña incorrectos.";
      }
    });
}

function cerrarSesion() {
  limpiarAdminInactividad();
  auth.signOut()
    .then(() => window.location.replace("admin.html"))
    .catch(() => window.location.replace("admin.html"));
}

auth.onAuthStateChanged(async (user) => {
  if (user && user.email && user.email.toLowerCase() === ADMIN_EMAIL) {
    try {
      const snap = await db.ref("usuarios/" + user.uid).once("value");
      const data = snap.val() || {};
      const rol = data.rol || "";
      const estado = String(data.estado || "activo").toLowerCase();

      if (rol !== "admin" || estado === "bloqueado") {
        await auth.signOut();
        loginSection.classList.remove("hidden");
        panelSection.classList.add("hidden");
        loginMsg.textContent = "Acceso denegado.";
        setLoading(false);
        return;
      }

      loginSection.classList.add("hidden");
      panelSection.classList.remove("hidden");
      adminInfo.textContent = user.email;
      actualizarBotonTiempoActivoAdmin();

      if (!panelAdminYaCargado) {
        cargarPanel();
        panelAdminYaCargado = true;
      }

      iniciarControlAdminInactividad();
    } catch (error) {
      console.error("Error verificando admin:", error);
      await auth.signOut();
      loginSection.classList.remove("hidden");
      panelSection.classList.add("hidden");
      loginMsg.textContent = "No se pudo validar el acceso.";
      setLoading(false);
    }
  } else {
    limpiarAdminInactividad();
    panelAdminYaCargado = false;
    recargasInicializadas = false;
    recargasPendientesCache = {};
    recargasCacheAdmin = {};
    usuariosCache = {};
    retirosProveedoresCache = {};
    reembolsosCache = {};
    comprasHoyEliminadasCache = {};
    listenerComisionesProveedoresActivo = false;
    procesandoComisionesProveedores = false;
    clearTimeout(timeoutComisionesProveedores);
    loginSection.classList.remove("hidden");
    panelSection.classList.add("hidden");
    setLoading(false);
  }
});

/* =========================
CARGA PANEL
========================= */

function actualizarEncabezadosVentasAdmin() {
  const tablaVentas = document.getElementById("tablaVentas");
  if (!tablaVentas) return;

  const ths = tablaVentas.querySelectorAll("thead th");
  if (!ths || !ths.length) return;

  if (ths[3]) ths[3].textContent = "Proveedor";
  if (ths[4]) ths[4].textContent = "Comisión plataforma";
  if (ths[5]) ths[5].textContent = "Ganancia proveedor";
}

function actualizarCabeceraTablaComprasHoyAdmin() {
  const tabla = document.getElementById("tablaComprasHoy");
  if (!tabla) return;

  const ths = tabla.querySelectorAll("thead th");
  if (!ths || ths.length < 9) return;

  if (ths[3]) ths[3].textContent = "Proveedor";
  if (ths[4]) ths[4].textContent = "Comisión plataforma";
  if (ths[5]) ths[5].textContent = "Ganancia proveedor";
}

function cargarPanel() {
  inicializarFiltroMontoRecarga();
  inicializarFiltroSaldoUsuarios();
  inicializarBuscadoresAdmin();
  actualizarEncabezadosVentasAdmin();
  actualizarCabeceraTablaComprasHoyAdmin();

  cargarVentas();
  cargarComprasHoy();
  cargarStock();
  cargarProductos();
  cargarProductosEnSelects();
  cargarCuentas();
  cargarUsuarios();
  cargarProveedores();
  cargarRecargas();
  cargarReembolsos();
  cargarRetirosProveedores();
  cargarCodigos();
  cargarDescargas();
  cargarDescargasEntregadas();
  escucharNuevasRecargasPendientes();
  escucharComisionesProveedoresPendientes();
  iniciarAutoSyncStock();
  recalcularTodoElStockSilencioso();
}
/* =========================
HELPERS STOCK ROBUSTO
========================= */

function obtenerVariantesClaveStockAdmin(valor) {
  const original = String(valor || "").trim();
  if (!original) return [];

  const lower = original.toLowerCase();
  const upper = original.toUpperCase();
  const capitalizada = lower.charAt(0).toUpperCase() + lower.slice(1);

  return Array.from(new Set([original, lower, upper, capitalizada].filter(Boolean)));
}

function obtenerRutaCuentasPorProductoAdmin(productoId, itemProducto = {}) {
  const id = String(productoId || "").trim();
  const idLower = id.toLowerCase();
  const nombre = String(itemProducto.nombre || "").toLowerCase();

  if (idLower === "netflix" || nombre.includes("netflix")) return "netflix";
  if (idLower === "disney" || nombre.includes("disney")) return "disney";
  if (
    idLower === "hboprime" ||
    nombre.includes("hbo max + prime") ||
    (nombre.includes("hbo") && nombre.includes("prime"))
  ) return "hboprime";
  if (idLower === "prime" || nombre.includes("prime video")) return "prime";
  if (
    idLower === "hboplatinium" ||
    nombre.includes("hbo max platinium") ||
    nombre.includes("hbomax platinium") ||
    nombre.includes("hbo platinium")
  ) return "hboplatinium";
  if (idLower === "hbo" || nombre.includes("hbo")) return "hbo";
  if (idLower === "paramount" || nombre.includes("paramount")) return "paramount";
  if (idLower === "spotify" || nombre.includes("spotify")) return "spotify";
  if (idLower === "vix" || nombre.includes("vix")) return "vix";
  if (idLower === "crunchyroll" || idLower === "crunchy" || nombre.includes("crunchyroll")) return "crunchyroll";
  if (idLower === "canva" || nombre.includes("canva")) return "canva";
  if (idLower === "youtubepremium" || nombre.includes("youtube premium") || nombre.includes("youtube")) return "youtubepremium";
  if (idLower === "chatgpt" || idLower === "chagpt" || nombre.includes("chatgpt")) return "chatgpt";
  if (idLower === "windows11pro" || nombre.includes("windows 11 pro")) return "windows11pro";

  return id;
}

function obtenerRutasCuentasCompatiblesAdmin(productoId, itemProducto = {}) {
  const rutaBase = obtenerRutaCuentasPorProductoAdmin(productoId, itemProducto);
  const nombre = String(itemProducto.nombre || "").trim();
  const variantes = new Set();

  obtenerVariantesClaveStockAdmin(rutaBase).forEach((v) => variantes.add(v));
  obtenerVariantesClaveStockAdmin(productoId).forEach((v) => variantes.add(v));

  if (nombre) variantes.add(nombre);

  const mapaEspecial = {
    netflix: ["Netflix"],
    disney: ["Disney"],
    prime: ["Prime"],
    hbo: ["HBO"],
    hboprime: ["hboprime", "HBOPrime", "HboPrime", "HBOPrimeVideo"],
    hboplatinium: ["HBOPlatinium", "hboplatinium", "HboPlatinium"],
    paramount: ["Paramount"],
    spotify: ["Spotify"],
    vix: ["Vix"],
    crunchyroll: ["Crunchyroll", "crunchy"],
    canva: ["Canva"],
    youtubepremium: ["YouTubePremium", "YoutubePremium", "youtubepremium"],
    chatgpt: ["ChatGPT", "chatgpt", "chagpt"],
    windows11pro: ["Windows11Pro", "windows11pro", "Windows11pro"]
  };

  const rutaLower = String(rutaBase || "").toLowerCase();
  if (mapaEspecial[rutaLower]) {
    mapaEspecial[rutaLower].forEach((v) => variantes.add(v));
  }

  return Array.from(variantes).filter(Boolean);
}

function esNodoCuentaDirectaAdmin(data = {}) {
  if (!data || typeof data !== "object") return false;

  return (
    String(data.cuenta || "").trim() !== "" ||
    String(data.correo || "").trim() !== "" ||
    String(data.email || "").trim() !== "" ||
    String(data.usuario || "").trim() !== "" ||
    String(data.codigo || "").trim() !== ""
  );
}

function cuentaDisponibleAdmin(data = {}) {
  const vendida = data.vendida === true || data.vendido === true || data.usada === true;
  const disponibleFalse = data.disponible === false;
  const estado = String(data.estado || "").toLowerCase().trim();

  if (vendida) return false;
  if (disponibleFalse) return false;
  if (["vendida", "usada", "ocupada", "inactiva", "agotada"].includes(estado)) return false;

  const cuenta = data.cuenta || data.correo || data.email || data.usuario || data.codigo || "";
  return String(cuenta || "").trim() !== "";
}

function contarCuentasDisponiblesEnNodoAdmin(nodoActual) {
  if (!nodoActual || typeof nodoActual !== "object") return 0;

  if (esNodoCuentaDirectaAdmin(nodoActual)) {
    return cuentaDisponibleAdmin(nodoActual) ? 1 : 0;
  }

  let total = 0;

  Object.keys(nodoActual).forEach((key) => {
    const subNodo = nodoActual[key];
    if (subNodo && typeof subNodo === "object") {
      total += contarCuentasDisponiblesEnNodoAdmin(subNodo);
    }
  });

  return total;
}

function codigoDisponibleAdmin(data = {}) {
  const activo = data.activo !== false;
  const usado = data.usado === true;
  const codigo = String(data.codigo || "").trim();

  return activo && !usado && codigo !== "";
}

function obtenerStockRealParaProductoAdmin(productoId, productoData = {}, cuentasData = {}, codigosData = {}, stockActual = {}) {
  if (esProductoDescargaAdmin(productoId, productoData)) {
    return Number(stockActual[productoId] ?? productoData.stock ?? 0);
  }

  if (esProductoCodigoAdmin(productoId, productoData)) {
    let totalCodigos = 0;
    const variantes = obtenerVariantesClaveStockAdmin(productoId).map((v) => v.toLowerCase());

    Object.keys(codigosData || {}).forEach((codigoId) => {
      const item = codigosData[codigoId] || {};
      const productoCodigo = String(item.producto || item.productoId || item.productoNombre || "").trim().toLowerCase();
      if (!variantes.includes(productoCodigo)) return;
      if (!codigoDisponibleAdmin(item)) return;
      totalCodigos++;
    });

    return totalCodigos;
  }

  let stockMaximo = 0;
  const rutasCompatibles = obtenerRutasCuentasCompatiblesAdmin(productoId, productoData);

  rutasCompatibles.forEach((ruta) => {
    const nodo = cuentasData[ruta];
    const totalRuta = contarCuentasDisponiblesEnNodoAdmin(nodo || {});
    if (totalRuta > stockMaximo) stockMaximo = totalRuta;
  });

  return stockMaximo;
}

/* =========================
STOCK
========================= */

function cambiarCantidadInput(producto, cambio) {
  const input = document.getElementById("stockInput_" + safeDomKey(producto));
  if (!input) return;

  let valor = parseInt(input.value) || 0;
  valor += cambio;
  if (valor < 0) valor = 0;
  input.value = valor;
}

function guardarStock(producto) {
  const input = document.getElementById("stockInput_" + safeDomKey(producto));
  if (!input) return;

  const nuevoStock = parseInt(input.value);
  if (isNaN(nuevoStock) || nuevoStock < 0) {
    mostrarMensajeStock("El stock de " + producto + " no es válido.", true);
    return;
  }

  const updates = {};
  updates["stock/" + producto] = nuevoStock;
  updates["productos/" + producto + "/stock"] = nuevoStock;

  db.ref().update(updates)
    .then(() => mostrarMensajeStock("Stock actualizado: " + producto + " = " + nuevoStock))
    .catch((error) => mostrarMensajeStock("Error: " + error.message, true));
}

function agotarProducto(producto) {
  const updates = {};
  updates["stock/" + producto] = 0;
  updates["productos/" + producto + "/stock"] = 0;

  db.ref().update(updates)
    .then(() => mostrarMensajeStock("Producto agotado: " + producto))
    .catch((error) => mostrarMensajeStock("Error: " + error.message, true));
}

function renderStock() {
  const tbody = document.querySelector("#tablaStock tbody");
  const tabla = document.getElementById("tablaStock");
  const vacio = document.getElementById("stockVacio");

  if (!tbody || !tabla || !vacio) return;

  tbody.innerHTML = "";

  let ids = Object.keys(productosCache || {}).sort();

  if (filtroStockAdmin) {
    ids = ids.filter((productoId) => {
      const item = productosCache[productoId] || {};
      const texto = [
        productoId,
        item.nombre || "",
        item.categoria || "",
        item.tipoEntrega || "",
        item.proveedorNombre || ""
      ].join(" ");
      return coincideFiltroTexto(texto, filtroStockAdmin);
    });
  }

  if (!ids.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    document.getElementById("totalStock").textContent = "0";
    return;
  }

  let sumaTotal = 0;

  ids.forEach((productoId) => {
    const item = productosCache[productoId] || {};
    const stockActual = Number(stockCache[productoId] ?? item.stock ?? 0);
    const tipoModo = tipoStockVisual(productoId, item);
    const activo = item.activo !== false;
    let estadoBase = "agotado";

    if (!activo) estadoBase = "desactivado";
    else if (stockActual > 0) estadoBase = "activo";

    sumaTotal += stockActual;

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(item.nombre || productoId)}<br><small>${escaparHTML(productoId)}</small></td>
        <td>${stockActual}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${badgeEstado(estadoBase)}
            ${badgeEstado(tipoModo)}
          </div>
        </td>
        <td>
          <div class="stockControls">
            <button class="stockBtn" onclick="cambiarCantidadInput('${escaparParaJS(productoId)}', -1)">-</button>
            <input type="number" min="0" id="stockInput_${safeDomKey(productoId)}" class="stockInput" value="${stockActual}">
            <button class="stockBtn" onclick="cambiarCantidadInput('${escaparParaJS(productoId)}', 1)">+</button>
            <button class="saveStockBtn" onclick="guardarStock('${escaparParaJS(productoId)}')">Guardar</button>
            <button class="smallBtn btnDangerSoft" onclick="agotarProducto('${escaparParaJS(productoId)}')">Agotar</button>
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById("totalStock").textContent = sumaTotal;
  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarStock() {
  db.ref("stock").on("value", (snapshot) => {
    stockCache = snapshot.val() || {};
    renderStock();
  }, () => {
    stockCache = {};
    renderStock();
    mostrarMensajeStock("No se pudo leer stock. Revisa tus rules.", true);
  });

  db.ref("productos").on("value", (snapshot) => {
    productosCache = snapshot.val() || {};
    renderStock();
    renderProductos();
    renderDescargas();
    renderVentas();
    renderComprasHoy();
    renderDescargasEntregadas();
  }, () => {
    productosCache = {};
    renderStock();
    renderProductos();
  });

  db.ref("cuentas").on("value", (snapshot) => {
    cuentasCache = snapshot.val() || {};
    renderCuentas();
  });

  db.ref("codigos").on("value", (snapshot) => {
    codigosCache = snapshot.val() || {};
    renderCodigos();
  });
}

function recalcularTodoElStock(mostrarMensaje = true) {
  Promise.all([
    db.ref("productos").once("value"),
    db.ref("cuentas").once("value"),
    db.ref("codigos").once("value"),
    db.ref("stock").once("value")
  ])
    .then(([productosSnap, cuentasSnap, codigosSnap, stockSnap]) => {
      const productos = productosSnap.val() || {};
      const cuentas = cuentasSnap.val() || {};
      const codigos = codigosSnap.val() || {};
      const stockActual = stockSnap.val() || {};
      const updates = {};

      Object.keys(productos).forEach((productoId) => {
        const productoData = productos[productoId] || {};
        const stockReal = obtenerStockRealParaProductoAdmin(productoId, productoData, cuentas, codigos, stockActual);

        updates["stock/" + productoId] = stockReal;
        updates["productos/" + productoId + "/stock"] = stockReal;
      });

      return db.ref().update(updates);
    })
    .then(() => {
      if (mostrarMensaje) mostrarMensajeStock("Stock recalculado correctamente.");
    })
    .catch((error) => {
      if (mostrarMensaje) mostrarMensajeStock("Error al recalcular stock: " + error.message, true);
    });
}

function recalcularTodoElStockSilencioso() {
  recalcularTodoElStock(false);
}

function programarRecalculoStockSilencioso() {
  clearTimeout(stockRecalcTimeout);
  stockRecalcTimeout = setTimeout(() => {
    recalcularTodoElStockSilencioso();
  }, 700);
}

function iniciarAutoSyncStock() {
  if (stockAutoSyncEscuchando) return;
  stockAutoSyncEscuchando = true;

  db.ref("cuentas").on("value", () => programarRecalculoStockSilencioso());
  db.ref("codigos").on("value", () => programarRecalculoStockSilencioso());
  db.ref("productos").on("value", () => programarRecalculoStockSilencioso());
}

/* =========================
PRODUCTOS
========================= */

async function crearProducto() {
  try {
    const idIngresado = document.getElementById("nuevoIdProducto").value.trim();
    const id = asegurarPrefijoAdminEnId(idIngresado);
    const nombre = document.getElementById("nuevoNombreProducto").value.trim();
    const precio = parseFloat(document.getElementById("nuevoPrecioProducto").value);
    const stock = parseInt(document.getElementById("nuevoStockProducto").value);
    const duracionDias = parseInt(document.getElementById("nuevaDuracionProducto").value);
    const categoria = document.getElementById("nuevaCategoriaProducto").value.trim();
    const imagen = document.getElementById("nuevaImagenProducto").value.trim();
    const tipoEntrega = document.getElementById("nuevoTipoEntregaProducto").value.trim().toLowerCase();
    const linkDescarga = document.getElementById("nuevoLinkDescargaProducto").value.trim();
    const descripcion = document.getElementById("nuevaDescripcionProducto").value.trim();
    const reglas = document.getElementById("nuevasReglasProducto").value.trim();

    if (!id) return mostrarMensajeProducto("Completa el ID del producto.", true);
    if (!nombre) return mostrarMensajeProducto("Completa el nombre del producto.", true);
    if (isNaN(precio) || precio < 0) return mostrarMensajeProducto("El precio no es válido.", true);
    if (isNaN(stock) || stock < 0) return mostrarMensajeProducto("El stock no es válido.", true);
    if (isNaN(duracionDias) || duracionDias < 1) return mostrarMensajeProducto("La duración en días no es válida.", true);

    const yaExiste = await productoIdYaExiste(id);
    if (yaExiste) {
      return mostrarMensajeProducto("Ese ID ya existe. Usa otro distinto.", true);
    }

    const tipoEntregaFinal = tipoEntrega || "cuenta";

    const productoData = {
      id,
      nombre,
      precio: redondearMonto(precio),
      stock: Number(stock),
      duracionDias: Number(duracionDias),
      activo: true,
      categoria: categoria || "general",
      descripcion: descripcion || "",
      reglas: reglas || "",
      imagen: imagen || "",
      tipoEntrega: tipoEntregaFinal,
      linkDescarga: linkDescarga || "",
      proveedorId: "admin_principal",
      proveedorNombre: "Josking",
      proveedorTipo: "admin",
      comisionProveedor: 96,
      comisionPlataforma: 4,
      fechaCreacion: Date.now()
    };

    if (["plugin", "descarga", "daw"].includes(tipoEntregaFinal)) {
      productoData.opcionesEntrega = {
        windows: { nombre: "Windows", link: "" },
        mac: { nombre: "Mac", link: "" },
        general: { nombre: "General", link: linkDescarga || "" }
      };
    }

    const updates = {};
    updates["productos/" + id] = productoData;
    updates["stock/" + id] = Number(stock);

    await db.ref().update(updates);

    mostrarMensajeProducto("Producto creado correctamente con ID único: " + id);
    limpiarFormularioCrearProductoAdmin();
  } catch (error) {
    mostrarMensajeProducto(error.message || "No se pudo crear el producto.", true);
  }
}

function guardarProducto(id) {
  const key = safeDomKey(id);
  const nombre = document.getElementById("prodNombre_" + key).value.trim();
  const precio = parseFloat(document.getElementById("prodPrecio_" + key).value);
  const duracionDias = parseInt(document.getElementById("prodDuracion_" + key).value);
  const categoria = document.getElementById("prodCategoria_" + key).value.trim();
  const imagen = document.getElementById("prodImagen_" + key).value.trim();
  const tipoEntrega = document.getElementById("prodTipoEntrega_" + key).value.trim().toLowerCase();
  const linkDescarga = document.getElementById("prodLinkDescarga_" + key).value.trim();
  const descripcion = document.getElementById("prodDescripcion_" + key).value.trim();
  const reglas = document.getElementById("prodReglas_" + key).value.trim();

  if (!nombre) return mostrarMensajeProducto("El nombre no puede estar vacío.", true);
  if (isNaN(precio) || precio < 0) return mostrarMensajeProducto("Precio inválido en " + id, true);
  if (isNaN(duracionDias) || duracionDias < 1) return mostrarMensajeProducto("Duración inválida en " + id, true);

  Promise.all([
    db.ref("productos/" + id).once("value"),
    db.ref("stock/" + id).once("value")
  ])
    .then(([productoSnap, stockSnap]) => {
      const actual = productoSnap.val() || {};
      const stockReal = Number(stockSnap.val() ?? actual.stock ?? 0);

      const updateData = {
        nombre,
        precio: redondearMonto(precio),
        stock: stockReal,
        duracionDias: Number(duracionDias),
        categoria: categoria || "general",
        descripcion: descripcion || "",
        reglas: reglas || "",
        imagen: imagen || "",
        tipoEntrega: tipoEntrega || "cuenta",
        linkDescarga: linkDescarga || "",
        proveedorId: actual.proveedorId || "admin_principal",
        proveedorNombre: actual.proveedorNombre || "Josking",
        proveedorTipo: actual.proveedorTipo || "admin",
        comisionProveedor: Number(actual.comisionProveedor ?? 96),
        comisionPlataforma: Number(actual.comisionPlataforma ?? 4)
      };

      if (["plugin", "descarga", "daw"].includes(updateData.tipoEntrega)) {
        updateData.opcionesEntrega = actual.opcionesEntrega || {
          windows: { nombre: "Windows", link: "" },
          mac: { nombre: "Mac", link: "" },
          general: { nombre: "General", link: linkDescarga || "" }
        };
      }

      const updates = {};
      updates["productos/" + id] = {
        ...actual,
        ...updateData
      };
      updates["stock/" + id] = stockReal;

      return db.ref().update(updates);
    })
    .then(() => mostrarMensajeProducto("Producto actualizado: " + id))
    .catch((error) => mostrarMensajeProducto("Error: " + error.message, true));
}

function toggleProductoActivo(id, estadoActual) {
  db.ref("productos/" + id + "/activo").set(!estadoActual)
    .then(() => mostrarMensajeProducto("Estado actualizado: " + id))
    .catch((error) => mostrarMensajeProducto("Error: " + error.message, true));
}

function eliminarProducto(id) {
  if (!confirm("¿Seguro que quieres eliminar el producto '" + id + "'?")) return;

  Promise.all([
    db.ref("productos/" + id).remove(),
    db.ref("stock/" + id).remove()
  ])
    .then(() => mostrarMensajeProducto("Producto eliminado: " + id))
    .catch((error) => mostrarMensajeProducto("Error: " + error.message, true));
}

function renderProductos() {
  const data = productosCache || {};
  const tbody = document.querySelector("#tablaProductos tbody");
  const tabla = document.getElementById("tablaProductos");
  const vacio = document.getElementById("productosVacio");

  if (!tbody || !tabla || !vacio) return;
  tbody.innerHTML = "";

  if (!data || typeof data !== "object" || !Object.keys(data).length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  let ids = Object.keys(data).sort();

  if (filtroProductosAdmin) {
    ids = ids.filter((id) => {
      const item = data[id] || {};
      const texto = [
        id,
        item.nombre || "",
        item.categoria || "",
        item.tipoEntrega || "",
        item.proveedorNombre || "",
        item.descripcion || ""
      ].join(" ");
      return coincideFiltroTexto(texto, filtroProductosAdmin);
    });
  }

  if (!ids.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  ids.forEach((id) => {
    const item = data[id] || {};
    const estadoVisual = item.activo === false ? "desactivado" : "activo";
    const key = safeDomKey(id);

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(id)}</td>
        <td><input id="prodNombre_${key}" class="tableInput tableInputWide" value="${escaparHTML(item.nombre || "")}"></td>
        <td><input id="prodPrecio_${key}" class="tableInput" type="number" min="0" step="0.01" value="${Number(item.precio || 0)}"></td>
        <td><input id="prodStock_${key}" class="tableInput tableInputReadonly" type="number" value="${Number(item.stock || 0)}" readonly></td>
        <td><input id="prodDuracion_${key}" class="tableInput" type="number" min="1" value="${Number(item.duracionDias || 30)}"></td>
        <td>${badgeEstado(estadoVisual)}</td>
        <td><input id="prodCategoria_${key}" class="tableInput tableInputWide" value="${escaparHTML(item.categoria || "general")}"></td>
        <td><input id="prodImagen_${key}" class="tableInput tableInputWide" value="${escaparHTML(item.imagen || "")}" placeholder="https://..."></td>
        <td><input id="prodTipoEntrega_${key}" class="tableInput" value="${escaparHTML(item.tipoEntrega || "cuenta")}" placeholder="cuenta / codigo / descarga / plugin / daw"></td>
        <td><input id="prodLinkDescarga_${key}" class="tableInput tableInputWide" value="${escaparHTML(item.linkDescarga || "")}" placeholder="https://..."></td>
        <td>${escaparHTML(textoSeguro(item.proveedorNombre, "Josking"))}</td>
        <td>${Number(item.comisionProveedor ?? 96)}%</td>
        <td>${Number(item.comisionPlataforma ?? 4)}%</td>
        <td><textarea id="prodDescripcion_${key}" class="tableInputDesc">${escaparHTML(item.descripcion || "")}</textarea></td>
        <td><textarea id="prodReglas_${key}" class="tableInputDesc">${escaparHTML(item.reglas || "")}</textarea></td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn btnSave" onclick="guardarProducto('${escaparParaJS(id)}')">Guardar</button>
            <button class="smallBtn btnToggle" onclick="toggleProductoActivo('${escaparParaJS(id)}', ${!!item.activo})">${item.activo ? "Desactivar" : "Activar"}</button>
            <button class="smallBtn btnDelete" onclick="eliminarProducto('${escaparParaJS(id)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  });

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarProductos() {
  db.ref("productos").on("value", (snapshot) => {
    productosCache = snapshot.val() || {};
    renderProductos();
    renderStock();
    renderDescargas();
    renderVentas();
    renderComprasHoy();
    renderDescargasEntregadas();
  }, () => {
    productosCache = {};
    renderProductos();
    mostrarMensajeProducto("No se pudieron leer productos. Revisa tus rules.", true);
  });
}

function cargarProductosEnSelects() {
  const selectCuenta = document.getElementById("cuentaProducto");
  const selectCodigo = document.getElementById("codigoProducto");
  const selectDescarga = document.getElementById("descargaProducto");

  db.ref("productos").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    if (!selectCuenta || !selectCodigo || !selectDescarga) return;

    selectCuenta.innerHTML = '<option value="">Selecciona producto</option>';
    selectCodigo.innerHTML = '<option value="">Selecciona producto</option>';
    selectDescarga.innerHTML = '<option value="">Selecciona producto</option>';

    const ids = Object.keys(data).sort();

    if (!ids.length) {
      selectCuenta.innerHTML = '<option value="">Primero crea un producto</option>';
      selectCodigo.innerHTML = '<option value="">Primero crea un producto</option>';
      selectDescarga.innerHTML = '<option value="">Primero crea un producto</option>';
      return;
    }

    ids.forEach((id) => {
      const item = data[id] || {};
      const label = `${item.nombre || id} (${id})`;

      if (esProductoCuentaAdmin(id, item)) {
        selectCuenta.innerHTML += `<option value="${escaparHTML(id)}">${escaparHTML(label)}</option>`;
      }

      if (esProductoCodigoAdmin(id, item)) {
        selectCodigo.innerHTML += `<option value="${escaparHTML(id)}">${escaparHTML(label)}</option>`;
      }

      if (esProductoDescargaAdmin(id, item)) {
        selectDescarga.innerHTML += `<option value="${escaparHTML(id)}">${escaparHTML(label)}</option>`;
      }
    });
  });
}

/* =========================
CUENTAS
========================= */

function crearCuenta() {
  const producto = document.getElementById("cuentaProducto").value.trim().toLowerCase();
  const correo = document.getElementById("cuentaCorreo").value.trim();
  const clave = document.getElementById("cuentaClave").value.trim();
  const perfil = document.getElementById("cuentaPerfil").value.trim();
  const pin = document.getElementById("cuentaPin").value.trim();
  const observacion = document.getElementById("cuentaObservacion").value.trim();

  if (!producto) return mostrarMensajeCuenta("Selecciona un producto tipo cuenta.", true);

  db.ref("productos/" + producto).once("value")
    .then((productoSnap) => {
      const productoData = productoSnap.val() || {};

      if (!esProductoCuentaAdmin(producto, productoData)) {
        throw new Error("Ese producto no pertenece a la sección Cuentas.");
      }

      if (!correo || !clave) {
        throw new Error("Completa correo/usuario y contraseña de la cuenta.");
      }

      const duracionDias = Number(productoData.duracionDias || 30);
      const fechaCreacionISO = new Date().toISOString();
      const fechaVencimientoISO = sumarDias(fechaCreacionISO, duracionDias);
      const cuentaRef = db.ref("cuentas/" + producto).push();

      return cuentaRef.set({
        correo,
        clave,
        perfil: perfil || "",
        pin: pin || "",
        observacion: observacion || "",
        estado: "disponible",
        duracionDias,
        fechaCreacion: fechaCreacionISO,
        fechaVencimiento: fechaVencimientoISO,
        comprador: "",
        uidUsuario: "",
        fechaEntrega: "",
        ordenId: ""
      });
    })
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCuenta("Cuenta guardada correctamente.");
      document.getElementById("cuentaProducto").value = "";
      document.getElementById("cuentaCorreo").value = "";
      document.getElementById("cuentaClave").value = "";
      document.getElementById("cuentaPerfil").value = "";
      document.getElementById("cuentaPin").value = "";
      document.getElementById("cuentaObservacion").value = "";
    })
    .catch((error) => mostrarMensajeCuenta("Error: " + error.message, true));
}

function marcarCuentaUsadaManual(producto, cuentaId) {
  db.ref("cuentas/" + producto + "/" + cuentaId).update({
    estado: "usada",
    fechaEntrega: new Date().toISOString()
  })
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCuenta("Cuenta marcada como usada y stock actualizado.");
    })
    .catch((error) => mostrarMensajeCuenta("Error: " + error.message, true));
}

function guardarCuentaUsada(producto, cuentaId) {
  const key = safeDomKey(producto + "_" + cuentaId);
  const correo = document.getElementById("usedCorreo_" + key)?.value.trim() || "";
  const clave = document.getElementById("usedClave_" + key)?.value.trim() || "";
  const perfil = document.getElementById("usedPerfil_" + key)?.value.trim() || "";
  const pin = document.getElementById("usedPin_" + key)?.value.trim() || "";
  const observacion = document.getElementById("usedObs_" + key)?.value.trim() || "";

  if (!correo) return mostrarMensajeCuenta("El correo no puede quedar vacío.", true);

  db.ref("cuentas/" + producto + "/" + cuentaId).once("value")
    .then((snap) => {
      const cuentaActual = snap.val() || {};
      if (!cuentaActual || typeof cuentaActual !== "object") throw new Error("La cuenta usada no existe.");

      const uidUsuario = cuentaActual.uidUsuario || "";
      const ordenId = cuentaActual.ordenId || "";
      const updates = {};

      updates["cuentas/" + producto + "/" + cuentaId + "/correo"] = correo;
      updates["cuentas/" + producto + "/" + cuentaId + "/clave"] = clave;
      updates["cuentas/" + producto + "/" + cuentaId + "/perfil"] = perfil;
      updates["cuentas/" + producto + "/" + cuentaId + "/pin"] = pin;
      updates["cuentas/" + producto + "/" + cuentaId + "/observacion"] = observacion;
      updates["cuentas/" + producto + "/" + cuentaId + "/fechaActualizacionAdmin"] = Date.now();

      if (uidUsuario && ordenId) {
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/cuenta"] = correo;
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/clave"] = clave;
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/perfil"] = perfil;
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/pin"] = pin;
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/observacion"] = observacion;
        updates["ordenes/" + uidUsuario + "/" + ordenId + "/fechaActualizacionAdmin"] = Date.now();
      }

      return db.ref().update(updates);
    })
    .then(() => {
      mostrarMensajeCuenta("Cuenta usada actualizada correctamente y reflejada en Mis Compras.");
    })
    .catch((error) => {
      mostrarMensajeCuenta("Error al actualizar la cuenta usada: " + error.message, true);
    });
}

function eliminarCuenta(producto, cuentaId) {
  if (!confirm("¿Seguro que quieres eliminar esta cuenta?")) return;

  db.ref("cuentas/" + producto + "/" + cuentaId).remove()
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCuenta("Cuenta eliminada correctamente.");
    })
    .catch((error) => mostrarMensajeCuenta("Error: " + error.message, true));
}

function renderCuentas() {
  const data = cuentasCache || {};
  const tbodyDisponibles = document.querySelector("#tablaCuentasDisponibles tbody");
  const tablaDisponibles = document.getElementById("tablaCuentasDisponibles");
  const vacioDisponibles = document.getElementById("cuentasDisponiblesVacio");
  const tbodyUsadas = document.querySelector("#tablaCuentasUsadas tbody");
  const tablaUsadas = document.getElementById("tablaCuentasUsadas");
  const vacioUsadas = document.getElementById("cuentasUsadasVacio");

  if (!tbodyDisponibles || !tablaDisponibles || !vacioDisponibles || !tbodyUsadas || !tablaUsadas || !vacioUsadas) return;

  tbodyDisponibles.innerHTML = "";
  tbodyUsadas.innerHTML = "";

  let hayDisponibles = false;
  let hayUsadas = false;

  if (!data || typeof data !== "object" || !Object.keys(data).length) {
    tablaDisponibles.classList.add("hidden");
    vacioDisponibles.classList.remove("hidden");
    tablaUsadas.classList.add("hidden");
    vacioUsadas.classList.remove("hidden");
    return;
  }

  const disponiblesLista = [];
  const usadasLista = [];

  Object.keys(data).forEach((producto) => {
    const cuentasProducto = data[producto] || {};

    Object.keys(cuentasProducto).forEach((cuentaId) => {
      const item = cuentasProducto[cuentaId] || {};
      const estado = String(item.estado || "").toLowerCase().trim();
      const fechaCreacionMs = timestampSeguro(item.fechaCreacion);
      const fechaEntregaMs = timestampSeguro(item.fechaEntrega);

      const textoFiltro = [
        producto,
        cuentaId,
        item.correo || "",
        item.email || "",
        item.usuario || "",
        item.perfil || "",
        item.pin || "",
        item.observacion || "",
        item.comprador || "",
        item.uidUsuario || ""
      ].join(" ");

      const registro = {
        producto,
        cuentaId,
        item,
        fechaCreacionMs,
        fechaEntregaMs,
        textoFiltro
      };

      if (estado === "disponible") disponiblesLista.push(registro);
      else usadasLista.push(registro);
    });
  });

  let disponiblesFiltradas = disponiblesLista;
  let usadasFiltradas = usadasLista;

  if (filtroCuentasDisponiblesAdmin) {
    disponiblesFiltradas = disponiblesLista.filter((r) => coincideFiltroTexto(r.textoFiltro, filtroCuentasDisponiblesAdmin));
  }

  if (filtroCuentasUsadasAdmin) {
    usadasFiltradas = usadasLista.filter((r) => coincideFiltroTexto(r.textoFiltro, filtroCuentasUsadasAdmin));
  }

  disponiblesFiltradas.sort((a, b) => b.fechaCreacionMs - a.fechaCreacionMs);
  usadasFiltradas.sort((a, b) => {
    const fechaA = a.fechaEntregaMs || a.fechaCreacionMs;
    const fechaB = b.fechaEntregaMs || b.fechaCreacionMs;
    return fechaB - fechaA;
  });

  disponiblesFiltradas.forEach(({ producto, cuentaId, item }) => {
    hayDisponibles = true;
    const key = safeDomKey(producto + "_" + cuentaId);

    tbodyDisponibles.innerHTML += `
      <tr>
        <td>${escaparHTML(producto)}</td>
        <td>${escaparHTML(textoSeguro(item.correo || item.email || item.usuario))}</td>
        <td>
          <div class="accountPassWrap">
            <input type="password" id="clave_${key}" class="accountPassInput" value="${escaparHTML(textoSeguro(item.clave, ""))}" readonly>
            <button class="accountEye" onclick="toggleCuentaPassword('clave_${key}', this)">👁️</button>
          </div>
        </td>
        <td>${escaparHTML(textoSeguro(item.perfil))}</td>
        <td>${escaparHTML(textoSeguro(item.pin))}</td>
        <td>${escaparHTML(obtenerDuracionTextoAdmin(item.duracionDias))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaCreacion))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaVencimiento))}</td>
        <td>${escaparHTML(textoSeguro(item.observacion))}</td>
        <td>${badgeEstado("disponible")}</td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn btnDangerSoft" onclick="marcarCuentaUsadaManual('${escaparParaJS(producto)}', '${escaparParaJS(cuentaId)}')">Marcar usada</button>
            <button class="smallBtn btnDelete" onclick="eliminarCuenta('${escaparParaJS(producto)}', '${escaparParaJS(cuentaId)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  });

  usadasFiltradas.forEach(({ producto, cuentaId, item }) => {
    hayUsadas = true;
    const key = safeDomKey(producto + "_" + cuentaId);

    tbodyUsadas.innerHTML += `
      <tr>
        <td>${escaparHTML(producto)}</td>
        <td><input id="usedCorreo_${key}" class="tableInput tableInputWide" value="${escaparHTML(textoSeguro(item.correo || item.email || item.usuario, ""))}"></td>
        <td>
          <div class="accountPassWrap">
            <input type="password" id="usedClave_${key}" class="accountPassInput" value="${escaparHTML(textoSeguro(item.clave, ""))}">
            <button class="accountEye" onclick="toggleCuentaPassword('usedClave_${key}', this)">👁️</button>
          </div>
        </td>
        <td><input id="usedPerfil_${key}" class="tableInput" value="${escaparHTML(textoSeguro(item.perfil, ""))}"></td>
        <td>${escaparHTML(textoSeguro(item.comprador))}</td>
        <td>${escaparHTML(textoSeguro(item.uidUsuario))}</td>
        <td>${escaparHTML(obtenerDuracionTextoAdmin(item.duracionDias))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaCreacion))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaEntrega))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaVencimiento))}</td>
        <td><input id="usedPin_${key}" class="tableInput" value="${escaparHTML(textoSeguro(item.pin, ""))}"></td>
        <td><input id="usedObs_${key}" class="tableInput tableInputWide" value="${escaparHTML(textoSeguro(item.observacion, ""))}"></td>
        <td>${badgeEstado(item.estado || "usada")}</td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn btnSave" onclick="guardarCuentaUsada('${escaparParaJS(producto)}', '${escaparParaJS(cuentaId)}')">Guardar cambios</button>
            <button class="smallBtn btnDelete" onclick="eliminarCuenta('${escaparParaJS(producto)}', '${escaparParaJS(cuentaId)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  });

  if (hayDisponibles) {
    tablaDisponibles.classList.remove("hidden");
    vacioDisponibles.classList.add("hidden");
  } else {
    tablaDisponibles.classList.add("hidden");
    vacioDisponibles.classList.remove("hidden");
  }

  if (hayUsadas) {
    tablaUsadas.classList.remove("hidden");
    vacioUsadas.classList.add("hidden");
  } else {
    tablaUsadas.classList.add("hidden");
    vacioUsadas.classList.remove("hidden");
  }
}

function cargarCuentas() {
  db.ref("cuentas").on("value", (snapshot) => {
    cuentasCache = snapshot.val() || {};
    renderCuentas();
  }, () => {
    cuentasCache = {};
    renderCuentas();
    mostrarMensajeCuenta("No se pudieron leer cuentas. Revisa tus rules.", true);
  });
}
/* =========================
CÓDIGOS
========================= */

function crearCodigo() {
  const producto = document.getElementById("codigoProducto").value.trim().toLowerCase();
  const codigo = document.getElementById("nuevoCodigoValor").value.trim();
  const observacion = document.getElementById("nuevoCodigoObservacion").value.trim();

  if (!producto) return mostrarMensajeCodigo("Selecciona un producto tipo código.", true);
  if (!codigo) return mostrarMensajeCodigo("Ingresa el código.", true);

  db.ref("productos/" + producto).once("value")
    .then((snap) => {
      const prod = snap.val() || {};
      if (!esProductoCodigoAdmin(producto, prod)) {
        throw new Error("Ese producto no pertenece a la sección Códigos.");
      }

      const tipoEntrega = String(prod.tipoEntrega || "").toLowerCase() || "codigo";
      const codigoRef = db.ref("codigos").push();

      return codigoRef.set({
        producto,
        codigo,
        observacion: observacion || "",
        tipoEntrega,
        activo: true,
        usado: false,
        fechaCreacion: Date.now(),
        fechaUso: "",
        uidUsuario: "",
        comprador: "",
        proveedorId: prod.proveedorId || "admin_principal",
        proveedorNombre: prod.proveedorNombre || "Josking"
      });
    })
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCodigo("Código guardado correctamente.");
      document.getElementById("codigoProducto").value = "";
      document.getElementById("nuevoCodigoValor").value = "";
      document.getElementById("nuevoCodigoObservacion").value = "";
    })
    .catch((error) => mostrarMensajeCodigo("Error: " + error.message, true));
}

function toggleCodigoActivo(codigoId, nuevoEstado) {
  db.ref("codigos/" + codigoId + "/activo").set(nuevoEstado)
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCodigo("Estado del código actualizado.");
    })
    .catch((error) => mostrarMensajeCodigo("Error: " + error.message, true));
}

function eliminarCodigo(codigoId) {
  if (!confirm("¿Seguro que quieres eliminar este código?")) return;

  db.ref("codigos/" + codigoId).remove()
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCodigo("Código eliminado correctamente.");
    })
    .catch((error) => mostrarMensajeCodigo("Error: " + error.message, true));
}

function renderCodigos() {
  const data = codigosCache || {};
  const tbody = document.querySelector("#tablaCodigos tbody");
  const tabla = document.getElementById("tablaCodigos");
  const vacio = document.getElementById("codigosVacio");

  if (!tbody || !tabla || !vacio) return;
  tbody.innerHTML = "";

  if (!data || typeof data !== "object" || !Object.keys(data).length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    document.getElementById("totalCodigos").textContent = "0";
    return;
  }

  let keys = Object.keys(data)
    .filter((codigoId) => {
      const item = data[codigoId] || {};
      return !["descarga", "plugin", "daw"].includes(String(item.tipoEntrega || "").toLowerCase());
    })
    .sort((a, b) => {
      const da = data[a] || {};
      const dbb = data[b] || {};
      return timestampSeguro(dbb.fechaCreacion) - timestampSeguro(da.fechaCreacion);
    });

  if (filtroCodigosAdmin) {
    keys = keys.filter((codigoId) => {
      const item = data[codigoId] || {};
      const texto = [
        codigoId,
        item.producto || "",
        item.codigo || "",
        item.observacion || "",
        item.comprador || "",
        item.tipoEntrega || "",
        item.proveedorNombre || ""
      ].join(" ");
      return coincideFiltroTexto(texto, filtroCodigosAdmin);
    });
  }

  document.getElementById("totalCodigos").textContent = keys.length;

  if (!keys.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  keys.forEach((codigoId) => {
    const item = data[codigoId] || {};
    const activo = item.activo !== false;
    const usado = item.usado === true;

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(codigoId)}</td>
        <td>${escaparHTML(textoSeguro(item.producto))}</td>
        <td>${escaparHTML(textoSeguro(item.codigo))}</td>
        <td>${escaparHTML(textoSeguro(item.observacion))}</td>
        <td>${escaparHTML(textoSeguro(item.tipoEntrega || "-"))}</td>
        <td>${badgeEstado(String(activo))}</td>
        <td>${badgeEstado(usado ? "usado" : "no usado")}</td>
        <td>${escaparHTML(formatearFecha(item.fechaCreacion))}</td>
        <td>${escaparHTML(formatearFecha(item.fechaUso))}</td>
        <td>${escaparHTML(textoSeguro(item.comprador))}</td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn btnToggle" onclick="toggleCodigoActivo('${escaparParaJS(codigoId)}', ${!activo})">${activo ? "Desactivar" : "Activar"}</button>
            <button class="smallBtn btnDelete" onclick="eliminarCodigo('${escaparParaJS(codigoId)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  });

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarCodigos() {
  db.ref("codigos").on("value", (snapshot) => {
    codigosCache = snapshot.val() || {};
    renderCodigos();
    renderStock();
  }, () => {
    codigosCache = {};
    renderCodigos();
  });
}

/* =========================
DESCARGAS / PLUGINS / DAW
========================= */

function guardarDescargaProducto() {
  const producto = document.getElementById("descargaProducto").value.trim().toLowerCase();
  const plataforma = document.getElementById("descargaPlataforma").value.trim().toLowerCase();
  const nombre = document.getElementById("descargaNombre").value.trim();
  const link = document.getElementById("descargaLink").value.trim();

  if (!producto) return mostrarMensajeDescarga("Selecciona un producto tipo descarga/plugin/daw.", true);
  if (!plataforma) return mostrarMensajeDescarga("Selecciona una plataforma.", true);
  if (!link) return mostrarMensajeDescarga("Ingresa el link de descarga.", true);

  db.ref("productos/" + producto).once("value")
    .then((snap) => {
      const prod = snap.val() || {};
      if (!esProductoDescargaAdmin(producto, prod)) {
        throw new Error("Ese producto no pertenece a la sección Plugins / DAW / Descargas.");
      }

      const updates = {};
      updates["productos/" + producto + "/opcionesEntrega/" + plataforma + "/nombre"] =
        nombre || (plataforma === "windows" ? "Windows" : plataforma === "mac" ? "Mac" : "General");
      updates["productos/" + producto + "/opcionesEntrega/" + plataforma + "/link"] = link;

      if (plataforma === "general") {
        updates["productos/" + producto + "/linkDescarga"] = link;
      }

      return db.ref().update(updates);
    })
    .then(() => {
      mostrarMensajeDescarga("Descarga guardada correctamente.");
      document.getElementById("descargaProducto").value = "";
      document.getElementById("descargaPlataforma").value = "windows";
      document.getElementById("descargaNombre").value = "";
      document.getElementById("descargaLink").value = "";
    })
    .catch((error) => mostrarMensajeDescarga("Error: " + error.message, true));
}

function eliminarDescargaProducto(productoId, plataforma) {
  if (!confirm("¿Seguro que quieres eliminar esta opción de descarga?")) return;

  const updates = {};
  updates["productos/" + productoId + "/opcionesEntrega/" + plataforma] = null;

  if (plataforma === "general") {
    updates["productos/" + productoId + "/linkDescarga"] = "";
  }

  db.ref().update(updates)
    .then(() => mostrarMensajeDescarga("Opción de descarga eliminada correctamente."))
    .catch((error) => mostrarMensajeDescarga("Error: " + error.message, true));
}

function renderDescargas() {
  const data = productosCache || {};
  const tbody = document.querySelector("#tablaDescargas tbody");
  const tabla = document.getElementById("tablaDescargas");
  const vacio = document.getElementById("descargasVacio");

  if (!tbody || !tabla || !vacio) return;
  tbody.innerHTML = "";

  let ids = Object.keys(data).filter((id) => esProductoDescargaAdmin(id, data[id] || {}));

  if (filtroDescargasAdmin) {
    ids = ids.filter((id) => {
      const item = data[id] || {};
      const opciones = item.opcionesEntrega || {};
      const texto = [
        id,
        item.nombre || "",
        item.categoria || "",
        item.tipoEntrega || "",
        item.linkDescarga || "",
        opciones?.windows?.nombre || "",
        opciones?.windows?.link || "",
        opciones?.mac?.nombre || "",
        opciones?.mac?.link || "",
        opciones?.general?.nombre || "",
        opciones?.general?.link || ""
      ].join(" ");
      return coincideFiltroTexto(texto, filtroDescargasAdmin);
    });
  }

  if (!ids.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  ids.sort().forEach((id) => {
    const item = data[id] || {};
    const opciones = item.opcionesEntrega || {};
    const win = opciones.windows || {};
    const mac = opciones.mac || {};
    const general = opciones.general || {};

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(textoSeguro(item.nombre, id))} (${escaparHTML(id)})</td>
        <td><span class="downloadTag">${escaparHTML(textoSeguro(item.tipoEntrega, "descarga"))}</span></td>
        <td>
          <div><strong>${escaparHTML(textoSeguro(win.nombre, "-"))}</strong></div>
          <div style="margin-top:6px; word-break:break-all;">${escaparHTML(textoSeguro(win.link, "-"))}</div>
        </td>
        <td>
          <div><strong>${escaparHTML(textoSeguro(mac.nombre, "-"))}</strong></div>
          <div style="margin-top:6px; word-break:break-all;">${escaparHTML(textoSeguro(mac.link, "-"))}</div>
        </td>
        <td>
          <div><strong>${escaparHTML(textoSeguro(general.nombre, "-"))}</strong></div>
          <div style="margin-top:6px; word-break:break-all;">${escaparHTML(textoSeguro(general.link || item.linkDescarga, "-"))}</div>
        </td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn btnDelete" onclick="eliminarDescargaProducto('${escaparParaJS(id)}','windows')">Quitar Win</button>
            <button class="smallBtn btnDelete" onclick="eliminarDescargaProducto('${escaparParaJS(id)}','mac')">Quitar Mac</button>
            <button class="smallBtn btnDelete" onclick="eliminarDescargaProducto('${escaparParaJS(id)}','general')">Quitar General</button>
          </div>
        </td>
      </tr>
    `;
  });

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarDescargas() {
  db.ref("productos").on("value", (snapshot) => {
    productosCache = snapshot.val() || {};
    renderDescargas();
  }, () => {
    renderDescargas();
  });
}

/* =========================
ÓRDENES DESCARGAS VENDIDAS
========================= */

function obtenerComisionPlataformaOrden(item = {}) {
  const precio = Number(
    item.precio ??
    item.total ??
    item.precioTotal ??
    item.montoTotal ??
    0
  );

  if (precio <= 0) return 0;

  if (item.montoPlataforma !== undefined && item.montoPlataforma !== null) {
    return redondearMonto(item.montoPlataforma);
  }

  const porcentaje = Number(item.porcentajePlataforma ?? item.comisionPlataforma ?? 4);
  return redondearMonto((precio * porcentaje) / 100);
}

function obtenerGananciaProveedorOrden(item = {}) {
  const precio = Number(
    item.precio ??
    item.total ??
    item.precioTotal ??
    item.montoTotal ??
    0
  );

  if (precio <= 0) return 0;

  if (item.montoProveedor !== undefined && item.montoProveedor !== null) {
    return redondearMonto(item.montoProveedor);
  }

  return redondearMonto(precio - obtenerComisionPlataformaOrden(item));
}

function obtenerProveedorOrden(item = {}) {
  if (item.proveedorNombre) return item.proveedorNombre;
  if (item.proveedor) return item.proveedor;
  if (item.vendedor) return item.vendedor;
  if (item.proveedorId && usuariosCache[item.proveedorId]) {
    const proveedor = usuariosCache[item.proveedorId] || {};
    return proveedor.nombreCompleto || proveedor.nombre || proveedor.usuario || item.proveedorId;
  }

  const productoId = String(item.producto || item.productoId || "").trim();
  const prod = productosCache[productoId] || {};
  return prod.proveedorNombre || prod.proveedorId || item.proveedorId || "-";
}

function obtenerLinkEntregaOrden(item = {}) {
  const linkDirecto = String(item.linkEntrega || "").trim();
  if (linkDirecto) return linkDirecto;

  const productoId = String(item.producto || item.productoId || "").trim();
  const prod = productosCache[productoId] || {};
  const opciones = prod.opcionesEntrega || {};
  const plataforma = String(item.plataformaElegida || "general").toLowerCase().trim();

  const linkPorPlataforma = String(opciones?.[plataforma]?.link || "").trim();
  if (linkPorPlataforma) return linkPorPlataforma;

  const linkGeneral = String(opciones?.general?.link || "").trim();
  if (linkGeneral) return linkGeneral;

  return String(prod.linkDescarga || "").trim();
}

function obtenerFechaEntregaOrden(item = {}) {
  return item.fechaEntrega || item.fechaCompra || item.fecha || "";
}

function eliminarOrdenDescargaAdmin(uid, ordenId) {
  if (!uid || !ordenId) return;
  if (!confirm("¿Seguro que quieres eliminar esta compra de descarga/plugin/daw del panel del usuario?")) return;

  db.ref("ordenes/" + uid + "/" + ordenId).remove()
    .then(() => {
      mostrarMensajeDescarga("Compra eliminada correctamente.");
    })
    .catch((error) => {
      mostrarMensajeDescarga("Error al eliminar la compra: " + error.message, true);
    });
}

function copiarTextoAdmin(texto) {
  navigator.clipboard.writeText(String(texto || ""))
    .then(() => {
      mostrarMensajeDescarga("Link copiado al portapapeles.");
    })
    .catch(() => {
      mostrarMensajeDescarga("No se pudo copiar el link.", true);
    });
}

function renderDescargasEntregadas() {
  const data = ordenesCache || {};
  const tbody = document.querySelector("#tablaDescargasEntregadas tbody");
  const tabla = document.getElementById("tablaDescargasEntregadas");
  const vacio = document.getElementById("descargasEntregadasVacio");

  if (!tbody || !tabla || !vacio) return;
  tbody.innerHTML = "";

  const lista = [];

  Object.keys(data).forEach((uid) => {
    const ordenesUsuario = data[uid] || {};
    Object.keys(ordenesUsuario).forEach((ordenId) => {
      const item = ordenesUsuario[ordenId] || {};
      if (!esOrdenDescargaOPlugin(item)) return;

      const linkEntregaFinal = obtenerLinkEntregaOrden(item);
      const proveedorFinal = obtenerProveedorOrden(item);
      const tipoFinal = obtenerTipoEntregaDesdeOrdenOProducto(item);

      const textoFiltro = [
        uid,
        ordenId,
        item.servicio || "",
        item.producto || "",
        item.comprador || "",
        item.uid || "",
        item.plataformaElegida || "",
        linkEntregaFinal || "",
        proveedorFinal || "",
        tipoFinal || ""
      ].join(" ");

      lista.push({
        uid,
        ordenId,
        ...item,
        linkEntregaFinal,
        proveedorFinal,
        tipoFinal,
        textoFiltro
      });
    });
  });

  let listaFiltrada = lista;

  if (filtroDescargasVendidasAdmin) {
    listaFiltrada = lista.filter((item) => coincideFiltroTexto(item.textoFiltro, filtroDescargasVendidasAdmin));
  }

  listaFiltrada.sort((a, b) => timestampSeguro(b.fechaCompra || b.fechaEntrega || b.fecha) - timestampSeguro(a.fechaCompra || a.fechaEntrega || a.fecha));

  if (!listaFiltrada.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  listaFiltrada.forEach((item) => {
    const plataforma = item.plataformaElegida || "-";
    const linkEntrega = item.linkEntregaFinal || "";
    const proveedor = item.proveedorFinal || "-";
    const precio = Number(item.precio || item.total || item.precioTotal || item.montoTotal || 0);
    const gananciaPagina = obtenerComisionPlataformaOrden(item);
    const gananciaProveedor = obtenerGananciaProveedorOrden(item);
    const fechaEntrega = obtenerFechaEntregaOrden(item);

    const linkHtml = linkEntrega
      ? `<a href="${escaparHTML(linkEntrega)}" target="_blank" rel="noopener noreferrer">Abrir link</a>`
      : "-";

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(textoSeguro(item.uid || item.uidUsuario || item.uidComprador || item.uidCliente || item.uidUsuarioOrden || item.uid || ""))}</td>
        <td>${escaparHTML(textoSeguro(item.ordenId || item.id || item.ordenIdOriginal || item.ordenIdInterno || item.ordenId || item.ordenIdRef || item.ordenIdManual || item.ordenIdAsignado || item.ordenIdVenta || item.ordenIdCompra || item.ordenIdGenerado || item.ordenIdUnico || item.ordenIdSistema || item.ordenIdFinal || item.ordenIdTmp || item.ordenIdSecundario || item.ordenId || item.ordenIdAux || item.ordenIdExtra || item.ordenIdReal || item.ordenIdMostrado || item.ordenIdVisible || item.ordenIdLocal || item.ordenIdGlobal || item.ordenIdPanel || item.ordenIdStream || item.ordenIdCliente || item.ordenIdProveedor || item.ordenIdAdmin || item.ordenIdEntrega || item.ordenIdReferencia || item.ordenIdNumero || item.ordenIdTexto || item.ordenIdData || item.ordenIdValor || item.ordenIdKey || item.ordenIdCode || item.ordenIdTag || item.ordenIdName || item.ordenIdUid || item.ordenIdDb || item.ordenIdStore || item.ordenIdVentaRef || item.ordenIdPedido || item.ordenIdPedidoRef || item.ordenIdTicket || item.ordenIdRegistro || item.ordenIdPersistente || item.ordenIdInternoSistema || item.ordenIdItem || item.ordenIdFila || item.ordenIdDoc || item.ordenIdDocRef || item.ordenIdRef || item.ordenId || "-"))}</td>
        <td>${escaparHTML(textoSeguro(item.servicio || item.producto))}</td>
        <td>${escaparHTML(textoSeguro(item.comprador))}</td>
        <td>${escaparHTML(textoSeguro(proveedor))}</td>
        <td>${escaparHTML(textoSeguro(item.tipoFinal))}</td>
        <td>${formatearDinero(precio)}</td>
        <td>${formatearDinero(gananciaPagina)}</td>
        <td>${formatearDinero(gananciaProveedor)}</td>
        <td>${escaparHTML(textoSeguro(plataforma))}</td>
        <td style="word-break:break-all;">${linkHtml}</td>
        <td>${escaparHTML(formatearFecha(fechaEntrega))}</td>
        <td>${badgeEstado(item.estado || "activa")}</td>
        <td>
          <div class="actionGroup">
            ${linkEntrega ? `<button class="smallBtn btnToggle" onclick="copiarTextoAdmin('${escaparParaJS(linkEntrega)}')">Copiar link</button>` : ""}
            <button class="smallBtn btnDelete" onclick="eliminarOrdenDescargaAdmin('${escaparParaJS(item.uid)}', '${escaparParaJS(item.ordenId)}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  });

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarDescargasEntregadas() {
  db.ref("ordenes").on("value", (snapshot) => {
    ordenesCache = snapshot.val() || {};
    renderDescargasEntregadas();
  }, (error) => {
    console.error("Error leyendo descargas entregadas:", error);
    const tablaDescargasEntregadas = document.getElementById("tablaDescargasEntregadas");
    if (tablaDescargasEntregadas) tablaDescargasEntregadas.classList.add("hidden");
    mostrarMensajeDescarga("No se pudieron leer las descargas vendidas. Revisa tus rules.", true);
  });
}

/* =========================
USUARIOS
========================= */

function toggleUsuarioEstado(uid, nuevoEstado) {
  db.ref("usuarios/" + uid + "/estado").set(nuevoEstado)
    .catch((error) => {
      alert("No se pudo cambiar estado: " + error.message);
    });
}

function guardarSaldoUsuarioAdmin(uid) {
  const input = document.getElementById("saldoUser_" + safeDomKey(uid));
  if (!input) return;

  permitirSoloNumerosDecimales(input);
  const valorLimpio = String(input.value || "").trim();

  if (valorLimpio === "") {
    alert("El saldo no es válido.");
    return;
  }

  const nuevoSaldo = Number(valorLimpio);

  if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
    alert("El saldo no es válido.");
    return;
  }

  db.ref("usuarios/" + uid + "/saldo").set(redondearMonto(nuevoSaldo))
    .then(() => {
      mostrarMensajeProducto("Saldo actualizado correctamente.");
    })
    .catch((error) => {
      alert("No se pudo actualizar el saldo: " + error.message);
    });
}

function renderUsuarios() {
  const data = usuariosCache || {};
  const tbody = document.querySelector("#tablaUsuarios tbody");
  const tabla = document.getElementById("tablaUsuarios");
  const vacio = document.getElementById("usuariosVacio");

  if (!tbody || !tabla || !vacio) return;
  tbody.innerHTML = "";

  if (!data || typeof data !== "object" || !Object.keys(data).length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    const totalUsuarios = document.getElementById("totalUsuarios");
    if (totalUsuarios) totalUsuarios.textContent = "0";
    renderProveedores();
    return;
  }

  let usuariosLista = Object.keys(data)
    .map((id) => {
      const item = data[id] || {};
      const textoFiltro = [
        id,
        item.nombreCompleto || "",
        item.nombre || "",
        item.apellido || "",
        item.usuario || "",
        item.correo || "",
        item.email || "",
        item.estado || "",
        item.rol || ""
      ].join(" ");

      return {
        id,
        item,
        fechaOrden: timestampSeguro(item.fechaRegistro || item.fecha || 0),
        textoFiltro
      };
    })
    .filter(({ item }) => String(item.rol || "").toLowerCase() !== "proveedor");

  if (filtroUsuariosAdmin) {
    usuariosLista = usuariosLista.filter(({ textoFiltro }) => coincideFiltroTexto(textoFiltro, filtroUsuariosAdmin));
  }

  const totalUsuarios = document.getElementById("totalUsuarios");
  if (totalUsuarios) totalUsuarios.textContent = usuariosLista.length;

  usuariosLista.sort((a, b) => b.fechaOrden - a.fechaOrden);

  usuariosLista.forEach(({ id, item }) => {
    const estado = item.estado || "activo";
    const key = safeDomKey(id);

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(id)}</td>
        <td>${escaparHTML(textoSeguro(item.nombreCompleto || item.nombre || item.usuario))}</td>
        <td>${escaparHTML(textoSeguro(item.correo || item.email))}</td>
        <td>
          <div style="display:flex; gap:8px; align-items:center; min-width:220px;">
            <input
              id="saldoUser_${key}"
              class="tableInput"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              value="${Number(item.saldo || 0)}"
              style="max-width:120px;"
            >
            <button class="smallBtn btnSave" onclick="guardarSaldoUsuarioAdmin('${escaparParaJS(id)}')">Guardar</button>
          </div>
        </td>
        <td>${escaparHTML(formatearFecha(item.fechaRegistro || item.fecha))}</td>
        <td>${badgeEstado(estado)}</td>
        <td>
          <div class="actionGroup">
            <button class="smallBtn ${estado === "bloqueado" ? "btnToggle" : "btnDangerSoft"}" onclick="toggleUsuarioEstado('${escaparParaJS(id)}', '${estado === "bloqueado" ? "activo" : "bloqueado"}')">
              ${estado === "bloqueado" ? "Activar" : "Bloquear"}
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.querySelectorAll('input[id^="saldoUser_"]').forEach(prepararInputSaldoUsuario);

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
  renderProveedores();
}

function cargarUsuarios() {
  db.ref("usuarios").on("value", (snapshot) => {
    usuariosCache = snapshot.val() || {};
    renderUsuarios();
    renderVentas();
    renderComprasHoy();
    renderDescargasEntregadas();
  }, () => {
    usuariosCache = {};
    renderUsuarios();
  });
}

/* =========================
PROVEEDORES
========================= */

function renderProveedores() {
  const totalEl = document.getElementById("totalProveedoresActivos");
  const tabla = document.getElementById("tablaProveedores");
  const tbody = document.querySelector("#tablaProveedores tbody");
  const vacio = document.getElementById("proveedoresVacio");

  const data = usuariosCache || {};
  let proveedoresLista = Object.keys(data)
    .map((id) => {
      const item = data[id] || {};
      const textoFiltro = [
        id,
        item.nombreCompleto || "",
        item.nombre || "",
        item.usuario || "",
        item.correo || "",
        item.email || "",
        item.rol || "",
        item.estado || ""
      ].join(" ");

      return {
        id,
        item,
        fechaOrden: timestampSeguro(item.fechaRegistro || item.fecha || 0),
        textoFiltro
      };
    })
    .filter(({ item }) => String(item.rol || "").toLowerCase() === "proveedor");

  if (filtroProveedoresAdmin) {
    proveedoresLista = proveedoresLista.filter(({ textoFiltro }) => coincideFiltroTexto(textoFiltro, filtroProveedoresAdmin));
  }

  const proveedoresActivos = proveedoresLista.filter(({ item }) => {
    return String(item.estado || "activo").toLowerCase() !== "bloqueado";
  });

  if (totalEl) totalEl.textContent = String(proveedoresActivos.length);

  if (!tabla || !tbody || !vacio) return;

  tbody.innerHTML = "";

  if (!proveedoresLista.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  proveedoresLista.sort((a, b) => b.fechaOrden - a.fechaOrden);

  proveedoresLista.forEach(({ id, item }) => {
    const estado = String(item.estado || "activo").toLowerCase();
    const nombre = item.nombreCompleto || item.nombre || item.usuario || "-";
    const correo = item.correo || item.email || "-";
    const usuario = item.usuario ? "@" + item.usuario : "-";
    const saldo = Number(item.saldo || 0);
    const fecha = item.fechaRegistro || item.fecha || "";
    const rol = item.rol || "proveedor";

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(id)}</td>
        <td>${escaparHTML(textoSeguro(nombre))}</td>
        <td>${escaparHTML(textoSeguro(correo))}</td>
        <td>${escaparHTML(textoSeguro(usuario))}</td>
        <td>${formatearDinero(saldo)}</td>
        <td>${escaparHTML(formatearFecha(fecha))}</td>
        <td>${badgeEstado(estado)}</td>
        <td>${badgeEstado(rol)}</td>
      </tr>
    `;
  });

  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarProveedores() {
  renderProveedores();
}
/* =========================
HELPERS EXTRA VENTAS / DESCARGAS / PROVEEDORES
========================= */

function buscarProductoAdminPorIdONombre(valor) {
  const texto = String(valor || "").trim().toLowerCase();
  if (!texto) return null;

  const data = productosCache || {};
  const ids = Object.keys(data);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const item = data[id] || {};
    const nombre = String(item.nombre || "").trim().toLowerCase();

    if (String(id).trim().toLowerCase() === texto || nombre === texto) {
      return { id, item };
    }
  }

  return null;
}

function obtenerProductoRelacionadoAdmin(item = {}) {
  const productoId = String(item.productoId || item.producto || "").trim();
  const encontradoPorId = buscarProductoAdminPorIdONombre(productoId);
  if (encontradoPorId) return encontradoPorId;

  const servicio = String(item.servicio || item.nombreProducto || "").trim();
  const encontradoPorServicio = buscarProductoAdminPorIdONombre(servicio);
  if (encontradoPorServicio) return encontradoPorServicio;

  return null;
}

function obtenerProveedorOrden(item = {}) {
  const directo = String(
    item.proveedorNombre ||
    item.proveedor ||
    item.vendedor ||
    ""
  ).trim();

  if (directo) return directo;

  const proveedorId = String(item.proveedorId || "").trim();
  if (proveedorId && usuariosCache[proveedorId]) {
    const prov = usuariosCache[proveedorId] || {};
    return prov.nombreCompleto || prov.nombre || prov.usuario || proveedorId;
  }

  const relacionado = obtenerProductoRelacionadoAdmin(item);
  if (relacionado && relacionado.item) {
    return relacionado.item.proveedorNombre || relacionado.item.proveedorId || "-";
  }

  return proveedorId || "-";
}

function obtenerComisionPlataformaOrden(item = {}) {
  const montoDirecto = Number(
    item.montoPlataforma ??
    item.gananciaPlataforma ??
    0
  );

  if (!isNaN(montoDirecto) && montoDirecto > 0) {
    return redondearMonto(montoDirecto);
  }

  const precio = Number(
    item.montoTotal ??
    item.total ??
    item.precioTotal ??
    item.monto ??
    item.precio ??
    0
  );

  if (isNaN(precio) || precio <= 0) return 0;

  const porcentaje = Number(item.porcentajePlataforma ?? item.comisionPlataforma ?? 4);
  return redondearMonto((precio * porcentaje) / 100);
}

function obtenerGananciaProveedorOrden(item = {}) {
  const montoDirecto = Number(item.montoProveedor ?? 0);
  if (!isNaN(montoDirecto) && montoDirecto > 0) return redondearMonto(montoDirecto);

  const precio = Number(
    item.montoTotal ??
    item.total ??
    item.precioTotal ??
    item.monto ??
    item.precio ??
    0
  );

  if (isNaN(precio) || precio <= 0) return 0;

  return redondearMonto(precio - obtenerComisionPlataformaOrden(item));
}

function obtenerTipoEntregaDesdeOrdenOProducto(item = {}) {
  const tipoEntrega = String(item.tipoEntrega || "").toLowerCase().trim();
  if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(tipoEntrega)) {
    return tipoEntrega;
  }

  const entregaVisual = String(item.entregaVisual || "").toLowerCase().trim();
  if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(entregaVisual)) {
    return entregaVisual;
  }

  const relacionado = obtenerProductoRelacionadoAdmin(item);
  if (relacionado && relacionado.item) {
    const prod = relacionado.item || {};
    const tipoProd = String(prod.tipoEntrega || "").toLowerCase().trim();
    const categoria = String(prod.categoria || "").toLowerCase().trim();
    const nombre = String(prod.nombre || "").toLowerCase().trim();

    if (["descarga", "plugin", "daw", "codigo", "cuenta"].includes(tipoProd)) return tipoProd;
    if (categoria.includes("plugin")) return "plugin";
    if (categoria.includes("daw")) return "daw";
    if (categoria.includes("descarga")) return "descarga";
    if (categoria.includes("licencia")) return "codigo";
    if (nombre.includes("windows 11 pro")) return "codigo";
  }

  return "cuenta";
}

function esOrdenDescargaOPlugin(item = {}) {
  const tipo = obtenerTipoEntregaDesdeOrdenOProducto(item);
  const linkEntrega = String(item.linkEntrega || "").trim();
  const plataforma = String(item.plataformaElegida || "").trim();

  return (
    tipo === "descarga" ||
    tipo === "plugin" ||
    tipo === "daw" ||
    linkEntrega !== "" ||
    plataforma !== ""
  );
}

function obtenerLinkEntregaOrden(item = {}) {
  const directo = String(item.linkEntrega || "").trim();
  if (directo) return directo;

  const relacionado = obtenerProductoRelacionadoAdmin(item);
  const prod = relacionado ? (relacionado.item || {}) : {};
  const opciones = prod.opcionesEntrega || {};
  const plataforma = String(item.plataformaElegida || "general").toLowerCase().trim();

  const linkPlataforma = String(opciones?.[plataforma]?.link || "").trim();
  if (linkPlataforma) return linkPlataforma;

  const linkGeneral = String(opciones?.general?.link || "").trim();
  if (linkGeneral) return linkGeneral;

  return String(prod.linkDescarga || "").trim();
}

function actualizarCabeceraTablaVentasAdmin() {
  const tabla = document.getElementById("tablaVentas");
  if (!tabla) return;

  const ths = tabla.querySelectorAll("thead th");
  if (!ths || !ths.length) return;

  if (ths[3]) ths[3].textContent = "Proveedor";
  if (ths[4]) ths[4].textContent = "Comisión plataforma";
  if (ths[5]) ths[5].textContent = "Ganancia proveedor";
}

function actualizarCabeceraTablaComprasHoyAdmin() {
  const tabla = document.getElementById("tablaComprasHoy");
  if (!tabla) return;

  const ths = tabla.querySelectorAll("thead th");
  if (!ths || !ths.length) return;

  if (ths[3]) ths[3].textContent = "Proveedor";
  if (ths[4]) ths[4].textContent = "Comisión plataforma";
  if (ths[5]) ths[5].textContent = "Ganancia proveedor";
}

/* =========================
RECARGAS
========================= */

function actualizarBotonesModalRecarga(item = {}) {
  const btnAprobar = document.getElementById("modalBtnAprobar");
  const btnRechazar = document.getElementById("modalBtnRechazar");
  const btnEliminar = document.getElementById("modalBtnEliminar");
  const btnAbrir = document.getElementById("modalBtnAbrirArchivo");
  const montoEditable = document.getElementById("modalRecargaMontoEditable");

  if (!btnAprobar || !btnRechazar || !btnEliminar || !btnAbrir || !montoEditable) return;

  const estado = normalizarEstadoRecarga(item.estado);

  btnAbrir.disabled = !item.comprobanteURL;
  btnAbrir.style.opacity = item.comprobanteURL ? "1" : "0.6";

  if (estado === "aprobada" || estado === "rechazada") {
    btnAprobar.style.display = "none";
    btnRechazar.style.display = "none";
    btnEliminar.style.display = "inline-flex";
    btnEliminar.disabled = false;
    montoEditable.disabled = true;
    montoEditable.style.opacity = "0.7";
    return;
  }

  btnAprobar.style.display = "inline-flex";
  btnRechazar.style.display = "inline-flex";
  btnEliminar.style.display = "inline-flex";

  btnAprobar.disabled = recargaProcesando;
  btnRechazar.disabled = recargaProcesando;
  btnEliminar.disabled = recargaProcesando;

  btnAprobar.textContent = recargaProcesando ? "Procesando..." : "Aprobar";
  btnRechazar.textContent = recargaProcesando ? "Procesando..." : "Rechazar";

  montoEditable.disabled = recargaProcesando;
  montoEditable.style.opacity = recargaProcesando ? "0.7" : "1";
}

function actualizarContenidoModalRecarga(item, id) {
  modalRecargaActual = { id, ...item };

  document.getElementById("modalRecargaId").textContent = id;
  document.getElementById("modalRecargaNombre").textContent = textoSeguro(item.nombre, "-");
  document.getElementById("modalRecargaUsuario").textContent = item.usuario ? "@" + item.usuario : textoSeguro(item.nombre, "-");
  document.getElementById("modalRecargaUid").textContent = textoSeguro(item.uidUsuario || item.uid, "-");
  document.getElementById("modalRecargaMonto").textContent = formatearDinero(item.montoAprobado ?? item.monto ?? 0);
  document.getElementById("modalRecargaMetodo").textContent = textoSeguro(item.metodoPago, "-");
  document.getElementById("modalRecargaOperacion").textContent = textoSeguro(item.operacion || item.numeroOperacion, "-");
  document.getElementById("modalRecargaFecha").textContent = formatearFecha(item.fecha || item.fechaHora || item.updatedAt || item.fechaAprobacion || item.fechaRechazo);
  document.getElementById("modalRecargaEmail").textContent = textoSeguro(item.email, "-");
  badgeEstadoRecargaModal(item.estado);

  const montoEditable = document.getElementById("modalRecargaMontoEditable");
  if (montoEditable) {
    montoEditable.value = Number(item.montoAprobado ?? item.monto ?? 0);
    permitirSoloNumerosDecimales(montoEditable);
  }

  const wrap = document.getElementById("recargaPreviewWrap");
  if (wrap) {
    if (item.comprobanteURL) {
      wrap.innerHTML = `<img id="recargaPreviewImg" src="${escaparHTML(item.comprobanteURL)}" alt="Comprobante">`;
    } else {
      wrap.innerHTML = `<div class="adminModalEmpty">Esta recarga no tiene comprobante adjunto.</div>`;
    }
  }

  const btnAbrir = document.getElementById("modalBtnAbrirArchivo");
  const btnAprobar = document.getElementById("modalBtnAprobar");
  const btnRechazar = document.getElementById("modalBtnRechazar");
  const btnEliminar = document.getElementById("modalBtnEliminar");

  if (btnAbrir) {
    btnAbrir.textContent = item.comprobanteURL ? "Abrir imagen" : "Sin archivo";
    btnAbrir.onclick = () => {
      if (item.comprobanteURL) window.open(item.comprobanteURL, "_blank");
    };
  }

  if (btnAprobar) btnAprobar.onclick = () => aprobarRecarga(id);
  if (btnRechazar) btnRechazar.onclick = () => rechazarRecarga(id);
  if (btnEliminar) btnEliminar.onclick = () => eliminarRegistroConfirmado("recargas/" + id, "Recarga eliminada del historial.", mostrarMensajeRecarga);

  actualizarBotonesModalRecarga(item);
}

function abrirModalRecarga(id) {
  const item = recargasCacheAdmin[id];
  if (!item) {
    mostrarMensajeRecarga("No se encontró la recarga seleccionada.", true);
    return;
  }

  recargaProcesando = false;
  actualizarContenidoModalRecarga(item, id);
  const modal = document.getElementById("modalRecarga");
  if (modal) modal.classList.add("show");
}

function cerrarModalRecarga() {
  modalRecargaActual = null;
  recargaProcesando = false;
  const modal = document.getElementById("modalRecarga");
  if (modal) modal.classList.remove("show");
}

function cerrarModalRecargaFondo(event) {
  if (event.target && event.target.id === "modalRecarga") cerrarModalRecarga();
}

function aprobarRecarga(id) {
  if (recargaProcesando) return;
  recargaProcesando = true;

  const montoEditableInput = document.getElementById("modalRecargaMontoEditable");
  permitirSoloNumerosDecimales(montoEditableInput);

  let montoEditable = Number(montoEditableInput?.value || 0);

  if (recargasCacheAdmin[id]) actualizarBotonesModalRecarga(recargasCacheAdmin[id]);

  db.ref("recargas/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La recarga no existe.");

      const uid = item.uidUsuario || item.uid || "";
      const estadoActual = normalizarEstadoRecarga(item.estado);

      if (!uid) throw new Error("La recarga no tiene uidUsuario o uid.");
      if (estadoActual === "aprobada") throw new Error("Esta recarga ya fue aprobada.");
      if (estadoActual === "rechazada") throw new Error("Esta recarga ya fue rechazada.");

      if (isNaN(montoEditable) || montoEditable <= 0) {
        montoEditable = Number(item.monto || 0);
      }

      if (isNaN(montoEditable) || montoEditable <= 0) {
        throw new Error("El monto a aprobar no es válido.");
      }

      montoEditable = redondearMonto(montoEditable);

      return db.ref("usuarios/" + uid).once("value").then((snapshot) => {
        const usuario = snapshot.val();
        if (!usuario) throw new Error("No existe el usuario en /usuarios/" + uid);

        const saldoActual = Number(usuario.saldo || 0);
        const nuevoSaldo = redondearMonto(saldoActual + montoEditable);
        const ahora = Date.now();

        const updates = {};
        updates["usuarios/" + uid + "/saldo"] = nuevoSaldo;
        updates["recargas/" + id + "/estado"] = "aprobada";
        updates["recargas/" + id + "/montoAprobado"] = montoEditable;
        updates["recargas/" + id + "/fechaAprobacion"] = ahora;
        updates["recargas/" + id + "/updatedAt"] = ahora;

        return db.ref().update(updates);
      });
    })
    .then(() => db.ref("recargas/" + id).once("value"))
    .then((snap) => {
      const actualizado = snap.val() || {};
      recargasCacheAdmin[id] = actualizado;
      recargaProcesando = false;
      mostrarMensajeRecarga("Recarga aprobada y saldo sumado correctamente.");

      if (modalRecargaActual && modalRecargaActual.id === id) {
        actualizarContenidoModalRecarga(actualizado, id);
      }
    })
    .catch((error) => {
      recargaProcesando = false;
      if (modalRecargaActual && modalRecargaActual.id === id && recargasCacheAdmin[id]) {
        actualizarBotonesModalRecarga(recargasCacheAdmin[id]);
      }
      mostrarMensajeRecarga("Error al aprobar recarga: " + error.message, true);
    });
}

function rechazarRecarga(id) {
  if (recargaProcesando) return;
  recargaProcesando = true;

  if (recargasCacheAdmin[id]) actualizarBotonesModalRecarga(recargasCacheAdmin[id]);

  db.ref("recargas/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La recarga no existe.");

      const estadoActual = normalizarEstadoRecarga(item.estado);

      if (estadoActual === "aprobada") throw new Error("No puedes rechazar una recarga ya aprobada.");
      if (estadoActual === "rechazada") throw new Error("Esta recarga ya fue rechazada.");

      return db.ref("recargas/" + id).update({
        estado: "rechazada",
        fechaRechazo: Date.now(),
        updatedAt: Date.now()
      });
    })
    .then(() => db.ref("recargas/" + id).once("value"))
    .then((snap) => {
      const actualizado = snap.val() || {};
      recargasCacheAdmin[id] = actualizado;
      recargaProcesando = false;
      mostrarMensajeRecarga("Recarga rechazada correctamente.");

      if (modalRecargaActual && modalRecargaActual.id === id) {
        actualizarContenidoModalRecarga(actualizado, modalRecargaActual.id);
      }
    })
    .catch((error) => {
      recargaProcesando = false;
      if (modalRecargaActual && modalRecargaActual.id === id && recargasCacheAdmin[id]) {
        actualizarBotonesModalRecarga(recargasCacheAdmin[id]);
      }
      mostrarMensajeRecarga("Error al rechazar recarga: " + error.message, true);
    });
}

function escucharNuevasRecargasPendientes() {
  if (recargasListenerActivo) return;
  recargasListenerActivo = true;

  db.ref("recargas").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const nuevasPendientes = {};

    Object.keys(data).forEach((id) => {
      const item = data[id] || {};
      const estado = normalizarEstadoRecarga(item.estado);
      if (estado === "pendiente") nuevasPendientes[id] = true;
    });

    if (!recargasInicializadas) {
      recargasPendientesCache = nuevasPendientes;
      recargasInicializadas = true;
      return;
    }

    const idsActuales = Object.keys(nuevasPendientes);
    const idsAnteriores = Object.keys(recargasPendientesCache);
    const hayNueva = idsActuales.some((id) => !idsAnteriores.includes(id));

    if (hayNueva) {
      reproducirSonidoRecarga();
      mostrarMensajeRecarga("Nueva solicitud de recarga pendiente.");
    }

    recargasPendientesCache = nuevasPendientes;
  });
}

function cargarRecargas() {
  db.ref("recargas").on("value", (snapshot) => {
    const data = snapshot.val();
    const tbody = document.querySelector("#tablaRecargas tbody");
    const tabla = document.getElementById("tablaRecargas");
    const vacio = document.getElementById("recargasVacio");

    if (!tbody || !tabla || !vacio) return;
    tbody.innerHTML = "";
    recargasCacheAdmin = {};

    if (!data || typeof data !== "object") {
      tabla.classList.add("hidden");
      vacio.classList.remove("hidden");
      document.getElementById("totalRecargas").textContent = "0";
      if (modalRecargaActual) cerrarModalRecarga();
      return;
    }

    const keys = Object.keys(data)
      .filter((id) => data[id] && typeof data[id] === "object" && id !== "temp")
      .sort((a, b) => {
        return timestampSeguro(data[b].updatedAt || data[b].fecha || data[b].fechaHora) -
               timestampSeguro(data[a].updatedAt || data[a].fecha || data[a].fechaHora);
      });

    let totalPendientes = 0;

    keys.forEach((id) => {
      const item = data[id] || {};
      const estado = normalizarEstadoRecarga(item.estado);
      recargasCacheAdmin[id] = item;
      if (estado === "pendiente") totalPendientes++;
    });

    document.getElementById("totalRecargas").textContent = totalPendientes;

    if (!keys.length) {
      tabla.classList.add("hidden");
      vacio.classList.remove("hidden");
      if (modalRecargaActual) cerrarModalRecarga();
      return;
    }

    keys.forEach((id) => {
      const item = data[id] || {};
      const estado = normalizarEstadoRecarga(item.estado);
      const usuarioMostrado = item.usuario ? "@" + item.usuario : (item.nombre || item.uid || "-");

      tbody.innerHTML += `
        <tr>
          <td>${escaparHTML(id)}</td>
          <td>${escaparHTML(usuarioMostrado)}</td>
          <td>${escaparHTML(textoSeguro(item.uidUsuario || item.uid))}</td>
          <td>${formatearDinero(item.montoAprobado ?? item.monto ?? 0)}</td>
          <td>${escaparHTML(textoSeguro(item.metodoPago))}</td>
          <td>${escaparHTML(textoSeguro(item.operacion || item.numeroOperacion))}</td>
          <td>
            <button class="smallBtn btnSave" onclick="abrirModalRecarga('${escaparParaJS(id)}')">Ver info</button>
          </td>
          <td>${badgeEstado(estado)}</td>
          <td>${escaparHTML(formatearFecha(item.fecha || item.fechaHora || item.updatedAt || item.fechaAprobacion || item.fechaRechazo))}</td>
          <td>
            <div class="actionGroup">
              <button class="smallBtn btnDelete" onclick="eliminarRegistroConfirmado('recargas/${escaparParaJS(id)}', 'Recarga eliminada del historial.', mostrarMensajeRecarga)">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    });

    tabla.classList.remove("hidden");
    vacio.classList.add("hidden");

    if (modalRecargaActual && modalRecargaActual.id) {
      const recargaActualizada = recargasCacheAdmin[modalRecargaActual.id];
      if (!recargaActualizada) {
        cerrarModalRecarga();
      } else {
        actualizarContenidoModalRecarga(recargaActualizada, modalRecargaActual.id);
      }
    }
  }, (error) => {
    console.error("Error leyendo recargas:", error);
    const tabla = document.getElementById("tablaRecargas");
    const vacio = document.getElementById("recargasVacio");
    const total = document.getElementById("totalRecargas");
    if (tabla) tabla.classList.add("hidden");
    if (vacio) vacio.classList.remove("hidden");
    if (total) total.textContent = "0";
    mostrarMensajeRecarga("No se pudieron leer las recargas. Revisa tus rules.", true);
  });
}

/* =========================
REEMBOLSOS
========================= */

function restaurarCuentaPorReembolso(uid, ordenId, orden = {}) {
  const producto = String(orden.producto || orden.servicio || "").trim().toLowerCase();
  if (!uid || !ordenId || !producto) return Promise.resolve(false);

  return db.ref("cuentas/" + producto).once("value")
    .then((snapshot) => {
      const cuentasProducto = snapshot.val() || {};
      let cuentaIdEncontrada = null;
      let cuentaData = null;

      Object.keys(cuentasProducto).forEach((cuentaId) => {
        if (cuentaIdEncontrada) return;

        const item = cuentasProducto[cuentaId] || {};
        const mismoUid = String(item.uidUsuario || "") === String(uid);
        const mismaOrden = String(item.ordenId || "") === String(ordenId);

        if (mismoUid && mismaOrden) {
          cuentaIdEncontrada = cuentaId;
          cuentaData = item;
        }
      });

      if (!cuentaIdEncontrada || !cuentaData) return false;

      const duracionDias = Number(cuentaData.duracionDias || orden.duracionDias || 30);
      const nuevaFechaCreacion = new Date().toISOString();
      const nuevaFechaVencimiento = sumarDias(nuevaFechaCreacion, duracionDias);

      return db.ref("cuentas/" + producto + "/" + cuentaIdEncontrada).update({
        estado: "disponible",
        comprador: "",
        uidUsuario: "",
        fechaEntrega: "",
        ordenId: "",
        fechaCreacion: nuevaFechaCreacion,
        fechaVencimiento: nuevaFechaVencimiento
      }).then(() => true);
    });
}

function aprobarReembolso(id) {
  db.ref("reembolsos/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La solicitud no existe.");

      const uid = item.uidUsuario || "";
      const ordenId = item.ordenId || "";
      const monto = Number(item.monto || item.precio || 0);
      const estadoActual = String(item.estado || "").toLowerCase();

      if (!uid) throw new Error("La solicitud no tiene uidUsuario.");
      if (!ordenId) throw new Error("La solicitud no tiene ordenId.");
      if (isNaN(monto) || monto <= 0) throw new Error("Monto inválido.");
      if (estadoActual === "aprobado") throw new Error("Este reembolso ya fue aprobado.");
      if (estadoActual === "rechazado") throw new Error("Este reembolso ya fue rechazado.");

      return Promise.all([
        db.ref("usuarios/" + uid).once("value"),
        db.ref("ordenes/" + uid + "/" + ordenId).once("value")
      ]).then(([usuarioSnap, ordenSnap]) => {
        const usuario = usuarioSnap.val();
        const orden = ordenSnap.val();

        if (!usuario) throw new Error("No existe el usuario del reembolso.");
        if (!orden) throw new Error("No existe la orden vinculada.");

        const tipoEntrega = String(orden.tipoEntrega || "").toLowerCase();
        const esCodigo = orden.esCodigo === true || tipoEntrega === "codigo";
        const esLicencia = orden.esLicencia === true || tipoEntrega === "plugin" || tipoEntrega === "descarga" || tipoEntrega === "daw";

        if (esCodigo || esLicencia) {
          throw new Error("Los reembolsos solo están habilitados para compras entregadas con cuentas, no para códigos, plugins, DAW o descargas.");
        }

        if (!reembolsoDentroDeTiempo(orden.fechaCompra)) {
          throw new Error("El plazo de 24 horas para reembolso ya venció.");
        }

        const saldoActual = Number(usuario.saldo || 0);
        const nuevoSaldo = Number((saldoActual + monto).toFixed(2));
        const ahora = Date.now();

        const historialReembolso = {
          ...orden,
          ordenIdOriginal: ordenId,
          uidUsuario: uid,
          reembolsoId: id,
          estado: "reembolsado",
          fechaReembolso: ahora,
          montoReembolsado: monto
        };

        return restaurarCuentaPorReembolso(uid, ordenId, orden).then((cuentaRestaurada) => {
          const updates = {};
          updates["usuarios/" + uid + "/saldo"] = nuevoSaldo;
          updates["ordenesReembolsadas/" + uid + "/" + ordenId] = {
            ...historialReembolso,
            cuentaRestaurada: !!cuentaRestaurada
          };
          updates["reembolsos/" + id + "/estado"] = "aprobado";
          updates["reembolsos/" + id + "/fechaAprobacion"] = ahora;
          updates["reembolsos/" + id + "/cuentaRestaurada"] = !!cuentaRestaurada;
          updates["ordenes/" + uid + "/" + ordenId] = null;

          return db.ref().update(updates).then(() => cuentaRestaurada);
        });
      });
    })
    .then((cuentaRestaurada) => {
      programarRecalculoStockSilencioso();

      if (cuentaRestaurada) {
        mostrarMensajeReembolso("Reembolso aprobado, saldo devuelto, compra eliminada y cuenta restaurada automáticamente al stock.");
      } else {
        mostrarMensajeReembolso("Reembolso aprobado y saldo devuelto. No se encontró la cuenta vinculada para restaurarla automáticamente.", true);
      }
    })
    .catch((error) => mostrarMensajeReembolso("Error al aprobar reembolso: " + error.message, true));
}

function rechazarReembolso(id) {
  db.ref("reembolsos/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La solicitud no existe.");

      const estadoActual = String(item.estado || "").toLowerCase();
      if (estadoActual === "aprobado") throw new Error("No puedes rechazar un reembolso ya aprobado.");
      if (estadoActual === "rechazado") throw new Error("Este reembolso ya fue rechazado.");

      return db.ref("reembolsos/" + id).update({
        estado: "rechazado",
        fechaRechazo: Date.now()
      });
    })
    .then(() => mostrarMensajeReembolso("Reembolso rechazado correctamente."))
    .catch((error) => mostrarMensajeReembolso("Error al rechazar reembolso: " + error.message, true));
}

function cargarReembolsos() {
  db.ref("reembolsos").on("value", (snapshot) => {
    const data = snapshot.val();
    const tbody = document.querySelector("#tablaReembolsos tbody");
    const tabla = document.getElementById("tablaReembolsos");
    const vacio = document.getElementById("reembolsosVacio");

    if (!tbody || !tabla || !vacio) return;
    tbody.innerHTML = "";

    if (!data || typeof data !== "object") {
      tabla.classList.add("hidden");
      vacio.classList.remove("hidden");
      document.getElementById("totalReembolsos").textContent = "0";
      return;
    }

    const keys = Object.keys(data)
      .filter((id) => data[id] && typeof data[id] === "object")
      .sort((a, b) => timestampSeguro(data[b].fechaSolicitud) - timestampSeguro(data[a].fechaSolicitud));

    let totalPendientes = 0;

    keys.forEach((id) => {
      const item = data[id] || {};
      const estado = String(item.estado || "pendiente").toLowerCase().trim();
      if (estado !== "aprobado" && estado !== "rechazado") totalPendientes++;
    });

    document.getElementById("totalReembolsos").textContent = totalPendientes;

    if (!keys.length) {
      tabla.classList.add("hidden");
      vacio.classList.remove("hidden");
      return;
    }

    keys.forEach((id) => {
      const item = data[id] || {};
      const estado = String(item.estado || "pendiente").toLowerCase().trim();
      const usuarioMostrado = item.usuario ? "@" + item.usuario : (item.nombreComprador || item.uidUsuario || "-");

      tbody.innerHTML += `
        <tr>
          <td>${escaparHTML(id)}</td>
          <td>${escaparHTML(textoSeguro(usuarioMostrado))}</td>
          <td>${escaparHTML(textoSeguro(item.uidUsuario))}</td>
          <td>${escaparHTML(textoSeguro(item.ordenId))}</td>
          <td>${escaparHTML(textoSeguro(item.servicio))}</td>
          <td>${formatearDinero(item.monto || 0)}</td>
          <td>${badgeEstado(estado)}</td>
          <td>${escaparHTML(formatearFecha(item.fechaSolicitud))}</td>
          <td>
            <div class="actionGroup">
              ${estado !== "aprobado" && estado !== "rechazado"
                ? `<button class="smallBtn btnSave" onclick="aprobarReembolso('${escaparParaJS(id)}')">Aprobar</button>
                   <button class="smallBtn btnDelete" onclick="rechazarReembolso('${escaparParaJS(id)}')">Rechazar</button>`
                : ""
              }
              <button class="smallBtn btnDelete" onclick="eliminarRegistroConfirmado('reembolsos/${escaparParaJS(id)}', 'Reembolso eliminado del historial.', mostrarMensajeReembolso)">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    });

    tabla.classList.remove("hidden");
    vacio.classList.add("hidden");
  }, (error) => {
    console.error("Error leyendo reembolsos:", error);
    document.getElementById("tablaReembolsos").classList.add("hidden");
    document.getElementById("reembolsosVacio").classList.remove("hidden");
    document.getElementById("totalReembolsos").textContent = "0";
    mostrarMensajeReembolso("No se pudieron leer los reembolsos. Revisa tus rules.", true);
  });
}

/* =========================
RETIROS DE PROVEEDORES
========================= */

function aprobarRetiroProveedor(id) {
  db.ref("retirosProveedores/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La solicitud de retiro no existe.");

      const proveedorId = item.proveedorId || "";
      const monto = Number(item.monto || 0);
      const estadoActual = String(item.estado || "").toLowerCase().trim();

      if (!proveedorId) throw new Error("La solicitud no tiene proveedorId.");
      if (isNaN(monto) || monto <= 0) throw new Error("Monto inválido.");
      if (estadoActual === "aprobado") throw new Error("Este retiro ya fue aprobado.");
      if (estadoActual === "rechazado") throw new Error("Este retiro ya fue rechazado.");

      return db.ref("usuarios/" + proveedorId).once("value").then((usuarioSnap) => {
        const proveedor = usuarioSnap.val();
        if (!proveedor) throw new Error("No existe el proveedor.");

        const saldoActual = Number(proveedor.saldo || 0);
        if (monto > saldoActual) throw new Error("El proveedor no tiene saldo suficiente para aprobar este retiro.");

        const nuevoSaldo = redondearMonto(saldoActual - monto);
        const ahora = Date.now();

        const movimientoRef = db.ref("movimientosSaldo").push();
        const updates = {};
        updates["usuarios/" + proveedorId + "/saldo"] = nuevoSaldo;
        updates["retirosProveedores/" + id + "/estado"] = "aprobado";
        updates["retirosProveedores/" + id + "/fechaResolucion"] = ahora;
        updates["retirosProveedores/" + id + "/adminUid"] = auth.currentUser ? auth.currentUser.uid : "";
        updates["retirosProveedores/" + id + "/movimientoId"] = movimientoRef.key;
        updates["movimientosSaldo/" + movimientoRef.key] = {
          proveedorId,
          tipo: "retiro aprobado",
          detalle: "Retiro aprobado por administrador",
          monto,
          signo: "-",
          retiroId: id,
          fecha: ahora
        };

        return db.ref().update(updates);
      });
    })
    .then(() => {
      mostrarMensajeProducto("Retiro aprobado correctamente y saldo descontado al proveedor.");
    })
    .catch((error) => {
      mostrarMensajeProducto("Error al aprobar retiro: " + error.message, true);
    });
}

function rechazarRetiroProveedor(id) {
  db.ref("retirosProveedores/" + id).once("value")
    .then((snap) => {
      const item = snap.val();
      if (!item || typeof item !== "object") throw new Error("La solicitud de retiro no existe.");

      const estadoActual = String(item.estado || "").toLowerCase().trim();
      if (estadoActual === "aprobado") throw new Error("No puedes rechazar un retiro ya aprobado.");
      if (estadoActual === "rechazado") throw new Error("Este retiro ya fue rechazado.");

      return db.ref("retirosProveedores/" + id).update({
        estado: "rechazado",
        fechaResolucion: Date.now(),
        adminUid: auth.currentUser ? auth.currentUser.uid : ""
      });
    })
    .then(() => {
      mostrarMensajeProducto("Retiro rechazado correctamente.");
    })
    .catch((error) => {
      mostrarMensajeProducto("Error al rechazar retiro: " + error.message, true);
    });
}

function cargarRetirosProveedores() {
  const tabla = document.getElementById("tablaRetirosProveedores");
  const vacio = document.getElementById("retirosProveedoresVacio");
  const tbody = document.querySelector("#tablaRetirosProveedores tbody");
  const total = document.getElementById("totalRetirosProveedores");

  if (!tabla || !vacio || !tbody) return;

  db.ref("retirosProveedores").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    tbody.innerHTML = "";

    const ids = Object.keys(data).sort((a, b) => {
      return timestampSeguro(data[b].fechaSolicitud || data[b].fechaResolucion) -
             timestampSeguro(data[a].fechaSolicitud || data[a].fechaResolucion);
    });

    let pendientes = 0;

    ids.forEach((id) => {
      const item = data[id] || {};
      const estado = String(item.estado || "pendiente").toLowerCase().trim();
      if (estado === "pendiente") pendientes++;
    });

    if (total) total.textContent = String(pendientes);

    if (!ids.length) {
      tabla.classList.add("hidden");
      vacio.classList.remove("hidden");
      return;
    }

    ids.forEach((id) => {
      const item = data[id] || {};
      const estado = String(item.estado || "pendiente").toLowerCase().trim();

      tbody.innerHTML += `
        <tr>
          <td>${escaparHTML(id)}</td>
          <td>${escaparHTML(textoSeguro(item.proveedorNombre))}</td>
          <td>${escaparHTML(textoSeguro(item.proveedorId))}</td>
          <td>${formatearDinero(item.monto || 0)}</td>
          <td>${escaparHTML(textoSeguro(item.metodo))}</td>
          <td>${escaparHTML(textoSeguro(item.datoPago))}</td>
          <td>${badgeEstado(estado)}</td>
          <td>${escaparHTML(formatearFecha(item.fechaSolicitud))}</td>
          <td>${escaparHTML(formatearFecha(item.fechaResolucion))}</td>
          <td>
            <div class="actionGroup">
              ${estado === "pendiente"
                ? `<button class="smallBtn btnSave" onclick="aprobarRetiroProveedor('${escaparParaJS(id)}')">Aprobar</button>
                   <button class="smallBtn btnDelete" onclick="rechazarRetiroProveedor('${escaparParaJS(id)}')">Rechazar</button>`
                : ""
              }
              <button class="smallBtn btnDelete" onclick="eliminarRegistroConfirmado('retirosProveedores/${escaparParaJS(id)}', 'Retiro eliminado del historial.', mostrarMensajeProducto)">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    });

    tabla.classList.remove("hidden");
    vacio.classList.add("hidden");
  });
}

/* =========================
COMISIONES PROVEEDORES PENDIENTES
========================= */

function programarProcesoComisionesProveedores() {
  if (!listenerComisionesProveedoresActivo) return;
  clearTimeout(timeoutComisionesProveedores);
  timeoutComisionesProveedores = setTimeout(() => {
    procesarComisionesProveedoresPendientes();
  }, 1200);
}

function escucharComisionesProveedoresPendientes() {
  if (listenerComisionesProveedoresActivo) return;
  listenerComisionesProveedoresActivo = true;
  programarProcesoComisionesProveedores();
}

function acreditarSaldoProveedorDesdeAdmin(proveedorId, monto) {
  return new Promise((resolve, reject) => {
    if (!proveedorId || Number(monto || 0) <= 0) {
      resolve({ ok: false, motivo: "SIN_PROVEEDOR_O_MONTO" });
      return;
    }

    db.ref("usuarios/" + proveedorId + "/saldo").transaction((saldoActual) => {
      const saldo = Number(saldoActual || 0);
      return redondearMonto(saldo + Number(monto || 0));
    }, (error, committed, snapshot) => {
      if (error) return reject(error);
      if (!committed) return reject(new Error("NO_SE_PUDO_ACREDITAR_SALDO_PROVEEDOR"));

      resolve({
        ok: true,
        saldoFinal: Number(snapshot.val() || 0)
      });
    });
  });
}

async function procesarComisionProveedorIndividual(ventaData) {
  const path = ventaData.path;
  const item = ventaData.item || {};
  const proveedorId = String(item.proveedorId || "").trim();
  const montoProveedor = Number(item.montoProveedor || 0);
  const productoId = String(item.productoId || ventaData.productoId || "").trim();
  const productoNombre = item.producto || item.productoNombre || productoId || "";
  const compradorNombre = item.nombre || item.comprador || item.cliente || "";
  const ventaId = ventaData.ventaId || "";

  if (!proveedorId || proveedorId === "admin_principal" || montoProveedor <= 0) return;

  await db.ref(path).update({
    comisionProveedorProcesando: true,
    errorComisionProveedor: null
  });

  let movimientoRef = null;

  try {
    await acreditarSaldoProveedorDesdeAdmin(proveedorId, montoProveedor);

    movimientoRef = db.ref("movimientosSaldo").push();
    await movimientoRef.set({
      proveedorId,
      tipo: "venta",
      detalle: "Venta acreditada por administrador",
      monto: redondearMonto(montoProveedor),
      signo: "+",
      productoId,
      productoNombre,
      compradorNombre,
      ventaId,
      fecha: Date.now()
    });

    await db.ref(path).update({
      comisionProveedorProcesada: true,
      comisionProveedorProcesando: false,
      comisionProveedorPendiente: false,
      fechaComisionProveedor: Date.now(),
      movimientoProveedorId: movimientoRef.key || "",
      errorComisionProveedor: null
    });
  } catch (error) {
    if (movimientoRef && movimientoRef.key) {
      try { await movimientoRef.remove(); } catch (_) {}
    }

    await db.ref(path).update({
      comisionProveedorProcesada: false,
      comisionProveedorProcesando: false,
      comisionProveedorPendiente: true,
      errorComisionProveedor: String(error.message || error || "ERROR_COMISION")
    });
  }
}

async function procesarComisionesProveedoresPendientes() {
  if (!listenerComisionesProveedoresActivo) return;
  if (procesandoComisionesProveedores) return;

  procesandoComisionesProveedores = true;

  try {
    const pendientes = extraerVentasPendientesProveedor(ventasCache || {});
    if (!pendientes.length) return;

    for (let i = 0; i < pendientes.length; i++) {
      await procesarComisionProveedorIndividual(pendientes[i]);
    }
  } catch (error) {
    console.error("Error procesando comisiones de proveedores:", error);
  } finally {
    procesandoComisionesProveedores = false;
  }
}

/* =========================
ELIMINAR / VACIAR
========================= */

function eliminarRegistroConfirmado(path, exitoTexto, callbackMsg) {
  if (!confirm("¿Seguro que quieres eliminar este registro del historial?")) return;

  db.ref(path).remove()
    .then(() => {
      if (path.startsWith("recargas/")) {
        const id = path.split("/")[1];
        delete recargasCacheAdmin[id];
        if (modalRecargaActual && modalRecargaActual.id === id) cerrarModalRecarga();
      }

      if (typeof callbackMsg === "function") callbackMsg(exitoTexto, false);
    })
    .catch((error) => {
      if (typeof callbackMsg === "function") callbackMsg("Error: " + error.message, true);
    });
}

function vaciarNodoConfirmado(path, aviso) {
  if (!confirm(aviso + " Esta acción no se puede deshacer.")) return;

  db.ref(path).remove()
    .then(() => {
      if (path === "recargas") {
        recargasCacheAdmin = {};
        recargasPendientesCache = {};
        recargasInicializadas = false;
        cerrarModalRecarga();
        mostrarMensajeRecarga("Historial de recargas eliminado.");
      } else if (path === "reembolsos") {
        mostrarMensajeReembolso("Historial de reembolsos eliminado.");
      } else if (path === "ventas") {
        mostrarMensajeProducto("Historial de ventas eliminado.");
      } else if (path === "codigos") {
        mostrarMensajeCodigo("Historial de códigos eliminado.");
        programarRecalculoStockSilencioso();
      } else if (path === "retirosProveedores") {
        mostrarMensajeProducto("Historial de retiros de proveedores eliminado.");
      } else if (path === "comprasHoy") {
        mostrarMensajeProducto("Historial de compras hoy eliminado.");
      }
    })
    .catch((error) => {
      if (path === "recargas") mostrarMensajeRecarga("Error: " + error.message, true);
      if (path === "reembolsos") mostrarMensajeReembolso("Error: " + error.message, true);
      if (path === "ventas") mostrarMensajeProducto("Error: " + error.message, true);
      if (path === "codigos") mostrarMensajeCodigo("Error: " + error.message, true);
      if (path === "retirosProveedores") mostrarMensajeProducto("Error: " + error.message, true);
      if (path === "comprasHoy") mostrarMensajeProducto("Error: " + error.message, true);
    });
}

function vaciarComprasHoyConfirmado() {
  if (!confirm("Se vaciará el historial de compras hoy. Esta acción no se puede deshacer.")) return;

  Promise.all([
    db.ref("comprasHoy").remove(),
    db.ref("comprasHoyEliminadas").remove()
  ])
    .then(() => mostrarMensajeProducto("Compras hoy reiniciado correctamente."))
    .catch((error) => mostrarMensajeProducto("Error: " + error.message, true));
}

function vaciarCuentasUsadasConfirmado() {
  if (!confirm("Se eliminarán del historial todas las cuentas marcadas como usadas. Esta acción no se puede deshacer.")) return;

  db.ref("cuentas").once("value")
    .then((snapshot) => {
      const data = snapshot.val() || {};
      const updates = {};

      Object.keys(data).forEach((producto) => {
        const cuentasProducto = data[producto] || {};
        Object.keys(cuentasProducto).forEach((cuentaId) => {
          const item = cuentasProducto[cuentaId] || {};
          const estado = String(item.estado || "").toLowerCase();
          if (estado !== "disponible") {
            updates["cuentas/" + producto + "/" + cuentaId] = null;
          }
        });
      });

      return db.ref().update(updates);
    })
    .then(() => {
      programarRecalculoStockSilencioso();
      mostrarMensajeCuenta("Historial de cuentas usadas eliminado.");
    })
    .catch((error) => mostrarMensajeCuenta("Error: " + error.message, true));
}

/* =========================
VENTAS Y COMPRAS HOY
========================= */

function obtenerMontoVenta(item = {}) {
  return obtenerComisionPlataformaOrden(item);
}

function extraerVentasDesdeNodoVentas(data) {
  const ventasLista = [];

  Object.keys(data || {}).forEach((clavePadre) => {
    const bloque = data[clavePadre];
    if (!bloque || typeof bloque !== "object") return;

    const esVentaDirecta =
      bloque.producto ||
      bloque.plan ||
      bloque.nombreProducto ||
      bloque.monto ||
      bloque.precio ||
      bloque.total ||
      bloque.precioTotal ||
      bloque.montoTotal;

    if (esVentaDirecta) {
      ventasLista.push({ id: clavePadre, __path: "ventas/" + clavePadre, ...bloque });
      return;
    }

    Object.keys(bloque).forEach((ventaId) => {
      const item = bloque[ventaId];
      if (!item || typeof item !== "object") return;
      ventasLista.push({ id: ventaId, __path: "ventas/" + clavePadre + "/" + ventaId, ...item });
    });
  });

  return ventasLista;
}

function extraerVentasDesdeOrdenes(data) {
  const ventasLista = [];

  Object.keys(data || {}).forEach((uid) => {
    const ordenesUsuario = data[uid] || {};
    Object.keys(ordenesUsuario).forEach((ordenId) => {
      const item = ordenesUsuario[ordenId] || {};
      ventasLista.push({
        id: ordenId,
        __path: "",
        producto: item.producto || item.servicio || "",
        nombre: item.comprador || item.nombreCliente || "",
        proveedorNombre: obtenerProveedorOrden(item),
        montoPlataforma: obtenerComisionPlataformaOrden(item),
        montoProveedor: obtenerGananciaProveedorOrden(item),
        precio: item.precio || 0,
        fecha: item.fechaCompra || "",
        estado: item.estado || "activa"
      });
    });
  });

  return ventasLista;
}

function renderVentas() {
  const tbody = document.querySelector("#tablaVentas tbody");
  const tabla = document.getElementById("tablaVentas");
  const vacio = document.getElementById("ventasVacio");

  if (!tbody || !tabla || !vacio) return;

  actualizarCabeceraTablaVentasAdmin();
  tbody.innerHTML = "";

  let ventasLista = extraerVentasDesdeNodoVentas(ventasCache || {});
  if (!ventasLista.length) {
    ventasLista = extraerVentasDesdeOrdenes(ordenesCache || {});
  }

  if (filtroVentasAdmin) {
    ventasLista = ventasLista.filter((item) => {
      const texto = [
        item.id || "",
        item.producto || item.plan || item.nombreProducto || item.servicio || "",
        item.nombre || item.cliente || item.usuario || item.nombreCliente || item.comprador || "",
        obtenerProveedorOrden(item),
        item.estado || ""
      ].join(" ");

      return coincideFiltroTexto(texto, filtroVentasAdmin);
    });
  }

  ventasLista.sort((a, b) => {
    const fa = timestampSeguro(a.fecha || a.fechaHora || a.hora || a.fechaCompra);
    const fb = timestampSeguro(b.fecha || b.fechaHora || b.hora || b.fechaCompra);
    return fb - fa;
  });

  document.getElementById("totalVentas").textContent = ventasLista.length;

  if (!ventasLista.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    document.getElementById("gananciaTotal").textContent = formatearDinero(0);
    return;
  }

  let sumaComision = 0;

  ventasLista.forEach((item) => {
    const comision = obtenerComisionPlataformaOrden(item);
    const gananciaProveedor = obtenerGananciaProveedorOrden(item);
    const proveedor = obtenerProveedorOrden(item);
    sumaComision += comision;

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(textoSeguro(item.id))}</td>
        <td>${escaparHTML(textoSeguro(item.producto || item.plan || item.nombreProducto || item.servicio))}</td>
        <td>${escaparHTML(textoSeguro(item.nombre || item.cliente || item.usuario || item.nombreCliente || item.comprador))}</td>
        <td>${escaparHTML(textoSeguro(proveedor))}</td>
        <td>${formatearDinero(comision)}</td>
        <td>${formatearDinero(gananciaProveedor)}</td>
        <td>${escaparHTML(formatearFecha(item.fecha || item.fechaHora || item.hora || item.fechaCompra))}</td>
        <td>${badgeEstado(item.estado || "registrado")}</td>
        <td>
          ${item.__path
            ? `<button class="smallBtn btnDelete" onclick="eliminarRegistroConfirmado('${escaparParaJS(item.__path)}', 'Venta eliminada del historial.', mostrarMensajeProducto)">Eliminar</button>`
            : "-"
          }
        </td>
      </tr>
    `;
  });

  document.getElementById("gananciaTotal").textContent = formatearDinero(sumaComision);
  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function eliminarCompraHoy(uid, ordenId, compraId) {
  if (!confirm("¿Seguro que quieres eliminar esta compra de la tabla Compras hoy?")) return;

  const idFinal = String(compraId || ordenId || "").trim();
  if (!idFinal) {
    mostrarMensajeProducto("No se pudo identificar la compra a eliminar.", true);
    return;
  }

  const updates = {};
  updates["comprasHoy/" + idFinal] = null;
  updates["comprasHoyEliminadas/" + idFinal] = {
    eliminado: true,
    uid: uid || "",
    ordenId: ordenId || "",
    fechaEliminacion: Date.now()
  };

  db.ref().update(updates)
    .then(() => {
      mostrarMensajeProducto("Compra eliminada de Compras hoy correctamente.");
    })
    .catch((error) => {
      mostrarMensajeProducto("Error al eliminar compra de hoy: " + error.message, true);
    });
}

function renderComprasHoy() {
  const tbody = document.querySelector("#tablaComprasHoy tbody");
  const tabla = document.getElementById("tablaComprasHoy");
  const vacio = document.getElementById("comprasHoyVacio");

  if (!tbody || !tabla || !vacio) return;

  actualizarCabeceraTablaComprasHoyAdmin();
  tbody.innerHTML = "";

  if (typeof comprasHoyCache === "number") {
    document.getElementById("totalComprasHoy").textContent = comprasHoyCache;
    document.getElementById("gananciaHoy").textContent = formatearDinero(0);
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  let comprasLista = [];
  const eliminadas = comprasHoyEliminadasCache || {};

  if (comprasHoyCache && typeof comprasHoyCache === "object") {
    Object.keys(comprasHoyCache).forEach((id) => {
      const item = comprasHoyCache[id];
      if (!item || typeof item !== "object") return;
      if (eliminadas[id]) return;

      comprasLista.push({
        id,
        compraId: id,
        uid: item.uidUsuario || item.uid || "",
        ordenId: item.ordenId || id,
        __path: "comprasHoy/" + id,
        ...item
      });
    });
  }

  if (!comprasLista.length) {
    Object.keys(ordenesCache || {}).forEach((uid) => {
      const ordenesUsuario = ordenesCache[uid] || {};
      Object.keys(ordenesUsuario).forEach((ordenId) => {
        const item = ordenesUsuario[ordenId] || {};
        const fecha = item.fechaCompra || item.fecha || item.fechaHora || item.hora;
        if (!esMismoDiaHoy(fecha)) return;
        if (eliminadas[ordenId]) return;

        comprasLista.push({
          id: ordenId,
          compraId: ordenId,
          uid,
          ordenId,
          __path: "",
          producto: item.producto || item.servicio || "",
          nombre: item.comprador || item.nombreCliente || "",
          precio: item.precio || 0,
          montoPlataforma: obtenerComisionPlataformaOrden(item),
          montoProveedor: obtenerGananciaProveedorOrden(item),
          proveedorNombre: obtenerProveedorOrden(item),
          fecha,
          estado: item.estado || "activa"
        });
      });
    });
  }

  if (filtroComprasHoyAdmin) {
    comprasLista = comprasLista.filter((item) => {
      const texto = [
        item.id || "",
        item.producto || item.servicio || "",
        item.nombre || item.comprador || item.nombreCliente || "",
        obtenerProveedorOrden(item),
        item.estado || ""
      ].join(" ");

      return coincideFiltroTexto(texto, filtroComprasHoyAdmin);
    });
  }

  comprasLista.sort((a, b) => {
    const fa = timestampSeguro(a.fecha || a.fechaHora || a.hora || a.fechaCompra);
    const fb = timestampSeguro(b.fecha || b.fechaHora || b.hora || b.fechaCompra);
    return fb - fa;
  });

  document.getElementById("totalComprasHoy").textContent = comprasLista.length;

  if (!comprasLista.length) {
    tabla.classList.add("hidden");
    vacio.classList.remove("hidden");
    document.getElementById("gananciaHoy").textContent = formatearDinero(0);
    return;
  }

  let sumaHoy = 0;

  comprasLista.forEach((item) => {
    const comision = obtenerComisionPlataformaOrden(item);
    const gananciaProveedor = obtenerGananciaProveedorOrden(item);
    const proveedor = obtenerProveedorOrden(item);
    sumaHoy += comision;

    tbody.innerHTML += `
      <tr>
        <td>${escaparHTML(textoSeguro(item.id))}</td>
        <td>${escaparHTML(textoSeguro(item.producto || item.servicio))}</td>
        <td>${escaparHTML(textoSeguro(item.nombre || item.comprador || item.nombreCliente || item.cliente || "-"))}</td>
        <td>${escaparHTML(textoSeguro(proveedor))}</td>
        <td>${formatearDinero(comision)}</td>
        <td>${formatearDinero(gananciaProveedor)}</td>
        <td>${escaparHTML(formatearFecha(item.fecha || item.fechaCompra))}</td>
        <td>${badgeEstado(item.estado || "registrado")}</td>
        <td>
          <button class="smallBtn btnDelete" onclick="eliminarCompraHoy('${escaparParaJS(item.uid || "")}', '${escaparParaJS(item.ordenId || item.id || "")}', '${escaparParaJS(item.compraId || item.id || "")}')">Eliminar</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("gananciaHoy").textContent = formatearDinero(sumaHoy);
  tabla.classList.remove("hidden");
  vacio.classList.add("hidden");
}

function cargarVentas() {
  db.ref("ventas").on("value", (snapshot) => {
    ventasCache = snapshot.val() || {};
    renderVentas();
    programarProcesoComisionesProveedores();
  });

  db.ref("ordenes").on("value", (snapshot) => {
    ordenesCache = snapshot.val() || {};
    renderVentas();
    renderComprasHoy();
    renderDescargasEntregadas();
  });
}

function cargarComprasHoy() {
  db.ref("comprasHoy").on("value", (snapshot) => {
    comprasHoyCache = snapshot.val();
    renderComprasHoy();
  });

  db.ref("comprasHoyEliminadas").on("value", (snapshot) => {
    comprasHoyEliminadasCache = snapshot.val() || {};
    renderComprasHoy();
  });
}

/* =========================
TECLAS
========================= */

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") cerrarModalRecarga();
});
