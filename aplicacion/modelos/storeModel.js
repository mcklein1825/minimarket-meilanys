/*
Archivo: modelos/storeModel.js
Proyecto: Minimarket Meilanys
Autor: MCKLEIN
*/
export default class StoreModel {
  constructor() {
    this.products = [];
    this.categories = [];
    this.cart = {};
    // Se eliminaron STORAGE_USERS y STORAGE_SESSION porque ahora lo maneja Supabase
    this.STORAGE_ACCOUNTS = 'meilanys_accounts';
    this.STORAGE_ORDERS = 'meilanys_orders';
    this.currentUser = null;
  }

  // --- Cargar productos desde la BD ---
  async fetchProductsFromDB() {
    try {
      const response = await fetch('../servicios/obtener_productos.php');
      if (!response.ok) throw new Error('Respuesta inválida del servidor');
      
      const data = await response.json();
      const listaProductos = data.productos || (Array.isArray(data) ? data : []);

      if (listaProductos.length > 0) {
        this.products = listaProductos;

        if (this.categories.length === 0) {
          const uniqueCats = [...new Set(listaProductos.map(p => p.categoria).filter(Boolean))];
          this.categories = uniqueCats.map(c => ({ id: c, nombre: c, slug: c }));
        }
      }
    } catch (error) {
      console.error('Error al cargar productos desde la base de datos:', error);
    }
  }

  // --- Cargar categorías desde la BD ---
  async fetchCategoriesFromDB() {
    try {
      const response = await fetch('../servicios/obtener_categorias.php');
      if (!response.ok) throw new Error('Error al consultar categorías');

      const data = await response.json();

      if (data.exito && Array.isArray(data.categorias) && data.categorias.length > 0) {
        this.categories = data.categorias.map(cat => {
          const generatedSlug = cat.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-');

          return {
            id: cat.id || cat.nombre,
            nombre: cat.nombre,
            slug: generatedSlug
          };
        });
      }
    } catch (error) {
      console.warn('No se pudieron obtener las categorías dinámicas, usando fallback:', error);
    }
  }

  // --- Historial de pedidos ---
  saveOrder(user, order) {
    const historyMap = JSON.parse(localStorage.getItem(this.STORAGE_ORDERS) || '{}');
    const userKey = user.email; // Adaptado para usar el email de Supabase
    if (!historyMap[userKey]) historyMap[userKey] = [];
    historyMap[userKey].unshift(order);
    localStorage.setItem(this.STORAGE_ORDERS, JSON.stringify(historyMap));
  }

  loadOrderHistory(user) {
    if (!user) return [];
    const historyMap = JSON.parse(localStorage.getItem(this.STORAGE_ORDERS) || '{}');
    const userKey = user.email;
    return historyMap[userKey] || [];
  }

  // --- Sesión y carrito ---
  clearCart() {
    this.cart = {};
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async loadSession() {
    try {
      // Verificamos en Supabase si ya hay una sesión activa en el navegador
      const { data: { session } } = await window.supabase.auth.getSession();
      
      if (session) {
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.user_metadata?.nombre || session.user.email,
          username: session.user.email
        };
      } else {
        this.currentUser = null;
      }
    } catch (error) {
      console.error("Error cargando sesión de Supabase:", error);
      this.currentUser = null;
    }
  }

  async loginUser(identifier, password) {
    try {
      // Autenticación real con Supabase
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email: identifier, 
        password: password
      });

      if (error) {
        console.error('Error al iniciar sesión:', error.message);
        return null; 
      }

      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        nombre: data.user.user_metadata?.nombre || data.user.email,
        username: data.user.email
      };
      
      return this.currentUser;
    } catch (error) {
      console.error("Error en loginUser:", error);
      return null;
    }
  }

  async registerUser(userData) {
    try {
      // Registro real con Supabase
      const { data, error } = await window.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            nombre: userData.nombre // Guardamos el nombre como metadato
          }
        }
      });

      if (error) {
        console.error('Error al registrar usuario:', error.message);
        return null;
      }

      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        nombre: userData.nombre,
        username: data.user.email
      };

      return this.currentUser;
    } catch (error) {
      console.error("Error en registerUser:", error);
      return null;
    }
  }

  async logoutUser() {
    try {
      // Cerramos la sesión en el servidor de Supabase
      await window.supabase.auth.signOut();
      this.currentUser = null;
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  }

  // --- Datos de cuenta (Direcciones, Pagos, etc.) ---
  getAccountDataMap() {
    return JSON.parse(localStorage.getItem(this.STORAGE_ACCOUNTS) || '{}');
  }

  saveAccountDataMap(map) {
    localStorage.setItem(this.STORAGE_ACCOUNTS, JSON.stringify(map));
  }

  getAccountDataForCurrentUser() {
    if (!this.currentUser) return null;
    const map = this.getAccountDataMap();
    const userKey = this.currentUser.email; // Adaptado a Supabase
    
    if (!map[userKey]) {
      map[userKey] = {
        profile: { nombre: this.currentUser.nombre, username: this.currentUser.email, email: this.currentUser.email, phone: '', dni: '' },
        addresses: [{ alias: 'Casa', street: '', district: '', city: '', reference: '' }],
        payments: [{ alias: 'Tarjeta principal', type: 'Visa', number: '', holder: this.currentUser.nombre }],
        refunds: { bank: '', account: '', cci: '', holder: '' }
      };
      this.saveAccountDataMap(map);
    }
    return map[userKey];
  }

  saveCurrentUserAccountData(data) {
    if (!this.currentUser) return;
    const map = this.getAccountDataMap();
    const userKey = this.currentUser.email;
    map[userKey] = data;
    this.saveAccountDataMap(map);
  }

  async updateUserSessionFromProfile(profile) {
    if (!this.currentUser) return;
    
    try {
      // Actualizamos los datos reales en Supabase
      const { data, error } = await window.supabase.auth.updateUser({
        email: profile.email,
        data: { nombre: profile.nombre }
      });

      if (!error) {
        this.currentUser.nombre = profile.nombre;
        this.currentUser.email = profile.email;
      } else {
        console.error("Error actualizando perfil en Supabase:", error.message);
      }
    } catch (error) {
      console.error("Error en updateUserSessionFromProfile:", error);
    }
  }

  fmt(price) {
    return `S/ ${Number(price).toFixed(2)}`;
  }
}
