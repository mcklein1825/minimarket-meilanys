/*
Archivo: controllers/storeController.js
Proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Propósito: Coordinar la interacción del usuario con el modelo y la vista para control de flujo, autenticación y pagos con Mercado Pago.
*/
export default class StoreController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentFilter = 'todos';
    this.searchTerm = '';
    this.toastTimer = null;
  }

  async init() {
    window.__storeController = this;
    this.model.ensureUsers();
    await this.model.loadSession();
    this.bindGlobalEvents();
    this.updateUI();
    this.renderEverything();
  }

  updateUI() {
    const currentUser = this.model.getCurrentUser();
    this.view.updateAccountButton(currentUser);
    this.view.syncCheckoutButton(currentUser);
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
    this.view.renderHistoryModal(this.model.loadOrderHistory(currentUser), this.model.fmt.bind(this.model));
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

  addToCart(id) {
    this.model.cart[id] = (this.model.cart[id] || 0) + 1;
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
    this.view.showToast('Producto agregado al carrito');
  }

  changeQty(id, delta) {
    if (!this.model.cart[id]) return;
    this.model.cart[id] += delta;
    if (this.model.cart[id] <= 0) delete this.model.cart[id];
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
  }

  removeItem(id) {
    const cartItem = this.view.elements.cartItems.querySelector(`[data-cart-id="${id}"]`);
    if (cartItem) {
      cartItem.classList.add('removing');
      setTimeout(() => {
        delete this.model.cart[id];
        this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
      }, 260);
      return;
    }
    delete this.model.cart[id];
    this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
  }

  async handleCheckout() {
    // 1) Validamos sesión de usuario
    const user = this.model.getCurrentUser();
    if (!user) {
      this.view.showToast('Debes iniciar sesión para pagar');
      this.view.openAuthModal();
      return;
    }

    // 2) Validamos productos en el carrito
    const ids = Object.keys(this.model.cart);
    if (ids.length === 0) {
      this.view.showToast('Tu carrito está vacío todavía');
      return;
    }

    // 3) Preparamos los productos en Soles (PEN)
    const items = ids.map((id) => {
      const product = this.model.products.find((pr) => String(pr.id) === String(id));
      if (!product) return null;
      const qty = this.model.cart[id];
      return {
        title: product.nombre,
        quantity: Number(qty),
        unit_price: Number(product.precio),
        currency_id: 'PEN'
      };
    }).filter(Boolean);

    if (items.length === 0) {
      this.view.showToast('No se pudieron procesar los productos del carrito');
      return;
    }

    try {
      // 4) Petición al backend
      const response = await fetch('../servicios/crear_preferencia.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          items, 
          payerEmail: user.email || user.correo 
        })
      });

      // 5) Lectura segura de la respuesta para prevenir SyntaxError por HTML
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('El servidor devolvió un error inesperado. Revisa la consola para más detalles.');
      }

      // 6) Validación de respuesta de Mercado Pago
      if (!response.ok || !data.init_point) {
        const message = data?.error || data?.hint || 'No se pudo crear la preferencia de pago';
        throw new Error(message);
      }

      // 7) Redirección a la pasarela de Mercado Pago
      window.location.href = data.init_point;
    } catch (error) {
      console.error('Error con Mercado Pago:', error);
      this.view.showToast(error.message || 'No se pudo iniciar el pago. Intenta nuevamente.');
    }
  }

  async handleAuthSubmit(event) {
    event.preventDefault();
    const isRegister = (this.view.elements.authTitle?.textContent || '').trim() === 'Crear cuenta';
    const identifier = this.view.elements.authIdentifier.value.trim();
    const password = this.view.elements.authPassword.value;

    if (isRegister) {
      const nombre = (this.view.elements.authName?.value || '').trim();
      const email = (this.view.elements.authEmail?.value || '').trim();
      const user = await this.model.registerUser({ nombre, usernameOrEmail: identifier, email, password });

      if (!user) {
        this.view.showToast('No se pudo crear la cuenta. Usa otro usuario o email.');
        return;
      }

      this.view.closeAuthModal();
      this.view.elements.authForm.reset();
      this.updateUI();
      this.view.showToast(`Cuenta creada. Bienvenido ${user.nombre}`);
      return;
    }

    const user = await this.model.loginUser(identifier, password);

    if (!user) {
      this.view.showToast('Credenciales incorrectas. Intenta otra vez');
      return;
    }

    this.view.closeAuthModal();
    this.view.elements.authForm.reset();
    this.updateUI();
    this.view.showToast(`Bienvenido ${user.nombre}`);
  }

  toggleAuthMode() {
    const title = this.view.elements.authTitle;
    const toggleBtn = this.view.elements.authToggleMode;
    const submitBtn = document.querySelector('#authForm .btn--primary');
    const isLogin = title.textContent.trim() === 'Iniciar sesión';
    const toRegister = isLogin;

    title.textContent = toRegister ? 'Crear cuenta' : 'Iniciar sesión';
    submitBtn.textContent = toRegister ? 'Crear cuenta' : 'Iniciar sesión';
    toggleBtn.textContent = toRegister ? 'Ya tengo cuenta' : 'Crear una cuenta';

    if (this.view.elements.authName) this.view.elements.authName.closest('.auth-field')?.style && (this.view.elements.authName.closest('.auth-field').style.display = toRegister ? '' : 'none');
    if (this.view.elements.authEmail) this.view.elements.authEmail.closest('.auth-field')?.style && (this.view.elements.authEmail.closest('.auth-field').style.display = toRegister ? '' : 'none');

    this.view.showToast(toRegister ? 'Completa los datos para crear tu cuenta' : 'Puedes iniciar sesión con usuarios de prueba');
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
      this.view.showToast('Inicia sesión para ver tu historial');
      return;
    }
    this.view.renderHistoryModal(this.model.loadOrderHistory(user), this.model.fmt.bind(this.model));
    this.view.openHistoryModal();
  }

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
    this.view.renderAccountPanel(user, panel, this.model.getAccountDataForCurrentUser());
  }

  saveAccountForm(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const data = this.model.getAccountDataForCurrentUser();
    const formType = form.dataset.form;

    if (formType === 'profile') {
      const formData = new FormData(form);
      data.profile = {
        nombre: formData.get('nombre')?.toString().trim() || '',
        username: formData.get('username')?.toString().trim() || '',
        email: formData.get('email')?.toString().trim() || '',
        phone: formData.get('phone')?.toString().trim() || '',
        dni: formData.get('dni')?.toString().trim() || ''
      };
      this.model.saveCurrentUserAccountData(data);
      this.model.updateUserSessionFromProfile(data.profile);
      this.updateUI();
      this.view.showToast('Datos personales guardados');
      return;
    }

    if (formType === 'addresses') {
      const formData = new FormData(form);
      const entries = Object.keys(Object.fromEntries(formData.entries())).filter((key) => key.startsWith('addressAlias_'));
      const addresses = entries.map((key) => {
        const index = key.replace('addressAlias_', '');
        return {
          alias: formData.get(`addressAlias_${index}`)?.toString().trim() || 'Dirección',
          street: formData.get(`addressStreet_${index}`)?.toString().trim() || '',
          district: formData.get(`addressDistrict_${index}`)?.toString().trim() || '',
          city: formData.get(`addressCity_${index}`)?.toString().trim() || '',
          reference: formData.get(`addressReference_${index}`)?.toString().trim() || ''
        };
      });
      data.addresses = addresses.filter((item) => item.street || item.district || item.city || item.reference || item.alias);
      this.model.saveCurrentUserAccountData(data);
      this.view.showToast('Direcciones guardadas');
      return;
    }

    if (formType === 'payments') {
      const formData = new FormData(form);
      const entries = Object.keys(Object.fromEntries(formData.entries())).filter((key) => key.startsWith('paymentAlias_'));
      const payments = entries.map((key) => {
        const index = key.replace('paymentAlias_', '');
        return {
          alias: formData.get(`paymentAlias_${index}`)?.toString().trim() || 'Medio de pago',
          type: formData.get(`paymentType_${index}`)?.toString().trim() || '',
          number: formData.get(`paymentNumber_${index}`)?.toString().trim() || '',
          holder: formData.get(`paymentHolder_${index}`)?.toString().trim() || ''
        };
      });
      data.payments = payments.filter((item) => item.number || item.type || item.alias || item.holder);
      this.model.saveCurrentUserAccountData(data);
      this.view.showToast('Medios de pago guardados');
      return;
    }

    if (formType === 'refunds') {
      const formData = new FormData(form);
      data.refunds = {
        bank: formData.get('bank')?.toString().trim() || '',
        account: formData.get('account')?.toString().trim() || '',
        cci: formData.get('cci')?.toString().trim() || '',
        holder: formData.get('holder')?.toString().trim() || ''
      };
      this.model.saveCurrentUserAccountData(data);
      this.view.showToast('Datos de reembolso guardados');
      return;
    }

    if (formType === 'security') {
      const formData = new FormData(form);
      const currentPassword = formData.get('currentPassword')?.toString() || '';
      const newPassword = formData.get('newPassword')?.toString() || '';
      const confirmPassword = formData.get('confirmPassword')?.toString() || '';
      const users = this.model.ensureUsers();
      const currentUser = this.model.getCurrentUser();
      const userRecord = users.find((u) => u.username === currentUser.username || u.email === currentUser.email);

      if (!userRecord || userRecord.password !== currentPassword) {
        this.view.showToast('La contraseña actual es incorrecta');
        return;
      }
      if (!newPassword || newPassword !== confirmPassword) {
        this.view.showToast('La nueva contraseña no coincide');
        return;
      }

      userRecord.password = newPassword;
      localStorage.setItem(this.model.STORAGE_USERS, JSON.stringify(users));
      this.view.showToast('Contraseña actualizada');
      form.reset();
    }
  }

  handleAccountAction(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    if (actionButton.dataset.action === 'add-address') {
      const data = this.model.getAccountDataForCurrentUser();
      data.addresses.push({ alias: 'Nueva dirección', street: '', district: '', city: '', reference: '' });
      this.model.saveCurrentUserAccountData(data);
      this.handleAccountMenu('addresses');
      return;
    }

    if (actionButton.dataset.action === 'add-payment') {
      const data = this.model.getAccountDataForCurrentUser();
      data.payments.push({ alias: 'Nuevo medio', type: '', number: '', holder: this.model.getCurrentUser().nombre });
      this.model.saveCurrentUserAccountData(data);
      this.handleAccountMenu('payments');
      return;
    }

    if (actionButton.dataset.action === 'delete-account') {
      const shouldDelete = window.confirm('¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.');
      if (!shouldDelete) return;
      const currentUser = this.model.getCurrentUser();
      const users = this.model.ensureUsers().filter((u) => u.username !== currentUser.username);
      localStorage.setItem(this.model.STORAGE_USERS, JSON.stringify(users));
      const map = this.model.getAccountDataMap();
      delete map[currentUser.username];
      this.model.saveAccountDataMap(map);
      localStorage.removeItem(this.model.STORAGE_SESSION);
      this.model.clearCart();
      this.view.renderCart(this.model.cart, this.model.products, this.model.fmt.bind(this.model));
      this.view.syncCheckoutButton(this.model.getCurrentUser());
      this.view.closeAccountModal();
      this.view.showToast('Cuenta eliminada');
      this.view.updateAccountButton(this.model.getCurrentUser());
      return;
    }

    if (actionButton.dataset.action === 'delete-address') {
      const index = Number(actionButton.dataset.index);
      const data = this.model.getAccountDataForCurrentUser();
      data.addresses.splice(index, 1);
      if (!data.addresses.length) data.addresses = [{ alias: 'Casa', street: '', district: '', city: '', reference: '' }];
      this.model.saveCurrentUserAccountData(data);
      this.handleAccountMenu('addresses');
      return;
    }

    if (actionButton.dataset.action === 'delete-payment') {
      const index = Number(actionButton.dataset.index);
      const data = this.model.getAccountDataForCurrentUser();
      data.payments.splice(index, 1);
      if (!data.payments.length) data.payments = [{ alias: 'Tarjeta principal', type: 'Visa', number: '', holder: this.model.getCurrentUser().nombre }];
      this.model.saveCurrentUserAccountData(data);
      this.handleAccountMenu('payments');
    }
  }

  bindGlobalEvents() {
    const {
      catToggle,
      catDropdown,
      categoryGrid,
      filterTabs,
      cartItems,
      cartDrawer,
      overlay,
      authForm,
      authToggleButton,
      footerCategories,
      accountBtn,
      accountPanel,
      accountLogoutBtn,
      accountClose,
      authClose,
      deliveryOpenBtn,
      deliveryClose,
      deliveryConfirm,
      cartOpenBtn,
      cartCloseBtn,
      checkoutBtn,
      historyClose,
      listasBtn,
      mobileMenuBtn,
      headerSearch,
      catalogSearch,
      headerSearchBtn,
      deliveryModal
    } = this.view.elements;

    catToggle.addEventListener('click', () => {
      const open = catDropdown.classList.toggle('open');
      catToggle.setAttribute('aria-expanded', open);
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.categories-nav')) {
        catDropdown.classList.remove('open');
        catToggle.setAttribute('aria-expanded', 'false');
      }
    });

    catDropdown.addEventListener('click', (event) => {
      const anchor = event.target.closest('[data-cat]');
      if (!anchor) return;
      event.preventDefault();
      this.currentFilter = anchor.dataset.cat;
      this.setFilter(this.currentFilter);
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
      catDropdown.classList.remove('open');
    });

    categoryGrid.addEventListener('click', (event) => {
      const btn = event.target.closest('.category-card');
      if (!btn) return;
      this.setFilter(btn.dataset.cat);
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });

    filterTabs.addEventListener('click', (event) => {
      const btn = event.target.closest('.filter-tab');
      if (!btn) return;
      this.setFilter(btn.dataset.cat);
    });

    document.addEventListener('input', (event) => {
      if (event.target === catalogSearch) {
        this.setSearch(event.target.value);
      }
      if (event.target === headerSearch) {
        this.searchTerm = event.target.value.trim();
      }
    });

    headerSearchBtn.addEventListener('click', () => {
      this.view.elements.catalogSearch.value = this.searchTerm;
      this.setFilter('todos');
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });

    headerSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.view.elements.catalogSearch.value = this.searchTerm;
        this.setFilter('todos');
        document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
      }
    });

    document.addEventListener('click', (event) => {
      const btn = event.target.closest('.add-btn');
      if (!btn) return;
      this.addToCart(Number(btn.dataset.id));
      btn.classList.add('added');
      const original = btn.textContent;
      btn.textContent = 'Agregado';
      setTimeout(() => {
        btn.classList.remove('added');
        btn.textContent = original;
      }, 900);
    });

    cartItems.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === 'inc') this.changeQty(id, 1);
      if (btn.dataset.action === 'dec') this.changeQty(id, -1);
      if (btn.dataset.action === 'remove') this.removeItem(id);
    });

    overlay.addEventListener('click', () => {
      this.view.closeCart();
      this.view.closeDeliveryModal();
      this.view.closeAuthModal();
      this.view.closeHistoryModal();
      this.view.closeAccountModal();
      try {
        this.view.elements.header.classList.remove('menu-open');
        catDropdown.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      } catch (e) {}
    });

    cartOpenBtn.addEventListener('click', this.view.openCart.bind(this.view));
    cartCloseBtn.addEventListener('click', this.view.closeCart.bind(this.view));
    document.getElementById('checkoutBtn').addEventListener('click', () => this.handleCheckout());

    deliveryOpenBtn.addEventListener('click', this.view.openDeliveryModal.bind(this.view));
    deliveryClose.addEventListener('click', this.view.closeDeliveryModal.bind(this.view));
    deliveryConfirm.addEventListener('click', () => {
      const choice = document.querySelector('input[name="delivery"]:checked').value;
      this.view.closeDeliveryModal();
      this.view.showToast(choice === 'domicilio' ? 'Entrega a domicilio seleccionada' : 'Recojo en tienda seleccionado');
    });

    authForm.addEventListener('submit', (event) => this.handleAuthSubmit(event));
    document.getElementById('authClose').addEventListener('click', this.view.closeAuthModal.bind(this.view));
    document.getElementById('authToggleMode').addEventListener('click', () => this.toggleAuthMode());

    listasBtn.addEventListener('click', () => this.openHistoryIfLoggedIn());
    accountBtn.addEventListener('click', () => this.handleAccountOpen());
    document.getElementById('accountLogoutBtn').addEventListener('click', () => {
      this.handleLogout();
      this.view.closeAccountModal();
    });
    document.getElementById('accountClose').addEventListener('click', this.view.closeAccountModal.bind(this.view));
    document.getElementById('historyClose').addEventListener('click', this.view.closeHistoryModal.bind(this.view));

    document.querySelectorAll('.account-menu__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.accountPanel;
        if (panel) this.handleAccountMenu(panel);
      });
    });

    accountPanel.addEventListener('submit', (event) => this.saveAccountForm(event));
    accountPanel.addEventListener('click', (event) => this.handleAccountAction(event));

    document.getElementById('newsletterForm').addEventListener('submit', (event) => {
      event.preventDefault();
      document.getElementById('newsletterSuccess').hidden = false;
      document.getElementById('newsletterEmail').value = '';
    });

    footerCategories.addEventListener('click', (event) => {
      const anchor = event.target.closest('.footer-cat-link');
      if (!anchor) return;
      event.preventDefault();
      this.setFilter(anchor.dataset.cat);
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });

    mobileMenuBtn.addEventListener('click', () => {
      const open = this.view.elements.header.classList.toggle('menu-open');
      catDropdown.classList.toggle('open', open);
      mobileMenuBtn.setAttribute('aria-expanded', open);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    const countdownEl = document.getElementById('countdownTime');
    const target = Date.now() + (2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000);
    const tickCountdown = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, '0');
      countdownEl.innerHTML = `${d}d ${pad(h)}<span class="colon">:</span>${pad(m)}<span class="colon">:</span>${pad(s)}`;
    };
    tickCountdown();
    setInterval(tickCountdown, 1000);

    const slides = Array.from(document.querySelectorAll('.slide'));
    const dotsWrap = document.getElementById('carouselDots');
    let slideIndex = 0;
    let carouselTimer = null;

    dotsWrap.innerHTML = slides.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Ir a la diapositiva ${i + 1}"></button>`).join('');

    const goToSlide = (i) => {
      slides[slideIndex].classList.remove('active');
      dotsWrap.children[slideIndex].classList.remove('active');
      slideIndex = (i + slides.length) % slides.length;
      slides[slideIndex].classList.add('active');
      dotsWrap.children[slideIndex].classList.add('active');
    };
    const nextSlide = () => goToSlide(slideIndex + 1);
    const prevSlide = () => goToSlide(slideIndex - 1);
    const startCarousel = () => { carouselTimer = setInterval(nextSlide, 5000); };
    const stopCarousel = () => clearInterval(carouselTimer);

    document.getElementById('carouselNext').addEventListener('click', () => { nextSlide(); stopCarousel(); startCarousel(); });
    document.getElementById('carouselPrev').addEventListener('click', () => { prevSlide(); stopCarousel(); startCarousel(); });
    dotsWrap.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-i]');
      if (!button) return;
      goToSlide(Number(button.dataset.i));
      stopCarousel();
      startCarousel();
    });
    document.getElementById('heroCarousel').addEventListener('mouseenter', stopCarousel);
    document.getElementById('heroCarousel').addEventListener('mouseleave', startCarousel);
    startCarousel();
  }
}
