/*
Archivo: models/storeModel.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\models\storeModel.js
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-26
Autor: MCKLEIN
Propósito: Manejar productos, categorías desde Supabase (sin emojis, con icono vacío), usuarios, historial y sesión.
*/

const SUPABASE_URL = "https://bbfckczuqyzjgxltdisg.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZmNrY3p1cXl6amd4bHRkaXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODE4MzYsImV4cCI6MjEwMzE1NzgzNn0.e7dESMTDKMpVZqZSXZEX6iS-VFbgQECyzIHNp6B9cuk";

export default class StoreModel {
  constructor() {
    this.sessionUser = null;
    
    // Categorías con icono vacío para no romper la vista
    this.categories = [
      { id: '1', nombre: 'Abarrotes', icono: '' },
      { id: '2', nombre: 'Bebidas, Jugos y Aguas', icono: '' },
      { id: '3', nombre: 'Belleza, Moda y Accesorios', icono: '' },
      { id: '4', nombre: 'Carnes, Aves y Pescado', icono: '' },
      { id: '5', nombre: 'Cervezas y Cigarrillos', icono: '' },
      { id: '6', nombre: 'Condimentos', icono: '' },
      { id: '7', nombre: 'Congelados', icono: '' },
      { id: '8', nombre: 'Construcción y Ferretería', icono: '' },
      { id: '9', nombre: 'Cuidado Personal', icono: '' },
      { id: '10', nombre: 'Desayuno', icono: '' },
      { id: '11', nombre: 'Frutas y Verduras', icono: '' },
      { id: '12', nombre: 'Galletas, Dulces y Snacks', icono: '' },
      { id: '13', nombre: 'Huevos y Fiambres', icono: '' },
      { id: '14', nombre: 'Lavandería y Baño', icono: '' },
      { id: '15', nombre: 'Lácteos y Frescos', icono: '' },
      { id: '16', nombre: 'Librería', icono: '' },
      { id: '17', nombre: 'Licores', icono: '' },
      { id: '18', nombre: 'Limpieza', icono: '' },
      { id: '19', nombre: 'Mascotas', icono: '' },
      { id: '20', nombre: 'Menaje Hogar y Bazar', icono: '' },
      { id: '21', nombre: 'Pasteles', icono: '' },
      { id: '22', nombre: 'Panes', icono: '' },
      { id: '23', nombre: 'Postres', icono: '' },
      { id: '24', nombre: 'Repostería', icono: '' }
    ];

    let pid = 1;
    const p = (categoria, nombre, precio, unidad, icono, precioAnterior, rating) => ({
      id: pid++, categoria, nombre, precio, unidad, icono,
      precioAnterior: precioAnterior || null,
      rating: rating || (4.3 + Math.random() * 0.6).toFixed(1)
    });

    this.products = [
      p('11', 'Palta Hass', 7.90, 'kg', '🥑'),
      p('11', 'Plátano de seda', 3.20, 'kg', '🍌'),
      p('11', 'Tomate italiano', 4.80, 'kg', '🍅', 6.00),

      p('2', 'Agua mineral sin gas 2.5L', 3.50, 'unidad', '💧'),
      p('2', 'Gaseosa cola 1.5L', 6.90, 'unidad', '🥤', 8.50),

      p('15', 'Leche evaporada 400g', 3.80, 'unidad', '🥛'),
      p('13', 'Huevos rojos x30', 14.90, 'paquete', '🥚', 17.90),

      p('22', 'Pan francés x10', 4.00, 'unidad', '🥖'),
      p('4', 'Pechuga de pollo', 14.90, 'kg', '🍗'),
      p('1', 'Arroz extra 5kg', 19.90, 'bolsa', '🍚'),
      p('12', 'Galletas de vainilla', 4.50, 'paquete', '🍪'),
      p('9', 'Shampoo anticaspa 400ml', 19.90, 'unidad', '🧴'),
      p('19', 'Alimento para perro 15kg', 89.90, 'bolsa', '🐶')
    ];

    this.cart = {};
    this.currentFilter = 'todos';
    this.searchTerm = '';
    this.STORAGE_USERS = 'la-canasta-users';
    this.STORAGE_SESSION = 'la-canasta-session';
    this.STORAGE_HISTORY = 'la-canasta-order-history';
    this.STORAGE_ACCOUNT_DATA = 'la-canasta-account-data';
  }

  // --- CARGA DE CATEGORÍAS (DESDE SUPABASE) ---
  async loadCategories() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/categorias?estado=eq.true&select=id,nombre&order=id.asc`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error("Error consultando categorías en Supabase");

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        this.categories = data.map(cat => ({
          id: String(cat.id),
          nombre: cat.nombre,
          icono: '' // Retorna string vacío para no mostrar 'undefined' en HTML
        }));
      }
      return this.categories;
    } catch (error) {
      console.warn('Usando categorías locales por fallo en la consulta:', error);
      return this.categories;
    }
  }

  // --- AUTENTICACIÓN Y SESIÓN ---
  async loadSession() {
    return this.getCurrentUser();
  }

  getCurrentUser() {
    if (this.sessionUser) return this.sessionUser;
    const raw = localStorage.getItem(this.STORAGE_SESSION);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (user && (user.username || user.email || user.nombre)) {
        this.sessionUser = {
          ...user,
          username: user.username || user.email || 'usuario'
        };
        return this.sessionUser;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  setCurrentUser(user) {
    if (!user) {
      this.sessionUser = null;
      localStorage.removeItem(this.STORAGE_SESSION);
      this.cart = {};
      return;
    }

    const normalizedUser = {
      ...user,
      username: user.username || user.email || 'usuario'
    };

    this.sessionUser = normalizedUser;
    localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(normalizedUser));
  }

  async loginUser(identifier, password) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?or=(username.eq.${identifier},email.eq.${identifier})&password=eq.${password}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const users = await response.json();
        if (users && users.length > 0) {
          this.setCurrentUser(users[0]);
          return users[0];
        }
      }
    } catch (e) {
      console.warn('Error al conectar con Supabase en login, usando respaldo local...', e);
    }

    const localUsers = this.ensureUsers();
    const found = localUsers.find(
      u => (u.username === identifier || u.email === identifier) && u.password === password
    );

    if (found) {
      this.setCurrentUser(found);
      return found;
    }

    return null;
  }

  async registerUser({ nombre, usernameOrEmail, email, password }) {
    const newUser = {
      nombre: nombre || usernameOrEmail,
      username: usernameOrEmail,
      email: email || usernameOrEmail,
      password: password
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const createdUsers = await response.json();
        if (createdUsers && createdUsers.length > 0) {
          this.setCurrentUser(createdUsers[0]);
          return createdUsers[0];
        }
      }
    } catch (e) {
      console.warn('Error registrando en Supabase...', e);
    }

    const localUsers = this.ensureUsers();
    localUsers.push(newUser);
    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(localUsers));
    this.setCurrentUser(newUser);
    return newUser;
  }

  async logoutUser() {
    this.setCurrentUser(null);
    return true;
  }

  ensureUsers() {
    const demoUsers = [
      { nombre: 'Administrador', username: 'admin', email: 'admin@lacanasta.com', password: 'admin123' },
      { nombre: 'María López', username: 'maria', email: 'maria@lacanasta.com', password: 'maria2025' }
    ];

    const stored = localStorage.getItem(this.STORAGE_USERS);
    if (!stored) {
      localStorage.setItem(this.STORAGE_USERS, JSON.stringify(demoUsers));
      return demoUsers;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (error) {}

    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(demoUsers));
    return demoUsers;
  }

  // --- MÉTODOS AUXILIARES ---
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

  clearCart() {
    this.cart = {};
  }

  getHistoryKeyForUser(user = this.getCurrentUser()) {
    return user ? `${this.STORAGE_HISTORY}_${user.username}` : this.STORAGE_HISTORY;
  }

  loadOrderHistory(user = this.getCurrentUser()) {
    const key = this.getHistoryKeyForUser(user);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
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
        addresses: [{ alias: 'Casa', street: '', district: '', city: '', reference: '' }],
        payments: [{ alias: 'Tarjeta principal', type: 'Visa', number: '', holder: user.nombre }],
        refunds: { bank: '', account: '', cci: '', holder: user.nombre }
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
