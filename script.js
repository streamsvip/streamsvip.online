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

function normalizarProductoBase(nombre) {
  const texto = String(nombre || "").toLowerCase();

  if (texto.includes("netflix")) return "Netflix";
  if (texto.includes("disney")) return "Disney";
  if (texto.includes("prime")) return "Prime";
  if (texto.includes("hbo")) return "HBO";
  if (texto.includes("paramount")) return "Paramount";
  if (texto.includes("spotify")) return "Spotify";

  return "";
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

  return "";
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
MODAL PRODUCTO
========================= */

function agregarCarrito(nombre, precio, descripcion, imagen) {
  const modal = document.getElementById("modalCompra");
  if (!modal) return;

  productoActual = nombre;
  precioBase = Number(precio || 0);
  cantidadProducto = 1;
  productoBaseActual = normalizarProductoBase(nombre);

  const modalNombre = document.getElementById("modalNombre");
  const modalDescripcion = document.getElementById("modalDescripcion");
  const modalImagen = document.getElementById("modalImagen");
  const cantidadEl = document.getElementById("cantidadProducto");
  const totalEl = document.getElementById("precioTotal");
  const lista = document.getElementById("listaReglas");

  if (modalNombre) modalNombre.innerText = nombre;
  if (modalDescripcion) modalDescripcion.innerText = descripcion;
  if (modalImagen) modalImagen.src = imagen;
  if (cantidadEl) cantidadEl.innerText = "1";
  if (totalEl) totalEl.innerText = precioBase.toFixed(2);
  if (lista) lista.innerHTML = obtenerReglasProducto(productoBaseActual);

  db.ref("stock/" + productoBaseActual).once("value")
    .then((snap) => {
      stockDisponible = Number(snap.val() || 0);

      if (stockDisponible <= 0) {
        alert("Producto agotado");
        return;
      }

      modal.style.display = "flex";
    })
    .catch(() => {
      stockDisponible = 0;
      alert("No se pudo consultar el stock");
    });
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
  if (cantidadProducto > stockDisponible) {
    alert("No hay suficiente stock disponible");
    return;
  }

  alert("Muy pronto esta compra se realizará con saldo automático.");
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
  const nombre = "Cliente";

  db.ref("comprasHoy").transaction((total) => {
    return (total || 0) + 1;
  });

  let productoBase = normalizarProductoBase(producto);

  if (productoBase !== "") {
    db.ref("ventas/" + productoBase).transaction((total) => {
      return (total || 0) + 1;
    });

    db.ref("stock/" + productoBase).transaction((stock) => {
      if (stock >= cantidadProducto) {
        return stock - cantidadProducto;
      }
      return stock;
    });
  }

  db.ref("comprasLive").push({
    nombre: nombre,
    producto: producto,
    time: Date.now()
  });
}

/* =========================
CONTROL STOCK
========================= */

const listaStock = ["Netflix", "Disney", "Prime", "HBO", "Paramount", "Spotify"];

listaStock.forEach((prod) => {
  db.ref("stock/" + prod).on("value", (snap) => {
    let stock = snap.val();
    if (stock == null) stock = 0;

    const span = document.getElementById("stock" + prod);
    if (span) span.innerText = stock;

    const card = document.getElementById("producto" + prod);
    if (!card) return;

    const boton = card.querySelector("button");
    if (!boton) return;

    let aviso = card.querySelector(".avisoStock");

    if (!aviso) {
      aviso = document.createElement("p");
      aviso.className = "avisoStock";

      const stockTexto = card.querySelector(".stock");

      if (stockTexto) {
        stockTexto.insertAdjacentElement("afterend", aviso);
      } else {
        card.appendChild(aviso);
      }
    }

    if (stock <= 0) {
      boton.innerText = "AGOTADO";
      boton.disabled = true;
      aviso.style.display = "none";
    } else {
      boton.innerText = "🛒Agregar al carrito";
      boton.disabled = false;

      if (stock > 1 && stock <= 5) {
        aviso.style.display = "block";
        aviso.innerText = `⚠ Solo quedan ${stock} perfiles disponibles`;
      } else if (stock === 1) {
        aviso.style.display = "block";
        aviso.innerText = "⚠ Solo queda 1 perfil disponible";
      } else {
        aviso.style.display = "none";
      }
    }
  });
});

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

  document.querySelectorAll(".producto").forEach((producto) => {
    producto.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;

      const boton = this.querySelector("button");
      if (boton && !boton.disabled) {
        boton.click();
      }
    });
  });
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
