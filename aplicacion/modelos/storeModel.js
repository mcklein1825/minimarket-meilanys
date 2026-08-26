/*
Archivo: models/storeModel.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\models\storeModel.js
...
*/

// 1. AGREGA LAS CONFIGURACIONES DE SUPABASE AQUÍ ARRIBA
const SUPABASE_URL = "https://bbfckczuqyzjgxltdisg.supabase.co/rest/v1/"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZmNrY3p1cXl6amd4bHRkaXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODE4MzYsImV4cCI6MjEwMzE1NzgzNn0.e7dESMTDKMpVZqZSXZEX6iS-VFbgQECyzIHNp6B9cuk";        // Reemplaza con tu anon key

export default class StoreModel {
  constructor() {
    this.sessionUser = null;
    
    // Dejamos un arreglo inicial por si falla la red o mientras carga
    this.categories = []; 
    
    // ... resto de tu constructor intacto ...
  }

  // 2. AGREGA ESTA NUEVA FUNCIÓN DENTRO DE TU CLASE
  async loadCategories() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/categorias?select=*&order=nombre.asc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) throw new Error("Error consultando categorías");

      const data = await response.json();

      // Mapeamos los datos que vienen de Supabase a la estructura que usa tu proyecto
      this.categories = data.map(cat => ({
        id: String(cat.id),
        nombre: cat.nombre,
        icono: '📦' // Ícono genérico para las categorías
      }));

      return this.categories;
    } catch (error) {
      console.error('Error al cargar categorías desde Supabase:', error);
      return this.categories;
    }
  }

  // ... tus demás funciones (fmt, getCatById, getFilteredProducts, etc.) siguen igual ...
}
