/* 
StreamsVip Sistema Oficial
Mejorado
2026
*/

const numero="51916252754";

/* =========================
FIREBASE
========================= */

const firebaseConfig={
apiKey:"AIzaSyC3rYEe4akJ0w8zcNM4q-25yG7q6CaUHhY",
authDomain:"streamsvip-b7d91.firebaseapp.com",
databaseURL:"https://streamsvip-b7d91-default-rtdb.firebaseio.com",
projectId:"streamsvip-b7d91",
storageBucket:"streamsvip-b7d91.appspot.com",
messagingSenderId:"440618225611",
appId:"1:440618225611:web:eeb4230a10499e1dfff04e"
};

firebase.initializeApp(firebaseConfig);
const db=firebase.database();

/* =========================
VARIABLES
========================= */

let precioBase=0;
let cantidadProducto=1;
let productoActual="";
let productoBaseActual="";
let stockDisponible=0;

/* =========================
ENTRAR
========================= */

function entrar(){

const nombre=document.getElementById("nombre").value.trim();
const terminos=document.getElementById("terminos").checked;

if(nombre===""||!terminos){
alert("Debes ingresar tu nombre y aceptar los términos");
return;
}

localStorage.setItem("clienteNombre",nombre);
window.location.href="tienda.html";

}
/* =========================
ABRIR TERMINOS
========================= */

function abrirTerminos(){

const modal=document.getElementById("modalTerminos");

if(modal){
modal.style.display="flex";
}

}

function cerrarTerminos(){

const modal=document.getElementById("modalTerminos");

if(modal){
modal.style.display="none";

}
}
/* =========================
ACEPTAR TERMINOS
========================= */

function aceptarTerminos(){

const check=document.getElementById("terminos");
const modal=document.getElementById("modalTerminos");

check.disabled=false;
check.checked=true;

modal.style.display="none";

}
/* =========================
COPIAR YAPE
========================= */

function copiarYape(){

navigator.clipboard.writeText("917107386");

const boton=document.getElementById("btnCopiar");

if(!boton)return;

boton.innerText="✔ Copiado";

setTimeout(()=>{
boton.innerText="Copiar número";
},3000);

}

/* =========================
ABRIR YAPE
========================= */

function abrirYape(){

const telefono="917107386";

/* detectar celular */

const esMovil=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if(esMovil){

window.location.href="yape://pay?phone="+telefono;

}else{

alert("Para abrir Yape debes usar un celular");

}

}


/* =========================
CLIENTES HOY
========================= */

db.ref("comprasHoy").on("value",snap=>{

const total=snap.val()||0;

const span=document.getElementById("clientesHoy");

if(span)span.innerText=total;

});

/* =========================
VENTAS POR PRODUCTO
========================= */

const productos={
Netflix:"ventasNetflix",
Disney:"ventasDisney",
Prime:"ventasPrime",
HBO:"ventasHBO",
Paramount:"ventasParamount",
Spotify:"ventasSpotify"
};

for(let prod in productos){

db.ref("ventas/"+prod).on("value",snap=>{

const total=snap.val()||0;

const span=document.getElementById(productos[prod]);

if(span)span.innerText=total;

});

}

/* =========================
NOTIFICACION COMPRA
========================= */

db.ref("comprasLive").limitToLast(1).on("child_added",snap=>{

const data=snap.val();

const box=document.getElementById("notificacionCompra");
const texto=document.getElementById("textoCompra");

if(!box)return;

let productoMostrar=data.producto.replace(/ x\d+$/,"");

texto.innerText=`${data.nombre} compró ${productoMostrar}`;

box.style.display="block";

setTimeout(()=>{
box.style.display="none";
},5000);

});

/* =========================
MODAL PRODUCTO
========================= */

function agregarCarrito(nombre,precio,descripcion,imagen){

const modal=document.getElementById("modalCompra");

productoActual=nombre;
precioBase=precio;
cantidadProducto=1;

if(nombre.toLowerCase().includes("netflix"))productoBaseActual="Netflix";
else if(nombre.toLowerCase().includes("disney"))productoBaseActual="Disney";
else if(nombre.toLowerCase().includes("prime"))productoBaseActual="Prime";
else if(nombre.toLowerCase().includes("hbo"))productoBaseActual="HBO";
else if(nombre.toLowerCase().includes("paramount"))productoBaseActual="Paramount";
else if(nombre.toLowerCase().includes("spotify"))productoBaseActual="Spotify";

document.getElementById("modalNombre").innerText=nombre;
document.getElementById("modalDescripcion").innerText=descripcion;
document.getElementById("modalImagen").src=imagen;

document.getElementById("cantidadProducto").innerText=1;
document.getElementById("precioTotal").innerText=precio.toFixed(2);

db.ref("stock/"+productoBaseActual).once("value").then(snap=>{

stockDisponible=snap.val()||0;

if(stockDisponible<=0){

alert("Producto agotado");
return;

}

});

const lista=document.getElementById("listaReglas");

let reglasHTML="";

/* ===== NETFLIX ===== */

if(productoBaseActual==="Netflix"){

reglasHTML=`
<li>Perfil unicamente para un dispositivo.</li>
<li>No cambiar correo ni contraseña de la cuenta.</li>
<li>No eliminar ni modificar perfiles existentes.</li>
<li>No alterar configuraciones de la cuenta.</li>
<li>Uso exclusivo para ver contenido.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

/* ===== DISNEY ===== */

else if(productoBaseActual==="Disney"){

reglasHTML=`
<li>Perfil para uso personal.</li>
<li>No cambiar correo ni contraseña.</li>
<li>No eliminar perfiles existentes.</li>
<li>No compartir el acceso con terceros.</li>
<li>Uso exclusivo para ver contenido en la plataforma.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

/* ===== PRIME VIDEO ===== */

else if(productoBaseActual==="Prime"){

reglasHTML=`
<li>Perfil para uso personal.</li>
<li>No modificar correo ni contraseña.</li>
<li>No eliminar perfiles ni cambiar configuraciones.</li>
<li>No compartir el acceso con terceros.</li>
<li>No comprar ni alquilar películas dentro de la plataforma.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

/* ===== HBO ===== */

else if(productoBaseActual==="HBO"){

reglasHTML=`
<li>Perfil para uso personal.</li>
<li>No cambiar correo ni contraseña.</li>
<li>No eliminar perfiles existentes.</li>
<li>No modificar configuraciones de la cuenta.</li>
<li>Uso exclusivo para ver contenido.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

/* ===== PARAMOUNT ===== */

else if(productoBaseActual==="Paramount"){

reglasHTML=`
<li>Acceso para uso personal.</li>
<li>No modificar credenciales de la cuenta.</li>
<li>No eliminar perfiles existentes.</li>
<li>No compartir acceso con terceros.</li>
<li>Uso exclusivo dentro de la plataforma.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

/* ===== SPOTIFY ===== */

else if(productoBaseActual==="Spotify"){

reglasHTML=`
<li>Cuenta para uso personal.</li>
<li>No cambiar correo ni contraseña.</li>
<li>No modificar el plan de la cuenta.</li>
<li>No compartir acceso con terceros.</li>
<li>No cambiar país o región de la cuenta.</li>
<li>El incumplimiento de estas condiciones anula la garantía.</li>
`;

}

lista.innerHTML=reglasHTML;

modal.style.display="flex";

}

/* =========================
CERRAR MODAL
========================= */

function cerrarModal(){
document.getElementById("modalCompra").style.display="none";
}

window.addEventListener("click",function(e){

const modal=document.getElementById("modalCompra");

if(e.target===modal){
modal.style.display="none";
}

});

document.addEventListener("keydown",function(e){

if(e.key==="Escape"){
const modal=document.getElementById("modalCompra");
if(modal)modal.style.display="none";
}

});

/* =========================
CANTIDAD
========================= */

function cambiarCantidad(valor){

let nuevaCantidad=cantidadProducto+valor;

if(nuevaCantidad<1)nuevaCantidad=1;

if(nuevaCantidad>stockDisponible){

alert("Solo quedan "+stockDisponible+" perfiles disponibles");
return;

}

cantidadProducto=nuevaCantidad;

document.getElementById("cantidadProducto").innerText=cantidadProducto;

const total=precioBase*cantidadProducto;

document.getElementById("precioTotal").innerText=total.toFixed(2);

}

/* =========================
COMPRAR
========================= */

function comprarAhora(){

if(cantidadProducto>stockDisponible){

alert("No hay suficiente stock disponible");
return;

}

const total=(precioBase*cantidadProducto).toFixed(2);

document.getElementById("producto").value=productoActual+" x"+cantidadProducto;
document.getElementById("precio").value=total;
document.getElementById("montoPagar").value="Monto S/."+total+" - "+productoActual;

cerrarModal();

document.querySelector(".productos").style.display="none";

const banner=document.querySelector(".bannerFull");

if(banner)banner.style.display="none";

document.getElementById("pantallaQR").style.display="block";

}

/* =========================
MOSTRAR FORMULARIO
========================= */

function mostrarFormulario(){

const qr=document.getElementById("pantallaQR");
const form=document.getElementById("formulario");

if(qr)qr.style.display="none";
if(form)form.style.display="block";

}

/* =========================
FORMULARIO
========================= */

document.addEventListener("DOMContentLoaded",function(){
    

const form=document.getElementById("formCompra");

if(!form)return;

form.addEventListener("submit",function(e){

e.preventDefault();

const producto=document.getElementById("producto").value;
const precio=document.getElementById("precio").value;

const cliente=document.querySelector('input[name="nombrePago"]').value.trim();
const transaccion=document.querySelector('input[name="transaccion"]').value.trim();

if(!cliente||!transaccion){

alert("Completa los datos");
return;

}

registrarCompra(producto);

/* FECHA ACTUAL */

const ahora=new Date();

const fecha=ahora.toLocaleDateString("es-PE");
const hora=ahora.toLocaleTimeString("es-PE",{hour:'2-digit',minute:'2-digit'});

/* VENCIMIENTO 30 DIAS */

const vence=new Date();
vence.setDate(vence.getDate()+30);

const fechaVence=vence.toLocaleDateString("es-PE");

const mensaje=
"StreamsVip - Nueva Compra\n\n"+
"Producto: "+producto+"\n"+
"Precio: S/"+precio+"\n"+
"Cliente: "+cliente+"\n"+
"Transacción: "+transaccion+"\n"+
"Fecha/Hora: "+fecha+" "+hora+"\n"+
"Vence: "+fechaVence;

window.open("https://wa.me/"+numero+"?text="+encodeURIComponent(mensaje),"_blank");

form.reset();

document.getElementById("formulario").style.display="none";

});

});

/* =========================
REGISTRAR COMPRA
========================= */

function registrarCompra(producto){

const nombre=localStorage.getItem("clienteNombre")||"Cliente";

db.ref("comprasHoy").transaction(total=>{
return(total||0)+1;
});

let productoBase="";

if(producto.toLowerCase().includes("netflix"))productoBase="Netflix";
else if(producto.toLowerCase().includes("disney"))productoBase="Disney";
else if(producto.toLowerCase().includes("prime"))productoBase="Prime";
else if(producto.toLowerCase().includes("hbo"))productoBase="HBO";
else if(producto.toLowerCase().includes("paramount"))productoBase="Paramount";
else if(producto.toLowerCase().includes("spotify"))productoBase="Spotify";

if(productoBase!==""){

db.ref("ventas/"+productoBase).transaction(total=>{
return(total||0)+1;
});

db.ref("stock/"+productoBase).transaction(stock=>{

if(stock>=cantidadProducto){
return stock-cantidadProducto;
}

return stock;

});

}

db.ref("comprasLive").push({
nombre:nombre,
producto:producto,
time:Date.now()
});

}

/* =========================
CONTROL STOCK
========================= */

const listaStock=["Netflix","Disney","Prime","HBO","Paramount","Spotify"];

listaStock.forEach(prod=>{

db.ref("stock/"+prod).on("value",snap=>{

let stock=snap.val();

if(stock==null)stock=0;

const span=document.getElementById("stock"+prod);

if(span)span.innerText=stock;

const card=document.getElementById("producto"+prod);

if(!card)return;

const boton=card.querySelector("button");

let aviso=card.querySelector(".avisoStock");

if(!aviso){

aviso=document.createElement("p");
aviso.className="avisoStock";

const stockTexto=card.querySelector(".stock");

if(stockTexto){
stockTexto.insertAdjacentElement("afterend",aviso);
}else{
card.appendChild(aviso);
}

}

if(stock<=0){

boton.innerText="AGOTADO";
boton.disabled=true;

aviso.style.display="none";

}else{

boton.innerText="🛒Agregar al carrito";
boton.disabled=false;

if(stock>1 && stock<=5){

aviso.style.display="block";
aviso.innerText=`⚠ Solo quedan ${stock} perfiles disponibles`;

}

else if(stock==1){

aviso.style.display="block";
aviso.innerText="⚠ Solo queda 1 perfil disponible";

}

else{

aviso.style.display="none";

}

}

});

});
/* =========================
BANNER SLIDER
========================= */

let slideIndex = 1;

mostrarSlides(slideIndex);

function plusSlides(n){
slideIndex += n;
mostrarSlides(slideIndex);
}

function currentSlide(n){
slideIndex = n;
mostrarSlides(slideIndex);
}

function mostrarSlides(n){

const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

if(n > slides.length){slideIndex = 1}
if(n < 1){slideIndex = slides.length}

slides.forEach(slide=>{
slide.classList.remove("active");
});

dots.forEach(dot=>{
dot.classList.remove("active");
});

slides[slideIndex-1].classList.add("active");

if(dots[slideIndex-1]){
dots[slideIndex-1].classList.add("active");
}

}

/* auto cambio cada 5s */

setInterval(()=>{
plusSlides(1);
},5000);

/* =========================
MENU
========================= */

function toggleMenu() {
  document.getElementById("menuLateral").classList.toggle("active");
}

/* =========================
SALIR
========================= */

function salir(){

const toast=document.getElementById("toastGracias");

if(toast){
toast.classList.add("show");
}

setTimeout(()=>{
localStorage.removeItem("clienteNombre");
window.location.href="index.html";
},1800);

}
/* =========================
OFERTAS: MODAL YAPE PROFESIONAL
========================= */
document.addEventListener("DOMContentLoaded", () => {

  // Detectar modal
  const modalQR = document.getElementById("modalQR");
  if (!modalQR) return;

  // Reescribir contenido del modal QR para la oferta
  modalQR.innerHTML = `
    <div class="modal-content">
      <h2>Pagar con Yape</h2>
      <p class="precioModal">Total a pagar</p>
      <h1 id="precioYape">S/6.50</h1>
      <img src="img/Qr.jpg" class="qrPago" alt="QR Pago">
      <p>Número Yape: <strong id="numeroYape">917107386</strong></p>
      <button class="btnComprar" id="btnAbrirYape">Abrir Yape</button>
      <button class="btnComprar" id="btnCopiar">Copiar número</button>
      <button class="btnComprar" id="btnRegistrarPago">Registrar pago</button>
      <button class="btnCerrar" id="btnCerrarModal">Cerrar</button>
    </div>
  `;

  const btnCopiar = document.getElementById("btnCopiar");
  const btnAbrir = document.getElementById("btnAbrirYape");
  const btnRegistrar = document.getElementById("btnRegistrarPago");
  const btnCerrar = document.getElementById("btnCerrarModal");
  const numero = "917107386";

  // Copiar número
  btnCopiar.addEventListener("click", () => {
    navigator.clipboard.writeText(numero);
    btnCopiar.innerText = "✔ Copiado";
    setTimeout(() => { btnCopiar.innerText = "Copiar número"; }, 3000);
  });

  // Abrir Yape en móvil
  btnAbrir.addEventListener("click", () => {
    const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (esMovil) {
      window.location.href = `yape://pay?phone=${numero}&name=Leidy Ser.`;
    } else {
      alert("Para abrir Yape debes usar un celular");
    }
  });

  // Registrar pago -> redirigir al formulario
  btnRegistrar.addEventListener("click", () => {
    // Prellenar formulario con datos de producto y monto
    const producto = document.querySelector(".ofertaCard h2")?.innerText || "Producto";
    const monto = document.querySelector(".precioOferta")?.innerText.replace("S/", "") || "0";
    const inputProducto = document.getElementById("producto");
    const inputPrecio = document.getElementById("precio");

    if (inputProducto) inputProducto.value = producto;
    if (inputPrecio) inputPrecio.value = monto;

    // Mostrar formulario
    const qrScreen = document.getElementById("modalQR");
    const formScreen = document.getElementById("formulario");

    if (qrScreen) qrScreen.style.display = "none";
    if (formScreen) formScreen.style.display = "block";
  });

  // Cerrar modal
  btnCerrar.addEventListener("click", () => {
    if(modalQR) modalQR.style.display = "none";
  });

});
/* =========================
NOTIFICACION MODAL OFERTA VIGENTE
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

document.addEventListener("DOMContentLoaded", function () {
  mostrarModalOfertaVigente();
});

/* CLICK EN BOTONES DEL MODAL */
document.addEventListener("click", function (e) {
  const modal = document.getElementById("modalOfertaVigente");
  if (!modal) return;

  /* BOTON VER OFERTA */
  if (e.target.closest("#btnVerOferta")) {
    e.preventDefault();
    window.location.href = "ofertas.html";
    return;
  }

  /* BOTON CERRAR */
  if (e.target.closest("#btnCerrarOferta")) {
    e.preventDefault();
    cerrarModalOfertaVigente();
    return;
  }

  /* BOTON X */
  if (e.target.closest("#cerrarOfertaX")) {
    e.preventDefault();
    cerrarModalOfertaVigente();
    return;
  }

  /* CERRAR AL TOCAR EL FONDO OSCURO */
  if (e.target === modal) {
    cerrarModalOfertaVigente();
  }
});

/* CERRAR CON ESCAPE */
document.addEventListener("keydown", function (e) {
  const modal = document.getElementById("modalOfertaVigente");
  if (!modal) return;

  if (e.key === "Escape" && modal.style.display === "flex") {
    cerrarModalOfertaVigente();
  }
});
