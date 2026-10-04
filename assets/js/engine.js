/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — engine.js
   Motor financiero: distribución de porcentajes, cuotas,
   balances, pagos, KPIs y proyecciones.
   ============================================================ */
(function (global) {
  'use strict';

  const U = global.Util;
  const E = {};

  /* ============================================================
     1. CATÁLOGOS POR DEFECTO
     ============================================================ */
  E.CATEGORIAS_EGRESO = [
    'Servicios públicos', 'Luz', 'Agua', 'Internet y teléfono', 'Alimentación',
    'Vivienda y alquiler', 'Educación', 'Salud', 'Transporte', 'Vehículo',
    'Impuestos y tasas', 'Deudas y tarjetas', 'Ahorro e inversión',
    'Seguros', 'Ropa y calzado', 'Entretenimiento', 'Hogar y mantenimiento',
    'Mascotas', 'Regalos y donaciones', 'Otros gastos'
  ];

  E.CATEGORIAS_INGRESO = [
    'Salario', 'Salario quincenal', 'Freelance / independiente', 'Negocio propio',
    'Venta de productos', 'Alquileres cobrados', 'Intereses y rendimientos',
    'Dividendos', 'Bono / utilidades', 'Pensión / jubilación',
    'Beca / subsidio', 'Préstamo recibido', 'Otros ingresos'
  ];

  E.CATEGORIAS_MOV = [
    'Salario', 'Ahorro', 'Vehículo', 'Otros gastos', 'Compras',
    'Otros ingresos', 'Entretenimiento', 'Gastos casa', 'Impuestos',
    'Supermercado', 'Servicios públicos', 'Académico', 'Salud',
    'Deudas', 'Transferencia'
  ];

  E.METODOS = ['Efectivo', 'Virtual', 'Tarjeta', 'Transferencia', 'Débito automático'];

  E.TIPOS_GASTO = [
    { id: 'fijo', nombre: 'Fijo (obligatorio)' },
    { id: 'variable', nombre: 'Variable (discrecional)' },
    { id: 'deuda', nombre: 'Deuda / crédito' },
    { id: 'ahorro', nombre: 'Ahorro / meta' }
  ];

  E.ESTRATEGIAS = [
    { id: 'proporcional', nombre: 'Proporcional a ingresos', desc: 'Cada persona paga el mismo porcentaje de su sueldo (equilibrio por capacidad).' },
    { id: 'equitativo', nombre: 'Equitativo (partes iguales)', desc: 'Todos pagan exactamente lo mismo, sin importar el ingreso.' },
    { id: 'necesidad', nombre: 'Por necesidad del hogar', desc: 'Reparto definido manualmente en el proyecto, respeta los % guardados.' }
  ];

  /* ============================================================
     2. PERSONAS
     ============================================================ */
  E.personasActivas = function (p) {
    return (p.personas || []).filter(x => x.activo !== false);
  };

  E.persona = function (p, id) {
    return (p.personas || []).find(x => x.id === id) || null;
  };

  E.nombrePersona = function (p, id) {
    if (id === 'hogar' || !id) return 'Hogar (común)';
    const x = E.persona(p, id);
    return x ? x.nombre : '—';
  };

  E.ingresoTotal = function (p) {
    return U.sum(E.personasActivas(p), x => Number(x.ingreso) || 0);
  };

  /* Sugerencia automática de % global equilibrado según ingresos. */
  E.porcentajesSugeridos = function (p, estrategia) {
    const personas = E.personasActivas(p);
    const est = estrategia || (p.config && p.config.estrategiaGlobal) || 'proporcional';
    if (!personas.length) return {};

    if (est === 'necesidad') {
      const guardado = (p.config && p.config.porcentajes) || {};
      const arr = personas.map(x => Math.max(0, Number(guardado[x.id]) || 0));
      const s = arr.reduce((a, b) => a + b, 0);
      const pct = s > 0.001 ? E.normalizar(arr) : null;
      const out = {};
      personas.forEach((x, i) => out[x.id] = pct ? pct[i] : 0);
      if (pct) return out;
      // sin % guardados: cae a proporcional
    }

    if (est === 'equitativo') {
      const base = E.repartoEquitativo(personas.length);
      const out = {};
      personas.forEach((x, i) => out[x.id] = base[i]);
      return out;
    }

    const ingresos = personas.map(x => Math.max(0, Number(x.ingreso) || 0));
    const total = ingresos.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      const base = E.repartoEquitativo(personas.length);
      const out = {};
      personas.forEach((x, i) => out[x.id] = base[i]);
      return out;
    }
    const pct = E.normalizar(ingresos);
    const out = {};
    personas.forEach((x, i) => out[x.id] = pct[i]);
    return out;
  };

  /* Reparto igual con ajuste de redondeo para que sume exacto 100. */
  E.repartoEquitativo = function (n) {
    if (n <= 0) return [];
    const base = Math.floor((100 / n) * 100) / 100;
    const out = new Array(n).fill(base);
    let diff = U.round2(100 - base * n);
    if (Math.abs(diff) >= 0.005) out[n - 1] = U.round2(out[n - 1] + diff);
    return out;
  };

  /* Porcentajes por defecto para un conjunto de personas según la estrategia. */
  E.pctsPlan = function (p, ids, estrategia) {
    const est = estrategia || (p.config && p.config.estrategiaGlobal) || 'proporcional';
    if (est === 'necesidad') {
      const guardado = (p.config && p.config.porcentajes) || {};
      const arr = ids.map(id => Math.max(0, Number(guardado[id]) || 0));
      const s = arr.reduce((a, b) => a + b, 0);
      if (s > 0.001) return E.normalizar(arr);
      return E.normalizar(ids.map(id => {
        const persona = E.persona(p, id);
        return persona ? Math.max(0, Number(persona.ingreso) || 0) : 0;
      }).map(v => v || 1));
    }
    const sug = E.porcentajesSugeridos(p, est);
    const arr = ids.map(id => (typeof sug[id] === 'number' ? sug[id] : 0));
    const s = arr.reduce((a, b) => a + b, 0);
    if (Math.abs(s - 100) > 0.001) return E.normalizar(arr.length ? arr : [1]);
    return arr;
  };

  /* Normaliza cualquier arreglo de pesos a porcentajes que sumen 100.00 */
  E.normalizar = function (pesos) {
    const arr = pesos.map(v => Math.max(0, Number(v) || 0));
    const total = arr.reduce((a, b) => a + b, 0);
    if (total <= 0) return E.repartoEquitativo(arr.length);
    const pct = arr.map(v => Math.round((v / total) * 10000) / 100);
    let dif = U.round2(100 - pct.reduce((a, b) => a + b, 0));
    if (Math.abs(dif) >= 0.005) {
      let idx = 0, max = -1;
      pct.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
      pct[idx] = U.round2(pct[idx] + dif);
    }
    return pct;
  };

  /* Convierte porcentajes en montos en centavos que sumen EXACTO el total. */
  E.montosDesdePct = function (total, pcts) {
    const t = U.round2(total);
    if (!pcts.length) return [];
    const montos = pcts.map(p => Math.round(t * (p / 100) * 100) / 100);
    let dif = U.round2(t - montos.reduce((a, b) => a + b, 0));
    if (Math.abs(dif) >= 0.005) {
      let idx = 0, max = -1;
      montos.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
      montos[idx] = U.round2(montos[idx] + dif);
    }
    return montos;
  };

  /* ============================================================
     3. DISTRIBUCIÓN DE UN EGRESO
     ============================================================ */
  E.distribucion = function (p, eg) {
    const personas = E.personasActivas(p);
    const ids = personas.map(x => x.id);
    if (!ids.length) return { ids: [], pcts: [], montos: [], modo: 'auto', estrategia: 'ninguna' };

    let pcts;
    let modo = 'auto';
    let estrategia = (p.config && p.config.estrategiaGlobal) || 'proporcional';

    if (eg && eg.modo === 'manual' && eg.distribucion) {
      modo = 'manual';
      estrategia = 'manual';
      pcts = ids.map(id => Math.max(0, Number(eg.distribucion[id]) || 0));
      const s = pcts.reduce((a, b) => a + b, 0);
      if (s <= 0) pcts = E.pctsPlan(p, ids, estrategia);
      else if (Math.abs(s - 100) > 0.001) pcts = E.normalizar(pcts);
    } else {
      pcts = E.pctsPlan(p, ids, estrategia);
    }

    const valor = U.n(eg && eg.valor);
    const montos = E.montosDesdePct(valor, pcts);
    return { ids: ids, nombres: personas.map(x => x.nombre), pcts: pcts, montos: montos, modo: modo, estrategia: estrategia };
  };

  /* Mapa {personaId: monto} de la cuota de un egreso. */
  E.cuotas = function (p, eg) {
    const d = E.distribucion(p, eg);
    const out = {};
    d.ids.forEach((id, i) => out[id] = d.montos[i]);
    return out;
  };

  /* Mapa {personaId: pct} */
  E.pctsDe = function (p, eg) {
    const d = E.distribucion(p, eg);
    const out = {};
    d.ids.forEach((id, i) => out[id] = d.pcts[i]);
    return out;
  };

  /* ============================================================
     4. FILTROS
     ============================================================ */
  E.egresosDe = function (p, mes) {
    return (p.egresos || []).filter(e => !mes || !e.mes || e.mes === mes);
  };

  E.ingresosDe = function (p, mes) {
    return (p.ingresos || []).filter(e => !mes || !e.mes || e.mes === mes);
  };

  E.mesActivo = function (p) {
    return (p.config && p.config.mesActivo) || U.mesActual();
  };

  /* ============================================================
     5. PAGOS
     ============================================================ */
  E.pagoDe = function (eg, pid) {
    if (!eg || !eg.pagos) return null;
    return eg.pagos.find(x => x.personaId === pid) || null;
  };

  E.estadoEgreso = function (p, eg) {
    const cuotas = E.cuotas(p, eg);
    const ids = Object.keys(cuotas);
    let total = 0, pagado = 0;
    ids.forEach(id => {
      total += cuotas[id];
      const pg = E.pagoDe(eg, id);
      if (pg && pg.fecha) pagado += Number(pg.monto) || cuotas[id];
    });
    const saldo = U.round2(total - pagado);
    let estado = 'pendiente';
    if (pagado <= 0.004) estado = 'pendiente';
    else if (saldo <= 0.004) estado = 'pagado';
    else estado = 'parcial';
    return { cuotas: cuotas, total: U.round2(total), pagado: U.round2(pagado), saldo: saldo, estado: estado };
  };

  E.marcarPago = function (p, egresoId, pid, datos) {
    const eg = (p.egresos || []).find(x => x.id === egresoId);
    if (!eg) return false;
    if (!eg.pagos) eg.pagos = [];
    const cuota = E.cuotas(p, eg)[pid] || 0;
    const existente = eg.pagos.find(x => x.personaId === pid);
    if (datos && datos.quitar) {
      eg.pagos = eg.pagos.filter(x => x.personaId !== pid);
      return true;
    }
    const reg = {
      personaId: pid,
      monto: datos && datos.monto !== undefined ? U.n(datos.monto) : cuota,
      fecha: (datos && datos.fecha) || U.hoy(),
      metodo: (datos && datos.metodo) || 'Efectivo',
      referencia: (datos && datos.referencia) || '',
      notas: (datos && datos.notas) || ''
    };
    if (existente) Object.assign(existente, reg);
    else eg.pagos.push(reg);
    return true;
  };

  /* Cuadro de saldos por persona en un mes. */
  E.balancePersonas = function (p, mes) {
    const personas = E.personasActivas(p);
    const egresos = E.egresosDe(p, mes);
    const ingresos = E.ingresosDe(p, mes);
    const out = {};

    personas.forEach(x => {
      out[x.id] = {
        id: x.id, nombre: x.nombre, color: x.color,
        ingresoPlan: Number(x.ingreso) || 0,
        ingresoMes: 0, debe: 0, pagado: 0, saldo: 0,
        cuotas: 0, cuotasPagadas: 0, pctCarga: 0, eficiencia: 0
      };
    });

    // Ingresos del mes (registrados en el proyecto, no el sueldo base)
    ingresos.forEach(ing => {
      const pid = ing.personaId || 'hogar';
      if (out[pid]) out[pid].ingresoMes += U.n(ing.valor);
    });

    egresos.forEach(eg => {
      const est = E.estadoEgreso(p, eg);
      Object.keys(est.cuotas).forEach(pid => {
        if (!out[pid]) return;
        const monto = est.cuotas[pid];
        out[pid].debe += monto;
        out[pid].cuotas += 1;
        const pg = E.pagoDe(eg, pid);
        if (pg && pg.fecha) {
          out[pid].pagado += Number(pg.monto) || monto;
          out[pid].cuotasPagadas += 1;
        }
      });
    });

    // Reparto de ingresos del hogar no asignados a una persona
    const hogar = out['hogar'];
    if (hogar && hogar.ingresoMes > 0 && personas.length) {
      const sug = E.porcentajesSugeridos(p);
      personas.forEach(x => { out[x.id].ingresoMes += hogar.ingresoMes * ((sug[x.id] || 0) / 100); });
      hogar.ingresoMes = 0;
    }

    const totalIngresos = U.sum(personas, x => x.ingresoMes) || E.ingresoTotal(p);
    Object.keys(out).forEach(k => {
      const b = out[k];
      b.saldo = U.round2(b.ingresoMes - b.debe);
      b.eficiencia = b.debe > 0 ? U.round2(b.pagado / b.debe) : 1;
      b.pctCarga = b.ingresoMes > 0 ? (b.debe / b.ingresoMes) : 0;
      b.ingresoEfectivo = b.ingresoMes;
    });
    out.__totalIngresos = U.round2(totalIngresos);
    return out;
  };

  /* ============================================================
     6. RESUMEN / KPIs DEL MES
     ============================================================ */
  E.resumen = function (p, mes) {
    mes = mes || E.mesActivo(p);
    const egresos = E.egresosDe(p, mes);
    const ingresos = E.ingresosDe(p, mes);
    const personas = E.personasActivas(p);

    const totalEgresos = U.sum(egresos, e => U.n(e.valor));
    const totalIngresosPlan = U.sum(ingresos, e => U.n(e.valor));
    const sueldos = E.ingresoTotal(p);

    // Flujo real de ingresos = sueldos de las personas + ingresos extra del mes
    const flujoIngresos = U.round2(sueldos + totalIngresosPlan);

    let pagado = 0, pendiente = 0;
    egresos.forEach(eg => {
      const est = E.estadoEgreso(p, eg);
      pagado += est.pagado;
      pendiente += est.saldo;
    });
    pagado = U.round2(pagado); pendiente = U.round2(pendiente);

    const obligatorios = U.sum(egresos.filter(e => e.obligatorio !== false && e.tipoGasto !== 'variable'), e => U.n(e.valor));
    const variables = U.sum(egresos.filter(e => e.tipoGasto === 'variable'), e => U.n(e.valor));
    const deudas = U.sum(egresos.filter(e => e.tipoGasto === 'deuda'), e => U.n(e.valor));
    const ahorroPrevisto = U.sum(egresos.filter(e => e.tipoGasto === 'ahorro'), e => U.n(e.valor));

    const balance = U.round2(flujoIngresos - totalEgresos);
    const tasaAhorro = flujoIngresos > 0 ? balance / flujoIngresos : 0;
    const tasaEndeudamiento = flujoIngresos > 0 ? deudas / flujoIngresos : 0;
    const gastoPerCapita = personas.length ? U.round2(totalEgresos / personas.length) : 0;
    const ingresoPerCapita = personas.length ? U.round2(flujoIngresos / personas.length) : 0;

    // Por categoría
    const porCategoria = {};
    egresos.forEach(eg => {
      const c = eg.categoria || 'Sin categoría';
      porCategoria[c] = U.round2((porCategoria[c] || 0) + U.n(eg.valor));
    });

    // Por tipo
    const porTipo = {};
    egresos.forEach(eg => {
      const c = eg.tipoGasto || 'fijo';
      porTipo[c] = U.round2((porTipo[c] || 0) + U.n(eg.valor));
    });

    const topCategoria = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a])[0] || '—';

    // Proyección anual (extrapola el mes activo)
    const anual = {
      egresos: U.round2(totalEgresos * 12),
      ingresos: U.round2(flujoIngresos * 12),
      balance: U.round2(balance * 12),
      ahorro: U.round2(balance * 12)
    };

    return {
      mes: mes,
      nEgresos: egresos.length,
      nIngresos: ingresos.length,
      nPersonas: personas.length,
      totalEgresos: U.round2(totalEgresos),
      totalIngresosPlan: U.round2(totalIngresosPlan),
      sueldos: U.round2(sueldos),
      flujoIngresos: flujoIngresos,
      pagado: pagado,
      pendiente: pendiente,
      balance: balance,
      tasaAhorro: tasaAhorro,
      tasaEndeudamiento: tasaEndeudamiento,
      ahorroPrevisto: U.round2(ahorroPrevisto),
      obligatorios: U.round2(obligatorios),
      variables: U.round2(variables),
      deudas: U.round2(deudas),
      fijos: U.round2(obligatorios),
      gastoPerCapita: gastoPerCapita,
      ingresoPerCapita: ingresoPerCapita,
      porCategoria: porCategoria,
      porTipo: porTipo,
      topCategoria: topCategoria,
      anual: anual,
      balancePersonas: E.balancePersonas(p, mes),
      eficienciaPago: totalEgresos > 0 ? pagado / totalEgresos : 1
    };
  };

  /* ============================================================
     7. SERIE HISTÓRICA (mes a mes)
     ============================================================ */
  E.serieMensual = function (p, cantidad, desde) {
    const meses = U.meses(cantidad || 12, desde);
    return meses.map(mes => {
      const r = E.resumen(p, mes);
      return {
        mes: mes,
        etiqueta: U.mesCorto(mes),
        ingresos: r.flujoIngresos,
        egresos: r.totalEgresos,
        balance: r.balance,
        ahorro: r.balance,
        pagado: r.pagado,
        pendiente: r.pendiente
      };
    });
  };

  /* Historial real desde movimientos. */
  E.serieMovimientos = function (p, cantidad, desde) {
    const meses = U.meses(cantidad || 12, desde);
    const movs = p.movimientos || [];
    return meses.map(mes => {
      let ing = 0, egr = 0;
      movs.forEach(m => {
        if (U.mesDeFecha(m.fecha) !== mes) return;
        const v = Math.abs(U.n(m.cantidad));
        if (m.tipo === 'Ingreso') ing += v; else egr += v;
      });
      return { mes: mes, etiqueta: U.mesCorto(mes), ingresos: U.round2(ing), egresos: U.round2(egr), balance: U.round2(ing - egr) };
    });
  };

  /* ============================================================
     8. MOVIMIENTOS (libro tipo Finanzas.xlsx)
     ============================================================ */
  E.movimientosDe = function (p, mes) {
    return (p.movimientos || []).filter(m => !mes || U.mesDeFecha(m.fecha) === mes);
  };

  E.resumenMovimientos = function (p, mes) {
    const movs = E.movimientosDe(p, mes);
    let ing = 0, egr = 0;
    const porLugar = { Virtual: 0, Efectivo: 0 };
    const porCategoria = {};
    movs.forEach(m => {
      const v = U.n(m.cantidad);
      if (m.tipo === 'Ingreso') ing += v; else egr += v;
      const l = m.lugar || 'Efectivo';
      porLugar[l] = (porLugar[l] || 0) + Math.abs(v);
      const c = m.categoria || 'Sin categoría';
      porCategoria[c] = U.round2((porCategoria[c] || 0) + v);
    });
    return {
      n: movs.length,
      ingresos: U.round2(ing),
      egresos: U.round2(Math.abs(egr)),
      posicionNeta: U.round2(ing - egr),
      porLugar: { Virtual: U.round2(porLugar.Virtual || 0), Efectivo: U.round2(porLugar.Efectivo || 0) },
      porCategoria: porCategoria
    };
  };

  /* Genera movimientos automáticos a partir del plan del mes. */
  E.sincronizarMovimientos = function (p, mes) {
    mes = mes || E.mesActivo(p);
    if (!p.movimientos) p.movimientos = [];
    let creados = 0;

    E.egresosDe(p, mes).forEach(eg => {
      (eg.pagos || []).forEach(pg => {
        if (!pg.fecha) return;
        const coincide = p.movimientos.some(m => m.origen === 'pago:' + eg.id + ':' + pg.personaId);
        if (!coincide) {
          p.movimientos.push({
            id: U.uid('mov'),
            origen: 'pago:' + eg.id + ':' + pg.personaId,
            fecha: pg.fecha,
            descripcion: (eg.detalle || 'Egreso') + ' — ' + E.nombrePersona(p, pg.personaId),
            categoria: eg.categoria || 'Otros gastos',
            cantidad: -Math.abs(U.n(pg.monto)),
            tipo: 'Egreso',
            lugar: pg.metodo === 'Efectivo' ? 'Efectivo' : 'Virtual'
          });
          creados++;
        }
      });
    });

    E.ingresosDe(p, mes).forEach(ing => {
      const origen = 'ingreso:' + ing.id;
      if (!p.movimientos.some(m => m.origen === origen)) {
        p.movimientos.push({
          id: U.uid('mov'),
          origen: origen,
          fecha: ing.fecha || (mes + '-' + String(ing.dia || 1).padStart(2, '0')),
          descripcion: ing.detalle || 'Ingreso',
          categoria: ing.categoria || 'Otros ingresos',
          cantidad: Math.abs(U.n(ing.valor)),
          tipo: 'Ingreso',
          lugar: ing.lugar || 'Virtual'
        });
        creados++;
      }
    });

    p.movimientos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return creados;
  };

  /* ============================================================
     9. ALERTAS / SALUD FINANCIERA
     ============================================================ */
  E.alertas = function (p, mes) {
    const r = E.resumen(p, mes);
    const out = [];
    const add = (nivel, titulo, detalle, accion) => out.push({ nivel, titulo, detalle, accion });

    if (r.totalEgresos <= 0) {
      add('info', 'Sin egresos registrados', 'Agrega tus primeros gastos en «Plan mensual» para empezar el análisis.', 'Ir a Plan mensual');
      return out;
    }

    if (r.balance < 0)
      add('critico', 'Déficit mensual', 'Los egresos superan a los ingresos en ' +
        U.moneda(Math.abs(r.balance), p) + '. Debes recortar gastos variables o renegociar deudas.', 'Ver gastos variables');
    else if (r.tasaAhorro < 0.10)
      add('alta', 'Ahorro por debajo del 10%', 'Solo ahorras ' + U.pct(r.tasaAhorro) +
        ' de tus ingresos. La recomendación profesional mínima es 10%–20%.', 'Revisar plan');
    else if (r.tasaAhorro < 0.20)
      add('media', 'Ahorro moderado', 'Ahorras ' + U.pct(r.tasaAhorro) +
        '. Apunta al 20% (regla 50/30/20) para tener colchón de emergencia.', 'Meta de ahorro');
    else
      add('ok', 'Buena tasa de ahorro', 'Ahorras ' + U.pct(r.tasaAhorro) +
        ' del ingreso. Mantén la disciplina y construye 3–6 meses de gastos de emergencia.', null);

    if (r.tasaEndeudamiento > 0.35)
      add('critico', 'Endeudamiento alto', 'Las deudas consumen ' + U.pct(r.tasaEndeudamiento) +
        ' del ingreso. Por encima del 35% la capacidad de pago se deteriora.', 'Plan de pago de deudas');
    else if (r.tasaEndeudamiento > 0.20)
      add('media', 'Endeudamiento moderado', 'Las deudas representan ' + U.pct(r.tasaEndeudamiento) +
        ' del ingreso. Vigila que no crezcan.', null);

    if (r.pendiente > 0.004)
      add('alta', 'Pagos pendientes', 'Quedan ' + U.moneda(r.pendiente, p) +
        ' sin cancelar en el mes (' + U.pct(1 - r.eficienciaPago) + ' del total).', 'Ir a Pagos');

    const bp = r.balancePersonas;
    const claves = Object.keys(bp).filter(k => k !== '__totalIngresos' && bp[k].debe > 0);
    let desbalance = 0, peor = null;
    claves.forEach(k => {
      const b = bp[k];
      if (b.ingresoEfectivo > 0) {
        const dif = Math.abs(b.pctCarga - (1 / Math.max(1, claves.length)));
        if (dif > desbalance) { desbalance = dif; peor = b; }
      }
    });
    if (peor && peor.pctCarga > 0.6)
      add('alta', 'Carga desbalanceada', peor.nombre + ' asume ' + U.pct(peor.pctCarga) +
        ' de su ingreso en gastos del hogar. Recalcula los porcentajes.', 'Ajustar %');

    const pares = claves.map(k => bp[k]).filter(b => b.ingresoEfectivo > 0);
    if (pares.length >= 2) {
      const cargas = pares.map(b => b.pctCarga);
      const min = Math.min.apply(null, cargas), max = Math.max.apply(null, cargas);
      if (max - min > 0.25)
        add('media', 'Diferencia de esfuerzo entre miembros', 'Hay ' +
          U.pct(max - min) + ' de diferencia en la carga relativa. Usa la distribución «Proporcional a ingresos».', 'Equilibrar');
    }

    const top = Object.keys(r.porCategoria).sort((a, b) => r.porCategoria[b] - r.porCategoria[a])[0];
    if (top && r.totalEgresos > 0 && r.porCategoria[top] / r.totalEgresos > 0.4)
      add('media', 'Concentración de gastos', 'La categoría «' + top + '» concentra ' +
        U.pct(r.porCategoria[top] / r.totalEgresos) + ' del gasto mensual.', null);

    if (r.variables > r.flujoIngresos * 0.30)
      add('media', 'Gasto variable elevado', 'Los gastos discrecionales son ' +
        U.moneda(r.variables, p) + ' (' + U.pct(r.variables / Math.max(1, r.flujoIngresos)) + ' del ingreso).', null);

    if (r.nPersonas === 1)
      add('info', 'Un solo miembro del hogar', 'Con una persona todo el gasto recae sobre un solo ingreso. Valida si corresponde repartir con otra persona.', 'Agregar persona');

    return out;
  };

  /* ============================================================
     10. SCORE DE SALUD FINANCIERA (0–100)
     ============================================================ */
  E.score = function (p, mes) {
    const r = E.resumen(p, mes);
    let s = 50;
    if (r.flujoIngresos > 0) {
      if (r.balance > 0) s += 15;
      if (r.tasaAhorro >= 0.20) s += 20;
      else if (r.tasaAhorro >= 0.10) s += 12;
      else if (r.tasaAhorro > 0) s += 5;
      if (r.tasaEndeudamiento <= 0.20) s += 10;
      else if (r.tasaEndeudamiento <= 0.35) s += 4;
      if (r.eficienciaPago >= 0.999) s += 10;
      else s += Math.round(r.eficienciaPago * 10);
      if (r.nPersonas > 1) {
        const bp = r.balancePersonas;
        const claves = Object.keys(bp).filter(k => k !== '__totalIngresos' && bp[k].ingresoEfectivo > 0);
        if (claves.length >= 2) {
          const cargas = claves.map(k => bp[k].pctCarga);
          const dif = Math.max.apply(null, cargas) - Math.min.apply(null, cargas);
          if (dif <= 0.10) s += 5;
          else if (dif <= 0.25) s += 2;
        }
      }
    }
    s = Math.max(0, Math.min(100, Math.round(s)));
    let nivel = 'Crítico';
    if (s >= 85) nivel = 'Excelente';
    else if (s >= 70) nivel = 'Sano';
    else if (s >= 55) nivel = 'Atención';
    else if (s >= 40) nivel = 'Riesgo';
    return { score: s, nivel: nivel };
  };

  /* ============================================================
     11. PROYECCIONES Y METAS
     ============================================================ */
  E.proyeccion = function (p, meses, mes) {
    const r = E.resumen(p, mes);
    const n = meses || 12;
    const out = [];
    let acum = 0;
    for (let i = 1; i <= n; i++) {
      acum += r.balance;
      out.push({
        periodo: i,
        egresos: U.round2(r.totalEgresos * i),
        ingresos: U.round2(r.flujoIngresos * i),
        acumulado: U.round2(acum)
      });
    }
    return out;
  };

  E.metasAhorro = function (p, mes) {
    const r = E.resumen(p, mes);
    const colchon3 = U.round2(r.totalEgresos * 3);
    const colchon6 = U.round2(r.totalEgresos * 6);
    const meses3 = r.balance > 0 ? Math.ceil(colchon3 / r.balance) : Infinity;
    const meses6 = r.balance > 0 ? Math.ceil(colchon6 / r.balance) : Infinity;
    return {
      fondoEmergencia: colchon6,
      colchon3: colchon3, colchon6: colchon6,
      mesesPara3: meses3, mesesPara6: meses6,
      ahorroMensualSugerido: U.round2(r.flujoIngresos * 0.20),
      ahorroAnual: U.round2(r.balance * 12)
    };
  };

  /* Regla 50/30/20 aplicada al proyecto. */
  E.regla503020 = function (p, mes) {
    const r = E.resumen(p, mes);
    const ing = r.flujoIngresos;
    const necesidades = U.round2(ing * 0.50);
    const deseos = U.round2(ing * 0.30);
    const ahorro = U.round2(ing * 0.20);
    const realesNecesidades = U.round2(r.obligatorios + r.deudas);
    return {
      ingreso: ing,
      recomendado: { necesidades: necesidades, deseos: deseos, ahorro: ahorro },
      real: { necesidades: realesNecesidades, deseos: r.variables, ahorro: r.balance },
      desvNecesidades: U.round2(realesNecesidades - necesidades),
      desvDeseos: U.round2(r.variables - deseos),
      desvAhorro: U.round2(r.balance - ahorro)
    };
  };

  /* ============================================================
     12. PLANTILLAS DE EGRESOS COMUNES
     ============================================================ */
  E.plantillasEgresos = [
    { detalle: 'Luz (ELEC)', categoria: 'Luz', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Agua (EPMAPS)', categoria: 'Agua', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Internet', categoria: 'Internet y teléfono', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Plan de teléfono', categoria: 'Internet y teléfono', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Gas domiciliario', categoria: 'Servicios públicos', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Alquiler', categoria: 'Vivienda y alquiler', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Cuota banco', categoria: 'Deudas y tarjetas', tipoGasto: 'deuda', valor: 0 },
    { detalle: 'Tarjeta de crédito', categoria: 'Deudas y tarjetas', tipoGasto: 'deuda', valor: 0 },
    { detalle: 'Seguro', categoria: 'Seguros', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Predial / impuestos', categoria: 'Impuestos y tasas', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Comida mensual', categoria: 'Alimentación', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Comida diaria', categoria: 'Alimentación', tipoGasto: 'variable', valor: 0 },
    { detalle: 'Transporte / combustible', categoria: 'Transporte', tipoGasto: 'variable', valor: 0 },
    { detalle: 'Matrícula / colegiatura', categoria: 'Educación', tipoGasto: 'fijo', valor: 0 },
    { detalle: 'Ahorro mensual', categoria: 'Ahorro e inversión', tipoGasto: 'ahorro', valor: 0 }
  ];

  global.AfEngine = E;
})(window);
