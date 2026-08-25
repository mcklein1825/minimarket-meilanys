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
/**
 * E-Commerce Core Script
 * @author MCKLEIN
 * @description Frontend logic with decoupled architecture (API, Storage, UI, State)
 */
const App = (function () {
  'use strict';

  /* ==========================================================
     1. CONFIGURACIÓN Y CONSTANTES
  ========================================================== */
  const CONFIG = {
    KEYS: {
      CART: 'la-canasta-cart',
      SESSION: 'la-canasta-session',
      ACCOUNT: 'la-canasta-account-data'
    },
    ENDPOINTS: {
      PRODUCTS: 'api/get_productos.php',
      CATEGORIES: 'api/get_categorias.php',
      ORDERS: 'api/get_pedidos.php',
      LOGIN: 'api/login.php',
      REGISTER: 'api/registro.php'
    },
    DOM: {
      overlay: document.getElementById('overlay'),
      toast: document.getElementById('toast'),
      cartCount: document.getElementById('cartCount')
    }
  };

  /* ==========================================================
     2. GESTIÓN DE ALMACENAMIENTO (STORAGE)
  ========================================================== */
  const Storage = {
    get: (key, fallback = null) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        console.error(`Error parsing storage key "${key}":`, e);
        return fallback;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Error saving storage key "${key}":`, e);
      }
    },
    remove: (key) => localStorage.removeItem(key)
  };

  /* ==========================================================
     3. ESTADO GLOBAL (STATE)
  ========================================================== */
  const State = {
    products: [],
    categories: [],
    cart: Storage.get(CONFIG.KEYS.CART, {}),
    currentCategory: 'all',
    user: Storage.get(CONFIG.KEYS.SESSION, null),

    updateCart(id, qtyDelta) {
      const currentQty = this.cart[id] || 0;
      const newQty = currentQty + qtyDelta;
      if (newQty <= 0) {
        delete this.cart[id];
      } else {
        this.cart[id] = newQty;
      }
      Storage.set(CONFIG.KEYS.CART, this.cart);
    },
    
    setUser(userData) {
      this.user = userData;
      if (userData) {
        Storage.set(CONFIG.KEYS.SESSION, userData);
      } else {
        Storage.remove(CONFIG.KEYS.SESSION);
      }
    }
  };

  /* ==========================================================
     4. CAPA DE RED (API SERVICE)
  ========================================================== */
  const API = {
    async fetchJSON(url, options = {}) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error(`API Fetch Error (${url}):`, error);
        return null;
      }
    },
    async getCategories() {
      return await this.fetchJSON(CONFIG.ENDPOINTS.CATEGORIES) || [];
    },
    async getProducts() {
      return await this.fetchJSON(CONFIG.ENDPOINTS.PRODUCTS) || [];
    },
    async getOrders(userId) {
      return await this.fetchJSON(`${CONFIG.ENDPOINTS.ORDERS}?user_id=${userId}`) || [];
    },
    async auth(isLogin, formData) {
      const url = isLogin ? CONFIG.ENDPOINTS.LOGIN : CONFIG.ENDPOINTS.REGISTER;
      return await this.fetchJSON(url, { method: 'POST', body: formData });
    }
  };

  /* ==========================================================
     5. RENDERIZADO Y DOM (UI CONTROLLER)
  ========================================================== */
  const UI = {
    formatMoney(amount) {
      return `S/ ${Number(amount).toFixed(2)}`;
    },

    showToast(message) {
      if (!CONFIG.DOM.toast) return;
      CONFIG.DOM.toast.textContent = message;
      CONFIG.DOM.toast.classList.add('show');
      setTimeout(() => CONFIG.DOM.toast.classList.remove('show'), 3000);
    },

    updateAccountButton() {
      const btn = document.getElementById('cuentaBtn');
      if (!btn) return;
      if (State.user) {
        btn.innerHTML = `<i class="ph ph-user-check"></i> <span>${State.user.nombre || State.user.username}</span>`;
      } else {
        btn.innerHTML = `<i class="ph ph-user"></i> <span>Mi Cuenta</span>`;
      }
    },

    renderProducts() {
      const grid = document.getElementById('productsGrid');
      if (!grid) return;
      
      const filtered = State.currentCategory === 'all'
        ? State.products
        : State.products.filter(p => String(p.categoria_id) === String(State.currentCategory));

      if (!filtered.length) {
        grid.innerHTML = '<p class="no-products">No hay productos disponibles.</p>';
        return;
      }

      grid.innerHTML = filtered.map(p => this.buildProductCard(p)).join('');
    },

    buildProductCard(p) {
      const oldPrice = p.precio_anterior ? `<span class="price-old">${this.formatMoney(p.precio_anterior)}</span>` : '';
      return `
        <div class="product-card">
          <img src="${p.imagen || 'img/placeholder.png'}" alt="${p.nombre}" class="product-card__img" loading="lazy">
          <div class="product-card__content">
            <span class="product-card__cat">${p.categoria_nombre || ''}</span>
            <h4 class="product-card__title">${p.nombre}</h4>
            <div class="product-card__price">
              <span class="price-current">${this.formatMoney(p.precio)}</span>
              ${oldPrice}
            </div>
            <button class="btn btn--primary btn--full action-add-cart" data-id="${p.id}">
              <i class="ph ph-shopping-cart-simple"></i> Agregar
            </button>
          </div>
        </div>
      `;
    },

    renderCart() {
      const container = document.getElementById('cartItems');
      const totalEl = document.getElementById('cartTotal');
      if (!container) return;

      const keys = Object.keys(State.cart);
      let total = 0;
      let totalItems = 0;

      if (!keys.length) {
        container.innerHTML = '<div class="cart-empty"><p>Tu carrito está vacío</p></div>';
        if (CONFIG.DOM.cartCount) CONFIG.DOM.cartCount.textContent = '0';
        if (totalEl) totalEl.textContent = this.formatMoney(0);
        return;
      }

      container.innerHTML = keys.map(id => {
        const prod = State.products.find(p => String(p.id) === String(id));
        if (!prod) return '';
        
        const qty = State.cart[id];
        total += (prod.precio * qty);
        totalItems += qty;

        return `
          <div class="cart-item">
            <img src="${prod.imagen || 'img/placeholder.png'}" alt="${prod.nombre}">
            <div class="cart-item__info">
              <h5>${prod.nombre}</h5>
              <span class="cart-item__price">${this.formatMoney(prod.precio)}</span>
              <div class="cart-item__qty">
                <button class="action-qty" data-dir="-1" data-id="${id}">-</button>
                <span>${qty}</span>
                <button class="action-qty" data-dir="1" data-id="${id}">+</button>
              </div>
            </div>
            <button class="cart-item__remove action-remove" data-id="${id}">&times;</button>
          </div>
        `;
      }).join('');

      if (CONFIG.DOM.cartCount) CONFIG.DOM.cartCount.textContent = totalItems;
      if (totalEl) totalEl.textContent = this.formatMoney(total);
    },

    toggleModal(modalId, forceState) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      
      const isOpen = forceState !== undefined ? forceState : !modal.classList.contains('open');
      modal.classList.toggle('open', isOpen);
      modal.setAttribute('aria-hidden', !isOpen);
      this.checkOverlays();
    },

    checkOverlays() {
      const activeModals = document.querySelectorAll('.modal.open, .drawer.open');
      if (CONFIG.DOM.overlay) {
        CONFIG.DOM.overlay.classList.toggle('open', activeModals.length > 0);
      }
    }
  };

  /* ==========================================================
     6. CONTROLADOR DE EVENTOS (DELEGACIÓN GLOBAL)
  ========================================================== */
  function bindEvents() {
    // Delegación global para interacciones dinámicas
    document.addEventListener('click', (e) => {
      const target = e.target;

      // Filtros de categorías
      const catBtn = target.closest('[data-cat]');
      if (catBtn && !target.closest('.footer-cat-link')) {
        State.currentCategory = catBtn.dataset.cat;
        document.querySelectorAll('.tab-btn').forEach(btn => 
          btn.classList.toggle('active', btn.dataset.cat === State.currentCategory)
        );
        UI.renderProducts();
      }

      // Añadir al carrito
      const addBtn = target.closest('.action-add-cart');
      if (addBtn) {
        State.updateCart(addBtn.dataset.id, 1);
        UI.renderCart();
        UI.showToast('Agregado al carrito');
      }

      // Modificar cantidad en carrito
      const qtyBtn = target.closest('.action-qty');
      if (qtyBtn) {
        State.updateCart(qtyBtn.dataset.id, parseInt(qtyBtn.dataset.dir));
        UI.renderCart();
      }

      // Eliminar del carrito
      const removeBtn = target.closest('.action-remove');
      if (removeBtn) {
        delete State.cart[removeBtn.dataset.id];
        Storage.set(CONFIG.KEYS.CART, State.cart);
        UI.renderCart();
      }
    });

    // Autenticación Formulario
    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const isLogin = document.getElementById('authTitle').textContent === 'Iniciar sesión';
        const formData = new FormData(authForm);
        
        const result = await API.auth(isLogin, formData);
        if (result && result.success) {
          State.setUser(result.user);
          UI.updateAccountButton();
          UI.toggleModal('authModal', false);
          authForm.reset();
          UI.showToast(`Bienvenido ${result.user.nombre}`);
        } else {
          UI.showToast(result?.message || 'Error de validación');
        }
      });
    }
  }

  /* ==========================================================
     7. INICIALIZACIÓN
  ========================================================== */
  async function init() {
    UI.updateAccountButton();
    UI.renderCart();
    bindEvents();

    // Carga de datos inicial asíncrona
    const [categories, products] = await Promise.all([
      API.getCategories(),
      API.getProducts()
    ]);

    State.categories = categories;
    State.products = products;
    
    // Inyectar filtros y catálogo inicial
    UI.renderProducts();
  }

  // API Pública del Módulo
  return { init };

})();

// Arrancar la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', App.init);
