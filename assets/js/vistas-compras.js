/* ============================================================
   Vistas: COMPRAS DEL HOGAR (víveres, boletas, comparador)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E, D = App.D;
  const C = window.AfCompras;

  if (!App.tabCompras) App.tabCompras = 'panel';
  if (!App.chatCompras) App.chatCompras = [];
  App.compFiltros = App.compFiltros || { cat: '', txt: '' };
  App.compSerie = App.compSerie || null;
  App.tmpBoleta = App.tmpBoleta || null;

  const P = () => App.P();
  const mon = v => U.moneda(v, P());

  /* ============================================================
     VISTA PRINCIPAL
     ============================================================ */
  App.vistas.compras = function () {
    const p = P();
    C.asegurar(p);

    const tabs = [
      ['panel', '▦ Panel'],
      ['catalogo', '☰ Catálogo y precios'],
      ['comparador', '⚖ Comparador'],
      ['historial', '▤ Historial de compras'],
      ['analisis', '◔ Análisis de consumo'],
      ['asistente', '✦ Asistente de compras']
    ];

    let h = '<div class="vista-tit">' +
      '<div><h1>Compras del hogar</h1><p>Catálogo de víveres, precios por supermercado, boletas y consumo</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="compras-excel">⬇ Excel</button>' +
      '<button class="btn" data-acc="compras-word">⬇ Word</button>' +
      '<button class="btn" data-acc="compras-pdf">⬇ PDF</button>' +
      '<button class="btn primario" data-acc="compra-nueva">＋ Registrar compra</button>' +
      '</div></div>';

    h += '<div class="tabs">' + tabs.map(t =>
      '<div class="tab' + (App.tabCompras === t[0] ? ' activo' : '') +
      '" data-acc="tab-compras" data-tab="' + t[0] + '">' + t[1] + '</div>').join('') + '</div>';

    h += ({
      panel: vistaPanel, catalogo: vistaCatalogo, comparador: vistaComparador,
      historial: vistaHistorial, analisis: vistaAnalisis, asistente: vistaAsistente
    }[App.tabCompras] || vistaPanel)();

    return h;
  };

  /* ============================================================
     PANEL
     ============================================================ */
  function vistaPanel() {
    const p = P(), mes = App.MES();
    const st = C.estadisticas(p, mes);
    const alertas = C.alertas(p);

    if (!C.boletas(p).length && !C.productos(p).length) {
      return App.vacio('Sin compras registradas',
        'Creá tu catálogo de productos y registrá las boletas del supermercado para comparar precios y analizar el consumo.',
        '<button class="btn primario" data-acc="compra-nueva">＋ Registrar compra</button> ' +
        '<button class="btn" data-acc="compras-cargar-demo">↺ Cargar ejemplo de compras</button>');
    }

    let h = '<div class="grid g4">' +
      App.kpi('Gasto en compras', mon(st.total), U.mesLargo(mes), 'naranja') +
      App.kpi('Boletas', String(st.n), 'ticket promedio ' + mon(st.ticket), 'morado') +
      App.kpi('Del gasto del hogar', U.pct(st.share / 100), 'egresos ' + mon(st.egresosHogar), st.share > 40 ? 'rojo' : 'verde') +
      App.kpi('Por recomprar', String(C.porRecomprar(p).length), 'productos según consumo', 'verde') +
      '</div>';

    h += '<div class="grid g2 mt20">' +
      '<div class="card"><div class="card-tit"><span class="ico">🛒</span> Gasto por tienda · ' + U.mesLargo(mes) + '</div>' +
      '<div class="canvas-wrap med"><canvas id="chCompTienda"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">📈</span> Evolución de compras (6 meses)</div>' +
      '<div class="canvas-wrap med"><canvas id="chCompEvol"></canvas></div></div>' +
      '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">▦</span> Productos que más pesan' +
      '<span class="der"><button class="btn mini" data-acc="tab-compras" data-tab="comparador">⚖ Comparar precios</button></span></div>' +
      '<div class="canvas-wrap med"><canvas id="chCompTop"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">⚠</span> Alertas de compras</div>';
    if (!alertas.length) h += '<p class="muted small">Sin alertas: precios estables y nada pendiente de recomprar.</p>';
    alertas.slice(0, 6).forEach(a => {
      h += '<div class="alerta n-' + (a.nivel === 'alta' ? 'alta' : a.nivel === 'media' ? 'media' : 'info') + '">' +
        '<div class="a-ico">•</div><div><b class="t">' + U.esc(a.titulo) + '</b><p>' + U.esc(a.texto) + '</p></div></div>';
    });
    h += '</div></div>';

    if (st.porProductos.length) {
      h += '<div class="card mt14"><div class="card-tit"><span class="ico">▤</span> Ranking de productos · ' + U.mesLargo(mes) + '</div>' +
        '<div class="tabla-wrap"><table class="datos"><thead><tr><th>#</th><th>Producto</th><th class="num">Gasto</th>' +
        '<th class="num">% compras</th><th></th></tr></thead><tbody>';
      const tot = Math.max(.01, st.total);
      st.porProductos.slice(0, 10).forEach((x, i) => {
        h += '<tr><td>' + (i + 1) + '</td><td><b>' + U.esc(x.nombre) + '</b></td>' +
          '<td class="num">' + mon(x.total) + '</td>' +
          '<td class="num">' + U.pct(x.total / tot) + '</td>' +
          '<td>' + App.barra(x.total / tot, 'naranja') + '</td></tr>';
      });
      h += '</tbody></table></div></div>';
    }

    return h;
  }

  /* ============================================================
     CATÁLOGO
     ============================================================ */
  function vistaCatalogo() {
    const p = P();
    const prods = C.productos(p);
    const tiendas = C.tiendas(p);
    const f = App.compFiltros;

    let h = '<div class="grid g4">' +
      App.kpi('Productos', String(prods.length), C.CATEGORIAS.length + ' categorías', 'morado') +
      App.kpi('Tiendas', String(tiendas.length), 'supermercados, mercado y tiendas', 'verde') +
      App.kpi('Mediciones', String(C.precios(p).length), 'historial de precios', 'naranja') +
      App.kpi('Promociones', String(C.promociones(p).length), 'vigentes hoy', 'verde') +
      '</div>';

    h += '<div class="card mt20"><div class="card-tit"><span class="ico">☰</span> Catálogo de productos' +
      '<span class="der">' +
      '<button class="btn mini" data-acc="tienda-nueva">＋ Tienda</button>' +
      '<button class="btn mini" data-acc="producto-nuevo">＋ Producto</button>' +
      '</span></div>' +
      '<div class="flex flex-wrap mt8">' +
      '<input id="f-comp-txt" data-chg="comp-txt" placeholder="Buscar producto o marca…" ' +
      'value="' + U.esc(f.txt || '') + '" style="min-width:210px">' +
      '<select data-chg="comp-cat"><option value="">Todas las categorías</option>' +
      C.CATEGORIAS.map(c => '<option' + (f.cat === c ? ' selected' : '') + '>' + c + '</option>').join('') +
      '</select><span class="spacer"></span>' +
      '<span class="muted small">' + prods.length + ' producto(s)</span></div>';

    if (!prods.length) {
      h += App.vacio('Catálogo vacío', 'Agregá tus víveres habituales para comparar precios entre supermercados.',
        '<button class="btn primario" data-acc="producto-nuevo">＋ Nuevo producto</button>') + '</div>';
      return h;
    }

    const filtrados = prods.filter(pr => {
      if (f.cat && pr.categoria !== f.cat) return false;
      if (f.txt) {
        const t = f.txt.toLowerCase();
        if ((pr.nombre + ' ' + pr.marca).toLowerCase().indexOf(t) < 0) return false;
      }
      return true;
    });

    h += '<div class="tabla-wrap mt14"><table class="datos"><thead><tr>' +
      '<th>Producto</th><th>Categoría</th><th class="num">Tiendas</th>' +
      '<th class="num">Mejor precio</th><th>Tienda</th><th class="num">Variación</th>' +
      '<th class="num">Dura ~</th><th></th></tr></thead><tbody>';

    filtrados.forEach(pr => {
      const cmp = C.comparativa(p, pr.id);
      const mejor = cmp[0];
      const t = C.tendencia(p, pr.id);
      const iv = C.intervalo(p, pr.id);
      const tend = t.dir === 'sube' ? '<span style="color:#DC2626">▲ +' + t.pct + '%</span>'
        : t.dir === 'baja' ? '<span style="color:#16A34A">▼ ' + t.pct + '%</span>'
          : '<span class="muted">=</span>';
      h += '<tr><td><b>' + U.esc(pr.nombre) + '</b>' + (pr.marca ? '<br><span class="muted small">' + U.esc(pr.marca) + '</span>' : '') + '</td>' +
        '<td>' + U.esc(pr.categoria) + '<br><span class="muted small">' + U.esc(pr.unidad) + '</span></td>' +
        '<td class="num">' + cmp.length + '</td>' +
        '<td class="num"><b>' + (mejor ? mon(mejor.precio) : '—') + '</b></td>' +
        '<td>' + (mejor ? U.esc(mejor.tienda) : '—') + '</td>' +
        '<td class="num">' + tend + '</td>' +
        '<td class="num">' + (iv.duracion ? iv.duracion + ' d' : '—') + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
        '<button class="btn mini" data-acc="precio-nuevo" data-id="' + pr.id + '" title="Registrar precio">＄</button> ' +
        '<button class="btn mini" data-acc="producto-editar" data-id="' + pr.id + '" title="Editar">✎</button> ' +
        '<button class="btn mini peligro" data-acc="producto-borrar" data-id="' + pr.id + '" title="Borrar">🗑</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div>';

    if (C.promociones(p).length) {
      h += '<div class="card mt14"><div class="card-tit"><span class="ico">🏷</span> Promociones vigentes</div><div class="flex flex-wrap">';
      C.promociones(p).forEach(x => {
        h += '<span class="chip"><span class="punto" style="background:' + (x.tienda.color || '#2563EB') + '"></span> ' +
          U.esc(x.producto.nombre) + ' · <b>' + mon(x.reg.precio) + '</b> en ' + U.esc(x.tienda.nombre) +
          ' <span class="muted">(hasta ' + U.esc(x.reg.promo.hasta) + ')</span></span>';
      });
      h += '</div></div>';
    }

    h += '</div>';
    return h;
  }

  /* ============================================================
     COMPARADOR DE PRECIOS
     ============================================================ */
  function vistaComparador() {
    const p = P();
    const tiendas = C.tiendas(p).filter(t => t.activo !== false);
    const prods = C.productos(p);

    if (!prods.length || !tiendas.length) {
      return App.vacio('Sin datos para comparar', 'Cargá productos y al menos una tienda.',
        '<button class="btn primario" data-acc="producto-nuevo">＋ Producto</button>');
    }

    const cc = C.compararCanasta(p);

    let h = '<div class="grid g4">' +
      App.kpi('Mejor tienda', cc && cc.mejor ? cc.mejor.tienda.nombre : '—',
        cc && cc.mejor ? mon(cc.mejor.total) + ' la canasta' : '', 'verde') +
      App.kpi('Canasta mixta', cc ? mon(cc.ideal.total) : '—', 'cada producto en su más barato', 'morado') +
      App.kpi('Ahorro posible', cc ? mon(cc.ahorro) : '—', 'vs. la más cara', 'naranja') +
      App.kpi('Productos comparados', String(prods.length), tiendas.length + ' tiendas', 'verde') +
      '</div>';

    h += '<div class="card mt20"><div class="card-tit"><span class="ico">⚖</span> Matriz de precios (vigentes)' +
      '<span class="der"><button class="btn mini" data-acc="compras-csv-precios">⬇ CSV precios</button></span></div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Producto</th>' +
      tiendas.map(t => '<th class="num" title="' + U.esc(t.nombre) + '">' +
        '<span class="punto" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
        (t.color || '#2563EB') + '"></span> ' + U.esc(t.nombre.length > 13 ? t.nombre.slice(0, 12) + '…' : t.nombre) + '</th>').join('') +
      '<th class="num">Mejor</th><th class="num">Diferencia</th></tr></thead><tbody>';

    prods.forEach(pr => {
      const cmp = C.comparativa(p, pr.id);
      if (!cmp.length) return;
      const min = cmp[0].precio, max = cmp[cmp.length - 1].precio;
      h += '<tr><td><b>' + U.esc(pr.nombre) + '</b><br><span class="muted small">' + U.esc(pr.marca || pr.unidad) + '</span></td>';
      tiendas.forEach(t => {
        const reg = cmp.find(x => x.tiendaId === t.id);
        if (!reg) { h += '<td class="num muted">—</td>'; return; }
        const esMin = reg.precio === min;
        h += '<td class="num"' + (esMin ? ' style="background:#DCFCE7;font-weight:700"' : '') + '>' + mon(reg.precio) + '</td>';
      });
      h += '<td class="num"><b>' + mon(min) + '</b><br><span class="muted small">' + U.esc(cmp[0].tienda) + '</span></td>' +
        '<td class="num">' + (max > min ? '+' + mon(U.round2(max - min)) : '<span class="muted">=</span>') + '</td></tr>';
    });

    if (cc) {
      h += '<tr style="font-weight:700;background:#F5F7FD"><td>CANASTA (' + cc.nComunes + ' productos comunes)</td>';
      cc.lista.forEach(x => {
        const esMejor = cc.mejor && x.tienda.id === cc.mejor.tienda.id;
        h += '<td class="num"' + (esMejor ? ' style="background:#DCFCE7"' : '') + '>' + mon(x.total) + '</td>';
      });
      h += '<td class="num">' + mon(cc.ideal.total) + '</td>' +
        '<td class="num">−' + mon(cc.ahorro) + '</td></tr>';
    }

    h += '</tbody></table></div>' +
      '<p class="small muted mt14">Las celdas en verde son el precio más barato de cada fila. ' +
      'La fila de canasta suma sólo los productos que venden <b>todas</b> las tiendas del ranking, para que ' +
      'una tienda que vende pocos artículos no aparezca como «más barata».</p></div>';

    if (cc) {
      h += '<div class="grid g2 mt14">' +
        '<div class="card"><div class="card-tit"><span class="ico">🛒</span> Ranking de canasta' +
        '<span class="der">' + cc.nComunes + ' comunes</span></div>' +
        '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Tienda</th><th class="num">Cobertura</th>' +
        '<th class="num">Canasta</th><th class="num">Diferencia</th></tr></thead><tbody>' +
        cc.lista.map((x, i) => '<tr' + (i === 0 ? ' style="font-weight:700"' : '') + '><td>' + U.esc(x.tienda.nombre) + '</td>' +
          '<td class="num">' + x.hay + '/' + prods.length + '</td>' +
          '<td class="num">' + mon(x.total) + '</td>' +
          '<td class="num">' + (i === 0 ? '✅' : '+' + mon(U.round2(x.total - cc.lista[0].total))) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        (cc.fueraRanking && cc.fueraRanking.length ?
          '<p class="small muted mt8">Fuera del ranking por baja cobertura: ' +
          cc.fueraRanking.map(t => U.esc(t.nombre)).join(', ') + '.</p>' : '') +
        '</div>' +
        '<div class="card"><div class="card-tit"><span class="ico">📊</span> Canasta por tienda</div>' +
        '<div class="canvas-wrap med"><canvas id="chCompCanasta"></canvas></div></div>' +
        '</div>';
    }

    return h;
  }

  /* ============================================================
     HISTORIAL DE COMPRAS (BOLETAS)
     ============================================================ */
  function vistaHistorial() {
    const p = P();
    const boletas = C.boletasOrden(p);

    let h = '<div class="grid g4">' +
      App.kpi('Compras', String(boletas.length), 'boletas registradas', 'morado') +
      App.kpi('Este mes', String(C.boletasDe(p, App.MES()).length), U.mesLargo(App.MES()), 'naranja') +
      App.kpi('Total registrado', mon(boletas.reduce((a, b) => a + C.totalBoleta(b), 0)), 'suma de todas las boletas', 'verde') +
      App.kpi('Vinculados a gastos', String(boletas.filter(b => b.egresoId).length), 'egresos automáticos', 'verde') +
      '</div>';

    h += '<div class="card mt20"><div class="card-tit"><span class="ico">▤</span> Historial de boletas' +
      '<span class="der">' +
      '<button class="btn mini" data-acc="compras-csv-boletas">⬇ CSV boletas</button>' +
      '<button class="btn mini primario" data-acc="compra-nueva">＋ Registrar compra</button>' +
      '</span></div>';

    if (!boletas.length) {
      return h + App.vacio('Sin compras', 'Registrá tu primera boleta para empezar el historial.',
        '<button class="btn primario" data-acc="compra-nueva">＋ Registrar compra</button>') + '</div>';
    }

    h += '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Fecha</th><th>Tienda</th>' +
      '<th class="num">Ítems</th><th class="num">Total</th><th>Egreso vinculado</th><th>Detalle</th><th></th></tr></thead><tbody>';

    boletas.forEach(b => {
      const t = C.tienda(p, b.tiendaId);
      const eg = b.egresoId ? (p.egresos || []).find(x => x.id === b.egresoId) : null;
      const nombres = (b.lineas || []).slice(0, 3).map(l => {
        const pr = C.producto(p, l.productoId);
        return pr ? pr.nombre + ' ×' + l.cantidad : '—';
      }).join(', ');
      h += '<tr><td>' + U.esc(b.fecha) + '</td>' +
        '<td><b>' + U.esc(t ? t.nombre : '—') + '</b></td>' +
        '<td class="num">' + (b.lineas || []).length + '</td>' +
        '<td class="num"><b>' + mon(C.totalBoleta(b)) + '</b></td>' +
        '<td>' + (eg ? '<span class="badge-est b-pagado">sí</span> <span class="muted small">' + U.esc(eg.detalle) + '</span>' : '<span class="muted">no</span>') + '</td>' +
        '<td class="muted small">' + U.esc(nombres) + ((b.lineas || []).length > 3 ? '…' : '') + '</td>' +
        '<td class="num" style="white-space:nowrap">' +
        '<button class="btn mini" data-acc="compra-editar" data-id="' + b.id + '">✎</button> ' +
        '<button class="btn mini peligro" data-acc="compra-borrar" data-id="' + b.id + '">🗑</button>' +
        '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  }

  /* ============================================================
     ANÁLISIS DE CONSUMO
     ============================================================ */
  function vistaAnalisis() {
    const p = P(), mes = App.MES();
    const st = C.estadisticas(p, mes);
    const cc = C.comprasDelMes(p, mes);
    const prods = C.productos(p);

    let h = '<div class="grid g4">' +
      App.kpi('Frecuencia', cc.porSemana + '/sem', st.n + ' boleta(s) en ' + U.mesLargo(mes), 'morado') +
      App.kpi('Compras al año', String(cc.anio), 'promedio ' + cc.porMesPromedio + ' por mes', 'naranja') +
      App.kpi('Ticket promedio', mon(st.ticket), 'por boleta', 'verde') +
      App.kpi('Ahorro potencial', st ? mon(C.compararCanasta(p) ? C.compararCanasta(p).ahorro : 0) : '—',
        'por canasta mixta', 'verde') +
      '</div>';

    h += '<div class="grid g2 mt20">' +
      '<div class="card"><div class="card-tit"><span class="ico">▦</span> Gasto por categoría</div>' +
      '<div class="canvas-wrap med"><canvas id="chCompCat"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">📈</span> Histórico de compras</div>' +
      '<div class="canvas-wrap med"><canvas id="chCompEvol2"></canvas></div></div>' +
      '</div>';

    /* estacionalidad de precios de un producto */
    const serieId = App.compSerie && prods.some(x => x.id === App.compSerie)
      ? App.compSerie : (prods[0] ? prods[0].id : null);
    h += '<div class="card mt14"><div class="card-tit"><span class="ico">📉</span> Precio en el tiempo (estacionalidad)' +
      '<span class="der"><select data-chg="comp-serie" style="min-width:210px">' +
      prods.map(pr => '<option value="' + pr.id + '"' + (pr.id === serieId ? ' selected' : '') + '>' +
        U.esc(pr.nombre) + '</option>').join('') +
      '</select></span></div>' +
      '<div class="canvas-wrap med"><canvas id="chCompSerie"></canvas></div>' +
      '<p class="small muted">Cada punto es una medición de precio. Sirve para ver subidas de temporada y elegir el mejor momento de compra.</p></div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">⏱</span> Duración y frecuencia de consumo' +
      '<span class="der"><button class="btn mini acento" data-acc="compras-chat-pregunta" data-q="¿Qué debo comprar esta semana?">🛒 Lista sugerida</button></span></div>';

    if (!prods.length) {
      h += App.vacio('Sin productos', 'Agregá productos para analizar cuánto duran.', '') + '</div>';
      return h;
    }

    h += '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Producto</th>' +
      '<th class="num">Compras</th><th class="num">Última</th><th class="num">Dura</th>' +
      '<th class="num">Veces/mes</th><th class="num">Próxima</th><th>Estado</th><th class="num">Gastado</th>' +
      '</tr></thead><tbody>';

    prods.map(pr => ({ pr: pr, iv: C.intervalo(p, pr.id) }))
      .sort((a, b) => (a.iv.proxima || '9999').localeCompare(b.iv.proxima || '9999'))
      .forEach(x => {
        const iv = x.iv;
        const badge = iv.estado === 'recomprar' ? '<span class="badge-est b-critico">Recomprar</span>'
          : iv.estado === 'pronto' ? '<span class="badge-est b-parcial">Pronto</span>'
            : iv.estado === 'ok' ? '<span class="badge-est b-ok">Al día</span>'
              : '<span class="badge-est b-gris">Sin datos</span>';
        h += '<tr><td><b>' + U.esc(x.pr.nombre) + '</b><br><span class="muted small">' + U.esc(x.pr.marca || '') + '</span></td>' +
          '<td class="num">' + iv.n + '</td>' +
          '<td class="num">' + (iv.ultima || '—') + '</td>' +
          '<td class="num">' + (iv.duracion ? iv.duracion + ' d' : '—') + '</td>' +
          '<td class="num">' + (iv.vecesMes || '—') + '</td>' +
          '<td class="num">' + (iv.proxima || '—') + '</td>' +
          '<td>' + badge + '</td>' +
          '<td class="num">' + mon(iv.gastoTotal) + '</td></tr>';
      });
    h += '</tbody></table></div></div>';

    if (st.porTienda.length) {
      h += '<div class="card mt14"><div class="card-tit"><span class="ico">🏪</span> Dónde compraste este mes</div>' +
        '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Tienda</th><th class="num">Total</th>' +
        '<th class="num">% de tus compras</th><th></th></tr></thead><tbody>' +
        st.porTienda.map(x => '<tr><td><b>' + U.esc(x.nombre) + '</b></td>' +
          '<td class="num">' + mon(x.total) + '</td>' +
          '<td class="num">' + U.pct(x.total / Math.max(.01, st.total)) + '</td>' +
          '<td>' + App.barra(x.total / Math.max(.01, st.total), 'naranja') + '</td></tr>').join('') +
        '</tbody></table></div></div>';
    }

    return h;
  }

  /* ============================================================
     ASISTENTE DE COMPRAS
     ============================================================ */
  const SUGERENCIAS = [
    '¿Dónde compro el arroz más barato?',
    'Compara la compra completa',
    '¿Cada cuánto compro pañales?',
    '¿Qué debo comprar esta semana?',
    '¿En qué gasto más en compras?',
    '¿Hay promociones vigentes?'
  ];

  function vistaAsistente() {
    let h = '<div class="grid g2"><div class="card"><div class="card-tit"><span class="ico">✦</span> Asistente de compras' +
      '<span class="der"><button class="btn mini" data-acc="compras-chat-limpiar">🗑 Limpiar</button></span></div>' +
      '<div class="chat"><div class="chat-hist" id="chatCompHist">';

    if (!App.chatCompras.length) {
      h += '<div class="msg ia"><div class="burbuja"><div class="quien">🛒 Asistente de compras</div>' +
        '<p>Hola, administro las compras del hogar: catálogo de productos, precios de cada supermercado, ' +
        'boletas y consumo.</p>' +
        '<p class="muted">Preguntame o pedime que registre algo:</p>' +
        '<div class="sugerencias">' +
        SUGERENCIAS.map(s => '<span class="sugerencia" data-acc="compras-chat-pregunta" data-q="' + U.esc(s) + '">' +
          U.esc(s) + '</span>').join('') + '</div></div></div>';
    }

    App.chatCompras.forEach(m => {
      h += '<div class="msg ' + (m.rol === 'yo' ? 'yo' : 'ia') + '"><div class="burbuja">' +
        (m.rol === 'yo' ? U.esc(m.texto) : '<div class="quien">🛒 Asistente de compras</div>' + m.html) +
        '</div></div>';
    });

    h += '</div><div class="chat-entrada">' +
      '<input id="chatCompInput" placeholder="Ej: ¿dónde está más barato el aceite? (Enter para enviar)">' +
      '<button class="btn primario" data-acc="compras-chat-enviar">Enviar</button>' +
      '</div></div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">⚡</span> Acciones rápidas</div>' +
      '<p class="small muted">El asistente responde con los datos reales de tu catálogo y también puede registrar productos y precios.</p>' +
      '<div class="flex flex-wrap">' +
      '<button class="btn mini" data-acc="compras-chat-pregunta" data-q="¿Qué debo comprar esta semana?">🛒 Qué comprar</button>' +
      '<button class="btn mini" data-acc="compras-chat-pregunta" data-q="Compara la compra completa">⚖ Comparar canasta</button>' +
      '<button class="btn mini" data-acc="compras-chat-pregunta" data-q="¿Cuánto dura el arroz?">⏱ Duración</button>' +
      '<button class="btn mini" data-acc="compras-chat-pregunta" data-q="¿En qué gasto más en compras?">📊 Resumen</button>' +
      '<button class="btn mini" data-acc="compras-chat-pregunta" data-q="¿Hay promociones vigentes?">🏷 Promos</button>' +
      '<button class="btn mini" data-acc="compra-nueva">＋ Registrar compra</button>' +
      '</div>' +
      '<div class="seccion-tit">Ejemplos para registrar desde acá</div>' +
      '<ul class="small muted" style="line-height:1.9;padding-left:18px">' +
      '<li><code>agregar papel de cocina regia a 2.99 en Tuti</code></li>' +
      '<li><code>actualizar precio del aceite chef en aki a 3.40</code></li>' +
      '</ul>' +
      '</div></div>';

    return h;
  }

  App.vistas.post_compras = function () {
    const p = P(), mes = App.MES(), P_ = App.PALETA;
    const st = C.estadisticas(p, mes);

    const hist = App.$('#chatCompHist');
    if (hist) hist.scrollTop = hist.scrollHeight;

    if (App.tabCompras === 'panel') {
      App.chart('chCompTienda', {
        type: 'doughnut',
        data: {
          labels: st.porTienda.map(x => x.nombre),
          datasets: [{ data: st.porTienda.map(x => x.total), backgroundColor: st.porTienda.map((x, i) => P_[i % P_.length]), borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '58%',
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: c => c.label + ': ' + mon(c.parsed) } }
          }
        }
      });
      App.chart('chCompEvol', lineaEvol(st.evolucion));
      App.chart('chCompTop', {
        type: 'bar',
        data: {
          labels: st.porProductos.slice(0, 7).map(x => x.nombre),
          datasets: [{ label: 'Gasto', data: st.porProductos.slice(0, 7).map(x => x.total), backgroundColor: '#F97316', borderRadius: 5 }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => mon(c.parsed.x) } } },
          scales: { x: { ticks: { callback: v => mon(v) }, grid: { color: '#EDF0F7' } }, y: { grid: { display: false } } }
        }
      });
    }

    if (App.tabCompras === 'comparador') {
      const cc = C.compararCanasta(p);
      if (cc) {
        App.chart('chCompCanasta', {
          type: 'bar',
          data: {
            labels: cc.lista.map(x => x.tienda.nombre),
            datasets: [{ label: 'Canasta', data: cc.lista.map(x => x.total), backgroundColor: cc.lista.map(x => cc.mejor.tienda.id === x.tienda.id ? '#16A34A' : '#94A3B8'), borderRadius: 5 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => mon(c.parsed.y) } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => mon(v) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
          }
        });
      }
    }

    if (App.tabCompras === 'analisis') {
      App.chart('chCompCat', {
        type: 'bar',
        data: {
          labels: st.porCategoria.map(x => x.nombre),
          datasets: [{ label: 'Gasto', data: st.porCategoria.map(x => x.total), backgroundColor: st.porCategoria.map((x, i) => P_[i % P_.length]), borderRadius: 5 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => mon(c.parsed.y) } } },
          scales: { y: { beginAtZero: true, ticks: { callback: v => mon(v) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
        }
      });
      App.chart('chCompEvol2', lineaEvol(st.evolucion));

      const serieId = App.compSerie && C.producto(p, App.compSerie) ? App.compSerie
        : (C.productos(p)[0] || {}).id;
      const serie = serieId ? C.seriePrecio(p, serieId) : [];
      App.chart('chCompSerie', {
        type: 'line',
        data: {
          labels: serie.map(s => U.mesLargo(s.mes)),
          datasets: [{
            label: 'Precio promedio', data: serie.map(s => s.precio),
            borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,.12)', fill: true,
            tension: .3, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#2563EB'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => mon(c.parsed.y) } } },
          scales: { y: { beginAtZero: false, ticks: { callback: v => mon(v) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
        }
      });
    }
  };

  function lineaEvol(evol) {
    return {
      type: 'line',
      data: {
        labels: evol.map(x => U.mesLargo(x.mes)),
        datasets: [{
          label: 'Compras', data: evol.map(x => x.total),
          borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,.14)', fill: true,
          tension: .35, borderWidth: 2.5, pointRadius: 3.5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => mon(c.parsed.y) } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => mon(v) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    };
  }

  /* ============================================================
     TABS Y FILTROS
     ============================================================ */
  App.acciones['tab-compras'] = function (d) {
    App.tabCompras = d.tab;
    App.render();
  };
  App.cambios['comp-txt'] = function (d, ev, el) {
    App.compFiltros.txt = el.value;
    App.render();
    const i = App.$('#f-comp-txt');
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  };
  App.cambios['comp-cat'] = function (d, ev, el) { App.compFiltros.cat = el.value; App.render(); };
  App.cambios['comp-serie'] = function (d, ev, el) { App.compSerie = el.value; App.render(); };

  /* ============================================================
     BOLETAS — MODAL EDITOR
     ============================================================ */
  function nuevaBoleta() {
    App.tmpBoleta = {
      id: null, fecha: new Date().toISOString().slice(0, 10),
      tiendaId: (C.tiendas(P())[0] || {}).id || '',
      nota: '', vincular: true,
      lineas: [{ productoId: '', cantidad: 1, precioUnit: 0 }]
    };
    pintarBoleta();
  }

  function editarBoleta(id) {
    const b = C.boletas(P()).find(x => x.id === id);
    if (!b) return;
    App.tmpBoleta = {
      id: b.id, fecha: b.fecha, tiendaId: b.tiendaId, nota: b.nota || '',
      vincular: !!b.egresoId,
      lineas: (b.lineas || []).map(l => ({
        productoId: l.productoId, cantidad: l.cantidad, precioUnit: l.precioUnit
      }))
    };
    if (!App.tmpBoleta.lineas.length) App.tmpBoleta.lineas.push({ productoId: '', cantidad: 1, precioUnit: 0 });
    pintarBoleta();
  }

  function precioSugerido(productoId, tiendaId, fecha) {
    const reg = C.precioVigente(P(), productoId, tiendaId, fecha);
    return reg ? reg.precio : 0;
  }

  function pintarBoleta() {
    const t = App.tmpBoleta;
    if (!t) return;
    const p = P();
    const prods = C.productos(p), tiendas = C.tiendas(p);

    let cuerpo = '<div class="campo fila"><div><label>Fecha de la compra</label>' +
      '<input type="date" id="bl-fecha" data-chg="bl-fecha" value="' + U.esc(t.fecha) + '"></div>' +
      '<div><label>Supermercado / tienda</label><select id="bl-tienda" data-chg="bl-tienda">' +
      tiendas.map(x => '<option value="' + x.id + '"' + (x.id === t.tiendaId ? ' selected' : '') + '>' +
        U.esc(x.nombre) + '</option>').join('') +
      '</select></div></div>';

    cuerpo += '<div class="seccion-tit">Productos de la boleta</div>';
    cuerpo += '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Producto</th>' +
      '<th class="num">Cantidad</th><th class="num">Precio unit.</th><th class="num">Subtotal</th><th></th>' +
      '</tr></thead><tbody id="bl-lineas">';

    t.lineas.forEach((l, i) => {
      cuerpo += '<tr data-i="' + i + '">' +
        '<td><select data-chg="ln-prod" data-i="' + i + '" style="min-width:170px">' +
        '<option value="">— Elegir —</option>' +
        prods.map(pr => '<option value="' + pr.id + '"' + (pr.id === l.productoId ? ' selected' : '') + '>' +
          U.esc(pr.nombre) + (pr.marca ? ' · ' + U.esc(pr.marca) : '') + '</option>').join('') +
        '</select></td>' +
        '<td class="num"><input type="text" data-chg="ln-cant" data-i="' + i + '" value="' + l.cantidad +
        '" style="width:74px;text-align:right"></td>' +
        '<td class="num"><input type="text" data-chg="ln-precio" data-i="' + i + '" value="' + l.precioUnit +
        '" style="width:92px;text-align:right"></td>' +
        '<td class="num" id="bl-sub-' + i + '"><b>' + mon(U.round2(l.cantidad * l.precioUnit)) + '</b></td>' +
        '<td class="num"><button class="btn mini peligro" data-acc="ln-del" data-i="' + i + '">✕</button></td>' +
        '</tr>';
    });

    cuerpo += '</tbody></table></div>' +
      '<div class="flex mt14"><button class="btn mini" data-acc="ln-add">＋ Agregar línea</button>' +
      '<span class="spacer"></span>' +
      '<span class="muted">Total:</span><b id="bl-total" style="font-size:19px">' + mon(t.total || 0) + '</b></div>' +
      '<div class="campo mt14"><label>Notas</label>' +
      '<input type="text" id="bl-nota" data-chg="bl-nota" placeholder="Ej: quincena, consumo de la semana…" value="' +
      U.esc(t.nota || '') + '"></div>' +
      '<div class="campo"><label><input type="checkbox" id="bl-vincular" data-chg="bl-vincular"' +
      (t.vincular !== false ? ' checked' : '') + '> Sumar esta compra a los gastos del hogar (crea un egreso automático)</label>' +
      '<small>El egreso aparece en Plan mensual con la marca 🛒 y entra en las estadísticas y el reparto.</small></div>';

    App.abrirModal(t.id ? 'Editar compra' : 'Registrar compra', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn primario" data-acc="compra-guardar">💾 Guardar compra</button>', 'ancho');

    recalcularBoleta();
  }

  function recalcularBoleta() {
    const t = App.tmpBoleta;
    if (!t) return;
    let total = 0;
    t.lineas.forEach((l, i) => {
      const st = U.round2((Number(l.cantidad) || 0) * (Number(l.precioUnit) || 0));
      total += st;
      const celda = App.$('#bl-sub-' + i);
      if (celda) celda.innerHTML = '<b>' + mon(st) + '</b>';
    });
    t.total = U.round2(total);
    const tot = App.$('#bl-total');
    if (tot) tot.textContent = mon(t.total);
  }

  App.acciones['compra-nueva'] = function () { nuevaBoleta(); };
  App.acciones['compras-cargar-demo'] = function () {
    const p = P();
    if (C.productos(p).length) { App.toast('Este proyecto ya tiene un catálogo de compras', 'err'); return; }
    C.semilla(p);
    App.guardar();
    App.render();
    App.toast('✅ Ejemplo de compras cargado: ' + C.productos(p).length + ' productos y ' +
      C.boletas(p).length + ' boletas', 'ok');
  };
  App.acciones['compra-editar'] = function (d) { editarBoleta(d.id); };

  App.acciones['ln-add'] = function () {
    App.tmpBoleta.lineas.push({ productoId: '', cantidad: 1, precioUnit: 0 });
    pintarBoleta();
  };
  App.acciones['ln-del'] = function (d) {
    const i = Number(d.i);
    App.tmpBoleta.lineas.splice(i, 1);
    if (!App.tmpBoleta.lineas.length) App.tmpBoleta.lineas.push({ productoId: '', cantidad: 1, precioUnit: 0 });
    pintarBoleta();
  };

  App.cambios['ln-prod'] = function (d, ev, el) {
    const t = App.tmpBoleta, i = Number(d.i);
    t.lineas[i].productoId = el.value;
    if (el.value) {
      t.lineas[i].precioUnit = precioSugerido(el.value, t.tiendaId, t.fecha);
      const inp = App.$('#bl-lineas tr[data-i="' + i + '"] input[data-chg="ln-precio"]');
      if (inp) inp.value = t.lineas[i].precioUnit;
    }
    recalcularBoleta();
  };
  App.cambios['ln-cant'] = function (d, ev, el) {
    const i = Number(d.i);
    App.tmpBoleta.lineas[i].cantidad = U.n(el.value);
    recalcularBoleta();
  };
  App.cambios['ln-precio'] = function (d, ev, el) {
    const i = Number(d.i);
    App.tmpBoleta.lineas[i].precioUnit = U.n(el.value);
    recalcularBoleta();
  };
  App.cambios['bl-fecha'] = function (d, ev, el) { App.tmpBoleta.fecha = el.value; };
  App.cambios['bl-nota'] = function (d, ev, el) { App.tmpBoleta.nota = el.value; };
  App.cambios['bl-vincular'] = function (d, ev, el) { App.tmpBoleta.vincular = el.checked; };
  App.cambios['bl-tienda'] = function (d, ev, el) {
    const t = App.tmpBoleta;
    t.tiendaId = el.value;
    t.lineas.forEach((l, i) => {
      if (!l.productoId) return;
      l.precioUnit = precioSugerido(l.productoId, t.tiendaId, t.fecha);
      const inp = App.$('#bl-lineas tr[data-i="' + i + '"] input[data-chg="ln-precio"]');
      if (inp) inp.value = l.precioUnit;
    });
    recalcularBoleta();
  };

  App.acciones['compra-guardar'] = function () {
    const t = App.tmpBoleta, p = P();
    if (!t) return;
    if (!t.tiendaId) { App.toast('Elegí una tienda', 'err'); return; }
    const validas = t.lineas.filter(l => l.productoId && U.n(l.cantidad) > 0);
    if (!validas.length) { App.toast('Agregá al menos un producto', 'err'); return; }
    const b = C.guardarBoleta(p, {
      id: t.id, fecha: t.fecha, tiendaId: t.tiendaId, nota: t.nota,
      lineas: validas, vincular: t.vincular
    });
    App.tmpBoleta = null;
    App.cerrarModal();
    App.guardar();
    App.render();
    App.toast('✅ Compra guardada: ' + mon(b.total) + (b.egresoId ? ' · egreso vinculado' : ''), 'ok');
  };

  App.acciones['compra-borrar'] = function (d) {
    const p = P(), b = C.boletas(p).find(x => x.id === d.id);
    if (!b) return;
    App.abrirModal('Eliminar compra',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar la compra del ' +
      U.esc(b.fecha) + '?</b><p>Se borrarán sus ' + (b.lineas || []).length + ' líneas' +
      (b.egresoId ? ' y el egreso vinculado a los gastos del hogar' : '') + '.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="compra-borrar-ok" data-id="' + b.id + '">Eliminar</button>');
  };
  App.acciones['compra-borrar-ok'] = function (d) {
    C.borrarBoleta(P(), d.id);
    App.cerrarModal();
    App.guardar();
    App.render();
    App.toast('Compra eliminada');
  };

  /* ============================================================
     PRODUCTOS Y TIENDAS
     ============================================================ */
  App.acciones['producto-nuevo'] = function () { productoModal(null); };
  App.acciones['producto-editar'] = function (d) { productoModal(C.producto(P(), d.id)); };

  function productoModal(pr) {
    const cuerpo = '<div class="campo fila"><div><label>Producto</label>' +
      '<input id="pr-nombre" placeholder="Ej: Arroz" value="' + U.esc(pr ? pr.nombre : '') + '"></div>' +
      '<div><label>Marca</label><input id="pr-marca" placeholder="Ej: La Espiga" value="' + U.esc(pr ? pr.marca : '') + '"></div></div>' +
      '<div class="campo fila"><div><label>Categoría</label><select id="pr-cat">' +
      C.CATEGORIAS.map(c => '<option' + (pr && pr.categoria === c ? ' selected' : '') + '>' + c + '</option>').join('') +
      '</select></div><div><label>Unidad de medida</label><select id="pr-uni">' +
      C.UNIDADES.map(u => '<option' + (pr && pr.unidad === u ? ' selected' : '') + '>' + u + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo"><label>Presentación / notas</label>' +
      '<input id="pr-pres" placeholder="Ej: funda de 1 kg" value="' + U.esc(pr ? pr.presentacion : '') + '"></div>';

    App.abrirModal(pr ? 'Editar producto' : 'Nuevo producto', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="producto-guardar" data-id="' + (pr ? pr.id : '') + '">💾 Guardar</button>');
    setTimeout(() => { const i = App.$('#pr-nombre'); if (i) i.focus(); }, 60);
  }

  App.acciones['producto-guardar'] = function (d) {
    const p = P();
    const nombre = ((App.$('#pr-nombre') || {}).value || '').trim();
    if (!nombre) { App.toast('Ingresá el nombre del producto', 'err'); return; }
    const datos = {
      nombre: nombre,
      marca: ((App.$('#pr-marca') || {}).value || '').trim(),
      categoria: (App.$('#pr-cat') || {}).value || 'Víveres',
      unidad: (App.$('#pr-uni') || {}).value || 'und',
      presentacion: ((App.$('#pr-pres') || {}).value || '').trim()
    };
    if (d.id) {
      const pr = C.producto(p, d.id);
      Object.assign(pr, datos);
      App.toast('Producto actualizado', 'ok');
    } else {
      C.crearProducto(p, datos);
      App.toast('Producto agregado al catálogo', 'ok');
    }
    App.cerrarModal();
    App.guardar();
    App.render();
  };

  App.acciones['producto-borrar'] = function (d) {
    const p = P(), pr = C.producto(p, d.id);
    if (!pr) return;
    const n = C.precios(p).filter(x => x.productoId === d.id).length;
    App.abrirModal('Eliminar producto',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar «' + U.esc(pr.nombre) + '»?</b>' +
      '<p>También se borrarán sus ' + n + ' mediciones de precio.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="producto-borrar-ok" data-id="' + d.id + '">Eliminar</button>');
  };
  App.acciones['producto-borrar-ok'] = function (d) {
    const p = P(), c = C.asegurar(p);
    c.productos = c.productos.filter(x => x.id !== d.id);
    c.precios = c.precios.filter(x => x.productoId !== d.id);
    c.boletas.forEach(b => { b.lineas = (b.lineas || []).filter(l => l.productoId !== d.id); });
    App.cerrarModal();
    App.guardar();
    App.render();
    App.toast('Producto eliminado');
  };

  App.acciones['tienda-nueva'] = function () {
    const cuerpo = '<div class="campo fila"><div><label>Nombre</label>' +
      '<input id="ti-nombre" placeholder="Ej: Aki"></div>' +
      '<div><label>Tipo</label><select id="ti-tipo">' +
      C.TIENDAS_TIPO.map(t => '<option value="' + t.id + '">' + t.nombre + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo"><label>Color</label><input id="ti-color" type="color" value="#2563EB"></div>';
    App.abrirModal('Nueva tienda / supermercado', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="tienda-guardar">＋ Agregar</button>');
    setTimeout(() => { const i = App.$('#ti-nombre'); if (i) i.focus(); }, 60);
  };
  App.acciones['tienda-guardar'] = function () {
    const nombre = ((App.$('#ti-nombre') || {}).value || '').trim();
    if (!nombre) { App.toast('Ingresá el nombre de la tienda', 'err'); return; }
    C.crearTienda(P(), {
      nombre: nombre,
      tipo: (App.$('#ti-tipo') || {}).value || 'supermercado',
      color: (App.$('#ti-color') || {}).value || '#2563EB'
    });
    App.cerrarModal();
    App.guardar();
    App.render();
    App.toast('Tienda agregada', 'ok');
  };

  App.acciones['precio-nuevo'] = function (d) {
    const p = P(), pr = C.producto(p, d.id);
    if (!pr) return;
    const tiendas = C.tiendas(p);
    const cuerpo = '<div class="alerta n-info"><div class="a-ico">＄</div><div><b class="t">' +
      U.esc(pr.nombre) + (pr.marca ? ' · ' + U.esc(pr.marca) : '') + '</b>' +
      '<p>Cargá el precio vigente en cada supermercado. Cada medición queda en el historial.</p></div></div>' +
      '<div class="campo fila"><div><label>Tienda</label><select id="pc-tienda">' +
      tiendas.map(t => '<option value="' + t.id + '">' + U.esc(t.nombre) + '</option>').join('') +
      '</select></div><div><label>Precio (' + U.esc(p.moneda) + ')</label>' +
      '<input id="pc-precio" class="dinero" placeholder="0.00"></div></div>' +
      '<div class="campo fila"><div><label>Fecha de medición</label>' +
      '<input type="date" id="pc-fecha" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div><label>Promoción válida hasta (opcional)</label>' +
      '<input type="date" id="pc-promo"></div></div>';
    App.abrirModal('Registrar precio', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="precio-guardar" data-id="' + pr.id + '">💾 Guardar precio</button>');
    setTimeout(() => { const i = App.$('#pc-precio'); if (i) i.focus(); }, 60);
  };
  App.acciones['precio-guardar'] = function (d) {
    const p = P();
    const precio = U.n((App.$('#pc-precio') || {}).value);
    if (!(precio > 0)) { App.toast('Ingresá un precio válido', 'err'); return; }
    const promo = (App.$('#pc-promo') || {}).value;
    C.registrarPrecio(p, {
      productoId: d.id,
      tiendaId: (App.$('#pc-tienda') || {}).value,
      precio: precio,
      fecha: (App.$('#pc-fecha') || {}).value || new Date().toISOString().slice(0, 10),
      promo: promo ? { hasta: promo } : null
    });
    App.cerrarModal();
    App.guardar();
    App.render();
    App.toast('✅ Precio registrado', 'ok');
  };

  /* ============================================================
     ASISTENTE DE COMPRAS
     ============================================================ */
  App.consultaCompras = function (texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    App.chatCompras.push({ rol: 'yo', texto: texto });
    let res = null;
    try { res = C.consultar(P(), texto); }
    catch (err) { res = { html: '<p>Ocurrió un error: ' + U.esc(err.message) + '</p>' }; }
    if (!res) {
      try { res = window.AfAgent.consultar(P(), texto); }
      catch (err2) { res = { html: '<p>Ocurrió un error: ' + U.esc(err2.message) + '</p>' }; }
    }
    App.chatCompras.push({ rol: 'ia', html: res.html });
    App.render();
  };

  App.acciones['compras-chat-enviar'] = function () {
    const i = App.$('#chatCompInput');
    if (!i) return;
    const v = i.value;
    i.value = '';
    App.consultaCompras(v);
  };
  App.acciones['compras-chat-pregunta'] = function (d) { App.consultaCompras(d.q); };
  App.acciones['compras-chat-limpiar'] = function () {
    App.chatCompras = [];
    App.render();
    App.toast('Conversación reiniciada', 'ok');
  };

  /* Enter en el chat de compras */
  document.addEventListener('keydown', function (ev) {
    if (ev.target && ev.key === 'Enter' && ev.target.id === 'chatCompInput') {
      ev.preventDefault();
      const v = ev.target.value;
      ev.target.value = '';
      App.consultaCompras(v);
    }
  });

  /* ============================================================
     EXPORTACIONES
     ============================================================ */
  App.acciones['compras-excel'] = function () {
    try { App.toast('Generando Excel…'); const n = D.comprasExcel(P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar Excel: ' + e.message, 'err'); }
  };
  App.acciones['compras-word'] = function () {
    try { const n = D.comprasWord(P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar Word: ' + e.message, 'err'); }
  };
  App.acciones['compras-pdf'] = function () {
    try { const n = D.comprasPDF(P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar PDF: ' + e.message, 'err'); }
  };
  App.acciones['compras-csv-boletas'] = function () {
    U.descargar(D.csvCompras(P(), App.MES()), U.slug(P().nombre) + '_compras.csv', 'text/csv;charset=utf-8');
    App.toast('✅ CSV de compras generado', 'ok');
  };
  App.acciones['compras-csv-precios'] = function () {
    U.descargar(D.csvPrecios(P()), U.slug(P().nombre) + '_precios.csv', 'text/csv;charset=utf-8');
    App.toast('✅ CSV de precios generado', 'ok');
  };
})();
