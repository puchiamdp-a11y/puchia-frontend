/* ═════════════════════════════════════════════════════════════════
   SECURITY.JS - Defensa contra XSS
   Cargar ANTES que el resto de los scripts (después de vendor/purify.min.js).

   Regla de oro: todo dato que venga del servidor, de la URL o de localStorage
   y se inserte dentro de un template HTML (innerHTML / insertAdjacentHTML)
   debe pasar por esc(). Para URLs en src/href usar escUrl(). Para HTML con
   formato (descripciones de productos) usar sanitizarHTML().
   ═════════════════════════════════════════════════════════════════ */
(function (global) {
    'use strict';

    const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

    /** Escapa texto para insertarlo en HTML (contenido o atributos). */
    function esc(valor) {
        return String(valor ?? '').replace(/[&<>"'`]/g, (c) => MAPA[c]);
    }

    /** Número seguro para templates (evita que un string se cuele como código). */
    function escNum(valor) {
        const n = Number(valor);
        return Number.isFinite(n) ? n : 0;
    }

    /** URL para atributos src/href: solo http(s) o rutas relativas; si no, ''. */
    function escUrl(url) {
        try {
            const u = new URL(String(url ?? ''), global.location.href);
            return (u.protocol === 'http:' || u.protocol === 'https:') ? esc(String(url)) : '';
        } catch (_) {
            return '';
        }
    }

    // ---------- HTML con formato (Quill) ----------
    const TAGS_PERMITIDOS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'span', 'div',
        'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr'
    ];
    const ATRIBUTOS_PERMITIDOS = ['href', 'target', 'rel', 'class', 'style', 'title'];
    const CSS_PERMITIDO = new Set([
        'color', 'background-color', 'text-align', 'font-size', 'font-weight', 'font-style', 'text-decoration'
    ]);

    // Deja solo propiedades CSS inofensivas (sin url(), expression(), etc.)
    function limpiarEstilo(valor) {
        return String(valor).split(';').map((d) => d.trim()).filter((d) => {
            const i = d.indexOf(':');
            if (i < 1) return false;
            const prop = d.slice(0, i).trim().toLowerCase();
            const val = d.slice(i + 1).toLowerCase();
            return CSS_PERMITIDO.has(prop) && !/url\s*\(|expression|javascript|[<>\\@]|\/\*/.test(val);
        }).join('; ');
    }

    let hooksInstalados = false;
    function instalarHooks() {
        if (hooksInstalados || !global.DOMPurify) return;
        hooksInstalados = true;
        global.DOMPurify.addHook('uponSanitizeAttribute', (nodo, datos) => {
            if (datos.attrName === 'style') {
                datos.attrValue = limpiarEstilo(datos.attrValue);
                if (!datos.attrValue) datos.keepAttr = false;
            } else if (datos.attrName === 'class') {
                // Solo clases del editor Quill (evita usar clases propias del sitio)
                datos.attrValue = String(datos.attrValue).split(/\s+/).filter((c) => /^ql-[a-z0-9-]+$/.test(c)).join(' ');
                if (!datos.attrValue) datos.keepAttr = false;
            }
        });
        global.DOMPurify.addHook('afterSanitizeAttributes', (nodo) => {
            if (nodo.tagName === 'A' && nodo.hasAttribute('href')) {
                nodo.setAttribute('target', '_blank');
                nodo.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    /**
     * Sanitiza HTML con formato (descripciones de productos). Si DOMPurify no
     * cargó, devuelve solo el texto (falla cerrado).
     */
    function sanitizarHTML(html) {
        const texto = String(html ?? '');
        if (!global.DOMPurify) {
            const t = document.createElement('template'); // inerte: no ejecuta nada
            t.innerHTML = texto;
            return esc(t.content.textContent);
        }
        instalarHooks();
        return global.DOMPurify.sanitize(texto, {
            ALLOWED_TAGS: TAGS_PERMITIDOS,
            ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
            ALLOW_DATA_ATTR: false,
            ALLOW_ARIA_ATTR: false
        });
    }

    global.esc = esc;
    global.escNum = escNum;
    global.escUrl = escUrl;
    global.sanitizarHTML = sanitizarHTML;
})(window);
