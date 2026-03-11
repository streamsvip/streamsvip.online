/* 
StreamsVip Sistema Oficial
Desarrollado para StreamsVip
2026
*/
const numero = "51916252754";

/* =========================
TERMINOS
========================= */
function abrirTerminos(){
  document.getElementById("modalTerminos").style.display="flex";
}

function aceptarTerminos(){
  document.getElementById("terminos").checked=true;
  document.getElementById("modalTerminos").style.display="none";
}

/* =========================
ENTRAR
========================= */
function entrar(){
  const nombre=document.getElementById("nombre").value.trim();
  const terminos=document.getElementById("terminos").checked;

  if(nombre==="" || !terminos){
    alert("Debes ingresar tu nombre y aceptar los términos");
    return;
  }

  localStorage.setItem("clienteNombre",nombre);
  window.location.href="tienda.html";
}

/* =========================
MOSTRAR FORMULARIO CON NOTIFICACION
========================= */
function mostrarFormulario() {
  const nombre = localStorage.getItem("clienteNombre") || "Cliente";
  const producto = productoActual || "Producto"; // Asegúrate de tener el producto seleccionado

  // === Solo para notificación flotante ===
  db.ref("comprasLive").push({
    nombre: nombre,
    producto: producto,
    time: Date.now()
  });

  // Mostrar el formulario
  document.getElementById("pantallaQR").style.display = "none";
  document.getElementById("formulario").style.display = "block";
}

/* =========================
COPIAR YAPE
========================= */
function copiarYape(){
  navigator.clipboard.writeText("917107386");

  const boton=document.getElementById("btnCopiar");
  if(!boton) return;

  boton.innerText="✔ Copiado";
  setTimeout(()=>{ boton.innerText="Copiar número"; },3000);
}

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

firebase.initializeApp(firebaseConfig);
const db=firebase.database();

/* =========================
CLIENTES HOY
========================= */
db.ref("comprasHoy").on("value",(snap)=>{
  const total=snap.val() || 0;
  const span=document.getElementById("clientesHoy");
  if(span) span.innerText=total;
});

/* =========================
VENTAS POR PRODUCTO
========================= */
["Netflix","Disney+","Prime","HBO","Paramount","Spotify"].forEach(prod=>{
  db.ref("ventas/"+prod).on("value",snap=>{
    const total=snap.val() || 0;
    const span=document.getElementById("ventas"+prod.replace(/[^A-Za-z0-9]/g,""));
    if(span) span.innerText=total;
  });
});

/* =========================
NOTIFICACION COMPRA
========================= */
db.ref("comprasLive").limitToLast(1).on("child_added",(snap)=>{
  const data=snap.val();
  const box=document.getElementById("notificacionCompra");
  const texto=document.getElementById("textoCompra");
  if(!box) return;

  const segundos=Math.floor((Date.now()-data.time)/1000);
  let tiempo="";
  if(segundos<60) tiempo=segundos+" segundos";
  else if(segundos<3600) tiempo=Math.floor(segundos/60)+" min";
  else tiempo=Math.floor(segundos/3600)+" h";

  let productoMostrar=data.producto.replace(/ x\d+$/,"");
  productoMostrar+=" x1 Mes";

  texto.innerText=`${data.nombre} compró ${productoMostrar} hace ${tiempo}`;

  box.style.display="block";
  box.classList.add("show");

  setTimeout(()=>{
    box.classList.remove("show");
    setTimeout(()=>{ box.style.display="none"; },500);
  },5000);
});

/* =========================
FORMULARIO WHATSAPP
========================= */
document.addEventListener("DOMContentLoaded",function(){
  const formCompra=document.getElementById("formCompra");

  if(formCompra){
    formCompra.addEventListener("submit",function(e){
      e.preventDefault();

      const producto=document.getElementById("producto").value;
      const precio=document.getElementById("precio").value;
      const cliente=document.querySelector('input[name="nombrePago"]').value.trim();
      const transaccion=document.querySelector('input[name="transaccion"]').value.trim();

      const nombreLocal=localStorage.getItem("clienteNombre") || "Cliente";
      const nombreFinal=cliente || nombreLocal;

      if(!nombreFinal || !transaccion){
        alert("Completa el nombre y el número de transacción");
        return;
      }

      // === AQUI ACTUALIZAMOS FIREBASE ===
      registrarCompra(producto);

      let cantidad="1";
      let productoLimpio=producto;
      const match=producto.match(/x(\d+)$/);
      if(match){
        cantidad=match[1];
        productoLimpio=producto.replace(/ x\d+$/,"");
      }

      const ahora = new Date();
      const vence = new Date();
      vence.setDate(vence.getDate() + 30);
      const fechaCompra = ahora.toLocaleString('es-PE');
      const fechaVence = vence.toLocaleDateString('es-PE');

      const mensaje=
        "StreamsVip - Nueva Compra\n\n"+
        "Plataforma: "+productoLimpio+"\n"+
        "Precio x"+cantidad+": S/"+precio+"\n"+
        "Cliente: "+nombreFinal+"\n"+
        "Número de transacción: "+transaccion+"\n"+
        "Fecha/Hora: "+fechaCompra+"\n"+
        "Vence: "+fechaVence;

      const encoded=encodeURIComponent(mensaje);
      window.open(`https://wa.me/${numero}?text=${encoded}`,"_blank");

      formCompra.reset();
      document.getElementById("formulario").style.display="none";

      const toast=document.getElementById("toastGracias");
      if(toast){
        toast.innerText="¡Gracias por tu compra! Pronto recibirás tu acceso.";
        toast.classList.add("show");
        setTimeout(()=>toast.classList.remove("show"),3000);
      }

    });
  }

  /* =========================
  VALIDAR INPUTS
  ========================== */
  
  const nombrePago=document.querySelector('input[name="nombrePago"]');
  if(nombrePago){
    nombrePago.addEventListener("input",function(){
      this.value=this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ ]/g,"");
    });
  }

  const transaccion=document.querySelector('input[name="transaccion"]');
  if(transaccion){
    transaccion.addEventListener("input",function(){
      this.value=this.value.replace(/[^0-9]/g,"");
    });
  }

  /* =========================
  SLIDER
  ========================== */
  showSlides();
  startAutoSlide();
});

/* =========================
SLIDER FUNCIONES
========================= */
let slideIndex=1;
let slideInterval;

function showSlides(){
  const slides=document.getElementsByClassName("slide");
  const dots=document.getElementsByClassName("dot");
  for(let i=0;i<slides.length;i++) slides[i].classList.remove("active");
  for(let i=0;i<dots.length;i++) dots[i].classList.remove("active");

  if(slideIndex>slides.length) slideIndex=1;
  if(slideIndex<1) slideIndex=slides.length;

  slides[slideIndex-1].classList.add("active");
  dots[slideIndex-1].classList.add("active");
}

function plusSlides(n){
  clearInterval(slideInterval);
  slideIndex+=n;
  showSlides();
  startAutoSlide();
}

function currentSlide(n){
  clearInterval(slideInterval);
  slideIndex=n;
  showSlides();
  startAutoSlide();
}

function startAutoSlide(){
  slideInterval=setInterval(()=>{
    slideIndex++;
    showSlides();
  },5000);
}

/* =========================
MODAL COMPRA
========================= */
let precioBase=0;
let cantidadProducto=1;
let productoActual="";

function agregarCarrito(nombre,precio,descripcion,imagen){
  const modal=document.getElementById("modalCompra");
  if(!modal) return;

  productoActual=nombre;
  precioBase=precio;
  cantidadProducto=1;

  document.getElementById("modalNombre").innerText=nombre;
  document.getElementById("modalDescripcion").innerText=descripcion;
  document.getElementById("modalImagen").src=imagen;
  document.getElementById("cantidadProducto").innerText=cantidadProducto;
  document.getElementById("precioTotal").innerText=precioBase.toFixed(2);

  modal.style.display="flex";

  const listaReglas=document.getElementById("listaReglas");
  const reglasOriginales=[
    `<li>Perfil personal válido por <b>30 días</b>.</li>`,
    `<li>No cambiar correo ni contraseña de la cuenta.</li>`,
    `<li>No eliminar perfiles existentes.</li>`,
    `<li>No modificar configuraciones de la cuenta.</li>`,
    `<li>Uso exclusivo del perfil asignado.</li>`,
    `<li>El incumplimiento de estas condiciones anula garantía.</li>`
  ];
  listaReglas.innerHTML=reglasOriginales.join("");

  if(nombre.toLowerCase().includes("prime")){
    const reglaPrime = document.createElement("li");
    reglaPrime.textContent = "No está permitido alquilar ni comprar películas.";
    const items = listaReglas.querySelectorAll("li");
    listaReglas.insertBefore(reglaPrime, items[items.length - 1]);
  }

  if(nombre.toLowerCase().includes("spotify")){
    listaReglas.innerHTML=`
      <li>Cuenta personal e intransferible.</li>
      <li>No cambiar correo ni contraseña.</li>
      <li>Uso en un solo dispositivo.</li>
      <li>No modificar configuraciones.</li>
    `;
  }
}

function cerrarModal(){
  const modal=document.getElementById("modalCompra");
  if(modal) modal.style.display="none";
}

  function cambiarCantidad(valor){
    cantidadProducto+=valor;
    if(cantidadProducto<1) cantidadProducto=1;
    document.getElementById("cantidadProducto").innerText=cantidadProducto;
    const total=precioBase*cantidadProducto;
    document.getElementById("precioTotal").innerText=total.toFixed(2);
  }

  function comprarAhora(){
    const total = (precioBase * cantidadProducto).toFixed(2);

    // Guardar valores en inputs ocultos
    document.getElementById("producto").value = productoActual + " x" + cantidadProducto;
    document.getElementById("precio").value = total; 

    // Campo visible bloqueado con Monto primero, luego producto
    document.getElementById("montoPagar").value = "Monto S/." + total + " - " + productoActual;

  cerrarModal();

  const productos = document.querySelector(".productos");
  if(productos) productos.style.display = "none";

  const banner = document.querySelector(".bannerFull");
  if(banner) banner.style.display = "none";

  document.getElementById("pantallaQR").style.display = "block";
}
/* =========================
CERRAR MODAL CLICK FUERA
========================= */
window.addEventListener("click",function(e){
  const modal=document.getElementById("modalCompra");
  if(e.target===modal) modal.style.display="none";
});

/* =========================
MENU MOVIL
========================= */
function toggleMenu(){
  const menu=document.getElementById("menuLateral");
  if(menu) menu.classList.toggle("activo");
}

/* =========================
ABRIR YAPE
========================= */
function abrirYape(){
  window.open("yape://pay?phone=917107386","_blank");
}

/* =========================
REGISTRAR COMPRA FIREBASE
========================= */
function registrarCompra(producto){
  const nombre=localStorage.getItem("clienteNombre") || "Cliente";

  // Contador compras hoy
  db.ref("comprasHoy").transaction(function(total){
    return (total || 0)+1;
  });

  // Ventas por producto
  let productoBase=producto.replace(/ x\d+$/,"");
  db.ref("ventas/"+productoBase).transaction(function(total){
    return (total || 0)+1;
  });

  // Notificación en vivo
  db.ref("comprasLive").push({
    nombre:nombre,
    producto:producto,
    time:Date.now()
  });
}

/* =========================
PROTECCION BASICA WEB
========================= */
document.addEventListener("contextmenu",function(e){ e.preventDefault(); });
document.addEventListener("keydown",function(e){
  if(e.key==="F12") e.preventDefault();
  if(e.ctrlKey && e.shiftKey && e.key==="I") e.preventDefault();
  if(e.ctrlKey && e.shiftKey && e.key==="J") e.preventDefault();
  if(e.ctrlKey && e.key==="U") e.preventDefault();
});
document.addEventListener("copy",function(e){ e.preventDefault(); });
document.addEventListener("dragstart",function(e){ e.preventDefault(); });
setInterval(function(){
  if(window.outerWidth - window.innerWidth > 200){
    document.body.innerHTML="";
  }
},1000);

/* =========================
SALIR DEL SISTEMA
========================= */
function salir(){
  const toast = document.getElementById("toastGracias");
  if(toast){
    toast.innerText="¡Gracias por su visita! Volviendo al inicio...";
    toast.classList.add("show");
    setTimeout(()=>{
      toast.classList.remove("show");
      localStorage.removeItem("clienteNombre");
      window.location.href="index.html";
    },2000);
  } else {
    localStorage.removeItem("clienteNombre");
    window.location.href="index.html";
  }
}
