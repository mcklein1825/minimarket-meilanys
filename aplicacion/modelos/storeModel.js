/*
Archivo: modelos/storeModel.js
Proyecto: Minimarket Meilanys
*/
export default class StoreModel {
  constructor() {
    this.products = [];
    this.categories = [];
    this.cart = {};
    this.STORAGE_USERS = 'meilanys_users';
    this.STORAGE_SESSION = 'meilanys_session';
    this.STORAGE_ACCOUNTS = 'meilanys_accounts';
    this.STORAGE_ORDERS = 'meilanys_orders'; // Nuevo: para historial de pedidos
    this.currentUser = null;
  }

  // --- NUEVO: Cargar productos desde Supabase ---
  async fetchProductsFromDB() {
    try {
      const response = await fetch('../servicios/obtener_productos.php');
      if (!response.ok) throw new Error('Respuesta inválida del servidor');
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        this.products = data;
        
        // Genera las categorías automáticamente
        const uniqueCats = [...new Set(data.map(p => p.categoria))];
        this.categories = uniqueCats.map(c => ({ id: c, nombre: c }));
      }
    } catch (error) {
      console.error('Error al cargar productos desde la base de datos:', error);
    }
  }

  // --- NUEVO: Guardar historial de pedidos ---
  saveOrder(user, order) {
    const historyMap = JSON.parse(localStorage.getItem(this.STORAGE_ORDERS) || '{}');
    if (!historyMap[user.username]) historyMap[user.username] = [];
    historyMap[user.username].unshift(order); // Coloca el pedido más reciente al inicio
    localStorage.setItem(this.STORAGE_ORDERS, JSON.stringify(historyMap));
  }

  loadOrderHistory(user) {
    if (!user) return [];
    const historyMap = JSON.parse(localStorage.getItem(this.STORAGE_ORDERS) || '{}');
    return historyMap[user.username] || [];
  }

  // --- Métodos originales de sesión y carrito ---
  clearCart() {
    this.cart = {};
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async loadSession() {
    const saved = localStorage.getItem(this.STORAGE_SESSION);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
  }

  ensureUsers() {
    const users = localStorage.getItem(this.STORAGE_USERS);
    if (!users) {
      const defaultUsers = [{ nombre: 'Usuario Prueba', username: 'admin', email: 'admin@test.com', password: '123' }];
      localStorage.setItem(this.STORAGE_USERS, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(users);
  }

  async loginUser(identifier, password) {
    const users = this.ensureUsers();
    const user = users.find(u => (u.username === identifier || u.email === identifier) && u.password === password);
    if (user) {
      this.currentUser = user;
      localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(user));
    }
    return user;
  }

  async registerUser(userData) {
    const users = this.ensureUsers();
    if (users.find(u => u.username === userData.usernameOrEmail || u.email === userData.email)) {
      return null; // El usuario ya existe
    }
    const newUser = {
      nombre: userData.nombre,
      username: userData.usernameOrEmail,
      email: userData.email,
      password: userData.password
    };
    users.push(newUser);
    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(users));
    this.currentUser = newUser;
    localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(newUser));
    return newUser;
  }

  async logoutUser() {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_SESSION);
  }

  getAccountDataMap() {
    return JSON.parse(localStorage.getItem(this.STORAGE_ACCOUNTS) || '{}');
  }

  saveAccountDataMap(map) {
    localStorage.setItem(this.STORAGE_ACCOUNTS, JSON.stringify(map));
  }

  getAccountDataForCurrentUser() {
    if (!this.currentUser) return null;
    const map = this.getAccountDataMap();
    if (!map[this.currentUser.username]) {
      map[this.currentUser.username] = {
        profile: { nombre: this.currentUser.nombre, username: this.currentUser.username, email: this.currentUser.email, phone: '', dni: '' },
        addresses: [{ alias: 'Casa', street: '', district: '', city: '', reference: '' }],
        payments: [{ alias: 'Tarjeta principal', type: 'Visa', number: '', holder: this.currentUser.nombre }],
        refunds: { bank: '', account: '', cci: '', holder: '' }
      };
      this.saveAccountDataMap(map);
    }
    return map[this.currentUser.username];
  }

  saveCurrentUserAccountData(data) {
    if (!this.currentUser) return;
    const map = this.getAccountDataMap();
    map[this.currentUser.username] = data;
    this.saveAccountDataMap(map);
  }

  updateUserSessionFromProfile(profile) {
    if (!this.currentUser) return;
    this.currentUser.nombre = profile.nombre;
    this.currentUser.email = profile.email;
    localStorage.setItem(this.STORAGE_SESSION, JSON.stringify(this.currentUser));
    const users = this.ensureUsers();
    const userIndex = users.findIndex(u => u.username === this.currentUser.username);
    if (userIndex !== -1) {
      users[userIndex].nombre = profile.nombre;
      users[userIndex].email = profile.email;
      localStorage.setItem(this.STORAGE_USERS, JSON.stringify(users));
    }
  }

  fmt(price) {
    return `S/ ${Number(price).toFixed(2)}`;
  }
}
