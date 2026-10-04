/* ============================================================
   Vista: PANEL DE CONTROL
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E;

  App.vistas.panel = function () {
    const p = App.P(), mes = App.MES();
    const r = E.resumen(p, mes);
    const sc = E.score(p, mes);
    const alertas = E.alertas(p, mes);
    const bp = r.balancePersonas;
    const personas = E.personasActivas(p);
    const metas = E.metasAhorro(p, mes);

    let h = '<div class="vista-tit">' +
      '<div><h1>Panel de control</h1><p>' + U.mesLargo(mes) +
      ' · estado económico-financiero del hogar</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="sincronizar">⟳ Sincronizar movimientos</button>' +
      '<button class="btn primario" data-acc="ir" data-vista="reportes">▤ Generar informe</button>' +
      '</div></div>';

    h += '<div class="grid g4">' +
      App.kpi('Ingresos del mes', U.moneda(r.flujoIngresos, p),
        'Sueldos <b>' + U.moneda(r.sueldos, p) + '</b> + otros <b>' + U.moneda(r.totalIngresosPlan, p) + '</b>', 'verde') +
      App.kpi('Egresos del mes', U.moneda(r.totalEgresos, p),
        r.nEgresos + ' conceptos · <b>' + U.moneda(r.gastoPerCapita, p) + '</b> por miembro', 'naranja') +
      App.kpi('Balance neto', U.moneda(r.balance, p),
        (r.balance >= 0 ? 'Superávit · ' : 'Déficit · ') + '<b>' + U.pct(r.tasaAhorro) + '</b> de ahorro',
        r.balance >= 0 ? 'verde' : 'rojo') +
      App.kpi('Salud financiera', sc.score + ' / 100', 'Nivel: <b>' + sc.nivel + '</b>',
        sc.score >= 70 ? 'verde' : (sc.score >= 50 ? 'naranja' : 'rojo')) +
      '</div>';

    h += '<div class="grid g4 mt14">' +
      App.kpi('Cancelado', U.moneda(r.pagado, p), '<b>' + U.pct(r.eficienciaPago) + '</b> del total del mes', 'verde') +
      App.kpi('Pendiente de pago', U.moneda(r.pendiente, p),
        r.pendiente > 0 ? 'Hay cuotas sin cancelar' : 'Todo al día', r.pendiente > 0 ? 'rojo' : 'verde') +
      App.kpi('Endeudamiento', U.pct(r.tasaEndeudamiento),
        'Deudas: <b>' + U.moneda(r.deudas, p) + '</b>',
        r.tasaEndeudamiento > 0.35 ? 'rojo' : (r.tasaEndeudamiento > 0.2 ? 'naranja' : 'verde')) +
      App.kpi('Ahorro proyectado 12 m', U.moneda(r.anual.balance, p),
        'Si se repite el mes actual', 'morado') +
      '</div>';

    /* --- Salud + alertas --- */
    h += '<div class="grid g2 mt20">';
    h += '<div class="card"><div class="card-tit"><span class="ico">♥</span> Salud financiera del hogar' +
      '<span class="der">' + App.nivelBadge(sc.score >= 70 ? 'ok' : (sc.score >= 50 ? 'media' : 'critico')) + '</span></div>';

    const colorCirc = sc.score >= 70 ? '#16A34A' : (sc.score >= 50 ? '#D97706' : '#DC2626');
    const deg = sc.score * 3.6;
    h += '<div class="score-circ" style="background:conic-gradient(' + colorCirc + ' 0deg ' + deg.toFixed(0) +
      'deg,#EDF1F8 ' + deg.toFixed(0) + 'deg 360deg)">' +
      '<div class="centro"><div><b>' + sc.score + '</b><span>' + sc.nivel + '</span></div></div></div>';

    h += '<div class="mt14">' +
      '<div class="flex small"><span>Cancelado</span><span class="spacer"></span><b>' + U.pct(r.eficienciaPago) + '</b></div>' +
      App.barra(r.eficienciaPago, r.eficienciaPago >= .99 ? 'verde' : 'naranja') +
      '<div class="flex small mt8"><span>Tasa de ahorro</span><span class="spacer"></span><b>' + U.pct(r.tasaAhorro) + '</b></div>' +
      App.barra(Math.min(1, r.tasaAhorro / 0.4), r.tasaAhorro >= .2 ? 'verde' : 'naranja') +
      '<div class="flex small mt8"><span>Fondo de emergencia (6 meses)</span><span class="spacer"></span><b>' +
      U.moneda(metas.colchon6, p) + '</b></div>' +
      App.barra(metas.colchon6 ? Math.min(1, r.balance > 0 ? (r.balance * 12) / metas.colchon6 : 0) : 0, 'naranja') +
      '</div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">⚠</span> Alertas y observaciones' +
      '<span class="der">' + alertas.length + ' detectada(s)</span></div>';
    if (!alertas.length) h += '<div class="vacio"><div class="e-ico">✅</div><b>Sin alertas</b><p>Todo en orden.</p></div>';
    alertas.forEach(a => {
      let vista = 'plan';
      if (a.accion) {
        const t = a.accion.toLowerCase();
        if (t.indexOf('pago') >= 0) vista = 'pagos';
        else if (t.indexOf('persona') >= 0 || t.indexOf('equilibrar') >= 0 || t.indexOf('a%') >= 0 || t.indexOf('%') >= 0) vista = 'personas';
        else if (t.indexOf('variable') >= 0 || t.indexOf('ahorro') >= 0 || t.indexOf('deuda') >= 0) vista = 'plan';
      }
      const ico = a.nivel === 'critico' ? '🚨' : a.nivel === 'alta' ? '⚠️' :
        a.nivel === 'media' ? '⚡' : a.nivel === 'ok' ? '✅' : 'ℹ️';
      h += '<div class="alerta n-' + a.nivel + '"><div class="a-ico">' + ico + '</div><div style="flex:1">' +
        '<b class="t">' + U.esc(a.titulo) + '</b><p>' + U.esc(a.detalle) + '</p>' +
        (a.accion ? '<div class="a-acc"><button class="btn mini" data-acc="ir" data-vista="' + vista + '">' +
          U.esc(a.accion) + '</button></div>' : '') +
        '</div></div>';
    });
    h += '</div></div>';

    /* --- Estado por persona --- */
    h += '<div class="card mt14"><div class="card-tit"><span class="ico">☺</span> Estado de cuenta por miembro' +
      '<span class="der">estrategia: <b>' + U.esc(E.ESTRATEGIAS.find(x => x.id === (p.config.estrategiaGlobal || 'proporcional')).nombre) + '</b></span></div>';
    if (!personas.length) h += App.vacio('Sin miembros', 'Agregá personas para repartir los gastos.', '');
    else {
      h += '<div class="tabla-wrap"><table class="datos"><thead><tr>' +
        '<th>Miembro</th><th class="num">Ingreso</th><th class="num">Cuota hogar</th><th>Carga</th>' +
        '<th class="num">Cancelado</th><th class="num">Pendiente</th><th class="num">Balance</th><th></th>' +
        '</tr></thead><tbody>';
      personas.forEach(x => {
        const b = bp[x.id] || {};
        const pend = (b.debe || 0) - (b.pagado || 0);
        h += '<tr><td><div class="flex">' + App.avatar(x) + '<div><b>' + U.esc(x.nombre) + '</b>' +
          '<div class="muted small">' + U.esc(x.rol || '') + '</div></div></div></td>' +
          '<td class="num">' + U.moneda(b.ingresoEfectivo || 0, p) + '</td>' +
          '<td class="num">' + U.moneda(b.debe || 0, p) + '</td>' +
          '<td>' + App.barra(Math.min(1, (b.pctCarga || 0) / 0.6), (b.pctCarga || 0) > .5 ? 'rojo' : 'naranja') +
          '<span class="small muted">' + U.pct(b.pctCarga || 0) + ' de su ingreso</span></td>' +
          '<td class="num verde-t">' + U.moneda(b.pagado || 0, p) + '</td>' +
          '<td class="num ' + (pend > 0.004 ? 'rojo-t' : 'muted') + '">' + U.moneda(pend, p) + '</td>' +
          '<td class="num"><b>' + U.moneda(b.saldo || 0, p) + '</b></td>' +
          '<td><button class="btn mini" data-acc="ir" data-vista="pagos">Ver</button></td></tr>';
      });
      const totDebe = personas.reduce((a, x) => a + ((bp[x.id] || {}).debe || 0), 0);
      const totPag = personas.reduce((a, x) => a + ((bp[x.id] || {}).pagado || 0), 0);
      h += '<tr class="total-row"><td>TOTAL</td>' +
        '<td class="num">' + U.moneda(r.flujoIngresos, p) + '</td>' +
        '<td class="num">' + U.moneda(totDebe, p) + '</td><td></td>' +
        '<td class="num">' + U.moneda(totPag, p) + '</td>' +
        '<td class="num">' + U.moneda(totDebe - totPag, p) + '</td>' +
        '<td class="num">' + U.moneda(r.balance, p) + '</td><td></td></tr>';
      h += '</tbody></table></div>';
    }
    h += '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">📊</span> Ingresos vs. egresos (12 meses)</div>' +
      '<div class="canvas-wrap tall"><canvas id="chFlujo"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">🍩</span> Distribución del gasto por categoría</div>' +
      '<div class="canvas-wrap tall"><canvas id="chCat"></canvas></div></div>' +
      '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">⚖</span> Reparto de la carga por miembro</div>' +
      '<div class="canvas-wrap med"><canvas id="chPersonas"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">💰</span> Origen del dinero (efectivo vs. virtual)</div>' +
      '<div class="canvas-wrap med"><canvas id="chOrigen"></canvas></div></div>' +
      '</div>';

    return h;
  };

  App.vistas.post_panel = function () {
    const p = App.P(), mes = App.MES();
    const r = E.resumen(p, mes);
    const serie = E.serieMensual(p, 12);
    const P = App.PALETA;

    App.chart('chFlujo', {
      type: 'bar',
      data: {
        labels: serie.map(s => s.etiqueta),
        datasets: [
          { label: 'Ingresos', data: serie.map(s => s.ingresos), backgroundColor: 'rgba(22,163,74,.85)', borderRadius: 5 },
          { label: 'Egresos', data: serie.map(s => s.egresos), backgroundColor: 'rgba(249,115,22,.85)', borderRadius: 5 },
          { label: 'Balance', data: serie.map(s => s.balance), type: 'line', borderColor: '#2563EB', backgroundColor: '#2563EB', tension: .35, borderWidth: 2.5, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + U.moneda(c.parsed.y, p) } } },
        scales: { y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    });

    const cats = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a]);
    App.chart('chCat', {
      type: 'doughnut',
      data: {
        labels: cats.length ? cats : ['Sin gastos'],
        datasets: [{
          data: cats.length ? cats.map(c => r.porCategoria[c]) : [1],
          backgroundColor: cats.map((c, i) => P[i % P.length]),
          borderWidth: 2, borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => c.label + ': ' + U.moneda(c.parsed, p) } }
        }
      }
    });

    const personas = E.personasActivas(p);
    const bp = r.balancePersonas;
    App.chart('chPersonas', {
      type: 'bar',
      data: {
        labels: personas.map(x => x.nombre),
        datasets: [
          { label: 'Ingreso', data: personas.map(x => (bp[x.id] || {}).ingresoEfectivo || 0), backgroundColor: 'rgba(37,99,235,.85)', borderRadius: 5 },
          { label: 'Cuota asignada', data: personas.map(x => (bp[x.id] || {}).debe || 0), backgroundColor: 'rgba(249,115,22,.9)', borderRadius: 5 },
          { label: 'Ya cancelado', data: personas.map(x => (bp[x.id] || {}).pagado || 0), backgroundColor: 'rgba(22,163,74,.9)', borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + U.moneda(c.parsed.y, p) } } },
        scales: { y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    });

    const rm = E.resumenMovimientos(p, null);
    App.chart('chOrigen', {
      type: 'pie',
      data: {
        labels: ['Efectivo', 'Virtual'],
        datasets: [{ data: [rm.porLugar.Efectivo || 0, rm.porLugar.Virtual || 0], backgroundColor: ['#F97316', '#2563EB'], borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.label + ': ' + U.moneda(c.parsed, p) } } }
      }
    });
  };
})();
