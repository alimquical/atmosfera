/* ============================================================
   Vistas: ANÁLISIS ESTADÍSTICO y AGENTE FINANCIERO
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E, S = App.S, A = App.A;
  const stat = App.stat;

  /* ============================================================
     ANÁLISIS ESTADÍSTICO
     ============================================================ */
  App.vistas.analisis = function () {
    const p = App.P(), mes = App.MES();
    const st = S.analizarProyecto(p, mes);
    const r = E.resumen(p, mes);
    const e = st.egresos;

    let h = '<div class="vista-tit">' +
      '<div><h1>Análisis estadístico</h1><p>Estadística descriptiva y tendencias · ' + U.mesLargo(mes) + '</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="descargar-excel">⬇ Excel estadístico</button>' +
      '<button class="btn primario" data-acc="ir" data-vista="agente">✦ Pedir informe</button>' +
      '</div></div>';

    if (e.vacio) {
      return h + App.vacio('Sin datos', 'Registrá egresos para obtener el análisis estadístico.',
        '<button class="btn primario" data-acc="ir" data-vista="plan">Ir al plan</button>');
    }

    h += '<div class="card"><div class="card-tit"><span class="ico">◔</span> Estadística descriptiva de los egresos' +
      '<span class="der">n = ' + e.n + ' observaciones</span></div>';

    h += '<div class="seccion-tit">Medidas de tendencia central</div><div class="stat-grid">' +
      stat('Media', U.moneda(e.media, p), 'promedio por concepto') +
      stat('Mediana', U.moneda(e.mediana, p), 'valor central') +
      stat('Moda', e.moda.valor === null ? 'Sin moda' : U.moneda(e.moda.valor, p),
        e.moda.valor === null ? 'todos los valores distintos' : 'se repite ' + e.moda.frecuencia + '×') +
      stat('Suma total', U.moneda(e.suma, p), 'Σ de los gastos') +
      stat('Desv. media absoluta', U.moneda(e.desvMediaAbs, p), 'MAD') +
      '</div>';

    h += '<div class="seccion-tit">Medidas de dispersión</div><div class="stat-grid">' +
      stat('Desviación estándar', U.moneda(e.desviacion, p), 'muestra (s)') +
      stat('Varianza', U.moneda(e.varianza, p), 's²') +
      stat('Coef. de variación', e.cv.toFixed(1) + '%',
        e.cv < 30 ? 'baja dispersión' : e.cv < 60 ? 'dispersión moderada' : 'alta dispersión') +
      stat('Rango', U.moneda(e.rango, p), 'máx − mín') +
      stat('Mínimo', U.moneda(e.min, p), 'concepto más barato') +
      stat('Máximo', U.moneda(e.max, p), 'concepto más costoso') +
      '</div>';

    h += '<div class="seccion-tit">Medidas de posición</div><div class="stat-grid">' +
      stat('Q1 (P25)', U.moneda(e.q1, p), 'percentil 25') +
      stat('Q2 (P50)', U.moneda(e.mediana, p), 'percentil 50') +
      stat('Q3 (P75)', U.moneda(e.q3, p), 'percentil 75') +
      stat('Rango intercuartílico', U.moneda(e.ric, p), 'Q3 − Q1') +
      stat('P10', U.moneda(e.p10, p), 'decila inferior') +
      stat('P90', U.moneda(e.p90, p), 'decila superior') +
      '</div>';

    h += '<div class="seccion-tit">Forma de la distribución</div><div class="stat-grid">' +
      stat('Asimetría (sesgo)', e.sesgo.toFixed(3),
        e.sesgo > 0.5 ? 'sesgo positivo: cola larga a la derecha' :
          e.sesgo < -0.5 ? 'sesgo negativo: cola a la izquierda' : 'aproximadamente simétrica') +
      stat('Curtosis', e.curtosis.toFixed(3),
        e.curtosis > 0 ? 'leptocúrtica: picos marcados' : 'platicúrtica: distribución aplanada') +
      stat('Valores atípicos', String(e.nAtipicos),
        e.atipicos.length ? U.moneda(e.atipicos[0], p) + (e.atipicos.length > 1 ? ' …' : '') : 'ninguno') +
      '</div></div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">🎯</span> Concentración del gasto</div>' +
      '<div class="stat-grid">' +
      stat('Top-1', U.pct(st.concentracion.top1), r.topCategoria) +
      stat('Top-3', U.pct(st.concentracion.top3), 'tres primeras categorías') +
      stat('Índice HHI', String(st.concentracion.hhi),
        st.concentracion.hhi > 2500 ? 'alta concentración' : st.concentracion.hhi > 1500 ? 'moderada' : 'baja') +
      stat('Categorías con gasto', String(st.categorias.length), 'activas') +
      '</div>' +
      '<div class="seccion-tit">Clases de frecuencia (Sturges)</div>' +
      tablaFrecuencias(p, e) +
      '</div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">📈</span> Tendencia y correlación</div>' +
      '<div class="stat-grid">' +
      stat('Tendencia egresos', (st.tendenciaEgresos >= 0 ? '+' : '') + U.moneda(st.tendenciaEgresos, p), 'variación media mensual') +
      stat('Tendencia ingresos', (st.tendenciaIngresos >= 0 ? '+' : '') + U.moneda(st.tendenciaIngresos, p), 'variación media mensual') +
      stat('Correlación ing/egr', st.correlacionIngEgr.toFixed(3),
        Math.abs(st.correlacionIngEgr) > .7 ? 'relación lineal fuerte' :
          Math.abs(st.correlacionIngEgr) > .4 ? 'relación moderada' : 'relación débil') +
      stat('Variación 12 meses', (st.variacionMensual >= 0 ? '+' : '') + st.variacionMensual.toFixed(1) + '%', 'primer vs. último mes') +
      '</div>' +
      '<div class="canvas-wrap med mt14"><canvas id="chSerie"></canvas></div>' +
      '</div></div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">▥</span> Histograma de egresos</div>' +
      '<div class="canvas-wrap med"><canvas id="chHist"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">▦</span> Gasto por categoría</div>' +
      '<div class="canvas-wrap med"><canvas id="chCatBar"></canvas></div></div>' +
      '</div>';

    h += '<div class="grid g2 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">⚖</span> Cuotas por miembro vs. ingreso</div>' +
      '<div class="canvas-wrap med"><canvas id="chCuotas"></canvas></div></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">◔</span> Caja de bigotes (Q1–Mediana–Q3)</div>' +
      '<div class="canvas-wrap med"><canvas id="chCaja"></canvas></div></div>' +
      '</div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">▤</span> Conceptos ordenados de mayor a menor</div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>#</th><th>Concepto</th><th>Categoría</th>' +
      '<th class="num">Valor</th><th class="num">% total</th><th class="num">Acumulado</th></tr></thead><tbody>';
    const orden = E.egresosDe(p, mes).slice().sort((a, b) => U.n(b.valor) - U.n(a.valor));
    let acum = 0;
    orden.forEach((eg, i) => {
      const v = U.n(eg.valor);
      acum += v;
      h += '<tr><td>' + (i + 1) + '</td><td><b>' + U.esc(eg.detalle) + '</b></td>' +
        '<td>' + U.esc(eg.categoria || '') + '</td>' +
        '<td class="num">' + U.moneda(v, p) + '</td>' +
        '<td class="num">' + U.pct(v / Math.max(.01, r.totalEgresos)) + '</td>' +
        '<td class="num">' + U.pct(acum / Math.max(.01, r.totalEgresos)) + '</td></tr>';
    });
    h += '</tbody></table></div></div>';

    return h;
  };

  function tablaFrecuencias(p, e) {
    const n = e.n;
    const k = Math.max(3, Math.min(8, Math.ceil(1 + 3.322 * Math.log10(n))));
    const ancho = (e.max - e.min) / k || 1;
    let filas = '', acum = 0;
    const egresos = E.egresosDe(App.P(), App.MES());
    for (let i = 0; i < k; i++) {
      const li = e.min + i * ancho;
      const ls = i === k - 1 ? e.max : e.min + (i + 1) * ancho;
      let f = 0;
      egresos.forEach(eg => {
        const v = U.n(eg.valor);
        if (v >= li && (i === k - 1 ? v <= ls : v < ls)) f++;
      });
      acum += f;
      const rel = n ? f / n : 0;
      filas += '<tr><td class="small">' + U.moneda(li, p) + ' – ' + U.moneda(ls, p) + '</td>' +
        '<td class="num">' + f + '</td><td class="num">' + U.pct(rel) + '</td>' +
        '<td>' + App.barra(rel, 'naranja') + '</td><td class="num">' + acum + '</td></tr>';
    }
    return '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Clase</th><th class="num">fi</th>' +
      '<th class="num">fr</th><th></th><th class="num">Fa</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  App.vistas.post_analisis = function () {
    const p = App.P(), mes = App.MES();
    const st = S.analizarProyecto(p, mes);
    const e = st.egresos;
    const P = App.PALETA;
    if (e.vacio) return;

    const k = Math.max(3, Math.min(8, Math.ceil(1 + 3.322 * Math.log10(e.n))));
    const ancho = (e.max - e.min) / k || 1;
    const etiquetas = [], frec = [];
    const egresos = E.egresosDe(p, mes);
    for (let i = 0; i < k; i++) {
      etiquetas.push(U.monedaCorto(e.min + i * ancho, p));
      let f = 0;
      egresos.forEach(eg => {
        const v = U.n(eg.valor);
        if (v >= e.min + i * ancho && (i === k - 1 ? v <= e.max : v < e.min + (i + 1) * ancho)) f++;
      });
      frec.push(f);
    }
    App.chart('chHist', {
      type: 'bar',
      data: { labels: etiquetas, datasets: [{ label: 'Frecuencia', data: frec, backgroundColor: 'rgba(37,99,235,.85)', borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EDF0F7' } },
          x: { grid: { display: false }, title: { display: true, text: 'Valor del gasto ($)' } }
        }
      }
    });

    App.chart('chCatBar', {
      type: 'bar',
      data: {
        labels: st.categorias.map(c => c.etiqueta),
        datasets: [{ label: 'Monto', data: st.categorias.map(c => c.valor), backgroundColor: st.categorias.map((c, i) => P[i % P.length]), borderRadius: 5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => U.moneda(c.parsed.y, p) } } },
        scales: {
          y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } },
          x: { grid: { display: false }, ticks: { maxRotation: 55, minRotation: 35, font: { size: 10 } } }
        }
      }
    });

    App.chart('chCuotas', {
      type: 'bar',
      data: {
        labels: st.cuotasPorPersona.map(c => c.etiqueta),
        datasets: [
          { label: 'Cuota asignada', data: st.cuotasPorPersona.map(c => c.valor), backgroundColor: '#2563EB', borderRadius: 5 },
          { label: 'Ingreso', data: E.personasActivas(p).map(x => x.ingreso), backgroundColor: 'rgba(22,163,74,.8)', borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + U.moneda(c.parsed.y, p) } } },
        scales: { y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    });

    App.chart('chCaja', {
      type: 'bar',
      data: {
        labels: ['Egresos del mes'],
        datasets: [
          { label: 'Mínimo', data: [e.min], backgroundColor: '#CBD5E1', stack: 'a' },
          { label: 'Q1', data: [e.q1 - e.min], backgroundColor: '#93C5FD', stack: 'a' },
          { label: 'Mediana', data: [e.mediana - e.q1], backgroundColor: '#2563EB', stack: 'a' },
          { label: 'Q3', data: [e.q3 - e.mediana], backgroundColor: '#93C5FD', stack: 'a' },
          { label: 'Máximo', data: [e.max - e.q3], backgroundColor: '#CBD5E1', stack: 'a' }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: c => {
                const m = { 'Mínimo': e.min, 'Q1': e.q1, 'Mediana': e.mediana, 'Q3': e.q3, 'Máximo': e.max };
                return c.dataset.label + ': ' + U.moneda(m[c.dataset.label], p);
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } },
          y: { stacked: true, grid: { display: false } }
        }
      }
    });

    App.chart('chSerie', {
      type: 'line',
      data: {
        labels: st.serie.map(s => s.etiqueta),
        datasets: [
          { label: 'Egresos', data: st.serie.map(s => s.egresos), borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,.12)', fill: true, tension: .35, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Ingresos', data: st.serie.map(s => s.ingresos), borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,.10)', fill: true, tension: .35, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Balance', data: st.serie.map(s => s.balance), borderColor: '#2563EB', borderDash: [7, 4], tension: .35, borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + U.moneda(c.parsed.y, p) } } },
        scales: { y: { ticks: { callback: v => U.monedaCorto(v, p) }, grid: { color: '#EDF0F7' } }, x: { grid: { display: false } } }
      }
    });
  };

  /* ============================================================
     AGENTE FINANCIERO
     ============================================================ */
  const SUGERENCIAS = [
    'Genera un informe completo',
    '¿Qué debo hacer este mes?',
    '¿Cómo está mi salud financiera?',
    '¿Cuánto es el total de egresos?',
    '¿Cuánto llevo pagado y cuánto falta?',
    '¿Qué porcentaje me corresponde pagar?',
    '¿Cuánto puedo ahorrar al año?',
    'Muéstrame la estadística descriptiva',
    '¿Cuáles son mis gastos más altos?'
  ];

  App.vistas.agente = function () {
    let h = '<div class="vista-tit">' +
      '<div><h1>Agente financiero</h1><p>Consultor contable con educación financiera · analiza, diagnóstica y recomienda</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="agente-limpiar">🗑 Limpiar</button>' +
      '<button class="btn acento" data-acc="agente-pregunta" data-q="Genera un informe completo">▤ Informe completo</button>' +
      '</div></div>';

    h += '<div class="card"><div class="chat"><div class="chat-hist" id="chatHist">';

    if (!App.chat.length) {
      h += '<div class="msg ia"><div class="burbuja"><div class="quien">✦ Agente financiero</div>' +
        '<p>Hola, soy tu contador virtual. Analizo la atmósfera económica de tu hogar con base en el plan mensual, ' +
        'los movimientos y la distribución de porcentajes.</p>' +
        '<p>Puedo darte un <b>resumen estadístico</b>, un <b>informe técnico financiero</b>, revisar <b>pagos</b>, ' +
        'calcular <b>cuánto le corresponde a cada persona</b> y recomendarte cómo administrar mejor el dinero.</p>' +
        '<p class="muted">Escribí tu pregunta o elegí una sugerencia:</p>' +
        '<div class="sugerencias">' +
        SUGERENCIAS.map(s => '<span class="sugerencia" data-acc="agente-pregunta" data-q="' + U.esc(s) + '">' +
          U.esc(s) + '</span>').join('') +
        '</div></div></div>';
    }

    App.chat.forEach(m => {
      h += '<div class="msg ' + (m.rol === 'yo' ? 'yo' : 'ia') + '"><div class="burbuja">' +
        (m.rol === 'yo' ? U.esc(m.texto) : '<div class="quien">✦ Agente financiero</div>' + m.html) +
        '</div></div>';
    });

    h += '</div><div class="chat-entrada">' +
      '<input id="chatInput" placeholder="Preguntale al agente… (Enter para enviar)">' +
      '<button class="btn primario" data-acc="agente-enviar">Enviar</button>' +
      '</div></div>';

    h += '<div class="grid g3 mt14">' +
      '<div class="card"><div class="card-tit"><span class="ico">📊</span> Resumen estadístico</div>' +
      '<p class="small muted">Tendencia central, dispersión, posición, concentración y tendencia de 12 meses.</p>' +
      '<button class="btn campo-ancho" data-acc="agente-pregunta" data-q="Muéstrame la estadística descriptiva">Generar</button></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">📝</span> Informe técnico</div>' +
      '<p class="small muted">Documento de 10 secciones: KPI, diagnóstico, distribución, alertas, recomendaciones y plan de acción.</p>' +
      '<button class="btn campo-ancho" data-acc="agente-pregunta" data-q="Genera un informe completo">Generar</button></div>' +
      '<div class="card"><div class="card-tit"><span class="ico">💡</span> Recomendaciones</div>' +
      '<p class="small muted">Acciones concretas priorizadas según reglas de educación financiera profesional.</p>' +
      '<button class="btn campo-ancho" data-acc="agente-pregunta" data-q="¿Qué debo hacer este mes?">Generar</button></div>' +
      '</div>';

    return h;
  };

  App.vistas.post_agente = function () {
    const h = App.$('#chatHist');
    if (h) h.scrollTop = h.scrollHeight;
  };

  App.enviarConsulta = function (texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    App.chat.push({ rol: 'yo', texto: texto });
    let res = null;
    /* primero intentamos resolverlo con el asistente de compras */
    if (window.AfCompras && window.AfCompras.consultar) {
      try { res = window.AfCompras.consultar(App.P(), texto); }
      catch (err) { console.error(err); res = null; }
    }
    if (!res) {
      try { res = A.consultar(App.P(), texto); }
      catch (err) { res = { html: '<p>Ocurrió un error al analizar: ' + U.esc(err.message) + '</p>' }; }
    }
    App.chat.push({ rol: 'ia', html: res.html });
    App.render();
  };

  App.acciones['agente-pregunta'] = function (d) {
    App.enviarConsulta(d.q);
  };
  App.acciones['agente-enviar'] = function () {
    const i = App.$('#chatInput');
    if (!i) return;
    const v = i.value;
    i.value = '';
    App.enviarConsulta(v);
  };
  App.acciones['agente-enviar-con'] = function (v) { App.enviarConsulta(v); };
  App.acciones['agente-limpiar'] = function () {
    App.chat = [];
    App.render();
    App.toast('Conversación reiniciada', 'ok');
  };
})();
