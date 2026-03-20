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

const auth = firebase.auth();
const db = firebase.database();

/* =========================
CONFIGURACIÓN DE INACTIVIDAD
========================= */

const TIEMPO_INACTIVIDAD_USUARIO = 15 * 60 * 1000; // 15 minutos
const TIEMPO_INACTIVIDAD_ADMIN = 7 * 60 * 1000;   // 7 minutos
const TIEMPO_AVISO = 1 * 60 * 1000;               // aviso 1 minuto antes

let temporizadorInactividad = null;
let temporizadorAviso = null;
let controlInactividadIniciado = false;
let avisoMostrado = false;

/* =========================
FUNCIONES GENERALES
========================= */

function mostrarMensajeAuth(texto, color = "#ffffff") {
  const box = document.getElementById("mensajeAuth");
  if (!box) return;
  box.innerText = texto;
  box.style.color = color;
}

function obtenerPaginaActual() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function limpiarTexto(valor) {
  return String(valor || "").trim();
}

function limpiarUsuario(valor) {
  return String(valor || "").trim().toLowerCase();
}

function esCorreoValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpiarTexto(valor));
}

function esPaginaPrivada(pagina) {
  const paginasPrivadas = [
    "tienda.html",
    "panel.html",
    "recargas.html",
    "admin.html",
    "perfil.html",
    "saldo.html",
    "compras.html",
    "ofertas.html",
    "como-comprar.html"
  ];

  return paginasPrivadas.includes(pagina);
}

/* =========================
INACTIVIDAD / AUTO LOGOUT
========================= */

function limpiarTemporizadoresInactividad() {
  if (temporizadorInactividad) {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = null;
  }

  if (temporizadorAviso) {
    clearTimeout(temporizadorAviso);
    temporizadorAviso = null;
  }
}

function cerrarSesionPorInactividad() {
  limpiarTemporizadoresInactividad();
  avisoMostrado = false;

  auth.signOut()
    .then(() => {
      alert("Tu sesión se cerró por inactividad.");
      window.location.replace("index.html");
    })
    .catch(() => {
      alert("Tu sesión se cerró por inactividad.");
      window.location.replace("index.html");
    });
}

function mostrarAvisoInactividad() {
  if (avisoMostrado) return;
  avisoMostrado = true;
  alert("Llevas un tiempo inactivo. Tu sesión se cerrará en 1 minuto si no realizas ninguna acción.");
}

function obtenerTiempoInactividadPorPagina() {
  const pagina = obtenerPaginaActual();
  return pagina === "admin.html" ? TIEMPO_INACTIVIDAD_ADMIN : TIEMPO_INACTIVIDAD_USUARIO;
}

function reiniciarTemporizadorInactividad() {
  limpiarTemporizadoresInactividad();
  avisoMostrado = false;

  const tiempoInactividad = obtenerTiempoInactividadPorPagina();

  if (tiempoInactividad > TIEMPO_AVISO) {
    temporizadorAviso = setTimeout(() => {
      mostrarAvisoInactividad();
    }, tiempoInactividad - TIEMPO_AVISO);
  }

  temporizadorInactividad = setTimeout(() => {
    cerrarSesionPorInactividad();
  }, tiempoInactividad);
}

function iniciarControlInactividad() {
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
    "touchstart",
    "touchmove",
    "keydown"
  ];

  eventos.forEach((evento) => {
    document.addEventListener(evento, reiniciarTemporizadorInactividad, true);
  });

  window.addEventListener("focus", reiniciarTemporizadorInactividad);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      reiniciarTemporizadorInactividad();
    }
  });

  controlInactividadIniciado = true;
  reiniciarTemporizadorInactividad();
}

/* =========================
CARGA INICIAL
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const correoInput = document.getElementById("correo");
  const mantenerSesion = document.getElementById("mantenerSesion");
  const passwordInput = document.getElementById("password");

  const loginGuardado = localStorage.getItem("streamsvip_login_recordado");
  const sesionGuardada = localStorage.getItem("streamsvip_mantener_sesion");

  if (correoInput && loginGuardado) {
    correoInput.value = loginGuardado;
  }

  if (mantenerSesion && sesionGuardada === "true") {
    mantenerSesion.checked = true;
  }

  if (correoInput) {
    correoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        iniciarSesion();
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        iniciarSesion();
      }
    });
  }
});

/* =========================
CONTROL DE SESIÓN
========================= */

auth.onAuthStateChanged(async (user) => {
  const pagina = obtenerPaginaActual();

  if (!user) {
    limpiarTemporizadoresInactividad();

    if (esPaginaPrivada(pagina)) {
      window.location.replace("index.html");
    }
    return;
  }

  try {
    const snap = await db.ref("usuarios/" + user.uid).once("value");
    const dataUsuario = snap.val() || {};
    const rol = dataUsuario.rol || "";
    const estado = (dataUsuario.estado || "activo").toLowerCase();

    if (estado === "bloqueado") {
      limpiarTemporizadoresInactividad();
      await auth.signOut();
      alert("Tu cuenta ha sido bloqueada. Contacta con soporte.");
      window.location.replace("index.html");
      return;
    }

    if (esPaginaPrivada(pagina)) {
      iniciarControlInactividad();
    }

    if (pagina === "admin.html") {
      if (rol !== "admin") {
        window.location.replace("tienda.html");
        return;
      }
    }

  } catch (error) {
    console.error("Error verificando usuario:", error);

    if (pagina === "admin.html") {
      window.location.replace("tienda.html");
    }
  }
});

/* =========================
UI AUTH
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
LOGIN
========================= */

function manejarErrorLogin(error) {
  console.error("Error login completo:", error);
  console.error("Código detectado:", error?.code);

  const codigo = error?.code || "";
  let mensaje = "Usuario/correo o contraseña incorrectos.";

  if (codigo === "auth/too-many-requests") {
    mensaje = "Demasiados intentos. Intenta más tarde.";
  } else if (codigo === "auth/network-request-failed") {
    mensaje = "Error de conexión. Verifica tu internet.";
  } else if (codigo === "auth/user-not-found") {
    mensaje = "Usuario/correo o contraseña incorrectos.";
  } else if (codigo === "auth/wrong-password") {
    mensaje = "Usuario/correo o contraseña incorrectos.";
  } else if (codigo === "auth/invalid-email") {
    mensaje = "Correo electrónico no válido.";
  }

  mostrarMensajeAuth(mensaje, "#ff6b6b");
}

function obtenerCorreoDesdeUsuario(usuarioIngresado) {
  const usuarioNormalizado = limpiarUsuario(usuarioIngresado);

  return db.ref("usernames/" + usuarioNormalizado).once("value").then((snapshot) => {
    if (!snapshot.exists()) {
      throw { code: "auth/user-not-found" };
    }

    const data = snapshot.val() || {};
    const correoEncontrado = limpiarTexto(data.email);

    if (!correoEncontrado) {
      throw { code: "auth/user-not-found" };
    }

    return correoEncontrado;
  });
}

function iniciarSesion() {
  const loginInput = limpiarTexto(document.getElementById("correo")?.value);
  const password = limpiarTexto(document.getElementById("password")?.value);
  const mantenerSesion = document.getElementById("mantenerSesion")?.checked;

  if (!loginInput) {
    mostrarMensajeAuth("Ingresa tu usuario o correo electrónico.", "#ff6b6b");
    return;
  }

  if (!password) {
    mostrarMensajeAuth("Ingresa tu contraseña.", "#ff6b6b");
    return;
  }

  mostrarMensajeAuth("Ingresando...", "#ffd166");

  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
      if (mantenerSesion) {
        localStorage.setItem("streamsvip_login_recordado", loginInput);
        localStorage.setItem("streamsvip_mantener_sesion", "true");
      } else {
        localStorage.removeItem("streamsvip_login_recordado");
        localStorage.removeItem("streamsvip_mantener_sesion");
      }

      if (esCorreoValido(loginInput)) {
        return auth.signInWithEmailAndPassword(loginInput, password);
      }

      return obtenerCorreoDesdeUsuario(loginInput).then((correoEncontrado) => {
        return auth.signInWithEmailAndPassword(correoEncontrado, password);
      });
    })
    .then(() => {
      mostrarMensajeAuth("Inicio de sesión correcto.", "#00e676");
      setTimeout(() => {
        window.location.href = "tienda.html";
      }, 700);
    })
    .catch(manejarErrorLogin);
}

/* =========================
REGISTRO
========================= */

async function crearCuenta() {
  const nombre = limpiarTexto(document.getElementById("nombre")?.value);
  const apellido = limpiarTexto(document.getElementById("apellido")?.value);
  const usuario = limpiarTexto(document.getElementById("usuario")?.value);
  const correo = limpiarTexto(document.getElementById("correo")?.value);
  const password = limpiarTexto(document.getElementById("password")?.value);
  const confirmar = limpiarTexto(document.getElementById("confirmarPassword")?.value);
  const terminos = document.getElementById("terminos")?.checked;

  if (!nombre) {
    mostrarMensajeAuth("Ingresa tu nombre.", "#ff6b6b");
    return;
  }

  if (!apellido) {
    mostrarMensajeAuth("Ingresa tu apellido.", "#ff6b6b");
    return;
  }

  if (!usuario) {
    mostrarMensajeAuth("Ingresa un nombre de usuario.", "#ff6b6b");
    return;
  }

  if (usuario.includes("@")) {
    mostrarMensajeAuth("El nombre de usuario no debe llevar @.", "#ff6b6b");
    return;
  }

  if (!/^[A-Za-z0-9_]{3,20}$/.test(usuario)) {
    mostrarMensajeAuth("El usuario solo puede tener letras, números y guion bajo, entre 3 y 20 caracteres.", "#ff6b6b");
    return;
  }

  if (!correo) {
    mostrarMensajeAuth("Ingresa tu correo electrónico.", "#ff6b6b");
    return;
  }

  if (!esCorreoValido(correo)) {
    mostrarMensajeAuth("El correo no es válido.", "#ff6b6b");
    return;
  }

  if (!password) {
    mostrarMensajeAuth("Ingresa una contraseña.", "#ff6b6b");
    return;
  }

  if (password.length < 6) {
    mostrarMensajeAuth("La contraseña debe tener mínimo 6 caracteres.", "#ff6b6b");
    return;
  }

  if (!confirmar) {
    mostrarMensajeAuth("Confirma tu contraseña.", "#ff6b6b");
    return;
  }

  if (password !== confirmar) {
    mostrarMensajeAuth("Las contraseñas no coinciden.", "#ff6b6b");
    return;
  }

  if (!terminos) {
    mostrarMensajeAuth("Debes aceptar los términos y condiciones.", "#ff6b6b");
    return;
  }

  mostrarMensajeAuth("Creando cuenta...", "#ffd166");

  const usuarioNormalizado = limpiarUsuario(usuario);
  let userCredential = null;

  try {
    const usernameSnap = await db.ref("usernames/" + usuarioNormalizado).once("value");

    if (usernameSnap.exists()) {
      throw { code: "usuario-duplicado" };
    }

    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

    userCredential = await auth.createUserWithEmailAndPassword(correo, password);
    const user = userCredential.user;

    const datosUsuario = {
      uid: user.uid,
      nombre: nombre,
      apellido: apellido,
      usuario: usuario,
      usuarioLower: usuarioNormalizado,
      correo: correo,
      nombreCompleto: (nombre + " " + apellido).trim(),
      saldo: 0,
      rol: "cliente",
      estado: "activo",
      fechaRegistro: Date.now()
    };

    const datosUsername = {
      uid: user.uid,
      email: correo
    };

    await db.ref("usuarios/" + user.uid).set(datosUsuario);
    await db.ref("usernames/" + usuarioNormalizado).set(datosUsername);

    mostrarMensajeAuth("Cuenta creada correctamente.", "#00e676");

    setTimeout(() => {
      window.location.href = "tienda.html";
    }, 800);

  } catch (error) {
    console.error("Error registro:", error);

    if (userCredential && userCredential.user) {
      try {
        await db.ref("usuarios/" + userCredential.user.uid).remove();
      } catch (e) {}

      try {
        await userCredential.user.delete();
      } catch (e) {}
    }

    let mensaje = "No se pudo crear la cuenta.";

    if (error.code === "usuario-duplicado") {
      mensaje = "Ese nombre de usuario ya está registrado.";
    } else if (error.code === "auth/email-already-in-use") {
      mensaje = "Ese correo ya está registrado.";
    } else if (error.code === "auth/invalid-email") {
      mensaje = "El correo no es válido.";
    } else if (error.code === "auth/weak-password") {
      mensaje = "La contraseña es muy débil.";
    } else if (error.code === "PERMISSION_DENIED") {
      mensaje = "Las rules están bloqueando el guardado del usuario.";
    }

    mostrarMensajeAuth(mensaje, "#ff6b6b");
  }
}

/* =========================
RECUPERAR CONTRASEÑA
========================= */

function recuperarPassword() {
  const correo = limpiarTexto(document.getElementById("correo")?.value);

  if (!correo) {
    mostrarMensajeAuth("Primero ingresa tu correo electrónico.", "#ff6b6b");
    return;
  }

  if (!correo.includes("@")) {
    mostrarMensajeAuth("Para recuperar tu contraseña, ingresa tu correo electrónico.", "#ff6b6b");
    return;
  }

  mostrarMensajeAuth("Enviando enlace de recuperación...", "#ffd166");

  auth.sendPasswordResetEmail(correo)
    .then(() => {
      mostrarMensajeAuth("Te enviamos un enlace para restablecer tu contraseña.", "#00e676");
    })
    .catch((error) => {
      console.error("Error recuperación:", error);

      let mensaje = "No se pudo enviar el correo de recuperación.";

      if (error.code === "auth/user-not-found") {
        mensaje = "Ese correo no está registrado.";
      } else if (error.code === "auth/invalid-email") {
        mensaje = "El correo no es válido.";
      }

      mostrarMensajeAuth(mensaje, "#ff6b6b");
    });
}

/* =========================
CERRAR SESIÓN MANUAL
========================= */

function salir() {
  limpiarTemporizadoresInactividad();

  auth.signOut()
    .then(() => {
      window.location.replace("index.html");
    })
    .catch(() => {
      window.location.replace("index.html");
    });
}
