// ======================== CARGA DINÁMICA DE PÁGINAS EN MENÚ ========================

// Cargar páginas publicadas y agregarlas al menú
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndAddPagesToMenu();
});

async function loadAndAddPagesToMenu() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/pages`);
    if (!response.ok) throw new Error('Error cargando páginas');

    const data = await response.json();
    const paginas = data.data || [];

    if (paginas.length === 0) return;

    // Agregar páginas al menú desktop
    const navDesktop = document.querySelector('header nav');
    if (navDesktop) {
      paginas.forEach(pagina => {
        const link = document.createElement('a');
        link.href = `pagina.html?slug=${encodeURIComponent(pagina.slug)}`;
        link.textContent = pagina.title;
        navDesktop.appendChild(link);
      });
    }

    // Agregar páginas al menú mobile
    const navMobile = document.querySelector('.mobile-nav-sidebar');
    if (navMobile) {
      paginas.forEach(pagina => {
        const link = document.createElement('a');
        link.href = `pagina.html?slug=${encodeURIComponent(pagina.slug)}`;
        link.textContent = pagina.title;
        navMobile.appendChild(link);
      });
    }
  } catch (error) {
    console.warn('No se pudieron cargar las páginas dinámicas:', error);
    // Si falla, el sitio sigue funcionando sin las páginas dinámicas
  }
}
