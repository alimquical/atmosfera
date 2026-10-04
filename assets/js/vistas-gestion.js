/* ============================================================
   Vistas: REPORTES, PROYECTOS y AJUSTES
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, E = App.E, A = App.A, D = App.D, Store = App.Store;

  /* ============================================================
     REPORTES Y DOCUMENTOS
     ============================================================ */
  App.vistas.reportes = function () {
    const p = App.P(), mes = App.MES();
    const inf = A.informe(p, mes);
    const sc = inf.score;
    const r = inf.resumen;

    let h = '<div class="vista-tit">' +
      '<div><h1>Reportes y documentos</h1><p>Descargá tus resultados en Excel, Word, PDF o CSV</p></div>' +
      '<div class="acciones">' +
      '<button class="btn acento" data-acc="exportar-paquete">📦 Paquete completo (carpeta)</button>' +
      '<button class="btn primario" data-acc="imprimir">🖨 Imprimir</button>' +
      '</div></div>';

    h += '<div class="grid g4">' +
      App.kpi('Período', U.mesLargo(mes), U.esc(p.nombre), 'morado') +
      App.kpi('Salud financiera', sc.score + '/100', sc.nivel, sc.score >= 70 ? 'verde' : 'naranja') +
      App.kpi('Documentos', '8 archivos', 'Excel · Word · PDF · TXT · CSV · JSON', 'naranja') +
      App.kpi('Balance del período', U.moneda(r.balance, p), U.pct(r.tasaAhorro) + ' de ahorro',
        r.balance >= 0 ? 'verde' : 'rojo') +
      '</div>';

    h += '<div class="grid g2 mt20"><div class="card">' +
      '<div class="card-tit"><span class="ico">⬇</span> Descargar documentos individuales</div>' +
      '<div class="grid g2">';

    const docs = [
      ['descargar-excel', '🗂 Excel (.xlsx)', '8 hojas: resumen, egresos, ingresos, balance, movimientos, estadísticas, alertas y catálogos.'],
      ['descargar-word', '📄 Word (.docx)', 'Informe técnico profesional con tablas, KPI, reparto por miembro y recomendaciones.'],
      ['descargar-pdf', '📕 PDF', 'Documento ejecutivo con portada, tarjetas KPI, tablas y gráficos de barras.'],
      ['descargar-txt', '📃 Texto (.txt)', 'Resumen ejecutivo en texto plano para copiar y pegar.'],
      ['descargar-csv-eg', '📊 CSV egresos', 'Egresos con porcentajes y montos por persona.'],
      ['descargar-csv-ing', '📊 CSV ingresos', 'Ingresos del plan con responsable y categoría.'],
      ['descargar-csv-mov', '📊 CSV movimientos', 'Libro de ingresos y egresos del período.'],
      ['descargar-json', '🗜 JSON proyecto', 'Copia de seguridad completa del proyecto.']
    ];
    docs.forEach(d => {
      h += '<button class="btn campo-ancho" style="justify-content:flex-start;text-align:left;height:auto;padding:13px" data-acc="' +
        d[0] + '"><span><b>' + d[1] + '</b><br><span class="muted small" style="font-weight:400">' + d[2] + '</span></span></button>';
    });
    h += '</div></div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">▤</span> Vista previa del informe' +
      '<span class="der"><button class="btn mini" data-acc="descargar-word">⬇ Word</button>' +
      '<button class="btn mini" data-acc="descargar-pdf">⬇ PDF</button></span></div>' +
      '<div style="max-height:560px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:18px;background:#fff">' +
      A.informeHTML(inf) + '</div></div></div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">▦</span> Resumen financiero técnico</div>' +
      '<div class="grid g2"><div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Indicador</th><th class="num">Valor</th></tr></thead><tbody>' +
      filasKPI(p, r) +
      '</tbody></table></div></div><div>' +
      '<div class="tabla-wrap"><table class="datos"><thead><tr><th>Miembro</th><th class="num">Ingreso</th>' +
      '<th class="num">Cuota</th><th class="num">Cancelado</th><th class="num">Pendiente</th></tr></thead><tbody>' +
      inf.filasPersonas.map(f => '<tr><td><b>' + U.esc(f.nombre) + '</b></td>' +
        '<td class="num">' + U.moneda(f.ingreso, p) + '</td>' +
        '<td class="num">' + U.moneda(f.cuota, p) + '</td>' +
        '<td class="num">' + U.moneda(f.pagado, p) + '</td>' +
        '<td class="num">' + U.moneda(f.saldo, p) + '</td></tr>').join('') +
      '</tbody></table></div></div></div></div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">⚠</span> Alertas y recomendaciones del período</div>' +
      '<div class="grid g2"><div>' +
      inf.diagnostico.alertas.map(a => '<div class="alerta n-' + a.nivel + '"><div class="a-ico">•</div><div>' +
        '<b class="t">' + U.esc(a.titulo) + '</b><p>' + U.esc(a.detalle) + '</p></div></div>').join('') +
      '</div><div>' +
      inf.recomendaciones.map(x => '<div class="alerta n-' + (x.prio === 'Alta' ? 'alta' : x.prio === 'Media' ? 'media' : 'info') +
        '"><div class="a-ico">→</div><div><b class="t">[' + U.esc(x.area) + '] ' + U.esc(x.prio) + '</b><p>' +
        U.esc(x.texto) + '</p></div></div>').join('') +
      '</div></div></div>';

    return h;
  };

  function filasKPI(p, r) {
    const filas = [
      ['Ingresos totales', U.moneda(r.flujoIngresos, p)],
      ['Sueldos base', U.moneda(r.sueldos, p)],
      ['Otros ingresos', U.moneda(r.totalIngresosPlan, p)],
      ['Egresos totales', U.moneda(r.totalEgresos, p)],
      ['Balance neto', U.moneda(r.balance, p)],
      ['Tasa de ahorro', U.pct(r.tasaAhorro)],
      ['Monto cancelado', U.moneda(r.pagado, p)],
      ['Monto pendiente', U.moneda(r.pendiente, p)],
      ['Cumplimiento de pagos', U.pct(r.eficienciaPago)],
      ['Gastos obligatorios', U.moneda(r.obligatorios, p)],
      ['Gastos variables', U.moneda(r.variables, p)],
      ['Deudas', U.moneda(r.deudas, p)],
      ['Endeudamiento', U.pct(r.tasaEndeudamiento)],
      ['Gasto por miembro', U.moneda(r.gastoPerCapita, p)],
      ['Ingreso por miembro', U.moneda(r.ingresoPerCapita, p)],
      ['Proyección anual de balance', U.moneda(r.anual.balance, p)]
    ];
    return filas.map(f => '<tr><td>' + f[0] + '</td><td class="num"><b>' + f[1] + '</b></td></tr>').join('');
  }

  /* Acciones de descarga */
  App.acciones['descargar-excel'] = function () {
    try { App.toast('Generando Excel…'); const n = D.descargarExcel(App.P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar Excel: ' + e.message, 'err'); }
  };
  App.acciones['descargar-word'] = function () {
    try { const n = D.descargarWord(App.P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar Word: ' + e.message, 'err'); }
  };
  App.acciones['descargar-pdf'] = function () {
    try { const n = D.descargarPDF(App.P(), App.MES()); App.toast('✅ ' + n, 'ok'); }
    catch (e) { console.error(e); App.toast('Error al generar PDF: ' + e.message, 'err'); }
  };
  App.acciones['descargar-txt'] = function () {
    try {
      const inf = A.informe(App.P(), App.MES());
      U.descargar(A.informeTexto(inf), U.slug(App.P().nombre) + '_resumen.txt', 'text/plain;charset=utf-8');
      App.toast('✅ Archivo de texto generado', 'ok');
    } catch (e) { App.toast('Error: ' + e.message, 'err'); }
  };
  App.acciones['descargar-csv-eg'] = function () {
    U.descargar(D.csvEgresos(App.P(), App.MES()),
      U.slug(App.P().nombre) + '_egresos.csv', 'text/csv;charset=utf-8');
    App.toast('✅ CSV de egresos generado', 'ok');
  };
  App.acciones['descargar-csv-mov'] = function () {
    U.descargar(D.csvMovimientos(App.P(), App.MES()),
      U.slug(App.P().nombre) + '_movimientos.csv', 'text/csv;charset=utf-8');
    App.toast('✅ CSV de movimientos generado', 'ok');
  };
  App.acciones['descargar-csv-ing'] = function () {
    const p = App.P(), mes = App.MES();
    const filas = [['Detalle', 'Categoria', 'Responsable', 'Dia', 'Mes', 'Valor', 'Medio', 'Notas']];
    E.ingresosDe(p, mes).forEach(i => filas.push([
      i.detalle, i.categoria || '', E.nombrePersona(p, i.personaId), i.dia || '',
      i.mes || mes, U.n(i.valor), i.lugar || '', i.notas || '']));
    const csv = '\ufeff' + filas.map(f => f.map(c => {
      const s = String(c === null || c === undefined ? '' : c);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
    U.descargar(csv, U.slug(p.nombre) + '_ingresos.csv', 'text/csv;charset=utf-8');
    App.toast('✅ CSV de ingresos generado', 'ok');
  };
  App.acciones['descargar-json'] = function () {
    Store.descargarJSON(App.P().id);
    App.toast('✅ Copia JSON descargada', 'ok');
  };

  App.acciones['exportar-paquete'] = async function () {
    const p = App.P(), mes = App.MES();
    App.toast('Generando paquete…');
    try {
      const archivos = D.paquete(p, mes);
      if (window.showDirectoryPicker) {
        const r = await Store.exportarACarpeta(p.id, archivos);
        if (r.ok) App.toast('✅ Paquete guardado en la carpeta «' + r.ruta + '» (' + r.carpetas + ' archivos)', 'ok');
        else descargaUnoPorUno(archivos);
      } else {
        descargaUnoPorUno(archivos);
      }
    } catch (e) {
      console.error(e);
      if (e && e.name === 'AbortError') App.toast('Exportación cancelada');
      else { App.toast('Error: ' + e.message, 'err'); descargaUnoPorUno(D.paquete(p, mes)); }
    }
  };

  function descargaUnoPorUno(archivos) {
    App.toast('Tu navegador no permite guardar en carpeta: descargando archivo por archivo');
    archivos.forEach((f, i) => {
      setTimeout(() => {
        const blob = f.contenido instanceof Blob ? f.contenido : new Blob([f.contenido]);
        U.descargar(blob, f.nombre);
      }, i * 700);
    });
  }

  /* ============================================================
     PROYECTOS
     ============================================================ */
  App.vistas.proyectos = function () {
    const lista = Store.listar();
    const actual = Store.actual();

    let h = '<div class="vista-tit">' +
      '<div><h1>Mis proyectos</h1><p>Cada hogar tiene su propia carpeta de datos, personas y plan económico</p></div>' +
      '<div class="acciones">' +
      '<button class="btn" data-acc="importar-json">⬆ Importar proyecto</button>' +
      '<button class="btn acento" data-acc="nuevo-proyecto">＋ Crear proyecto nuevo</button>' +
      '</div></div>';

    if (!lista.length) {
      return h + App.vacio('Sin proyectos', 'Creá tu primer proyecto para empezar.',
        '<button class="btn acento" data-acc="nuevo-proyecto">＋ Crear proyecto</button>');
    }

    h += '<div class="grid g2">';
    lista.forEach(x => {
      const p = Store.get(x.id);
      let r = { flujoIngresos: 0, totalEgresos: 0, balance: 0 };
      try { r = E.resumen(p, (p.config && p.config.mesActivo) || U.mesActual()); } catch (e) { }
      h += '<div class="proy-card' + (x.id === actual ? ' activo-proy' : '') + '">' +
        '<div class="ico">🏠</div><div style="flex:1">' +
        '<h4>' + U.esc(x.nombre) + (x.id === actual ? ' <span class="badge-est b-alto">Activo</span>' : '') + '</h4>' +
        '<div class="meta">' + U.esc(x.propietario || '—') + ' · ' + x.personas + ' miembro(s) · ' +
        U.esc(p.moneda) + ' · creado ' + U.esc(String(x.fechaCreacion || '').slice(0, 10)) + '</div>' +
        '<div class="stat-grid mt8" style="grid-template-columns:repeat(3,1fr)">' +
        '<div class="stat"><div class="k">Ingresos</div><div class="v" style="font-size:14px">' + U.moneda(r.flujoIngresos, p) + '</div></div>' +
        '<div class="stat"><div class="k">Egresos</div><div class="v" style="font-size:14px">' + U.moneda(r.totalEgresos, p) + '</div></div>' +
        '<div class="stat"><div class="k">Balance</div><div class="v" style="font-size:14px">' + U.moneda(r.balance, p) + '</div></div>' +
        '</div>' +
        '<div class="acts mt14">' +
        '<button class="btn mini primario" data-acc="abrir-proyecto" data-id="' + x.id + '">Abrir</button>' +
        '<button class="btn mini" data-acc="duplicar-proyecto" data-id="' + x.id + '">Duplicar</button>' +
        '<button class="btn mini" data-acc="exportar-proyecto-json" data-id="' + x.id + '">⬇ JSON</button>' +
        '<button class="btn mini" data-acc="exportar-carpeta" data-id="' + x.id + '">📁 Carpeta</button>' +
        '<button class="btn mini peligro" data-acc="borrar-proyecto" data-id="' + x.id + '">🗑</button>' +
        '</div></div></div>';
    });
    h += '</div>';

    h += '<div class="card mt20"><div class="card-tit"><span class="ico">💡</span> Cómo ofrecer este sistema a otros hogares</div>' +
      '<ol class="small" style="line-height:1.95;color:var(--txt-2);padding-left:20px">' +
      '<li><b>Crear proyecto nuevo</b> con el botón «＋ Crear proyecto nuevo»: cada hogar queda con su propia carpeta de datos.</li>' +
      '<li><b>Configurar personas e ingresos</b>: el sistema calcula automáticamente el porcentaje equilibrado para cada miembro.</li>' +
      '<li><b>Cargar egresos</b> (luz, agua, internet, comida, cuotas) con valor, categoría y vencimiento.</li>' +
      '<li><b>Registrar pagos</b>: cada persona cancela sus cuotas y el sistema actualiza saldos y estadísticas.</li>' +
      '<li><b>Entregar reportes</b>: Excel para trabajar, Word/PDF para presentar, CSV para sistemas externos.</li>' +
      '<li><b>Exportar a carpeta</b> un paquete completo listo para el cliente (Chrome/Edge), o descargar uno por uno.</li>' +
      '</ol></div>';

    return h;
  };

  App.acciones['abrir-proyecto'] = function (d) {
    Store.setActual(d.id);
    App.chat = [];
    App.navegar('panel');
    App.toast('✅ Proyecto abierto', 'ok');
  };

  App.acciones['duplicar-proyecto'] = function (d) {
    const c = Store.duplicar(d.id);
    if (c) { App.render(); App.toast('✅ Proyecto duplicado: ' + c.nombre, 'ok'); }
  };

  App.acciones['exportar-proyecto-json'] = function (d) {
    Store.descargarJSON(d.id);
    App.toast('✅ JSON descargado', 'ok');
  };

  App.acciones['exportar-carpeta'] = async function (d) {
    const p = Store.get(d.id);
    try {
      const archivos = D.paquete(p, (p.config && p.config.mesActivo) || U.mesActual());
      const r = await Store.exportarACarpeta(p.id, archivos);
      if (r.ok) App.toast('✅ Carpeta «' + r.ruta + '» creada con ' + r.carpetas + ' archivos', 'ok');
      else App.toast('Tu navegador no soporta guardar en carpeta. Usá «⬇ JSON» o el paquete desde Reportes.');
    } catch (e) {
      if (e && e.name === 'AbortError') App.toast('Cancelado');
      else App.toast('Error: ' + e.message, 'err');
    }
  };

  App.acciones['borrar-proyecto'] = function (d) {
    const p = Store.get(d.id);
    if (!p) return;
    App.abrirModal('Eliminar proyecto',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">Esta acción no se puede deshacer</b>' +
      '<p>Se eliminará «' + U.esc(p.nombre) + '» con todas sus personas, egresos, ingresos y movimientos.</p></div></div>' +
      '<div class="campo"><label>Escribí ELIMINAR para confirmar</label>' +
      '<input id="m-confirmar" placeholder="ELIMINAR"></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-borrar-proyecto" data-id="' + d.id + '">Eliminar definitivamente</button>');
  };

  App.acciones['confirmar-borrar-proyecto'] = function (d) {
    const v = (App.$('#m-confirmar') || {}).value || '';
    if (v.trim().toUpperCase() !== 'ELIMINAR') {
      App.toast('Escribí ELIMINAR para confirmar', 'err');
      return;
    }
    Store.eliminar(d.id);
    Store.asegurarDatos();
    App.cerrarModal();
    App.render();
    App.toast('Proyecto eliminado', 'ok');
  };

  App.acciones['importar-json'] = function () {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.addEventListener('change', function () {
      const f = this.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = function () {
        try {
          const p = Store.importarJSON(fr.result);
          Store.setActual(p.id);
          App.chat = [];
          App.render();
          App.toast('✅ Proyecto importado: ' + p.nombre, 'ok');
        } catch (e) { App.toast('Error al importar: ' + e.message, 'err'); }
      };
      fr.readAsText(f);
    });
    inp.click();
  };

  /* ============================================================
     AJUSTES
     ============================================================ */
  App.vistas.ajustes = function () {
    const p = App.P();

    let h = '<div class="vista-tit"><div><h1>Ajustes y catálogos</h1>' +
      '<p>Información del proyecto, categorías y parámetros de cálculo</p></div>' +
      '<div class="acciones"><button class="btn verde" data-acc="guardar-ajustes">💾 Guardar cambios</button></div></div>';

    h += '<div class="grid g2"><div class="card"><div class="card-tit"><span class="ico">🏠</span> Datos del proyecto</div>' +
      '<div class="campo"><label>Nombre del hogar / proyecto</label><input id="aj-nombre" value="' + U.esc(p.nombre || '') + '"></div>' +
      '<div class="campo fila"><div><label>Responsable</label><input id="aj-propietario" value="' + U.esc(p.propietario || '') + '"></div>' +
      '<div><label>País</label><input id="aj-pais" value="' + U.esc(p.pais || '') + '"></div></div>' +
      '<div class="campo fila"><div><label>Ciudad</label><input id="aj-ciudad" value="' + U.esc(p.ciudad || '') + '"></div>' +
      '<div><label>Moneda</label><select id="aj-moneda">' +
      ['USD', 'EUR', 'MXN', 'COP', 'PEN', 'ARS', 'CLP', 'BRL', 'GTQ', 'DOP'].map(m =>
        '<option' + (p.moneda === m ? ' selected' : '') + '>' + m + '</option>').join('') +
      '</select></div></div>' +
      '<div class="campo"><label>Notas</label><textarea id="aj-notas" rows="3">' + U.esc(p.notas || '') + '</textarea></div>' +
      '</div>';

    h += '<div class="card"><div class="card-tit"><span class="ico">⚙</span> Parámetros de cálculo</div>' +
      '<div class="campo"><label>Estrategia de reparto automático</label><select id="aj-estrategia">' +
      E.ESTRATEGIAS.map(s => '<option value="' + s.id + '"' + (p.config.estrategiaGlobal === s.id ? ' selected' : '') +
        '>' + s.nombre + '</option>').join('') +
      '</select><small>Define cómo se calcula la cuota de cada persona cuando no hay reparto manual.</small></div>' +
      '<div class="campo"><label>Mes de trabajo</label><select id="aj-mes">' +
      App.mesesDisponibles().map(m => '<option value="' + m + '"' + (m === App.MES() ? ' selected' : '') + '>' +
        U.mesLargo(m) + '</option>').join('') +
      '</select></div>' +
      '<div class="campo"><label>Porcentajes actuales (suma 100%)</label>' +
      '<div class="dist-grid">' +
      (p.personas || []).map(x => '<div class="dist-item"><div class="nom">' + App.avatar(x) + U.esc(x.nombre) + '</div>' +
        '<input type="number" step="0.01" min="0" max="100" id="aj-pct-' + x.id + '" value="' +
        ((p.config.porcentajes || {})[x.id] !== undefined ? p.config.porcentajes[x.id] :
          (E.porcentajesSugeridos(p)[x.id] || 0)) + '">' +
        '<div class="res"><span>Ingreso</span><b>' + U.moneda(x.ingreso, p) + '</b></div></div>').join('') +
      '</div>' +
      '<div class="mt8"><button class="btn mini" data-acc="auto-pct">⚡ Recalcular automáticamente</button></div>' +
      '</div></div></div>';

    const n = App.Cloud ? App.Cloud.cfg : { url: '', clave: '', auto: false, ultimaSync: '' };
    h += '<div class="card mt14"><div class="card-tit"><span class="ico">☁</span> Nube — Google Drive' +
      '<span class="der" id="nb-estado">' +
      (n.ultimoEstado ? '<span class="badge-est b-parcial">' + U.esc(n.ultimoEstado) + '</span>' : '') +
      '</span></div>' +
      '<p class="small muted">Usa un servicio de Google Apps Script que guarda una copia de todos tus proyectos ' +
      'en tu propio Google Drive. Funciona desde el celular y desde la PC con los mismos datos.</p>' +
      '<div class="campo"><label>URL del servicio (la que entrega «Implementar → Implementación web»)</label>' +
      '<input id="nb-url" placeholder="https://script.google.com/macros/s/AKfyc.../exec" value="' +
      U.esc(n.url || '') + '"></div>' +
      '<div class="campo"><label>Clave secreta (la misma que define CLAVE en el script)</label>' +
      '<input id="nb-clave" type="password" placeholder="Clave de acceso" value="' + U.esc(n.clave || '') + '"></div>' +
      '<div class="campo"><label><input type="checkbox" id="nb-auto" data-chg="nube-auto"' +
      (n.auto ? ' checked' : '') + '> Sincronizar automáticamente cada vez que guardo cambios</label>' +
      '<small>Última sincronización: ' + (n.ultimaSync ? U.esc(String(n.ultimaSync).replace('T', ' ').slice(0, 19)) : 'nunca') +
      '</small></div>' +
      '<div class="flex" style="gap:8px;flex-wrap:wrap">' +
      '<button class="btn mini" data-acc="nube-probar">🔌 Probar conexión</button>' +
      '<button class="btn mini verde" data-acc="nube-subir">⬆ Subir a la nube</button>' +
      '<button class="btn mini acento" data-acc="nube-bajar">⬇ Descargar de la nube</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn mini primario" data-acc="nube-guardar-cfg">💾 Guardar config</button>' +
      '</div></div>';

    h += '<div class="grid g2 mt14">' +
      catCard('categoriasEgreso', 'Categorías de egreso', p.categoriasEgreso) +
      catCard('categoriasIngreso', 'Categorías de ingreso', p.categoriasIngreso) +
      '</div>';

    h += '<div class="grid g2 mt14">' +
      catCard('categoriasMov', 'Categorías de movimientos', p.categoriasMov) +
      catCard('metodos', 'Métodos / lugares de pago', p.metodos) +
      '</div>';

    h += '<div class="card mt14"><div class="card-tit"><span class="ico">🗑</span> Zona de peligro</div>' +
      '<div class="flex flex-wrap">' +
      '<button class="btn peligro" data-acc="vaciar-egresos">Vaciar egresos del mes</button>' +
      '<button class="btn peligro" data-acc="vaciar-movimientos">Vaciar movimientos</button>' +
      '<button class="btn peligro" data-acc="borrar-proyecto" data-id="' + p.id + '">Eliminar este proyecto</button>' +
      '<button class="btn" data-acc="restaurar-demo">↺ Restaurar proyecto de ejemplo</button>' +
      '<button class="btn" data-acc="borrar-todo-almacen">Borrar TODO el almacenamiento</button>' +
      '</div>' +
      '<p class="small muted mt14">Los datos se guardan en este dispositivo (almacenamiento local del navegador). ' +
      'Exportá periódicamente una copia JSON o el paquete completo.</p>' +
      '</div>';

    return h;
  };

  function catCard(clave, titulo, lista) {
    return '<div class="card"><div class="card-tit"><span class="ico">☰</span> ' + titulo +
      '<span class="der"><button class="btn mini acento" data-acc="nueva-cat" data-clave="' + clave + '">＋ Agregar</button></span></div>' +
      '<div class="flex flex-wrap">' +
      (lista || []).map(c => '<span class="chip">' + U.esc(c) +
        ' <a data-acc="borrar-cat" data-clave="' + clave + '" data-val="' + U.esc(c) + '" style="cursor:pointer;color:var(--red)">✕</a></span>').join('') +
      '</div></div>';
  }

  App.acciones['guardar-ajustes'] = function () {
    const p = App.P();
    p.nombre = (App.$('#aj-nombre') || {}).value || p.nombre;
    p.propietario = (App.$('#aj-propietario') || {}).value || '';
    p.pais = (App.$('#aj-pais') || {}).value || '';
    p.ciudad = (App.$('#aj-ciudad') || {}).value || '';
    p.moneda = (App.$('#aj-moneda') || {}).value || 'USD';
    p.notas = (App.$('#aj-notas') || {}).value || '';
    p.config.estrategiaGlobal = (App.$('#aj-estrategia') || {}).value || 'proporcional';
    const mesNuevo = (App.$('#aj-mes') || {}).value;
    if (mesNuevo) p.config.mesActivo = mesNuevo;

    const pct = {};
    let suma = 0;
    (p.personas || []).forEach(x => {
      const el = App.$('#aj-pct-' + x.id);
      if (el) { pct[x.id] = Math.max(0, U.n(el.value)); suma += pct[x.id]; }
    });
    if (Math.abs(suma - 100) > 0.01 && suma > 0) {
      p.config.porcentajes = E.normalizar(Object.keys(pct).map(k => pct[k]))
        .reduce((acc, v, i) => { acc[Object.keys(pct)[i]] = v; return acc; }, {});
      App.toast('Los porcentajes se normalizaron a 100% (suma ' + suma.toFixed(2) + '%)');
    } else {
      p.config.porcentajes = pct;
    }

    App.guardar();
    App.render();
    App.toast('✅ Ajustes guardados', 'ok');
  };

  App.acciones['nueva-cat'] = function (d) {
    App.abrirModal('Nueva categoría',
      '<div class="campo"><label>Nombre de la categoría</label><input id="m-cat-nombre" placeholder="Ej: Guardería"></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="guardar-cat" data-clave="' + d.clave + '">＋ Agregar</button>');
    setTimeout(() => { const i = App.$('#m-cat-nombre'); if (i) i.focus(); }, 60);
  };

  App.acciones['guardar-cat'] = function (d) {
    const p = App.P();
    const v = ((App.$('#m-cat-nombre') || {}).value || '').trim();
    if (!v) { App.toast('Ingresá un nombre', 'err'); return; }
    if (!p[d.clave]) p[d.clave] = [];
    if (p[d.clave].indexOf(v) < 0) p[d.clave].push(v);
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('Categoría agregada', 'ok');
  };

  App.acciones['borrar-cat'] = function (d) {
    const p = App.P();
    p[d.clave] = (p[d.clave] || []).filter(x => x !== d.val);
    App.guardar();
    App.render();
    App.toast('Categoría eliminada');
  };

  App.acciones['vaciar-egresos'] = function () {
    const p = App.P(), mes = App.MES();
    App.abrirModal('Vaciar egresos del mes',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar ' +
      E.egresosDe(p, mes).length + ' egresos de ' + U.mesLargo(mes) + '?</b><p>No se puede deshacer.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-vaciar-egresos">Eliminar</button>');
  };

  App.acciones['confirmar-vaciar-egresos'] = function () {
    const p = App.P(), mes = App.MES();
    p.egresos = (p.egresos || []).filter(e => e.mes !== mes);
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('Egresos del mes eliminados', 'ok');
  };

  App.acciones['vaciar-movimientos'] = function () {
    App.abrirModal('Vaciar movimientos',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar todos los movimientos?</b>' +
      '<p>No se puede deshacer.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-vaciar-mov">Eliminar</button>');
  };

  App.acciones['confirmar-vaciar-mov'] = function () {
    App.P().movimientos = [];
    App.guardar();
    App.cerrarModal();
    App.render();
    App.toast('Movimientos eliminados', 'ok');
  };

  App.acciones['restaurar-demo'] = function () {
    App.abrirModal('Restaurar ejemplo',
      '<div class="alerta n-critico"><div class="a-ico">↺</div><div><b class="t">Reemplazar este proyecto por el de ejemplo</b>' +
      '<p>Se perderán los datos actuales de este proyecto.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-demo">Reemplazar</button>');
  };

  App.acciones['confirmar-demo'] = function () {
    Store.eliminar(App.P().id);
    Store.crearDemo();
    App.cerrarModal();
    App.chat = [];
    App.navegar('panel');
    App.toast('✅ Proyecto de ejemplo restaurado', 'ok');
  };

  App.acciones['borrar-todo-almacen'] = function () {
    App.abrirModal('Borrar todo el almacenamiento',
      '<div class="alerta n-critico"><div class="a-ico">⚠</div><div><b class="t">Se eliminarán TODOS los proyectos</b>' +
      '<p>Exportá primero una copia. Esta acción borra todo lo guardado en este navegador.</p></div></div>' +
      '<div class="campo"><label>Escribí BORRAR para confirmar</label><input id="m-confirmar" placeholder="BORRAR"></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="confirmar-borrar-todo">Borrar todo</button>');
  };

  App.acciones['confirmar-borrar-todo'] = function () {
    const v = ((App.$('#m-confirmar') || {}).value || '').trim().toUpperCase();
    if (v !== 'BORRAR') { App.toast('Escribí BORRAR para confirmar', 'err'); return; }
    try { localStorage.clear(); } catch (e) { }
    location.reload();
  };
})();
