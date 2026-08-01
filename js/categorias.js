/* CATEGORIAS.JS - Lógica de Categorías */

let categories = [];

async function loadCategoriasFromAPI() {
  try {
    const response = await fetch('https://puchia-backend-production.up.railway.app/api/v1/categorias');
    const data = await response.json();

    categories = data.data.map(cat => ({
      id: cat.nombre.toLowerCase().replace(/ñ/g, 'n'),
      name: cat.nombre,
      icon: getIconoCategoria(cat.nombre),
      description: cat.descripcion || ''
    }));

    console.log('Categorías cargadas:', categories);
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

function getIconoCategoria(nombre) {
  const iconos = {
    'CUMPLEAÑOS': '🎉',
    'REGALOS': '🎁',
    'EMPRENDEDORES': '💼',
    'PROMOS': '🎊'
  };
  return iconos[nombre] || '📦';
}

let currentCategory = null;

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    const html = categories.map(category => `
        <div class="category-card" onclick="selectCategory('${category.id}')">
            <div class="category-card-icon">${category.icon}</div>
            <div class="category-card-name">${category.name}</div>
            <p style="color: #999; font-size: 14px; margin-top: 8px;">${category.description}</p>
        </div>
    `).join('');

    grid.innerHTML = html;
}

function selectCategory(categoryId) {
    currentCategory = categoryId;
    const category = categories.find(c => c.id === categoryId);

    if (!category) return;

    // Hide categories section and show products section
    const categoriesSection = document.getElementById('categoriesSection');
    const productsSection = document.getElementById('categoryProductsSection');

    if (categoriesSection) categoriesSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'block';

    // Update title
    const categoryTitle = document.getElementById('categoryTitle');
    const categorySubtitle = document.getElementById('categorySubtitle');
    if (categoryTitle) categoryTitle.textContent = category.name;
    if (categorySubtitle) categorySubtitle.textContent = category.description;

    // Load and render products for this category
    renderCategoryProducts(categoryId);
}

function renderCategoryProducts(categoryId) {
    const filtered = allProducts.filter(p => p.category === categoryId);
    const grid = document.getElementById('categoryProductsGrid');

    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin productos en esta categoría</p></div>';
        return;
    }

    const html = filtered.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper" style="cursor: pointer;">
                ${product.icon}
            </div>
            <div class="product-info">
                <div class="product-name-wrapper" style="cursor: pointer;">
                    ${product.name}
                </div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <div class="product-quantity">
                    <button class="qty-decrease">−</button>
                    <input type="number" class="qty-input" value="1" min="1">
                    <button class="qty-increase">+</button>
                </div>
                <button class="product-btn btn-add-to-cart">
                    Agregar al Carrito
                </button>
                <button class="product-btn-secondary btn-view-details" style="margin-top: 8px;">
                    Ver Detalle
                </button>
            </div>
        </div>
    `).join('');

    grid.innerHTML = html;

    // Agregar event listeners después de renderizar
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const product = filtered.find(p => p.id === productId);
            const qtyInput = card.querySelector('.qty-input');
            const decreaseBtn = card.querySelector('.qty-decrease');
            const increaseBtn = card.querySelector('.qty-increase');
            const addBtn = card.querySelector('.btn-add-to-cart');
            const detailBtn = card.querySelector('.btn-view-details');

            decreaseBtn?.addEventListener('click', () => {
                if (parseInt(qtyInput.value) > 1) {
                    qtyInput.value = parseInt(qtyInput.value) - 1;
                }
            });

            increaseBtn?.addEventListener('click', () => {
                qtyInput.value = parseInt(qtyInput.value) + 1;
            });

            addBtn?.addEventListener('click', () => {
                const qty = parseInt(qtyInput.value) || 1;
                for (let i = 0; i < qty; i++) {
                    addToCart(product);
                }
                qtyInput.value = 1;
                showToast(`${qty} x ${product.name} agregado al carrito`, 'success');
            });

            detailBtn?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        });
    }, 0);
}

function goBackToCategories() {
    currentCategory = null;
    const categoriesSection = document.getElementById('categoriesSection');
    const productsSection = document.getElementById('categoryProductsSection');

    if (categoriesSection) categoriesSection.style.display = 'block';
    if (productsSection) productsSection.style.display = 'none';
}

// Initialize on page load
window.addEventListener('load', async () => {
    // Load UI immediately with default products
    updateUIWithSettings();
    updateCartCount();
    renderCartSidebar();

    // Cargar categorías desde API
    await loadCategoriasFromAPI();
    renderCategories();

    // Fetch API data without blocking UI
    loadProductsFromAPI().then(() => {
        renderCategories();
    });
});

// Cargar categorías cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadCategoriasFromAPI);
