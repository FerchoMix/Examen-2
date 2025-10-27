/* ================= Config ================= */
const DB_NAME='perfumeShop_auth_reviews_v1';
const DB_VERSION=1;
const DEFAULT_AVATAR='https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Profile_avatar_placeholder_large.png/240px-Profile_avatar_placeholder_large.png';
const DEFAULT_PRODUCT='https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Perfume_bottles.jpg/320px-Perfume_bottles.jpg';

let db;

/* ================= IndexedDB ================= */
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=(e)=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('clients')) db.createObjectStore('clients',{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains('orders')) db.createObjectStore('orders',{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains('products')) db.createObjectStore('products',{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains('reviews')) db.createObjectStore('reviews',{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains('users')) db.createObjectStore('users',{keyPath:'id',autoIncrement:true}); // auth demo
    };
    req.onsuccess=()=>{db=req.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function store(n,m='readonly'){return db.transaction(n,m).objectStore(n)}
function add(n,v){return new Promise((r,j)=>{const x=store(n,'readwrite').add(v);x.onsuccess=()=>r(x.result);x.onerror=()=>j(x.error);})}
function all(n){return new Promise(r=>{const out=[];store(n).openCursor().onsuccess=e=>{const c=e.target.result;if(c){out.push(c.value);c.continue();}else r(out)}})}
function clearStore(n){return new Promise(r=>store(n,'readwrite').clear().onsuccess=()=>r())}
function remove(n,id){return new Promise(r=>store(n,'readwrite').delete(id).onsuccess=()=>r())}

/* ================= Utilidades ================= */
const $=s=>document.querySelector(s);
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>resolve(fr.result);
    fr.onerror=reject;
    fr.readAsDataURL(file);
  });
}

/* ================= Datos semilla ================= */
const SAMPLE_CLIENTS=[
  {nombre:'Carla Robles',ci:'7392012',genero:'Femenino',foto:''},
  {nombre:'Luis Pérez',ci:'5849230',genero:'Masculino',foto:''},
  {nombre:'Ana Gómez',ci:'6123498',genero:'Femenino',foto:''}
];
const SAMPLE_PRODUCTS=[
  // Puedes añadir productos tú mismo en la sección "Productos (admin)"
  // o usar este set básico sin imágenes (sube las tuyas con el admin)
  {nombre:"J'adore",marca:"Dior",precio:950,img:''},
  {nombre:"Bleu de Chanel",marca:"Chanel",precio:1100,img:''},
  {nombre:"Acqua di Gio",marca:"Giorgio Armani",precio:990,img:''},
];
const SAMPLE_REVIEWS=[
  {nombre:'Carla Robles',texto:'Aroma duradero y elegante. Envío rápido.',rating:5},
  {nombre:'Luis Pérez',texto:'Buen precio y atención.',rating:4},
];
const SAMPLE_ORDERS=[
  {cliente:'Carla Robles',producto:"J'adore",cantidad:1},
  {cliente:'Luis Pérez',producto:'Bleu de Chanel',cantidad:2},
];

async function seed(){
  if((await all('clients')).length===0) for(const c of SAMPLE_CLIENTS) await add('clients',c);
  if((await all('products')).length===0) for(const p of SAMPLE_PRODUCTS) await add('products',p);
  if((await all('reviews')).length===0) for(const r of SAMPLE_REVIEWS) await add('reviews',r);
  if((await all('orders')).length===0) for(const o of SAMPLE_ORDERS) await add('orders',o);
}

/* ================= Helpers ================= */
async function getProductByName(name){ const prods=await all('products'); return prods.find(p=>p.nombre===name); }
async function getClientByName(name){ const cl=await all('clients'); return cl.find(c=>c.nombre===name); }

/* ================= Auth (demo local) ================= */
function setSession(user){ localStorage.setItem('ps_current_user', JSON.stringify(user)); repaintAuth(); }
function getSession(){ const raw=localStorage.getItem('ps_current_user'); return raw? JSON.parse(raw): null; }
function clearSession(){ localStorage.removeItem('ps_current_user'); repaintAuth(); }

async function doRegister(){
  const name=$('#regName').value.trim(), email=$('#regEmail').value.trim(), pass=$('#regPass').value;
  if(!name||!email||!pass) return alert('Completa nombre, email y contraseña');
  const users=await all('users');
  if(users.some(u=>u.email===email)) return alert('Ese email ya está registrado');
  const id=await add('users',{name,email,pass}); // plano (demo)
  closeModal('#modalRegister');
  setSession({id,name,email});
}
async function doLogin(){
  const email=$('#loginEmail').value.trim(), pass=$('#loginPass').value;
  const users=await all('users');
  const u=users.find(x=>x.email===email && x.pass===pass);
  if(!u) return alert('Credenciales inválidas');
  closeModal('#modalLogin');
  setSession({id:u.id,name:u.name,email:u.email});
}
function repaintAuth(){
  const u=getSession();
  const hello=$('#helloUser'), btnLogin=$('#btnLogin'), btnReg=$('#btnRegister'), btnOut=$('#btnLogout');
  if(u){
    hello.style.display='inline'; hello.textContent=`Hola, ${u.name}`;
    btnLogin.style.display='none'; btnReg.style.display='none'; btnOut.style.display='inline-block';
  }else{
    hello.style.display='none'; hello.textContent='';
    btnLogin.style.display='inline-block'; btnReg.style.display='inline-block'; btnOut.style.display='none';
  }
}

/* ================= Modales ================= */
function openModal(sel){ const m=$(sel); if(m) m.setAttribute('aria-hidden','false'); }
function closeModal(sel){ const m=$(sel); if(m) m.setAttribute('aria-hidden','true'); }
document.addEventListener('click',(e)=>{
  const closeSel = e.target.getAttribute?.('data-close');
  if(closeSel) closeModal(closeSel);
  if(e.target.classList?.contains('modal')) e.target.setAttribute('aria-hidden','true');
});

/* ================= Render ================= */
async function renderClientes(){
  const data=await all('clients');
  $('#countClientes').textContent=data.length;
  const box=$('#listaClientes'); box.innerHTML='';
  data.slice(-20).reverse().forEach(c=>{
    const d=document.createElement('div'); d.className='item';
    const foto=c.foto && c.foto.trim()? c.foto : DEFAULT_AVATAR;
    d.innerHTML=`
      <div class="ph"><img src="${foto}" alt="${c.nombre}"
        onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';"></div>
      <div class="body">
        <strong>${c.nombre}</strong>
        <div class="small">CI ${c.ci}${c.genero? ' · '+c.genero:''}</div>
      </div>
      <div class="actions"><button class="btn" data-del>Eliminar</button></div>`;
    d.querySelector('[data-del]').onclick=async()=>{await remove('clients',c.id);await renderClientes();await fillClienteSelect();await fillReviewClients();};
    box.appendChild(d);
  });
  await fillClienteSelect();
  await fillReviewClients();
}

async function renderPedidos(){
  const data=await all('orders');
  $('#countPedidos').textContent=data.length;
  const mini=$('#listaPedidosMini'), full=$('#listaPedidos');
  if(mini) mini.innerHTML=''; if(full) full.innerHTML='';

  for(const o of data.slice(-20).reverse()){
    const p=await getProductByName(o.producto);
    const totalTxt=p?` · Total Bs. ${o.cantidad * (p.precio||0)}`:'';
    const rowHTML=`
      <div class="ph"></div>
      <div class="body">
        <strong>${o.producto}</strong> <span class="small">x${o.cantidad}${totalTxt}</span>
        <div class="small">Cliente: ${o.cliente}</div>
      </div>
      <div class="actions"><button class="btn" data-del>Eliminar</button></div>`;

    if(full){
      const r1=document.createElement('div'); r1.className='item'; r1.innerHTML=rowHTML;
      r1.querySelector('[data-del]').onclick=async()=>{await remove('orders',o.id);renderPedidos();};
      full.appendChild(r1);
    }
    if(mini){
      const r2=document.createElement('div'); r2.className='item'; r2.innerHTML=rowHTML;
      r2.querySelector('[data-del]').onclick=async()=>{await remove('orders',o.id);renderPedidos();};
      mini.appendChild(r2);
    }
  }
}

async function renderReviews(){
  const data=await all('reviews');
  const r=$('#reviewsRow'); r.innerHTML='';
  for(const rv of data.slice(-12).reverse()){
    // Foto = la del cliente correspondiente (si existe), si no, avatar por defecto
    let avatar = DEFAULT_AVATAR;
    const c = await getClientByName(rv.nombre);
    if(c && c.foto) avatar = c.foto;
    const card=document.createElement('div');
    card.className='review';
    card.innerHTML=`
      <div class="stars">${'★'.repeat(rv.rating)}${'☆'.repeat(5-rv.rating)}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
        <div class="ph" style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex:0 0 32px">
          <img src="${avatar}" alt="${rv.nombre}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
        </div>
        <div style="font-weight:600">${rv.nombre}</div>
      </div>
      <div class="muted" style="margin-top:6px">${rv.texto}</div>`;
    r.appendChild(card);
  }
}

async function renderDestacados(){
  const prods=await all('products');
  const b=$('#destacados'); if(!b) return; b.innerHTML='';
  prods.slice(-3).reverse().forEach(p=>{
    const d=document.createElement('div'); d.className='item';
    const img = p.img && p.img.trim() ? p.img : DEFAULT_PRODUCT;
    d.innerHTML=`
      <div class="ph">
        <img src="${img}" alt="${p.nombre}"
             onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT}';">
      </div>
      <div class="body"><strong>${p.nombre}</strong><div class="small">${p.marca||''}</div></div>
      <div class="actions"><button class="btn primary" data-buy>Comprar Bs. ${p.precio ?? '—'}</button></div>`;
    b.appendChild(d);
    d.querySelector('[data-buy]').onclick=()=>{
      const selProd=$('#oProducto'), qty=$('#oCantidad'), pedidosCard=$('#pedidos');
      if(selProd){
        selProd.value = p.nombre;
        if(selProd.value !== p.nombre) fillProductoSelect().then(()=> selProd.value = p.nombre);
      }
      if(pedidosCard) pedidosCard.scrollIntoView({behavior:'smooth',block:'start'});
      if(qty) qty.focus();
    };
  });
}

/* ================= Selects ================= */
async function fillProductoSelect(){
  const prods=await all('products');
  $('#oProducto').innerHTML='<option value="">Producto</option>'+prods.map(p=>`<option value="${p.nombre}">${p.nombre} — Bs. ${p.precio||0}</option>`).join('');
}
async function fillClienteSelect(){
  const clients=await all('clients');
  $('#oClienteSel').innerHTML='<option value="">Selecciona cliente</option>'+clients.map(c=>`<option>${c.nombre}</option>`).join('');
}
async function fillReviewClients(){
  const clients=await all('clients');
  $('#rCliente').innerHTML='<option value="">Elige cliente</option>'+clients.map(c=>`<option>${c.nombre}</option>`).join('');
}


$('#addCliente').onclick=async()=>{
  const nombre=$('#cNombre').value.trim();
  const ci=$('#cCi').value.trim();
  const genero=$('#cGenero').value;
  const fileInput=$('#cFotoFile');
  if(!nombre||!ci){alert('Completa nombre y CI');return;}


  let fotoFinal = '';
  if(fileInput.files && fileInput.files[0]){
    fotoFinal = await fileToDataURL(fileInput.files[0]);
  }
  await add('clients',{nombre,ci,genero,foto: fotoFinal});
  $('#cNombre').value=''; $('#cCi').value=''; $('#cGenero').value=''; fileInput.value='';
  await renderClientes();
};


$('#resetClientes').onclick=async()=>{ await clearStore('clients'); await renderClientes(); };
$('#resetPedidos').onclick=async()=>{ await clearStore('orders'); await renderPedidos(); };

$('#addPedido').onclick=async()=>{
  const cliente=$('#oClienteSel').value;
  const producto=$('#oProducto').value;
  const cantidad=parseInt($('#oCantidad').value||'1',10);
  if(!cliente||!producto||!cantidad){alert('Selecciona cliente y completa producto y cantidad');return;}
  await add('orders',{cliente,producto,cantidad});
  $('#oClienteSel').value=''; $('#oProducto').value=''; $('#oCantidad').value='1';
  renderPedidos();
};

$('#addReview').onclick=async()=>{
  const nombre=$('#rCliente').value;
  const rating=parseInt($('#rRating').value,10);
  const texto=$('#rTexto').value.trim();
  if(!nombre||!texto){alert('Selecciona cliente y escribe la reseña');return;}
  await add('reviews',{nombre,texto,rating});
  $('#rCliente').value=''; $('#rTexto').value='';
  renderReviews();
};


$('#addProducto').onclick=async()=>{
  const nombre=$('#pNombre').value.trim();
  const marca=$('#pMarca').value.trim();
  const precio=parseFloat($('#pPrecio').value||'0');
  const file=$('#pImgFile').files?.[0];
  if(!nombre||!marca||!precio){alert('Completa nombre, marca y precio');return;}
  let img='';
  if(file){
    img = await fileToDataURL(file);
  }
  await add('products',{nombre,marca,precio,img});
  $('#pNombre').value=''; $('#pMarca').value=''; $('#pPrecio').value=''; $('#pImgFile').value='';
  await fillProductoSelect();
  await renderDestacados();
};

$('#btnLogin').onclick=()=>openModal('#modalLogin');
$('#btnRegister').onclick=()=>openModal('#modalRegister');
$('#btnLogout').onclick=()=>clearSession();
$('#doRegister').onclick=()=>doRegister();
$('#doLogin').onclick=()=>doLogin();

(async()=>{
  await openDB();
  await seed();
  await fillProductoSelect();
  await renderClientes();
  await renderPedidos();
  await renderReviews();
  await renderDestacados();
  repaintAuth();
})();
