/* TIENDA-OPCIONES.JS - Selector de opciones (color, tamaño, modelo…) del detalle de producto.
   El cliente elige cuántas unidades de cada opción; cada opción tiene su precio y su stock.
   Se apoya en el carrito por línea (common.js) y en POST /stock/disponibilidad, que descuenta lo que ya hay en el carrito. */

// El carrito, en el formato que entiende el servidor: [{ producto_id, cantidad } | { producto_id, selecciones: [{ opcion_id, cantidad }] }]
function carritoParaServidor(cart = getCart()) {
    const porProducto = new Map();
    const combos = [];
    for (const l of cart) {
        if (l.combo_detalle) {
            // Cada combo armado viaja con lo que se eligió de cada parte
            combos.push({
                producto_id: l.id, cantidad: l.qty,
                componentes: l.combo_detalle.map(c => (c.selecciones
                    ? { componente_id: c.componente_id, selecciones: c.selecciones.map(x => ({ opcion_id: x.opcion_id, cantidad: x.cantidad })) }
                    : { componente_id: c.componente_id, cantidad: c.cantidad }))
            });
        } else if (l.opcion_id) {
            const e = porProducto.get(l.id) || { producto_id: l.id, selecciones: [] };
            if (!e.selecciones) continue;
            e.selecciones.push({ opcion_id: l.opcion_id, cantidad: l.qty });
            porProducto.set(l.id, e);
        } else {
            porProducto.set(l.id, { producto_id: l.id, cantidad: (porProducto.get(l.id)?.cantidad || 0) + l.qty });
        }
    }
    return [...porProducto.values(), ...combos];
}

async function consultarDisponibilidad(productoId, itemsDelCarrito) {
    const res = await fetch(`${window.API_BASE_URL}/stock/disponibilidad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsDelCarrito, producto_ids: [productoId] })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'sin respuesta');
    return (data.data.productos || [])[0] || null;
}

const escOpc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Convierte el modal de detalle en un selector de opciones. Se llama desde openProductDetail cuando product.tiene_opciones. */
async function montarSelectorOpciones(modal, product) {
    const cantidadWrap = modal.querySelector('.detail-quantity');
    const botonViejo = modal.querySelector('.modal-add-cart');
    if (!cantidadWrap || !botonViejo) return;

    const panel = document.createElement('div');
    panel.className = 'opciones-selector';
    panel.innerHTML = '<p style="color:#666;">Cargando opciones…</p>';
    cantidadWrap.replaceWith(panel);
    // El botón viejo se reemplaza por una copia para quitarle el "agregar de a uno"
    const boton = botonViejo.cloneNode(true);
    botonViejo.replaceWith(boton);
    boton.disabled = true;
    boton.textContent = 'Agregar al carrito';

    // Disponibilidad real: lo que queda MENOS lo que este cliente ya tiene en el carrito
    let opciones = product.opciones.map(o => ({ ...o }));
    let minimo = product.compra_minima || 0;
    let maximo = product.compra_maxima || 0;
    const cartActual = getCart();
    try {
        const info = await consultarDisponibilidad(product.id, carritoParaServidor(cartActual));
        if (info) {
            const porId = new Map(info.opciones.map(o => [o.opcion_id, o]));
            opciones = product.opciones.map(o => ({ ...o, disponibles: porId.get(o.id)?.disponibles ?? 0 }));
            minimo = info.compra_minima || 0;
            maximo = info.compra_maxima || 0;
        }
    } catch (e) {
        console.warn('No se pudo consultar la disponibilidad, se usa la del catálogo:', e.message);
    }
    opciones = opciones.filter(o => o.disponibles > 0);

    const yaEnCarrito = cartActual.filter(l => l.id === product.id).reduce((s, l) => s + l.qty, 0);
    const precioDe = (o) => (o.precio === null || o.precio === undefined ? product.price : o.precio);

    if (opciones.length === 0) {
        panel.innerHTML = `<p style="color:#b00;font-weight:600;">Agotado por el momento${yaEnCarrito ? '. Ya tenés todo lo disponible en tu carrito.' : '.'}</p>`;
        boton.textContent = 'Agotado';
        return;
    }

    const reglas = [];
    if (minimo) reglas.push(`Mínimo ${minimo} en total`);
    if (maximo) reglas.push(`Máximo ${maximo} en total`);
    panel.innerHTML = `
        <div style="margin-bottom:8px;font-weight:600;">Elegí cuántas querés de cada una:</div>
        ${reglas.length ? `<div class="opciones-reglas" style="font-size:13px;color:#666;margin-bottom:8px;">${reglas.join(' · ')}${yaEnCarrito ? ` (ya tenés ${yaEnCarrito} en el carrito)` : ''}</div>` : ''}
        <div class="opciones-lista">
        ${opciones.map(o => `
            <div class="opcion-fila" data-opcion-id="${o.id}" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee;">
                <div style="flex:1;min-width:0;">
                    <div class="opcion-nombre-tienda" style="font-weight:600;">${escOpc(o.nombre)}</div>
                    <div style="font-size:12px;color:#666;"><span class="opcion-precio-tienda">${formatCurrency(precioDe(o))}</span> · <span class="opcion-disponibles">${o.disponibles >= 10000 ? 'Disponible' : `${o.disponibles} disponible${o.disponibles === 1 ? '' : 's'}`}</span></div>
                </div>
                <button type="button" class="opcion-menos qty-button-responsive" aria-label="Menos">−</button>
                <input type="number" class="opcion-cant" value="0" min="0" ${o.disponibles < 10000 ? `max="${o.disponibles}"` : ''} style="width:56px;text-align:center;">
                <button type="button" class="opcion-mas qty-button-responsive" aria-label="Más">+</button>
            </div>`).join('')}
        </div>
        <div class="opciones-total" style="margin-top:10px;font-weight:700;"></div>
        <div class="opciones-error" style="color:#b00;font-size:13px;min-height:18px;"></div>`;

    const totalEl = panel.querySelector('.opciones-total');
    const errorEl = panel.querySelector('.opciones-error');
    const filas = [...panel.querySelectorAll('.opcion-fila')].map(el => ({
        el, opcion: opciones.find(o => o.id === Number(el.dataset.opcionId)), input: el.querySelector('.opcion-cant')
    }));

    function leerSelecciones() {
        return filas.map(f => {
            let n = Math.max(0, Math.floor(Number(f.input.value) || 0));
            if (n > f.opcion.disponibles) n = f.opcion.disponibles;
            if (String(n) !== f.input.value) f.input.value = n;
            return { opcion: f.opcion, cantidad: n };
        }).filter(s => s.cantidad > 0);
    }

    function actualizar() {
        const sel = leerSelecciones();
        const unidades = sel.reduce((s, x) => s + x.cantidad, 0);
        const total = sel.reduce((s, x) => s + x.cantidad * precioDe(x.opcion), 0);
        totalEl.textContent = unidades ? `${unidades} unidad${unidades === 1 ? '' : 'es'} · Total ${formatCurrency(total)}` : 'Todavía no elegiste ninguna';
        let error = '';
        const finalProducto = yaEnCarrito + unidades;
        if (unidades > 0 && minimo && finalProducto < minimo) error = `Tenés que llevar al menos ${minimo} en total${yaEnCarrito ? ` (ya tenés ${yaEnCarrito} en el carrito)` : ''}.`;
        if (unidades > 0 && maximo && finalProducto > maximo) error = `Podés llevar hasta ${maximo} en total${yaEnCarrito ? ` (ya tenés ${yaEnCarrito} en el carrito)` : ''}.`;
        errorEl.textContent = error;
        boton.disabled = unidades === 0 || Boolean(error);
        return sel;
    }

    filas.forEach(f => {
        f.el.querySelector('.opcion-menos').addEventListener('click', () => { f.input.value = Math.max(0, (Number(f.input.value) || 0) - 1); actualizar(); });
        f.el.querySelector('.opcion-mas').addEventListener('click', () => { f.input.value = (Number(f.input.value) || 0) + 1; actualizar(); });
        f.input.addEventListener('input', actualizar);
    });
    actualizar();

    boton.addEventListener('click', () => {
        const sel = actualizar();
        if (boton.disabled || sel.length === 0) return;
        sel.forEach(s => addOpcionToCart(product, s.opcion, s.cantidad));
        const unidades = sel.reduce((n, x) => n + x.cantidad, 0);
        showToast(`${unidades}x ${product.name} agregado al carrito`, 'success');
        closeProductDetail();
    });
}


/** Convierte el modal de detalle de un combo en el armado: cuántas de cada opción, por parte, con progreso. */
async function montarSelectorCombo(modal, product) {
    const cantidadWrap = modal.querySelector('.detail-quantity');
    const botonViejo = modal.querySelector('.modal-add-cart');
    if (!cantidadWrap || !botonViejo) return;

    const panel = document.createElement('div');
    panel.className = 'combo-armado';
    panel.innerHTML = '<p style="color:#666;">Cargando combo…</p>';
    cantidadWrap.replaceWith(panel);
    const boton = botonViejo.cloneNode(true);
    botonViejo.replaceWith(boton);
    boton.disabled = true;
    boton.textContent = 'Agregar al carrito';

    let partes = (product.combo && product.combo.componentes) || [];
    let disponibles = product.stock_cantidad;
    try {
        const info = await consultarDisponibilidad(product.id, carritoParaServidor());
        if (info && info.combo) { partes = info.combo.componentes; disponibles = info.disponibles; }
    } catch (e) {
        console.warn('No se pudo consultar la disponibilidad del combo:', e.message);
    }

    if (!partes.length || disponibles < 1) {
        const faltan = partes.filter(c => c.disponibles < c.cantidad_min).map(c => c.producto);
        panel.innerHTML = `<p style="color:#b00;font-weight:600;">Agotado por el momento${faltan.length ? ` (sin stock suficiente de: ${faltan.map(escOpc).join(', ')})` : ''}.</p>`;
        boton.textContent = 'Agotado';
        return;
    }

    const regla = (c) => (c.cantidad_min === c.cantidad_max ? `elegí ${c.cantidad_min}` : `elegí entre ${c.cantidad_min} y ${c.cantidad_max}`);
    panel.innerHTML = `<div style="margin-bottom:8px;font-weight:600;">Armá tu combo:</div>` + partes.map(c => `
        <div class="combo-parte-tienda" data-componente-id="${c.componente_id}" data-min="${c.cantidad_min}" data-max="${c.cantidad_max}" data-producto="${escOpc(c.producto)}" style="border:1px solid #eee;border-radius:10px;padding:10px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;gap:8px;font-weight:600;">
                <span>${escOpc(c.producto)} <span style="font-weight:400;color:#666;">(${regla(c)})</span></span>
                <span class="combo-progreso">0 de ${c.cantidad_min === c.cantidad_max ? c.cantidad_min : c.cantidad_max}</span>
            </div>
            ${c.opciones && c.opciones.length
                ? c.opciones.map(o => `<div class="combo-fila" style="display:flex;align-items:center;gap:8px;padding:6px 0;">
                    <div style="flex:1;"><span class="combo-opcion-nombre" style="font-weight:600;">${escOpc(o.nombre)}</span> <span style="font-size:12px;color:#666;">${o.disponibles >= 10000 ? '' : `${o.disponibles} disponible${o.disponibles === 1 ? '' : 's'}`}</span></div>
                    <button type="button" class="combo-menos qty-button-responsive" aria-label="Menos">−</button>
                    <input type="number" class="combo-cant" data-opcion-id="${o.id}" data-opcion-nombre="${escOpc(o.nombre)}" value="0" min="0" ${o.disponibles < 10000 ? `max="${o.disponibles}"` : ''} style="width:56px;text-align:center;">
                    <button type="button" class="combo-mas qty-button-responsive" aria-label="Más">+</button>
                </div>`).join('')
                : `<div class="combo-fila" style="display:flex;align-items:center;gap:8px;padding:6px 0;">
                    <div style="flex:1;font-size:12px;color:#666;">${c.disponibles >= 10000 ? '' : `${c.disponibles} disponibles`}</div>
                    <button type="button" class="combo-menos qty-button-responsive" aria-label="Menos">−</button>
                    <input type="number" class="combo-cant" data-simple="1" value="0" min="0" ${c.disponibles < 10000 ? `max="${c.disponibles}"` : ''} style="width:56px;text-align:center;">
                    <button type="button" class="combo-mas qty-button-responsive" aria-label="Más">+</button>
                </div>`}
        </div>`).join('') + `<div class="combo-precio" style="font-weight:700;">Precio del combo: ${formatCurrency(product.price)}</div><div class="combo-error" style="color:#b00;font-size:13px;min-height:18px;"></div>`;

    const bloques = [...panel.querySelectorAll('.combo-parte-tienda')];
    const errorEl = panel.querySelector('.combo-error');

    function leer() {
        let completo = true;
        const detalle = [];
        for (const b of bloques) {
            const min = Number(b.dataset.min), max = Number(b.dataset.max);
            const inputs = [...b.querySelectorAll('.combo-cant')];
            inputs.forEach(i => {
                let n = Math.max(0, Math.floor(Number(i.value) || 0));
                if (i.max && n > Number(i.max)) n = Number(i.max);
                if (String(n) !== i.value) i.value = n;
            });
            const simple = inputs.find(i => i.dataset.simple);
            const selecciones = simple ? null : inputs.map(i => ({ opcion_id: Number(i.dataset.opcionId), opcion: i.dataset.opcionNombre, cantidad: Number(i.value) })).filter(s => s.cantidad > 0);
            const total = simple ? Number(simple.value) : selecciones.reduce((a, s) => a + s.cantidad, 0);
            const prog = b.querySelector('.combo-progreso');
            prog.textContent = `${total} de ${min === max ? min : `${min}–${max}`}`;
            const bien = total >= min && total <= max;
            prog.style.color = bien ? '#1a7f37' : (total > max ? '#b00' : '#666');
            if (!bien) completo = false;
            if (total > 0) detalle.push({ componente_id: Number(b.dataset.componenteId), producto: b.dataset.producto, cantidad: total, ...(selecciones ? { selecciones } : {}) });
        }
        errorEl.textContent = '';
        boton.disabled = !completo;
        return { completo, detalle };
    }

    bloques.forEach(b => {
        b.querySelectorAll('.combo-fila').forEach(f => {
            const input = f.querySelector('.combo-cant');
            f.querySelector('.combo-menos').addEventListener('click', () => { input.value = Math.max(0, (Number(input.value) || 0) - 1); leer(); });
            f.querySelector('.combo-mas').addEventListener('click', () => {
                const max = Number(b.dataset.max);
                const total = [...b.querySelectorAll('.combo-cant')].reduce((a, i) => a + (Number(i.value) || 0), 0);
                if (total >= max) { errorEl.textContent = `De ${b.dataset.producto} podés elegir hasta ${max}.`; return; }
                input.value = (Number(input.value) || 0) + 1; leer();
            });
            input.addEventListener('input', leer);
        });
    });
    leer();

    boton.addEventListener('click', () => {
        const { completo, detalle } = leer();
        if (!completo) return;
        const texto = detalle.map(d => `${d.cantidad} ${d.producto}${d.selecciones ? ` (${d.selecciones.map(s => `${s.cantidad} ${s.opcion}`).join(', ')})` : ''}`).join(' + ');
        addComboToCart(product, detalle, texto);
        showToast(`${product.name} agregado al carrito`, 'success');
        closeProductDetail();
    });
}
