// ======================== GESTIÓN DE PÁGINAS ========================

let pages = [];
let currentPageId = null;
let pageEditor = null;

// Constante global del API
const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

// Cargar páginas cuando se abre la página
document.addEventListener('DOMContentLoaded', async () => {
  initializePageEditor();
  await loadPages();
});

// Inicializar editor Quill
function initializePageEditor() {
  const editorElement = document.getElementById('pageEditor');
  if (editorElement && !pageEditor) {
    pageEditor = new Quill('#pageEditor', {
      theme: 'snow',
      placeholder: 'Escribe tu contenido aquí...',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  }
}

// Cargar todas las páginas
async function loadPages() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    if (!token) {
      showStatus('No autenticado', 'error');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/pages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();
    pages = data.data || [];

    renderPages();
  } catch (error) {
    console.error('Error cargando páginas:', error);
    showStatus('Error al cargar páginas', 'error');
  }
}

// Renderizar tabla de páginas
function renderPages() {
  const container = document.getElementById('pagesContainer');

  if (pages.length === 0) {
    container.innerHTML = `
      <div class="no-pages">
        <p style="font-size: 18px; margin-bottom: 20px;">📭 No hay páginas creadas aún</p>
        <p style="color: #ccc; font-size: 14px;">Crea tu primera página haciendo clic en "Nueva Página"</p>
      </div>
    `;
    return;
  }

  const html = `
    <table class="pages-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Slug</th>
          <th>Estado</th>
          <th>Creada</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pages.map(page => `
          <tr>
            <td><div class="page-title">${escapeHTML(page.title)}</div></td>
            <td><div class="page-slug">/${escapeHTML(page.slug)}</div></td>
            <td style="font-size: 12px;">
              <span style="padding: 4px 8px; border-radius: 4px; ${page.is_published ? 'background: #e6f4ea; color: #1a7c3a;' : 'background: #fff3e0; color: #e65100;'}">
                ${page.is_published ? '✅ Publicado' : '📝 Borrador'}
              </span>
            </td>
            <td style="color: #999; font-size: 13px;">${new Date(page.created_at).toLocaleDateString('es-ES')}</td>
            <td>
              <div class="actions">
                <button class="btn-edit" onclick="openEditPageModal(${page.id})">✏️ Editar</button>
                <button class="btn-danger" onclick="deletePage(${page.id})">🗑️ Eliminar</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// Abrir modal para crear página
function openCreatePageModal() {
  currentPageId = null;
  document.getElementById('pageModalTitle').textContent = 'Nueva Página';
  document.getElementById('pageId').value = '';
  document.getElementById('pageTitle').value = '';
  document.getElementById('pageSlug').value = '';
  document.getElementById('pagePublished').checked = false;
  document.getElementById('pageIsPublished').value = 'false';

  if (pageEditor) {
    pageEditor.setContents([]);
  }

  document.getElementById('pageModal').classList.add('active');
}

// Abrir modal para editar página
async function openEditPageModal(pageId) {
  try {
    currentPageId = pageId;
    const page = pages.find(p => p.id === pageId);

    if (!page) {
      showStatus('Página no encontrada', 'error');
      return;
    }

    document.getElementById('pageModalTitle').textContent = '✏️ Editar Página';
    document.getElementById('pageId').value = page.id;
    document.getElementById('pageTitle').value = page.title;
    document.getElementById('pageSlug').value = page.slug;
    document.getElementById('pagePublished').checked = page.is_published;
    document.getElementById('pageIsPublished').value = page.is_published ? 'true' : 'false';

    if (pageEditor) {
      try {
        pageEditor.root.innerHTML = page.content || '';
      } catch (e) {
        console.warn('Error setting editor content:', e);
      }
    }

    document.getElementById('pageModal').classList.add('active');
  } catch (error) {
    console.error('Error abriendo modal:', error);
    showStatus('Error al cargar página', 'error');
  }
}

// Cerrar modal
function closePageModal() {
  document.getElementById('pageModal').classList.remove('active');
}

// Actualizar estado de publicación
function updatePageStatus() {
  const isPublished = document.getElementById('pagePublished').checked;
  document.getElementById('pageIsPublished').value = isPublished ? 'true' : 'false';
}

// Guardar página (crear o editar)
async function savePage(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem('puchia_admin_token');
    if (!token) {
      showStatus('No autenticado', 'error');
      return;
    }

    const title = document.getElementById('pageTitle').value.trim();
    const slug = document.getElementById('pageSlug').value.trim();
    const isPublished = document.getElementById('pagePublished').checked;
    const pageId = document.getElementById('pageId').value;

    let content = '';
    if (pageEditor) {
      content = pageEditor.root.innerHTML;
    }

    if (!title || !slug) {
      showStatus('Título y slug son requeridos', 'error');
      return;
    }

    // Validar slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      showStatus('El slug solo puede contener letras minúsculas, números y guiones', 'error');
      return;
    }

    // Verificar si el slug ya existe (para nuevas páginas)
    if (!pageId && pages.some(p => p.slug === slug)) {
      showStatus('Este slug ya existe', 'error');
      return;
    }

    const payload = {
      title,
      slug,
      content,
      is_published: isPublished
    };

    const method = pageId ? 'PUT' : 'POST';
    const url = pageId
      ? `${API_BASE_URL}/admin/pages/${pageId}`
      : `${API_BASE_URL}/admin/pages`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }

    showStatus(
      pageId
        ? '✅ Página actualizada correctamente'
        : '✅ Página creada correctamente',
      'success'
    );

    closePageModal();
    await loadPages();
  } catch (error) {
    console.error('Error guardando página:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Eliminar página
async function deletePage(pageId) {
  if (!confirm('¿Eliminar esta página? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const token = localStorage.getItem('puchia_admin_token');
    if (!token) {
      showStatus('No autenticado', 'error');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/pages/${pageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    showStatus('✅ Página eliminada correctamente', 'success');
    await loadPages();
  } catch (error) {
    console.error('Error eliminando página:', error);
    showStatus('Error al eliminar página', 'error');
  }
}

// Mostrar mensaje de estado
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('pagesStatus');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-bar ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// Escapar HTML para evitar XSS
function escapeHTML(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, c => map[c]);
}

// Cerrar modal al hacer clic afuera
document.addEventListener('click', (e) => {
  const modal = document.getElementById('pageModal');
  if (e.target === modal) {
    closePageModal();
  }
});
