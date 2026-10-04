/* ============================================================
   Vistas: MOVIMIENTOS y PERSONAS / PORCENTAJES
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E;

  /* ============================================================
     MOVIMIENTOS
     ============================================================ */
  App.vistas.movimientos = function () {
    const p = App.P(), mes = App.MES();
    const todos = p.movimientos || [];
    const rm = E.resumenMovimientos(p, mes);
    const f = App.filtrosMov;

    const filtrados = todos.filter(m => {
      if (U.mesDeFecha(m.fecha) !== mes) return false;
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.categoria && m.categoria !== f.categoria) return false;
      if (f.lugar && (m.lugar || 'Efectivo') !== f.lugar) return false;
      if (f.texto) {
        const t = ((m.descripcion || '') + ' ' + (m.categoria || '')).toLowerCase();
        if (t.indexOf(f.texto.toLowerCase()) < 0) return false;
      }
      return true;
    }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

    const cats = Array.from(new Set(todos.map(m => m.categoria).filter(Boolean)));

    let h = '<div class="vista-tit">' +
      '<div><h1>Registro de movimientos</h1><p>Libro de ingresos y egresos · ' + U.mesLargo(mes) + '</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="sincronizar">⟳ Desde el plan</button>' +
      '<button class="btn primario" data-acc="nuevo-mov">＋ Movimiento</button>' +
      '</div></div>';

    h += '<div class="grid g4">' +
      App.kpi('Ingresos', U.moneda(rm.ingresos, p), rm.n + ' movimientos', 'verde') +
      App.kpi('Egresos', U.moneda(rm.egresos, p), 'salidas del período', 'naranja') +
      App.kpi('Posición neta', U.moneda(rm.posicionNeta, p),
        rm.posicionNeta >= 0 ? 'Positiva' : 'Negativa', rm.posicionNeta >= 0 ? 'verde' : 'rojo') +
      App.kpi('Efectivo / Virtual', U.moneda(rm.porLugar.Efectivo, p) + ' · ' + U.moneda(rm.porLugar.Virtual, p),
        'origen del dinero', 'morado') +
      '</div>';

    h += '<div class="card mt20"><div class="flex flex-wrap">' +
      '<input placeholder="🔍 Buscar descripción…" data-chg="f-mov-texto" value="' + U.esc(f.texto) + '" ' +
      'style="padding:9px 12px;border:1.5px solid var(--line);border-radius:9px;min-width:210px">' +
      '<select data-chg="f-mov-tipo"><option value="">Todos los tipos</option>' +
      ['Ingreso', 'Egreso'].map(t => '<option' + (f.tipo === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<select data-chg="f-mov-cat"><option value="">Todas las categorías</option>' +
      cats.map(c => '<option' + (f.categoria === c ? ' selected' : '') + '>' + U.esc(c) + '</option>').join('') + '</select>' +
      '<select data-chg="f-mov-lugar"><option value="">Todos los lugares</option>' +
      ['Efectivo', 'Virtual'].map(t => '<option' + (f.lugar === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<span class="spacer"></span><span class="chip">' + filtrados.length + ' resultado(s)</span>' +
      '</div>';

    if (!filtrados.length) {
      h += App.vacio('Sin movimientos', 'No hay registros que coincidan con el filtro en ' + U.mesLargo(mes) + '.',
        '<button class="btn primario" data-acc="nuevo-mov">＋ Nuevo movimiento</button>');
    } else {
      h += '<div class="tabla-wrap mt14" style="max-height:520px;overflow-y:auto"><table class="datos"><thead><tr>' +
        '<th>Fecha</th><th>Descripción</th><th>Categoría</th><th class="num">Cantidad ($)</th><th>Tipo</th><th>Lugar</th><th></th>' +
        '</tr></thead><tbody>';
      filtrados.forEach(m => {
        const v = U.n(m.cantidad);
        h += '<tr><td>' + U.esc(m.fecha) + '</td><td><b>' + U.esc(m.descripcion) + '</b></td>' +
          '<td><span class="chip">' + U.esc(m.categoria || '—') + '</span></td>' +
          '<td class="num ' + (v >= 0 ? 'verde-t' : 'rojo-t') + '"><b>' + U.moneda(v, p) + '</b></td>' +
          '<td>' + (m.tipo === 'Ingreso'
            ? '<span class="badge-est b-ok">Ingreso</span>'
            : '<span class="badge-est b-pendiente">Egreso</span>') + '</td>' +
          '<td><span class="chip">' + U.esc(m.lugar || 'Efectivo') + '</span></td>' +
          '<td class="txt-der"><button class="btn mini peligro" data-acc="borrar-mov" data-id="' + m.id + '">🗑</button></td></tr>';
      });
      h += '<tr class="total-row"><td>TOTAL INGRESO</td><td colspan="2"></td>' +
        '<td class="num">' + U.moneda(rm.ingresos, p) + '</td><td colspan="3"></td></tr>' +
        '<tr class="total-row"><td>TOTAL EGRESO</td><td colspan="2"></td>' +
        '<td class="num">' + U.moneda(-rm.egresos, p) + '</td><td colspan="3"></td></tr>' +
        '<tr class="total-row"><td>POSICIÓN NETA</td><td colspan="2"></td>' +
        '<td class="num">' + U.moneda(rm.posicionNeta, p) + '</td><td colspan="3"></td></tr>';
      h += '</tbody></table></div>';
    }
    h += '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">◔</span> Análisis por categoría</div>' +
      '<div class="canvas-wrap tall"><canvas id="chMovCat"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">⏱</span> Análisis de tiempo (12 meses)</div>' +
      '<div class="canvas-wrap tall"><canvas id="chMovTiempo"></canvas></div></div>' +
      '</div>';

    return h;
  };

  App.vistas.post_movimientos = function () {
    const p = App.P(), mes = App.MES();
    const rm = E.resumenMovimientos(p, mes);
    const P = App.PALETA;
    const cats = Object.keys(rm.porCategoria).sort((a, b) => rm.porCategoria[b] - rm.porCategoria[a]);

    App.chart('chMovCat', {
      type: 'bar',
      data: {
        labels: cats.length ? cats : ['—'],
        datasets: [{
          label: 'Suma de cantidad ($)',
          data: cats.length ? cats.map(c => rm.porCategoria[c]) : [0],
          backgroundColor: cats.map((c, i) => P[i % P.length]), borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => U.moneda(c.parsed.x, p) } } },
        scales: { x: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, y: { grid: { display: false } } }
      }
    });

    const ser = E.serieMovimientos(p, 12);
    App.chart('chMovTiempo', {
      type: 'line',
      data: {
        labels: ser.map(s => s.etiqueta),
        datasets: [
          { label: 'Ingresos', data: ser.map(s => s.ingresos), borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,.14)', fill: true, tension: .35, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Egresos', data: ser.map(s => s.egresos), borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,.14)', fill: true, tension: .35, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Neta', data: ser.map(s => s.balance), borderColor: '#2563EB', borderDash: [6, 4], tension: .35, borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + U.moneda(c.parsed.y, p) } } },
        scales: { y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    });
  };

  App.cambios['f-mov-texto'] = function (d, ev, el) { App.filtrosMov.texto = el.value; App.render(); };
  App.cambios['f-mov-tipo'] = function (d, ev, el) { App.filtrosMov.tipo = el.value; App.render(); };
  App.cambios['f-mov-cat'] = function (d, ev, el) { App.filtrosMov.categoria = el.value; App.render(); };
  App.cambios['f-mov-lugar'] = function (d, ev, el) { App.filtrosMov.lugar = el.value; App.render(); };

  /* ============================================================
     PERSONAS Y PORCENTAJES
     ============================================================ */
  App.vistas.personas = function () {
    const p = App.P(), mes = App.MES();
    const personas = E.personasActivas(p);
    const r = E.resumen(p, mes);
    const bp = r.balancePersonas;
    const sugeridos = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);
    const estrategia = p.config.estrategiaGlobal || 'proporcional';

    let h = '<div class="vista-tit">' +
      '<div><h1>Personas y porcentajes</h1><p>Distribución equilibrada de la carga económica del hogar</p></div>' +
      '<div class="acciones">' +
      '<button class="btn verde" data-acc="auto-pct">⚡ Recalcular % automáticos</button>' +
      '<button class="btn acento" data-acc="nueva-persona">＋ Agregar persona</button>' +
      '</div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">⚙</span> Estrategia de reparto global' +
      '<span class="der">define cómo se calcula cada cuota en automático</span></div><div class="grid g3">';
    E.ESTRATEGIAS.forEach(s => {
      h += '<div class="proy-card" style="cursor:pointer;' +
        (estrategia === s.id ? 'border-color:var(--accent);box-shadow:0 0 0 3px rgba(249,115,22,.13)' : '') +
        '" data-acc="set-estrategia" data-id="' + s.id + '">' +
        '<div class="ico">' + (estrategia === s.id ? '✓' : '◌') + '</div><div>' +
        '<h4>' + s.nombre + '</h4><div class="meta">' + s.desc + '</div></div></div>';
    });
    h += '</div>';

    h += '<p class="small muted mt14">Porcentajes que aplicará automáticamente en cada egreso: ' +
      (personas.length
        ? personas.map(x => '<span class="chip" style="margin-right:6px"><span class="punto" style="background:' + x.color +
          '"></span>' + U.esc(x.nombre) + ' <b>' + (sugeridos[x.id] || 0).toFixed(2) + '%</b></span>').join('')
        : '<span class="muted">sin miembros</span>') +
      '</p></div>';

    h += '<div class="grid g2">';
    personas.forEach(x => {
      const b = bp[x.id] || {};
      const pctAuto = sugeridos[x.id] || 0;
      const pctManual = (p.config.porcentajes || {})[x.id];
      const pend = (b.debe || 0) - (b.pagado || 0);

      h += '<div class="card"><div class="flex" style="gap:13px">' + App.avatar(x, 44) +
        '<div style="flex:1"><h4 style="margin:0;font-size:16px;color:var(--navy)">' + U.esc(x.nombre) + '</h4>' +
        '<div class="muted small">' + U.esc(x.rol || 'Miembro del hogar') + '</div></div>' +
        '<div class="flex">' +
        '<button class="btn mini" data-acc="editar-persona" data-id="' + x.id + '">✎</button>' +
        '<button class="btn mini peligro" data-acc="borrar-persona" data-id="' + x.id + '">🗑</button>' +
        '</div></div>';

      h += '<div class="stat-grid mt14">' +
        App.stat('Ingreso mensual', U.moneda(x.ingreso, p)) +
        App.stat('% automático', pctAuto.toFixed(2) + '%', 'por capacidad') +
        App.stat('Cuota del hogar', U.moneda(b.debe || 0, p)) +
        App.stat('Carga sobre ingreso', U.pct(b.pctCarga || 0)) +
        App.stat('Cancelado', U.moneda(b.pagado || 0, p)) +
        App.stat('Pendiente', U.moneda(pend, p)) +
        '</div>';

      h += '<div class="mt14"><div class="flex small"><span>Carga relativa</span><span class="spacer"></span>' +
        '<b>' + U.pct(b.pctCarga || 0) + '</b></div>' +
        App.barra(Math.min(1, (b.pctCarga || 0) / .6), (b.pctCarga || 0) > .5 ? 'rojo' : 'verde') + '</div>';

      h += '<div class="campo mt14"><label>% manual de este miembro (opcional)</label>' +
        '<div class="flex"><input type="number" step="0.01" min="0" max="100" class="money" ' +
        'value="' + (pctManual !== undefined ? pctManual : pctAuto) + '" data-id="' + x.id + '" id="pctm-' + x.id + '">' +
        '<button class="btn mini" data-acc="aplicar-pct-manual" data-id="' + x.id + '">Aplicar</button></div>' +
        '<small>Si modificás uno, los demás se ajustan para que el total sea siempre 100%.</small></div>';

      h += '</div>';
    });
    if (!personas.length) h += '</div>' + App.vacio('Sin miembros', 'Agregá personas para repartir los gastos.',
      '<button class="btn acento" data-acc="nueva-persona">＋ Agregar persona</button>');
    else h += '</div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">▦</span> Cuadro global de reparto' +
      '<span class="der"><button class="btn mini" data-acc="auto-pct">⚡ Automático</button></span></div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Miembro</th><th class="num">Ingreso base</th>' +
      '<th class="num">% reparto</th><th class="num">Cuota repartida</th><th class="num">% real sobre ingreso</th>' +
      '<th class="num">Balance</th></tr></thead><tbody>';
    const totalIng = E.ingresoTotal(p);
    personas.forEach(x => {
      const b = bp[x.id] || {};
      const pct = sugeridos[x.id] || 0;
      h += '<tr><td><div class="flex">' + App.avatar(x) + '<b>' + U.esc(x.nombre) + '</b></div></td>' +
        '<td class="num">' + U.moneda(x.ingreso, p) + '</td>' +
        '<td class="num"><b>' + pct.toFixed(2) + '%</b></td>' +
        '<td class="num">' + U.moneda(b.debe || 0, p) + '</td>' +
        '<td class="num ' + ((b.pctCarga || 0) > .5 ? 'rojo-t' : '') + '">' + U.pct(b.pctCarga || 0) + '</td>' +
        '<td class="num"><b>' + U.moneda(b.saldo || 0, p) + '</b></td></tr>';
    });
    h += '<tr class="total-row"><td>TOTAL</td><td class="num">' + U.moneda(totalIng, p) + '</td>' +
      '<td class="num">100.00%</td><td class="num">' + U.moneda(r.totalEgresos, p) + '</td>' +
      '<td class="num">' + U.pct(totalIng ? r.totalEgresos / totalIng : 0) + '</td>' +
      '<td class="num">' + U.moneda(r.balance, p) + '</td></tr>';
    h += '</tbody></table></div></div>';

    return h;
  };
})();
