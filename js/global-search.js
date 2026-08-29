// Global search functionality for products and categories
let searchDebounceTimer;
let currentSearchIndex = -1;
let currentSearchResults = [];

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('globalSearch');
    const searchDropdown = document.getElementById('searchDropdown');

    if (!searchInput || !searchDropdown) return;

    // Handle input changes with debouncing
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchDebounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            searchDropdown.innerHTML = '';
            searchDropdown.classList.remove('active');
            return;
        }

        searchDebounceTimer = setTimeout(() => {
            performSearch(query, searchDropdown);
        }, 300);
    });

    // Handle arrow keys for navigation
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSearchIndex = Math.min(currentSearchIndex + 1, currentSearchResults.length - 1);
            highlightSearchResult();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSearchIndex = Math.max(currentSearchIndex - 1, -1);
            highlightSearchResult();
        } else if (e.key === 'Enter' && currentSearchIndex >= 0) {
            e.preventDefault();
            const result = currentSearchResults[currentSearchIndex];
            navigateToResult(result);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            searchDropdown.classList.remove('active');
            currentSearchIndex = -1;
        }
    });

    // Focus event to show results again
    searchInput.addEventListener('focus', function() {
        if (searchDropdown.innerHTML && searchInput.value.length >= 2) {
            searchDropdown.classList.add('active');
        }
    });
});

async function performSearch(query, dropdownElement) {
    try {
        // Fetch both products and categories in parallel
        const [productsResponse, categoriesResponse] = await Promise.all([
            fetch(`/api/v1/productos?search=${encodeURIComponent(query)}&limite=5`),
            fetch(`/api/v1/categorias?search=${encodeURIComponent(query)}&limite=5`)
        ]);

        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        currentSearchResults = [];
        let html = '';

        // Add product results first
        if (productsData.data && productsData.data.length > 0) {
            html += '<div class="search-section"><div class="search-section-title">Productos</div>';
            productsData.data.forEach(product => {
                currentSearchResults.push({
                    type: 'product',
                    id: product.id,
                    name: product.nombre || product.name,
                    thumbnail: product.imagen_url || product.thumbnail,
                    categoryId: product.categoria_id || product.category_id
                });
                const thumbnail = product.imagen_url || product.thumbnail;
                html += `
                    <div class="search-result-item" data-type="product" data-id="${product.id}">
                        ${thumbnail ? `<img src="${thumbnail}" alt="${escapeHtml(product.nombre || product.name)}" class="search-result-thumbnail">` : ''}
                        <div class="search-result-text">
                            <div class="search-result-name">${escapeHtml(product.nombre || product.name)}</div>
                            <div class="search-result-type">Producto</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Add category results after products
        if (categoriesData.data && categoriesData.data.length > 0) {
            html += '<div class="search-section"><div class="search-section-title">Categorías</div>';
            categoriesData.data.forEach(category => {
                currentSearchResults.push({
                    type: 'category',
                    id: category.id,
                    name: category.nombre || category.name,
                    thumbnail: category.imagen_url || category.thumbnail
                });
                const thumbnail = category.imagen_url || category.thumbnail;
                html += `
                    <div class="search-result-item" data-type="category" data-id="${category.id}">
                        ${thumbnail ? `<img src="${thumbnail}" alt="${escapeHtml(category.nombre || category.name)}" class="search-result-thumbnail">` : ''}
                        <div class="search-result-text">
                            <div class="search-result-name">${escapeHtml(category.nombre || category.name)}</div>
                            <div class="search-result-type">Categoría</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (html === '') {
            html = '<div class="search-no-results">No se encontraron resultados</div>';
            currentSearchResults = [];
        }

        dropdownElement.innerHTML = html;
        dropdownElement.classList.add('active');
        currentSearchIndex = -1;

        // Add click handlers to results
        document.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', function() {
                const resultIndex = Array.from(document.querySelectorAll('.search-result-item')).indexOf(this);
                if (resultIndex >= 0) {
                    navigateToResult(currentSearchResults[resultIndex]);
                }
            });

            item.addEventListener('mouseenter', function() {
                currentSearchIndex = Array.from(document.querySelectorAll('.search-result-item')).indexOf(this);
                highlightSearchResult();
            });
        });
    } catch (error) {
        console.error('Error performing search:', error);
        dropdownElement.innerHTML = '<div class="search-no-results">Error en la búsqueda</div>';
        dropdownElement.classList.add('active');
    }
}

function highlightSearchResult() {
    document.querySelectorAll('.search-result-item').forEach((item, index) => {
        if (index === currentSearchIndex) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}

function navigateToResult(result) {
    const searchInput = document.getElementById('globalSearch');
    const searchDropdown = document.getElementById('searchDropdown');

    if (result.type === 'category') {
        // Navigate to categorias.html with category filter
        window.location.href = `categorias.html?id=${result.id}`;
    } else if (result.type === 'product') {
        // Navigate to proceso-compra.html with product filter
        window.location.href = `proceso-compra.html?product=${result.id}`;
    }

    searchInput.value = '';
    searchDropdown.innerHTML = '';
    searchDropdown.classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
