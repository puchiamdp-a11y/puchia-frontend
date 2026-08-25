const API_BASE_URL = 'https://puchia-backend-production.up.railway.app/api/v1';

document.getElementById('loginForm').addEventListener('submit', handleLogin);

async function handleLogin(e) {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value.trim();
  const loginBtn = document.getElementById('loginBtn');
  const loading = document.getElementById('loading');
  const generalError = document.getElementById('generalError');

  // Limpiar errores previos
  generalError.classList.remove('show');
  generalError.textContent = '';

  // Validar campos
  if (!usuario || !password) {
    generalError.textContent = 'Usuario y contraseña son requeridos';
    generalError.classList.add('show');
    return;
  }

  // Deshabilitar botón
  loginBtn.disabled = true;
  loading.classList.add('show');

  try {
    console.log('🔍 Intentando login a:', `${API_BASE_URL}/admin/auth/login`);

    const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario,
        password
      }),
      credentials: 'include'
    });

    console.log('📊 Respuesta recibida. Status:', response.status, 'OK:', response.ok);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    if (data.success && data.token) {
      // Guardar token en localStorage (usar 'adminToken' para consistencia con admin-home-sections.js)
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('puchia_admin_token', data.token);
      localStorage.setItem('puchia_admin_user', JSON.stringify(data.usuario));

      // Redirigir al dashboard
      window.location.href = './dashboard.html';
    } else {
      throw new Error('Respuesta inválida del servidor');
    }
  } catch (error) {
    console.error('❌ Error en login:', error);

    // Diagnosticar tipo de error
    let errorMessage = error.message;
    if (error.message === 'Failed to fetch') {
      errorMessage = 'No se puede conectar al servidor. Verifica tu conexión o intenta más tarde.';
      console.error('🔴 Probable causa: Backend no está disponible o hay problema de conexión');
    }

    generalError.textContent = errorMessage || 'Error al iniciar sesión. Intenta nuevamente.';
    generalError.classList.add('show');
  } finally {
    loginBtn.disabled = false;
    loading.classList.remove('show');
  }
}