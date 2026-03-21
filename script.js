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

/* =========================
UTILIDADES
========================= */

function obtenerPaginaActual() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function formatearSaldo(saldo) {
  const monto = Number(saldo || 0).toFixed(2);
  return `S/ ${monto} <span class="panelSaldoMoneda">PEN</span>`;
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
  if (texto.includes("hbo")) return "HBO";
  if (texto.includes("paramount")) return "Paramount";
  if (texto.includes("spotify")) return "Spotify";
  if (texto.includes("vix")) return "Vix";
  if (texto.includes("crunchy")) return "Crunchyroll";
  if (texto.includes("chatgpt")) return "ChatGPT";

  return "";
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
    paramount: "img/Paramount.jpg",
    spotify: "img/Spotify.jpg",
    vix: "img/logo.jpg",
    crunchyroll: "img/logo.jpg",
    chatgpt: "img/logo.jpg"
  };

  const clave = String(idProducto || "").toLowerCase();
  return mapa[clave] || "img/logo.jpg";
}

function obtenerDuracionTexto(item) {
  const dias = Number(item.duracionDias || 30);

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

  if (productoBase === "HBO") {
    return `
      <li>Perfil para uso personal.</li>
      <li>No cambiar correo ni contraseña.</li>
      <li>No eliminar perfiles existentes.</li>
      <li>No modificar configuraciones de la cuenta.</li>
      <li>Uso exclusivo para ver contenido.</li>
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
      <li>No compartir acceso con terceros.</li>
      <li>No cambiar país o región de la cuenta.</li>
      <li>El incumplimiento de estas condiciones anula la garantía.</li>
    `;
  }

  return `
    <li>Uso exclusivamente personal.</li>
    <li>No modificar credenciales ni configuraciones.</li>
    <li>No compartir el acceso con terceros.</li>
    <li>El incumplimiento de estas condiciones anula la garantía.</li>
  `;
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
  if (id === "hbo" || nombre.includes("hbo")) return "HBO";
  if (id === "paramount" || nombre.includes("paramount")) return "Paramount";
  if (id === "spotify" || nombre.includes("spotify")) return "Spotify";
  if (id === "vix" || nombre.includes("vix")) return "Vix";
  if (id === "crunchyroll" || nombre.includes("crunchyroll")) return "Crunchyroll";
  if (id === "chatgpt" || nombre.includes("chatgpt")) return "ChatGPT";

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

  const pagina = obtenerPaginaActual();
  const paginasProtegidas = [
    "tienda.html",
    "ofertas.html",
    "recargas.html",
    "como-comprar.html",
    "mis-compras.html"
  ];

  if (!user && paginasProtegidas.includes(pagina)) {
    window.location.href = "index.html";
    return;
  }

  if (user && paginasProtegidas.includes(pagina)) {
    cargarPanelUsuario(user);
    escucharBadgeMisCompras(user.uid);
  } else {
    if (badgeComprasRef) {
      badgeComprasRef.off();
      badgeComprasRef = null;
    }

    if (usuarioPerfilRef) {
      usuarioPerfilRef.off();
      usuarioPerfilRef = null;
    }

    actualizarBadgeMisCompras(0);
  }
});

function cargarPanelUsuario(user) {
  if (!user) return;

  const nombreBox = document.getElementById("panelUsuarioNombre");
  const handleBox = document.getElementById("panelUsuarioHandle");
  const saldoBox = document.getElementById("panelUsuarioSaldo");

  const correoAuth = user.email || "";
  const usuarioCorreo = correoAuth ? correoAuth.split("@")[0] : "usuario";

  if (nombreBox) nombreBox.innerText = "Cargando...";
  if (handleBox) handleBox.innerText = "@" + usuarioCorreo;
  if (saldoBox) saldoBox.innerHTML = formatearSaldo(0);

  if (usuarioPerfilRef) {
    usuarioPerfilRef.off();
    usuarioPerfilRef = null;
  }

  usuarioPerfilRef = db.ref("usuarios/" + user.uid);

  usuarioPerfilRef.on("value", (snap) => {
    const data = snap.val() || {};

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
  }, () => {
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
  spotify: "ventasSpotify"
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
  const descripcion = item.descripcion || "Producto digital disponible.";
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
  productoBaseActual = normalizarProductoBase(nombre);

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
  if (lista) lista.innerHTML = obtenerReglasProducto(normalizarProductoBase(nombre));

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
CUENTAS / ORDENES / COMPRAS
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

async function marcarCuentasVendidas(cuentas, user, nombreComprador) {
  const updates = {};
  const fechaEntrega = formatearFechaEntregaLocal();

  cuentas.forEach((cuentaObj) => {
    const base = `cuentas/${cuentaObj.ruta}/${cuentaObj.key}`;
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

async function revertirCuentasVendidas(cuentas) {
  if (!Array.isArray(cuentas) || !cuentas.length) return;

  const updates = {};

  cuentas.forEach((cuentaObj) => {
    const base = `cuentas/${cuentaObj.ruta}/${cuentaObj.key}`;
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

async function guardarOrdenesUsuario(itemProducto, cuentasAsignadas, nombreComprador) {
  const uid = usuarioActual?.uid;
  if (!uid || !cuentasAsignadas.length) return;

  const ahora = new Date();
  const duracionDias = Number(itemProducto.duracionDias || 30);
  const fechaExpira = new Date(ahora.getTime() + duracionDias * 24 * 60 * 60 * 1000).toISOString();
  const precioUnitario = Number(itemProducto.precio || precioBase || 0);

  const tareas = cuentasAsignadas.map((cuentaObj) => {
    const nuevaOrdenRef = db.ref("ordenes/" + uid).push();

    return nuevaOrdenRef.set({
      servicio: itemProducto.nombre || productoActual || "",
      producto: productoSeleccionadoId || "",
      cuenta: cuentaObj.cuenta || "",
      clave: cuentaObj.clave || "",
      perfil: cuentaObj.perfil || "",
      pin: cuentaObj.pin || "",
      observacion: cuentaObj.observacion || "",
      nombreCliente: "",
      comprador: nombreComprador || "",
      precio: Number(precioUnitario.toFixed(2)),
      fechaCompra: ahora.toISOString(),
      fechaExpira: fechaExpira,
      estado: "activa",
      uid: uid,
      soporteNumero: numero
    });
  });

  return Promise.all(tareas);
}

async function registrarCompraFinal(cuentasAsignadas, nombreComprador) {
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

  await guardarOrdenesUsuario(item, cuentasAsignadas, nombreComprador);
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

  let saldoDescontado = false;
  let stockDescontado = false;
  let cuentasMarcadas = false;
  let cuentasDisponibles = [];

  try {
    const perfil = await obtenerPerfilUsuario(uid);
    const nombreComprador = obtenerNombreComprador(usuarioActual, perfil);
    const saldoActual = Number(perfil.saldo || 0);

    if (saldoActual < totalCompra) {
      alert("Saldo insuficiente para completar esta compra.");
      return;
    }

    cuentasDisponibles = await obtenerCuentasDisponibles(productoSeleccionadoId, item, cantidadProducto);

    if (cuentasDisponibles.length < cantidadProducto) {
      alert("No hay suficientes cuentas configuradas para este producto.");
      return;
    }

    await descontarSaldoUsuario(uid, totalCompra);
    saldoDescontado = true;

    await descontarStockProducto(productoSeleccionadoId, cantidadProducto);
    stockDescontado = true;

    await marcarCuentasVendidas(cuentasDisponibles, usuarioActual, nombreComprador);
    cuentasMarcadas = true;

    await registrarCompraFinal(cuentasDisponibles, nombreComprador);

    cerrarModal();
    mostrarToastCompraExitosa(item.nombre || productoActual, totalCompra);

  } catch (error) {
    console.error("Error al comprar:", error);

    if (cuentasMarcadas) {
      try {
        await revertirCuentasVendidas(cuentasDisponibles);
      } catch (e) {
        console.error("No se pudieron revertir las cuentas:", e);
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
