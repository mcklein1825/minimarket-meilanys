/*
Archivo: script.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\script.js
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: controlar la lógica principal de la tienda, catálogo, carrito, filtros, búsqueda y compra del cliente.
Tecnologías: JavaScript ES6, DOM, localStorage, integración con Mercado Pago.
Dependencias: index.html, styles.css, crear_preferencia.php, mercado-pago-config.php.
Estado: activo y funcional para la experiencia de compra.
*/
(function(){
  "use strict";

  /* ==========================================================
     DATOS
  ========================================================== */
  const categorias = [
    {id:'frutas-verduras', nombre:'Frutas y Verduras', icono:'🥬'},
    {id:'bebidas', nombre:'Bebidas', icono:'🥤'},
    {id:'lacteos-huevos', nombre:'Lácteos y Huevos', icono:'🥚'},
    {id:'panaderia', nombre:'Panadería', icono:'🥖'},
    {id:'carnes-pescados', nombre:'Carnes y Pescados', icono:'🥩'},
    {id:'congelados', nombre:'Congelados', icono:'🧊'},
    {id:'despensa', nombre:'Despensa', icono:'🍚'},
    {id:'snacks-dulces', nombre:'Snacks y Dulces', icono:'🍪'},
    {id:'cuidado-hogar', nombre:'Cuidado del Hogar', icono:'🧴'},
    {id:'cuidado-personal', nombre:'Cuidado Personal', icono:'🧼'},
    {id:'mascotas', nombre:'Mascotas', icono:'🐾'},
    {id:'bebes', nombre:'Bebés', icono:'🍼'}
  ];

  let pid = 1;
  const p = (categoria, nombre, precio, unidad, icono, precioAnterior, rating) => ({
    id: pid++, categoria, nombre, precio, unidad, icono,
    precioAnterior: precioAnterior || null,
    rating: rating || (4.3 + Math.random()*0.6).toFixed(1)
  });

  const productos = [
    p('frutas-verduras','Palta Hass',7.90,'kg','🥑'),
    p('frutas-verduras','Plátano de seda',3.20,'kg','🍌'),
    p('frutas-verduras','Tomate italiano',4.80,'kg','🍅',6.00),

    p('bebidas','Agua mineral sin gas 2.5L',3.50,'unidad','💧'),
    p('bebidas','Gaseosa cola 1.5L',6.90,'unidad','🥤',8.50),
    p('bebidas','Jugo de naranja 1L',5.20,'unidad','🧃'),

    p('lacteos-huevos','Leche evaporada 400g',3.80,'unidad','🥛'),
    p('lacteos-huevos','Huevos rojos x30',14.90,'paquete','🥚',17.90),
    p('lacteos-huevos','Yogurt natural 1L',9.90,'unidad','🍶'),

    p('panaderia','Pan francés x10',4.00,'unidad','🥖'),
    p('panaderia','Pan de molde integral',6.50,'unidad','🍞'),
    p('panaderia','Croissant x4',8.90,'paquete','🥐',10.90),

    p('carnes-pescados','Pechuga de pollo',14.90,'kg','🍗'),
    p('carnes-pescados','Filete de tilapia congelado 500g',16.90,'unidad','🐟'),
    p('carnes-pescados','Carne molida especial',22.90,'kg','🥩',26.90),

    p('congelados','Papas fritas congeladas 1kg',9.90,'unidad','🍟'),
    p('congelados','Hamburguesas mini x12',18.90,'paquete','🍔'),
    p('congelados','Helado de vainilla 1L',14.90,'unidad','🍨',18.90),

    p('despensa','Arroz extra 5kg',19.90,'bolsa','🍚'),
    p('despensa','Aceite vegetal 1L',9.50,'unidad','🫗'),
    p('despensa','Fideos spaghetti 500g',3.20,'unidad','🍝',4.00),

    p('snacks-dulces','Galletas de vainilla',4.50,'paquete','🍪'),
    p('snacks-dulces','Chocolate bitter x6',9.90,'caja','🍫',11.90),
    p('snacks-dulces','Gomitas surtidas',7.90,'bolsa','🍬'),

    p('cuidado-hogar','Detergente líquido 3L',24.90,'unidad','🧴'),
    p('cuidado-hogar','Papel higiénico x12',22.90,'paquete','🧻',26.90),
    p('cuidado-hogar','Bolsas de basura x30',9.90,'paquete','🗑️'),

    p('cuidado-personal','Shampoo anticaspa 400ml',19.90,'unidad','🧴'),
    p('cuidado-personal','Pasta dental menta',6.90,'unidad','🪥',8.50),
    p('cuidado-personal','Jabón de tocador x3',8.50,'paquete','🧼'),

    p('mascotas','Alimento para perro 15kg',89.90,'bolsa','🐶'),
    p('mascotas','Alimento para gato 3kg',32.90,'bolsa','🐱',37.90),
    p('mascotas','Arena sanitaria 10kg',24.90,'bolsa','🐾'),

    p('bebes','Pañales talla M x30',34.90,'paquete','👶'),
    p('bebes','Toallitas húmedas x80',9.90,'paquete','🧴'),
    p('bebes','Papilla de frutas',4.50,'unidad','🍎',5.50)
  ];

  const catById = Object.fromEntries(categorias.map(c => [c.id, c]));

  /* ==========================================================
     ESTADO
  ========================================================== */
  let currentFilter = 'todos';
  let searchTerm = '';
  let cart = {}; // { productId: cantidad }

  const fmt = n => 'S/ ' + n.toFixed(2);

  function syncCheckoutButton(){
    const checkoutBtn = document.getElementById('checkoutBtn');
    if(!checkoutBtn) return;
    const user = getCurrentUser();
    if(user){
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Ir a pagar';
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.cursor = 'pointer';
      return;
    }
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Inicia sesión para pagar';
    checkoutBtn.style.opacity = '.6';
    checkoutBtn.style.cursor = 'not-allowed';
  }

  /* ==========================================================
     TICKER
  ========================================================== */
  const tickerMsgs = [
    'Envío gratis en compras mayores a S/ 150',
    'Productos frescos seleccionados cada mañana',
    'Entrega en menos de 2 horas en Lima',
    'Paga con tarjeta, Yape, Plin o efectivo'
  ];
  document.getElementById('tickerTrack').innerHTML =
    (tickerMsgs.concat(tickerMsgs)).map(m => `<span>${m}</span>`).join('');

  /* ==========================================================
     HEADER: dropdown de categorías + scroll shadow
  ========================================================== */
  const catToggle = document.getElementById('catToggle');
  const catDropdown = document.getElementById('catDropdown');
  catDropdown.innerHTML = categorias.map(c =>
    `<a href="#categorias" data-cat="${c.id}">${c.icono} ${c.nombre}</a>`
  ).join('');

  catToggle.addEventListener('click', () => {
    const open = catDropdown.classList.toggle('open');
    catToggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if(!e.target.closest('.categories-nav')){
      catDropdown.classList.remove('open');
      catToggle.setAttribute('aria-expanded','false');
    }
  });
  catDropdown.addEventListener('click', e => {
    const a = e.target.closest('[data-cat]');
    if(!a) return;
    e.preventDefault();
    setFilter(a.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
    catDropdown.classList.remove('open');
  });

  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  });

  /* ==========================================================
     CATEGORY GRID
  ========================================================== */
  const categoryGrid = document.getElementById('categoryGrid');
  function renderCategoryGrid(){
    categoryGrid.innerHTML = categorias.map(c => `
      <button class="category-card ${currentFilter===c.id ? 'active':''}" data-cat="${c.id}">
        <span class="category-card__stamp">${c.icono}</span>
        <span class="category-card__label">${c.nombre}</span>
      </button>
    `).join('');
  }
  categoryGrid.addEventListener('click', e => {
    const btn = e.target.closest('.category-card');
    if(!btn) return;
    setFilter(btn.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
  });

  /* ==========================================================
     FILTER TABS
  ========================================================== */
  const filterTabs = document.getElementById('filterTabs');
  function renderFilterTabs(){
    const tabs = [{id:'todos', nombre:'Todos'}, ...categorias];
    filterTabs.innerHTML = tabs.map(c => `
      <button class="filter-tab ${currentFilter===c.id ? 'active':''}" data-cat="${c.id}">${c.nombre}</button>
    `).join('');
  }
  filterTabs.addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if(!btn) return;
    setFilter(btn.dataset.cat);
  });

  function setFilter(cat){
    currentFilter = cat;
    renderCategoryGrid();
    renderFilterTabs();
    renderProducts();
  }

  /* ==========================================================
     PRODUCT CARD (HTML)
  ========================================================== */
  function productCardHTML(prod){
    const hasDiscount = !!prod.precioAnterior;
    return `
      <article class="product-card" data-id="${prod.id}">
        <div class="product-card__media"><span>${prod.icono}</span></div>
        <div class="price-tag ${hasDiscount ? 'sale':''}">${fmt(prod.precio)}</div>
        <h3 class="product-card__name">${prod.nombre}</h3>
        <span class="product-card__unit">por ${prod.unidad}</span>
        <span class="product-card__rating">⭐ ${prod.rating}</span>
        <div class="product-card__prices">
          ${hasDiscount ? `<span class="price-old">${fmt(prod.precioAnterior)}</span>` : ''}
        </div>
        <button class="add-btn" data-id="${prod.id}">🛒 Agregar</button>
      </article>
    `;
  }

  /* ==========================================================
     OFFERS GRID
  ========================================================== */
  const offersGrid = document.getElementById('offersGrid');
  function renderOffers(){
    const offers = productos.filter(pr => pr.precioAnterior);
    offersGrid.innerHTML = offers.map(productCardHTML).join('');
  }

  /* ==========================================================
     PRODUCT GRID (catálogo con filtro + búsqueda)
  ========================================================== */
  const productGrid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  function renderProducts(){
    let list = productos;
    if(currentFilter !== 'todos') list = list.filter(pr => pr.categoria === currentFilter);
    if(searchTerm){
      const t = searchTerm.toLowerCase();
      list = list.filter(pr => pr.nombre.toLowerCase().includes(t) || catById[pr.categoria].nombre.toLowerCase().includes(t));
    }
    productGrid.innerHTML = list.map(productCardHTML).join('');
    emptyState.hidden = list.length !== 0;
  }

  document.getElementById('catalogSearch').addEventListener('input', e => {
    searchTerm = e.target.value.trim();
    renderProducts();
  });
  document.getElementById('headerSearch').addEventListener('input', e => {
    searchTerm = e.target.value.trim();
  });
  function goSearch(){
    document.getElementById('catalogSearch').value = searchTerm;
    setFilter('todos');
    document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
  }
  document.getElementById('headerSearchBtn').addEventListener('click', goSearch);
  document.getElementById('headerSearch').addEventListener('keydown', e => { if(e.key==='Enter') goSearch(); });

  /* Delegación: agregar al carrito desde cualquier grid */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.add-btn');
    if(!btn) return;
    addToCart(Number(btn.dataset.id));
    btn.classList.add('added');
    const original = btn.textContent;
    btn.textContent = 'Agregado';
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = original; }, 900);
  });

  /* ==========================================================
     CARRITO
  ========================================================== */
  const cartBadge = document.getElementById('cartBadge');
  const cartItemsEl = document.getElementById('cartItems');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartFooter = document.getElementById('cartFooter');

  function addToCart(id){
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    showToast('Producto agregado al carrito');
  }
  function changeQty(id, delta){
    if(!cart[id]) return;
    cart[id] += delta;
    if(cart[id] <= 0) delete cart[id];
    renderCart();
  }
  function removeItem(id){
    const el = cartItemsEl.querySelector(`[data-cart-id="${id}"]`);
    if(el){
      el.classList.add('removing');
      setTimeout(() => { delete cart[id]; renderCart(); }, 260);
    } else {
      delete cart[id]; renderCart();
    }
  }

  function renderCart(){
    const ids = Object.keys(cart);
    const totalQty = ids.reduce((s,id) => s + cart[id], 0);
    cartBadge.textContent = totalQty;
    cartBadge.classList.remove('bump'); void cartBadge.offsetWidth; cartBadge.classList.add('bump');

    if(ids.length === 0){
      cartItemsEl.innerHTML = `<div class="cart-empty"><span>0</span>Tu carrito está vacío.<br>Agrega productos frescos.</div>`;
      cartSubtotalEl.textContent = fmt(0);
      return;
    }
    let subtotal = 0;
    cartItemsEl.innerHTML = ids.map(id => {
      const prod = productos.find(pr => pr.id === Number(id));
      const qty = cart[id];
      subtotal += prod.precio * qty;
      return `
        <div class="cart-item" data-cart-id="${id}">
          <div class="cart-item__media">${prod.icono}</div>
          <div>
            <div class="cart-item__name">${prod.nombre}</div>
            <div class="cart-item__price">${fmt(prod.precio)} / ${prod.unidad}</div>
            <div class="cart-item__qty">
              <button class="qty-btn" data-action="dec" data-id="${id}">−</button>
              <span>${qty}</span>
              <button class="qty-btn" data-action="inc" data-id="${id}">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-action="remove" data-id="${id}">Quitar</button>
        </div>
      `;
    }).join('');
    cartSubtotalEl.textContent = fmt(subtotal);
  }

  cartItemsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.dataset.action === 'inc') changeQty(id, 1);
    if(btn.dataset.action === 'dec') changeQty(id, -1);
    if(btn.dataset.action === 'remove') removeItem(id);
  });

  const overlay = document.getElementById('overlay');
  const cartDrawer = document.getElementById('cartDrawer');
  function openCart(){ cartDrawer.classList.add('open'); overlay.classList.add('open'); }
  function closeCart(){
    cartDrawer.classList.remove('open');
    const authIsOpen = document.getElementById('authModal').classList.contains('open');
    const deliveryIsOpen = document.getElementById('deliveryModal').classList.contains('open');
    const historyIsOpen = document.getElementById('historyModal').classList.contains('open');
    if(!authIsOpen && !deliveryIsOpen && !historyIsOpen) overlay.classList.remove('open');
  }
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  overlay.addEventListener('click', () => {
    closeCart();
    closeDeliveryModal();
    closeAuthModal();
    closeHistoryModal();
    closeAccountModal();
  });

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    const user = getCurrentUser();
    if(!user){
      showToast('Debes iniciar sesión para pagar');
      openAuthModal();
      return;
    }

    const ids = Object.keys(cart);
    if(ids.length === 0){ showToast('Tu carrito está vacío todavía'); return; }
    let subtotal = 0;
    const items = ids.map(id => {
      const product = productos.find(pr => pr.id === Number(id));
      const qty = cart[id];
      subtotal += product.precio * qty;
      return { name: product.nombre, qty, price: product.precio };
    });
    const orderNum = Math.floor(100000 + Math.random()*899999);
    const order = {
      id: orderNum,
      date: new Date().toISOString(),
      total: subtotal,
      items
    };

    const history = loadOrderHistory();
    history.push(order);
    saveOrderHistory(history);

    cartFooter.innerHTML = `
      <button class="btn btn--ghost btn--block" id="continueBtn">Seguir comprando</button>
    `;
    cartItemsEl.innerHTML = `
      <div class="cart-confirm">
        <div class="cart-confirm__check">OK</div>
        <h4>¡Pedido confirmado!</h4>
        <p>Pedido N° ${orderNum} por ${fmt(subtotal)}.<br>Te avisaremos cuando esté en camino.</p>
      </div>
    `;
    cart = {};
    cartBadge.textContent = '0';
    syncCheckoutButton();
    document.getElementById('continueBtn').addEventListener('click', () => {
      closeCart();
      setTimeout(() => {
        cartFooter.innerHTML = `
          <div class="cart-subtotal"><span>Subtotal</span><strong id="cartSubtotal">S/ 0.00</strong></div>
          <button class="btn btn--primary btn--block" id="checkoutBtn">Ir a pagar</button>
        `;
        renderCart();
        syncCheckoutButton();
      }, 300);
    }, {once:true});
  });

  /* ==========================================================
     CARRUSEL HERO
  ========================================================== */
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dotsWrap = document.getElementById('carouselDots');
  let slideIndex = 0;
  let carouselTimer = null;

  dotsWrap.innerHTML = slides.map((_, i) => `<button data-i="${i}" class="${i===0?'active':''}" aria-label="Ir a la diapositiva ${i+1}"></button>`).join('');

  function goToSlide(i){
    slides[slideIndex].classList.remove('active');
    dotsWrap.children[slideIndex].classList.remove('active');
    slideIndex = (i + slides.length) % slides.length;
    slides[slideIndex].classList.add('active');
    dotsWrap.children[slideIndex].classList.add('active');
  }
  function nextSlide(){ goToSlide(slideIndex + 1); }
  function prevSlide(){ goToSlide(slideIndex - 1); }
  function startCarousel(){ carouselTimer = setInterval(nextSlide, 5000); }
  function stopCarousel(){ clearInterval(carouselTimer); }

  document.getElementById('carouselNext').addEventListener('click', () => { nextSlide(); stopCarousel(); startCarousel(); });
  document.getElementById('carouselPrev').addEventListener('click', () => { prevSlide(); stopCarousel(); startCarousel(); });
  dotsWrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if(!b) return;
    goToSlide(Number(b.dataset.i));
    stopCarousel(); startCarousel();
  });
  const heroCarousel = document.getElementById('heroCarousel');
  heroCarousel.addEventListener('mouseenter', stopCarousel);
  heroCarousel.addEventListener('mouseleave', startCarousel);
  startCarousel();

  /* ==========================================================
     COUNTDOWN
  ========================================================== */
  const countdownEl = document.getElementById('countdownTime');
  const target = Date.now() + (2*24*60*60*1000 + 14*60*60*1000); // ~2 días 14 horas desde la carga
  function tickCountdown(){
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2,'0');
    countdownEl.innerHTML = `${d}d ${pad(h)}<span class="colon">:</span>${pad(m)}<span class="colon">:</span>${pad(s)}`;
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ==========================================================
     TOAST
  ========================================================== */
  let toastTimer = null;
  function showToast(msg){
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  /* ==========================================================
     MODAL DE ENTREGA
  ========================================================== */
  const deliveryModal = document.getElementById('deliveryModal');
  function openDeliveryModal(){ deliveryModal.classList.add('open'); overlay.classList.add('open'); }
  function closeDeliveryModal(){
    deliveryModal.classList.remove('open');
    const authIsOpen = document.getElementById('authModal').classList.contains('open');
    const cartIsOpen = document.getElementById('cartDrawer').classList.contains('open');
    if(!authIsOpen && !cartIsOpen) overlay.classList.remove('open');
  }
  document.getElementById('deliveryOpenBtn').addEventListener('click', openDeliveryModal);
  document.getElementById('deliveryClose').addEventListener('click', closeDeliveryModal);
  document.getElementById('deliveryConfirm').addEventListener('click', () => {
    const choice = document.querySelector('input[name="delivery"]:checked').value;
    closeDeliveryModal();
    showToast(choice === 'domicilio' ? 'Entrega a domicilio seleccionada' : 'Recojo en tienda seleccionado');
  });

  /* ==========================================================
     AUTENTICACIÓN
  ========================================================== */
  const STORAGE_USERS = 'la-canasta-users';
  const STORAGE_SESSION = 'la-canasta-session';
  const STORAGE_HISTORY = 'la-canasta-order-history';
  const usuariosDemo = [
    { nombre: 'Administrador', username: 'admin', email: 'admin@lacanasta.com', password: 'admin123' },
    { nombre: 'María López', username: 'maria', email: 'maria@lacanasta.com', password: 'maria2025' },
    { nombre: 'Jorge Ramírez', username: 'jorge', email: 'jorge@lacanasta.com', password: 'jorge2025' },
    { nombre: 'Ana Torres', username: 'ana', email: 'ana@lacanasta.com', password: 'ana2025' },
    { nombre: 'Diego Silva', username: 'diego', email: 'diego@lacanasta.com', password: 'diego2025' }
  ];

  function ensureUsers(){
    const stored = localStorage.getItem(STORAGE_USERS);
    if(!stored){
      localStorage.setItem(STORAGE_USERS, JSON.stringify(usuariosDemo));
      return usuariosDemo;
    }
    try {
      const parsed = JSON.parse(stored);
      if(Array.isArray(parsed) && parsed.length){ return parsed; }
    } catch (error) {}
    localStorage.setItem(STORAGE_USERS, JSON.stringify(usuariosDemo));
    return usuariosDemo;
  }

  function getCurrentUser(){
    const raw = localStorage.getItem(STORAGE_SESSION);
    if(!raw) return null;
    try {
      const user = JSON.parse(raw);
      return user && user.username ? user : null;
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user){
    if(!user){
      localStorage.removeItem(STORAGE_SESSION);
      cart = {};
      renderCart();
      syncCheckoutButton();
    } else {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
    }
    updateAccountButton();
  }

  function updateAccountButton(){
    const cuentaBtn = document.getElementById('cuentaBtn');
    if(!cuentaBtn) return;
    const user = getCurrentUser();
    const label = cuentaBtn.querySelector('.label');
    if(!label) return;
    if(user){
      label.textContent = user.nombre.split(' ')[0];
      cuentaBtn.classList.add('is-user');
      cuentaBtn.title = `Sesión activa: ${user.nombre}`;
    } else {
      label.textContent = 'Mi cuenta';
      cuentaBtn.classList.remove('is-user');
      cuentaBtn.title = 'Mi cuenta';
    }
  }

  function openAuthModal(){
    const modal = document.getElementById('authModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.getElementById('authIdentifier').focus();
  }

  function closeAuthModal(){
    const modal = document.getElementById('authModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const deliveryIsOpen = document.getElementById('deliveryModal').classList.contains('open');
    const cartIsOpen = document.getElementById('cartDrawer').classList.contains('open');
    if(!deliveryIsOpen && !cartIsOpen) overlay.classList.remove('open');
  }

  function loginUser(identifier, password){
    const users = ensureUsers();
    const normalized = identifier.trim();
    const found = users.find(u =>
      u.username.toLowerCase() === normalized.toLowerCase() ||
      u.email.toLowerCase() === normalized.toLowerCase()
    );

    if(!found || found.password !== password){
      return null;
    }

    const safeUser = { id: found.id || found.username, nombre: found.nombre, username: found.username, email: found.email };
    setCurrentUser(safeUser);
    syncCheckoutButton();
    return safeUser;
  }

  document.getElementById('authForm').addEventListener('submit', e => {
    e.preventDefault();
    const identifier = document.getElementById('authIdentifier').value;
    const password = document.getElementById('authPassword').value;
    const user = loginUser(identifier, password);

    if(!user){
      showToast('Credenciales incorrectas. Intenta otra vez');
      return;
    }

    closeAuthModal();
    document.getElementById('authForm').reset();
    showToast(`Bienvenido ${user.nombre}`);
  });

  document.getElementById('authClose').addEventListener('click', closeAuthModal);
  document.getElementById('authToggleMode').addEventListener('click', () => {
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authToggleMode');
    const submitBtn = document.querySelector('#authForm .btn--primary');
    const isLogin = title.textContent === 'Iniciar sesión';
    title.textContent = isLogin ? 'Crear cuenta' : 'Iniciar sesión';
    submitBtn.textContent = isLogin ? 'Crear cuenta' : 'Iniciar sesión';
    btn.textContent = isLogin ? 'Ya tengo cuenta' : 'Crear una cuenta';
    showToast(isLogin ? 'Funcionalidad de registro en construcción' : 'Puedes iniciar sesión con usuarios de prueba');
  });
  document.getElementById('historyClose').addEventListener('click', closeHistoryModal);

  function logoutUser(){
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente');
  }

  function loadOrderHistory(){
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if(!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveOrderHistory(history){
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  }

  function renderHistoryModal(){
    const container = document.getElementById('historyList');
    const orders = loadOrderHistory();
    if(!orders.length){
      container.innerHTML = `
        <div class="history-empty">
          <strong>Sin compras todavía</strong>
          Tu historial aparecerá aquí cuando finalices tu primer pedido.
        </div>
      `;
      return;
    }

    container.innerHTML = orders.slice().reverse().map(order => {
      const itemsHtml = order.items.map(item => `<span>• ${item.name} x${item.qty}</span>`).join('');
      return `
        <div class="history-order">
          <div class="history-order__head">
            <span class="history-order__id">Pedido #${order.id}</span>
            <span class="history-order__total">${fmt(order.total)}</span>
          </div>
          <div class="history-order__meta">${new Date(order.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div class="history-order__items">${itemsHtml}</div>
        </div>
      `;
    }).join('');
  }

  function openHistoryModal(){
    renderHistoryModal();
    const modal = document.getElementById('historyModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
  }

  function closeHistoryModal(){
    const modal = document.getElementById('historyModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const authIsOpen = document.getElementById('authModal').classList.contains('open');
    const cartIsOpen = document.getElementById('cartDrawer').classList.contains('open');
    const deliveryIsOpen = document.getElementById('deliveryModal').classList.contains('open');
    const accountIsOpen = document.getElementById('accountModal').classList.contains('open');
    if(!authIsOpen && !cartIsOpen && !deliveryIsOpen && !accountIsOpen) overlay.classList.remove('open');
  }

  function getAccountDataMap(){
    const raw = localStorage.getItem('la-canasta-account-data');
    if(!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveAccountDataMap(map){
    localStorage.setItem('la-canasta-account-data', JSON.stringify(map));
  }

  function getAccountDataForCurrentUser(){
    const user = getCurrentUser();
    if(!user) return null;
    const map = getAccountDataMap();
    const username = user.username;
    if(!map[username]){
      map[username] = {
        profile: {
          nombre: user.nombre,
          username: user.username,
          email: user.email,
          phone: '',
          dni: ''
        },
        addresses: [
          { alias: 'Casa', street: '', district: '', city: '', reference: '' }
        ],
        payments: [
          { alias: 'Tarjeta principal', type: 'Visa', number: '', holder: user.nombre }
        ],
        refunds: {
          bank: '',
          account: '',
          cci: '',
          holder: user.nombre
        },
      };
      saveAccountDataMap(map);
    }
    return map[username];
  }
  function saveCurrentUserAccountData(data){
    const user = getCurrentUser();
    if(!user || !data) return;
    const map = getAccountDataMap();
    map[user.username] = data;
    saveAccountDataMap(map);
  }

  function updateUserSessionFromProfile(profile){
    const user = getCurrentUser();
    if(!user || !profile) return;
    const updated = {
      ...user,
      nombre: profile.nombre || user.nombre,
      username: profile.username || user.username,
      email: profile.email || user.email
    };
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(updated));
    updateAccountButton();
  }

  function renderAccountPanel(panelName){
    const panel = document.getElementById('accountPanel');
    const user = getCurrentUser();
    if(!user){
      panel.innerHTML = '<p>Debes iniciar sesión para ver tu cuenta.</p>';
      return;
    }

    const data = getAccountDataForCurrentUser();
    
    const templates = {
      profile: `
        <div class="account-panel__section">
          <h4>Datos personales</h4>
          <form class="account-form" data-form="profile">
            <div class="account-form__grid">
              <label>
                <span>Nombre</span>
                <input name="nombre" value="${data.profile.nombre || ''}" required>
              </label>
              <label>
                <span>Usuario</span>
                <input name="username" value="${data.profile.username || ''}" required>
              </label>
              <label>
                <span>Email</span>
                <input type="email" name="email" value="${data.profile.email || ''}" required>
              </label>
              <label>
                <span>Teléfono</span>
                <input name="phone" value="${data.profile.phone || ''}" placeholder="+51 999 123 456">
              </label>
              <label>
                <span>DNI</span>
                <input name="dni" value="${data.profile.dni || ''}" placeholder="87654321">
              </label>
            </div>
            <div class="account-actions">
              <button class="btn btn--primary" type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      `,
      addresses: `
        <div class="account-panel__section">
          <h4>Direcciones</h4>
          <form class="account-form" data-form="addresses">
            ${data.addresses.map((address, index) => `
              <div class="address-block">
                <div class="address-block__header">
                  <strong>Dirección ${index + 1}</strong>
                  ${data.addresses.length > 1 ? `<button type="button" class="mini-delete" data-action="delete-address" data-index="${index}">Eliminar</button>` : ''}
                </div>
                <div class="account-form__grid">
                  <label>
                    <span>Alias</span>
                    <input name="addressAlias_${index}" value="${address.alias || ''}" placeholder="Casa, Trabajo...">
                  </label>
                  <label>
                    <span>Calle y número</span>
                    <input name="addressStreet_${index}" value="${address.street || ''}" placeholder="Av. Principal 123">
                  </label>
                  <label>
                    <span>Distrito</span>
                    <input name="addressDistrict_${index}" value="${address.district || ''}" placeholder="San Isidro">
                  </label>
                  <label>
                    <span>Ciudad</span>
                    <input name="addressCity_${index}" value="${address.city || ''}" placeholder="Lima">
                  </label>
                  <label class="full-width">
                    <span>Referencia</span>
                    <textarea name="addressReference_${index}" rows="2" placeholder="Frente al parque, cerca del mercado...">${address.reference || ''}</textarea>
                  </label>
                </div>
              </div>
            `).join('')}
            <div class="account-actions">
              <button class="btn btn--primary" type="submit">Guardar direcciones</button>
              <button class="btn btn--ghost" type="button" data-action="add-address">Agregar dirección</button>
            </div>
          </form>
        </div>
      `,
      payments: `
        <div class="account-panel__section">
          <h4>Medios de pago</h4>
          <form class="account-form" data-form="payments">
            ${data.payments.map((method, index) => `
              <div class="address-block">
                <div class="address-block__header">
                  <strong>Medio ${index + 1}</strong>
                  ${data.payments.length > 1 ? `<button type="button" class="mini-delete" data-action="delete-payment" data-index="${index}">Eliminar</button>` : ''}
                </div>
                <div class="account-form__grid">
                  <label>
                    <span>Alias</span>
                    <input name="paymentAlias_${index}" value="${method.alias || ''}" placeholder="Visa, Yape, Banco...">
                  </label>
                  <label>
                    <span>Tipo</span>
                    <input name="paymentType_${index}" value="${method.type || ''}" placeholder="Tarjeta">
                  </label>
                  <label>
                    <span>Detalle</span>
                    <input name="paymentNumber_${index}" value="${method.number || ''}" placeholder="4242 / Yape / Cuenta BCP">
                  </label>
                  <label>
                    <span>Titular</span>
                    <input name="paymentHolder_${index}" value="${method.holder || user.nombre}" placeholder="Nombre del titular">
                  </label>
                </div>
              </div>
            `).join('')}
            <div class="account-actions">
              <button class="btn btn--primary" type="submit">Guardar pagos</button>
              <button class="btn btn--ghost" type="button" data-action="add-payment">Agregar medio</button>
            </div>
          </form>
        </div>
      `,
      refunds: `
        <div class="account-panel__section">
          <h4>Datos para reembolso</h4>
          <form class="account-form" data-form="refunds">
            <div class="account-form__grid">
              <label>
                <span>Banco</span>
                <input name="bank" value="${data.refunds.bank || ''}" placeholder="Banco de Crédito">
              </label>
              <label>
                <span>Cuenta</span>
                <input name="account" value="${data.refunds.account || ''}" placeholder="194-1234567">
              </label>
              <label>
                <span>CCI</span>
                <input name="cci" value="${data.refunds.cci || ''}" placeholder="002-194-00123456789">
              </label>
              <label>
                <span>Titular</span>
                <input name="holder" value="${data.refunds.holder || user.nombre}" required>
              </label>
            </div>
            <div class="account-actions">
              <button class="btn btn--primary" type="submit">Guardar reembolso</button>
            </div>
          </form>
        </div>
      `,
      security: `
        <div class="account-panel__section">
          <h4>Configurar mi cuenta</h4>
          <form class="account-form" data-form="security">
            <div class="account-form__grid">
              <label>
                <span>Contraseña actual</span>
                <input type="password" name="currentPassword" placeholder="Tu contraseña actual">
              </label>
              <label>
                <span>Nueva contraseña</span>
                <input type="password" name="newPassword" placeholder="Nueva contraseña">
              </label>
              <label>
                <span>Confirmar contraseña</span>
                <input type="password" name="confirmPassword" placeholder="Repite la nueva contraseña">
              </label>
            </div>
            <div class="account-actions">
              <button class="btn btn--primary" type="submit">Actualizar contraseña</button>
              <button class="btn btn--ghost" type="button" data-action="delete-account">Eliminar cuenta</button>
            </div>
          </form>
        </div>
      `
    };

    panel.innerHTML = templates[panelName] || templates.profile;
  }

  function openAccountModal(){
    const modal = document.getElementById('accountModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    renderAccountPanel('profile');
  }

  function closeAccountModal(){
    const modal = document.getElementById('accountModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const authIsOpen = document.getElementById('authModal').classList.contains('open');
    const cartIsOpen = document.getElementById('cartDrawer').classList.contains('open');
    const deliveryIsOpen = document.getElementById('deliveryModal').classList.contains('open');
    const historyIsOpen = document.getElementById('historyModal').classList.contains('open');
    if(!authIsOpen && !cartIsOpen && !deliveryIsOpen && !historyIsOpen) overlay.classList.remove('open');
  }

  /* ==========================================================
     MENÚ MÓVIL / OTROS BOTONES
  ========================================================== */
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
   catDropdown.classList.toggle('open');
  });
  document.getElementById('listasBtn').addEventListener('click', () => {
   const user = getCurrentUser();
   if(!user){
     openAuthModal();
     showToast('Inicia sesión para ver tu historial');
     return;
   }
   openHistoryModal();
  });
  document.getElementById('cuentaBtn').addEventListener('click', () => {
   const user = getCurrentUser();
   if(!user){
     openAuthModal();
     return;
   }
   openAccountModal();
  });

  document.querySelectorAll('.account-menu__item').forEach(btn => {
   btn.addEventListener('click', () => {
     const panel = btn.dataset.accountPanel;
     if(panel){ renderAccountPanel(panel); }
   });
  });

  document.getElementById('accountPanel').addEventListener('submit', e => {
   const form = e.target.closest('form[data-form]');
   if(!form) return;
   e.preventDefault();
   const data = getAccountDataForCurrentUser();
   const formType = form.dataset.form;

   if(formType === 'profile') {
     const formData = new FormData(form);
     data.profile = {
       nombre: formData.get('nombre')?.toString().trim() || '',
       username: formData.get('username')?.toString().trim() || '',
       email: formData.get('email')?.toString().trim() || '',
       phone: formData.get('phone')?.toString().trim() || '',
       dni: formData.get('dni')?.toString().trim() || ''
     };
     saveCurrentUserAccountData(data);
     updateUserSessionFromProfile(data.profile);
     showToast('Datos personales guardados');
     return;
   }

   if(formType === 'addresses') {
     const formData = new FormData(form);
     const addresses = [];
     const entries = Object.keys(Object.fromEntries(formData.entries())).filter(key => key.startsWith('addressAlias_'));
     entries.forEach(key => {
       const index = key.replace('addressAlias_', '');
       addresses.push({
         alias: formData.get(`addressAlias_${index}`)?.toString().trim() || 'Dirección',
         street: formData.get(`addressStreet_${index}`)?.toString().trim() || '',
         district: formData.get(`addressDistrict_${index}`)?.toString().trim() || '',
         city: formData.get(`addressCity_${index}`)?.toString().trim() || '',
         reference: formData.get(`addressReference_${index}`)?.toString().trim() || ''
       });
     });
     data.addresses = addresses.filter(item => item.street || item.district || item.city || item.reference || item.alias);
     saveCurrentUserAccountData(data);
     showToast('Direcciones guardadas');
     return;
   }

   if(formType === 'payments') {
     const formData = new FormData(form);
     const payments = [];
     const entries = Object.keys(Object.fromEntries(formData.entries())).filter(key => key.startsWith('paymentAlias_'));
     entries.forEach(key => {
       const index = key.replace('paymentAlias_', '');
       payments.push({
         alias: formData.get(`paymentAlias_${index}`)?.toString().trim() || 'Medio de pago',
         type: formData.get(`paymentType_${index}`)?.toString().trim() || '',
         number: formData.get(`paymentNumber_${index}`)?.toString().trim() || '',
         holder: formData.get(`paymentHolder_${index}`)?.toString().trim() || ''
       });
     });
     data.payments = payments.filter(item => item.number || item.type || item.alias || item.holder);
     saveCurrentUserAccountData(data);
     showToast('Medios de pago guardados');
     return;
   }

   if(formType === 'refunds') {
     const formData = new FormData(form);
     data.refunds = {
       bank: formData.get('bank')?.toString().trim() || '',
       account: formData.get('account')?.toString().trim() || '',
       cci: formData.get('cci')?.toString().trim() || '',
       holder: formData.get('holder')?.toString().trim() || ''
     };
     saveCurrentUserAccountData(data);
     showToast('Datos de reembolso guardados');
     return;
   }

   if(formType === 'security') {
     const formData = new FormData(form);
     const currentPassword = formData.get('currentPassword')?.toString() || '';
     const newPassword = formData.get('newPassword')?.toString() || '';
     const confirmPassword = formData.get('confirmPassword')?.toString() || '';
     const users = ensureUsers();
     const currentUser = getCurrentUser();
     const userRecord = users.find(u => u.username === currentUser.username || u.email === currentUser.email);

     if(!userRecord || userRecord.password !== currentPassword){
       showToast('La contraseña actual es incorrecta');
       return;
     }
     if(!newPassword || newPassword !== confirmPassword){
       showToast('La nueva contraseña no coincide');
       return;
     }

     userRecord.password = newPassword;
     localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
     showToast('Contraseña actualizada');
     form.reset();
   }
  });

  document.getElementById('accountPanel').addEventListener('click', e => {
   const actionButton = e.target.closest('[data-action]');
   if(!actionButton) return;

   if(actionButton.dataset.action === 'add-address') {
     const data = getAccountDataForCurrentUser();
     data.addresses.push({ alias: 'Nueva dirección', street: '', district: '', city: '', reference: '' });
     saveCurrentUserAccountData(data);
     renderAccountPanel('addresses');
     return;
   }

   if(actionButton.dataset.action === 'add-payment') {
     const data = getAccountDataForCurrentUser();
     data.payments.push({ alias: 'Nuevo medio', type: '', number: '', holder: getCurrentUser().nombre });
     saveCurrentUserAccountData(data);
     renderAccountPanel('payments');
     return;
   }

   if(actionButton.dataset.action === 'delete-account') {
     const shouldDelete = window.confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.');
     if(!shouldDelete) return;
     const currentUser = getCurrentUser();
     const users = ensureUsers().filter(u => u.username !== currentUser.username);
     localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
     const map = getAccountDataMap();
     delete map[currentUser.username];
     saveAccountDataMap(map);
     localStorage.removeItem(STORAGE_SESSION);
     cart = {};
     renderCart();
     syncCheckoutButton();
     closeAccountModal();
     showToast('Cuenta eliminada');
     updateAccountButton();
   }

   if(actionButton.dataset.action === 'delete-address') {
     const index = Number(actionButton.dataset.index);
     const data = getAccountDataForCurrentUser();
     data.addresses.splice(index, 1);
     if(!data.addresses.length) data.addresses = [{ alias: 'Casa', street: '', district: '', city: '', reference: '' }];
     saveCurrentUserAccountData(data);
     renderAccountPanel('addresses');
     return;
   }

   if(actionButton.dataset.action === 'delete-payment') {
     const index = Number(actionButton.dataset.index);
     const data = getAccountDataForCurrentUser();
     data.payments.splice(index, 1);
     if(!data.payments.length) data.payments = [{ alias: 'Tarjeta principal', type: 'Visa', number: '', holder: getCurrentUser().nombre }];
     saveCurrentUserAccountData(data);
     renderAccountPanel('payments');
   }
  });

  document.getElementById('accountLogoutBtn').addEventListener('click', () => {
   logoutUser();
   closeAccountModal();
  });

  document.getElementById('accountClose').addEventListener('click', closeAccountModal);

  /* ==========================================================
     NEWSLETTER
  ========================================================== */
  document.getElementById('newsletterForm').addEventListener('submit', e => {
    e.preventDefault();
    document.getElementById('newsletterSuccess').hidden = false;
    document.getElementById('newsletterEmail').value = '';
  });

  /* ==========================================================
     FOOTER: categorías dinámicas
  ========================================================== */
  document.getElementById('footerCategories').innerHTML = categorias.slice(0,6).map(c =>
    `<li><a href="#categorias" data-cat="${c.id}" class="footer-cat-link">${c.nombre}</a></li>`
  ).join('');
  document.getElementById('footerCategories').addEventListener('click', e => {
    const a = e.target.closest('.footer-cat-link');
    if(!a) return;
    e.preventDefault();
    setFilter(a.dataset.cat);
    document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
  });

  /* ==========================================================
     SCROLL REVEAL
  ========================================================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in-view'); io.unobserve(en.target); } });
  }, {threshold:.15});
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ==========================================================
     INIT
  ========================================================== */
  ensureUsers();
  updateAccountButton();
  renderCategoryGrid();
  renderFilterTabs();
  renderOffers();
  renderProducts();
  renderCart();

})();
