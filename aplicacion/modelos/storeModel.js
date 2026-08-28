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
    this.STORAGE_ACCOUNTS = 'meilanys_accounts';
    this.STORAGE_ORDERS = 'meilanys_orders';
    this.currentUser = null;
  }

  // --- Verificación e inicialización de usuario desde localStorage o Supabase ---
  async ensureUsers() {
    try {
      await this.loadSession();
      return this.currentUser;
    } catch (error) {
      console.error("Error en ensureUsers:", error);
      return null;
    }
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
    const userKey = user.email || user.correo;
    if (!historyMap[userKey]) historyMap[userKey] = [];
    historyMap[userKey].unshift(order);
    localStorage.setItem(this.STORAGE_ORDERS, JSON.stringify(historyMap));
  }

  loadOrderHistory(user) {
    if (!user) return [];
    const historyMap = JSON.parse(localStorage.getItem(this.STORAGE_ORDERS) || '{}');
    const userKey = user.email || user.correo;
    return historyMap[userKey] || [];
  }

  // --- Sesión y Carrito (Usando tu tabla 'usuarios' y localStorage) ---
  clearCart() {
    this.cart = {};
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async loadSession() {
    try {
      const guardado = localStorage.getItem('meilanys_current_session');
      if (guardado) {
        this.currentUser = JSON.parse(guardado);
      } else {
        this.currentUser = null;
      }
    } catch (error) {
      console.error("Error cargando sesión:", error);
      this.currentUser = null;
    }
  }

  async loginUser(identifier, password) {
    try {
      // Consultamos directamente tu tabla 'usuarios' en Supabase
      const { data, error } = await window.supabase
        .from('usuarios')
        .select('*')
        .or(`correo.eq.${identifier},nombre.eq.${identifier}`)
        .eq('password', password)
        .maybeSingle();

      if (error || !data) {
        console.error('Credenciales incorrectas o error en la BD');
        return null;
      }

      this.currentUser = {
        id: data.id,
        email: data.correo,
        nombre: data.nombre,
        username: data.correo
      };

      // Guardamos la sesión actual en el navegador
      localStorage.setItem('meilanys_current_session', JSON.stringify(this.currentUser));
      return this.currentUser;
    } catch (error) {
      console.error("Error en loginUser:", error);
      return null;
    }
  }

  async registerUser(userData) {
    try {
      // Insertamos el nuevo usuario directamente en tu tabla 'usuarios'
      const { data, error } = await window.supabase
        .from('usuarios')
        .insert([
          { 
            nombre: userData.nombre, 
            correo: userData.email, 
            password: userData.password 
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error al registrar usuario en la tabla:', error.message);
        return null;
      }

      this.currentUser = {
        id: data.id,
        email: data.correo,
        nombre: data.nombre,
        username: data.correo
      };

      localStorage.setItem('meilanys_current_session', JSON.stringify(this.currentUser));
      return this.currentUser;
    } catch (error) {
      console.error("Error en registerUser:", error);
      return null;
    }
  }

  async logoutUser() {
    try {
      this.currentUser = null;
      localStorage.removeItem('meilanys_current_session');
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
    const userKey = this.currentUser.email || this.currentUser.username;
    
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
    const userKey = this.currentUser.email || this.currentUser.username;
    map[userKey] = data;
    this.saveAccountDataMap(map);
  }

  async updateUserSessionFromProfile(profile) {
    if (!this.currentUser) return;
    
    try {
      // Actualizamos el nombre/correo en tu tabla 'usuarios'
      const { error } = await window.supabase
        .from('usuarios')
        .update({ nombre: profile.nombre, correo: profile.email })
        .eq('id', this.currentUser.id);

      if (!error) {
        this.currentUser.nombre = profile.nombre;
        this.currentUser.email = profile.email;
        localStorage.setItem('meilanys_current_session', JSON.stringify(this.currentUser));
      } else {
        console.error("Error actualizando perfil en la BD:", error.message);
      }
    } catch (error) {
      console.error("Error en updateUserSessionFromProfile:", error);
    }
  }

  fmt(price) {
    return `S/ ${Number(price).toFixed(2)}`;
  }
}
