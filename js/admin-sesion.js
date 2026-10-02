// ==================== SESIÓN DEL ADMIN: detectar vencimiento ====================
// El token dura 24 h. Si venció (o el servidor responde 401 con nuestro token),
// se cierra la sesión y se manda directo al login, en vez de dejar el panel "vivo"
// y mostrar errores recién al intentar guardar algo.
(function () {
  const CLAVE = 'puchia_admin_token';
  let saliendo = false;

  function leerToken() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }

  function tokenVencido(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch (e) {
      return false; // no se puede leer: lo decide el servidor (401)
    }
  }

  function sesionExpirada() {
    if (saliendo) return;
    saliendo = true;
    try {
      localStorage.removeItem(CLAVE);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('puchia_admin_user');
    } catch (e) { /* sin storage */ }

    const velo = document.createElement('div');
    velo.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(40,10,50,.92);display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;';
    velo.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);">' +
      '<div style="font-size:40px;margin-bottom:8px;">🔒</div>' +
      '<h2 style="margin:0 0 8px;color:#7f1f6e;font-size:20px;">Tu sesión venció</h2>' +
      '<p style="margin:0 0 18px;color:#555;font-size:14px;">Iniciá sesión de nuevo para seguir trabajando.</p>' +
      '<a href="./login.html" style="display:inline-block;background:#7f1f6e;color:#fff;text-decoration:none;font-weight:700;padding:10px 22px;border-radius:8px;">Iniciar sesión</a></div>';
    (document.body || document.documentElement).appendChild(velo);
    setTimeout(() => { window.location.href = './login.html'; }, 1500);
  }
  window.sesionAdminExpirada = sesionExpirada;

  // 1) Cualquier pedido a la API con nuestro token que vuelva 401 = sesión vencida
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const resp = await fetchOriginal(input, init);
    if (resp.status === 401) {
      const token = leerToken();
      let auth = init && init.headers && (init.headers.Authorization || init.headers.authorization);
      if (!auth && input && input.headers && typeof input.headers.get === 'function') auth = input.headers.get('Authorization');
      if (token && auth && String(auth).includes(token)) sesionExpirada();
    }
    return resp;
  };

  // 2) Chequeo por reloj: al volver a la pestaña (compu que despierta) y cada 30 s
  function chequear() {
    const token = leerToken();
    if (token && tokenVencido(token)) sesionExpirada();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chequear(); });
  window.addEventListener('focus', chequear);
  setInterval(chequear, 30000);
  chequear();
})();
