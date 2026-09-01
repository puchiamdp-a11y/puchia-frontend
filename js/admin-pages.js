// ======================== GESTIÓN DE PÁGINAS ========================

let pages = [];
let currentPageId = null;
let pageEditor = null;
let editorInitialized = false;

// Cargar páginas cuando se abre la página
document.addEventListener('DOMContentLoaded', async () => {
  await loadPages();
});

// Inicializar editor Quill con todas las herramientas
function initializePageEditor() {
  const editorElement = document.getElementById('pageEditor');
  const toolbarElement = document.getElementById('pageEditorToolbar');

  if (editorElement && !pageEditor) {
    pageEditor = new Quill('#pageEditor', {
      theme: 'snow',
      placeholder: '✍️ Comienza a escribir tu contenido aquí...\n\nUsa la barra de herramientas para:\n- Dar formato al texto\n- Insertar enlaces\n- Agregar imágenes\n- Crear listas\n- Y mucho más...',
      modules: {
        toolbar: {
          container: [
            // Formato de texto
            ['bold', 'italic', 'underline', 'strike'],

            // Títulos y bloques
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],

            // Colores
            [{ 'color': [] }, { 'background': [] }],

            // Listas
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],

            // Alineación
            [{ 'align': [] }],

            // Elementos
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],

            // Especiales
            [{ 'script': 'sub'}, { 'script': 'super' }],

            // Limpiar formato
            ['clean']
          ],
          handlers: {
            'image': imageHandler
          }
        },
        clipboard: {
          matchVisual: false
        }
      }
    });

    // Mejorar estilos del editor
    const qlEditor = document.querySelector('.ql-editor');
    if (qlEditor) {
      qlEditor.style.minHeight = '400px';
      qlEditor.style.padding = '15px';
      qlEditor.style.fontSize = '16px';
      qlEditor.style.lineHeight = '1.6';
      qlEditor.style.fontFamily = 'inherit';
    }

    // Mejorar estilos de la barra de herramientas
    const qlToolbar = document.querySelector('.ql-toolbar');
    if (qlToolbar) {
      qlToolbar.style.borderRadius = '0';
      qlToolbar.style.borderTop = 'none';
      qlToolbar.style.padding = '8px';
      qlToolbar.style.backgroundColor = '#f8f8f8';
    }

    editorInitialized = true;
  }
}

// Handler personalizado para imágenes
function imageHandler() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = () => {
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = e.target.result;
        const index = pageEditor.getSelection().index;
        pageEditor.insertEmbed(index, 'image', image, 'user');
        pageEditor.setSelection(index + 1);
      };
      reader.readAsDataURL(file);
    }
  };
}

// Cargar todas las páginas
async function loadPages() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    if (!token) {
      showStatus('No autenticado', 'error');
      return;
    }

    const response = await fetch(`${window.API_BASE_URL}/admin/pages`, {
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
          <th style="width: 40px;"></th>
          <th>Título</th>
          <th>Slug</th>
          <th>Estado</th>
          <th style="width: 100px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pages.map((page, index) => `
          <tr class="page-row" draggable="true" data-page-id="${page.id}" data-page-index="${index}">
            <td style="cursor: move; text-align: center; color: #999;">≡</td>
            <td><div class="page-title">${escapeHTML(page.title)}</div></td>
            <td><div class="page-slug">/${escapeHTML(page.slug)}</div></td>
            <td style="font-size: 12px;">
              <span style="padding: 4px 8px; border-radius: 4px; ${page.is_published ? 'background: #e6f4ea; color: #1a7c3a;' : 'background: #fff3e0; color: #e65100;'}">
                ${page.is_published ? '✅ Publicado' : '📝 Borrador'}
              </span>
            </td>
            <td>
              <div class="page-actions">
                <button class="icon-btn edit-btn" onclick="openEditPageModal(${page.id})" title="Editar">✏️</button>
                <button class="icon-btn delete-btn" onclick="deletePage(${page.id})" title="Eliminar">🗑️</button>
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

  // Initialize Quill if not already initialized
  if (!editorInitialized) {
    initializePageEditor();
  }

  if (pageEditor) {
    pageEditor.setContents([]);
  }

  document.getElementById('pageModal').classList.add('show');
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

    // Initialize Quill if not already initialized
    if (!editorInitialized) {
      initializePageEditor();
    }

    if (pageEditor) {
      try {
        pageEditor.root.innerHTML = page.content || '';
      } catch (e) {
        console.warn('Error setting editor content:', e);
      }
    }

    document.getElementById('pageModal').classList.add('show');
  } catch (error) {
    console.error('Error abriendo modal:', error);
    showStatus('Error al cargar página', 'error');
  }
}

// Cerrar modal
function closePageModal() {
  document.getElementById('pageModal').classList.remove('show');
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
    let slug = document.getElementById('pageSlug').value.trim();
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

    // Convertir slug a formato seguro para URLs
    slug = slug.toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // espacios → guiones
      .replace(/[áàäâ]/g, 'a')        // acentos
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9-]/g, '')     // eliminar caracteres especiales
      .replace(/-+/g, '-')            // múltiples guiones → un guión
      .replace(/^-|-$/g, '');         // eliminar guiones al inicio/final

    if (!slug) {
      showStatus('El slug no puede estar vacío después de procesarlo', 'error');
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
      ? `${window.API_BASE_URL}/admin/pages/${pageId}`
      : `${window.API_BASE_URL}/admin/pages`;

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

    const response = await fetch(`${window.API_BASE_URL}/admin/pages/${pageId}`, {
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

// ======================== DRAG AND DROP PARA REORDENAR ========================
let draggedRow = null;

document.addEventListener('dragstart', (e) => {
  if (e.target.closest('.page-row')) {
    draggedRow = e.target.closest('.page-row');
    draggedRow.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  }
});

document.addEventListener('dragend', (e) => {
  if (draggedRow) {
    draggedRow.style.opacity = '1';
    draggedRow = null;
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  const dropTarget = e.target.closest('.page-row');
  if (dropTarget && draggedRow && draggedRow !== dropTarget) {
    const rect = dropTarget.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      dropTarget.parentNode.insertBefore(draggedRow, dropTarget);
    } else {
      dropTarget.parentNode.insertBefore(draggedRow, dropTarget.nextSibling);
    }
  }
});

// ======================== CSS PARA ESTILOS DE PÁGINAS ========================
const style = document.createElement('style');
style.textContent = `
  .page-title {
    font-size: 15px;
    font-weight: 500;
    color: #333;
  }

  .page-slug {
    font-size: 13px;
    color: #666;
    font-family: monospace;
  }

  .page-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: #f0f0f0;
  }

  .edit-btn:hover {
    background: #e3f2fd;
  }

  .delete-btn:hover {
    background: #ffebee;
  }

  .page-row {
    transition: background-color 0.2s ease;
  }

  .page-row:hover {
    background-color: #f9f9f9;
  }

  .page-row[draggable="true"] {
    cursor: move;
  }

  .page-row.drag-over {
    background-color: #e3f2fd;
    border-top: 2px solid #2196F3;
  }
`;
document.head.appendChild(style);
