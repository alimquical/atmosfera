/* ============================================================
   Modales de edición y acciones operativas
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E, Store = App.Store;
  const $ = App.$, $$ = App.$$;

  /* ---------- helpers ---------- */
  function selCategorias(clave, valor) {
    const p = App.P();
    const lista = p[clave] || [];
    return '<option value="__nueva__">＋ Nueva categoría…</option>' +
      lista.map(c => '<option' + (c === valor ? ' selected' : '') + '>' + U.esc(c) + '</option>').join('');
  }

  App.cambios['nueva-cat-egr'] = function (d, ev, el) {
    if (el.value !== '__nueva__') return;
    const v = prompt('Nombre de la nueva categoría de egreso:');
    if (v && v.trim()) {
      const p = App.P();
      p.categoriasEgreso.push(v.trim());
      App.guardar();
      const sel = $('#m-egr-cat');
      if (sel) {
        sel.innerHTML = selCategorias('categoriasEgreso', v.trim());
        sel.value = v.trim();
      }
    } else if (el) {
      el.selectedIndex = 1;
    }
  };

  App.cambios['nueva-cat-ing'] = function (d, ev, el) {
    if (el.value !== '__nueva__') return;
    const v = prompt('Nombre de la nueva categoría de ingreso:');
    if (v && v.trim()) {
      const p = App.P();
      p.categoriasIngreso.push(v.trim());
      App.guardar();
      const sel = $('#m-ing-cat');
      if (sel) { sel.innerHTML = selCategorias('categoriasIngreso', v.trim()); sel.value = v.trim(); }
    } else if (el) { el.selectedIndex = 1; }
  };

  App.cambios['nueva-cat-mov'] = function (d, ev, el) {
    if (el.value !== '__nueva__') return;
    const v = prompt('Nombre de la nueva categoría:');
    if (v && v.trim()) {
      App.P().categoriasMov.push(v.trim());
      App.guardar();
      const sel = $('#m-mov-cat');
      if (sel) { sel.innerHTML = selCategorias('categoriasMov', v.trim()); sel.value = v.trim(); }
    } else if (el) { el.selectedIndex = 1; }
  };

  /* ============================================================
     MODAL: EGRESO
     ============================================================ */
  App.acciones['nuevo-egreso'] = () => modalEgreso(null);
  App.acciones['editar-egreso'] = (d) => modalEgreso(d.id);

  function modalEgreso(id) {
    const p = App.P(), mes = App.MES();
    const eg = id ? (p.egresos || []).find(x => x.id === id) : null;
    const personas = E.personasActivas(p);
    const base = eg ? E.distribucion(p, eg) : null;
    const autoPcts = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);

    let cuerpo = '<div class="campo"><label>Detalle / concepto</label>' +
      '<input id="m-egr-detalle" value="' + U.esc(eg ? eg.detalle : '') + '" placeholder="Ej: Luz, Agua, Plan de teléfono, Comida…"></div>' +
      '<div class="campo fila"><div><label>Categoría</label>' +
      '<select id="m-egr-cat" data-chg="nueva-cat-egr">' + selCategorias('categoriasEgreso', eg ? eg.categoria : '') + '</select></div>' +
      '<div><label>Tipo de gasto</label><select id="m-egr-tipo">' +
      E.TIPOS_GASTO.map(t => '<option value="' + t.id + '"' + (eg && (eg.tipoGasto || 'fijo') === t.id ? ' selected' : '') +
        '>' + t.nombre + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo fila">' +
      '<div><label>Valor (' + p.moneda + ')</label><input id="m-egr-valor" type="number" step="0.01" min="0" class="money" value="' +
      (eg ? U.n(eg.valor) : '') + '"></div>' +
      '<div><label>Día de vencimiento</label><input id="m-egr-dia" type="number" min="1" max="31" value="' +
      (eg && eg.dia ? eg.dia : '') + '"></div>' +
      '</div>' +
      '<div class="campo fila">' +
      '<div><label>Mes de aplicación</label><input id="m-egr-mes" type="month" value="' +
      (eg && eg.mes ? eg.mes : mes) + '"></div>' +
      '<div><label>Obligatorio</label><select id="m-egr-oblig">' +
      '<option value="1"' + (!eg || eg.obligatorio !== false ? ' selected' : '') + '>Sí (impostergable)</option>' +
      '<option value="0"' + (eg && eg.obligatorio === false ? ' selected' : '') + '>No (discrecional)</option></select></div>' +
      '</div>';

    cuerpo += '<div class="divisor"></div><div class="campo"><label>Reparto entre miembros</label>' +
      '<div class="flex" style="margin-bottom:9px">' +
      '<span class="chip"><input type="radio" name="m-modo" value="auto"' + (!eg || eg.modo !== 'manual' ? ' checked' : '') +
      '> Automático</span>' +
      '<span class="chip"><input type="radio" name="m-modo" value="manual"' + (eg && eg.modo === 'manual' ? ' checked' : '') +
      '> Manual</span>' +
      '<span class="spacer"></span><button class="btn mini" data-acc="auto-dist-modal">⚡ Sugerir</button></div>';

    cuerpo += '<div class="dist-grid">';
    if (!personas.length) cuerpo += '<p class="muted small">No hay miembros: agregá personas en «Personas y %».</p>';
    personas.forEach((x) => {
      const i = base ? base.ids.indexOf(x.id) : -1;
      const pct = base ? base.pcts[i] : (autoPcts[x.id] || 0);
      const monto = base ? base.montos[i] : 0;
      cuerpo += '<div class="dist-item"><div class="nom">' + App.avatar(x) + U.esc(x.nombre) + '</div>' +
        '<input type="number" step="0.01" min="0" max="100" class="m-dist" data-per="' + x.id + '" value="' + pct + '">' +
        '<div class="res"><span>% →</span><b class="m-monto" data-per="' + x.id + '">' + U.moneda(monto, p) + '</b></div></div>';
    });
    cuerpo += '</div>' +
      '<div class="flex mt8"><span class="muted small">Suma de porcentajes:</span><span class="spacer"></span>' +
      '<b id="m-dist-total">100.00%</b></div>' +
      '<small>Si la suma no es 100%, el sistema la normaliza automáticamente al guardar.</small></div>';

    cuerpo += '<div class="campo mt14"><label>Notas</label><textarea id="m-egr-notas" rows="2">' +
      U.esc(eg ? (eg.notas || '') : '') + '</textarea></div>';

    const pie = '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="guardar-egreso" data-id="' + (eg ? eg.id : '') + '">' +
      (eg ? '💾 Guardar cambios' : '＋ Agregar egreso') + '</button>';

    App.abrirModal((eg ? 'Editar' : 'Nuevo') + ' egreso', cuerpo, pie);
    App.recalcularModalDist();
  }

  App.recalcularModalDist = function () {
    const p = App.P();
    const valorEl = $('#m-egr-valor');
    const valor = U.n(valorEl ? valorEl.value : 0);
    const inputs = $$('.m-dist');
    if (!inputs.length) return;
    const pcts = inputs.map(x => U.n(x.value));
    const total = pcts.reduce((a, b) => a + b, 0);
    const el = $('#m-dist-total');
    if (el) {
      el.textContent = total.toFixed(2) + '%';
      el.style.color = Math.abs(total - 100) < 0.01 ? 'var(--green)' : (total > 100 ? 'var(--red)' : 'var(--amber)');
    }
    if (Math.abs(total - 100) < 0.01 && total > 0) {
      const montos = E.montosDesdePct(valor, pcts);
      $$('.m-monto').forEach(x => {
        const i = inputs.findIndex(y => y.dataset.per === x.dataset.per);
        x.textContent = U.moneda(montos[i] >= 0 ? montos[i] : 0, p);
      });
    } else {
      $$('.m-monto').forEach(x => x.textContent = '—');
    }
  };

  App.acciones['auto-dist-modal'] = function () {
    const p = App.P();
    const sug = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    $$('.m-dist').forEach(x => {
      const v = sug[x.dataset.per];
      if (v !== undefined) x.value = v;
      const r = $$('.m-dist-range').find(y => y.dataset.per === x.dataset.per);
      if (r) r.value = v;
    });
    App.recalcularModalDist();
    App.toast('Reparto automático aplicado', 'ok');
  };

  App.acciones['dist-equitativa'] = function () {
    const per = $$('.m-dist');
    const eq = E.repartoEquitativo(per.length);
    per.forEach((x, i) => {
      x.value = eq[i];
      const r = $$('.m-dist-range').find(y => y.dataset.per === x.dataset.per);
      if (r) r.value = eq[i];
    });
    App.recalcularModalDist();
  };

  App.acciones['dist-normalizar'] = function () {
    const per = $$('.m-dist');
    const arr = E.normalizar(per.map(x => U.n(x.value)));
    per.forEach((x, i) => {
      x.value = arr[i];
      const r = $$('.m-dist-range').find(y => y.dataset.per === x.dataset.per);
      if (r) r.value = arr[i];
    });
    App.recalcularModalDist();
    App.toast('Normalizado a 100%', 'ok');
  };

  App.acciones['guardar-egreso'] = function (d) {
    const p = App.P();
    const detalle = (($('#m-egr-detalle') || {}).value || '').trim();
    const valor = U.n(($('#m-egr-valor') || {}).value);
    if (!detalle) { App.toast('Ingresá el detalle del egreso', 'err'); return; }
    if (valor <= 0) { App.toast('Ingresá un valor mayor a cero', 'err'); return; }

    let cat = ($('#m-egr-cat') || {}).value;
    if (!cat || cat === '__nueva__') cat = 'Otros gastos';
    const modoEl = $$('input[name="m-modo"]').find(x => x.checked);
    const modo = modoEl ? modoEl.value : 'auto';
    const dist = {};
    $$('.m-dist').forEach(x => { dist[x.dataset.per] = Math.max(0, U.n(x.value)); });

    const datos = {
      detalle: detalle,
      categoria: cat,
      tipoGasto: ($('#m-egr-tipo') || {}).value || 'fijo',
      valor: valor,
      dia: U.n(($('#m-egr-dia') || {}).value) || '',
      mes: ($('#m-egr-mes') || {}).value || App.MES(),
      obligatorio: ($('#m-egr-oblig') || {}).value !== '0',
      modo: modo,
      distribucion: modo === 'manual' ? dist : null,
      notas: ($('#m-egr-notas') || {}).value || ''
    };

    if (d.id) {
      const eg = (p.egresos || []).find(x => x.id === d.id);
      Object.assign(eg, datos);
      App.toast('✅ Egreso actualizado', 'ok');
    } else {
      if (!p.egresos) p.egresos = [];
      datos.id = U.uid('egr');
      datos.pagos = [];
      datos.creado = new Date().toISOString();
      p.egresos.push(datos);
      App.toast('✅ Egreso agregado', 'ok');
    }
    App.guardar();
    App.cerrarModal();
    App.render();
  };

  App.acciones['borrar-egreso'] = function (d) {
    const p = App.P();
    const eg = (p.egresos || []).find(x => x.id === d.id);
    if (!eg) return;
    App.abrirModal('Eliminar egreso',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar «' + U.esc(eg.detalle) +
      '»?</b><p>Se eliminarán también sus pagos asociados.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-borrar-egreso" data-id="' + d.id + '">Eliminar</button>');
  };

  App.acciones['confirmar-borrar-egreso'] = function (d) {
    const p = App.P();
    p.egresos = (p.egresos || []).filter(x => x.id !== d.id);
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('Egreso eliminado');
  };

  /* ---------- plantillas ---------- */
  App.acciones.plantillas = function () {
    const p = App.P();
    let cuerpo = '<p class="small muted">Elegí un concepto frecuente. Se agregará al mes activo con valor 0 para que solo completes el importe.</p>' +
      '<div class="dist-grid">';
    E.plantillasEgresos.forEach((t, i) => {
      cuerpo += '<div class="dist-item" style="cursor:pointer" data-acc="usar-plantilla" data-i="' + i + '">' +
        '<div class="nom">＋ ' + U.esc(t.detalle) + '</div>' +
        '<div class="res"><span>' + U.esc(t.categoria) + '</span><b>' +
        ((E.TIPOS_GASTO.find(x => x.id === t.tipoGasto) || {}).nombre || '') + '</b></div></div>';
    });
    cuerpo += '</div>';
    App.abrirModal('Plantillas de egresos frecuentes', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cerrar</button>', true);
  };

  App.acciones['usar-plantilla'] = function (d) {
    const p = App.P();
    const t = E.plantillasEgresos[Number(d.i)];
    if (!t) return;
    App.cerrarModal();
    setTimeout(() => {
      modalEgreso(null);
      setTimeout(() => {
        $('#m-egr-detalle').value = t.detalle;
        $('#m-egr-valor').value = '';
        const sel = $('#m-egr-cat');
        if (sel) {
          if ((p.categoriasEgreso || []).indexOf(t.categoria) < 0) p.categoriasEgreso.push(t.categoria);
          sel.innerHTML = selCategorias('categoriasEgreso', t.categoria);
          sel.value = t.categoria;
        }
        $('#m-egr-tipo').value = t.tipoGasto;
        $('#m-egr-valor').focus();
      }, 60);
    }, 60);
  };

  /* ============================================================
     MODAL: REPARTIR
     ============================================================ */
  App.acciones.repartir = (d) => modalRepartir(d.id);

  function modalRepartir(id) {
    const p = App.P();
    const eg = (p.egresos || []).find(x => x.id === id);
    if (!eg) return;
    const d = E.distribucion(p, eg);
    const personas = E.personasActivas(p);

    let cuerpo = '<p class="small muted">Ajustá el porcentaje que le corresponde a cada miembro para <b>' +
      U.esc(eg.detalle) + '</b> (' + U.moneda(U.n(eg.valor), p) + '). La suma debe ser 100%.</p>' +
      '<div class="dist-grid">';
    personas.forEach((x, i) => {
      const idx = d.ids.indexOf(x.id);
      const pct = idx >= 0 ? d.pcts[idx] : 0;
      const monto = idx >= 0 ? d.montos[idx] : 0;
      cuerpo += '<div class="dist-item"><div class="nom">' + App.avatar(x) + U.esc(x.nombre) + '</div>' +
        '<input type="range" min="0" max="100" step="0.5" class="m-dist-range" data-per="' + x.id + '" value="' + pct + '">' +
        '<input type="number" step="0.01" min="0" max="100" class="m-dist" data-per="' + x.id + '" value="' + pct + '" style="margin-top:6px">' +
        '<div class="res"><span>Cuota</span><b class="m-monto" data-per="' + x.id + '">' + U.moneda(monto, p) + '</b></div></div>';
    });
    cuerpo += '</div>' +
      '<div class="flex mt14"><span class="muted small">Suma:</span><span class="spacer"></span>' +
      '<b id="m-dist-total" style="font-size:16px">100.00%</b></div>' +
      '<div class="flex mt8" style="gap:8px">' +
      '<button class="btn mini" data-acc="auto-dist-modal">⚡ Automático</button>' +
      '<button class="btn mini" data-acc="dist-equitativa">↔ Equitativo</button>' +
      '<button class="btn mini" data-acc="dist-normalizar">⇒ Normalizar a 100%</button></div>';

    App.abrirModal('Reparto de «' + U.esc(eg.detalle) + '»', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="guardar-reparto" data-id="' + eg.id + '">💾 Guardar reparto</button>');
    App.recalcularModalDist();
  }

  App.acciones['guardar-reparto'] = function (d) {
    const p = App.P();
    const eg = (p.egresos || []).find(x => x.id === d.id);
    if (!eg) return;
    const dist = {};
    $$('.m-dist').forEach(x => { dist[x.dataset.per] = Math.max(0, U.n(x.value)); });
    const suma = Object.keys(dist).reduce((a, k) => a + dist[k], 0);
    if (suma <= 0) { App.toast('Asigná al menos un porcentaje', 'err'); return; }
    eg.modo = 'manual';
    eg.distribucion = dist;
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('✅ Reparto guardado (suma ' + suma.toFixed(2) + '%, se normaliza a 100%)', 'ok');
  };

  /* ============================================================
     MODAL: INGRESO
     ============================================================ */
  App.acciones['nuevo-ingreso'] = () => modalIngreso(null);
  App.acciones['editar-ingreso'] = (d) => modalIngreso(d.id);

  function modalIngreso(id) {
    const p = App.P(), mes = App.MES();
    const ig = id ? (p.ingresos || []).find(x => x.id === id) : null;
    const personas = E.personasActivas(p);

    const cuerpo = '<div class="campo"><label>Detalle / concepto</label>' +
      '<input id="m-ing-detalle" value="' + U.esc(ig ? ig.detalle : '') + '" placeholder="Ej: Salario, Trabajo extra, Alquiler…"></div>' +
      '<div class="campo fila">' +
      '<div><label>Categoría</label><select id="m-ing-cat" data-chg="nueva-cat-ing">' +
      selCategorias('categoriasIngreso', ig ? ig.categoria : '') + '</select></div>' +
      '<div><label>Responsable</label><select id="m-ing-per">' +
      '<option value="">— Hogar (común) —</option>' +
      personas.map(x => '<option value="' + x.id + '"' + (ig && ig.personaId === x.id ? ' selected' : '') + '>' +
        U.esc(x.nombre) + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo fila">' +
      '<div><label>Valor (' + p.moneda + ')</label><input id="m-ing-valor" type="number" step="0.01" min="0" class="money" value="' +
      (ig ? U.n(ig.valor) : '') + '"></div>' +
      '<div><label>Día</label><input id="m-ing-dia" type="number" min="1" max="31" value="' +
      (ig && ig.dia ? ig.dia : 1) + '"></div>' +
      '</div>' +
      '<div class="campo fila">' +
      '<div><label>Mes</label><input id="m-ing-mes" type="month" value="' + (ig && ig.mes ? ig.mes : mes) + '"></div>' +
      '<div><label>Medio / lugar</label><select id="m-ing-lugar">' +
      p.metodos.map(m => '<option' + (ig && ig.lugar === m ? ' selected' : '') + '>' + U.esc(m) + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo"><label>Notas</label><textarea id="m-ing-notas" rows="2">' +
      U.esc(ig ? (ig.notas || '') : '') + '</textarea></div>';

    App.abrirModal((ig ? 'Editar' : 'Nuevo') + ' ingreso', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn acento" data-acc="guardar-ingreso" data-id="' + (ig ? ig.id : '') + '">' +
      (ig ? '💾 Guardar cambios' : '＋ Agregar ingreso') + '</button>');
  }

  App.acciones['guardar-ingreso'] = function (d) {
    const p = App.P();
    const detalle = (($('#m-ing-detalle') || {}).value || '').trim();
    const valor = U.n(($('#m-ing-valor') || {}).value);
    if (!detalle) { App.toast('Ingresá el detalle', 'err'); return; }
    if (valor <= 0) { App.toast('Ingresá un valor mayor a cero', 'err'); return; }
    let cat = ($('#m-ing-cat') || {}).value;
    if (!cat || cat === '__nueva__') cat = 'Otros ingresos';

    const datos = {
      detalle: detalle,
      categoria: cat,
      personaId: ($('#m-ing-per') || {}).value || null,
      valor: valor,
      dia: U.n(($('#m-ing-dia') || {}).value) || 1,
      mes: ($('#m-ing-mes') || {}).value || App.MES(),
      lugar: ($('#m-ing-lugar') || {}).value || 'Virtual',
      notas: ($('#m-ing-notas') || {}).value || ''
    };
    datos.fecha = datos.mes + '-' + String(datos.dia).padStart(2, '0');

    if (d.id) {
      const ig = (p.ingresos || []).find(x => x.id === d.id);
      Object.assign(ig, datos);
      App.toast('✅ Ingreso actualizado', 'ok');
    } else {
      if (!p.ingresos) p.ingresos = [];
      datos.id = U.uid('ing');
      p.ingresos.push(datos);
      App.toast('✅ Ingreso agregado', 'ok');
    }
    App.guardar();
    App.cerrarModal();
    App.render();
  };

  App.acciones['borrar-ingreso'] = function (d) {
    const p = App.P();
    p.ingresos = (p.ingresos || []).filter(x => x.id !== d.id);
    App.guardar();
    App.render();
    App.toast('Ingreso eliminado');
  };

  /* ============================================================
     PAGOS
     ============================================================ */
  App.acciones.pago = (d) => modalPago(d.egr, d.per);
  App.acciones['editar-pago'] = (d) => modalPago(d.egr, d.per);

  function modalPago(egrId, perId) {
    const p = App.P();
    const eg = (p.egresos || []).find(x => x.id === egrId);
    if (!eg) return;
    const cuota = E.cuotas(p, eg)[perId] || 0;
    const existente = E.pagoDe(eg, perId);

    const cuerpo = '<div class="alerta n-info"><div class="a-ico">ℹ️</div><div>' +
      '<b class="t">' + U.esc(eg.detalle) + ' — ' + U.esc(E.nombrePersona(p, perId)) + '</b>' +
      '<p>Cuota asignada: <b>' + U.moneda(cuota, p) + '</b> · vencimiento: día ' + (eg.dia || '—') + '</p></div></div>' +
      '<div class="campo fila">' +
      '<div><label>Monto cancelado (' + p.moneda + ')</label><input id="m-pago-monto" type="number" step="0.01" min="0" class="money" value="' +
      (existente ? existente.monto : cuota) + '"></div>' +
      '<div><label>Fecha de pago</label><input id="m-pago-fecha" type="date" value="' +
      (existente ? existente.fecha : U.hoy()) + '"></div>' +
      '</div>' +
      '<div class="campo fila">' +
      '<div><label>Método</label><select id="m-pago-metodo">' +
      p.metodos.map(m => '<option' + ((existente ? existente.metodo : 'Efectivo') === m ? ' selected' : '') + '>' +
        U.esc(m) + '</option>').join('') +
      '</select></div>' +
      '<div><label>Referencia / comprobante</label><input id="m-pago-ref" value="' +
      U.esc(existente ? existente.referencia : '') + '" placeholder="N° comprobante, transferencia…"></div>' +
      '</div>' +
      '<div class="campo"><label>Notas</label><textarea id="m-pago-notas" rows="2">' +
      U.esc(existente ? existente.notas : '') + '</textarea></div>';

    App.abrirModal((existente ? 'Editar' : 'Cancelar') + ' pago', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn verde" data-acc="guardar-pago" data-egr="' + egrId + '" data-per="' + perId + '">' +
      (existente ? '💾 Actualizar pago' : '✔ Confirmar cancelación') + '</button>');
  }

  App.acciones['guardar-pago'] = function (d) {
    const p = App.P();
    E.marcarPago(p, d.egr, d.per, {
      monto: U.n(($('#m-pago-monto') || {}).value),
      fecha: ($('#m-pago-fecha') || {}).value || U.hoy(),
      metodo: ($('#m-pago-metodo') || {}).value || 'Efectivo',
      referencia: ($('#m-pago-ref') || {}).value || '',
      notas: ($('#m-pago-notas') || {}).value || ''
    });
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('✅ Pago registrado', 'ok');
  };

  App.acciones['quitar-pago'] = function (d) {
    const p = App.P();
    E.marcarPago(p, d.egr, d.per, { quitar: true });
    App.guardar();
    App.render();
    App.toast('Cuota reabierta');
  };

  App.acciones['pagar-persona'] = function (d) {
    const p = App.P(), mes = App.MES();
    const egresos = E.egresosDe(p, mes);
    let n = 0;
    egresos.forEach(eg => {
      if (!E.pagoDe(eg, d.per)) {
        E.marcarPago(p, eg.id, d.per, {});
        n++;
      }
    });
    App.guardar();
    App.render();
    App.toast('✅ ' + n + ' cuota(s) cancelada(s) por ' + E.nombrePersona(p, d.per), 'ok');
  };

  App.acciones['pagar-todo'] = function () {
    const p = App.P(), mes = App.MES();
    const egresos = E.egresosDe(p, mes);
    const pend = [];
    egresos.forEach(eg => {
      const cuotas = E.cuotas(p, eg);
      Object.keys(cuotas).forEach(pid => { if (!E.pagoDe(eg, pid)) pend.push({ egr: eg, pid: pid, monto: cuotas[pid] }); });
    });
    if (!pend.length) { App.toast('Todo está cancelado', 'ok'); return; }

    const filas = pend.map(x =>
      '<tr><td>' + U.esc(x.egr.detalle) + '</td><td>' + U.esc(E.nombrePersona(p, x.pid)) + '</td>' +
      '<td class="num">' + U.moneda(x.monto, p) + '</td></tr>').join('');

    App.abrirModal('Cancelar todos los pagos pendientes',
      '<div class=\"alerta n-info\"><div class=\"a-ico\">✔</div><div><b class=\"t\">' + pend.length +
      ' cuota(s) pendiente(s) por ' + U.moneda(pend.reduce((a, x) => a + x.monto, 0), p) + '</b>' +
      '<p>Se registrarán como canceladas hoy con método «Efectivo».</p></div></div>' +
      '<div class="campo"><label>Fecha de pago</label><input id="m-pago-masivo-fecha" type="date" value="' + U.hoy() + '"></div>' +
      '<div class="campo"><label>Método</label><select id="m-pago-masivo-metodo">' +
      p.metodos.map(m => '<option>' + U.esc(m) + '</option>').join('') + '</select></div>' +
      '<div class="tabla-wrap" style="max-height:240px;overflow-y:auto"><table class="datos"><thead><tr>' +
      '<th>Concepto</th><th>Miembro</th><th class="num">Cuota</th></tr></thead><tbody>' + filas + '</tbody></table></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn verde" data-acc="confirmar-pagar-todo">✔ Confirmar todos los pagos</button>', true);
  };

  App.acciones['confirmar-pagar-todo'] = function () {
    const p = App.P(), mes = App.MES();
    const fecha = ($('#m-pago-masivo-fecha') || {}).value || U.hoy();
    const metodo = ($('#m-pago-masivo-metodo') || {}).value || 'Efectivo';
    let n = 0;
    E.egresosDe(p, mes).forEach(eg => {
      const cuotas = E.cuotas(p, eg);
      Object.keys(cuotas).forEach(pid => {
        if (!E.pagoDe(eg, pid)) { E.marcarPago(p, eg.id, pid, { fecha: fecha, metodo: metodo }); n++; }
      });
    });
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('✅ ' + n + ' cuota(s) cancelada(s)', 'ok');
  };

  /* ============================================================
     PERSONAS
     ============================================================ */
  App.acciones['nueva-persona'] = () => modalPersona(null);
  App.acciones['editar-persona'] = (d) => modalPersona(d.id);

  function modalPersona(id) {
    const p = App.P();
    const x = id ? E.persona(p, id) : null;
    const cuerpo = '<div class="campo"><label>Nombre</label>' +
      '<input id="m-per-nombre" value="' + U.esc(x ? x.nombre : '') + '" placeholder="Ej: MIGUEL"></div>' +
      '<div class="campo fila">' +
      '<div><label>Ingreso mensual (' + p.moneda + ')</label><input id="m-per-ingreso" type="number" step="0.01" min="0" class="money" value="' +
      (x ? x.ingreso : '') + '"></div>' +
      '<div><label>Rol / parentesco</label><input id="m-per-rol" value="' + U.esc(x ? (x.rol || '') : '') +
      '" placeholder="Ej: Cónyuge, Hijo…"></div>' +
      '</div>' +
      '<div class="campo"><label>Color</label><input id="m-per-color" type="color" value="' +
      (x ? x.color : '#2563EB') + '"></div>' +
      '<div class="alerta n-info"><div class="a-ico">💡</div><div><b class="t">Cálculo automático equilibrado</b>' +
      '<p>Al guardar, el sistema recalcula el porcentaje de reparto de todos los gastos proporcionalmente al ingreso de cada miembro. ' +
      'Así, aunque una persona gane más o menos, todos asumen el mismo esfuerzo relativo y no hay desequilibrio.</p></div></div>';

    App.abrirModal((x ? 'Editar' : 'Nueva') + ' persona', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="guardar-persona" data-id="' + (id || '') + '">' +
      (x ? '💾 Guardar' : '＋ Agregar persona') + '</button>');
  }

  App.acciones['guardar-persona'] = function (d) {
    const p = App.P();
    const nombre = (($('#m-per-nombre') || {}).value || '').trim();
    if (!nombre) { App.toast('Ingresá el nombre', 'err'); return; }
    const ingreso = U.n(($('#m-per-ingreso') || {}).value);
    const rol = (($('#m-per-rol') || {}).value || '').trim();
    const color = ($('#m-per-color') || {}).value || '#2563EB';

    if (d.id) {
      const x = E.persona(p, d.id);
      x.nombre = nombre; x.ingreso = ingreso; x.rol = rol; x.color = color;
      App.toast('✅ Persona actualizada', 'ok');
    } else {
      p.personas.push({ id: U.uid('per'), nombre: nombre, ingreso: ingreso, rol: rol, color: color, activo: true, notas: '' });
      App.toast('✅ Persona agregada. Se recalcularon los porcentajes', 'ok');
    }
    p.config.porcentajes = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    App.guardar();
    App.cerrarModal();
    App.render();
  };

  App.acciones['borrar-persona'] = function (d) {
    const p = App.P();
    const x = E.persona(p, d.id);
    if (!x) return;
    App.abrirModal('Eliminar persona',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar a ' + U.esc(x.nombre) +
      '?</b><p>Sus cuotas se recalcularán entre los miembros restantes.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-borrar-persona" data-id="' + d.id + '">Eliminar</button>');
  };

  App.acciones['confirmar-borrar-persona'] = function (d) {
    const p = App.P();
    p.personas = (p.personas || []).filter(x => x.id !== d.id);
    (p.egresos || []).forEach(eg => {
      if (eg.distribucion) delete eg.distribucion[d.id];
      if (eg.pagos) eg.pagos = eg.pagos.filter(pg => pg.personaId !== d.id);
    });
    (p.ingresos || []).forEach(ig => { if (ig.personaId === d.id) ig.personaId = null; });
    if (p.config.porcentajes) delete p.config.porcentajes[d.id];
    p.config.porcentajes = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('Persona eliminada y reparto recalculado', 'ok');
  };

  App.acciones['auto-pct'] = function () {
    const p = App.P();
    p.config.porcentajes = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    (p.egresos || []).forEach(eg => { if (eg.modo !== 'manual') eg.distribucion = null; });
    App.guardar();
    App.render();
    const d = E.distribucion(p, { valor: 100 });
    App.toast('✅ % recalculados: ' + d.ids.map((id, i) => d.nombres[i] + ' ' + d.pcts[i].toFixed(1) + '%').join(' · '), 'ok');
  };

  App.acciones['set-estrategia'] = function (d) {
    const p = App.P();
    p.config.estrategiaGlobal = d.id;
    p.config.porcentajes = E.porcentajesSugeridos(p, d.id);
    (p.egresos || []).forEach(eg => { if (eg.modo !== 'manual') eg.distribucion = null; });
    App.guardar();
    App.render();
    App.toast('Estrategia cambiada a: ' + (E.ESTRATEGIAS.find(x => x.id === d.id) || {}).nombre, 'ok');
  };

  App.acciones['aplicar-pct-manual'] = function (d) {
    const p = App.P();
    const el = App.$('#pctm-' + d.id);
    if (!el) return;
    const nuevo = Math.max(0, U.n(el.value));
    const ids = E.personasActivas(p).map(x => x.id);
    const actuales = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    const pesos = ids.map(id => id === d.id ? nuevo : (actuales[id] || 0));
    const norm = E.normalizar(pesos);
    const out = {};
    ids.forEach((id, i) => out[id] = norm[i]);
    p.config.porcentajes = out;
    p.config.estrategiaGlobal = 'necesidad';
    (p.egresos || []).forEach(eg => { if (eg.modo !== 'manual') eg.distribucion = null; });
    App.guardar();
    App.render();
    App.toast('✅ % aplicado: ' + ids.map((id, i) => E.nombrePersona(p, id) + ' ' + norm[i].toFixed(1) + '%').join(' · '), 'ok');
  };

  /* ============================================================
     MOVIMIENTOS
     ============================================================ */
  App.acciones['nuevo-mov'] = function () {
    const p = App.P();
    const cuerpo = '<div class="campo fila">' +
      '<div><label>Fecha</label><input id="m-mov-fecha" type="date" value="' + U.hoy() + '"></div>' +
      '<div><label>Tipo</label><select id="m-mov-tipo"><option>Egreso</option><option>Ingreso</option></select></div>' +
      '</div>' +
      '<div class="campo"><label>Descripción</label><input id="m-mov-desc" placeholder="Ej: Mercado semanal"></div>' +
      '<div class="campo fila">' +
      '<div><label>Categoría</label><select id="m-mov-cat" data-chg="nueva-cat-mov">' +
      selCategorias('categoriasMov', '') + '</select></div>' +
      '<div><label>Lugar</label><select id="m-mov-lugar">' +
      ['Efectivo', 'Virtual'].map(m => '<option>' + m + '</option>').join('') + '</select></div>' +
      '</div>' +
      '<div class="campo"><label>Cantidad (' + p.moneda + ') — usá valor negativo para egreso si lo preferís</label>' +
      '<input id="m-mov-cant" type="number" step="0.01" class="money" placeholder="0.00"></div>';

    App.abrirModal('Nuevo movimiento', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="guardar-mov">＋ Agregar</button>');
  };

  App.acciones['guardar-mov'] = function () {
    const p = App.P();
    const desc = (($('#m-mov-desc') || {}).value || '').trim();
    const cant = U.n(($('#m-mov-cant') || {}).value);
    if (!desc) { App.toast('Ingresá una descripción', 'err'); return; }
    if (!cant) { App.toast('Ingresá un valor distinto de cero', 'err'); return; }
    let cat = ($('#m-mov-cat') || {}).value;
    if (!cat || cat === '__nueva__') cat = 'Otros gastos';
    const tipo = ($('#m-mov-tipo') || {}).value || 'Egreso';
    const v = tipo === 'Ingreso' ? Math.abs(cant) : -Math.abs(cant);

    if (!p.movimientos) p.movimientos = [];
    p.movimientos.push({
      id: U.uid('mov'),
      fecha: ($('#m-mov-fecha') || {}).value || U.hoy(),
      descripcion: desc,
      categoria: cat,
      cantidad: v,
      tipo: tipo,
      lugar: ($('#m-mov-lugar') || {}).value || 'Efectivo'
    });
    p.movimientos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('✅ Movimiento agregado', 'ok');
  };

  App.acciones['borrar-mov'] = function (d) {
    const p = App.P();
    p.movimientos = (p.movimientos || []).filter(m => m.id !== d.id);
    App.guardar();
    App.render();
    App.toast('Movimiento eliminado');
  };

  App.acciones['sincronizar'] = function () {
    const p = App.P(), mes = App.MES();
    try {
      const n = E.sincronizarMovimientos(p, mes);
      App.guardar();
      App.render();
      App.toast(n > 0 ? '✅ ' + n + ' movimiento(s) generado(s) desde el plan' : 'Todo sincronizado', 'ok');
    } catch (e) {
      console.error(e);
      App.toast('Error al sincronizar: ' + e.message, 'err');
    }
  };

  /* ============================================================
     NUEVO PROYECTO
     ============================================================ */
  App.acciones['nuevo-proyecto'] = function () {
    let filas = '';
    for (let i = 1; i <= 4; i++) {
      filas += '<div class="campo fila"><div><input class="p-nombre" placeholder="Miembro ' + i + '"' +
        (i <= 2 ? ' value="' + (i === 1 ? '' : '') + '"' : '') + '></div>' +
        '<div><input class="p-ingreso money" type="number" step="0.01" min="0" placeholder="Ingreso mensual"></div></div>';
    }

    const cuerpo = '<div class="alerta n-info"><div class="a-ico">🏠</div><div>' +
      '<b class="t">Proyecto nuevo = nueva carpeta de datos</b>' +
      '<p>Cada hogar o negocio queda aislado con sus propias personas, ingresos, egresos, pagos y reportes. ' +
      'Ideal para ofrecer el servicio a otros clientes.</p></div></div>' +
      '<div class="campo"><label>Nombre del proyecto / hogar</label>' +
      '<input id="m-proy-nombre" placeholder="Ej: Hogar de los García"></div>' +
      '<div class="campo fila"><div><label>Responsable</label><input id="m-proy-prop" placeholder="Nombre"></div>' +
      '<div><label>Ciudad</label><input id="m-proy-ciudad" placeholder="Ej: Quito"></div></div>' +
      '<div class="campo fila"><div><label>País</label><input id="m-proy-pais" value="Ecuador"></div>' +
      '<div><label>Moneda</label><select id="m-proy-moneda">' +
      ['USD', 'EUR', 'MXN', 'COP', 'PEN', 'ARS', 'CLP', 'BRL', 'GTQ'].map(m => '<option>' + m + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo"><label>Estrategia de reparto</label><select id="m-proy-estr">' +
      E.ESTRATEGIAS.map(s => '<option value="' + s.id + '">' + s.nombre + '</option>').join('') + '</select></div>' +
      '<div class="divisor"></div>' +
      '<div class="campo"><label>Miembros iniciales (podés agregar más después)</label>' + filas +
      '<small>Si dejás los ingresos, el sistema reparte 50/50; si los completás, reparte proporcionalmente.</small></div>' +
      '<div class="campo"><label>¿Cargar el plan de ejemplo?</label>' +
      '<select id="m-proy-demo"><option value="0">No, empezar de cero</option>' +
      '<option value="1">Sí, copiar egresos e ingresos del proyecto actual</option></select></div>';

    App.abrirModal('Crear proyecto nuevo', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn acento" data-acc="guardar-proyecto">＋ Crear proyecto</button>', true);
    setTimeout(() => { const i = App.$('#m-proy-nombre'); if (i) i.focus(); }, 80);
  };

  App.acciones['guardar-proyecto'] = function () {
    const nombre = ((App.$('#m-proy-nombre') || {}).value || '').trim();
    if (!nombre) { App.toast('Ingresá el nombre del proyecto', 'err'); return; }

    const nombres = $$('.p-nombre').map(x => x.value.trim()).filter(Boolean);
    const ingresos = $$('.p-ingreso').map(x => U.n(x.value));
    const personas = nombres.map((n, i) => ({ nombre: n, ingreso: ingresos[i] || 0 }));
    if (!personas.length) personas.push({ nombre: 'Miembro 1', ingreso: 0 });

    const copiar = (App.$('#m-proy-demo') || {}).value === '1';
    const src = App.P();

    const nuevo = Store.crear({
      nombre: nombre,
      propietario: (App.$('#m-proy-prop') || {}).value || '',
      ciudad: (App.$('#m-proy-ciudad') || {}).value || '',
      pais: (App.$('#m-proy-pais') || {}).value || '',
      moneda: (App.$('#m-proy-moneda') || {}).value || 'USD',
      estrategiaGlobal: (App.$('#m-proy-estr') || {}).value || 'proporcional',
      personas: personas,
      copiarEgresos: copiar ? (src.egresos || []).map(e => {
        const c = JSON.parse(JSON.stringify(e));
        c.id = U.uid('egr'); c.pagos = []; c.distribucion = null; c.modo = 'auto';
        return c;
      }) : [],
      copiarIngresos: copiar ? (src.ingresos || []).map(e => {
        const c = JSON.parse(JSON.stringify(e));
        c.id = U.uid('ing');
        return c;
      }) : []
    });

    App.cerrarModal();
    App.chat = [];
    App.navegar('panel');
    App.toast('✅ Proyecto «' + nuevo.nombre + '» creado', 'ok');
  };
})();
