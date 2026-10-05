/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — docs.js
   Generación de documentos: Excel (.xlsx), Word (.docx),
   PDF, CSV y texto plano.
   ============================================================ */
(function (global) {
  'use strict';

  const U = global.Util;
  const E = global.AfEngine;
  const S = global.AfStats;
  const A = global.AfAgent;
  const D = {};

  function mon(p, v) { return U.moneda(v, p); }

  /* ============================================================
     EXCEL
     ============================================================ */
  D._hoja = function (filas, anchos) {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    if (anchos) ws['!cols'] = anchos.map(w => ({ wch: w }));
    return ws;
  };

  D.excel = function (p, mes) {
    mes = mes || E.mesActivo(p);
    const r = E.resumen(p, mes);
    const st = S.analizarProyecto(p, mes);
    const inf = A.informe(p, mes);
    const bp = r.balancePersonas;
    const personas = E.personasActivas(p);
    const egresos = E.egresosDe(p, mes);
    const ingresos = E.ingresosDe(p, mes);
    const movs = E.movimientosDe(p, mes);

    const wb = XLSX.utils.book_new();

    /* ---- 1. RESUMEN ---- */
    const resumen = [
      ['ATMÓSFERA FINANCIERA DEL HOGAR'],
      ['Proyecto', p.nombre || ''],
      ['Responsable', p.propietario || ''],
      ['Período', U.mesLargo(mes)],
      ['Generado', new Date().toLocaleString('es-EC')],
      [],
      ['INDICADOR', 'VALOR', 'OBSERVACIÓN'],
      ['Ingresos totales', r.flujoIngresos, 'Sueldos + otros ingresos del plan'],
      ['  Sueldos base', r.sueldos, 'Suma de ingresos de las personas'],
      ['  Otros ingresos', r.totalIngresosPlan, 'Ingresos variables del plan'],
      ['Egresos totales', r.totalEgresos, r.nEgresos + ' conceptos'],
      ['Balance neto', r.balance, r.balance >= 0 ? 'Superávit' : 'Déficit'],
      ['Tasa de ahorro', r.tasaAhorro, 'Balance / ingresos'],
      ['Monto cancelado', r.pagado, 'Pagos ya realizados'],
      ['Monto pendiente', r.pendiente, 'Por cancelar'],
      ['Cumplimiento de pagos', r.eficienciaPago, 'Pagado / total egresos'],
      ['Gastos obligatorios', r.obligatorios, 'Fijos e impostergables'],
      ['Gastos variables', r.variables, 'Discrecionales'],
      ['Deudas', r.deudas, 'Cuotas de crédito'],
      ['Endeudamiento', r.tasaEndeudamiento, 'Deudas / ingresos'],
      ['Gasto por miembro', r.gastoPerCapita, 'Promedio'],
      ['Ingreso por miembro', r.ingresoPerCapita, 'Promedio'],
      ['Top categoría', r.topCategoria, r.porCategoria[r.topCategoria] ? mon(p, r.porCategoria[r.topCategoria]) : ''],
      [],
      ['PUNTUACIÓN', E.score(p, mes).score, E.score(p, mes).nivel],
      [],
      ['PROYECCIÓN ANUAL (12 meses)'],
      ['Ingresos proyectados', r.anual.ingresos, ''],
      ['Egresos proyectados', r.anual.egresos, ''],
      ['Balance proyectado', r.anual.balance, '']
    ];
    XLSX.utils.book_append_sheet(wb, D._hoja(resumen, [34, 18, 42]), 'RESUMEN');

    /* ---- 2. EGRESOS + DISTRIBUCIÓN ---- */
    const cabEgr = ['DETALLE', 'CATEGORÍA', 'TIPO', 'DÍA', 'VALOR', 'OBLIGATORIO',
      'ESTADO', 'CANCELADO', 'PENDIENTE'].concat(personas.map(x => x.nombre + ' (%)'))
      .concat(personas.map(x => x.nombre + ' ($)'));

    const filasEgr = [cabEgr];
    egresos.forEach(eg => {
      const est = E.estadoEgreso(p, eg);
      const d = E.distribucion(p, eg);
      const fila = [eg.detalle, eg.categoria, eg.tipoGasto || 'fijo', eg.dia || '',
        U.n(eg.valor), eg.obligatorio === false ? 'No' : 'Sí',
        est.estado === 'pagado' ? 'PAGADO' : (est.estado === 'parcial' ? 'PARCIAL' : 'PENDIENTE'),
        est.pagado, est.saldo];
      d.ids.forEach((id, i) => fila.push(d.pcts[i] / 100));
      d.ids.forEach((id, i) => fila.push(d.montos[i]));
      filasEgr.push(fila);
    });
    filasEgr.push(['TOTAL', '', '', '', r.totalEgresos, '', '', r.pagado, r.pendiente]
      .concat(personas.map(() => '')).concat(personas.map(() => '')));

    const anchosEgr = [30, 22, 12, 6, 14, 12, 12, 14, 14]
      .concat(personas.map(() => 12)).concat(personas.map(() => 14));
    const wsEgr = D._hoja(filasEgr, anchosEgr);
    // formatos de porcentaje
    filasEgr.forEach((fila, ri) => {
      for (let c = 9; c < 9 + personas.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: ri, c: c });
        if (wsEgr[ref] && typeof wsEgr[ref].v === 'number') wsEgr[ref].z = '0.00%';
      }
      for (let c = 4; c <= 8; c++) {
        if (c === 6) continue;
        const ref = XLSX.utils.encode_cell({ r: ri, c: c });
        if (wsEgr[ref] && typeof wsEgr[ref].v === 'number') wsEgr[ref].z = '$#,##0.00';
      }
      const off = 9 + personas.length;
      for (let c = off; c < off + personas.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: ri, c: c });
        if (wsEgr[ref] && typeof wsEgr[ref].v === 'number') wsEgr[ref].z = '$#,##0.00';
      }
    });
    XLSX.utils.book_append_sheet(wb, wsEgr, 'EGRESOS');

    /* ---- 3. INGRESOS ---- */
    const filasIng = [['DETALLE', 'CATEGORÍA', 'RESPONSABLE', 'DÍA', 'FECHA', 'VALOR', 'MÉTODO', 'NOTAS']];
    ingresos.forEach(ig => filasIng.push([
      ig.detalle, ig.categoria || '', E.nombrePersona(p, ig.personaId),
      ig.dia || '', ig.fecha || '', U.n(ig.valor), ig.lugar || '', ig.notas || '']));
    filasIng.push(['TOTAL', '', '', '', '', r.totalIngresosPlan, '', '']);
    const wsIng = D._hoja(filasIng, [32, 24, 20, 6, 12, 14, 14, 30]);
    for (let ri = 1; ri < filasIng.length; ri++) {
      const ref = XLSX.utils.encode_cell({ r: ri, c: 5 });
      if (wsIng[ref]) wsIng[ref].z = '$#,##0.00';
    }
    XLSX.utils.book_append_sheet(wb, wsIng, 'INGRESOS');

    /* ---- 4. BALANCE POR PERSONA ---- */
    const filasBal = [['MIEMBRO', 'INGRESO', 'CUOTA ASIGNADA', '% DEL INGRESO',
      'CANCELADO', 'PENDIENTE', '% CANCELADO', 'BALANCE PERSONAL']];
    personas.forEach(x => {
      const b = bp[x.id] || {};
      filasBal.push([x.nombre, b.ingresoEfectivo || 0, b.debe || 0,
        b.ingresoEfectivo ? (b.debe / b.ingresoEfectivo) : 0,
        b.pagado || 0, (b.debe || 0) - (b.pagado || 0),
        b.debe ? (b.pagado / b.debe) : 1, b.saldo || 0]);
    });
    const wsBal = D._hoja(filasBal, [26, 14, 16, 16, 14, 14, 14, 18]);
    for (let ri = 1; ri < filasBal.length; ri++) {
      [1, 2, 4, 5, 7].forEach(c => {
        const ref = XLSX.utils.encode_cell({ r: ri, c });
        if (wsBal[ref]) wsBal[ref].z = '$#,##0.00';
      });
      [3, 6].forEach(c => {
        const ref = XLSX.utils.encode_cell({ r: ri, c });
        if (wsBal[ref]) wsBal[ref].z = '0.00%';
      });
    }
    XLSX.utils.book_append_sheet(wb, wsBal, 'BALANCE PERSONAS');

    /* ---- 5. MOVIMIENTOS ---- */
    const filasMov = [['FECHA', 'DESCRIPCIÓN', 'CATEGORÍA', 'CANTIDAD', 'TIPO', 'LUGAR']];
    movs.forEach(m => filasMov.push([m.fecha, m.descripcion, m.categoria, U.n(m.cantidad), m.tipo, m.lugar || '']));
    const rm = E.resumenMovimientos(p, mes);
    filasMov.push(['', 'TOTAL INGRESOS', '', rm.ingresos, 'Ingreso', '']);
    filasMov.push(['', 'TOTAL EGRESOS', '', -rm.egresos, 'Egreso', '']);
    filasMov.push(['', 'POSICIÓN NETA', '', rm.posicionNeta, '', '']);
    const wsMov = D._hoja(filasMov, [12, 34, 22, 16, 12, 14]);
    for (let ri = 1; ri < filasMov.length; ri++) {
      const ref = XLSX.utils.encode_cell({ r: ri, c: 3 });
      if (wsMov[ref] && typeof wsMov[ref].v === 'number') wsMov[ref].z = '$#,##0.00';
    }
    XLSX.utils.book_append_sheet(wb, wsMov, 'MOVIMIENTOS');

    /* ---- 6. ESTADÍSTICAS ---- */
    const e = st.egresos;
    const filasEst = [
      ['ESTADÍSTICA DESCRIPTIVA — EGRESOS', U.mesLargo(mes)],
      [],
      ['MEDIDA', 'VALOR']
    ];
    if (!e.vacio) {
      [['Observaciones (n)', e.n], ['Suma', e.suma], ['Media', e.media], ['Mediana', e.mediana],
      ['Moda', e.moda.valor === null ? 'Sin moda' : e.moda.valor], ['Mínimo', e.min], ['Máximo', e.max],
      ['Rango', e.rango], ['Q1', e.q1], ['Q3', e.q3], ['Rango intercuartílico', e.ric],
      ['Percentil 10', e.p10], ['Percentil 90', e.p90], ['Varianza', e.varianza],
      ['Desviación estándar', e.desviacion], ['Coef. variación (%)', e.cv],
      ['Desviación media absoluta', e.desvMediaAbs], ['Asimetría (sesgo)', e.sesgo],
      ['Curtosis', e.curtosis], ['Valores atípicos', e.nAtipicos]]
        .forEach(x => filasEst.push(x));
    }
    filasEst.push([]);
    filasEst.push(['TENDENCIA Y SERIE']);
    filasEst.push(['Mes', 'Ingresos', 'Egresos', 'Balance']);
    st.serie.forEach(s => filasEst.push([s.etiqueta, s.ingresos, s.egresos, s.balance]));
    filasEst.push([]);
    filasEst.push(['CONCENTRACIÓN POR CATEGORÍA']);
    filasEst.push(['Categoría', 'Monto', '% del total']);
    st.categorias.forEach(c => filasEst.push([c.etiqueta, c.valor, r.totalEgresos ? c.valor / r.totalEgresos : 0]));
    const wsEst = D._hoja(filasEst, [34, 16, 16, 16]);
    for (let ri = 1; ri < filasEst.length; ri++) {
      const a = filasEst[ri][0];
      const ref = XLSX.utils.encode_cell({ r: ri, c: 1 });
      const ref2 = XLSX.utils.encode_cell({ r: ri, c: 2 });
      if (typeof filasEst[ri][1] === 'number' && ['Suma', 'Media', 'Mediana', 'Moda', 'Mínimo', 'Máximo',
        'Rango', 'Q1', 'Q3', 'Rango intercuartílico', 'Percentil 10', 'Percentil 90', 'Varianza',
        'Desviación estándar', 'Desviación media absoluta'].indexOf(a) >= 0 && wsEst[ref]) wsEst[ref].z = '$#,##0.00';
      if (wsEst[ref] && (filasEst[ri][0] === 'Ingresos' || filasEst[ri][0] === 'Egresos' || filasEst[ri][0] === 'Balance')) wsEst[ref].z = '$#,##0.00';
      if (wsEst[ref2] && filasEst[ri][0] !== 'Categoría' && typeof filasEst[ri][1] === 'number') wsEst[ref2].z = '$#,##0.00';
      if (wsEst[ref2] && typeof filasEst[ri][2] === 'number' && filasEst[ri][0] !== 'Categoría') wsEst[ref2].z = '$#,##0.00';
      const ref3 = XLSX.utils.encode_cell({ r: ri, c: 2 });
      if (wsEst[ref3] && typeof filasEst[ri][2] === 'number' && filasEst[ri][0] !== 'Categoría' && filasEst[ri][2] <= 1 && filasEst[ri][2] >= 0 && String(filasEst[ri][1]).indexOf('0') !== 0) { /* deja como está */ }
    }
    // % en columna C de concentración
    for (let ri = 1; ri < filasEst.length; ri++) {
      if (typeof filasEst[ri][2] === 'number' && filasEst[ri][0] !== 'Categoría' && filasEst[ri][0] !== 'Q1' && filasEst[ri][0] !== 'Q3' && filasEst[ri][0] !== 'Percentil 10' && filasEst[ri][0] !== 'Percentil 90' && filasEst[ri][0] !== 'Rango intercuartílico' && filasEst[ri][0] !== 'Varianza' && filasEst[ri][0] !== 'Desviación estándar' && filasEst[ri][0] !== 'Asimetría (sesgo)' && filasEst[ri][0] !== 'Curtosis' && filasEst[ri][0] !== 'Coef. variación (%)' && filasEst[ri][0] !== 'Desviación media absoluta') {
        const ref = XLSX.utils.encode_cell({ r: ri, c: 2 });
        if (wsEst[ref]) wsEst[ref].z = '0.00%';
      }
    }
    XLSX.utils.book_append_sheet(wb, wsEst, 'ESTADÍSTICAS');

    /* ---- 7. ALERTAS Y RECOMENDACIONES ---- */
    const filasAl = [['ALERTAS DEL PERÍODO'], ['NIVEL', 'TÍTULO', 'DETALLE', 'ACCIÓN']];
    inf.diagnostico.alertas.forEach(a => filasAl.push([a.nivel, a.titulo, a.detalle, a.accion || '']));
    filasAl.push([]);
    filasAl.push(['RECOMENDACIONES PROFESIONALES']);
    filasAl.push(['PRIORIDAD', 'ÁREA', 'RECOMENDACIÓN', 'IMPACTO']);
    A.recomendaciones(p, mes).forEach(x => filasAl.push([x.prio, x.area, x.texto, x.impacto || '']));
    XLSX.utils.book_append_sheet(wb, D._hoja(filasAl, [14, 26, 90, 30]), 'ALERTAS');

    /* ---- 8. CATÁLOGOS ---- */
    const filasCat = [['PERSONAS', 'INGRESO BASE', 'COLOR', 'ACTIVO']];
    personas.forEach(x => filasCat.push([x.nombre, x.ingreso, x.color, x.activo ? 'Sí' : 'No']));
    filasCat.push([]);
    filasCat.push(['CATEGORÍAS DE EGRESO']);
    (p.categoriasEgreso || []).forEach(c => filasCat.push([c]));
    filasCat.push([]);
    filasCat.push(['CATEGORÍAS DE INGRESO']);
    (p.categoriasIngreso || []).forEach(c => filasCat.push([c]));
    XLSX.utils.book_append_sheet(wb, D._hoja(filasCat, [30, 16, 14, 10]), 'CATÁLOGOS');

    return wb;
  };

  D.descargarExcel = function (p, mes) {
    const wb = D.excel(p, mes);
    const nombre = U.slug(p.nombre) + '_' + (mes || E.mesActivo(p)) + '_plan.xlsx';
    XLSX.writeFile(wb, nombre);
    return nombre;
  };

  /* ============================================================
     WORD (.docx) — generado con ZIP propio
     ============================================================ */
  function xmlEsc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }

  function parrafo(texto, op) {
    op = op || {};
    const jc = op.alineado ? '<w:jc w:val="' + op.alineado + '"/>' : '';
    const esp = op.espacio ? '<w:spacing w:before="' + op.espacio + '" w:after="' + op.espacio + '"/>' : '';
    const col = op.color ? '<w:color w:val="' + op.color + '"/>' : '';
    const sz = op.tamano ? '<w:sz w:val="' + (op.tamano * 2) + '"/><w:szCs w:val="' + (op.tamano * 2) + '"/>' : '';
    const neg = op.negrita ? '<w:b/>' : '';
    const ital = op.cursiva ? '<w:i/>' : '';
    const ppr = (jc || esp) ? '<w:pPr>' + jc + esp + '</w:pPr>' : '';
    return '<w:p>' + ppr + '<w:r><w:rPr>' + neg + ital + col + sz + '</w:rPr>' +
      '<w:t xml:space="preserve">' + xmlEsc(texto) + '</w:t></w:r></w:p>';
  }

  function tabla(filas, opciones) {
    const op = opciones || {};
    let h = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
      '<w:tblBorders>' +
      '<w:top w:val="single" w:sz="4" w:color="9CA3AF"/>' +
      '<w:left w:val="single" w:sz="4" w:color="9CA3AF"/>' +
      '<w:bottom w:val="single" w:sz="4" w:color="9CA3AF"/>' +
      '<w:right w:val="single" w:sz="4" w:color="9CA3AF"/>' +
      '<w:insideH w:val="single" w:sz="4" w:color="D1D5DB"/>' +
      '<w:insideV w:val="single" w:sz="4" w:color="D1D5DB"/>' +
      '</w:tblBorders></w:tblPr>';
    filas.forEach((fila, i) => {
      const esCab = (i === 0 && op.cabecera !== false);
      h += '<w:tr>';
      fila.forEach((celda) => {
        h += '<w:tc><w:tcPr>' +
          (esCab ? '<w:shd w:val="clear" w:color="auto" w:fill="1F3864"/>' :
            (i % 2 === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>' : '')) +
          '<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>' +
          '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>' +
          '</w:tcPr>' +
          parrafo(String(celda === null || celda === undefined ? '' : celda), {
            negrita: esCab, color: esCab ? 'FFFFFF' : '111827', tamano: 9
          }) + '</w:tc>';
      });
      h += '</w:tr>';
    });
    return h + '</w:tbl>' + parrafo('', { tamano: 6 });
  }

  function construirDocumento(contenido) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + contenido +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500"/>' +
      '</w:sectPr></w:body></w:document>';
  }

  D.wordBytes = function (p, mes, inf) {
    inf = inf || A.informe(p, mes);
    const r = inf.resumen;
    let c = '';

    c += parrafo('ATMÓSFERA FINANCIERA DEL HOGAR', { alineado: 'center', negrita: true, tamano: 20, color: '1F3864', espacio: 60 });
    c += parrafo(inf.titulo, { alineado: 'center', negrita: true, tamano: 14, color: 'EA580C' });
    c += parrafo(inf.subtitulo, { alineado: 'center', tamano: 11, color: '374151' });
    c += parrafo('Generado: ' + inf.generado + '  ·  Salud financiera: ' +
      inf.score.score + '/100 (' + inf.score.nivel + ')', { alineado: 'center', tamano: 9, color: '6B7280', espacio: 200 });

    // Ficha
    c += parrafo('FICHA DEL PROYECTO', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    c += tabla([
      ['Campo', 'Valor'],
      ['Proyecto', p.nombre || ''],
      ['Responsable', p.propietario || ''],
      ['Ubicación', [p.ciudad, p.pais].filter(Boolean).join(', ')],
      ['Moneda', p.moneda || 'USD'],
      ['Miembros del hogar', String(r.nPersonas)],
      ['Período analizado', U.mesLargo(r.mes)],
      ['Conceptos de egreso', String(r.nEgresos)],
      ['Conceptos de ingreso', String(r.nIngresos)]
    ]);

    // Indicadores
    c += parrafo('1. INDICADORES CLAVE (KPI)', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    c += tabla([
      ['Indicador', 'Valor', 'Observación'],
      ['Ingresos totales', mon(p, r.flujoIngresos), 'Sueldos + otros ingresos'],
      ['Egresos totales', mon(p, r.totalEgresos), r.nEgresos + ' conceptos'],
      ['Balance neto', mon(p, r.balance), r.balance >= 0 ? 'Superávit' : 'Déficit'],
      ['Tasa de ahorro', U.pct(r.tasaAhorro), r.tasaAhorro >= 0.2 ? 'Meta alcanzada' : 'Por debajo del 20%'],
      ['Cancelado', mon(p, r.pagado), U.pct(r.eficienciaPago)],
      ['Pendiente', mon(p, r.pendiente), 'Por cancelar'],
      ['Endeudamiento', U.pct(r.tasaEndeudamiento), r.tasaEndeudamiento <= 0.2 ? 'Saludable' : 'Revisar'],
      ['Gasto por miembro', mon(p, r.gastoPerCapita), 'Promedio'],
      ['Gastos variables', mon(p, r.variables), U.pct(r.flujoIngresos ? r.variables / r.flujoIngresos : 0) + ' del ingreso'],
      ['Proyección anual', mon(p, r.anual.balance), 'Balance proyectado 12 meses']
    ]);

    // Balance por persona
    c += parrafo('2. DISTRIBUCIÓN Y BALANCE POR MIEMBRO', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const filas = [['Miembro', 'Ingreso', 'Cuota', '% ingreso', 'Cancelado', 'Pendiente', 'Balance']];
    inf.filasPersonas.forEach(f => filas.push([
      f.nombre, mon(p, f.ingreso), mon(p, f.cuota), U.pct(f.pctIngreso),
      mon(p, f.pagado), mon(p, f.saldo), mon(p, f.balance)
    ]));
    c += tabla(filas);

    // Egresos
    c += parrafo('3. DETALLE DE EGRESOS Y REPARTO', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const personas = E.personasActivas(p);
    const fEgr = [['Concepto', 'Categoría', 'Valor', 'Estado'].concat(personas.map(x => x.nombre))];
    E.egresosDe(p, r.mes).forEach(eg => {
      const est = E.estadoEgreso(p, eg);
      const d = E.distribucion(p, eg);
      fEgr.push([eg.detalle, eg.categoria, mon(p, U.n(eg.valor)),
      est.estado === 'pagado' ? 'Pagado' : est.estado === 'parcial' ? 'Parcial' : 'Pendiente']
        .concat(d.montos.map(m => mon(p, m))));
    });
    fEgr.push(['TOTAL', '', mon(p, r.totalEgresos), '']
      .concat(personas.map(x => mon(p, (inf.resumen.balancePersonas[x.id] || {}).debe || 0))));
    c += tabla(fEgr);

    // Ingresos
    c += parrafo('4. DETALLE DE INGRESOS', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const fIng = [['Concepto', 'Categoría', 'Responsable', 'Valor']];
    E.ingresosDe(p, r.mes).forEach(ig => fIng.push([
      ig.detalle, ig.categoria || '', E.nombrePersona(p, ig.personaId), mon(p, U.n(ig.valor))]));
    fIng.push(['TOTAL', '', '', mon(p, r.totalIngresosPlan)]);
    c += tabla(fIng);

    // Secciones del informe
    inf.secciones.forEach(s => {
      c += parrafo(s.titulo.toUpperCase(), { negrita: true, tamano: 12, color: '1F3864', espacio: 240 });
      s.parrafos.forEach(pz => c += parrafo('• ' + pz, { tamano: 10, espacio: 40 }));
    });

    // Recomendaciones
    c += parrafo('PLAN DE ACCIÓN Y RECOMENDACIONES', { negrita: true, tamano: 12, color: '1F3864', espacio: 240 });
    c += tabla([['Prioridad', 'Área', 'Recomendación', 'Impacto']]
      .concat(inf.recomendaciones.map(x => [x.prio, x.area, x.texto, x.impacto || '—'])));

    c += parrafo('Documento generado automáticamente por ATMÓSFERA FINANCIERA DEL HOGAR. ' +
      'Cifras expresadas en ' + (p.moneda || 'USD') + '.', {
      alineado: 'center', tamano: 8, color: '9CA3AF', cursiva: true, espacio: 300
    });

    const zip = U.zip([
      {
        nombre: '[Content_Types].xml',
        datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>'
      },
      {
        nombre: '_rels/.rels',
        datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>'
      },
      { nombre: 'word/document.xml', datos: construirDocumento(c) }
    ]);

    return zip;
  };

  D.word = function (p, mes, inf) {
    return new Blob([D.wordBytes(p, mes, inf)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  };

  D.descargarWord = function (p, mes, inf) {
    const b = D.word(p, mes, inf);
    const nombre = U.slug(p.nombre) + '_' + (mes || E.mesActivo(p)) + '_informe.docx';
    U.descargar(b, nombre, b.type);
    return nombre;
  };

  /* ============================================================
     PDF (jsPDF)
     ============================================================ */
  D.pdf = function (p, mes, inf, incluirGraficos) {
    inf = inf || A.informe(p, mes);
    const r = inf.resumen;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, ML = 15, MR = 15;
    const CW = W - ML - MR;
    let y = 0;
    let pagina = 1;

    const AZUL = [31, 56, 100], NARANJA = [234, 88, 12], GRIS = [107, 114, 128],
      OSCURO = [17, 24, 39], CLARO = [243, 244, 246], VERDE = [22, 163, 74], ROJO = [220, 38, 38];

    function pie() {
      doc.setDrawColor(220, 220, 220);
      doc.line(ML, H - 14, W - MR, H - 14);
      doc.setFontSize(7.5); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.text('ATMÓSFERA FINANCIERA DEL HOGAR — ' + (p.nombre || ''), ML, H - 10);
      doc.text('Pág. ' + pagina, W - MR, H - 10, { align: 'right' });
    }

    function nuevaPagina() { doc.addPage(); pagina++; y = 20; }

    function espacio(h) {
      if (y + h > H - 20) { pie(); nuevaPagina(); }
    }

    function titulo(tam, color, txt) {
      espacio(tam + 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(tam);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(txt, ML, y);
      y += tam * 0.5 + 2;
    }

    function texto(txt, tam, color, negrita) {
      doc.setFont('helvetica', negrita ? 'bold' : 'normal');
      doc.setFontSize(tam || 9.5);
      doc.setTextColor(color ? color[0] : OSCURO[0], color ? color[1] : OSCURO[1], color ? color[2] : OSCURO[2]);
      const lineas = doc.splitTextToSize(String(txt), CW);
      lineas.forEach(l => {
        espacio(5);
        doc.text(l, ML, y);
        y += (tam || 9.5) * 0.52;
      });
    }

    function tablaPdf(filas, anchos, op) {
      op = op || {};
      const fs = op.fs || 8;
      const pad = 1.6;
      filas.forEach((fila, i) => {
        doc.setFontSize(fs);
        doc.setFont('helvetica', i === 0 && op.cabecera !== false ? 'bold' : 'normal');
        let alto = 0;
        fila.forEach((celda, ci) => {
          const w = anchos[ci] * CW / 100;
          const lineas = doc.splitTextToSize(String(celda === undefined || celda === null ? '' : celda), w - 3);
          alto = Math.max(alto, lineas.length * (fs * 0.42) + pad);
        });
        espacio(alto + 1);
        const esCab = i === 0 && op.cabecera !== false;
        if (esCab) { doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]); doc.rect(ML, y - fs * 0.35, CW, alto + pad, 'F'); }
        else if (i % 2 === 0) { doc.setFillColor(CLARO[0], CLARO[1], CLARO[2]); doc.rect(ML, y - fs * 0.35, CW, alto + pad, 'F'); }
        let x = ML;
        fila.forEach((celda, ci) => {
          const w = anchos[ci] * CW / 100;
          doc.setTextColor(esCab ? 255 : OSCURO[0], esCab ? 255 : OSCURO[1], esCab ? 255 : OSCURO[2]);
          const lineas = doc.splitTextToSize(String(celda === undefined || celda === null ? '' : celda), w - 3);
          let yy = y;
          lineas.forEach(l => { doc.text(l, x + 1.5, yy); yy += fs * 0.42; });
          x += w;
        });
        y += alto + pad;
        doc.setDrawColor(225, 225, 225);
        doc.line(ML, y - pad * 0.4, ML + CW, y - pad * 0.4);
      });
      y += 2;
    }

    /* ---- Portada / cabecera ---- */
    doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFillColor(NARANJA[0], NARANJA[1], NARANJA[2]);
    doc.rect(0, 38, W, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('ATMOSFERA FINANCIERA DEL HOGAR', ML, 17);
    doc.setFontSize(11);
    doc.text('Informe financiero y económico mensual', ML, 25);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text((p.nombre || '') + '  ·  ' + (inf.subtitulo || ''), ML, 32);
    y = 50;

    doc.setFontSize(8.5); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text('Generado: ' + inf.generado, ML, y); y += 5;
    doc.text('Responsable: ' + (p.propietario || '—') + '   ·   Moneda: ' + (p.moneda || 'USD'), ML, y); y += 8;

    /* ---- KPIs en cajas ---- */
    const kpis = [
      ['INGRESOS', mon(p, r.flujoIngresos), VERDE],
      ['EGRESOS', mon(p, r.totalEgresos), NARANJA],
      ['BALANCE', mon(p, r.balance), r.balance >= 0 ? VERDE : ROJO],
      ['AHORRO', U.pct(r.tasaAhorro), AZUL]
    ];
    const bw = (CW - 6 * 3) / 4;
    espacio(24);
    kpis.forEach((k, i) => {
      const x = ML + i * (bw + 6);
      doc.setFillColor(CLARO[0], CLARO[1], CLARO[2]);
      doc.roundedRect(x, y, bw, 20, 2, 2, 'F');
      doc.setFillColor(k[2][0], k[2][1], k[2][2]);
      doc.rect(x, y, 1.6, 20, 'F');
      doc.setFontSize(7); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.setFont('helvetica', 'bold'); doc.text(k[0], x + 5, y + 7);
      doc.setFontSize(11); doc.setTextColor(OSCURO[0], OSCURO[1], OSCURO[2]);
      doc.text(String(k[1]), x + 5, y + 15);
    });
    y += 26;

    texto('Salud financiera: ' + inf.score.score + '/100 — ' + inf.score.nivel, 10, AZUL, true);
    texto(inf.diagnostico.veredicto, 9.5, OSCURO, false);
    y += 3;

    /* ---- Secciones ---- */
    inf.secciones.forEach(sec => {
      espacio(18);
      doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.rect(ML, y - 4, 2, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.text(sec.titulo, ML + 5, y + 1);
      y += 7;
      sec.parrafos.forEach(pz => texto('• ' + pz, 9, OSCURO, false));
      y += 3;
    });

    /* ---- Tabla de miembros ---- */
    espacio(30);
    doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
    doc.rect(ML, y - 4, 2, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
    doc.text('Cuadro de responsabilidad por miembro', ML + 5, y + 1);
    y += 8;
    const fMem = [['Miembro', 'Ingreso', 'Cuota', '% ingr.', 'Pagado', 'Pendiente', 'Balance']];
    inf.filasPersonas.forEach(f => fMem.push([
      f.nombre, mon(p, f.ingreso), mon(p, f.cuota), U.pct(f.pctIngreso),
      mon(p, f.pagado), mon(p, f.saldo), mon(p, f.balance)
    ]));
    tablaPdf(fMem, [19, 14, 13, 10, 14, 14, 16]);

    /* ---- Gráfico de barras: categorías ---- */
    if (incluirGraficos !== false && r.porCategoria && Object.keys(r.porCategoria).length) {
      espacio(70);
      doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.rect(ML, y - 4, 2, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.text('Distribución del gasto por categoría', ML + 5, y + 1);
      y += 8;

      const cats = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a]).slice(0, 8);
      const max = Math.max.apply(null, cats.map(c => r.porCategoria[c])) || 1;
      const barraW = CW - 60;
      cats.forEach(c => {
        espacio(9);
        doc.setFontSize(8); doc.setTextColor(OSCURO[0], OSCURO[1], OSCURO[2]);
        doc.setFont('helvetica', 'normal');
        const et = doc.splitTextToSize(c, 52)[0];
        doc.text(et, ML, y);
        const w = Math.max(1, (r.porCategoria[c] / max) * barraW);
        doc.setFillColor(NARANJA[0], NARANJA[1], NARANJA[2]);
        doc.rect(ML + 54, y - 3.4, w, 4.4, 'F');
        doc.setFontSize(7.5); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
        doc.text(mon(p, r.porCategoria[c]), ML + 56 + w, y);
        y += 7;
      });
      y += 3;
    }

    /* ---- Serie 12 meses ---- */
    const st = inf.diagnostico.stats;
    if (st.serie && st.serie.length) {
      espacio(60);
      doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.rect(ML, y - 4, 2, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.setTextColor(AZUL[0], AZUL[1], AZUL[2]);
      doc.text('Comportamiento de los últimos 12 meses', ML + 5, y + 1);
      y += 8;
      const fSerie = [['Mes', 'Ingresos', 'Egresos', 'Balance']];
      st.serie.forEach(s => fSerie.push([s.etiqueta, mon(p, s.ingresos), mon(p, s.egresos), mon(p, s.balance)]));
      tablaPdf(fSerie, [25, 25, 25, 25]);
    }

    pie();
    return doc;
  };

  D.descargarPDF = function (p, mes, inf) {
    const doc = D.pdf(p, mes, inf);
    const nombre = U.slug(p.nombre) + '_' + (mes || E.mesActivo(p)) + '_informe.pdf';
    doc.save(nombre);
    return nombre;
  };

  /* ============================================================
     CSV / TXT
     ============================================================ */
  function csvDe(filas) {
    return filas.map(f => f.map(c => {
      const s = String(c === null || c === undefined ? '' : c);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
  }

  D.csvEgresos = function (p, mes) {
    const personas = E.personasActivas(p);
    const filas = [['Detalle', 'Categoria', 'Tipo', 'Valor', 'Estado']
      .concat(personas.map(x => x.nombre + ' %'))
      .concat(personas.map(x => x.nombre + ' $'))];
    E.egresosDe(p, mes).forEach(eg => {
      const est = E.estadoEgreso(p, eg);
      const d = E.distribucion(p, eg);
      filas.push([eg.detalle, eg.categoria, eg.tipoGasto, U.n(eg.valor), est.estado]
        .concat(d.pcts).concat(d.montos));
    });
    return '\ufeff' + csvDe(filas);
  };

  D.csvMovimientos = function (p, mes) {
    const filas = [['Fecha', 'Descripcion', 'Categoria', 'Cantidad', 'Tipo', 'Lugar']];
    E.movimientosDe(p, mes).forEach(m => filas.push([m.fecha, m.descripcion, m.categoria, U.n(m.cantidad), m.tipo, m.lugar]));
    return '\ufeff' + csvDe(filas);
  };

  /* ============================================================
     PAQUETE COMPLETO: varios archivos para una carpeta
     ============================================================ */
  D.paquete = function (p, mes) {
    mes = mes || E.mesActivo(p);
    const inf = A.informe(p, mes);
    const wb = D.excel(p, mes);

    // Excel como binario
    const excelBin = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Word
    const wordBin = D.wordBytes(p, mes, inf);

    // PDF como binario
    const pdfDoc = D.pdf(p, mes, inf);
    const pdfBin = new Uint8Array(pdfDoc.output('arraybuffer'));

    // Texto
    const informeTxt = A.informeTexto(inf);

    // JSON
    const json = JSON.stringify({ formato: 'ATMOSFERA-FH', version: 1, proyecto: p }, null, 2);

    return [
      { nombre: '01_plan_' + mes + '.xlsx', contenido: excelBin },
      { nombre: '02_informe_financiero.docx', contenido: wordBin },
      { nombre: '03_informe_financiero.pdf', contenido: pdfBin },
      { nombre: '04_resumen_ejecutivo.txt', contenido: informeTxt },
      { nombre: '05_egresos_' + mes + '.csv', contenido: D.csvEgresos(p, mes) },
      { nombre: '06_movimientos_' + mes + '.csv', contenido: D.csvMovimientos(p, mes) },
      { nombre: '07_proyecto.json', contenido: json }
    ];
  };


  /* ============================================================
     COMPRAS DEL HOGAR — Excel, Word, PDF y CSV
     ============================================================ */
  function C_() { return (global.AfCompras || null); }

  function nombreBoleta(p, b) {
    const Cc = C_();
    const t = Cc ? Cc.tienda(p, b.tiendaId) : null;
    return t ? t.nombre : '—';
  }

  D.comprasExcel = function (p, mes) {
    const Cc = C_();
    if (!Cc) throw new Error('Módulo de compras no disponible.');
    mes = mes || E.mesActivo(p);
    const st = Cc.estadisticas(p, mes);
    const cc = Cc.compararCanasta(p);
    const tiendas = Cc.tiendas(p);
    const prods = Cc.productos(p);
    const wb = XLSX.utils.book_new();

    /* 1. RESUMEN */
    const resumen = [
      ['ATMÓSFERA FINANCIERA DEL HOGAR — COMPRAS DEL HOGAR'],
      ['Proyecto', p.nombre || ''],
      ['Período', U.mesLargo(mes)],
      ['Generado', new Date().toLocaleString('es-EC')],
      [],
      ['INDICADOR', 'VALOR', 'OBSERVACIÓN'],
      ['Gasto en compras', st.total, U.mesLargo(mes)],
      ['Boletas del mes', st.n, ''],
      ['Ticket promedio', st.ticket, 'por boleta'],
      ['% del gasto del hogar', st.share / 100, 'sobre egresos de ' + mon(p, st.egresosHogar)],
      ['Productos en catálogo', prods.length, ''],
      ['Tiendas', tiendas.length, ''],
      ['Mediciones de precio', Cc.precios(p).length, 'historial'],
      ['Promociones vigentes', Cc.promociones(p).length, ''],
      [],
      ['COMPARATIVO DE CANASTA', 'TOTAL', ''],
      ['Mejor tienda', cc ? cc.mejor.tienda.nombre : '—', cc ? mon(p, cc.mejor.total) : ''],
      ['Productos comunes', cc ? cc.nComunes : '', 'vendidos por todas las tiendas del ranking'],
      ['Canasta mixta (más baratos)', cc ? cc.ideal.total : '', cc ? mon(p, cc.ideal.total) : ''],
      ['Ahorro potencial', cc ? cc.ahorro : '', cc ? 'vs. tienda más cara' : ''],
      [],
      ['POR CATEGORÍA', 'TOTAL', '']
    ].concat(st.porCategoria.map(c => [c.nombre, c.total, U.pct(c.total / Math.max(.01, st.total))]))
      .concat([[], ['POR TIENDA', 'TOTAL', '']])
      .concat(st.porTienda.map(t => [t.nombre, t.total, U.pct(t.total / Math.max(.01, st.total))]));

    XLSX.utils.book_append_sheet(wb, D._hoja(resumen, [36, 22, 40]), 'RESUMEN');

    /* 2. BOLETAS */
    const fBol = [['FECHA', 'TIENDA', 'PRODUCTO', 'MARCA', 'CANTIDAD', 'UNIDAD', 'PRECIO UNIT.', 'SUBTOTAL', 'TOTAL BOLETA', 'EGRESO VINCULADO', 'NOTAS']];
    Cc.boletasDe(p, mes).forEach(b => {
      const total = Cc.totalBoleta(b);
      (b.lineas || []).forEach((l, i) => {
        const pr = Cc.producto(p, l.productoId);
        fBol.push([
          i === 0 ? b.fecha : '', i === 0 ? nombreBoleta(p, b) : '',
          pr ? pr.nombre : '—', pr ? pr.marca : '',
          l.cantidad, l.unidad || (pr ? pr.unidad : ''),
          l.precioUnit, l.subtotal, i === 0 ? total : '',
          b.egresoId ? 'Sí' : 'No', i === 0 ? (b.nota || '') : ''
        ]);
      });
    });
    fBol.push(['TOTAL', '', '', '', '', '', '', '', st.total, '', '']);
    XLSX.utils.book_append_sheet(wb, D._hoja(fBol, [12, 20, 26, 16, 10, 9, 12, 12, 14, 16, 24]), 'BOLETAS');

    /* 3. MATRIZ DE PRECIOS */
    const fPrec = [['PRODUCTO', 'MARCA', 'CATEGORÍA', 'UNIDAD'].concat(tiendas.map(t => t.nombre)).concat(['MEJOR', 'TIENDA MEJOR', 'DIFERENCIA'])];
    prods.forEach(pr => {
      const cmp = Cc.comparativa(p, pr.id);
      if (!cmp.length) return;
      const min = cmp[0].precio, max = cmp[cmp.length - 1].precio;
      const fila = [pr.nombre, pr.marca, pr.categoria, pr.unidad];
      tiendas.forEach(t => {
        const reg = cmp.find(x => x.tiendaId === t.id);
        fila.push(reg ? reg.precio : '');
      });
      fila.push(min, cmp[0].tienda, U.round2(max - min));
      fPrec.push(fila);
    });
    if (cc) {
      const fila = ['CANASTA COMPLETA', '', '', ''];
      cc.lista.forEach(x => fila.push(x.total));
      fila.push(cc.ideal.total, 'Mixta (más baratos)', cc.ahorro);
      fPrec.push(fila);
    }
    XLSX.utils.book_append_sheet(wb, D._hoja(fPrec, [26, 16, 18, 9].concat(tiendas.map(() => 12)).concat([12, 18, 13])), 'PRECIOS');

    /* 4. CATÁLOGO Y CONSUMO */
    const fCat = [['PRODUCTO', 'MARCA', 'CATEGORÍA', 'UNIDAD', 'PRESENTACIÓN', 'TIENDAS', 'MEJOR PRECIO',
      'TIENDA', 'VARIACIÓN %', 'COMPRAS', 'ÚLTIMA COMPRA', 'DURA (DÍAS)', 'PRÓXIMA', 'GASTADO']];
    prods.forEach(pr => {
      const cmp = Cc.comparativa(p, pr.id);
      const t = Cc.tendencia(p, pr.id);
      const iv = Cc.intervalo(p, pr.id);
      fCat.push([pr.nombre, pr.marca, pr.categoria, pr.unidad, pr.presentacion,
        cmp.length, cmp[0] ? cmp[0].precio : '', cmp[0] ? cmp[0].tienda : '',
        t.pct, iv.n, iv.ultima || '', iv.duracion || '', iv.proxima || '', iv.gastoTotal]);
    });
    XLSX.utils.book_append_sheet(wb, D._hoja(fCat, [26, 16, 18, 9, 18, 9, 12, 18, 11, 9, 14, 12, 14, 12]), 'CATALOGO');

    /* 5. HISTORIAL COMPLETO DE PRECIOS (estacionalidad) */
    const fHist = [['FECHA', 'PRODUCTO', 'MARCA', 'TIENDA', 'PRECIO', 'PROMOCIÓN', 'NOTA']];
    Cc.precios(p).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).forEach(x => {
      const pr = Cc.producto(p, x.productoId), t = Cc.tienda(p, x.tiendaId);
      fHist.push([x.fecha, pr ? pr.nombre : '—', pr ? pr.marca : '', t ? t.nombre : '—',
        x.precio, x.promo && x.promo.hasta ? 'Hasta ' + x.promo.hasta : '', x.nota || '']);
    });
    XLSX.utils.book_append_sheet(wb, D._hoja(fHist, [12, 26, 16, 20, 11, 18, 24]), 'HISTORIAL');

    const nombre = U.slug(p.nombre) + '_compras_' + mes + '.xlsx';
    XLSX.writeFile(wb, nombre);
    return nombre;
  };

  D.comprasWord = function (p, mes) {
    const Cc = C_();
    if (!Cc) throw new Error('Módulo de compras no disponible.');
    mes = mes || E.mesActivo(p);
    const st = Cc.estadisticas(p, mes);
    const cc = Cc.compararCanasta(p);
    let c = '';

    c += parrafo('ATMÓSFERA FINANCIERA DEL HOGAR', { alineado: 'center', negrita: true, tamano: 20, color: '1F3864', espacio: 60 });
    c += parrafo('Informe de compras del hogar', { alineado: 'center', negrita: true, tamano: 14, color: 'EA580C' });
    c += parrafo((p.nombre || '') + ' · ' + U.mesLargo(mes), { alineado: 'center', tamano: 11, color: '374151' });
    c += parrafo('Generado: ' + new Date().toLocaleString('es-EC'), { alineado: 'center', tamano: 9, color: '6B7280', espacio: 200 });

    c += parrafo('1. INDICADORES DE COMPRAS', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    c += tabla([
      ['Indicador', 'Valor', 'Observación'],
      ['Gasto en compras', mon(p, st.total), U.mesLargo(mes)],
      ['Boletas', String(st.n), 'ticket promedio ' + mon(p, st.ticket)],
      ['% del gasto del hogar', U.pct(st.share / 100), 'sobre egresos de ' + mon(p, st.egresosHogar)],
      ['Productos', String(Cc.productos(p).length), Cc.tiendas(p).length + ' tiendas'],
      ['Por recomprar', String(Cc.porRecomprar(p).length), 'según frecuencia de consumo'],
      ['Canasta mixta', cc ? mon(p, cc.ideal.total) : '—', 'cada producto en su más barato'],
      ['Ahorro potencial', cc ? mon(p, cc.ahorro) : '—', 'vs. la tienda más cara']
    ]);

    if (cc) {
      c += parrafo('2. COMPARATIVO DE CANASTA POR TIENDA (' + cc.nComunes +
        ' productos comunes a todas ellas)', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
      const f = [['Tienda', 'Productos', 'Total canasta', 'Diferencia']];
      cc.lista.forEach((x, i) => f.push([x.tienda.nombre, x.hay + '/' + Cc.productos(p).length,
        mon(p, x.total), i === 0 ? 'Mejor' : '+' + mon(p, U.round2(x.total - cc.lista[0].total))]));
      c += tabla(f);
    }

    c += parrafo('3. PRECIOS POR PRODUCTO (más barato a más caro)', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const fPrec = [['Producto', 'Mejor precio', 'Tienda', 'Más caro', 'Diferencia']];
    Cc.productos(p).forEach(pr => {
      const cmp = Cc.comparativa(p, pr.id);
      if (!cmp.length) return;
      fPrec.push([pr.nombre + (pr.marca ? ' · ' + pr.marca : ''), mon(p, cmp[0].precio), cmp[0].tienda,
        mon(p, cmp[cmp.length - 1].precio),
        mon(p, U.round2(cmp[cmp.length - 1].precio - cmp[0].precio))]);
    });
    c += tabla(fPrec);

    c += parrafo('4. COMPRAS REGISTRADAS EN ' + U.mesLargo(mes).toUpperCase(), { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const fBol = [['Fecha', 'Tienda', 'Ítems', 'Total', 'Egreso']];
    Cc.boletasDe(p, mes).forEach(b => fBol.push([
      b.fecha, nombreBoleta(p, b), String((b.lineas || []).length), mon(p, Cc.totalBoleta(b)),
      b.egresoId ? 'Vinculado' : 'No']));
    fBol.push(['TOTAL', '', '', mon(p, st.total), '']);
    c += tabla(fBol);

    c += parrafo('5. CONSUMO Y FRECUENCIA', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
    const fCons = [['Producto', 'Compras', 'Última', 'Dura (días)', 'Próxima', 'Estado', 'Gastado']];
    Cc.productos(p).forEach(pr => {
      const iv = Cc.intervalo(p, pr.id);
      if (!iv.n) return;
      fCons.push([pr.nombre, String(iv.n), iv.ultima || '', String(iv.duracion || '—'),
        iv.proxima || '—', iv.estado === 'recomprar' ? 'RECOMPRAR' : iv.estado === 'pronto' ? 'PRONTO' : 'AL DÍA',
        mon(p, iv.gastoTotal)]);
    });
    c += tabla(fCons);

    const alertas = Cc.alertas(p);
    if (alertas.length) {
      c += parrafo('6. ALERTAS Y RECOMENDACIONES', { negrita: true, tamano: 12, color: '1F3864', espacio: 200 });
      c += tabla([['Área', 'Alerta', 'Detalle']]
        .concat(alertas.map(a => [a.area, a.titulo, a.texto])));
    }

    c += parrafo('Documento generado automáticamente por ATMÓSFERA FINANCIERA DEL HOGAR · compras del hogar. ' +
      'Cifras en ' + (p.moneda || 'USD') + '.', {
      alineado: 'center', tamano: 8, color: '9CA3AF', cursiva: true, espacio: 300
    });

    const zip = U.zip([
      {
        nombre: '[Content_Types].xml',
        datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>'
      },
      {
        nombre: '_rels/.rels',
        datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>'
      },
      { nombre: 'word/document.xml', datos: construirDocumento(c) }
    ]);

    const nombre = U.slug(p.nombre) + '_compras_' + mes + '.docx';
    U.descargar(new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), nombre);
    return nombre;
  };

  D.comprasPdfDoc = function (p, mes) {
    const Cc = C_();
    if (!Cc) throw new Error('Módulo de compras no disponible.');
    mes = mes || E.mesActivo(p);
    const st = Cc.estadisticas(p, mes);
    const cc = Cc.compararCanasta(p);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, ML = 15, MR = 15, CW = W - ML - MR;
    let y = 0, pagina = 1;
    const AZUL = [31, 56, 100], NARANJA = [234, 88, 12], GRIS = [107, 114, 128],
      OSCURO = [17, 24, 39], CLARO = [243, 244, 246], VERDE = [22, 163, 74];

    function pie() {
      doc.setDrawColor(220, 220, 220);
      doc.line(ML, H - 14, W - MR, H - 14);
      doc.setFontSize(7.5); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.text('ATMÓSFERA FINANCIERA — COMPRAS · ' + (p.nombre || ''), ML, H - 10);
      doc.text('Pág. ' + pagina, W - MR, H - 10, { align: 'right' });
    }
    function nuevaPagina() { doc.addPage(); pagina++; y = 20; }
    function espacio(h) { if (y + h > H - 20) { pie(); nuevaPagina(); } }
    function titulo(tam, color, txt) {
      espacio(tam + 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(tam);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(txt, ML, y); y += tam * 0.5 + 2;
    }
    function texto(txt, tam, color, negrita) {
      doc.setFont('helvetica', negrita ? 'bold' : 'normal');
      doc.setFontSize(tam || 9.5);
      doc.setTextColor(color ? color[0] : OSCURO[0], color ? color[1] : OSCURO[1], color ? color[2] : OSCURO[2]);
      doc.splitTextToSize(String(txt), CW).forEach(l => {
        espacio(5); doc.text(l, ML, y); y += (tam || 9.5) * 0.52;
      });
    }
    function tablaPdf(filas, anchos, op) {
      op = op || {};
      const fs = op.fs || 8, pad = 1.6;
      filas.forEach((fila, i) => {
        doc.setFontSize(fs);
        doc.setFont('helvetica', i === 0 && op.cabecera !== false ? 'bold' : 'normal');
        let alto = 0;
        fila.forEach((celda, ci) => {
          const w = anchos[ci] * CW / 100;
          alto = Math.max(alto, doc.splitTextToSize(String(celda === undefined || celda === null ? '' : celda), w - 3).length * (fs * 0.42) + pad);
        });
        espacio(alto + 1);
        const esCab = i === 0 && op.cabecera !== false;
        if (esCab) { doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]); doc.rect(ML, y - fs * 0.35, CW, alto + pad, 'F'); }
        else if (i % 2 === 0) { doc.setFillColor(CLARO[0], CLARO[1], CLARO[2]); doc.rect(ML, y - fs * 0.35, CW, alto + pad, 'F'); }
        let x = ML;
        fila.forEach((celda, ci) => {
          const w = anchos[ci] * CW / 100;
          doc.setTextColor(esCab ? 255 : OSCURO[0], esCab ? 255 : OSCURO[1], esCab ? 255 : OSCURO[2]);
          let yy = y;
          doc.splitTextToSize(String(celda === undefined || celda === null ? '' : celda), w - 3)
            .forEach(l => { doc.text(l, x + 1.5, yy); yy += fs * 0.42; });
          x += w;
        });
        y += alto + pad;
        doc.setDrawColor(225, 225, 225);
        doc.line(ML, y - pad * 0.4, ML + CW, y - pad * 0.4);
      });
      y += 2;
    }

    doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFillColor(NARANJA[0], NARANJA[1], NARANJA[2]);
    doc.rect(0, 38, W, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('ATMOSFERA FINANCIERA DEL HOGAR', ML, 17);
    doc.setFontSize(11); doc.text('Informe de compras del hogar', ML, 25);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text((p.nombre || '') + '  ·  ' + U.mesLargo(mes), ML, 32);
    y = 50;
    doc.setFontSize(8.5); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text('Generado: ' + new Date().toLocaleString('es-EC'), ML, y); y += 8;

    const kpis = [
      ['GASTO COMPRAS', mon(p, st.total), NARANJA],
      ['BOLETAS', String(st.n), AZUL],
      ['TICKET PROM.', mon(p, st.ticket), AZUL],
      ['% DEL HOGAR', U.pct(st.share / 100), VERDE]
    ];
    const bw = (CW - 6 * 3) / 4;
    espacio(24);
    kpis.forEach((k, i) => {
      const x = ML + i * (bw + 6);
      doc.setFillColor(CLARO[0], CLARO[1], CLARO[2]); doc.roundedRect(x, y, bw, 20, 2, 2, 'F');
      doc.setFillColor(k[2][0], k[2][1], k[2][2]); doc.rect(x, y, 1.6, 20, 'F');
      doc.setFontSize(7); doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.setFont('helvetica', 'bold'); doc.text(k[0], x + 5, y + 7);
      doc.setFontSize(11); doc.setTextColor(OSCURO[0], OSCURO[1], OSCURO[2]);
      doc.text(String(k[1]), x + 5, y + 15);
    });
    y += 26;

    if (cc) {
      titulo(11, AZUL, 'Comparativo de canasta (' + cc.nComunes + ' productos comunes)');
      const f = [['Tienda', 'Productos', 'Total', 'Diferencia']];
      cc.lista.forEach((x, i) => f.push([x.tienda.nombre, x.hay + '/' + Cc.productos(p).length,
        mon(p, x.total), i === 0 ? 'MEJOR' : '+' + mon(p, U.round2(x.total - cc.lista[0].total))]));
      tablaPdf(f, [34, 18, 24, 24]);
      texto('Comprando cada producto en su tienda más barata: ' + mon(p, cc.ideal.total) +
        ' (ahorro de ' + mon(p, cc.ahorro) + ').', 9, NARANJA, true);
      y += 3;
    }

    titulo(11, AZUL, 'Precios por producto');
    const fPrec = [['Producto', 'Mejor', 'Tienda', 'Más caro', 'Dif.']];
    Cc.productos(p).forEach(pr => {
      const cmp = Cc.comparativa(p, pr.id);
      if (!cmp.length) return;
      fPrec.push([pr.nombre, mon(p, cmp[0].precio), cmp[0].tienda,
        mon(p, cmp[cmp.length - 1].precio), mon(p, U.round2(cmp[cmp.length - 1].precio - cmp[0].precio))]);
    });
    tablaPdf(fPrec, [32, 16, 24, 16, 12]);

    titulo(11, AZUL, 'Compras de ' + U.mesLargo(mes));
    const fBol = [['Fecha', 'Tienda', 'Ítems', 'Total']];
    Cc.boletasDe(p, mes).forEach(b => fBol.push([b.fecha, nombreBoleta(p, b),
      String((b.lineas || []).length), mon(p, Cc.totalBoleta(b))]));
    fBol.push(['TOTAL', '', '', mon(p, st.total)]);
    tablaPdf(fBol, [22, 40, 16, 22]);

    titulo(11, AZUL, 'Consumo y frecuencia');
    const fCons = [['Producto', 'N', 'Última', 'Dura', 'Próxima', 'Estado']];
    Cc.productos(p).forEach(pr => {
      const iv = Cc.intervalo(p, pr.id);
      if (!iv.n) return;
      fCons.push([pr.nombre, String(iv.n), iv.ultima || '', String(iv.duracion || '—'),
        iv.proxima || '—', iv.estado === 'recomprar' ? 'RECOMPRAR' : iv.estado === 'pronto' ? 'PRONTO' : 'AL DÍA']);
    });
    if (fCons.length > 1) tablaPdf(fCons, [30, 8, 18, 12, 18, 14]);

    const alertas = Cc.alertas(p);
    if (alertas.length) {
      titulo(11, AZUL, 'Alertas y recomendaciones');
      const fA = [['Área', 'Alerta', 'Detalle']];
      alertas.slice(0, 8).forEach(a => fA.push([a.area, a.titulo, a.texto]));
      tablaPdf(fA, [16, 30, 54]);
    }

    pie();
    return doc;
  };

  D.comprasPDF = function (p, mes) {
    const doc = D.comprasPdfDoc(p, mes);
    const nombre = U.slug(p.nombre) + '_compras_' + (mes || E.mesActivo(p)) + '.pdf';
    doc.save(nombre);
    return nombre;
  };

  D.csvCompras = function (p, mes) {
    const Cc = C_();
    if (!Cc) throw new Error('Módulo de compras no disponible.');
    mes = mes || E.mesActivo(p);
    const filas = [['Fecha', 'Tienda', 'Producto', 'Marca', 'Cantidad', 'Unidad', 'Precio unitario', 'Subtotal', 'Total boleta', 'Egreso vinculado', 'Notas']];
    Cc.boletasOrden(p).forEach(b => {
      const total = Cc.totalBoleta(b);
      (b.lineas || []).forEach((l, i) => {
        const pr = Cc.producto(p, l.productoId);
        filas.push([
          i === 0 ? b.fecha : '', i === 0 ? nombreBoleta(p, b) : '',
          pr ? pr.nombre : '', pr ? pr.marca : '', l.cantidad, l.unidad || '',
          l.precioUnit, l.subtotal, i === 0 ? total : '',
          b.egresoId ? 'Sí' : 'No', i === 0 ? (b.nota || '') : ''
        ]);
      });
    });
    return '\ufeff' + csvDe(filas);
  };

  D.csvPrecios = function (p) {
    const Cc = C_();
    if (!Cc) throw new Error('Módulo de compras no disponible.');
    const filas = [['Fecha', 'Producto', 'Marca', 'Categoria', 'Unidad', 'Tienda', 'Precio', 'Promocion hasta', 'Nota']];
    Cc.precios(p).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).forEach(x => {
      const pr = Cc.producto(p, x.productoId), t = Cc.tienda(p, x.tiendaId);
      filas.push([x.fecha, pr ? pr.nombre : '', pr ? pr.marca : '', pr ? pr.categoria : '',
        pr ? pr.unidad : '', t ? t.nombre : '', x.precio,
        x.promo && x.promo.hasta ? x.promo.hasta : '', x.nota || '']);
    });
    return '\ufeff' + csvDe(filas);
  };

  global.AfDocs = D;
})(window);
