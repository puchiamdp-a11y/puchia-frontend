/* ═════════════════════════════════════════════════════════════════
   COMMON.JS - Funciones Compartidas Globales
   ═════════════════════════════════════════════════════════════════ */

function getSettings() {
    const defaults = {
        logo: 'P',
        logoText: 'Puchia',
        announceText: 'Envío gratis en compras mayores a $2.000 🎉',
        whatsappNumber: '5492235847353',
    };
    const saved = localStorage.getItem('puchia_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function saveSettings(settings) {
    localStorage.setItem('puchia_settings', JSON.stringify(settings));
}

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.background = '#e74c3c';
    if (type === 'success') toast.style.background = '#27ae60';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function getCart() {
    const saved = localStorage.getItem('puchia_cart');
    return saved ? JSON.parse(saved) : [];
}

function saveCart(cart) {
    localStorage.setItem('puchia_cart', JSON.stringify(cart));
}

function getOrders() {
    const saved = localStorage.getItem('puchia_orders');
    return saved ? JSON.parse(saved) : [];
}

function saveOrders(orders) {
    localStorage.setItem('puchia_orders', JSON.stringify(orders));
}

function getAdminToken() {
    return localStorage.getItem('puchia_admin_token');
}

function saveAdminToken(token) {
    localStorage.setItem('puchia_admin_token', token);
}

function clearAdminToken() {
    localStorage.removeItem('puchia_admin_token');
}

function formatCurrency(amount) {
    return '$' + amount.toLocaleString('es-AR');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function generateId(prefix = 'ORD') {
    return prefix + '-' + Date.now();
}

function addToCart(product) {
    let cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    
    saveCart(cart);
    updateCartCount();
    renderCartSidebar();
    return cart;
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartCount();
    renderCartSidebar();
    return cart;
}

function updateCartQty(productId, qty) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.qty = Math.max(1, parseInt(qty));
        saveCart(cart);
        updateCartCount();
        renderCartSidebar();
    }
    return cart;
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const elements = document.querySelectorAll('#cartCount');
    elements.forEach(el => el.textContent = count);
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function clearCart() {
    localStorage.removeItem('puchia_cart');
    updateCartCount();
    renderCartSidebar();
}

function toggleCart(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        renderCartSidebar();
    }
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

function renderCartSidebar() {
    const cart = getCart();
    const container = document.getElementById('cartItemsContainer');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const totalElement = document.getElementById('cartTotal');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart"><p>Tu carrito está vacío</p></div>';
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (checkoutBtn) checkoutBtn.disabled = false;
        const html = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-icon">${item.icon || '🎁'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                        <span style="min-width: 30px; text-align: center; font-weight: 600;">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeItem(${item.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
    
    if (totalElement) {
        totalElement.textContent = formatCurrency(getCartTotal());
    }
}

function changeQty(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) item.qty = 1;
        saveCart(cart);
        updateCartCount();
        renderCartSidebar();
    }
}

function removeItem(productId) {
    removeFromCart(productId);
    showToast('Producto removido del carrito');
}

function goToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Agrega productos al carrito primero');
        return;
    }
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        closeCart();
        checkoutModal.classList.add('active');
    } else {
        localStorage.setItem('openCheckout', 'true');
        window.location.href = 'proceso-compra.html';
    }
}

function injectCartSidebar() {
    if (document.getElementById('cartSidebar')) return;
    
    const sidebarHTML = `
        <div class="cart-overlay" id="cartOverlay" onclick="closeCart()"></div>
        <div class="cart-sidebar" id="cartSidebar">
            <div class="cart-header">
                <h2>Tu Carrito</h2>
                <button class="close-cart" onclick="closeCart()">✕</button>
            </div>
            <div class="cart-items" id="cartItemsContainer">
                <div class="empty-cart" id="emptyCartMessage">
                    <p>Tu carrito está vacío</p>
                </div>
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cartTotal">$0</span>
                </div>
                <button class="checkout-btn" onclick="goToCheckout()" id="checkoutBtn" disabled>
                    Ir a Checkout
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', sidebarHTML);
}

function isAdminLoggedIn() {
    return !!getAdminToken();
}

function adminLogout() {
    clearAdminToken();
    window.location.href = '/admin/login.html';
}

window.addEventListener('load', () => {
    injectCartSidebar();
    updateCartCount();
    renderCartSidebar();
});

window.addEventListener('storage', (e) => {
    if (e.key === 'puchia_cart') {
        updateCartCount();
        renderCartSidebar();
    }
});