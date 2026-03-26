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

/* =========================
UTILIDADES
========================= */

function obtenerPaginaActual() {
  return window.location.pathname.split("/").pop() || "index.html";
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
  ) return "Windows11Pro";

  return "";
}

function esProductoLicencia(productoId = "", itemProducto = {}) {
  const id = String(productoId || "").toLowerCase();
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();

  return (
    categoria.includes("licencia") ||
    id === "windows11pro" ||
    nombre.includes("windows 11 pro") ||
    nombre.includes("licencia")
  );
}

function esProductoCodigo(productoId = "", itemProducto = {}) {
  const id = String(productoId || "").toLowerCase();
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();

  return (
    esProductoLicencia(productoId, itemProducto) ||
    categoria.includes("codigo") ||
    categoria.includes("clave") ||
    categoria.includes("key") ||
    nombre.includes("licencia") ||
    nombre.includes("clave") ||
    nombre.includes("key")
  );
}

function obtenerImagenProducto(item, idProducto) {
  if (item.imagen && String(item.imagen).trim() !== "") {
    return String(item.imagen).trim();
  }

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
  const nombre = String(item?.nombre || "").toLowerCase();
  const categoria = String(item?.categoria || "").toLowerCase();

  if (
    nombre.includes("windows 11 pro") ||
    nombre.includes("win11pro") ||
    categoria.includes("licencia")
  ) {
    return "Activación: permanente";
  }

  const dias = Number(item.duracionDias || 30);

  if (dias === 365) return "Duración: 1 año";
  if (dias === 30) return "Duración: 1 mes";
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

  return "Producto digital disponible.";
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

function obtenerRutaCuentasPorProducto(productoId, itemProducto = {}) {
  const id = String(productoId || "").toLowerCase().trim();
  const nombre = String(itemProducto.nombre || productoActual || "").toLowerCase();

  if (id === "netflix" || nombre.includes("netflix")) return "Netflix";
  if (id === "disney" || nombre.includes("disney")) return "Disney";
  if (id === "hboprime" || nombre.includes("hbo max + prime") || (nombre.includes("hbo") && nombre.includes("prime"))) return "hboprime";
  if (id === "prime" || nombre.includes("prime video")) return "Prime";
  if (id === "hboplatinium" || nombre.includes("hbo max platinium") || nombre.includes("hbomax platinium") || nombre.includes("hbo platinium")) return "HBOPlatinium";
  if (id === "hbo" || nombre.includes("hbo")) return "HBO";
  if (id === "paramount" || nombre.includes("paramount")) return "Paramount";
  if (id === "spotify" || nombre.includes("spotify")) return "Spotify";
  if (id === "vix" || nombre.includes("vix")) return "Vix";
  if (id === "crunchyroll" || nombre.includes("crunchyroll")) return "Crunchyroll";
  if (id === "canva" || nombre.includes("canva")) return "Canva";
  if (id === "youtubepremium" || nombre.includes("youtube premium")) return "YouTubePremium";
  if (id === "chatgpt" || nombre.includes("chatgpt")) return "ChatGPT";
  if (id === "windows11pro" || nombre.includes("windows 11 pro")) return "windows11pro";

  return productoId;
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
      <span>${escaparHTML(producto)} - S/ ${Number(total).toFixed(2)}</span>
    </div>
  `;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function convertirVentasANumero(data) {
  if (data == null) return 0;

  if (typeof data === "number") {
    return data;
  }

  if (typeof data === "object") {
    let total = 0;

    Object.keys(data).forEach((key) => {
      const item = data[key];

      if (typeof item === "number") {
        total += Number(item || 0);
      } else if (item && typeof item === "object") {
        total += Number(item.cantidad || 1);
      }
    });

    return total;
  }

  return 0;
}

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

function cerrarSesionPorBloqueo() {
  if (redireccionPorBloqueoEnCurso) return;
  redireccionPorBloqueoEnCurso = true;

  limpiarListenersSesion();
  actualizarBadgeMisCompras(0);

  alert("Tu cuenta ha sido bloqueada. Contacta con soporte.");

  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(() => {
      window.location.href = "index.html";
    });
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
    "mis-compras.html"
  ];

  if (!user) {
    limpiarListenersSesion();

    if (paginasProtegidas.includes(pagina)) {
      window.location.href = "index.html";
      return;
    }

    actualizarBadgeMisCompras(0);
    return;
  }

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

    if (estado === "bloqueado") {
      cerrarSesionPorBloqueo();
      return;
    }

    cargarPanelUsuario(user, data);
    escucharBadgeMisCompras(user.uid);
  }, () => {
    cargarPanelUsuario(user, {});
    escucharBadgeMisCompras(user.uid);
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

    const usuario =
      data.usuario ||
      usuarioCorreo ||
      "usuario";

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
    .then((snap) => {
      aplicarDatos(snap.val() || {});
    })
    .catch(() => {
      if (nombreBox) nombreBox.innerText = "USUARIO";
      if (handleBox) handleBox.innerText = "@" + usuarioCorreo;
      if (saldoBox) saldoBox.innerHTML = formatearSaldo(0);
    });
}

function salir() {
  const toast = document.getElementById("toastGracias");

  if (toast) {
    toast.classList.add("show");
  }

  setTimeout(() => {
    limpiarListenersSesion();

    auth.signOut()
      .then(() => {
        window.location.href = "index.html";
      })
      .catch(() => {
        window.location.href = "index.html";
      });
  }, 1200);
}

/* =========================
TERMINOS
========================= */

function abrirTerminos() {
  const modal = document.getElementById("modalTerminos");
  if (modal) modal.style.display = "flex";
}

function cerrarTerminos() {
  const modal = document.getElementById("modalTerminos");
  if (modal) modal.style.display = "none";
}

function aceptarTerminos() {
  const check = document.getElementById("terminos");
  const modal = document.getElementById("modalTerminos");

  if (check) {
    check.disabled = false;
    check.checked = true;
  }

  if (modal) modal.style.display = "none";
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
    alert("Para abrir Yape debes usar un celular");
  }
}

/* =========================
CLIENTES HOY
========================= */

db.ref("comprasHoy").on("value", (snap) => {
  const total = snap.val() || 0;
  const span = document.getElementById("clientesHoy");
  if (span) span.innerText = total;
}, () => {
  const span = document.getElementById("clientesHoy");
  if (span) span.innerText = "0";
});

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
  youtubepremium: "ventasYouTubePremium"
};

Object.keys(productosVentas).forEach((prod) => {
  const spanId = productosVentas[prod];
  const rutasCompatibles = [
    "ventas/" + prod,
    "ventas/" + prod.charAt(0).toUpperCase() + prod.slice(1)
  ];

  let totalRuta1 = 0;
  let totalRuta2 = 0;

  db.ref(rutasCompatibles[0]).on("value", (snap) => {
    totalRuta1 = convertirVentasANumero(snap.val());
    const span = document.getElementById(spanId);
    if (span) span.innerText = totalRuta1 + totalRuta2;
  }, () => {
    const span = document.getElementById(spanId);
    if (span) span.innerText = totalRuta1 + totalRuta2;
  });

  db.ref(rutasCompatibles[1]).on("value", (snap) => {
    totalRuta2 = convertirVentasANumero(snap.val());
    const span = document.getElementById(spanId);
    if (span) span.innerText = totalRuta1 + totalRuta2;
  }, () => {
    const span = document.getElementById(spanId);
    if (span) span.innerText = totalRuta1 + totalRuta2;
  });
});

/* =========================
NOTIFICACION COMPRA
========================= */

db.ref("comprasLive").limitToLast(1).on("child_added", (snap) => {
  const data = snap.val();
  if (!data) return;

  const box = document.getElementById("notificacionCompra");
  const texto = document.getElementById("textoCompra");

  if (!box || !texto) return;

  const productoMostrar = String(data.producto || "").replace(/ x\d+$/i, "");
  texto.innerText = `${data.nombre || "Cliente"} compró ${productoMostrar}`;

  box.style.display = "block";
  box.classList.add("show");

  setTimeout(() => {
    box.classList.remove("show");
    box.style.display = "none";
  }, 5000);
}, () => {});

/* =========================
PRODUCTOS DINÁMICOS TIENDA
========================= */

function renderizarProductosTienda(data) {
  const contenedor = document.getElementById("contenedorProductos");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!data || typeof data !== "object") {
    contenedor.innerHTML = '<div class="cargandoProductos">No hay productos disponibles.</div>';
    return;
  }

  const ids = Object.keys(data).filter((id) => {
    const item = data[id] || {};
    return item.activo !== false;
  });

  if (ids.length === 0) {
    contenedor.innerHTML = '<div class="cargandoProductos">No hay productos activos disponibles.</div>';
    return;
  }

  ids.sort((a, b) => {
    const nombreA = String((data[a] || {}).nombre || a).toLowerCase();
    const nombreB = String((data[b] || {}).nombre || b).toLowerCase();
    return nombreA.localeCompare(nombreB);
  });

  ids.forEach((id) => {
    const item = data[id] || {};
    const nombre = item.nombre || id;
    const precio = Number(item.precio || 0);
    const stock = Number(item.stock || 0);
    const proveedorNombre = item.proveedorNombre || "Josking";
    const imagen = obtenerImagenProducto(item, id);
    const duracionTexto = obtenerDuracionTexto(item);
    const agotado = stock <= 0;

    const html = `
      <div class="producto" id="producto_${escaparHTML(id)}">
        <img src="${escaparHTML(imagen)}" alt="${escaparHTML(nombre)}">
        <h2>${escaparHTML(nombre)}</h2>
        <div class="productoProveedor">
          <span class="productoProveedorTop">Proveedor</span>
          <span class="productoProveedorNombre">🛡 ${escaparHTML(proveedorNombre)}</span>
        </div>
        <p class="precio">${escaparHTML(formatearPrecioProducto(precio))}</p>
        <p class="stock">Stock: <span id="stock_${escaparHTML(id)}">${stock}</span></p>
        <p class="duracionServicio">${escaparHTML(duracionTexto)}</p>
        <button
          class="btnComprar"
          ${agotado ? "disabled" : ""}
          onclick="abrirProductoPorId('${escaparHTML(id)}')">
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
      if (boton && !boton.disabled) {
        boton.click();
      }
    });
  });
}

function cargarProductosTienda() {
  const contenedor = document.getElementById("contenedorProductos");
  if (!contenedor) return;

  db.ref("productos").on("value", (snapshot) => {
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
    alert("No se encontró el producto.");
    return;
  }

  if (item.activo === false) {
    alert("Este producto no está disponible.");
    return;
  }

  const nombre = item.nombre || productoId;
  const precio = Number(item.precio || 0);
  const productoBaseNormalizado = normalizarProductoBase(nombre);
  const descripcion = item.descripcion || obtenerDescripcionProductoFallback(productoBaseNormalizado);
  const imagen = obtenerImagenProducto(item, productoId);
  const stock = Number(item.stock || 0);
  const proveedorNombre = item.proveedorNombre || "Josking";

  if (stock <= 0) {
    alert("Producto agotado");
    return;
  }

  productoSeleccionadoId = productoId;
  productoSeleccionadoData = item;
  productoActual = nombre;
  precioBase = precio;
  cantidadProducto = 1;
  stockDisponible = stock;
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

  if (modal) modal.style.display = "flex";
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
    alert("No se encontró el producto.");
    return;
  }

  abrirProductoPorId(productoEncontradoId);
}

function cerrarModal() {
  const modal = document.getElementById("modalCompra");
  if (modal) modal.style.display = "none";
}

function cambiarCantidad(valor) {
  let nuevaCantidad = cantidadProducto + valor;

  if (nuevaCantidad < 1) nuevaCantidad = 1;

  if (nuevaCantidad > stockDisponible) {
    alert("Solo quedan " + stockDisponible + " cuentas disponibles");
    return;
  }

  cantidadProducto = nuevaCantidad;

  const cantidadEl = document.getElementById("cantidadProducto");
  const totalEl = document.getElementById("precioTotal");

  if (cantidadEl) cantidadEl.innerText = cantidadProducto;
  if (totalEl) totalEl.innerText = (precioBase * cantidadProducto).toFixed(2);
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
  return (
    data.cuenta ||
    data.correo ||
    data.email ||
    data.usuario ||
    data.codigo ||
    ""
  );
}

function obtenerClaveValor(data = {}) {
  return (
    data.clave ||
    data.password ||
    data.contrasena ||
    data.contraseña ||
    ""
  );
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

function cuentaEstaDisponible(data = {}) {
  const vendida = data.vendida === true || data.vendido === true || data.usada === true;
  const disponibleFalse = data.disponible === false;
  const estado = String(data.estado || "").toLowerCase();

  if (vendida) return false;
  if (disponibleFalse) return false;
  if (["vendida", "usada", "ocupada", "inactiva"].includes(estado)) return false;

  const cuenta = obtenerCuentaValor(data);
  return String(cuenta || "").trim() !== "";
}

function codigoEstaDisponible(data = {}) {
  const activo = data.activo !== false;
  const usado = data.usado === true;
  const codigo = String(data.codigo || "").trim();

  return activo && !usado && codigo !== "";
}

async function obtenerCuentasDisponibles(productoId, itemProducto, cantidadNecesaria) {
  const rutaCuentas = obtenerRutaCuentasPorProducto(productoId, itemProducto);
  const snap = await db.ref("cuentas/" + rutaCuentas).once("value");
  const data = snap.val() || {};

  const cuentas = [];

  Object.keys(data).forEach((key) => {
    const item = data[key] || {};

    if (!cuentaEstaDisponible(item)) return;
    if (cuentas.length >= cantidadNecesaria) return;

    cuentas.push({
      tipo: "cuenta",
      key,
      ruta: rutaCuentas,
      cuenta: obtenerCuentaValor(item),
      clave: obtenerClaveValor(item),
      perfil: obtenerPerfilValor(item),
      pin: obtenerPinValor(item),
      observacion: obtenerObservacionValor(item),
      raw: item
    });
  });

  return cuentas;
}

async function obtenerCodigosDisponibles(productoId, cantidadNecesaria) {
  const snap = await db.ref("codigos").once("value");
  const data = snap.val() || {};
  const codigos = [];

  Object.keys(data).forEach((key) => {
    const item = data[key] || {};
    const productoCodigo = String(item.producto || "").trim();

    if (productoCodigo !== productoId) return;
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

function descontarStockProducto(productoId, cantidad) {
  return new Promise((resolve, reject) => {
    const ref = db.ref("productos/" + productoId + "/stock");

    ref.transaction((stockActual) => {
      const stock = Number(stockActual || 0);
      if (stock < cantidad) return;
      return stock - cantidad;
    }, (error, committed, snapshot) => {
      if (error) {
        reject(error);
        return;
      }

      if (!committed) {
        reject(new Error("STOCK_INSUFICIENTE"));
        return;
      }

      resolve(Number(snapshot.val() || 0));
    });
  });
}

function devolverStockProducto(productoId, cantidad) {
  return new Promise((resolve, reject) => {
    db.ref("productos/" + productoId + "/stock").transaction((stockActual) => {
      const stock = Number(stockActual || 0);
      return stock + cantidad;
    }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function marcarItemsVendidos(items, user, nombreComprador) {
  const updates = {};
  const fechaEntrega = formatearFechaEntregaLocal();

  items.forEach((itemObj) => {
    if (itemObj.tipo === "codigo") {
      const base = `codigos/${itemObj.key}`;
      updates[`${base}/usado`] = true;
      updates[`${base}/activo`] = false;
      updates[`${base}/uidUsuario`] = user.uid;
      updates[`${base}/comprador`] = nombreComprador;
      updates[`${base}/fechaUso`] = Date.now();
      return;
    }

    const base = `cuentas/${itemObj.ruta}/${itemObj.key}`;
    updates[`${base}/estado`] = "usada";
    updates[`${base}/uidUsuario`] = user.uid;
    updates[`${base}/comprador`] = nombreComprador;
    updates[`${base}/fechaEntrega`] = fechaEntrega;
    updates[`${base}/vendida`] = true;
    updates[`${base}/vendido`] = true;
    updates[`${base}/disponible`] = false;
    updates[`${base}/uidComprador`] = user.uid;
    updates[`${base}/compradorNombre`] = nombreComprador;
    updates[`${base}/fechaVenta`] = Date.now();
  });

  return db.ref().update(updates);
}

async function revertirItemsVendidos(items) {
  if (!Array.isArray(items) || !items.length) return;

  const updates = {};

  items.forEach((itemObj) => {
    if (itemObj.tipo === "codigo") {
      const base = `codigos/${itemObj.key}`;
      updates[`${base}/usado`] = false;
      updates[`${base}/activo`] = true;
      updates[`${base}/uidUsuario`] = "";
      updates[`${base}/comprador`] = "";
      updates[`${base}/fechaUso`] = "";
      return;
    }

    const base = `cuentas/${itemObj.ruta}/${itemObj.key}`;
    updates[`${base}/estado`] = "disponible";
    updates[`${base}/uidUsuario`] = null;
    updates[`${base}/comprador`] = null;
    updates[`${base}/fechaEntrega`] = null;
    updates[`${base}/vendida`] = false;
    updates[`${base}/vendido`] = false;
    updates[`${base}/disponible`] = true;
    updates[`${base}/uidComprador`] = null;
    updates[`${base}/compradorNombre`] = null;
    updates[`${base}/fechaVenta`] = null;
  });

  return db.ref().update(updates);
}

function obtenerDuracionTextoOrden(itemProducto, tipoEntrega) {
  if (tipoEntrega === "codigo") return "Permanente";
  return obtenerDuracionTexto(itemProducto);
}

function obtenerFechaExpiraOrden(itemProducto, tipoEntrega, ahora) {
  if (tipoEntrega === "codigo") return "";
  const duracionDias = Number(itemProducto.duracionDias || 30);
  return new Date(ahora.getTime() + duracionDias * 24 * 60 * 60 * 1000).toISOString();
}

async function guardarOrdenesUsuario(itemProducto, itemsAsignados, nombreComprador) {
  const uid = usuarioActual?.uid;
  if (!uid || !itemsAsignados.length) return;

  const ahora = new Date();
  const precioUnitario = Number(itemProducto.precio || precioBase || 0);

  const tareas = itemsAsignados.map((itemObj) => {
    const nuevaOrdenRef = db.ref("ordenes/" + uid).push();
    const tipoEntrega = itemObj.tipo === "codigo" ? "codigo" : "cuenta";
    const esCodigo = tipoEntrega === "codigo";
    const esLicencia = esCodigo || esProductoLicencia(productoSeleccionadoId, itemProducto);
    const fechaExpira = obtenerFechaExpiraOrden(itemProducto, tipoEntrega, ahora);
    const duracionTexto = obtenerDuracionTextoOrden(itemProducto, tipoEntrega);

    return nuevaOrdenRef.set({
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
      fechaExpiraTexto: esCodigo ? "Permanente" : "",
      estado: "activa",
      uid: uid,
      soporteNumero: numero,
      tipoEntrega: tipoEntrega,
      esCodigo: esCodigo,
      esLicencia: esLicencia,
      entregaVisual: esCodigo ? "codigo" : "cuenta",
      duracionTexto: duracionTexto
    });
  });

  return Promise.all(tareas);
}

async function registrarCompraFinal(itemsAsignados, nombreComprador) {
  const item = productoSeleccionadoData || {};
  const productoId = productoSeleccionadoId;
  const reparto = calcularRepartoVenta(precioBase, cantidadProducto, item);

  db.ref("comprasHoy").transaction((total) => {
    return (total || 0) + cantidadProducto;
  });

  await db.ref("ventas/" + productoId).push({
    productoId: productoId,
    producto: item.nombre || productoActual,
    proveedorId: item.proveedorId || "",
    proveedorNombre: item.proveedorNombre || "Josking",
    porcentajeProveedor: reparto.porcentajeProveedor,
    porcentajePlataforma: reparto.porcentajePlataforma,
    montoProveedor: reparto.montoProveedor,
    montoPlataforma: reparto.montoPlataforma,
    montoTotal: reparto.total,
    cantidad: cantidadProducto,
    nombre: nombreComprador,
    uidUsuario: usuarioActual?.uid || "",
    fecha: Date.now(),
    estado: "registrado"
  });

  await db.ref("comprasLive").push({
    nombre: nombreComprador,
    producto: item.nombre || productoActual,
    time: Date.now()
  });

  await guardarOrdenesUsuario(item, itemsAsignados, nombreComprador);
}

/* =========================
COMPRAR
========================= */

async function comprarAhora() {
  if (!usuarioActual) {
    alert("Debes iniciar sesión para comprar.");
    return;
  }

  if (!productoSeleccionadoData || !productoSeleccionadoId) {
    alert("Selecciona un producto válido.");
    return;
  }

  if (cantidadProducto < 1) {
    alert("Cantidad inválida.");
    return;
  }

  if (cantidadProducto > stockDisponible) {
    alert("No hay suficiente stock disponible.");
    return;
  }

  const item = productoSeleccionadoData || {};
  const uid = usuarioActual.uid;
  const totalCompra = Number((Number(precioBase || 0) * Number(cantidadProducto || 1)).toFixed(2));
  const productoEsLicencia = esProductoLicencia(productoSeleccionadoId, item);

  let saldoDescontado = false;
  let stockDescontado = false;
  let itemsMarcados = false;
  let itemsDisponibles = [];

  try {
    const perfil = await obtenerPerfilUsuario(uid);
    const estadoUsuario = String(perfil.estado || "activo").toLowerCase();

    if (estadoUsuario === "bloqueado") {
      cerrarSesionPorBloqueo();
      return;
    }

    const nombreComprador = obtenerNombreComprador(usuarioActual, perfil);
    const saldoActual = Number(perfil.saldo || 0);

    if (saldoActual < totalCompra) {
      alert("Saldo insuficiente para completar esta compra.");
      return;
    }

    if (productoEsLicencia || esProductoCodigo(productoSeleccionadoId, item)) {
      itemsDisponibles = await obtenerCodigosDisponibles(productoSeleccionadoId, cantidadProducto);
    } else {
      itemsDisponibles = await obtenerCuentasDisponibles(productoSeleccionadoId, item, cantidadProducto);
    }

    if (itemsDisponibles.length < cantidadProducto) {
      alert(
        (productoEsLicencia || esProductoCodigo(productoSeleccionadoId, item))
          ? "No hay suficientes códigos configurados para este producto."
          : "No hay suficientes cuentas configuradas para este producto."
      );
      return;
    }

    await descontarSaldoUsuario(uid, totalCompra);
    saldoDescontado = true;

    await descontarStockProducto(productoSeleccionadoId, cantidadProducto);
    stockDescontado = true;

    await marcarItemsVendidos(itemsDisponibles, usuarioActual, nombreComprador);
    itemsMarcados = true;

    await registrarCompraFinal(itemsDisponibles, nombreComprador);

    cerrarModal();
    mostrarToastCompraExitosa(item.nombre || productoActual, totalCompra);

  } catch (error) {
    console.error("Error al comprar:", error);

    if (itemsMarcados) {
      try {
        await revertirItemsVendidos(itemsDisponibles);
      } catch (e) {
        console.error("No se pudieron revertir los items:", e);
      }
    }

    if (stockDescontado) {
      try {
        await devolverStockProducto(productoSeleccionadoId, cantidadProducto);
      } catch (e) {
        console.error("No se pudo devolver stock:", e);
      }
    }

    if (saldoDescontado) {
      try {
        await devolverSaldoUsuario(uid, totalCompra);
      } catch (e) {
        console.error("No se pudo devolver saldo:", e);
      }
    }

    if (String(error?.message || "").includes("SALDO_INSUFICIENTE")) {
      alert("Saldo insuficiente para completar esta compra.");
      return;
    }

    if (String(error?.message || "").includes("STOCK_INSUFICIENTE")) {
      alert("El stock cambió y ya no alcanza para completar la compra.");
      return;
    }

    alert("Ocurrió un error al procesar la compra. No se completó la operación.");
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

  if (slides[slideIndex - 1]) {
    slides[slideIndex - 1].classList.add("active");
  }

  if (dots[slideIndex - 1]) {
    dots[slideIndex - 1].classList.add("active");
  }
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
  mostrarSlides(slideIndex);

  const slides = document.querySelectorAll(".slide");

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

function toggleMenu() {
  const menu = document.getElementById("menuLateral");
  if (!menu) return;

  menu.classList.toggle("activo");
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
  } else {
    modal.style.display = "none";
  }
}

function cerrarModalOfertaVigente() {
  const modal = document.getElementById("modalOfertaVigente");
  if (!modal) return;
  modal.style.display = "none";
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
DOM READY
========================= */

document.addEventListener("DOMContentLoaded", function () {
  iniciarSlider();
  verificarUrgenciaOferta();
  cargarProductosTienda();
  insertarBadgeMisComprasSiNoExiste();

  if (ofertaSigueActiva() && !localStorage.getItem("visitoOfertas")) {
    mostrarModalOfertaVigente();
  }

  const form = document.getElementById("formCompra");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Este formulario quedará reservado para futuras recargas de saldo.");
    });
  }
});

/* =========================
CLICK GLOBAL
========================= */

document.addEventListener("click", function (e) {
  const modalCompra = document.getElementById("modalCompra");
  const modalOferta = document.getElementById("modalOfertaVigente");

  if (modalCompra && e.target === modalCompra) {
    cerrarModal();
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

    const modalOferta = document.getElementById("modalOfertaVigente");
    if (modalOferta && modalOferta.style.display === "flex") {
      cerrarModalOfertaVigente();
    }
  }
});
