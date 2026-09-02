/*
Archivo: main.js
Ruta: c:\xampp\htdocs\Empresa\Paginaweb_v1\main.js
Proyecto: Empresa / Paginaweb_v1
Nombre del proyecto: Minimarket Meilanys
Fecha: 2026-08-24
Autor: Yo, como responsable del desarrollo, creo y mantengo este archivo.
Propósito: inicializar el modelo, la vista y el controlador de la aplicación para arrancar la tienda.
Tecnologías: JavaScript ES modules, MVC ligero.
Dependencias: models/storeModel.js, views/storeView.js, controllers/storeController.js.
Estado: activo.
*/
import StoreModel from '../../../aplicacion/modelos/storeModel.js';
import StoreView from '../../../aplicacion/vistas/storeView.js';
import StoreController from '../../../aplicacion/controladores/storeController.js';

const model = new StoreModel();
const view = new StoreView();
const controller = new StoreController(model, view);

// Este evento se registra antes de las llamadas remotas para que el menu
// siga respondiendo aunque Supabase tarde en devolver los datos.
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const header = document.getElementById('header');
if (mobileMenuBtn && header) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = header.classList.toggle('mobile-menu-open');
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  });
}

controller.init();
