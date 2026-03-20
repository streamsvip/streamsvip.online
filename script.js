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
  storageBucket: "streamsvip-b7d91.appspot.com",
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
    paramount: "img/Paramount.jpg",
    spotify: "img/Spotify.jpg",
    vix: "img/logo.jpg",
    crunchyroll: "img/logo.jpg"
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
    "como-comprar.html"
  ];

  if (!user && paginasProtegidas.includes(pagina)) {
    window.location.href = "index.html";
    return;
  }

  if (user && paginasProtegidas.includes(pagina)) {
    cargarPanelUsuario(user);
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

  db.ref("usuarios/" + user.uid).on("value", (snap) => {
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
});

/* =========================
VENTAS POR PRODUCTO
========================= */

const productosVentas = {
  Netflix: "ventasNetflix",
  Disney: "ventasDisney",
  Prime: "ventasPrime",
  HBO: "ventasHBO",
  Paramount: "ventasParamount",
  Spotify: "ventasSpotify"
};

for (let prod in productosVentas) {
  db.ref("ventas/" + prod).on("value", (snap) => {
    const total = snap.val() || 0;
    const span = document.getElementById(productosVentas[prod]);
    if (span) span.innerText = total;
  });
}

/* =========================
NOTIFICACION COMPRA
========================= */

db.ref("comprasLive").limitToLast(1).on("child_added", (snap) => {
  const data = snap.val();
  if (!data) return;

  const box = document.getElementById("notificacionCompra");
  const texto = document.getElementById("textoCompra");

  if (!box || !texto) return;

  let productoMostrar = String(data.producto || "").replace(/ x\d+$/i, "");
  texto.innerText = `${data.nombre || "Cliente"} compró ${productoMostrar}`;

  box.style.display = "block";
  box.classList.add("show");

  setTimeout(() => {
    box.classList.remove("show");
    box.style.display = "none";
  }, 5000);
});

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
    const descripcion = item.descripcion || "Producto digital disponible.";
    const duracionTexto = obtenerDuracionTexto(item);
    const agotado = stock <= 0;

    const html = `
      <div class="producto" id="producto_${escaparHTML(id)}">
        <img src="${escaparHTML(imagen)}" alt="${escaparHTML(nombre)}">
        <h2>${escaparHTML(nombre)}</h2>
        <p class="productoProveedor">🛡 ${escaparHTML(proveedorNombre)}</p>
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
  if (modalProveedor) modalProveedor.innerText = "Proveedor: " + proveedorNombre;
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

function agregarCarrito(nombre, precio, descripcion, imagen) {
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
    alert("Solo quedan " + stockDisponible + " perfiles disponibles");
    return;
  }

  cantidadProducto = nuevaCantidad;

  const cantidadEl = document.getElementById("cantidadProducto");
  const totalEl = document.getElementById("precioTotal");

  if (cantidadEl) cantidadEl.innerText = cantidadProducto;
  if (totalEl) totalEl.innerText = (precioBase * cantidadProducto).toFixed(2);
}

/* =========================
COMPRAR
========================= */

function comprarAhora() {
  if (!productoSeleccionadoData || !productoSeleccionadoId) {
    alert("Selecciona un producto válido.");
    return;
  }

  if (cantidadProducto > stockDisponible) {
    alert("No hay suficiente stock disponible");
    return;
  }

  const reparto = calcularRepartoVenta(precioBase, cantidadProducto, productoSeleccionadoData);

  alert(
    "Muy pronto esta compra se realizará con saldo automático.\n\n" +
    "Producto: " + productoActual + "\n" +
    "Cantidad: " + cantidadProducto + "\n" +
    "Total: S/ " + reparto.total.toFixed(2) + "\n" +
    "Proveedor: S/ " + reparto.montoProveedor.toFixed(2) + "\n" +
    "Plataforma: S/ " + reparto.montoPlataforma.toFixed(2)
  );
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
REGISTRAR COMPRA
========================= */

function registrarCompra(producto) {
  const nombre = usuarioActual?.displayName || "Cliente";

  db.ref("comprasHoy").transaction((total) => {
    return (total || 0) + 1;
  });

  const productoId = productoSeleccionadoId;
  const item = productoSeleccionadoData || {};
  const reparto = calcularRepartoVenta(precioBase, cantidadProducto, item);

  if (productoId) {
    db.ref("productos/" + productoId + "/stock").transaction((stock) => {
      stock = Number(stock || 0);
      if (stock >= cantidadProducto) {
        return stock - cantidadProducto;
      }
      return stock;
    });

    db.ref("ventas/" + productoId).push({
      productoId: productoId,
      producto: item.nombre || producto,
      proveedorId: item.proveedorId || "",
      proveedorNombre: item.proveedorNombre || "Josking",
      porcentajeProveedor: reparto.porcentajeProveedor,
      porcentajePlataforma: reparto.porcentajePlataforma,
      montoProveedor: reparto.montoProveedor,
      montoPlataforma: reparto.montoPlataforma,
      montoTotal: reparto.total,
      cantidad: cantidadProducto,
      nombre: nombre,
      uidUsuario: usuarioActual?.uid || "",
      fecha: Date.now(),
      estado: "registrado"
    });
  }

  db.ref("comprasLive").push({
    nombre: nombre,
    producto: producto,
    time: Date.now()
  });
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
