/*
Archivo: views/storeView.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\views\storeView.js
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: MCKLEIN
Propósito: renderizar el contenido visual del catálogo, carrito, modales, historial y notificaciones.
Tecnologías: JavaScript ES6, DOM, template strings.
Dependencias: StoreModel, StoreController, index.html.
Estado: activo y enlazado a la UI.
*/
export default class StoreView {
  constructor() {
    this.elements = {
      header: document.getElementById('header'),
      tickerTrack: document.getElementById('tickerTrack'),
      catToggle: document.getElementById('catToggle'),
      catDropdown: document.getElementById('catDropdown'),
      categoryGrid: document.getElementById('categoryGrid'),
      filterTabs: document.getElementById('filterTabs'),
      productGrid: document.getElementById('productGrid'),
      emptyState: document.getElementById('emptyState'),
      offersGrid: document.getElementById('offersGrid'),
      cartBadge: document.getElementById('cartBadge'),
      cartItems: document.getElementById('cartItems'),
      cartSubtotal: document.getElementById('cartSubtotal'),
      cartFooter: document.getElementById('cartFooter'),
      checkoutBtn: document.getElementById('checkoutBtn'),
      overlay: document.getElementById('overlay'),
      cartDrawer: document.getElementById('cartDrawer'),
      cartOpenBtn: document.getElementById('cartOpenBtn'),
      cartCloseBtn: document.getElementById('cartCloseBtn'),
      authModal: document.getElementById('authModal'),
      authTitle: document.getElementById('authTitle'),
      authForm: document.getElementById('authForm'),
      authName: document.getElementById('authName'),
      authEmail: document.getElementById('authEmail'),
      authIdentifier: document.getElementById('authIdentifier'),
      authPassword: document.getElementById('authPassword'),
      authClose: document.getElementById('authClose'),
      authToggleMode: document.getElementById('authToggleMode'),
      accountBtn: document.getElementById('cuentaBtn'),
      accountModal: document.getElementById('accountModal'),
      accountPanel: document.getElementById('accountPanel'),
      accountLogoutBtn: document.getElementById('accountLogoutBtn'),
      accountClose: document.getElementById('accountClose'),
      historyModal: document.getElementById('historyModal'),
      historyList: document.getElementById('historyList'),
      historyClose: document.getElementById('historyClose'),
      deliveryModal: document.getElementById('deliveryModal'),
      deliveryOpenBtn: document.getElementById('deliveryOpenBtn'),
      deliveryClose: document.getElementById('deliveryClose'),
      deliveryConfirm: document.getElementById('deliveryConfirm'),
      footerCategories: document.getElementById('footerCategories'),
      toast: document.getElementById('toast'),
      headerSearch: document.getElementById('headerSearch'),
      headerSearchBtn: document.getElementById('headerSearchBtn'),
      catalogSearch: document.getElementById('catalogSearch'),
      mobileMenuBtn: document.getElementById('mobileMenuBtn'),
      listasBtn: document.getElementById('listasBtn'),
      newsletterForm: document.getElementById('newsletterForm'),
      newsletterEmail: document.getElementById('newsletterEmail'),
      newsletterSuccess: document.getElementById('newsletterSuccess'),
      countdownTime: document.getElementById('countdownTime'),
      heroCarousel: document.getElementById('heroCarousel'),
      carouselNext: document.getElementById('carouselNext'),
      carouselPrev: document.getElementById('carouselPrev'),
      carouselDots: document.getElementById('carouselDots')
    };
  }

  productCardHTML(prod, fmt) {
    const hasDiscount = !!prod.precioAnterior;
    return `
      <article class="product-card" data-id="${prod.id}">
        <div class="product-card__media"><span>${prod.icono || '📦'}</span></div>
        <div class="price-tag ${hasDiscount ? 'sale' : ''}">${fmt(prod.precio)}</div>
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

  renderTicker() {
    const tickerMsgs = [
      'Envío gratis en compras mayores a S/ 150',
      'Productos frescos seleccionados cada mañana',
      'Entrega en menos de 2 horas en Lima',
      'Paga con tarjeta, Yape, Plin o efectivo'
    ];
    this.elements.tickerTrack.innerHTML = (tickerMsgs.concat(tickerMsgs)).map((m) => `<span>${m}</span>`).join('');
  }

  renderCategoryDropdown(categories) {
    this.elements.catDropdown.innerHTML = categories.map((c) =>
      `<a href="#categorias" data-cat="${c.id}">${c.nombre}</a>`
    ).join('');
  }

  renderCategoryGrid(categories, currentFilter) {
    this.elements.categoryGrid.innerHTML = categories.map((c) => `
      <button class="category-card ${currentFilter === c.id ? 'active' : ''}" data-cat="${c.id}">
        <span class="category-card__label">${c.nombre}</span>
      </button>
    `).join('');
  }

  renderFilterTabs(categories, currentFilter) {
    const tabs = [{ id: 'todos', nombre: 'Todos' }, ...categories];
    this.elements.filterTabs.innerHTML = tabs.map((c) => `
      <button class="filter-tab ${currentFilter === c.id ? 'active' : ''}" data-cat="${c.id}">${c.nombre}</button>
    `).join('');
  }

  renderOffers(products, fmt) {
    const offers = products.filter((pr) => pr.precioAnterior);
    this.elements.offersGrid.innerHTML = offers.map((product) => this.productCardHTML(product, fmt)).join('');
  }

  renderProducts(products, currentFilter, searchTerm, fmt) {
    let list = [...products];
    if (currentFilter !== 'todos') {
      list = list.filter((pr) => pr.categoria === currentFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((pr) => pr.nombre.toLowerCase().includes(term));
    }

    this.elements.productGrid.innerHTML = list.map((product) => this.productCardHTML(product, fmt)).join('');
    this.elements.emptyState.hidden = list.length !== 0;
  }

  showToast(msg) {
    const toast = this.elements.toast;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  resetCartFooter() {
    if (!this.elements.cartFooter) return;
    this.elements.cartFooter.innerHTML = `
      <div class="cart-subtotal"><span>Subtotal</span><strong id="cartSubtotal">S/ 0.00</strong></div>
      <button class="btn btn--primary btn--block" id="checkoutBtn">Ir a pagar</button>
    `;
    this.elements.cartSubtotal = document.getElementById('cartSubtotal');
    this.elements.checkoutBtn = document.getElementById('checkoutBtn');
    if (this.elements.checkoutBtn) {
      this.elements.checkoutBtn.addEventListener('click', () => {
        const controller = window.__storeController;
        if (controller) controller.handleCheckout();
      }, { once: true });
    }
  }

  renderCart(cart, products, fmt) {
    const ids = Object.keys(cart);
    const totalQty = ids.reduce((sum, id) => sum + cart[id], 0);
    this.elements.cartBadge.textContent = totalQty;
    this.elements.cartBadge.classList.remove('bump');
    void this.elements.cartBadge.offsetWidth;
    this.elements.cartBadge.classList.add('bump');

    this.elements.cartSubtotal = this.elements.cartFooter?.querySelector('#cartSubtotal') || this.elements.cartSubtotal;
    this.elements.checkoutBtn = document.getElementById('checkoutBtn') || this.elements.checkoutBtn;

    if (ids.length === 0) {
      this.elements.cartItems.innerHTML = '<div class="cart-empty"><span>0</span>Tu carrito está vacío.<br>Agrega productos frescos.</div>';
      if (!this.elements.cartFooter?.querySelector('#checkoutBtn')) {
        this.resetCartFooter();
      }
      if (this.elements.cartSubtotal) this.elements.cartSubtotal.textContent = fmt(0);
      return;
    }

    let subtotal = 0;
    this.elements.cartItems.innerHTML = ids.map((id) => {
      const prod = products.find((pr) => pr.id === Number(id));
      const qty = cart[id];
      subtotal += prod.precio * qty;
      return `
        <div class="cart-item" data-cart-id="${id}">
          <div class="cart-item__media">${prod.icono || '📦'}</div>
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

    if (!this.elements.cartFooter?.querySelector('#checkoutBtn')) {
      this.resetCartFooter();
    }
    if (this.elements.cartSubtotal) this.elements.cartSubtotal.textContent = fmt(subtotal);
  }

  syncCheckoutButton(user, fmt) {
    this.elements.checkoutBtn = document.getElementById('checkoutBtn') || this.elements.checkoutBtn;
    const checkoutBtn = this.elements.checkoutBtn;
    if (!checkoutBtn) return;
    if (user) {
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

  updateAccountButton(user) {
    const cuentaBtn = this.elements.accountBtn;
    const label = cuentaBtn.querySelector('.label');
    if (!label) return;
    if (user) {
      label.textContent = user.nombre.split(' ')[0];
      cuentaBtn.classList.add('is-user');
      cuentaBtn.title = `Sesión activa: ${user.nombre}`;
    } else {
      label.textContent = 'Mi cuenta';
      cuentaBtn.classList.remove('is-user');
      cuentaBtn.title = 'Mi cuenta';
    }
  }

  openCart() {
    this.elements.cartDrawer.classList.add('open');
    this.elements.overlay.classList.add('open');
  }

  closeCart() {
    this.elements.cartDrawer.classList.remove('open');
    if (this.elements.cartFooter) {
      this.resetCartFooter();
    }
    const authIsOpen = this.elements.authModal.classList.contains('open');
    const deliveryIsOpen = this.elements.deliveryModal.classList.contains('open');
    const historyIsOpen = this.elements.historyModal.classList.contains('open');
    const accountIsOpen = this.elements.accountModal.classList.contains('open');
    if (!authIsOpen && !deliveryIsOpen && !historyIsOpen && !accountIsOpen) {
      this.elements.overlay.classList.remove('open');
    }
  }

  openAuthModal() {
    this.elements.authModal.classList.add('open');
    this.elements.authModal.setAttribute('aria-hidden', 'false');
    this.elements.overlay.classList.add('open');
    this.elements.authIdentifier.focus();
  }

  closeAuthModal() {
    this.elements.authModal.classList.remove('open');
    this.elements.authModal.setAttribute('aria-hidden', 'true');
    const deliveryIsOpen = this.elements.deliveryModal.classList.contains('open');
    const cartIsOpen = this.elements.cartDrawer.classList.contains('open');
    if (!deliveryIsOpen && !cartIsOpen) {
      this.elements.overlay.classList.remove('open');
    }
  }

  openDeliveryModal() {
    this.elements.deliveryModal.classList.add('open');
    this.elements.overlay.classList.add('open');
  }

  closeDeliveryModal() {
    this.elements.deliveryModal.classList.remove('open');
    const authIsOpen = this.elements.authModal.classList.contains('open');
    const cartIsOpen = this.elements.cartDrawer.classList.contains('open');
    if (!authIsOpen && !cartIsOpen) {
      this.elements.overlay.classList.remove('open');
    }
  }

  openAccountModal() {
    this.elements.accountModal.classList.add('open');
    this.elements.accountModal.setAttribute('aria-hidden', 'false');
    this.elements.overlay.classList.add('open');
  }

  closeAccountModal() {
    this.elements.accountModal.classList.remove('open');
    this.elements.accountModal.setAttribute('aria-hidden', 'true');
    const authIsOpen = this.elements.authModal.classList.contains('open');
    const cartIsOpen = this.elements.cartDrawer.classList.contains('open');
    const deliveryIsOpen = this.elements.deliveryModal.classList.contains('open');
    const historyIsOpen = this.elements.historyModal.classList.contains('open');
    if (!authIsOpen && !cartIsOpen && !deliveryIsOpen && !historyIsOpen) {
      this.elements.overlay.classList.remove('open');
    }
  }

  renderHistoryModal(orders, fmt) {
    this.elements.historyList.innerHTML = orders.length === 0 ? `
      <div class="history-empty">
        <strong>Sin compras todavía</strong>
        Tu historial aparecerá aquí cuando finalices tu primer pedido.
      </div>
    ` : orders.slice().reverse().map((order) => {
      const itemsHtml = order.items.map((item) => `<span>• ${item.name} x${item.qty}</span>`).join('');
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

  openHistoryModal() {
    this.elements.historyModal.classList.add('open');
    this.elements.historyModal.setAttribute('aria-hidden', 'false');
    this.elements.overlay.classList.add('open');
  }

  closeHistoryModal() {
    this.elements.historyModal.classList.remove('open');
    this.elements.historyModal.setAttribute('aria-hidden', 'true');
    const authIsOpen = this.elements.authModal.classList.contains('open');
    const cartIsOpen = this.elements.cartDrawer.classList.contains('open');
    const deliveryIsOpen = this.elements.deliveryModal.classList.contains('open');
    const accountIsOpen = this.elements.accountModal.classList.contains('open');
    if (!authIsOpen && !cartIsOpen && !deliveryIsOpen && !accountIsOpen) {
      this.elements.overlay.classList.remove('open');
    }
  }

  renderAccountPanel(user, panelName, data) {
    if (!user) {
      this.elements.accountPanel.innerHTML = '<p>Debes iniciar sesión para ver tu cuenta.</p>';
      return;
    }

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

    this.elements.accountPanel.innerHTML = templates[panelName] || templates.profile;
  }

  renderFooterCategories(categories) {
    this.elements.footerCategories.innerHTML = categories.slice(0, 6).map((c) =>
      `<li><a href="#categorias" data-cat="${c.id}" class="footer-cat-link">${c.nombre}</a></li>`
    ).join('');
  }
}
