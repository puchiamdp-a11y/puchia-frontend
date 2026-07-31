/* ═════════════════════════════════════════════════════════════════
   AUTH-CLIENTE.JS - Autenticación de Clientes
   ═════════════════════════════════════════════════════════════════ */

const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';
const TOKEN_KEY = 'puchia_cliente_token';
const USER_KEY  = 'puchia_cliente_user';

function getClienteToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveClienteToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getClienteUser() {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
}

function saveClienteUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearClienteSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function isClienteLoggedIn() {
    return !!getClienteToken();
}

function requireLogin() {
    if (!isClienteLoggedIn()) {
        window.location.href = 'login.html';
    }
}

function clienteLogout() {
    clearClienteSession();
    window.location.href = 'login.html';
}

async function apiClienteGet(endpoint) {
    const token = getClienteToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
    return data;
}

function getMensajeError(status, mensaje) {
    // Por status code
    const mensajesPorStatus = {
        400: '❌ Completa todos los campos correctamente',
        401: '❌ El usuario o la contraseña son incorrectos',
        409: '❌ Este email ya está registrado',
        500: '⚠️ Error en el servidor, intenta más tarde'
    };
    return mensajesPorStatus[status] || (mensaje ? `❌ ${mensaje}` : '❌ Algo salió mal, intenta de nuevo');
}

async function apiClientePost(endpoint, body) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
        const mensaje = getMensajeError(response.status, data.message || data.error);
        const err = new Error(mensaje);
        err.status = response.status;
        err.data = data;
        throw err;
    }
    return data;
}

async function apiClienteCheckWhatsapp(whatsapp) {
    try {
        const response = await fetch(`${API_BASE_URL}/clientes/check-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsapp })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al verificar WhatsApp');
        return data; // { success: true, existe: true/false }
    } catch (error) {
        // Si hay error de red/parsing, relanzar
        throw error;
    }
}

async function apiClientePostNoAuth(endpoint, body) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
        const mensaje = getMensajeError(response.status, data.message || data.error);
        const err = new Error(mensaje);
        err.status = response.status;
        err.data = data;
        throw err;
    }
    return data;
}
