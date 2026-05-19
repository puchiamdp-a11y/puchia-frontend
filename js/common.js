/* ═════════════════════════════════════════════════════════════════
   COMMON.JS - Funciones Compartidas Globales
   Usado por: index.html, proceso-compra.html, admin
   ═════════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ════════════════════════════════════════════════════════

const API_BASE_URL = 'https://puchia-backend.onrender.com/api/v1';
const APP_NAME = 'Puchia';

// Obtener datos globales del localStorage (incluyendo settings del admin)
function getSettings() {
    const defaults = {
        logo: 'P',
        logoText: 'Puchia',
        announceText: 'Envío gratis en compras mayores a $2.000 🎉',
        whatsappNumber: '5492230000000',
    };
    const saved = localStorage.getItem('puchia_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function saveSettings(settings) {
    localStorage.setItem('puchia_settings', JSON.stringify(settings));
}

// ════════════════════════════════════════════════════════
// UTILIDADES DE NOTIFICACIÓN
// ════════════════════════════════════════════════════════

/**
 * Mostrar notificación toast (pequeña notificación esquina inferior derecha)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success', 'error', 'info' (default)
 * @param {number} duration - Duración en ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = '#e74c3c';
    } else if (type === 'success') {
        toast.style.background = '#27ae60';
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

/**
 * Mostrar diálogo de confirmación
 * @param {string} message - Mensaje de confirmación
 * @return {boolean} - true si confirma, false si cancela
 */
function showConfirm(message) {
    return confirm(message);
}

// ════════════════════════════════════════════════════════
// FUNCIONES DE API
// ════════════════════════════════════════════════════════

/**
 * Realizar petición GET a la API
 */
async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Realizar petición POST a la API
 */
async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Realizar petición PUT a la API (con autenticación)
 */
async function apiPut(endpoint, data, token) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ════════════════════════════════════════════════════════
// FUNCIONES DE LOCALSTORAGE
// ════════════════════════════════════════════════════════

/**
 * Obtener carrito del localStorage
 */
function getCart() {
    const saved = localStorage.getItem('puchia_cart');
    return saved ? JSON.parse(saved) : [];
}

/**
 * Guardar carrito en localStorage
 */
function saveCart(cart) {
    localStorage.setItem('puchia_cart', JSON.stringify(cart));
}

/**
 * Obtener órdenes del localStorage
 */
function getOrders() {
    const saved = localStorage.getItem('puchia_orders');
    return saved ? JSON.parse(saved) : [];
}

/**
 * Guardar órdenes en localStorage
 */
function saveOrders(orders) {
    localStorage.setItem('puchia_orders', JSON.stringify(orders));
}

/**
 * Obtener token de administrador
 */
function getAdminToken() {
    return localStorage.getItem('puchia_admin_token');
}

/**
 * Guardar token de administrador
 */
function saveAdminToken(token) {
    localStorage.setItem('puchia_admin_token', token);
}

/**
 * Limpiar token de administrador
 */
function clearAdminToken() {
    localStorage.removeItem('puchia_admin_token');
}

// ════════════════════════════════════════════════════════
// FUNCIONES DE FORMATO
// ════════════════════════════════════════════════════════

/**
 * Formatear número como moneda argentina
 */
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('es-AR');
}

/**
 * Formatear fecha en formato local
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

/**
 * Obtener ID único (para órdenes, etc)
 */
function generateId(prefix = 'ORD') {
    return prefix + '-' + Date.now();
}

// ════════════════════════════════════════════════════════
// FUNCIONES DE CARRITO
// ════════════════════════════════════════════════════════

/**
 * Agregar producto al carrito
 */
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
    return cart;
}

/**
 * Remover producto del carrito
 */
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartCount();
    return cart;
}

/**
 * Actualizar cantidad en carrito
 */
function updateCartQty(productId, qty) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.qty = Math.max(1, parseInt(qty));
        saveCart(cart);
        updateCartCount();
    }
    return cart;
}

/**
 * Actualizar el contador de carrito en el header
 */
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

/**
 * Calcular total del carrito
 */
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

/**
 * Limpiar carrito
 */
function clearCart() {
    localStorage.removeItem('puchia_cart');
    updateCartCount();
}

// ════════════════════════════════════════════════════════
// FUNCIONES DE ADMIN
// ════════════════════════════════════════════════════════

/**
 * Verificar si el usuario es admin
 */
function isAdminLoggedIn() {
    return !!getAdminToken();
}

/**
 * Logout de admin
 */
function adminLogout() {
    clearAdminToken();
    window.location.href = '/admin/login.html';
}

// ════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════

// Actualizar contador de carrito al cargar página
window.addEventListener('load', () => {
    updateCartCount();
});

// Mantener sesión sincronizada entre tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'puchia_cart') {
        updateCartCount();
    }
});
