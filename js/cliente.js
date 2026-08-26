/* CLIENTE.JS - PRODUCTOS Y PROMOS */

// Variables globales - ahora usando los datos compartidos de products-data.js
let currentFilter = 'todas';
let currentView = 'productos';

function updateUIWithSettings() {
    const settings = getSettings();
    const logo = document.getElementById('headerLogo');
    const logoText = document.getElementById('headerLogoText');
    const footerLogo = document.getElementById('footerLogo');
    const footerBrandText = document.getElementById('footerBrandText');
    const announcementBar = document.getElementById('announcementBar');

    if (logo) logo.textContent = settings.logo;
    if (logoText) logoText.textContent = settings.logoText;
    if (footerLogo) footerLogo.textContent = settings.logo;
    if (footerBrandText) footerBrandText.textContent = settings.logoText;
    if (announcementBar) announcementBar.textContent = settings.announceText;
}

function loadInterface() {
    updateUIWithSettings();

    // Check URL parameters for category/promos view
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const view = urlParams.get('view');

    if (view === 'promos' || category === 'promos') {
        showPromos();
    } else {
        if (category) {
            currentFilter = category;
        }
        showProducts();
    }
}

function showProducts() {
    const productsSection = document.getElementById('productsSection');
    const promosSection = document.getElementById('promosSection');
    const filtersBar = document.querySelector('.filters-bar');

    if (productsSection) productsSection.style.display = 'block';
    if (promosSection) promosSection.style.display = 'none';
    if (filtersBar) filtersBar.style.display = 'none';

    loadAndRenderProducts();
}

function showAllProducts() {
    currentFilter = 'todas';
    showProducts();
}

function showPromos() {
    const productsSection = document.getElementById('productsSection');
    const promosSection = document.getElementById('promosSection');
    const filtersBar = document.querySelector('.filters-bar');

    if (productsSection) productsSection.style.display = 'none';
    if (promosSection) promosSection.style.display = 'block';
    if (filtersBar) filtersBar.style.display = 'none';

    loadAndRenderPromos();
}

function showOnlyPromos() {
    showPromos();
}

function loadAndRenderProducts() {
    // Filtrar productos por categoría
    const filtered = currentFilter === 'todas'
        ? allProducts
        : allProducts.filter(p => p.category === currentFilter);

    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin productos en esta categoría</p></div>';
        return;
    }

    const BACKEND = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
    const html = filtered.map(product => {
        const imgContent = product.portada
            ? `<img src="${BACKEND}${product.portada}" alt="${product.name}" class="product-image-responsive" loading="lazy" onerror="this.outerHTML='<div class=product-icon-responsive>${product.icon}</div>'">`
            : `<div class="product-icon-responsive">${product.icon}</div>`;

        // Determine summary text
        const summaryText = product.resumen || (product.descripcion_completa ? product.descripcion_completa.substring(0, 100) : '');

        return `<div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                ${imgContent}
            </div>
            <div class="product-info" style="padding: 20px;">
                <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                    ${product.name}
                </div>
                <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                    ${formatCurrency(product.price)}
                </div>
                <div style="margin-bottom: 12px; font-size: 12px; color: #666;">
                    Stock: <strong>${product.stock_cantidad || 0} disponible${product.stock_cantidad === 1 ? '' : 's'}</strong>
                </div>
                <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: ${product.stock_cantidad > 0 ? 'var(--purple)' : '#ccc'}; color: white; border: none; border-radius: 8px; cursor: ${product.stock_cantidad > 0 ? 'pointer' : 'not-allowed'}; font-weight: 600; transition: all 0.3s ease;" ${product.stock_cantidad > 0 ? '' : 'disabled'}>
                    ${product.stock_cantidad > 0 ? 'Agregar al Carrito' : 'Agotado'}
                </button>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const product = filtered.find(p => p.id === productId);
            const addBtn = card.querySelector('.btn-add-to-cart');

            addBtn?.addEventListener('click', () => {
                addToCart(product);
                showToast(`${product.name} agregado al carrito`, 'success');
            });

            card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        });
    }, 0);
}

function loadAndRenderPromos() {
    const grid = document.getElementById('promosGrid');
    if (!grid) return;

    if (promoProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin promociones disponibles</p></div>';
        return;
    }

    const BACKEND_PROMO = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
    const html = promoProducts.map(product => {
        const imgContent = product.portada
            ? `<img src="${BACKEND_PROMO}${product.portada}" alt="${product.name}" style="width:100%;height:180px;object-fit:cover;" loading="lazy" onerror="this.outerHTML='<div style=font-size:80px;display:flex;align-items:center;justify-content:center;height:180px>${product.icon}</div>'">`
            : `<div style="font-size: 80px; text-align: center; padding: 40px 20px; display: flex; align-items: center; justify-content: center; height: 180px;">${product.icon}</div>`;

        // Determine summary text
        const summaryText = product.resumen || (product.descripcion_completa ? product.descripcion_completa.substring(0, 100) : '');

        return `<div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                ${imgContent}
            </div>
            <div class="product-info" style="padding: 20px;">
                <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                    ${product.name}
                </div>
                <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                    ${formatCurrency(product.price)}
                </div>
                <div style="margin-bottom: 12px; font-size: 12px; color: #666;">
                    Stock: <strong>${product.stock_cantidad || 0} disponible${product.stock_cantidad === 1 ? '' : 's'}</strong>
                </div>
                <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: ${product.stock_cantidad > 0 ? 'var(--purple)' : '#ccc'}; color: white; border: none; border-radius: 8px; cursor: ${product.stock_cantidad > 0 ? 'pointer' : 'not-allowed'}; font-weight: 600; transition: all 0.3s ease;" ${product.stock_cantidad > 0 ? '' : 'disabled'}>
                    ${product.stock_cantidad > 0 ? 'Agregar al Carrito' : 'Agotado'}
                </button>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const product = promoProducts.find(p => p.id === productId);
            const addBtn = card.querySelector('.btn-add-to-cart');

            addBtn?.addEventListener('click', () => {
                addToCart(product);
                showToast(`${product.name} agregado al carrito`, 'success');
            });

            card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        });
    }, 0);
}

// ==================== CHUNKED RENDERING (PERFORMANCE OPTIMIZATION) ====================
// Renders products in batches of 15 to avoid layout thrashing

function renderProductsChunked(products, gridId = 'productsGrid') {
    const grid = document.getElementById(gridId);
    if (!grid || products.length === 0) {
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin productos en esta categoría</p></div>';
        return;
    }

    const BACKEND = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
    const chunkSize = 15;
    let currentChunk = 0;
    const totalChunks = Math.ceil(products.length / chunkSize);

    grid.innerHTML = ''; // Clear grid

    function renderNextChunk() {
        if (currentChunk >= totalChunks) {
            console.log(`✅ Renderización completada: ${products.length} productos en ${totalChunks} chunks`);
            attachProductListeners(grid, products);
            return;
        }

        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, products.length);
        const chunk = products.slice(start, end);

        let html = '';
        chunk.forEach(product => {
            const imgContent = product.portada
                ? `<img src="${BACKEND}${product.portada}" alt="${product.name}" class="product-image-responsive" loading="lazy" onerror="this.outerHTML='<div class=product-icon-responsive>${product.icon}</div>'">`
                : `<div class="product-icon-responsive">${product.icon}</div>`;

            html += `<div class="product-card" data-product-id="${product.id}">
                <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                    ${imgContent}
                </div>
                <div class="product-info" style="padding: 20px;">
                    <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                        ${product.name}
                    </div>
                    <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                        ${formatCurrency(product.price)}
                    </div>
                    <div style="margin-bottom: 12px; font-size: 12px; color: #666;">
                        Stock: <strong>${product.stock_cantidad || 0} disponible${product.stock_cantidad === 1 ? '' : 's'}</strong>
                    </div>
                    <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: ${product.stock_cantidad > 0 ? 'var(--purple)' : '#ccc'}; color: white; border: none; border-radius: 8px; cursor: ${product.stock_cantidad > 0 ? 'pointer' : 'not-allowed'}; font-weight: 600; transition: all 0.3s ease;" ${product.stock_cantidad > 0 ? '' : 'disabled'}>
                        ${product.stock_cantidad > 0 ? 'Agregar al Carrito' : 'Agotado'}
                    </button>
                </div>
            </div>`;
        });

        // Insert chunk into DOM
        grid.insertAdjacentHTML('beforeend', html);

        // Schedule next chunk render
        currentChunk++;
        requestAnimationFrame(renderNextChunk);
    }

    // Start chunked rendering
    renderNextChunk();
}

function renderPromosChunked(promos) {
    const grid = document.getElementById('promosGrid');
    if (!grid || promos.length === 0) {
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin promociones disponibles</p></div>';
        return;
    }

    const BACKEND_PROMO = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
    const chunkSize = 15;
    let currentChunk = 0;
    const totalChunks = Math.ceil(promos.length / chunkSize);

    grid.innerHTML = ''; // Clear grid

    function renderNextChunk() {
        if (currentChunk >= totalChunks) {
            console.log(`✅ Promos renderizadas: ${promos.length} en ${totalChunks} chunks`);
            attachProductListeners(grid, promos);
            return;
        }

        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, promos.length);
        const chunk = promos.slice(start, end);

        let html = '';
        chunk.forEach(product => {
            const imgContent = product.portada
                ? `<img src="${BACKEND_PROMO}${product.portada}" alt="${product.name}" style="width:100%;height:180px;object-fit:cover;" loading="lazy" onerror="this.outerHTML='<div style=font-size:80px;display:flex;align-items:center;justify-content:center;height:180px>${product.icon}</div>'">`
                : `<div style="font-size: 80px; text-align: center; padding: 40px 20px; display: flex; align-items: center; justify-content: center; height: 180px;">${product.icon}</div>`;

            html += `<div class="product-card" data-product-id="${product.id}">
                <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                    ${imgContent}
                </div>
                <div class="product-info" style="padding: 20px;">
                    <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                        ${product.name}
                    </div>
                    <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                        ${formatCurrency(product.price)}
                    </div>
                    <div style="margin-bottom: 12px; font-size: 12px; color: #666;">
                        Stock: <strong>${product.stock_cantidad || 0} disponible${product.stock_cantidad === 1 ? '' : 's'}</strong>
                    </div>
                    <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: ${product.stock_cantidad > 0 ? 'var(--purple)' : '#ccc'}; color: white; border: none; border-radius: 8px; cursor: ${product.stock_cantidad > 0 ? 'pointer' : 'not-allowed'}; font-weight: 600; transition: all 0.3s ease;" ${product.stock_cantidad > 0 ? '' : 'disabled'}>
                        ${product.stock_cantidad > 0 ? 'Agregar al Carrito' : 'Agotado'}
                    </button>
                </div>
            </div>`;
        });

        // Insert chunk into DOM
        grid.insertAdjacentHTML('beforeend', html);

        // Schedule next chunk render
        currentChunk++;
        requestAnimationFrame(renderNextChunk);
    }

    // Start chunked rendering
    renderNextChunk();
}

// Helper function to attach event listeners (shared for both products and promos)
function attachProductListeners(grid, products) {
    grid.querySelectorAll('[data-product-id]').forEach(card => {
        const productId = parseInt(card.dataset.productId);
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const addBtn = card.querySelector('.btn-add-to-cart');
        addBtn?.addEventListener('click', () => {
            addToCart(product);
            showToast(`${product.name} agregado al carrito`, 'success');
        });

        card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
    });
}

function filterProducts(category) {
    currentFilter = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // ✅ Use chunked rendering for filtered results
    const filtered = currentFilter === 'todas'
        ? allProducts
        : allProducts.filter(p => p.category === currentFilter);
    renderProductsChunked(filtered);
}

function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
}

async function submitOrder(e) {
    console.log('submitOrder() INICIADO - Timestamp:', new Date().toISOString());
    console.log('Stack trace:', new Error().stack);
    e.preventDefault();
    
    // Deshabilitar botón para evitar clicks duplicados
    const confirmBtn = document.getElementById("confirmOrderBtn");
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Procesando...";
        confirmBtn.style.opacity = "0.6";
    }
    const name     = document.getElementById('checkoutName').value;
    const email    = document.getElementById('checkoutEmail').value;
    const phone    = document.getElementById('checkoutPhone').value;
    const dni      = document.getElementById('checkoutDNI').value;
    const province = document.getElementById('checkoutProvince').value;
    const address  = document.getElementById('checkoutAddress').value;
    const notes    = document.getElementById('checkoutNotes').value;

    // 🔍 VALIDACIONES EN CLIENTE
    console.log('🔍 Validando formulario...');
    if (!name || !email || !phone || !dni || !province || !address) {
        console.log('❌ Campos vacíos detectados');
        showToast('❌ Completa todos los campos obligatorios', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Orden";
            confirmBtn.style.opacity = "1";
        }
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Email inválido:', email);
        showToast('❌ Email inválido', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Orden";
            confirmBtn.style.opacity = "1";
        }
        return;
    }

    // Validar teléfono (mínimo 10 dígitos)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
        console.log('❌ Teléfono inválido:', phone);
        showToast('❌ Teléfono debe tener al menos 10 dígitos', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Orden";
            confirmBtn.style.opacity = "1";
        }
        return;
    }

    // Validar carrito
    const cart = getCart();
    if (!cart || cart.length === 0) {
        console.log('❌ Carrito vacío');
        showToast('❌ Agrega productos al carrito', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Orden";
            confirmBtn.style.opacity = "1";
        }
        return;
    }

    console.log('✅ Validaciones pasadas');

    const orderId = generateId('ORD');
    const total   = getCartTotal();
    const today   = new Date().toISOString().split('T')[0];

    // Guardar orden localmente
    const order = {
        id: orderId,
        client: name,
        email: email,
        phone: phone,
        dni: dni,
        province: province,
        address: address,
        notes: notes,
        total: total,
        status: 'Pendiente',
        date: today,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price
        }))
    };

    let orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    // 📤 ENVIAR AL BACKEND - STOCK PUCHIA V2.0 - Endpoint Transaccional
    console.log('📤 Enviando orden al backend (Stock Puchia v2.0)...');
    try {
        console.log('📍 Validando carrito:', cart);
        if (cart.length === 0) {
            throw new Error('El carrito está vacío');
        }

        // Preparar payload para endpoint transaccional
        const backendPayload = {
            cliente_nombre:   name,
            cliente_email:    email,
            cliente_whatsapp: phone,
            notas: notes,
            items: cart.map(item => ({
                producto_id:   item.id,
                cantidad:      item.qty
            }))
        };

        console.log('📍 Payload a enviar:', JSON.stringify(backendPayload, null, 2));

        const token = typeof getClienteToken === 'function' ? getClienteToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 🔍 DETECTAR TIPO DE PRODUCTO PARA USAR ENDPOINT CORRECTO
        let endpoint = `${API_BASE_URL}/ordenes/transaccion/simple`;
        const tieneInsumo = cart.some(item => item.stock_type === 'insumo');

        if (tieneInsumo) {
          console.log('📍 Producto tipo INSUMO detectado - usando endpoint con-insumo');
          endpoint = `${API_BASE_URL}/ordenes/transaccion/con-insumo`;
        } else {
          console.log('📍 Productos tipo SIMPLE - usando endpoint simple');
        }

        // 🚀 POST al endpoint transaccional
        console.log('🚀 POST a ' + endpoint.split('/api/v1')[1] + '...');
        console.log('🔗 URL completa:', endpoint);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(backendPayload)
        });

        console.log('✅ Respuesta del servidor - Status:', res.status);
        const data = await res.json();
        console.log('📦 Datos recibidos:', JSON.stringify(data, null, 2));

        if (res.status === 201 || res.ok) {
            console.log('✅✅ ORDEN CREADA EN BACKEND');
            if (data?.data?.id_unico) {
                console.log('📋 Número de orden:', data.data.id_unico);
                console.log('💰 Total:', data.data.total);
                localStorage.setItem('lastBackendOrderId', data.data.id_unico);
                localStorage.setItem('lastBackendOrderTotal', data.data.total);
                localStorage.setItem('lastBackendOrderState', data.data.estado);
            }
            showToast('✅ Orden enviada a backend correctamente', 'success');
        } else {
            console.warn('⚠️ Respuesta no exitosa:', data);
            showToast(`⚠️ ${data?.error || 'Error al procesar la orden'}`, 'error');
        }
    } catch (err) {
        console.error('❌ ERROR al enviar al backend:', err.message);
        console.error('❌ Stack:', err.stack);
        showToast(`❌ Error: ${err.message}`, 'error');
    }

    closeCheckout();
    clearCart();
    renderCartSidebar();

    localStorage.setItem('lastOrderId', orderId);

    setTimeout(() => {
        window.location.href = 'orden-confirmada.html';
    }, 300);

    showToast('¡Orden confirmada!', 'success');
}

function goToHome() {
    window.location.href = 'index.html';
}

window.addEventListener('load', async () => {
    // Load defaults immediately, then fetch API in background
    loadInterface();
    renderCategoryFilters();
    updateCartCount();
    renderCartSidebar();

    // Si venimos de "Ir a Checkout" desde otra página, abrir el modal
    if (localStorage.getItem('openCheckout') === 'true') {
        localStorage.removeItem('openCheckout');
        setTimeout(() => {
            if (typeof goToCheckout === 'function') goToCheckout();
        }, 150);
    }

    // Fetch API data without blocking UI
    loadProductsFromAPI().then(() => {
        // ✅ Use chunked rendering instead of monolithic
        renderProductsChunked(allProducts);
        renderPromosChunked(promoProducts);
        startProductPolling();
    });
});

// ==================== POLLING AUTOMÁTICO ====================
// Cada 30s consulta la API. Si los productos cambiaron, re-renderiza.

let _lastProductsSnapshot = '';
let _pollingInterval = null;

function snapshotProducts() {
    const all = (allProducts || []).map(p => `${p.id}|${p.name}|${p.price}|${p.stock}|${p.habilitado}|${p.category}|${p.portada || ''}`).join(';');
    const promo = (promoProducts || []).map(p => `${p.id}|${p.name}|${p.price}|${p.stock}|${p.habilitado}|${p.portada || ''}`).join(';');
    return all + '###' + promo;
}

function startProductPolling() {
    _lastProductsSnapshot = snapshotProducts();
    if (_pollingInterval) clearInterval(_pollingInterval);
    _pollingInterval = setInterval(async () => {
        if (document.hidden) return;
        try {
            await loadProductsFromAPI();
            const newSnapshot = snapshotProducts();
            if (newSnapshot !== _lastProductsSnapshot) {
                _lastProductsSnapshot = newSnapshot;
                if (typeof loadAndRenderProducts === 'function') loadAndRenderProducts();
                if (typeof loadAndRenderPromos === 'function') loadAndRenderPromos();
                if (typeof showToast === 'function') {
                    showToast('Catálogo actualizado', 'info');
                }
                console.log('[Polling] Productos actualizados desde BD');
            }
        } catch (err) {
            console.warn('[Polling] error:', err.message);
        }
    }, 60000);
}

/* ==================== MODAL DETALLE PRODUCTO ==================== */

async function openProductDetail(productId) {
  try {
    const product = allProducts.find(p => p.id === productId) || promoProducts.find(p => p.id === productId);

    if (!product) {
      showToast('Producto no encontrado', 'error');
      return;
    }

    const oldModal = document.getElementById('productDetailModal');
    if (oldModal) oldModal.remove();

    const BK = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
    const mediaList = product.media || [];
    window._currentDetailMedia = mediaList;
    const portadaItem = mediaList.find(m => m.es_portada) || mediaList[0] || null;

    // Display principal: foto/video o emoji
    let displayHTML;
    if (portadaItem) {
      const mainMedia = portadaItem.tipo === 'video'
        ? `<video id="detailMainMedia" src="${BK}${portadaItem.url}" controls class="detail-media-responsive video-element"></video>`
        : `<img id="detailMainMedia" src="${BK}${portadaItem.url}" alt="${product.name}" class="detail-media-responsive" loading="lazy" onerror="this.outerHTML='<div class=product-icon-responsive>${product.icon}</div>'">`;

      const thumbsHTML = mediaList.length > 1
        ? `<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;scrollbar-width:thin;">
            ${mediaList.map((m, idx) => {
              const isFirst = idx === 0;
              const thumbContent = m.tipo === 'video'
                ? `<div style="width:100%;height:100%;background:#333;display:flex;align-items:center;justify-content:center;font-size:14px;color:white;">▶</div>`
                : `<img src="${BK}${m.url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`;
              return `<div class="detail-thumb detail-thumb-responsive ${isFirst ? 'active' : ''}" onclick="changeDetailMedia(${idx})">${thumbContent}</div>`;
            }).join('')}
           </div>`
        : '';

      displayHTML = `<div style="margin-bottom:12px;">
        <div style="width:100%;background:#f5f5f5;border-radius:10px;overflow:hidden;margin-bottom:${mediaList.length > 1 ? '0' : '0'};">
          ${mainMedia}
        </div>
        ${thumbsHTML}
      </div>`;
    } else {
      displayHTML = `<div class="detail-image" style="font-size:100px;margin-bottom:16px;text-align:center;">${product.icon}</div>`;
    }

    const modalHTML = `
      <div class="product-detail-modal" id="productDetailModal">
        <button class="modal-box-close" onclick="closeProductDetail()">✕</button>

        <div class="modal-box">
          <div class="modal-detail-content">

            <!-- FOTO DEL PRODUCTO -->
            <div class="modal-image-wrapper">
              ${displayHTML}
            </div>

            <div class="modal-content-wrapper">

              <!-- PRECIO GRANDE -->
              <p class="detail-price">
                ${formatCurrency(product.price)}
              </p>

              <!-- TÍTULO -->
              <h2 class="modal-title">${product.name}</h2>

              <div class="detail-quantity qty-container-responsive" style="margin-bottom: 16px; padding: 0 0 16px 0; border-bottom: 1px solid #eee;">
                <button class="qty-decrease qty-button-responsive">−</button>
                <input type="number" class="qty-input qty-input-responsive" value="1" min="1">
                <button class="qty-increase qty-button-responsive">+</button>
              </div>

              <!-- VARIANTES (si existen) -->
              <div class="detail-insumo-variants" id="product-variants-${product.id}" style="display: none;">
                <select id="variants-select-${product.id}" class="variant-select" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; color: #333; cursor: pointer; width: 100%; background: white;">
                  <option value="">Selecciona variante...</option>
                </select>
                <span id="variants-label-${product.id}" style="font-size: 12px; color: #999; margin-top: 4px; display: block;"></span>
              </div>

              <!-- DESCRIPCIÓN -->
              <div class="detail-description" id="product-desc-${product.id}">
              </div>

              <!-- BOTÓN AGREGAR AL CARRITO -->
              <button class="btn-add-cart modal-add-cart">
                Agregar al Carrito
              </button>

              <!-- ESPECIFICACIONES -->
              <div class="detail-specifications" id="product-spec-${product.id}">
                <h3>⚙️ Especificaciones</h3>
                <div></div>
              </div>

              <!-- INSTRUCCIONES -->
              <div class="detail-instructions" id="product-instr-${product.id}">
                <h3>📖 Instrucciones</h3>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('productDetailModal');
    if (modal) {
      const descDiv = document.getElementById(`product-desc-${product.id}`);
      if (descDiv) {
        descDiv.innerHTML = product.descripcion_completa || product.descripcion || '<em>Sin descripción disponible</em>';
      }

      // Especificaciones
      const specDiv = document.getElementById(`product-spec-${product.id}`);
      if (specDiv && product.especificaciones) {
        specDiv.style.display = 'block';
        specDiv.querySelector('div:last-child').innerHTML = product.especificaciones;
      }

      // Instrucciones
      const instrDiv = document.getElementById(`product-instr-${product.id}`);
      if (instrDiv && product.instrucciones) {
        instrDiv.style.display = 'block';
        instrDiv.querySelector('div:last-child').innerHTML = product.instrucciones;
      }

      // Variantes de Insumo
      console.log(`📍 [openProductDetail] Producto ${product.id} (${product.name}):`, {
        stock_type: product.stock_type,
        producto_insumo: product.producto_insumo,
        tieneVariantes: product.stock_type === 'insumo' && product.producto_insumo
      });

      if (product.stock_type === 'insumo' && product.producto_insumo) {
        const variantsDiv = document.getElementById(`product-variants-${product.id}`);
        const selectEl = document.getElementById(`variants-select-${product.id}`);
        const labelEl = document.getElementById(`variants-label-${product.id}`);

        if (variantsDiv && selectEl && labelEl) {
          const API_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

          fetch(`${API_URL}/insumos/${product.producto_insumo.insumo_id}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                const insumo = data.data;
                const variants = insumo.insumo_variants || [];
                const tipoVariante = insumo.tipo_variante || 'Variante';

                // Actualizar label dinámico
                labelEl.textContent = tipoVariante;

                if (product.producto_insumo.insumo_variant) {
                  // Variante específica seleccionada
                  const variantId = product.producto_insumo.insumo_variant.id;
                  selectEl.innerHTML = `<option value="${variantId}" selected>${product.producto_insumo.insumo_variant.nombre}</option>`;
                  selectEl.disabled = true;
                  variantsDiv.style.display = 'block';
                } else if (variants.length > 0) {
                  // Todas las variantes disponibles
                  selectEl.innerHTML = `<option value="">Selecciona ${tipoVariante.toLowerCase()}...</option>` +
                    variants.map(v => `<option value="${v.id}" title="Stock: ${v.cantidad_en_stock}">${v.nombre}</option>`).join('');
                  variantsDiv.style.display = 'block';
                }
              }
            })
            .catch(err => console.error('Error fetching insumo variants:', err));
        }
      }

      const qtyInput = modal.querySelector('.qty-input');
      const decreaseBtn = modal.querySelector('.qty-decrease');
      const increaseBtn = modal.querySelector('.qty-increase');

      decreaseBtn?.addEventListener('click', () => {
        if (parseInt(qtyInput.value) > 1) {
          qtyInput.value = parseInt(qtyInput.value) - 1;
        }
      });

      increaseBtn?.addEventListener('click', () => {
        qtyInput.value = parseInt(qtyInput.value) + 1;
      });

      modal.querySelector('.modal-overlay')?.addEventListener('click', closeProductDetail);
      modal.querySelector('.modal-box-close')?.addEventListener('click', closeProductDetail);
      modal.querySelector('.modal-add-cart')?.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value) || 1;

        // Si el producto tiene variantes y se requiere selección
        const selectEl = modal.querySelector(`#variants-select-${product.id}`);
        if (selectEl && selectEl.style.display !== 'none' && !selectEl.disabled) {
          const selectedVariantId = selectEl.value;
          if (!selectedVariantId) {
            showToast('Por favor selecciona una variante', 'error');
            return;
          }
        }

        for (let i = 0; i < qty; i++) {
          addToCart(product);
        }
        qtyInput.value = 1;
        showToast(`${qty}x ${product.name} agregado al carrito`, 'success');
        closeProductDetail();
      });
    }
  } catch (error) {
    console.error('Error abriendo detalle:', error);
    showToast('Error al cargar el producto', 'error');
  }
}

function closeProductDetail() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.remove();
}

// Cambia la foto/video principal al hacer click en thumbnail del modal
function changeDetailMedia(idx) {
  const media = window._currentDetailMedia || [];
  const item = media[idx];
  if (!item) return;

  const BK = window.API_BASE_URL?.replace('/api/v1', '') || 'https://puchia-backend-production.up.railway.app';
  const mainEl = document.getElementById('detailMainMedia');
  if (!mainEl) return;

  const thumbs = document.getElementById('productDetailModal')?.querySelectorAll('.detail-thumb');
  thumbs?.forEach((t, i) => { t.style.border = i === idx ? '2px solid #9b2d7d' : '2px solid #ddd'; });

  if (item.tipo === 'video') {
    if (mainEl.tagName === 'VIDEO') {
      mainEl.src = `${BK}${item.url}`;
      mainEl.load();
    } else {
      const vid = document.createElement('video');
      vid.id = 'detailMainMedia';
      vid.src = `${BK}${item.url}`;
      vid.controls = true;
      vid.classList.add('detail-media-responsive', 'video-element');
      mainEl.replaceWith(vid);
    }
  } else {
    if (mainEl.tagName === 'IMG') {
      mainEl.src = `${BK}${item.url}`;
    } else {
      mainEl.pause();
      const img = document.createElement('img');
      img.id = 'detailMainMedia';
      img.src = `${BK}${item.url}`;
      img.alt = '';
      img.classList.add('detail-media-responsive');
      mainEl.replaceWith(img);
    }
  }
}

// ==================== FILTROS DE CATEGORÍAS DINÁMICOS ====================

function renderCategoryFilters() {
  const filtersBar = document.getElementById('filters-bar');
  if (!filtersBar) return;

  // Crear botón para cada categoría
  const categoryButtons = (categories || []).map(cat =>
    `<button class="filter-btn" onclick="filterProducts('${cat.id}')">${cat.icon} ${cat.name}</button>`
  ).join('');

  // Agregar después del botón "Todos"
  filtersBar.innerHTML = `
    <button class="filter-btn active" onclick="filterProducts('todas')">Todos</button>
    ${categoryButtons}
  `;
}
