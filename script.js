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

/* refs para evitar listeners innecesarios */
let productosRef = null;
let comprasHoyRef = null;
let comprasLiveRef = null;
let ventasRefs = [];

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

  const body = document.getElementById("avisoSistemaBodyContenido");
  if (body) {
    if (usarHtml) {
      body.innerHTML = mensaje;
    } else {
      body.textContent = mensaje;
    }
  }

  function cerrarAviso() {
    overlay.remove();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cerrarAviso();
  });

  const btn = document.getElementById("btnCerrarAvisoSistema");
  if (btn) {
    btn.addEventListener("click", () => {
      cerrarAviso();
      if (typeof opciones.onConfirmar === "function") {
        opciones.onConfirmar();
      }
    });
  }

  const btnSec = document.getElementById("btnSecundarioAvisoSistema");
  if (btnSec) {
    btnSec.addEventListener("click", () => {
      cerrarAviso();
      if (typeof opciones.onSecundario === "function") {
        opciones.onSecundario();
      }
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
  const nombre = String(itemProducto.nombre || "").toLowerCase();
  const categoria = String(itemProducto.categoria || "").toLowerCase();

  return (
    esProductoLicencia(productoId, itemProducto) ||
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

  if (productoBase === "Windows11Pro") {
    return "Licencia digital OEM para activar Windows 11 Pro de forma rápida y segura. Después de la compra, ve a Configuración > Sistema > Activación > Cambiar clave de producto, ingresa la key recibida y confirma la activación. Producto digital, no requiere envío físico.";
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

/* =========================
RUTAS CUENTAS SEGUN FIREBASE
========================= */

function obtenerRutaCuentasPorProducto(productoId, itemProducto = {}) {
  const id = String(productoId || "").toLowerCase().trim();
  const nombre = String(itemProducto.nombre || productoActual || "").toLowerCase();

  if (id === "netflix" || nombre.includes("netflix")) return "Netflix";
  if (id === "disney" || nombre.includes("disney")) return "Disney";
  if (id === "hboprime" || nombre.includes("hbo max + prime") || (nombre.includes("hbo") && nombre.includes("prime"))) return "hboprime";
  if (id === "prime" || nombre.includes("prime video")) return "Prime";
  if (id === "hboplatinium" || nombre.includes("hbo max platinium") || nombre.includes("hbomax platinium") || nombre.includes("hbo platinium")) return "hboplatinium";
  if (id === "hbo" || nombre.includes("hbo")) return "HBO";
  if (id === "paramount" || nombre.includes("paramount")) return "Paramount";
  if (id === "spotify" || nombre.includes("spotify")) return "Spotify";
  if (id === "vix" || nombre.includes("vix")) return "Vix";
  if (id === "crunchyroll" || nombre.includes("crunchyroll")) return "crunchyroll";
  if (id === "canva" || nombre.includes("canva")) return "canva";
  if (id === "youtubepremium" || nombre.includes("youtube premium") || nombre.includes("youtube")) return "youtubepremium";
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

  if (typeof data === "number") return data;

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

  limpiarTodoListeners();
  actualizarBadgeMisCompras(0);

  mostrarAvisoSistema("Cuenta bloqueada", "Tu cuenta ha sido bloqueada. Contacta con soporte.", "error");

  setTimeout(() => {
    auth.signOut()
      .then(() => {
        window.location.href = "index.html";
      })
      .catch(() => {
        window.location.href = "index.html";
      });
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
    "mis-compras.html"
  ];

  if (!user) {
    limpiarTodoListeners();

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

  if (toast) toast.classList.add("show");

  setTimeout(() => {
    limpiarTodoListeners();

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
    span.innerText = snap.val() || 0;
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

    const rutasCompatibles = [
      "ventas/" + prod,
      "ventas/" + prod.charAt(0).toUpperCase() + prod.slice(1)
    ];

    let totalRuta1 = 0;
    let totalRuta2 = 0;

    const ref1 = db.ref(rutasCompatibles[0]);
    const cb1 = (snap) => {
      totalRuta1 = convertirVentasANumero(snap.val());
      span.innerText = totalRuta1 + totalRuta2;
    };
    ref1.on("value", cb1, () => {
      span.innerText = totalRuta1 + totalRuta2;
    });
    ventasRefs.push({ ref: ref1, callback: cb1 });

    const ref2 = db.ref(rutasCompatibles[1]);
    const cb2 = (snap) => {
      totalRuta2 = convertirVentasANumero(snap.val());
      span.innerText = totalRuta1 + totalRuta2;
    };
    ref2.on("value", cb2, () => {
      span.innerText = totalRuta1 + totalRuta2;
    });
    ventasRefs.push({ ref: ref2, callback: cb2 });
  });
}

/* =========================
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
PRODUCTOS DINAMICOS TIENDA
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
  const stock = Number(item.stock || 0);
  const proveedorNombre = item.proveedorNombre || "Josking";

  if (stock <= 0) {
    mostrarAvisoSistema("Producto agotado", "Este producto no tiene stock disponible en este momento.", "warn");
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
    mostrarAvisoSistema("Producto no encontrado", "No se encontró el producto solicitado.", "error");
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

function esNodoCuentaDirecta(data = {}) {
  if (!data || typeof data !== "object") return false;

  const tieneDatoPrincipal =
    String(data.cuenta || "").trim() !== "" ||
    String(data.correo || "").trim() !== "" ||
    String(data.email || "").trim() !== "" ||
    String(data.usuario || "").trim() !== "" ||
    String(data.codigo || "").trim() !== "";

  return tieneDatoPrincipal;
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
  const rutaCuentas = obtenerRutaCuentasPorProducto(productoId, itemProducto);
  const snap = await db.ref("cuentas/" + rutaCuentas).once("value");
  const data = snap.val() || {};

  const cuentas = recolectarCuentasDesdeNodo(data, rutaCuentas, cantidadNecesaria, [], "");
  return cuentas;
}

async function obtenerCodigosDisponibles(productoId, cantidadNecesaria) {
  const productoNormalizado = String(productoId || "").trim().toLowerCase();
  const snap = await db.ref("codigos").once("value");
  const data = snap.val() || {};
  const codigos = [];

  Object.keys(data).forEach((key) => {
    const item = data[key] || {};
    const productoCodigo = String(item.producto || "").trim().toLowerCase();

    if (productoCodigo !== productoNormalizado) return;
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

async function marcarItemsVendidos(items, user, nombreComprador, ordenIdsAsignados = []) {
  const updates = {};
  const fechaEntrega = formatearFechaEntregaLocal();

  items.forEach((itemObj, index) => {
    const ordenIdAsignado = ordenIdsAsignados[index] || "";

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
    updates[`${base}/disponible`] = false;
    updates[`${base}/uidComprador`] = user.uid;
    updates[`${base}/compradorNombre`] = nombreComprador;
    updates[`${base}/fechaVenta`] = Date.now();
    updates[`${base}/ordenId`] = ordenIdAsignado;
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

    const rutaInterna = itemObj.nodePath || itemObj.key;
    const base = `cuentas/${itemObj.ruta}/${rutaInterna}`;

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
    updates[`${base}/ordenId`] = null;
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
  const uid = usuarioActual && usuarioActual.uid ? usuarioActual.uid : "";
  if (!uid || !itemsAsignados.length) return [];

  const ahora = new Date();
  const precioUnitario = Number(itemProducto.precio || precioBase || 0);
  const ordenesGeneradas = [];

  for (const itemObj of itemsAsignados) {
    const nuevaOrdenRef = db.ref("ordenes/" + uid).push();
    const tipoEntrega = itemObj.tipo === "codigo" ? "codigo" : "cuenta";
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

  await db.ref("comprasHoy").transaction((total) => {
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

  return ordenesGeneradas;
}

/* =========================
COMPRAR
========================= */

async function comprarAhora() {
  if (compraEnProceso) return;
  compraEnProceso = true;

  let saldoDescontado = false;
  let stockDescontado = false;
  let itemsMarcados = false;
  let itemsDisponibles = [];
  let uid = "";
  let totalCompra = 0;

  try {
    if (!usuarioActual) {
      mostrarAvisoSistema("Acceso requerido", "Debes iniciar sesión para comprar.", "info");
      return;
    }

    if (!productoSeleccionadoData || !productoSeleccionadoId) {
      mostrarAvisoSistema("Producto no válido", "Selecciona un producto válido.", "error");
      return;
    }

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

    const item = productoSeleccionadoData || {};
    uid = usuarioActual.uid;
    totalCompra = Number((Number(precioBase || 0) * Number(cantidadProducto || 1)).toFixed(2));
    const productoEsLicencia = esProductoLicencia(productoSeleccionadoId, item);
    const productoEsCodigo = esProductoCodigo(productoSeleccionadoId, item);

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

    if (productoEsLicencia || productoEsCodigo) {
      itemsDisponibles = await obtenerCodigosDisponibles(productoSeleccionadoId, cantidadProducto);
    } else {
      itemsDisponibles = await obtenerCuentasDisponibles(productoSeleccionadoId, item, cantidadProducto);
    }

    if (itemsDisponibles.length < cantidadProducto) {
      mostrarAvisoSistema(
        "Configuración incompleta",
        (productoEsLicencia || productoEsCodigo)
          ? "Hay stock visible, pero no hay suficientes códigos disponibles configurados para entregar este producto."
          : "Hay stock visible, pero no hay suficientes cuentas disponibles configuradas para entregar este producto.",
        "error"
      );
      return;
    }

    await descontarSaldoUsuario(uid, totalCompra);
    saldoDescontado = true;

    await descontarStockProducto(productoSeleccionadoId, cantidadProducto);
    stockDescontado = true;

    const ordenesGeneradas = await guardarOrdenesUsuario(item, itemsDisponibles, nombreComprador);
    const ordenIds = ordenesGeneradas.map((o) => o.ordenId);

    await marcarItemsVendidos(itemsDisponibles, usuarioActual, nombreComprador, ordenIds);
    itemsMarcados = true;

    await registrarCompraFinal(itemsDisponibles, nombreComprador, ordenesGeneradas);

    cerrarModal();
    mostrarToastCompraExitosa(item.nombre || productoActual, totalCompra);

  } catch (error) {
    console.error("Error al comprar:", error);
    console.error("Mensaje:", error?.message);
    console.error("Código:", error?.code);

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

    if (String(error?.message || "").includes("STOCK_INSUFICIENTE")) {
      mostrarAvisoSistema("Stock actualizado", "El stock cambió y ya no alcanza para completar la compra.", "warn");
      return;
    }

    mostrarAvisoSistema(
      "Compra no completada",
      "Ocurrió un error al procesar la compra. No se realizó ningún cobro definitivo.",
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
INICIO POR PAGINA
========================= */

function iniciarPaginaTienda() {
  iniciarSlider();
  verificarUrgenciaOferta();
  cargarProductosTienda();
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
      if (esModoMovilOTablet()) {
        cerrarMenu();
      }
    });
  });

  window.addEventListener("resize", function () {
    if (!esModoMovilOTablet()) {
      cerrarMenu();
    }
  });
}

/* =========================
DOM READY
========================= */

document.addEventListener("DOMContentLoaded", function () {
  const pagina = obtenerPaginaActual();

  iniciarPaginaGeneralConMenu();
  iniciarComportamientoMenu();

  if (pagina === "tienda.html") {
    iniciarPaginaTienda();
    iniciarFormularioReservado();
  }

  if (pagina === "como-comprar.html") {
    /* sin listeners pesados */
  }

  if (pagina === "ofertas.html") {
    verificarUrgenciaOferta();
  }

  if (pagina === "recargas.html") {
    /* recargas usa su propio script inline */
  }

  if (pagina === "mis-compras.html") {
    /* mis compras usa su propio script inline */
  }
});

/* =========================
CLICK GLOBAL
========================= */

document.addEventListener("click", function (e) {
  const modalCompra = document.getElementById("modalCompra");
  const modalOferta = document.getElementById("modalOfertaVigente");
  const menu = document.getElementById("menuLateral");
  const menuIcon = document.querySelector(".menuIcon");

  if (menu && esModoMovilOTablet() && menu.classList.contains("activo")) {
    const clicDentroMenu = menu.contains(e.target);
    const clicEnIcono = menuIcon && menuIcon.contains(e.target);

    if (!clicDentroMenu && !clicEnIcono) {
      cerrarMenu();
    }
  }

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

    const aviso = document.getElementById("avisoSistemaOverlay");
    if (aviso) aviso.remove();

    if (esModoMovilOTablet()) {
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
