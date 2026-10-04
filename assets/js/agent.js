/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — agent.js
   Agente consultor financiero: informes automáticos, reglas
   contables y respuestas a preguntas en lenguaje natural.
   ============================================================ */
(function (global) {
  'use strict';

  const U = global.Util;
  const E = global.AfEngine;
  const S = global.AfStats;
  const A = {};

  /* ============================================================
     1. DIAGNÓSTICO EJECUTIVO
     ============================================================ */
  A.diagnostico = function (p, mes) {
    const r = E.resumen(p, mes);
    const sc = E.score(p, mes);
    const al = E.alertas(p, mes);
    const regla = E.regla503020(p, mes);
    const metas = E.metasAhorro(p, mes);
    const st = S.analizarProyecto(p, mes);

    const criticos = al.filter(a => a.nivel === 'critico');
    const altas = al.filter(a => a.nivel === 'alta');
    const medias = al.filter(a => a.nivel === 'media');

    const linea1 = r.balance > 0
      ? 'El hogar cierra ' + r.mes.replace('-', '/') + ' con superávit de ' + U.moneda(r.balance, p) +
      ' (tasa de ahorro ' + U.pct(r.tasaAhorro) + ').'
      : 'El hogar cierra ' + r.mes.replace('-', '/') + ' con déficit de ' + U.moneda(Math.abs(r.balance), p) +
      '. Es prioritario ajustar el plan.';

    const linea2 = 'Ingresos ' + U.moneda(r.flujoIngresos, p) + ' vs. egresos ' +
      U.moneda(r.totalEgresos, p) + ' sobre ' + r.nEgresos + ' conceptos y ' +
      r.nPersonas + ' miembro(s) del hogar.';

    const linea3 = 'Se ha cancelado ' + U.moneda(r.pagado, p) + ' de ' +
      U.moneda(r.totalEgresos, p) + ' (' + U.pct(r.eficienciaPago) +
      '); quedan ' + U.moneda(r.pendiente, p) + ' pendientes.';

    let veredicto;
    if (sc.score >= 85) veredicto = 'Situación financiera EXCELENTE. Sostené el plan y redirige el excedente a inversión.';
    else if (sc.score >= 70) veredicto = 'Situación financiera SANA. Hay margen de mejora controlado en algunos rubros.';
    else if (sc.score >= 55) veredicto = 'Situación financiera EN ATENCIÓN. Con ajustes puntuales se recupera el equilibrio.';
    else if (sc.score >= 40) veredicto = 'Situación financiera EN RIESGO. Requiere decisiones firmes este mes.';
    else veredicto = 'Situación financiera CRÍTICA. Reestructurá gastos y deudas de forma inmediata.';

    return {
      mes: r.mes, resumen: r, score: sc, regla: regla, metas: metas, stats: st,
      alertas: al, criticos: criticos, altas: altas, medias: medias,
      lineas: [linea1, linea2, linea3], veredicto: veredicto
    };
  };

  /* ============================================================
     2. RECOMENDACIONES PROFESIONALES
     ============================================================ */
  A.recomendaciones = function (p, mes) {
    const r = E.resumen(p, mes);
    const regla = E.regla503020(p, mes);
    const metas = E.metasAhorro(p, mes);
    const out = [];
    const add = (prio, area, texto, impacto) => out.push({ prio, area, texto, impacto });

    if (r.tasaAhorro < 0.20) {
      const falta = Math.max(0, regla.recomendado.ahorro - r.balance);
      add('Alta', 'Ahorro', 'Comprometé un traslado automático de ' +
        U.moneda(Math.max(falta, regla.recomendado.ahorro * 0.1), p) +
        ' el día de pago. Meta: 20% del ingreso (regla 50/30/20).',
        'Acumulado anual: ' + U.moneda(r.flujoIngresos * 0.20 * 12, p));
    }

    if (r.variables > r.flujoIngresos * 0.30) {
      add('Alta', 'Gasto variable',
        'Los gastos discrecionales son ' + U.pct(r.variables / Math.max(1, r.flujoIngresos)) +
        ' del ingreso. Bajalos al 30% recortando ' + U.moneda(Math.max(0, r.variables - r.flujoIngresos * 0.30), p) + '.',
        'Ahorro inmediato mensual');
    }

    if (r.tasaEndeudamiento > 0.20) {
      add('Alta', 'Deudas',
        'La carga de deuda es ' + U.pct(r.tasaEndeudamiento) +
        '. Priorizá el método avalancha: pagá primero la deuda con mayor tasa de interés y mantené el resto al mínimo.',
        'Libera flujo en 3–6 meses');
    }

    // Cuota de deuda individual
    const deudasEg = E.egresosDe(p, mes).filter(e => e.tipoGasto === 'deuda');
    deudasEg.forEach(d => {
      if (r.flujoIngresos > 0 && d.valor / r.flujoIngresos > 0.15) {
        add('Media', 'Deudas', '«' + d.detalle + '» consume ' + U.pct(d.valor / r.flujoIngresos) +
          ' del ingreso. Evaluá consolidación o renegociación.', 'Reduce riesgo de mora');
      }
    });

    const top = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a])[0];
    if (top) {
      const share = r.porCategoria[top] / Math.max(0.01, r.totalEgresos);
      add(share > 0.35 ? 'Alta' : 'Media', 'Concentración',
        '«' + top + '» concentra ' + U.pct(share) + ' del gasto. Fijá un tope mensual y compará precios.',
        'Impacto potencial: ' + U.moneda(r.porCategoria[top] * 0.1, p));
    }

    if (r.pendiente > 0) {
      add('Alta', 'Pagos',
        'Quedan ' + U.moneda(r.pendiente, p) + ' sin cancelar. Definí fecha límite por persona y usá recordatorios automáticos.',
        'Evita intereses y recargos');
    }

    // Equidad
    const bp = r.balancePersonas;
    const claves = Object.keys(bp).filter(k => k !== '__totalIngresos' && bp[k].ingresoEfectivo > 0);
    if (claves.length >= 2) {
      const cargas = claves.map(k => bp[k].pctCarga);
      const dif = Math.max.apply(null, cargas) - Math.min.apply(null, cargas);
      if (dif > 0.15) {
        add('Media', 'Equidad del hogar',
          'La diferencia de esfuerzo entre miembros es de ' + U.pct(dif) +
          '. Activá «Proporcional a ingresos» para que el peso relativo sea idéntico.',
          'Mejora la armonía económica');
      }
    }

    add('Media', 'Emergencia',
      'Fondo de emergencia recomendado: ' + U.moneda(metas.colchon6, p) + ' (6 meses de gastos). ' +
      (isFinite(metas.mesesPara6)
        ? 'Al ritmo actual lo alcanzás en ' + metas.mesesPara6 + ' meses.'
        : 'Actualmente no ahorrás: primero estabilizá el balance.'),
      'Colchón: ' + U.moneda(metas.colchon6, p));

    add('Baja', 'Previsión',
      'Si el mes actual se repite, el cierre anual sería ' + U.moneda(r.anual.balance, p) +
      ' de balance y ' + U.moneda(r.anual.egresos, p) + ' de gastos.',
      'Proyección 12 meses');

    if (r.nPersonas === 1) {
      add('Baja', 'Estructura', 'Solo hay una persona registrada. Agregá a los demás miembros para repartir cargas y validar porcentajes.', null);
    }

    const orden = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
    out.sort((a, b) => orden[a.prio] - orden[b.prio]);
    return out;
  };

  /* ============================================================
     3. INFORME TÉCNICO COMPLETO (secciones renderizables)
     ============================================================ */
  A.informe = function (p, mes) {
    const d = A.diagnostico(p, mes);
    const r = d.resumen;
    const st = d.stats;
    const metas = d.metas;
    const regla = d.regla;
    const bp = r.balancePersonas;
    const personas = E.personasActivas(p);

    const filasPersonas = personas.map(x => {
      const b = bp[x.id] || {};
      return {
        nombre: x.nombre,
        ingreso: b.ingresoEfectivo || 0,
        cuota: b.debe || 0,
        pagado: b.pagado || 0,
        saldo: U.round2((b.debe || 0) - (b.pagado || 0)),
        pctIngreso: b.ingresoEfectivo ? (b.debe / b.ingresoEfectivo) : 0,
        balance: b.saldo || 0
      };
    });

    const secciones = [
      {
        titulo: '1. Resumen ejecutivo',
        parrafos: d.lineas.concat([d.veredicto,
          'Puntaje de salud financiera: ' + d.score.score + '/100 (' + d.score.nivel + ').'])
      },
      {
        titulo: '2. Diagnóstico por cuentas',
        parrafos: [
          'Ingresos totales del período: ' + U.moneda(r.flujoIngresos, p) +
          ' (sueldos ' + U.moneda(r.sueldos, p) + ' + otros ingresos ' + U.moneda(r.totalIngresosPlan, p) + ').',
          'Egresos totales del período: ' + U.moneda(r.totalEgresos, p) + ' en ' + r.nEgresos + ' conceptos.',
          'Balance neto: ' + U.moneda(r.balance, p) + '. Tasa de ahorro: ' + U.pct(r.tasaAhorro) + '.',
          'Gastos fijos/obligatorios: ' + U.moneda(r.obligatorios, p) +
          ' | variables: ' + U.moneda(r.variables, p) + ' | deudas: ' + U.moneda(r.deudas, p) + '.',
          'Gasto promedio por miembro: ' + U.moneda(r.gastoPerCapita, p) +
          ' | ingreso promedio por miembro: ' + U.moneda(r.ingresoPerCapita, p) + '.',
          'Estado de pagos: ' + U.moneda(r.pagado, p) + ' cancelado, ' +
          U.moneda(r.pendiente, p) + ' pendiente (' + U.pct(r.eficienciaPago) + ' de cumplimiento).'
        ]
      },
      {
        titulo: '3. Distribución del gasto por categoría',
        parrafos: Object.keys(r.porCategoria)
          .sort((a, b) => r.porCategoria[b] - r.porCategoria[a])
          .map((c, i) => (i + 1) + '. ' + c + ': ' + U.moneda(r.porCategoria[c], p) +
            ' (' + U.pct(r.porCategoria[c] / Math.max(0.01, r.totalEgresos)) + ')')
      },
      {
        titulo: '4. Responsabilidad económica por miembro',
        parrafos: filasPersonas.map(f =>
          f.nombre + ' — ingreso ' + U.moneda(f.ingreso, p) +
          ', cuota asignada ' + U.moneda(f.cuota, p) +
          ' (' + U.pct(f.pctIngreso) + ' de su ingreso)' +
          ', cancelado ' + U.moneda(f.pagado, p) +
          ', pendiente ' + U.moneda(f.saldo, p) +
          ', balance personal ' + U.moneda(f.balance, p) + '.')
      },
      {
        titulo: '5. Estadística descriptiva',
        parrafos: st.egresos.vacio ? ['Sin datos suficientes para estadística.'] : [
          'Egresos — n=' + st.egresos.n +
          ', media ' + U.moneda(st.egresos.media, p) +
          ', mediana ' + U.moneda(st.egresos.mediana, p) +
          ', moda ' + (st.egresos.moda.valor === null ? 'sin moda' : U.moneda(st.egresos.moda.valor, p)) + '.',
          'Dispersión — desviación estándar ' + U.moneda(st.egresos.desviacion, p) +
          ', varianza ' + U.moneda(st.egresos.varianza, p) +
          ', coeficiente de variación ' + st.egresos.cv.toFixed(1) + '%' +
          ', desviación media absoluta ' + U.moneda(st.egresos.desvMediaAbs, p) + '.',
          'Rango — mínimo ' + U.moneda(st.egresos.min, p) + ', máximo ' + U.moneda(st.egresos.max, p) +
          ', amplitud ' + U.moneda(st.egresos.rango, p) +
          '. Cuartiles Q1 ' + U.moneda(st.egresos.q1, p) + ', Q2 ' + U.moneda(st.egresos.mediana, p) +
          ', Q3 ' + U.moneda(st.egresos.q3, p) + ' (RIC ' + U.moneda(st.egresos.ric, p) + ').',
          'Forma — asimetría ' + st.egresos.sesgo.toFixed(3) +
          ' (' + (st.egresos.sesgo > 0.5 ? 'sesgo positivo: hay gastos atípicos altos' :
            st.egresos.sesgo < -0.5 ? 'sesgo negativo' : 'distribución aproximadamente simétrica') + ')' +
          ', curtosis ' + st.egresos.curtosis.toFixed(3) +
          (st.egresos.nAtipicos ? ', valores atípicos: ' + st.egresos.atipicos.length : ', sin valores atípicos') + '.',
          'Serie 12 meses — tendencia de egresos ' +
          (st.tendenciaEgresos >= 0 ? '+' : '') + U.moneda(st.tendenciaEgresos, p) + ' por mes' +
          ', correlación ingreso/egreso ' + st.correlacionIngEgr.toFixed(3) + '.',
          'Concentración — top-1 ' + U.pct(st.concentracion.top1) +
          ', top-3 ' + U.pct(st.concentracion.top3) +
          ', índice HHI ' + st.concentracion.hhi +
          (st.concentracion.hhi > 2500 ? ' (alta concentración)' : st.concentracion.hhi > 1500 ? ' (concentración moderada)' : ' (concentración baja)') + '.'
        ]
      },
      {
        titulo: '6. Regla 50/30/20 (referencia profesional)',
        parrafos: [
          'Recomendado — necesidades ' + U.moneda(regla.recomendado.necesidades, p) +
          ', deseos ' + U.moneda(regla.recomendado.deseos, p) +
          ', ahorro ' + U.moneda(regla.recomendado.ahorro, p) + '.',
          'Real — necesidades ' + U.moneda(regla.real.necesidades, p) +
          ', deseos ' + U.moneda(regla.real.deseos, p) +
          ', ahorro/saldo ' + U.moneda(regla.real.ahorro, p) + '.',
          'Desviaciones — necesidades ' + U.moneda(regla.desvNecesidades, p) +
          ', deseos ' + U.moneda(regla.desvDeseos, p) +
          ', ahorro ' + U.moneda(regla.desvAhorro, p) + '.'
        ]
      },
      {
        titulo: '7. Alertas y riesgos',
        parrafos: d.alertas.length
          ? d.alertas.map(a => '[' + a.nivel.toUpperCase() + '] ' + a.titulo + ' — ' + a.detalle)
          : ['Sin alertas activas.']
      },
      {
        titulo: '8. Recomendaciones accionables',
        parrafos: A.recomendaciones(p, mes).map((x, i) =>
          (i + 1) + '. [' + x.prio + '][' + x.area + '] ' + x.texto +
          (x.impacto ? ' Impacto: ' + x.impacto + '.' : ''))
      },
      {
        titulo: '9. Metas y proyección',
        parrafos: [
          'Fondo de emergencia recomendado: ' + U.moneda(metas.fondoEmergencia, p) + ' (6 meses de gastos).',
          'Ahorro mensual sugerido (20%): ' + U.moneda(metas.ahorroMensualSugerido, p) +
          ' | proyección de ahorro anual: ' + U.moneda(metas.ahorroAnual, p) + '.',
          isFinite(metas.mesesPara3)
            ? 'Al ritmo actual alcanzás 3 meses de colchón en ' + metas.mesesPara3 + ' meses y 6 meses en ' + metas.mesesPara6 + '.'
            : 'Al ritmo actual no se construye colchón: primero hay que equilibrar el balance.',
          'Si se repite el mes: egresos anuales ' + U.moneda(r.anual.egresos, p) +
          ', ingresos anuales ' + U.moneda(r.anual.ingresos, p) +
          ', balance anual ' + U.moneda(r.anual.balance, p) + '.'
        ]
      },
      {
        titulo: '10. Plan de acción del período',
        parrafos: [
          'a) Registrar y fechar todos los egresos del mes antes del día 5.',
          'b) Cancelar en orden de vencimiento, priorizando obligatorios y deudas.',
          'c) Conciliar semanalmente el estado de pagos por miembro.',
          'd) Revisar el panel de control al cierre del mes y exportar el informe.',
          'e) Ajustar porcentajes si cambian los ingresos de cualquier miembro.'
        ]
      }
    ];

    return {
      titulo: 'Informe financiero del hogar',
      subtitulo: (p.nombre || '') + ' — período ' + U.mesLargo(r.mes),
      generado: new Date().toLocaleString('es-EC'),
      score: d.score,
      diagnostico: d,
      resumen: r,
      secciones: secciones,
      filasPersonas: filasPersonas,
      recomendaciones: A.recomendaciones(p, mes)
    };
  };

  /* ============================================================
     4. CONSULTA EN LENGUAJE NATURAL
     ============================================================ */
  A.consultar = function (p, pregunta) {
    const q = String(pregunta || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mes = E.mesActivo(p);
    const r = E.resumen(p, mes);
    const st = S.analizarProyecto(p, mes);
    const bp = r.balancePersonas;
    const personas = E.personasActivas(p);

    const M = (v) => U.moneda(v, p);
    const contiene = (...pal) => pal.some(x => q.indexOf(x) >= 0);

    const personaCitada = personas.find(x => q.indexOf(x.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) >= 0);

    /* --- saludo / ayuda --- */
    if (contiene('hola', 'buenas', 'ayuda', 'que puedes', 'que sabes', 'menu', 'comandos')) {
      return {
        tipo: 'ayuda',
        html: '<p>Puedo responder consultas sobre tu atmósfera financiera. Prueba con:</p>' +
          '<ul><li>¿Cuánto es el total de egresos?</li>' +
          '<li>¿Cuánto ingresa el hogar?</li>' +
          '<li>¿Cómo está el balance?</li>' +
          '<li>¿Cuánto debo / debe KATHERIN?</li>' +
          '<li>¿Cuáles son mis 3 gastos más altos?</li>' +
          '<li>¿Cuánto llevo pagado y cuánto falta?</li>' +
          '<li>¿Qué porcentaje debo pagar?</li>' +
          '<li>¿Cuánto puedo ahorrar al año?</li>' +
          '<li>Genera un resumen / informe / recomendaciones</li></ul>'
      };
    }

    /* --- informe / resumen / recomendaciones --- */
    if (contiene('informe', 'resumen', 'reporte', 'analisis general', 'diagnostico')) {
      const inf = A.informe(p, mes);
      return { tipo: 'informe', titulo: inf.titulo, html: A.informeHTML(inf) };
    }

    if (contiene('recomend', 'sugerenc', 'consejo', 'que hago', 'que debo hacer', 'asesor')) {
      const recs = A.recomendaciones(p, mes);
      return {
        tipo: 'recomendaciones',
        html: '<p>Con base en tu plan de <b>' + U.mesLargo(mes) + '</b> te propongo:</p><ol>' +
          recs.map(x => '<li><b>[' + x.prio + ' · ' + x.area + ']</b> ' + x.texto +
            (x.impacto ? ' <span class="muted">(' + x.impacto + ')</span>' : '') + '</li>').join('') +
          '</ol>'
      };
    }

    /* --- salud / score --- */
    if (contiene('salud', 'puntaje', 'score', 'calificacion', 'como estoy')) {
      const sc = E.score(p, mes);
      const al = E.alertas(p, mes);
      return {
        tipo: 'score',
        html: '<p>Tu puntaje de salud financiera es <b>' + sc.score + '/100</b> → <b>' + sc.nivel + '</b>.</p>' +
          '<p>' + al.filter(a => a.nivel === 'critico' || a.nivel === 'alta').length +
          ' alerta(s) crítica(s)/alta(s) activa(s) de ' + al.length + ' en total.</p>'
      };
    }

    /* --- pagos --- */
    if (contiene('pagado', 'pague', 'cancelad', 'estado de pago', 'pendiente', 'falta pagar', 'debo')) {
      if (personaCitada && !contiene('todos')) {
        const b = bp[personaCitada.id] || {};
        return {
          tipo: 'pagos',
          html: '<p><b>' + personaCitada.nombre + '</b> en ' + U.mesLargo(mes) + ':</p><ul>' +
            '<li>Cuota asignada: <b>' + M(b.debe || 0) + '</b></li>' +
            '<li>Cancelado: <b>' + M(b.pagado || 0) + '</b></li>' +
            '<li>Pendiente: <b>' + M((b.debe || 0) - (b.pagado || 0)) + '</b></li>' +
            '<li>Carga sobre su ingreso: <b>' + U.pct(b.pctCarga || 0) + '</b></li>' +
            '<li>Balance personal (ingreso − cuota): <b>' + M(b.saldo || 0) + '</b></li></ul>'
        };
      }
      return {
        tipo: 'pagos',
        html: '<p>Estado de pagos de <b>' + U.mesLargo(mes) + '</b>:</p><ul>' +
          '<li>Total del mes: <b>' + M(r.totalEgresos) + '</b></li>' +
          '<li>Cancelado: <b>' + M(r.pagado) + '</b> (' + U.pct(r.eficienciaPago) + ')</li>' +
          '<li>Pendiente: <b>' + M(r.pendiente) + '</b></li></ul>' +
          (r.pendiente > 0 ? '<p>👉 Ve a la pestaña <b>Pagos</b> para cancelar concepto por concepto.</p>' : '<p>✅ Todo cancelado.</p>')
      };
    }

    /* --- porcentaje que debo pagar --- */
    if (contiene('porcentaje', 'cuanto me toca', 'que me corresponde', 'reparto', 'distribu')) {
      const d = E.distribucion(p, { valor: r.totalEgresos });
      const lines = d.ids.map((id, i) =>
        '<li><b>' + d.nombres[i] + '</b>: ' + d.pcts[i].toFixed(2) + '% → ' + M(d.montos[i]) + '</li>').join('');
      return {
        tipo: 'distribucion',
        html: '<p>Reparto actual del gasto del mes (estrategia: <b>' + d.estrategia + '</b>):</p><ul>' + lines + '</ul>' +
          '<p class="muted">Puedes cambiar la estrategia o forzar % manuales en la pestaña «Plan mensual».</p>'
      };
    }

    /* --- total egresos --- */
    if (contiene('total egreso', 'gasto total', 'cuanto gasto', 'sumatoria de gastos', 'egresos')) {
      const cats = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a]);
      return {
        tipo: 'egresos',
        html: '<p>El total de egresos de <b>' + U.mesLargo(mes) + '</b> es <b>' + M(r.totalEgresos) +
          '</b> distribuidos en ' + r.nEgresos + ' conceptos.</p>' +
          '<p>Promedio por concepto: <b>' + M(r.totalEgresos / Math.max(1, r.nEgresos)) +
          '</b> · mediana: <b>' + M(st.egresos.mediana || 0) + '</b> · máximo: <b>' + M(st.egresos.max || 0) + '</b>.</p>' +
          (cats.length ? '<p>Mayor categoría: <b>' + cats[0] + '</b> con ' + M(r.porCategoria[cats[0]]) + '.</p>' : '')
      };
    }

    /* --- ingresos --- */
    if (contiene('ingreso', 'ingresos', 'gananc', 'sueldo', 'cobro', 'entra dinero', 'cuanto entra')) {
      return {
        tipo: 'ingresos',
        html: '<p>Ingresos de <b>' + U.mesLargo(mes) + '</b>: <b>' + M(r.flujoIngresos) + '</b></p><ul>' +
          personas.map(x => '<li>' + x.nombre + ': ' + M(x.ingreso) + ' de sueldo base</li>').join('') +
          (r.totalIngresosPlan > 0 ? '<li>Otros ingresos del plan: ' + M(r.totalIngresosPlan) + '</li>' : '') +
          '</ul>'
      };
    }

    /* --- balance / diferencia --- */
    if (contiene('balance', 'diferencia', 'sobra', 'neto', 'ganancia mensual', 'cierra el mes')) {
      const signo = r.balance >= 0 ? 'superávit' : 'déficit';
      return {
        tipo: 'balance',
        html: '<p>El mes <b>' + U.mesLargo(mes) + '</b> cierra con <b>' + signo + ' de ' + M(Math.abs(r.balance)) + '</b>.</p>' +
          '<ul><li>Ingresos: ' + M(r.flujoIngresos) + '</li>' +
          '<li>Egresos: ' + M(r.totalEgresos) + '</li>' +
          '<li>Tasa de ahorro: <b>' + U.pct(r.tasaAhorro) + '</b></li>' +
          '<li>Proyección anual: ' + M(r.anual.balance) + '</li></ul>'
      };
    }

    /* --- ahorro --- */
    if (contiene('ahorro', 'ahorrar', 'fondo de emergencia', 'colchon', 'meta')) {
      const m = E.metasAhorro(p, mes);
      return {
        tipo: 'ahorro',
        html: '<p>Capacidad de ahorro actual: <b>' + M(r.balance) + '</b> por mes (' + U.pct(r.tasaAhorro) + ').</p><ul>' +
          '<li>Ahorro recomendado (20%): <b>' + M(m.ahorroMensualSugerido) + '</b></li>' +
          '<li>Fondo de emergencia (6 meses): <b>' + M(m.colchon6) + '</b></li>' +
          '<li>Ahorro proyectado a 12 meses: <b>' + M(m.ahorroAnual) + '</b></li>' +
          (isFinite(m.mesesPara6) ? '<li>Al ritmo actual: colchón completo en <b>' + m.mesesPara6 + ' meses</b></li>' : '<li>Sin capacidad de ahorro actualmente</li>') +
          '</ul>'
      };
    }

    /* --- top gastos --- */
    if (contiene('mayor', 'mas alto', 'top', 'principales', 'importantes', '3 gastos', 'tres gastos')) {
      const orden = E.egresosDe(p, mes).slice().sort((a, b) => U.n(b.valor) - U.n(a.valor)).slice(0, 5);
      return {
        tipo: 'top',
        html: '<p>Los gastos más altos de <b>' + U.mesLargo(mes) + '</b>:</p><ol>' +
          orden.map(e => '<li>' + U.esc(e.detalle) + ' — <b>' + M(U.n(e.valor)) + '</b> <span class="muted">(' + U.esc(e.categoria) + ')</span></li>').join('') +
          '</ol>'
      };
    }

    /* --- persona puntual --- */
    if (personaCitada) {
      const b = bp[personaCitada.id] || {};
      return {
        tipo: 'persona',
        html: '<p><b>' + personaCitada.nombre + '</b> — ' + U.mesLargo(mes) + '</p><ul>' +
          '<li>Ingreso base: ' + M(personaCitada.ingreso) + '</li>' +
          '<li>Cuota de hogar: <b>' + M(b.debe || 0) + '</b> (' + U.pct(b.ingresoEfectivo ? b.debe / b.ingresoEfectivo : 0) + ' de su ingreso)</li>' +
          '<li>Cancelado: ' + M(b.pagado || 0) + ' · Pendiente: ' + M((b.debe || 0) - (b.pagado || 0)) + '</li>' +
          '<li>Balance personal: <b>' + M(b.saldo || 0) + '</b></li></ul>'
      };
    }

    /* --- estadística --- */
    if (contiene('estadistic', 'media', 'mediana', 'desviacion', 'varianza', 'cuartil', 'percentil')) {
      const e = st.egresos;
      if (e.vacio) return { tipo: 'stats', html: '<p>No hay suficientes datos para calcular estadística.</p>' };
      return {
        tipo: 'stats',
        html: '<p>Estadística descriptiva de <b>egresos</b> (' + U.mesLargo(mes) + '):</p><ul>' +
          '<li>n = ' + e.n + ' · suma = ' + M(e.suma) + '</li>' +
          '<li>media = <b>' + M(e.media) + '</b> · mediana = <b>' + M(e.mediana) + '</b> · moda = ' + (e.moda.valor === null ? 'sin moda' : M(e.moda.valor)) + '</li>' +
          '<li>desviación estándar = ' + M(e.desviacion) + ' · varianza = ' + M(e.varianza) + ' · CV = ' + e.cv.toFixed(1) + '%</li>' +
          '<li>mínimo ' + M(e.min) + ' · máximo ' + M(e.max) + ' · rango ' + M(e.rango) + '</li>' +
          '<li>Q1 ' + M(e.q1) + ' · Q2 ' + M(e.mediana) + ' · Q3 ' + M(e.q3) + ' (RIC ' + M(e.ric) + ')</li>' +
          '<li>asimetría ' + e.sesgo.toFixed(3) + ' · curtosis ' + e.curtosis.toFixed(3) + '</li></ul>'
      };
    }

    /* --- proyección / anual --- */
    if (contiene('anual', 'proyec', 'anno', 'ano que viene', '12 meses')) {
      return {
        tipo: 'proyeccion',
        html: '<p>Proyección a 12 meses si se mantiene el plan actual:</p><ul>' +
          '<li>Ingresos proyectados: <b>' + M(r.anual.ingresos) + '</b></li>' +
          '<li>Egresos proyectados: <b>' + M(r.anual.egresos) + '</b></li>' +
          '<li>Balance anual proyectado: <b>' + M(r.anual.balance) + '</b></li>' +
          '<li>Ahorro acumulado potencial: <b>' + M(r.anual.balance) + '</b></li></ul>'
      };
    }

    /* --- regla 50/30/20 --- */
    if (contiene('50', '30', '20', 'regla')) {
      const g = E.regla503020(p, mes);
      return {
        tipo: 'regla',
        html: '<p>Regla 50/30/20 sobre ' + M(g.ingreso) + ':</p><ul>' +
          '<li>Necesidades — recomendado ' + M(g.recomendado.necesidades) + ' / real ' + M(g.real.necesidades) + '</li>' +
          '<li>Deseos — recomendado ' + M(g.recomendado.deseos) + ' / real ' + M(g.real.deseos) + '</li>' +
          '<li>Ahorro — recomendado ' + M(g.recomendado.ahorro) + ' / real ' + M(g.real.ahorro) + '</li></ul>'
      };
    }

    /* --- fallback --- */
    return {
      tipo: 'default',
      html: '<p>No tengo una regla directa para esa consulta. Esto es lo esencial de <b>' +
        U.mesLargo(mes) + '</b>:</p><ul>' +
        '<li>Ingresos: <b>' + M(r.flujoIngresos) + '</b></li>' +
        '<li>Egresos: <b>' + M(r.totalEgresos) + '</b></li>' +
        '<li>Balance: <b>' + M(r.balance) + '</b> (' + U.pct(r.tasaAhorro) + ' de ahorro)</li>' +
        '<li>Pendiente de pago: <b>' + M(r.pendiente) + '</b></li>' +
        '<li>Salud financiera: <b>' + E.score(p, mes).score + '/100</b></li></ul>' +
        '<p class="muted">Prueba con «genera un informe» o «¿qué debo hacer?».</p>'
    };
  };

  /* ---------- HTML de un informe ---------- */
  A.informeHTML = function (inf) {
    let h = '<div class="informe">';
    h += '<div class="informe-cab"><div class="informe-tit">' + U.esc(inf.titulo) + '</div>' +
      '<div class="informe-sub">' + U.esc(inf.subtitulo) + '</div>' +
      '<div class="informe-meta">Generado: ' + U.esc(inf.generado) +
      ' · Salud financiera: ' + inf.score.score + '/100 (' + inf.score.nivel + ')</div></div>';
    inf.secciones.forEach(s => {
      h += '<h4 class="informe-sec">' + U.esc(s.titulo) + '</h4>';
      h += '<ul class="informe-lista">' + s.parrafos.map(x => '<li>' + U.esc(x) + '</li>').join('') + '</ul>';
    });
    h += '</div>';
    return h;
  };

  A.informeTexto = function (inf) {
    let t = inf.titulo + '\n' + inf.subtitulo + '\n' + inf.generado + '\n';
    t += 'Salud financiera: ' + inf.score.score + '/100 (' + inf.score.nivel + ')\n';
    t += '='.repeat(70) + '\n';
    inf.secciones.forEach(s => {
      t += '\n' + s.titulo.toUpperCase() + '\n' + '-'.repeat(70) + '\n';
      s.parrafos.forEach(p => t += '  • ' + p + '\n');
    });
    return t;
  };

  global.AfAgent = A;
})(window);
