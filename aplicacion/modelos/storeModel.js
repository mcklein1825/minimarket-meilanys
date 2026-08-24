/*
Archivo: models/storeModel.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\models\storeModel.js
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: manejar los productos, categorías, usuarios, historial, sesión y carrito de la aplicación.
Tecnologías: JavaScript ES6, localStorage, programación orientada a objetos.
Dependencias: StoreController, StoreView, main.js.
Estado: activo y central para la lógica del negocio.
*/
export default class StoreModel {
  constructor() {
    this.sessionUser = null;
    this.categories = [
      { id: 'frutas-verduras', nombre: 'Frutas y Verduras', icono: '🥬' },
      { id: 'bebidas', nombre: 'Bebidas', icono: '🥤' },
      { id: 'lacteos-huevos', nombre: 'Lácteos y Huevos', icono: '🥚' },
      { id: 'panaderia', nombre: 'Panadería', icono: '🥖' },
      { id: 'carnes-pescados', nombre: 'Carnes y Pescados', icono: '🥩' },
      { id: 'congelados', nombre: 'Congelados', icono: '🧊' },
      { id: 'despensa', nombre: 'Despensa', icono: '🍚' },
      { id: 'snacks-dulces', nombre: 'Snacks y Dulces', icono: '🍪' },
      { id: 'cuidado-hogar', nombre: 'Cuidado del Hogar', icono: '🧴' },
      { id: 'cuidado-personal', nombre: 'Cuidado Personal', icono: '🧼' },
      { id: 'mascotas', nombre: 'Mascotas', icono: '🐾' },
      { id: 'bebes', nombre: 'Bebés', icono: '🍼' }
    ];

    let pid = 1;
    const p = (categoria, nombre, precio, unidad, icono, precioAnterior, rating) => ({
      id: pid++, categoria, nombre, precio, unidad, icono,
      precioAnterior: precioAnterior || null,
      rating: rating || (4.3 + Math.random() * 0.6).toFixed(1)
    });

    this.products = [
      p('frutas-verduras', 'Palta Hass', 7.90, 'kg', '🥑'),
      p('frutas-verduras', 'Plátano de seda', 3.20, 'kg', '🍌'),
      p('frutas-verduras', 'Tomate italiano', 4.80, 'kg', '🍅', 6.00),

      p('bebidas', 'Agua mineral sin gas 2.5L', 3.50, 'unidad', '💧'),
      p('bebidas', 'Gaseosa cola 1.5L', 6.90, 'unidad', '🥤', 8.50),
      p('bebidas', 'Jugo de naranja 1L', 5.20, 'unidad', '🧃'),

      p('lacteos-huevos', 'Leche evaporada 400g', 3.80, 'unidad', '🥛'),
      p('lacteos-huevos', 'Huevos rojos x30', 14.90, 'paquete', '🥚', 17.90),
      p('lacteos-huevos', 'Yogurt natural 1L', 9.90, 'unidad', '🍶'),

      p('panaderia', 'Pan francés x10', 4.00, 'unidad', '🥖'),
      p('panaderia', 'Pan de molde integral', 6.50, 'unidad', '🍞'),
      p('panaderia', 'Croissant x4', 8.90, 'paquete', '🥐', 10.90),

      p('carnes-pescados', 'Pechuga de pollo', 14.90, 'kg', '🍗'),
      p('carnes-pescados', 'Filete de tilapia congelado 500g', 16.90, 'unidad', '🐟'),
      p('carnes-pescados', 'Carne molida especial', 22.90, 'kg', '🥩', 26.90),

      p('congelados', 'Papas fritas congeladas 1kg', 9.90, 'unidad', '🍟'),
      p('congelados', 'Hamburguesas mini x12', 18.90, 'paquete', '🍔'),
      p('congelados', 'Helado de vainilla 1L', 14.90, 'unidad', '🍨', 18.90),

      p('despensa', 'Arroz extra 5kg', 19.90, 'bolsa', '🍚'),
      p('despensa', 'Aceite vegetal 1L', 9.50, 'unidad', '🫗'),
      p('despensa', 'Fideos spaghetti 500g', 3.20, 'unidad', '🍝', 4.00),

      p('snacks-dulces', 'Galletas de vainilla', 4.50, 'paquete', '🍪'),
      p('snacks-dulces', 'Chocolate bitter x6', 9.90, 'caja', '🍫', 11.90),
      p('snacks-dulces', 'Gomitas surtidas', 7.90, 'bolsa', '🍬'),

      p('cuidado-hogar', 'Detergente líquido 3L', 24.90, 'unidad', '🧴'),
      p('cuidado-hogar', 'Papel higiénico x12', 22.90, 'paquete', '🧻', 26.90),
      p('cuidado-hogar', 'Bolsas de basura x30', 9.90, 'paquete', '🗑️'),

      p('cuidado-personal', 'Shampoo anticaspa 400ml', 19.90, 'unidad', '🧴'),
      p('cuidado-personal', 'Pasta dental menta', 6.90, 'unidad', '🪥', 8.50),
      p('cuidado-personal', 'Jabón de tocador x3', 8.50, 'paquete', '🧼'),

      p('mascotas', 'Alimento para perro 15kg', 89.90, 'bolsa', '🐶'),
      p('mascotas', 'Alimento para gato 3kg', 32.90, 'bolsa', '🐱', 37.90),
      p('mascotas', 'Arena sanitaria 10kg', 24.90, 'bolsa', '🐾'),

      p('bebes', 'Pañales talla M x30', 34.90, 'paquete', '👶'),
      p('bebes', 'Toallitas húmedas x80', 9.90, 'paquete', '🧴'),
      p('bebes', 'Papilla de frutas', 4.50, 'unidad', '🍎', 5.50)
    ];

    this.cart = {};
    this.currentFilter = 'todos';
    this.searchTerm = '';
    this.STORAGE_USERS = 'la-canasta-users';
    this.STORAGE_SESSION = 'la-canasta-session';
    this.STORAGE_HISTORY = 'la-canasta-order-history';
    this.STORAGE_ACCOUNT_DATA = 'la-canasta-account-data';
  }

  fmt(n) {
    return `S/ ${n.toFixed(2)}`;
  }

  getCatById() {
    return Object.fromEntries(this.categories.map((c) => [c.id, c]));
  }

  getFilteredProducts(filter = this.currentFilter, search = this.searchTerm) {
    let list = [...this.products];
    if (filter !== 'todos') {
      list = list.filter((pr) => pr.categoria === filter);
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter((pr) => {
        const categoria = this.getCatById()[pr.categoria]?.nombre || '';
        return pr.nombre.toLowerCase().includes(term) || categoria.toLowerCase().includes(term);
      });
    }
    return list;
  }

  getOfferProducts() {
    return this.products.filter((pr) => pr.precioAnterior);
  }

  ensureUsers() {
    const demoUsers = [
      { nombre: 'Administrador', username: 'admin', email: 'admin@lacanasta.com', password: 'admin123' },
      { nombre: 'María López', username: 'maria', email: 'maria@lacanasta.com', password: 'maria2025' },
      { nombre: 'Jorge Ramírez', username: 'jorge', email: 'jorge@lacanasta.com', password: 'jorge2025' },
      { nombre: 'Ana Torres', username: 'ana', email: 'ana@lacanasta.com', password: 'ana2025' },
      { nombre: 'Diego Silva', username: 'diego', email: 'diego@lacanasta.com', password: 'diego2025' }
    ];

    const stored = localStorage.getItem(this.STORAGE_USERS);
    if (!stored) {
      localStorage.setItem(this.STORAGE_USERS, JSON.stringify(demoUsers));
      return demoUsers;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch (error) {
      // ignore and fallback
    }

    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(demoUsers));
    return demoUsers;
  }

  getCurrentUser() {
    if (this.sessionUser && this.sessionUser.username) {
      return this.sessionUser;
    }

    const raw = localStorage.getItem(this.STORAGE_SESSION);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      this.sessionUser = user && user.username ? user : null;
      return this.sessionUser;
    } catch (error) {
      return null;
    }
  }

  setCurrentUser(user) {
    this.sessionUser = user && user.username ? user : null;
    if (!user) {
      localStorage.removeItem(this.STORAGE_SESSION);
      this.cart = {};
    } else {
      localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(user));
    }
  }

  async loadSession() {
    try {
      const response = await fetch('../servicios/auth.php');
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.user) {
        this.setCurrentUser(null);
        return null;
      }
      this.setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      return null;
    }
  }

  async loginUser(identifier, password) {
    try {
      const response = await fetch('../servicios/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', identifier, password })
      });

      const data = await response.json();
      if (!response.ok || !data.user) {
        return null;
      }

      this.setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      return null;
    }
  }

  async logoutUser() {
    try {
      await fetch('../servicios/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (error) {
      // Ignore network issues, the local UI should still log out.
    }

    this.setCurrentUser(null);
    return true;
  }

  clearCart() {
    this.cart = {};
  }

  getHistoryKeyForUser(user = this.getCurrentUser()) {
    return user ? `${this.STORAGE_HISTORY}_${user.username}` : this.STORAGE_HISTORY;
  }

  loadOrderHistory(user = this.getCurrentUser()) {
    const key = this.getHistoryKeyForUser(user);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (!user) return [];
      const legacyRaw = localStorage.getItem(this.STORAGE_HISTORY);
      if (!legacyRaw) return [];
      try {
        const parsed = JSON.parse(legacyRaw);
        if (!Array.isArray(parsed)) return [];
        localStorage.setItem(key, JSON.stringify(parsed));
        return parsed;
      } catch (error) {
        return [];
      }
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  saveOrderHistory(history, user = this.getCurrentUser()) {
    localStorage.setItem(this.getHistoryKeyForUser(user), JSON.stringify(history));
  }

  getAccountDataMap() {
    const raw = localStorage.getItem(this.STORAGE_ACCOUNT_DATA);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  saveAccountDataMap(map) {
    localStorage.setItem(this.STORAGE_ACCOUNT_DATA, JSON.stringify(map));
  }

  getAccountDataForCurrentUser() {
    const user = this.getCurrentUser();
    if (!user) return null;
    const map = this.getAccountDataMap();
    const username = user.username;

    if (!map[username]) {
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
        }
      };
      this.saveAccountDataMap(map);
    }

    return map[username];
  }

  saveCurrentUserAccountData(data) {
    const user = this.getCurrentUser();
    if (!user || !data) return;
    const map = this.getAccountDataMap();
    map[user.username] = data;
    this.saveAccountDataMap(map);
  }

  updateUserSessionFromProfile(profile) {
    const user = this.getCurrentUser();
    if (!user || !profile) return;
    const updated = {
      ...user,
      nombre: profile.nombre || user.nombre,
      username: profile.username || user.username,
      email: profile.email || user.email
    };
    localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(updated));
  }
}
