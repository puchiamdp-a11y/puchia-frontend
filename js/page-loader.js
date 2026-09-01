// ======================== PAGE LOADER - CARGAR PÁGINA DINÁMICA ========================

const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  await loadPage();
});

async function loadPage() {
  try {
    // Obtener slug de los parámetros de URL
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
      showError('Página no especificada');
      return;
    }

    // Cargar página del API
    const response = await fetch(`${API_BASE_URL}/pages/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        showError('La página no existe');
      } else {
        showError('Error al cargar la página');
      }
      return;
    }

    const data = await response.json();
    const page = data.data;

    if (!page) {
      showError('La página no está disponible');
      return;
    }

    // Mostrar título
    document.title = `${page.title} - Puchia`;
    document.getElementById('pageTitle').textContent = page.title;

    // Mostrar contenido
    const contentDiv = document.getElementById('pageContent');
    contentDiv.innerHTML = page.content;

    // Agregar páginas dinámicas al menú si no están
    updateNavigationMenuWithPages();

  } catch (error) {
    console.error('Error cargando página:', error);
    showError('Error al conectar con el servidor');
  }
}

function showError(message) {
  document.getElementById('pageTitle').textContent = 'Página no disponible';
  document.getElementById('pageContent').innerHTML = `
    <div class="page-error">
      <strong>❌ Error:</strong> ${escapeHTML(message)}
    </div>
  `;
}

function escapeHTML(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, c => map[c]);
}

async function updateNavigationMenuWithPages() {
  try {
    const response = await fetch(`${API_BASE_URL}/pages`);
    if (!response.ok) return;

    const data = await response.json();
    const paginas = data.data || [];

    // Agregar páginas al menú desktop si no están
    const navDesktop = document.querySelector('header nav');
    if (navDesktop) {
      paginas.forEach(pagina => {
        // No agregar si ya existe
        if (!Array.from(navDesktop.children).some(a => a.href.includes(pagina.slug))) {
          const link = document.createElement('a');
          link.href = `pagina.html?slug=${encodeURIComponent(pagina.slug)}`;
          link.textContent = pagina.title;
          navDesktop.appendChild(link);
        }
      });
    }

    // Agregar páginas al menú mobile si no están
    const navMobile = document.querySelector('.mobile-nav-sidebar');
    if (navMobile) {
      paginas.forEach(pagina => {
        if (!Array.from(navMobile.children).some(a => a.href.includes(pagina.slug))) {
          const link = document.createElement('a');
          link.href = `pagina.html?slug=${encodeURIComponent(pagina.slug)}`;
          link.textContent = pagina.title;
          navMobile.appendChild(link);
        }
      });
    }
  } catch (error) {
    console.warn('No se pudieron cargar las páginas en la navegación:', error);
  }
}
