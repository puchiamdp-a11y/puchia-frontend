// admin-alertas-config.js — Configuración de alertas WhatsApp

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  cargarConfiguracion();
  actualizarPrevistaTemplates();
  setupEventListeners();
});

function checkAuth() {
  const token = localStorage.getItem('puchia_admin_token');
  if (!token) { window.location.href = './login.html'; return; }
  const user = JSON.parse(localStorage.getItem('puchia_admin_user') || '{}');
  const el = document.getElementById('adminUserName');
  if (el) el.textContent = user.nombre || 'Admin';
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('puchia_admin_token');
  localStorage.removeItem('puchia_admin_user');
  window.location.href = './login.html';
});

function getToken() {
  return localStorage.getItem('puchia_admin_token');
}

// ==================== CONFIGURACIÓN (localStorage) ====================
// La configuración se guarda localmente hasta implementar endpoint específico

const CONFIG_KEY = 'puchia_alertas_config';

function cargarConfiguracion() {
  const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');

  document.getElementById('numeroAdmin').value = saved.numeroAdmin || '5491123456789';
  document.getElementById('alertaOrdenNueva').checked = saved.alertaOrdenNueva !== false;
  document.getElementById('alertaCambioEstado').checked = saved.alertaCambioEstado !== false;
  document.getElementById('alertaStockBajo').checked = saved.alertaStockBajo !== false;
  document.getElementById('alertasCliente').checked = saved.alertasCliente || false;

  if (saved.tplOrdenNueva) document.getElementById('tplOrdenNueva').value = saved.tplOrdenNueva;
  if (saved.tplCambioEstado) document.getElementById('tplCambioEstado').value = saved.tplCambioEstado;
  if (saved.tplStockBajo) document.getElementById('tplStockBajo').value = saved.tplStockBajo;
}

function guardarConfiguracion() {
  const config = {
    numeroAdmin: document.getElementById('numeroAdmin').value.trim(),
    alertaOrdenNueva: document.getElementById('alertaOrdenNueva').checked,
    alertaCambioEstado: document.getElementById('alertaCambioEstado').checked,
    alertaStockBajo: document.getElementById('alertaStockBajo').checked,
    alertasCliente: document.getElementById('alertasCliente').checked,
    tplOrdenNueva: document.getElementById('tplOrdenNueva').value,
    tplCambioEstado: document.getElementById('tplCambioEstado').value,
    tplStockBajo: document.getElementById('tplStockBajo').value
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

// ==================== SETUP EVENTS ====================

function setupEventListeners() {
  document.getElementById('btnGuardarNumero')?.addEventListener('click', () => {
    const numero = document.getElementById('numeroAdmin').value.trim();
    if (!numero) { alert('Ingresa un número'); return; }
    const config = guardarConfiguracion();
    showToast('Número guardado correctamente');
  });

  document.getElementById('btnEnviarPrueba')?.addEventListener('click', enviarPrueba);
  document.getElementById('btnGuardarAlertas')?.addEventListener('click', () => {
    guardarConfiguracion();
    showToast('Configuración de alertas guardada');
  });
  document.getElementById('btnActualizarPrevistas')?.addEventListener('click', actualizarPrevistaTemplates);

  ['tplOrdenNueva','tplCambioEstado','tplStockBajo'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', actualizarPrevistaTemplates);
  });
}

// ==================== TEMPLATES PREVIEW ====================

function actualizarPrevistaTemplates() {
  const reemplazarEjemplo = (tpl) =>
    tpl
      .replace(/#{ordenId}/g, 'ORD-001')
      .replace(/#{clienteNombre}/g, 'María García')
      .replace(/\${total}/g, '12500')
      .replace(/#{estadoAnterior}/g, 'pendiente')
      .replace(/#{nuevoEstado}/g, 'preparandose')
      .replace(/#{productoNombre}/g, 'Cartera Rosa')
      .replace(/#{cantidad}/g, '2');

  ['OrdenNueva','CambioEstado','StockBajo'].forEach(tipo => {
    const tpl = document.getElementById(`tpl${tipo}`)?.value || '';
    const prev = document.getElementById(`prev${tipo}`);
    if (prev) prev.textContent = reemplazarEjemplo(tpl);
  });
}

// ==================== ENVIAR PRUEBA ====================

async function enviarPrueba() {
  const numero = document.getElementById('numeroAdmin').value.trim();
  if (!numero) { alert('Configura primero el número de WhatsApp'); return; }

  const resultDiv = document.getElementById('pruebaResult');
  resultDiv.style.display = 'block';
  resultDiv.style.background = '#f8f8f8';
  resultDiv.innerHTML = '<span class="spinner"></span> Enviando mensaje de prueba...';

  // Por ahora simula el envío (el endpoint real requiere configuración de API)
  await new Promise(r => setTimeout(r, 1000));

  resultDiv.style.background = '#e6f4ea';
  resultDiv.style.color = '#1a7c3a';
  resultDiv.innerHTML = `
    <strong>✅ Mensaje de prueba enviado (simulado)</strong><br>
    Destino: ${numero}<br>
    <em style="font-size:12px;">En modo desarrollo los mensajes se registran en la consola del servidor</em>
  `;

  console.log(`[WhatsApp Prueba] → ${numero}: 🧪 Prueba de alertas Puchia Admin`);
}

// ==================== TOAST ====================

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;background:#7f1f6e;color:white;
    padding:12px 20px;border-radius:8px;font-size:14px;font-family:Poppins,sans-serif;
    z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
