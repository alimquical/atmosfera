/* ============================================================
   Vistas: PLAN MENSUAL y PAGOS
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E;

  /* ============================================================
     PLAN MENSUAL
     ============================================================ */
  App.vistas.plan = function () {
    const p = App.P(), mes = App.MES();
    const r = E.resumen(p, mes);

    let h = '<div class="vista-tit">' +
      '<div><h1>Plan económico mensual</h1><p>Egresos, ingresos y reparto por porcentajes · ' +
      U.mesLargo(mes) + '</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="ir" data-vista="personas">☺ Reparto global</button>' +
      '<button class="btn acento" data-acc="nuevo-ingreso">＋ Ingreso</button>' +
      '<button class="btn primario" data-acc="nuevo-egreso">＋ Egreso</button>' +
      '</div></div>';

    h += '<div class="grid g4">' +
      App.kpi('Total egresos', U.moneda(r.totalEgresos, p), r.nEgresos + ' conceptos', 'naranja') +
      App.kpi('Total ingresos', U.moneda(r.flujoIngresos, p), 'incluye sueldos base', 'verde') +
      App.kpi('Diferencia (ganancia)', U.moneda(r.balance, p),
        r.balance >= 0 ? 'Superávit del hogar' : 'Déficit del hogar', r.balance >= 0 ? 'verde' : 'rojo') +
      App.kpi('Pendiente', U.moneda(r.pendiente, p), U.pct(r.eficienciaPago) + ' cancelado',
        r.pendiente > 0 ? 'rojo' : 'verde') +
      '</div>';

    h += '<div class="tabs mt20">' +
      '<div class="tab' + (App.tabPlan === 'egresos' ? ' activo' : '') + '" data-acc="tab-plan" data-tab="egresos">Egresos / gastos</div>' +
      '<div class="tab' + (App.tabPlan === 'ingresos' ? ' activo' : '') + '" data-acc="tab-plan" data-tab="ingresos">Ingresos</div>' +
      '<div class="tab' + (App.tabPlan === 'resumen' ? ' activo' : '') + '" data-acc="tab-plan" data-tab="resumen">Cuadro resumen</div>' +
      '</div>';

    if (App.tabPlan === 'egresos') h += tablaEgresos(p, mes, r);
    else if (App.tabPlan === 'ingresos') h += tablaIngresos(p, mes, r);
    else h += cuadroResumen(p, mes, r);

    return h;
  };

  function tablaEgresos(p, mes, r) {
    const egresos = E.egresosDe(p, mes);
    const personas = E.personasActivas(p);

    let h = '<div class="card"><div class="card-tit"><span class="ico">-</span> Egresos del período' +
      '<span class="der"><button class="btn mini" data-acc="plantillas">☰ Plantillas frecuentes</button></span></div>';

    if (!egresos.length) {
      return h + App.vacio('Sin egresos en ' + U.mesLargo(mes),
        'Agregá los gastos del hogar: luz, agua, internet, comida, cuotas…',
        '<button class="btn primario" data-acc="nuevo-egreso">＋ Agregar primer egreso</button>') + '</div>';
    }

    h += '<div class="tabla-wrap"><table class="datos"><thead><tr>' +
      '<th>Detalle</th><th>Categoría</th><th>Tipo</th>';
    personas.forEach(x => h += '<th class="num">' + U.esc(x.nombre) + '</th>');
    h += '<th class="num">Valor</th><th>Estado</th><th></th></tr></thead><tbody>';

    egresos.forEach(eg => {
      const d = E.distribucion(p, eg);
      const est = E.estadoEgreso(p, eg);
      h += '<tr>' +
        '<td><b>' + U.esc(eg.detalle) + '</b>' +
        '<div class="muted small">día ' + (eg.dia || '—') +
        (eg.modo === 'manual' ? ' · reparto manual' : ' · reparto automático') + '</div></td>' +
        '<td><span class="chip">' + U.esc(eg.categoria || '—') + '</span></td>' +
        '<td class="small">' + U.esc((E.TIPOS_GASTO.find(t => t.id === (eg.tipoGasto || 'fijo')) || {}).nombre || '') + '</td>';
      d.ids.forEach((id, i) => {
        h += '<td class="num"><span class="pct-pill badge-est b-info">' + d.pcts[i].toFixed(1) + '%</span>' +
          '<div class="small muted">' + U.moneda(d.montos[i], p) + '</div></td>';
      });
      h += '<td class="num"><b>' + U.moneda(U.n(eg.valor), p) + '</b></td>' +
        '<td>' + App.estadoBadge(est.estado) +
        (est.estado !== 'pagado' ? '<div class="small muted">falta ' + U.moneda(est.saldo, p) + '</div>' : '') + '</td>' +
        '<td class="txt-der"><button class="btn mini" data-acc="repartir" data-id="' + eg.id + '" title="Repartir %">%</button> ' +
        '<button class="btn mini" data-acc="editar-egreso" data-id="' + eg.id + '" title="Editar">✎</button> ' +
        '<button class="btn mini peligro" data-acc="borrar-egreso" data-id="' + eg.id + '" title="Eliminar">🗑</button>' +
        '</td></tr>';
    });

    h += '<tr class="total-row"><td>TOTAL EGRESOS</td><td></td><td></td>';
    personas.forEach(x => {
      const b = (r.balancePersonas || {})[x.id] || {};
      h += '<td class="num">' + U.moneda(b.debe || 0, p) + '</td>';
    });
    h += '<td class="num">' + U.moneda(r.totalEgresos, p) + '</td><td colspan="2"></td></tr>';
    h += '</tbody></table></div>';

    h += '<p class="small muted mt14">💡 Cada porcentaje puede corregirse fila por fila con el botón <b>%</b>. ' +
      'Si lo dejás en automático, el sistema aplica <b>' +
      U.esc((E.ESTRATEGIAS.find(x => x.id === (p.config.estrategiaGlobal || 'proporcional')) || {}).nombre) +
      '</b> para que nadie quede con desequilibrio.</p>';
    h += '</div>';
    return h;
  }

  function tablaIngresos(p, mes, r) {
    const ingresos = E.ingresosDe(p, mes);

    let h = '<div class="card"><div class="card-tit"><span class="ico">+</span> Ingresos del período' +
      '<span class="der"><button class="btn mini acento" data-acc="nuevo-ingreso">＋ Agregar</button></span></div>';

    if (!ingresos.length) {
      return h + App.vacio('Sin ingresos registrados',
        'Sumá sueldos, trabajos extra, alquileres o cualquier entrada de dinero.',
        '<button class="btn acento" data-acc="nuevo-ingreso">＋ Agregar ingreso</button>') + '</div>';
    }

    h += '<div class="tabla-wrap"><table class="datos"><thead><tr>' +
      '<th>Detalle</th><th>Categoría</th><th>Responsable</th><th>Día</th><th class="num">Valor</th><th></th>' +
      '</tr></thead><tbody>';
    ingresos.forEach(ig => {
      h += '<tr><td><b>' + U.esc(ig.detalle) + '</b></td>' +
        '<td><span class="chip">' + U.esc(ig.categoria || '—') + '</span></td>' +
        '<td>' + (ig.personaId ? U.esc(E.nombrePersona(p, ig.personaId)) : '<span class="muted">Hogar</span>') + '</td>' +
        '<td>' + (ig.dia || '—') + '</td>' +
        '<td class="num verde-t"><b>' + U.moneda(U.n(ig.valor), p) + '</b></td>' +
        '<td class="txt-der"><button class="btn mini" data-acc="editar-ingreso" data-id="' + ig.id + '">✎</button> ' +
        '<button class="btn mini peligro" data-acc="borrar-ingreso" data-id="' + ig.id + '">🗑</button></td></tr>';
    });
    h += '<tr class="total-row"><td>TOTAL INGRESOS DEL PLAN</td><td></td><td></td><td></td>' +
      '<td class="num">' + U.moneda(r.totalIngresosPlan, p) + '</td><td></td></tr>' +
      '<tr class="sub-row"><td>Sueldos base de las personas</td><td></td><td></td><td></td>' +
      '<td class="num">' + U.moneda(r.sueldos, p) + '</td><td></td></tr>' +
      '<tr class="total-row"><td>FLUJO TOTAL DEL HOGAR</td><td></td><td></td><td></td>' +
      '<td class="num">' + U.moneda(r.flujoIngresos, p) + '</td><td></td></tr>';
    h += '</tbody></table></div></div>';
    return h;
  }

  function cuadroResumen(p, mes, r) {
    const regla = E.regla503020(p, mes);
    const bp = r.balancePersonas;
    const personas = E.personasActivas(p);

    let h = '<div class="grid g2">';

    h += '<div class="card"><div class="card-tit"><span class="ico">▦</span> Egresos por categoría</div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Categoría</th><th class="num">Monto</th><th>%</th></tr></thead><tbody>';
    const cats = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a]);
    if (!cats.length) h += '<tr><td colspan="3" class="muted">Sin datos</td></tr>';
    cats.forEach(c => {
      const share = r.porCategoria[c] / Math.max(.01, r.totalEgresos);
      h += '<tr><td>' + U.esc(c) + '</td><td class="num">' + U.moneda(r.porCategoria[c], p) + '</td>' +
        '<td>' + App.barra(share, 'naranja') + '<span class="small muted">' + U.pct(share) + '</span></td></tr>';
    });
    h += '<tr class="total-row"><td>TOTAL</td><td class="num">' + U.moneda(r.totalEgresos, p) + '</td><td>100%</td></tr>';
    h += '</tbody></table></div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">⚖</span> Cuadro «pago correspondiente a»</div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Concepto</th><th class="num">Valor</th>';
    personas.forEach(x => h += '<th class="num">' + U.esc(x.nombre) + '</th>');
    h += '<th class="num">Total rep.</th></tr></thead><tbody>';
    E.egresosDe(p, mes).forEach(eg => {
      const d = E.distribucion(p, eg);
      h += '<tr><td>' + U.esc(eg.detalle) + '</td><td class="num">' + U.moneda(U.n(eg.valor), p) + '</td>';
      d.montos.forEach(m => h += '<td class="num">' + U.moneda(m, p) + '</td>');
      h += '<td class="num">' + U.moneda(d.montos.reduce((a, b) => a + b, 0), p) + '</td></tr>';
    });
    h += '<tr class="total-row"><td>TOTAL</td><td class="num">' + U.moneda(r.totalEgresos, p) + '</td>';
    personas.forEach(x => h += '<td class="num">' + U.moneda((bp[x.id] || {}).debe || 0, p) + '</td>');
    h += '<td class="num">' + U.moneda(r.totalEgresos, p) + '</td></tr>';
    h += '</tbody></table></div></div>';
    h += '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">🎯</span> Regla 50 / 30 / 20</div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Concepto</th><th class="num">Recomendado</th>' +
      '<th class="num">Real</th><th class="num">Desviación</th></tr></thead><tbody>' +
      filaRegla('Necesidades (50%)', regla.recomendado.necesidades, regla.real.necesidades, regla.desvNecesidades, regla.desvNecesidades > 0) +
      filaRegla('Deseos (30%)', regla.recomendado.deseos, regla.real.deseos, regla.desvDeseos, regla.desvDeseos > 0) +
      filaRegla('Ahorro (20%)', regla.recomendado.ahorro, regla.real.ahorro, regla.desvAhorro, regla.desvAhorro < 0) +
      '</tbody></table></div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">📆</span> Proyección a 12 meses</div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Concepto</th><th class="num">Mensual</th><th class="num">Anual</th></tr></thead><tbody>' +
      '<tr><td>Ingresos</td><td class="num">' + U.moneda(r.flujoIngresos, p) + '</td><td class="num">' + U.moneda(r.anual.ingresos, p) + '</td></tr>' +
      '<tr><td>Egresos</td><td class="num">' + U.moneda(r.totalEgresos, p) + '</td><td class="num">' + U.moneda(r.anual.egresos, p) + '</td></tr>' +
      '<tr class="total-row"><td>Balance</td><td class="num">' + U.moneda(r.balance, p) + '</td><td class="num">' + U.moneda(r.anual.balance, p) + '</td></tr>' +
      '</tbody></table></div></div>';
    h += '</div>';
    return h;
  }

  function filaRegla(cat, rec, real, desv, malo) {
    return '<tr><td>' + cat + '</td><td class="num">' + U.moneda(rec, App.P()) + '</td>' +
      '<td class="num">' + U.moneda(real, App.P()) + '</td>' +
      '<td class="num ' + (malo ? 'rojo-t' : 'verde-t') + '">' + U.moneda(desv, App.P()) + '</td></tr>';
  }

  /* ============================================================
     PAGOS
     ============================================================ */
  App.vistas.pagos = function () {
    const p = App.P(), mes = App.MES();
    const r = E.resumen(p, mes);
    const personas = E.personasActivas(p);
    const bp = r.balancePersonas;
    const egresos = E.egresosDe(p, mes);

    let h = '<div class="vista-tit">' +
      '<div><h1>Control de pagos</h1><p>Cancelá concepto por concepto · ' + U.mesLargo(mes) + '</p></div>' +
      '<div class="acciones">' +
      '<button class="btn verde" data-acc="pagar-todo">✔ Cancelar todo</button>' +
      '<button class="btn" data-acc="sincronizar">⟳ Generar movimientos</button>' +
      '</div></div>';

    h += '<div class="grid g4">' +
      App.kpi('Total del mes', U.moneda(r.totalEgresos, p), r.nEgresos + ' conceptos', 'naranja') +
      App.kpi('Cancelado', U.moneda(r.pagado, p), U.pct(r.eficienciaPago), 'verde') +
      App.kpi('Pendiente', U.moneda(r.pendiente, p), 'por completar', r.pendiente > 0 ? 'rojo' : 'verde') +
      App.kpi('Cumplimiento', U.pct(r.eficienciaPago), r.eficienciaPago >= 1 ? 'Excelente' : 'En progreso',
        r.eficienciaPago >= 1 ? 'verde' : 'naranja') +
      '</div>';

    h += '<div class="card mt20"><div class="card-tit"><span class="ico">☺</span> Saldo de cada miembro' +
      '<span class="der"><select data-chg="filtro-pagos" style="padding:6px 9px;border:1px solid var(--line);border-radius:8px">' +
      '<option value="todos"' + (App.filtroPersonaPagos === 'todos' ? ' selected' : '') + '>Todos los miembros</option>' +
      personas.map(x => '<option value="' + x.id + '"' + (App.filtroPersonaPagos === x.id ? ' selected' : '') + '>' +
        U.esc(x.nombre) + '</option>').join('') +
      '</select></span></div>';

    h += '<div class="grid g' + Math.min(4, Math.max(2, personas.length)) + '">';
    if (!personas.length) h += App.vacio('Sin miembros', 'Agregá personas en «Personas y %».', '');
    personas.forEach(x => {
      const b = bp[x.id] || {};
      const pend = (b.debe || 0) - (b.pagado || 0);
      const pct = b.debe ? b.pagado / b.debe : 1;
      h += '<div class="kpi ' + (pend > 0.004 ? 'rojo' : 'verde') + '">' +
        '<div class="lab"><span class="avatar" style="background:' + x.color + ';width:20px;height:20px;font-size:9px">' +
        U.iniciales(x.nombre) + '</span> ' + U.esc(x.nombre) + '</div>' +
        '<div class="val">' + U.moneda(pend, p) + '</div>' +
        '<div class="sub">debe <b>' + U.moneda(b.debe || 0, p) + '</b> · cancelado <b>' + U.moneda(b.pagado || 0, p) + '</b></div>' +
        '<div class="mt8">' + App.barra(pct, pct >= .999 ? 'verde' : 'naranja') +
        '<span class="small muted">' + U.pct(pct) + ' cancelado</span></div>' +
        (pend > 0.004 ? '<div class="mt8"><button class="btn mini verde campo-ancho" data-acc="pagar-persona" data-per="' +
          x.id + '">✔ Cancelar todo de ' + U.esc(x.nombre) + '</button></div>' : '') +
        '</div>';
    });
    h += '</div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">✓</span> Detalle de cuotas del período' +
      '<span class="der">' + egresos.length + ' conceptos</span></div>';

    if (!egresos.length) {
      h += App.vacio('Sin cuotas', 'No hay egresos en este período.',
        '<button class="btn primario" data-acc="ir" data-vista="plan">Ir al plan</button>') + '</div>';
      return h;
    }

    h += '<div class="tabla-wrap" style="max-height:560px;overflow-y:auto"><table class="datos"><thead><tr>' +
      '<th>Concepto</th><th>Vence</th><th>Miembro</th><th class="num">Cuota</th><th>Estado</th><th>Método / fecha</th><th></th>' +
      '</tr></thead><tbody>';
    let filas = 0;
    egresos.forEach(eg => {
      const d = E.distribucion(p, eg);
      const est = E.estadoEgreso(p, eg);
      d.ids.forEach((id, i) => {
        if (App.filtroPersonaPagos !== 'todos' && App.filtroPersonaPagos !== id) return;
        filas++;
        const pg = E.pagoDe(eg, id);
        const per = E.persona(p, id);
        h += '<tr>' +
          '<td><b>' + U.esc(eg.detalle) + '</b><div class="muted small">' + U.esc(eg.categoria || '') + '</div></td>' +
          '<td>' + (eg.dia ? 'día ' + eg.dia : '—') + '</td>' +
          '<td><div class="flex">' + (per ? App.avatar(per, 24) : '') + U.esc(E.nombrePersona(p, id)) + '</div></td>' +
          '<td class="num"><b>' + U.moneda(d.montos[i], p) + '</b><div class="small muted">' + d.pcts[i].toFixed(1) + '%</div></td>' +
          '<td>' + (pg ? App.estadoBadge('pagado') : App.estadoBadge(est.estado === 'parcial' ? 'parcial' : 'pendiente')) + '</td>' +
          '<td class="small">' + (pg ? U.esc(pg.metodo) + '<div class="muted">' + U.esc(pg.fecha) + '</div>' :
            '<span class="muted">—</span>') + '</td>' +
          '<td class="txt-der">' +
          (pg
            ? '<button class="btn mini" data-acc="editar-pago" data-egr="' + eg.id + '" data-per="' + id + '">✎</button> ' +
            '<button class="btn mini peligro" data-acc="quitar-pago" data-egr="' + eg.id + '" data-per="' + id + '">Reabrir</button>'
            : '<button class="btn mini verde" data-acc="pago" data-egr="' + eg.id + '" data-per="' + id + '">✔ Cancelar</button>') +
          '</td></tr>';
      });
    });
    if (!filas) h += '<tr><td colspan="7" class="muted txt-cen">Sin cuotas para el filtro seleccionado.</td></tr>';
    h += '<tr class="total-row"><td>TOTAL</td><td></td><td></td>' +
      '<td class="num">' + U.moneda(r.totalEgresos, p) + '</td>' +
      '<td>' + U.pct(r.eficienciaPago) + '</td>' +
      '<td class="num">Pagado ' + U.moneda(r.pagado, p) + '</td>' +
      '<td class="num">Debe ' + U.moneda(r.pendiente, p) + '</td></tr>';
    h += '</tbody></table></div></div>';
    return h;
  };

  App.cambios['filtro-pagos'] = function (d, ev, el) {
    App.filtroPersonaPagos = el.value;
    App.render();
  };
})();
