/*
Archivo: controladores/storeController.js
Proyecto: Minimarket Meilanys
Autor: MCKLEIN
*/
export default class StoreController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentFilter = 'todos';
    this.searchTerm = '';
    this.toastTimer = null;
    this.isProcessingCheckout = false;
  }

  async init() {
    window.__storeController = this;
    
    // 1. Manejo de usuarios y sesión
    this.model.ensureUsers();
    await this.model.loadSession();

    // 2. Cargar categorías y productos dinámicos desde la BD (Supabase / MySQL)
    await this.model.fetchCategoriesFromDB(); // <-- Carga de categorías
    await this.model.fetchProductsFromDB();
    
    // 3. Inicializar la interfaz y eventos
    this.bindGlobalEvents();
    this.updateUI();
    this.renderEverything();

    // 4. Evaluar si el usuario regresa de Mercado Pago
    this.handlePaymentReturn();
  }

  // --- LÓGICA RETORNO MERCADO PAGO ---
  handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (!status) return;

    if (status === 'success' || status === 'approved') {
      // La aprobación solo se considera válida después de verificarla en pago-exitoso.php.
      this.view.showToast('Pago verificado. Estamos preparando tu pedido.');
    } else if (status === 'failure' || status === 'rejected') {
      this.view.showToast('El pago fue rechazado. Intenta con otra tarjeta.');
    } else if (status === 'pending' || status === 'in_process') {
      this.view.showToast('Tu pago está en revisión. Te avisaremos pronto.');
    }

    // Limpia los parámetros de la URL para evitar ejecuciones duplicadas al recargar
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // --- MÉTODOS DE RENDER Y VISTA ---
  updateUI() {
    const currentUser = this.model.getCurrentUser();
    this.view.updateAccountButton(currentUser);
    this.view.syncCheckoutButton(currentUser);
    this.updateCartBadge();
  }

  updateCartBadge() {
    const totalCount = Object.values(this.model.cart).reduce((sum, q) => sum + q, 0);
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) {
      cartCountEl.textContent = totalCount;
      cartCountEl.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }
  }

  renderEverything() {
    const currentUser = this.model.getCurrentUser();
    this.view.renderTicker();
    this.view.renderCategoryDropdown(this.model.categories);
    this.view.renderCategoryGrid(this.model.categories, this.currentFilter);
    this.view.renderFilterTabs(this.model.categories, this.currentFilter);
    this.view.renderOffers(this.model.products, this.model.fmt.bind(this.model));
    this.view.renderProducts(this.model.products, this.currentFilter, this.searchTerm, this.model.fmt.bind(this.model));
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.view.syncCheckoutButton(currentUser);
    this.view.renderFooterCategories(this.model.categories);
    this.updateCartBadge();
    
    if (typeof this.model.loadOrderHistory === 'function') {
      this.view.renderHistoryModal(this.model.loadOrderHistory(currentUser), this.model.fmt.bind(this.model));
    }
  }

  setFilter(cat) {
    this.currentFilter = cat;
    this.view.renderCategoryGrid(this.model.categories, this.currentFilter);
    this.view.renderFilterTabs(this.model.categories, this.currentFilter);
    this.view.renderProducts(this.model.products, this.currentFilter, this.searchTerm, this.model.fmt.bind(this.model));
  }

  setSearch(term) {
    this.searchTerm = term.trim();
    this.view.renderProducts(this.model.products, this.currentFilter, this.searchTerm, this.model.fmt.bind(this.model));
  }

  // --- OPERACIONES DE CARRITO ---
  addToCart(id) {
    const product = this.model.products.find(p => String(p.id) === String(id));
    if (!product) {
      this.view.showToast('Producto no encontrado');
      return;
    }

    const currentQty = Number(this.model.cart[id] || 0);
    const stock = Number(product.stock ?? 0);
    if (stock > 0 && currentQty >= stock) {
      this.view.showToast(`Stock disponible: ${stock} unidades`);
      return;
    }

    this.model.cart[id] = currentQty + 1;
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.updateCartBadge();
    this.view.showToast(`${product.nombre} agregado al carrito`);
  }

  changeQty(id, delta) {
    if (!this.model.cart[id]) return;

    const product = this.model.products.find(p => String(p.id) === String(id));
    const stock = product ? Number(product.stock ?? 0) : Infinity;
    const nextQty = this.model.cart[id] + delta;

    if (stock > 0 && nextQty > stock) {
      this.model.cart[id] = stock;
      this.view.showToast(`Solo quedan ${stock} unidades en stock`);
    } else {
      this.model.cart[id] = nextQty;
      if (this.model.cart[id] <= 0) {
        delete this.model.cart[id];
      }
    }

    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.updateCartBadge();
  }

  removeItem(id) {
    const cartItem = this.view.elements.cartItems?.querySelector(`[data-cart-id="${id}"]`);
    if (cartItem) {
      cartItem.classList.add('removing');
      setTimeout(() => {
        delete this.model.cart[id];
        this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
        this.updateCartBadge();
      }, 260);
      return;
    }
    delete this.model.cart[id];
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.updateCartBadge();
  }

  clearFullCart() {
    this.model.clearCart();
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.updateCartBadge();
    this.view.showToast('El carrito se ha vaciado');
  }

  // --- PASARELA DE PAGO MERCADO PAGO ---
  async handleCheckout() {
    if (this.isProcessingCheckout) return;

    const user = this.model.getCurrentUser();
    if (!user) {
      this.view.showToast('Debes iniciar sesión para pagar');
      this.view.openAuthModal();
      return;
    }

    const ids = Object.keys(this.model.cart);
    if (ids.length === 0) {
      this.view.showToast('Tu carrito está vacío todavía');
      return;
    }

    const items = ids.map((id) => {
      const product = this.model.products.find((pr) => String(pr.id) === String(id));
      if (!product) return null;
      const quantity = Number(this.model.cart[id]);
      const stock = Number(product.stock ?? 0);

      if (stock > 0 && quantity > stock) {
        this.model.cart[id] = stock;
        this.view.showToast(`Se ajustó ${product.nombre} al stock disponible (${stock})`);
      }

      return {
        title: product.nombre,
        quantity: Math.min(Number(this.model.cart[id]), stock > 0 ? stock : Number(this.model.cart[id])),
        unit_price: Number(product.precio),
        currency_id: 'PEN'
      };
    }).filter(Boolean);

    try {
      this.isProcessingCheckout = true;
      this.view.showToast('Generando pasarela de pago...');

      const response = await fetch('../servicios/crear_preferencia.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payerEmail: user.email || user.correo })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Respuesta inválida del servidor PHP de pagos.');
      }

      if (!response.ok || !data.init_point) {
        throw new Error(data?.error || 'No se pudo obtener el enlace de pago.');
      }

      window.location.href = data.init_point;
    } catch (error) {
      console.error('Error Checkout:', error);
      this.view.showToast(error.message || 'Error al conectar con la pasarela de pago.');
    } finally {
      this.isProcessingCheckout = false;
    }
  }

  // --- AUTENTICACIÓN Y SESIÓN ---
  async handleAuthSubmit(event) {
    event.preventDefault();
    const isRegister = (this.view.elements.authTitle?.textContent || '').trim() === 'Crear cuenta';
    const identifier = this.view.elements.authIdentifier?.value.trim() || '';
    const password = this.view.elements.authPassword?.value || '';

    if (!identifier || !password) {
      this.view.showToast('Por favor completa todos los campos.');
      return;
    }

    if (isRegister) {
      const nombre = (this.view.elements.authName?.value || '').trim();
      const email = (this.view.elements.authEmail?.value || '').trim();

      if (!nombre || !email) {
        this.view.showToast('Por favor ingresa tu nombre y correo.');
        return;
      }

      const user = await this.model.registerUser({ nombre, usernameOrEmail: identifier, email, password });

      if (!user) {
        this.view.showToast('Error: El usuario o correo ya está registrado.');
        return;
      }
      
      this.view.closeAuthModal();
      this.view.elements.authForm.reset();
      this.updateUI();
      this.view.showToast(`Bienvenido ${user.nombre}`);
      return;
    }

    const user = await this.model.loginUser(identifier, password);
    if (!user) {
      this.view.showToast('Credenciales incorrectas');
      return;
    }

    this.view.closeAuthModal();
    this.view.elements.authForm.reset();
    this.updateUI();
    this.view.showToast(`Hola de nuevo, ${user.nombre}`);
  }

  toggleAuthMode() {
    const title = this.view.elements.authTitle;
    const toggleBtn = this.view.elements.authToggleMode;
    const submitBtn = document.querySelector('#authForm .btn--primary');
    if (!title) return;

    const isLogin = title.textContent.trim() === 'Iniciar sesión';

    title.textContent = isLogin ? 'Crear cuenta' : 'Iniciar sesión';
    if (submitBtn) submitBtn.textContent = isLogin ? 'Crear cuenta' : 'Iniciar sesión';
    if (toggleBtn) toggleBtn.textContent = isLogin ? 'Ya tengo cuenta' : 'Crear una cuenta';

    const nameField = this.view.elements.authName?.closest('.auth-field');
    const emailField = this.view.elements.authEmail?.closest('.auth-field');

    if (nameField) {
      nameField.hidden = isLogin;
      nameField.querySelector('input').required = !isLogin;
    }
    if (emailField) {
      emailField.hidden = isLogin;
      emailField.querySelector('input').required = !isLogin;
    }
  }

  async handleLogout() {
    await this.model.logoutUser();
    this.model.clearCart();
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.updateUI();
    this.view.showToast('Sesión cerrada correctamente');
  }

  openHistoryIfLoggedIn() {
    const user = this.model.getCurrentUser();
    if (!user) {
      this.view.openAuthModal();
      this.view.showToast('Inicia sesión para ver tus compras');
      return;
    }
    if (typeof this.model.loadOrderHistory === 'function') {
      this.view.renderHistoryModal(this.model.loadOrderHistory(user), this.model.fmt.bind(this.model));
    }
    this.view.openHistoryModal();
  }

  // --- PANEL DE CUENTA Y SUB-PANFILES ---
  handleAccountOpen() {
    const user = this.model.getCurrentUser();
    if (!user) {
      this.view.openAuthModal();
      return;
    }
    this.view.openAccountModal();
    this.view.renderAccountPanel(user, 'profile', this.model.getAccountDataForCurrentUser());
  }

  handleAccountMenu(panel) {
    const user = this.model.getCurrentUser();
    if (!user) return;
    this.view.renderAccountPanel(user, panel, this.model.getAccountDataForCurrentUser());
  }

  async handleProfileSave(e) {
    e.preventDefault();
    const data = this.model.getAccountDataForCurrentUser();
    if (!data) return;

    const nombre = document.getElementById('accName')?.value.trim();
    const email = document.getElementById('accEmail')?.value.trim();
    const phone = document.getElementById('accPhone')?.value.trim();
    const dni = document.getElementById('accDni')?.value.trim();

    if (!nombre || !email) {
      this.view.showToast('Nombre y Email son obligatorios');
      return;
    }

    data.profile = {
      ...data.profile,
      nombre: nombre || data.profile.nombre,
      email: email || data.profile.email,
      phone: phone || '',
      dni: dni || ''
    };

    try {
      await this.model.updateUserSessionFromProfile(data.profile);
      this.model.saveCurrentUserAccountData(data);
      this.updateUI();
      this.view.showToast('Perfil actualizado con éxito');
    } catch (error) {
      this.view.showToast(error.message || 'No se pudo actualizar el perfil');
    }
  }

  handleAddressSave(e) {
    e.preventDefault();
    const data = this.model.getAccountDataForCurrentUser();
    if (!data) return;

    const alias = document.getElementById('addrAlias')?.value.trim() || 'Dirección Principal';
    const street = document.getElementById('addrStreet')?.value.trim() || '';
    const district = document.getElementById('addrDistrict')?.value.trim() || '';
    const city = document.getElementById('addrCity')?.value.trim() || 'Lima';
    const reference = document.getElementById('addrRef')?.value.trim() || '';

    if (!street || !district) {
      this.view.showToast('Ingresa la calle y el distrito');
      return;
    }

    data.addresses = [{ alias, street, district, city, reference }];

    this.model.saveCurrentUserAccountData(data);
    this.view.showToast('Dirección guardada correctamente');
  }

  handlePaymentMethodSave(e) {
    e.preventDefault();
    const data = this.model.getAccountDataForCurrentUser();
    if (!data) return;

    const alias = document.getElementById('payAlias')?.value.trim() || 'Mi Tarjeta';
    const type = document.getElementById('payType')?.value || 'Visa';
    const number = document.getElementById('payNumber')?.value.trim() || '';
    const holder = document.getElementById('payHolder')?.value.trim() || '';

    if (!number || number.length < 15) {
      this.view.showToast('Número de tarjeta no válido');
      return;
    }

    const maskedNumber = '**** **** **** ' + number.slice(-4);

    data.payments = [{ alias, type, number: maskedNumber, holder }];

    this.model.saveCurrentUserAccountData(data);
    this.view.showToast('Método de pago guardado');
  }

  handleRefundSave(e) {
    e.preventDefault();
    const data = this.model.getAccountDataForCurrentUser();
    if (!data) return;

    const bank = document.getElementById('refBank')?.value || '';
    const account = document.getElementById('refAccount')?.value.trim() || '';
    const cci = document.getElementById('refCci')?.value.trim() || '';
    const holder = document.getElementById('refHolder')?.value.trim() || '';

    if (!bank || !account) {
      this.view.showToast('Selecciona un banco e ingresa la cuenta');
      return;
    }

    data.refunds = { bank, account, cci, holder };

    this.model.saveCurrentUserAccountData(data);
    this.view.showToast('Datos de reembolso guardados');
  }

  // --- EVENTOS GLOBALES DE LA INTERFAZ ---
  bindGlobalEvents() {
    const {
      catToggle, catDropdown, categoryGrid, filterTabs, cartItems, overlay,
      authForm, accountBtn, cartOpenBtn, cartCloseBtn,
      deliveryOpenBtn, deliveryClose, deliveryConfirm, historyClose, listasBtn,
      mobileMenuBtn, catalogSearch, headerSearch, headerSearchBtn
    } = this.view.elements;

    // Desplegable de Categorías
    if (catToggle && catDropdown) {
      catToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        catDropdown.classList.toggle('open');
      });

      catDropdown.addEventListener('click', (e) => {
        const anchor = e.target.closest('[data-cat]');
        if (!anchor) return;
        e.preventDefault();
        this.setFilter(anchor.dataset.cat);
        catDropdown.classList.remove('open');
        const section = document.getElementById('catalogo');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Grid de Categorías
    if (categoryGrid) {
      categoryGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-card');
        if (btn) {
          this.setFilter(btn.dataset.cat);
          const section = document.getElementById('catalogo');
          if (section) section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Pestañas de Filtro
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-tab');
        if (btn) this.setFilter(btn.dataset.cat);
      });
    }

    // Búsqueda en catálogo e historia de cabecera
    document.addEventListener('input', (e) => {
      if (e.target === catalogSearch) this.setSearch(e.target.value);
      if (e.target === headerSearch) this.searchTerm = e.target.value.trim();
    });

    if (headerSearchBtn) {
      headerSearchBtn.addEventListener('click', () => {
        if (catalogSearch) catalogSearch.value = this.searchTerm;
        this.setFilter('todos');
        const section = document.getElementById('catalogo');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (headerSearch) {
      headerSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (catalogSearch) catalogSearch.value = this.searchTerm;
          this.setFilter('todos');
          const section = document.getElementById('catalogo');
          if (section) section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Botón Agregar al Carrito
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-btn');
      if (!btn) return;
      
      const productId = Number(btn.dataset.id);
      if (isNaN(productId)) return;

      this.addToCart(productId);
      btn.classList.add('added');
      const originalText = btn.textContent;
      btn.textContent = 'Agregado';
      setTimeout(() => { 
        btn.classList.remove('added'); 
        btn.textContent = originalText; 
      }, 900);
    });

    // Modificación de cantidades y remoción en el carrito
    if (cartItems) {
      cartItems.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (isNaN(id)) return;

        if (btn.dataset.action === 'inc') this.changeQty(id, 1);
        if (btn.dataset.action === 'dec') this.changeQty(id, -1);
        if (btn.dataset.action === 'remove') this.removeItem(id);
      });
    }

    // Botón Vaciar Carrito
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => this.clearFullCart());
    }

    // Overlay y Cierre de Modales
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.view.closeCart();
        this.view.closeDeliveryModal();
        this.view.closeAuthModal();
        this.view.closeHistoryModal();
        this.view.closeAccountModal();
        if (catDropdown) catDropdown.classList.remove('open');
      });
    }

    // Abrir/Cerrar Carrito
    if (cartOpenBtn) cartOpenBtn.addEventListener('click', this.view.openCart.bind(this.view));
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', this.view.closeCart.bind(this.view));
    
    // Finalizar Compra
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.handleCheckout());

    // Modal de Ubicación de Entrega
    if (deliveryOpenBtn) deliveryOpenBtn.addEventListener('click', this.view.openDeliveryModal.bind(this.view));
    if (deliveryClose) deliveryClose.addEventListener('click', this.view.closeDeliveryModal.bind(this.view));
    if (deliveryConfirm) {
      deliveryConfirm.addEventListener('click', () => {
        const dist = document.getElementById('districtSelect')?.value;
        if (dist) {
          if (this.view.elements.deliverySummary) {
            this.view.elements.deliverySummary.textContent = `Entrega en ${dist}`;
          }
          this.view.closeDeliveryModal();
          this.view.showToast(`Zona de entrega configurada para ${dist}`);
        }
      });
    }

    // Autenticación
    if (authForm) authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
    
    const authClose = document.getElementById('authClose');
    if (authClose) authClose.addEventListener('click', this.view.closeAuthModal.bind(this.view));
    
    const authToggleMode = document.getElementById('authToggleMode');
    if (authToggleMode) authToggleMode.addEventListener('click', () => this.toggleAuthMode());

    // Historial, Cuenta y Sesión
    if (listasBtn) listasBtn.addEventListener('click', () => this.openHistoryIfLoggedIn());
    if (accountBtn) accountBtn.addEventListener('click', () => this.handleAccountOpen());
    
    const accountLogoutBtn = document.getElementById('accountLogoutBtn');
    if (accountLogoutBtn) {
      accountLogoutBtn.addEventListener('click', () => {
        this.handleLogout();
        this.view.closeAccountModal();
      });
    }

    const accountClose = document.getElementById('accountClose');
    if (accountClose) accountClose.addEventListener('click', this.view.closeAccountModal.bind(this.view));
    if (historyClose) historyClose.addEventListener('click', this.view.closeHistoryModal.bind(this.view));

    // Menú Lateral del Panel de Usuario
    document.querySelectorAll('.account-menu__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.accountPanel;
        if (panel) this.handleAccountMenu(panel);
      });
    });

    // Envio dinámico de Sub-Formularios en el Panel de Cuenta
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'profileForm') this.handleProfileSave(e);
      if (e.target.id === 'addressForm') this.handleAddressSave(e);
      if (e.target.id === 'paymentForm') this.handlePaymentMethodSave(e);
      if (e.target.id === 'refundForm') this.handleRefundSave(e);
    });

    // Menú Adaptativo Móvil
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = this.view.elements.header.classList.toggle('mobile-menu-open');
        mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
          this.view.elements.headerActions?.querySelector('.action-btn')?.focus();
        }
      });
    }

    // Cierre de menús flotantes al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (
        catDropdown &&
        catToggle &&
        mobileMenuBtn &&
        !catDropdown.contains(e.target) &&
        !catToggle.contains(e.target) &&
        !mobileMenuBtn.contains(e.target)
      ) {
        catDropdown.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        this.view.elements.header.classList.remove('mobile-menu-open');
      }
    });
  }
}
