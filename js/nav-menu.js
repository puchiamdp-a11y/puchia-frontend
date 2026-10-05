/* NAV-MENU.JS - Botón de categoría destacada en el menú principal
   Agrega al menú (horizontal y móvil) un botón para la categoría marcada
   con "en_menu" en el admin. Si no hay ninguna marcada, no agrega nada. */
(function () {
  const CACHE_KEY = 'puchia_nav_categoria';

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Mismo criterio de slug que products-data.js (p.category)
  function slugCategoria(nombre) {
    return nombre.toLowerCase().replace(/ñ/g, 'n');
  }

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY));
    } catch (e) {
      return null;
    }
  }

  function writeCache(cat) {
    try {
      if (cat) localStorage.setItem(CACHE_KEY, JSON.stringify(cat));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) { /* storage no disponible: el menú funciona igual */ }
  }

  function renderMenuButton(cat) {
    document.querySelectorAll('.nav-menu-categoria').forEach(el => el.remove());
    if (!cat || !cat.nombre) return;

    const href = `proceso-compra.html?category=${encodeURIComponent(slugCategoria(cat.nombre))}`;
    const label = `${cat.emoji ? cat.emoji + ' ' : ''}${escapeHTML(cat.nombre)}`;

    document.querySelectorAll('header nav, .mobile-nav-sidebar').forEach(container => {
      const link = document.createElement('a');
      link.className = 'nav-menu-categoria';
      link.href = href;
      link.innerHTML = label;
      container.appendChild(link);
    });
  }

  async function init() {
    // Pintar al instante lo último conocido para evitar parpadeo
    renderMenuButton(readCache());

    try {
      const base = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';
      // Se comparte con categorias.js (window.__categoriasResp) para pedir /categorias una sola vez
      window.__categoriasResp = window.__categoriasResp || fetch(`${base}/categorias`, { cache: 'no-cache' }).then(r => r.json());
      const data = await window.__categoriasResp;
      if (!data.success || !Array.isArray(data.data)) return;

      const cat = data.data.find(c => c.en_menu === true) || null;
      const slim = cat ? { nombre: cat.nombre, emoji: cat.emoji } : null;
      writeCache(slim);
      renderMenuButton(slim);
    } catch (error) {
      console.error('Error cargando categoría del menú:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
