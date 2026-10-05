/* ============================================================
   ATMÓSFERA FINANCIERA — compras-engine.js  (AfCompras)
   Catálogo de víveres, libro de precios por supermercado,
   historial de boletas, comparación, estacionalidad y
   análisis de consumo. Todo vinculado a los gastos del hogar.
   ============================================================ */
(function (global) {
  'use strict';
  const U = global.Util;
  const E = global.AfEngine;

  const C = global.AfCompras = {};

  C.TIENDAS_TIPO = [
    { id: 'supermercado', nombre: 'Supermercado' },
    { id: 'mercado', nombre: 'Mercado' },
    { id: 'tienda', nombre: 'Tienda / bodega' },
    { id: 'carniceria', nombre: 'Carnicería / pollería' },
    { id: 'panaderia', nombre: 'Panadería' },
    { id: 'farmacia', nombre: 'Farmacia' },
    { id: 'otro', nombre: 'Otro' }
  ];

  C.CATEGORIAS = ['Víveres', 'Carnes', 'Frutas y verduras', 'Lácteos', 'Bebidas',
    'Aseo y limpieza', 'Bebé', 'Hogar', 'Otros'];

  C.UNIDADES = ['kg', 'g', 'lt', 'ml', 'und', 'paq', 'docena', 'manojo', 'lata'];

  /* ---------- estructura ---------- */
  C.asegurar = function (p) {
    if (!p.compras) p.compras = {};
    const c = p.compras;
    if (!Array.isArray(c.tiendas)) c.tiendas = [];
    if (!Array.isArray(c.productos)) c.productos = [];
    if (!Array.isArray(c.precios)) c.precios = [];
    if (!Array.isArray(c.boletas)) c.boletas = [];
    return c;
  };
  C.tiendas = function (p) { return C.asegurar(p).tiendas; };
  C.productos = function (p) { return C.asegurar(p).productos; };
  C.precios = function (p) { return C.asegurar(p).precios; };
  C.boletas = function (p) { return C.asegurar(p).boletas; };

  const uid = (pre) => pre + '_' + Math.random().toString(36).slice(2, 9);
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

  function hoy() { const d = new Date(); return d.toISOString().slice(0, 10); }
  function hace(dias) { const d = new Date(); d.setDate(d.getDate() - dias); return d.toISOString().slice(0, 10); }
  function mesDe(f) { return String(f || '').slice(0, 7); }
  C.hace = hace;

  function fechaTs(f) { const t = Date.parse(String(f || '') + 'T00:00:00'); return isNaN(t) ? 0 : t; }

  /* ============================================================
     1. PRECIOS
     ============================================================ */
  C.precioVigente = function (p, productoId, tiendaId, hasta) {
    const limite = fechaTs(hasta || hoy());
    let mejor = null;
    C.precios(p).forEach(x => {
      if (x.productoId !== productoId || x.tiendaId !== tiendaId) return;
      const t = fechaTs(x.fecha);
      if (t > limite) return;
      if (!mejor || t >= fechaTs(mejor.fecha)) mejor = x;
    });
    return mejor;
  };

  C.comparativa = function (p, productoId, hasta) {
    return C.tiendas(p).filter(t => t.activo !== false).map(t => {
      const reg = C.precioVigente(p, productoId, t.id, hasta);
      return reg ? {
        tiendaId: t.id, tienda: t.nombre, tipo: t.tipo,
        precio: reg.precio, fecha: reg.fecha, promo: reg.promo || null, id: reg.id
      } : null;
    }).filter(Boolean).sort((a, b) => a.precio - b.precio);
  };

  C.mejorPrecio = function (p, productoId, hasta) {
    const c = C.comparativa(p, productoId, hasta);
    return c.length ? c[0] : null;
  };

  /* precio en la "canasta" ideal: cada producto en su tienda más barata */
  C.canastaIdeal = function (p, hasta) {
    let total = 0, faltan = 0, lineas = [];
    C.productos(p).forEach(pr => {
      const m = C.mejorPrecio(p, pr.id, hasta);
      if (!m) { faltan++; lineas.push({ producto: pr, ok: false }); return; }
      total += m.precio;
      lineas.push({ producto: pr, ok: true, precio: m.precio, tienda: m.tienda, tiendaId: m.tiendaId });
    });
    return { total: r2(total), faltan: faltan, lineas: lineas };
  };

  /* total de comprar TODO el catálogo en una sola tienda */
  C.canastaEn = function (p, tiendaId, hasta) {
    let total = 0, hay = 0, faltan = [];
    C.productos(p).forEach(pr => {
      const reg = C.precioVigente(p, pr.id, tiendaId, hasta);
      if (reg) { total += reg.precio; hay++; } else faltan.push(pr);
    });
    return { total: r2(total), hay: hay, faltan: faltan };
  };

  C.canastaPorTienda = function (p, hasta) {
    return C.tiendas(p).filter(t => t.activo !== false).map(t => {
      const k = C.canastaEn(p, t.id, hasta);
      return { tienda: t, total: k.total, hay: k.hay, faltan: k.faltan.length };
    });
  };

  /* tendencia: precio actual vs medición anterior */
  C.tendencia = function (p, productoId) {
    const regs = C.precios(p).filter(x => x.productoId === productoId)
      .sort((a, b) => fechaTs(b.fecha) - fechaTs(a.fecha));
    if (regs.length < 2) return { dir: 'sin-datos', pct: 0, actual: regs[0] ? regs[0].precio : 0 };
    const a = regs[0].precio, b = regs[1].precio;
    const pct = b ? r2(((a - b) / b) * 100) : 0;
    return { dir: pct > 0.5 ? 'sube' : pct < -0.5 ? 'baja' : 'igual', pct: pct, actual: a, anterior: b, fecha: regs[0].fecha };
  };

  C.historialPrecio = function (p, productoId) {
    return C.precios(p).filter(x => x.productoId === productoId)
      .sort((a, b) => fechaTs(a.fecha) - fechaTs(b.fecha));
  };

  /* promedio mensual de un producto (estacionalidad) */
  C.seriePrecio = function (p, productoId) {
    const porMes = {};
    C.historialPrecio(p, productoId).forEach(x => {
      const m = mesDe(x.fecha);
      (porMes[m] = porMes[m] || []).push(x.precio);
    });
    return Object.keys(porMes).sort().map(m => ({
      mes: m, precio: r2(porMes[m].reduce((a, b) => a + b, 0) / porMes[m].length)
    }));
  };

  /* ============================================================
     2. BOLETAS (compras registradas)
     ============================================================ */
  C.producto = function (p, id) { return C.productos(p).find(x => x.id === id) || null; };
  C.tienda = function (p, id) { return C.tiendas(p).find(x => x.id === id) || null; };

  C.totalBoleta = function (b) {
    return r2((b.lineas || []).reduce((a, l) => a + (Number(l.subtotal) || 0), 0));
  };

  C.boletasOrden = function (p) {
    return C.boletas(p).slice().sort((a, b) => fechaTs(b.fecha) - fechaTs(a.fecha));
  };

  C.boletasDe = function (p, mes) {
    return C.boletasOrden(p).filter(b => !mes || mesDe(b.fecha) === mes);
  };

  C.totalMes = function (p, mes) {
    return r2(C.boletasDe(p, mes).reduce((a, b) => a + C.totalBoleta(b), 0));
  };

  C.guardarBoleta = function (p, datos) {
    const c = C.asegurar(p);
    let b;
    if (datos.id) {
      b = c.boletas.find(x => x.id === datos.id);
      if (!b) return null;
    } else {
      b = { id: uid('bol'), creada: new Date().toISOString(), egresoId: null };
      c.boletas.push(b);
    }
    b.fecha = datos.fecha || hoy();
    b.tiendaId = datos.tiendaId;
    b.nota = datos.nota || '';
    b.lineas = (datos.lineas || []).filter(l => l.productoId && Number(l.cantidad) > 0).map(l => ({
      productoId: l.productoId,
      cantidad: Number(l.cantidad),
      unidad: l.unidad || 'und',
      precioUnit: r2(l.precioUnit),
      subtotal: r2(Number(l.cantidad) * r2(l.precioUnit))
    }));
    b.total = C.totalBoleta(b);
    if (datos.vincular !== false && !b.egresoId) C.vincularEgreso(p, b);
    return b;
  };

  C.borrarBoleta = function (p, id) {
    const c = C.asegurar(p);
    const b = c.boletas.find(x => x.id === id);
    if (!b) return;
    if (b.egresoId) {
      const eg = (p.egresos || []).find(x => x.id === b.egresoId);
      if (eg) p.egresos = p.egresos.filter(x => x.id !== b.egresoId);
    }
    c.boletas = c.boletas.filter(x => x.id !== id);
  };

  /* ---- vínculo con la economía del hogar ---- */
  C.vincularEgreso = function (p, b) {
    const tienda = C.tienda(p, b.tiendaId);
    if (!p.egresos) p.egresos = [];
    const mes = mesDe(b.fecha);
    const eg = {
      id: uid('egr'),
      mes: mes,
      detalle: '🛒 Compra en ' + (tienda ? tienda.name || tienda.nombre : 'tienda') +
        ' (' + (b.lineas || []).length + ' ítems)',
      categoria: 'Alimentación',
      tipoGasto: 'variable',
      valor: C.totalBoleta(b),
      dia: Number(String(b.fecha).slice(8, 10)) || 1,
      obligatorio: false,
      modo: 'auto',
      distribucion: null,
      notas: 'Generado desde Compras · boleta ' + b.id,
      origen: 'compras',
      boletaId: b.id,
      pagos: []
    };
    p.egresos.push(eg);
    b.egresoId = eg.id;
    return eg;
  };

  C.desvincularEgreso = function (p, b) {
    if (!b.egresoId) return;
    p.egresos = (p.egresos || []).filter(x => x.id !== b.egresoId);
    b.egresoId = null;
  };

  /* ============================================================
     3. ANÁLISIS DE CONSUMO (frecuencia y duración)
     ============================================================ */
  C.comprasProducto = function (p, productoId) {
    const out = [];
    C.boletas(p).forEach(b => {
      (b.lineas || []).forEach(l => {
        if (l.productoId === productoId) out.push({ fecha: b.fecha, boleta: b.id, cantidad: l.cantidad, subtotal: l.subtotal, tiendaId: b.tiendaId });
      });
    });
    return out.sort((a, b) => fechaTs(a.fecha) - fechaTs(b.fecha));
  };

  C.intervalo = function (p, productoId) {
    const compras = C.comprasProducto(p, productoId);
    const fechas = compras.map(x => x.fecha);
    const dias = [];
    for (let i = 1; i < fechas.length; i++) {
      dias.push(Math.round((fechaTs(fechas[i]) - fechaTs(fechas[i - 1])) / 86400000));
    }
    const mediana = dias.length ? medianaNum(dias) : null;
    const media = dias.length ? r2(dias.reduce((a, b) => a + b, 0) / dias.length) : null;
    const ultima = fechas.length ? fechas[fechas.length - 1] : null;
    const hoyTs = fechaTs(hoy());
    const diasDesde = ultima ? Math.round((hoyTs - fechaTs(ultima)) / 86400000) : null;
    const duracion = mediana || media || null;
    const proxima = ultima && duracion ? sumarDias(ultima, Math.round(duracion)) : null;
    const vecesMes = media ? r2(30 / media) : null;
    const vecesSemana = media ? r2(7 / media) : null;
    const vecesAnio = media ? r2(365 / media) : null;
    return {
      n: compras.length, compras: compras, diasEntre: dias,
      mediana: mediana, media: media, duracion: duracion,
      ultima: ultima, diasDesde: diasDesde, proxima: proxima,
      vecesMes: vecesMes, vecesSemana: vecesSemana, vecesAnio: vecesAnio,
      gastoTotal: r2(compras.reduce((a, x) => a + (x.subtotal || 0), 0)),
      estado: !proxima ? 'sin-datos'
        : fechaTs(proxima) <= hoyTs ? 'recomprar'
          : (fechaTs(proxima) - hoyTs) <= 3 * 86400000 ? 'pronto' : 'ok'
    };
  };

  function medianaNum(arr) {
    const a = arr.slice().sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : r2((a[m - 1] + a[m]) / 2);
  }
  function sumarDias(fecha, dias) {
    const d = new Date(fecha + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }
  C.sumarDias = sumarDias;

  /* ============================================================
     4. ESTADÍSTICAS Y ALERTAS
     ============================================================ */
  C.estadisticas = function (p, mes) {
    mes = mes || E.mesActivo(p);
    const boletas = C.boletasDe(p, mes);
    const total = r2(boletas.reduce((a, b) => a + C.totalBoleta(b), 0));
    const ticket = boletas.length ? r2(total / boletas.length) : 0;

    const porTienda = {}, porCat = {}, porProd = {}, porDia = {};
    boletas.forEach(b => {
      const t = C.tienda(p, b.tiendaId);
      const tn = t ? t.nombre : 'Sin tienda';
      porTienda[tn] = r2((porTienda[tn] || 0) + C.totalBoleta(b));
      porDia[mesDe(b.fecha) + '-d'] = 1;
      (b.lineas || []).forEach(l => {
        const pr = C.producto(p, l.productoId);
        const cat = pr ? pr.categoria : 'Otros';
        porCat[cat] = r2((porCat[cat] || 0) + (l.subtotal || 0));
        const k = pr ? (pr.nombre + (pr.marca ? ' · ' + pr.marca : '')) : 'Producto borrado';
        porProd[k] = r2((porProd[k] || 0) + (l.subtotal || 0));
      });
    });

    const r = E.resumen(p, mes);
    const egresosHogar = r.totalEgresos || 0;

    const aCredito = Object.keys(porTienda).map(k => ({ nombre: k, total: porTienda[k] })).sort((a, b) => b.total - a.total);
    const categorias = Object.keys(porCat).map(k => ({ nombre: k, total: porCat[k] })).sort((a, b) => b.total - a.total);
    const productos = Object.keys(porProd).map(k => ({ nombre: k, total: porProd[k] })).sort((a, b) => b.total - a.total);

    const evolucion = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      evolucion.push({ mes: m, total: C.totalMes(p, m) });
    }

    return {
      mes: mes, boletas: boletas, n: boletas.length, total: total, ticket: ticket,
      egresosHogar: egresosHogar,
      share: egresosHogar > 0 ? r2((total / egresosHogar) * 100) : 0,
      porTienda: aCredito, porCategoria: categorias, porProductos: productos,
      evolucion: evolucion,
      mejorTienda: aCredito.length ? aCredito[aCredito.length - 1] : null,
      peorTienda: aCredito.length ? aCredito[0] : null,
      comprasMes: C.comprasDelMes(p, mes)
    };
  };

  /* compras por semana/mes para medir la frecuencia del hogar */
  C.comprasDelMes = function (p, mes) {
    const total = C.boletasDe(p, mes).length;
    const anio = mes ? mes.slice(0, 4) : '';
    const delAnio = C.boletas(p).filter(b => !anio || String(b.fecha).slice(0, 4) === anio).length;
    return {
      mes: total,
      porSemana: r2(total / 4.33),
      anio: delAnio,
      porMesPromedio: delAnio ? r2(delAnio / Math.max(1, Number(String(hoy()).slice(5, 7)) || 1)) : 0
    };
  };

  C.preciosSubieron = function (p) {
    const out = [];
    C.productos(p).forEach(pr => {
      const t = C.tendencia(p, pr.id);
      if (t.dir === 'sube' && Math.abs(t.pct) >= 3) out.push({ producto: pr, pct: t.pct, actual: t.actual, anterior: t.anterior });
    });
    return out.sort((a, b) => b.pct - a.pct);
  };

  C.promociones = function (p) {
    const hoyTs = fechaTs(hoy());
    return C.precios(p).filter(x => x.promo && x.promo.hasta && fechaTs(x.promo.hasta) >= hoyTs)
      .map(x => ({ reg: x, producto: C.producto(p, x.productoId), tienda: C.tienda(p, x.tiendaId) }))
      .filter(x => x.producto && x.tienda);
  };

  C.porRecomprar = function (p) {
    return C.productos(p).map(pr => ({ producto: pr, intervalo: C.intervalo(p, pr.id) }))
      .filter(x => x.intervalo.estado === 'recomprar' || x.intervalo.estado === 'pronto')
      .sort((a, b) => String(a.intervalo.proxima).localeCompare(String(b.intervalo.proxima)));
  };

  C.alertas = function (p) {
    const out = [];
    C.porRecomprar(p).forEach(x => {
      out.push({
        nivel: x.intervalo.estado === 'recomprar' ? 'alta' : 'media',
        area: 'Compras',
        titulo: 'Recomprar ' + x.producto.nombre,
        texto: 'Última compra ' + x.intervalo.ultima + ' · dura ~' + (x.intervalo.duracion || '?') +
          ' días · toca volver a comprar (' + (x.intervalo.proxima || 's/d') + ').',
        accion: 'Ver catálogo'
      });
    });
    C.preciosSubieron(p).slice(0, 5).forEach(x => {
      out.push({
        nivel: x.pct >= 10 ? 'alta' : 'media', area: 'Precios',
        titulo: 'Subió ' + x.producto.nombre,
        texto: 'Pasó de ' + U.moneda(x.anterior) + ' a ' + U.moneda(x.actual) + ' (+' + x.pct + '%). ' +
          'Revisá si conviene en otra tienda.',
        accion: 'Comparar'
      });
    });
    const cmp = C.compararCanasta(p);
    if (cmp && cmp.ahorro > 0.5) {
      out.push({
        nivel: 'info', area: 'Ahorro',
        titulo: 'Ahorrá ' + U.moneda(cmp.ahorro) + ' por compra',
        texto: 'Comprando cada producto en su tienda más barata en vez de ' +
          (cmp.peor ? cmp.peor.tienda.nombre : 'la más cara') + '.',
        accion: 'Ir al comparador'
      });
    }
    return out;
  };

  /* comparación de canasta + ahorro potencial.
     Se compara sólo entre tiendas que cubren una parte relevante del
     catálogo (≥60%), y usando los productos comunes a todas ellas: así una
     tienda que vende muy pocos artículos no gana el ranking por "vender barato". */
  C.compararCanasta = function (p, hasta) {
    const prods = C.productos(p);
    const tiendas = C.tiendas(p).filter(t => t.activo !== false);
    if (!prods.length || !tiendas.length) return null;

    const conPrecio = (pr, t) => !!C.precioVigente(p, pr.id, t.id, hasta);
    const conDatos = tiendas.filter(t => prods.some(pr => conPrecio(pr, t)));
    if (!conDatos.length) return null;

    const umbral = Math.ceil(prods.length * 0.6);
    const enRanking = conDatos.filter(t => prods.filter(pr => conPrecio(pr, t)).length >= umbral);
    const base = enRanking.length ? enRanking : conDatos;

    let comunes = prods.filter(pr => base.every(t => conPrecio(pr, t)));
    if (!comunes.length) comunes = prods.filter(pr => base.filter(t => conPrecio(pr, t)).length >= 2);

    const lista = base.map(t => {
      const propios = prods.filter(pr => conPrecio(pr, t));
      let total = 0, propio = 0;
      comunes.forEach(pr => { const r = C.precioVigente(p, pr.id, t.id, hasta); if (r) total += r.precio; });
      propios.forEach(pr => { const r = C.precioVigente(p, pr.id, t.id, hasta); if (r) propio += r.precio; });
      return {
        tienda: t, total: r2(total), totalPropio: r2(propio),
        hay: propios.length, faltan: prods.length - propios.length, nComunes: comunes.length
      };
    }).sort((a, b) => a.total - b.total);
    if (!lista.length) return null;

    const lineasIdeal = comunes.map(pr => {
      const cmp = C.comparativa(p, pr.id, hasta).filter(x => base.some(t => t.id === x.tiendaId));
      return cmp.length
        ? { producto: pr, ok: true, precio: cmp[0].precio, tienda: cmp[0].tienda, tiendaId: cmp[0].tiendaId }
        : { producto: pr, ok: false };
    });
    const ideal = {
      total: r2(lineasIdeal.filter(x => x.ok).reduce((a, x) => a + x.precio, 0)),
      lineas: lineasIdeal,
      faltan: prods.length - comunes.length
    };

    const peor = lista[lista.length - 1];
    return {
      ideal: ideal, mejor: lista[0], peor: peor, lista: lista,
      nComunes: comunes.length, comunes: comunes,
      fueraRanking: conDatos.filter(t => base.indexOf(t) < 0),
      ahorro: r2(peor.total - ideal.total),
      ahorroVsMejor: r2(peor.total - lista[0].total)
    };
  };

  /* ============================================================
     5. ALTAS (productos, tiendas, precios)
     ============================================================ */
  C.crearTienda = function (p, datos) {
    const t = {
      id: uid('tie'), nombre: datos.nombre, tipo: datos.tipo || 'supermercado',
      color: datos.color || '#2563EB', activo: true, notas: datos.notas || ''
    };
    C.asegurar(p).tiendas.push(t);
    return t;
  };

  C.crearProducto = function (p, datos) {
    const pr = {
      id: uid('pro'), nombre: datos.nombre,
      marca: datos.marca || '', categoria: datos.categoria || 'Víveres',
      unidad: datos.unidad || 'und', presentacion: datos.presentacion || '',
      notas: datos.notas || ''
    };
    C.asegurar(p).productos.push(pr);
    if (datos.precio) {
      datos.tiendaIdList.forEach(tid => C.registrarPrecio(p, {
        productoId: pr.id, tiendaId: tid, precio: datos.precio, fecha: datos.fecha || hoy()
      }));
    }
    return pr;
  };

  C.registrarPrecio = function (p, datos) {
    const c = C.asegurar(p);
    const reg = {
      id: uid('pre'), productoId: datos.productoId, tiendaId: datos.tiendaId,
      precio: r2(datos.precio), fecha: datos.fecha || hoy(),
      promo: datos.promo || null, nota: datos.nota || '',
      creada: new Date().toISOString()
    };
    c.precios.push(reg);
    return reg;
  };

  C.actualizarPrecio = function (p, productoId, tiendaId, precio, fecha, promo, nota) {
    return C.registrarPrecio(p, { productoId: productoId, tiendaId: tiendaId, precio: precio, fecha: fecha, promo: promo, nota: nota });
  };

  /* ============================================================
     6. CONSULTAS AL AGENTE DE COMPRAS
     ============================================================ */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function buscarProducto(p, texto) {
    const t = norm(texto);
    let mejor = null, puntaje = 0;
    C.productos(p).forEach(pr => {
      const n = norm(pr.nombre), m = norm(pr.marca);
      let s = 0;
      if (t.indexOf(n) >= 0) s = n.length + 5;
      else if (n.indexOf(t) >= 0) s = t.length;
      else if (m && t.indexOf(m) >= 0) s = m.length;
      if (s > puntaje) { puntaje = s; mejor = pr; }
    });
    return mejor;
  }

  function buscarTienda(p, texto) {
    const t = norm(texto);
    return C.tiendas(p).find(x => norm(x.nombre).indexOf(t) >= 0 || t.indexOf(norm(x.nombre)) >= 0) || null;
  }

  const M = v => U.moneda(v);

  C.consultar = function (p, texto) {
    const q = norm(texto);
    if (!q) return null;

    /* ¿La consulta tiene que con las compras? (palabras clave,
       productos del catálogo, marcas o tiendas) */
    const clave = /(compra|compras|supermercad|tienda|viver|víver|mercado|carne|precio|canasta|boleta|aki|tuti|tia|comisariato|market|donde compro|cuanto dura|consumo|promocion|oferta|producto|barato|mas caro|carrito)/.test(q);
    const rel = clave ||
      /barato|mas caro/.test(q) ||
      C.productos(p).some(pr => (norm(pr.nombre).length >= 4 && q.indexOf(norm(pr.nombre)) >= 0) ||
        (norm(pr.marca).length >= 4 && q.indexOf(norm(pr.marca)) >= 0)) ||
      C.tiendas(p).some(t => norm(t.nombre).length >= 4 && q.indexOf(norm(t.nombre)) >= 0);
    if (!rel) return null;

    const Auth = global.App && global.App.Auth;
    const soloLectura = Auth ? Auth.esDemo() : false;

    /* --- agregar producto: "agregar arroz la espiga 1kg a 1.20 en aki" --- */
    if (soloLectura) { /* sólo consulta */ }
    else if (/^(agregar|aniadir|adicionar|registrar) (producto|viver|víver)/.test(q) || (/^(agregar|aniadir) /.test(q) && /\b(a|a precio de|a \$)\s*\d/.test(q))) {
      return accionAgregar(p, texto, q);
    } else if (/^(actualizar|cambiar|update) (precio|costo)/.test(q) || /en (aki|tuti|tia|comisariato|mercado|tienda|carniceria)/.test(q) && /precio/.test(q) && /\d/.test(q)) {
      return accionPrecio(p, texto, q);
    }

    /* --- comparar precios de un producto --- */
    if (/(donde|dónde|en cual|en cuál|cual es el mas barato|mas barato|mas caro|comparar|compara|precio de|cuanto sale|cuánto sale|costo de)/.test(q)) {
      const pr = buscarProducto(p, texto);
      if (pr) return respuestaProducto(p, pr);
    }

    /* --- canasta completa --- */
    if (/(canasta|toda la compra|la compra completa|completa|carrito|lista de la compra|total de la compra|donde conviene)/.test(q)) {
      return respuestaCanasta(p);
    }

    /* --- qué tienda conviene --- */
    if (/(que tienda|cual tienda|tienda mas barata|mejor tienda|donde comprar)/.test(q)) {
      return respuestaTienda(p);
    }

    /* --- promociones --- */
    if (/(promocion|promociones|oferta|ofertas|rebaja|descuento)/.test(q)) return respuestaPromos(p);

    /* --- duración / frecuencia de consumo --- */
    if (/(cuanto dura|cuánto dura|cada cuanto|cada cuánto|frecuencia|consumo|se acabo|se acabó|recomprar|debo comprar|falta)/.test(q)) {
      const pr = buscarProducto(p, texto);
      if (pr) return respuestaConsumo(p, pr);
      return respuestaRecomprar(p);
    }

    /* --- resumen / estadísticas --- */
    if (/(resumen|estadistica|estadística|en que gasto|donde gasto|mas caro|top|informe|analisis|análisis|cuanto llevo|total)/.test(q)) {
      return respuestaResumen(p);
    }

    /* --- ayuda --- */
    if (/(ayuda|que puedes|que sabes|menu|comandos)/.test(q)) return respuestaAyuda();

    return null;
  };

  function respuestaAyuda() {
    return {
      tipo: 'compras-ayuda',
      html: '<p>Soy tu <b>asistente de compras del hogar</b>. Puedo:</p><ul>' +
        '<li><b>Comparar precios:</b> «¿dónde compro el arroz más barato?»</li>' +
        '<li><b>Comparar la canasta:</b> «compara la compra completa en los supermercados»</li>' +
        '<li><b>Precio y temporada:</b> «¿cuánto está el aceite chef?» / «¿subió la leche?»</li>' +
        '<li><b>Consumo:</b> «¿cada cuánto compro pañales?» / «¿cuánto dura el arroz?»</li>' +
        '<li><b>Qué comprar:</b> «¿qué debo comprar esta semana?»</li>' +
        '<li><b>Registrar:</b> «agregar papel higiénico regia a 3.99 en Tuti»</li>' +
        '<li><b>Resumen:</b> «¿en qué gasto más en compras?»</li></ul>'
    };
  }

  function respuestaProducto(p, pr) {
    const cmp = C.comparativa(p, pr.id);
    if (!cmp.length) return { tipo: 'compras', html: '<p>No tengo precios registrados de <b>' + U.esc(pr.nombre) + '</b>. Cargá uno desde Catálogo.</p>' };
    const mejor = cmp[0], peor = cmp[cmp.length - 1];
    const ten = C.tendencia(p, pr.id);
    const filas = cmp.map((x, i) =>
      '<tr' + (i === 0 ? ' style="font-weight:700"' : '') + '><td>' + U.esc(x.tienda) + '</td>' +
      '<td style="text-align:right">' + M(x.precio) + '</td>' +
      '<td>' + x.fecha + '</td>' +
      '<td>' + (x.promo ? '🏷 promo hasta ' + U.esc(x.promo.hasta) : '—') + '</td></tr>').join('');
    const ahorro = U.round2(peor.precio - mejor.precio);
    const tendTxt = ten.dir === 'sube' ? '📈 subió <b>' + ten.pct + '%</b> respecto a la medición anterior'
      : ten.dir === 'baja' ? '📉 bajó <b>' + Math.abs(ten.pct) + '%</b>' : 'sin variación relevante';
    return {
      tipo: 'compras-producto',
      html: '<p><b>' + U.esc(pr.nombre) + '</b>' + (pr.marca ? ' · ' + U.esc(pr.marca) : '') +
        ' <span class="muted">(' + U.esc(pr.unidad) + ')</span></p>' +
        '<table class="datos"><thead><tr><th>Tienda</th><th class="num">Precio</th><th>Medido</th><th>Promo</th></tr></thead>' +
        '<tbody>' + filas + '</tbody></table>' +
        '<p>✅ Más barato en <b>' + U.esc(mejor.tienda) + '</b> (' + M(mejor.precio) + ') · más caro en <b>' +
        U.esc(peor.tienda) + '</b> (' + M(peor.precio) + ').' +
        ' Diferencia: <b>' + M(ahorro) + '</b>' + (mejor.precio ? ' (' + U.round2((ahorro / mejor.precio) * 100) + '%)' : '') + '.</p>' +
        '<p class="muted">Tendencia: ' + tendTxt + '.</p>'
    };
  }

  function respuestaCanasta(p) {
    const cc = C.compararCanasta(p);
    if (!cc) return { tipo: 'compras', html: '<p>No hay precios registrados todavía.</p>' };
    const totalProds = C.productos(p).length;
    const filas = cc.lista.map((x, i) =>
      '<tr' + (i === 0 ? ' style="font-weight:700"' : '') + '><td>' + U.esc(x.tienda.nombre) + '</td>' +
      '<td class="num">' + x.hay + '/' + totalProds + '</td>' +
      '<td class="num">' + M(x.total) + '</td>' +
      '<td class="num">' + (i === 0 ? '✅ mejor' : '+' + M(U.round2(x.total - cc.lista[0].total))) + '</td></tr>').join('');
    const fuera = (cc.fueraRanking || []).length
      ? '<p class="muted">Fuera del ranking de canasta (cubren menos del 60% del catálogo): ' +
      cc.fueraRanking.map(t => U.esc(t.nombre)).join(', ') + '. Sus precios sí aparecen por producto.</p>'
      : '';
    return {
      tipo: 'compras-canasta',
      html: '<p><b>Comparativo de canasta</b> · ' + cc.nComunes + ' producto(s) que venden todas las tiendas ' +
        'de ' + totalProds + ' del catálogo:</p>' +
        '<table class="datos"><thead><tr><th>Tienda</th><th class="num">Cobertura</th><th class="num">Total</th><th class="num">Diferencia</th></tr></thead>' +
        '<tbody>' + filas + '</tbody></table>' +
        '<p>Mejor opción por separado (cada producto en su tienda más barata): <b>' + M(cc.ideal.total) + '</b>.</p>' +
        '<p>💡 Ahorrás <b>' + M(cc.ahorro) + '</b> comprando en la más barata en vez de ' +
        U.esc(cc.peor.tienda.nombre) + ', o <b>' + M(cc.ahorroVsMejor) + '</b> si mezclás por producto.</p>' + fuera
    };
  }

  function respuestaTienda(p) {
    const cc = C.compararCanasta(p);
    if (!cc) return { tipo: 'compras', html: '<p>Sin datos de precios.</p>' };
    const mejores = {};
    C.productos(p).forEach(pr => {
      const m = C.mejorPrecio(p, pr.id);
      if (m) mejores[m.tienda] = (mejores[m.tienda] || 0) + 1;
    });
    const ranking = Object.keys(mejores).map(k => ({ t: k, n: mejores[k] })).sort((a, b) => b.n - a.n);
    return {
      tipo: 'compras-tienda',
      html: '<p>🏆 <b>' + U.esc(cc.mejor.tienda.nombre) + '</b> tiene la canasta más barata (' + M(cc.mejor.total) +
        ').</p><p>Ganadora por producto:</p><ul>' +
        ranking.slice(0, 5).map(x => '<li><b>' + U.esc(x.t) + '</b>: ' + x.n + ' producto(s) más baratos</li>').join('') +
        '</ul><p class="muted">Conviene revisar por producto: comprando mixto llegás a ' + M(cc.ideal.total) + '.</p>'
    };
  }

  function respuestaPromos(p) {
    const promos = C.promociones(p);
    if (!promos.length) return { tipo: 'compras', html: '<p>No hay promociones vigentes registradas.</p>' };
    return {
      tipo: 'compras-promo',
      html: '<p>🏷 <b>Promociones vigentes</b>:</p><ul>' +
        promos.map(x => '<li><b>' + U.esc(x.producto.nombre) + '</b>' +
          (x.producto.marca ? ' · ' + U.esc(x.producto.marca) : '') + ' en <b>' + U.esc(x.tienda.nombre) +
          '</b> — ' + M(x.reg.precio) + ' (hasta ' + U.esc((x.reg.promo && x.reg.promo.hasta) || '') + ')</li>').join('') +
        '</ul>'
    };
  }

  function respuestaConsumo(p, pr) {
    const iv = C.intervalo(p, pr.id);
    if (!iv.n) return { tipo: 'compras', html: '<p>Aún no registré compras de <b>' + U.esc(pr.nombre) + '</b>.</p>' };
    const mejor = C.mejorPrecio(p, pr.id);
    return {
      tipo: 'compras-consumo',
      html: '<p><b>' + U.esc(pr.nombre) + '</b> · consumo del hogar:</p><ul>' +
        '<li>Comprado <b>' + iv.n + ' vez(es)</b>' + (iv.media ? ' cada <b>' + iv.media + ' días</b> en promedio' : '') + '</li>' +
        (iv.vecesMes ? '<li>≈ <b>' + iv.vecesMes + ' veces al mes</b> (' + iv.vecesSemana + ' por semana)</li>' : '') +
        '<li>Última compra: <b>' + iv.ultima + '</b> (hace ' + iv.diasDesde + ' días)</li>' +
        (iv.proxima ? '<li>Próxima compra sugerida: <b>' + iv.proxima + '</b> → ' +
          (iv.estado === 'recomprar' ? '🔴 ya toca' : iv.estado === 'pronto' ? '🟡 pronto' : '🟢 aún dura') + '</li>' : '') +
        '<li>Gastado en total: <b>' + M(iv.gastoTotal) + '</b></li></ul>' +
        (mejor ? '<p class="muted">Lo más barato hoy: ' + M(mejor.precio) + ' en ' + U.esc(mejor.tienda) + '.</p>' : '')
    };
  }

  function respuestaRecomprar(p) {
    const lista = C.porRecomprar(p).slice(0, 8);
    if (!lista.length) return { tipo: 'compras', html: '<p>👌 No hay productos próximos a recomprar.</p>' };
    return {
      tipo: 'compras-recomprar',
      html: '<p>🛒 <b>Lista de compras sugerida</b> (según tu consumo):</p><ul>' +
        lista.map(x => '<li><b>' + U.esc(x.producto.nombre) + '</b> — último ' + x.intervalo.ultima +
          ', dura ~' + x.intervalo.duracion + ' días → <b>' + x.intervalo.proxima + '</b>' +
          (x.intervalo.estado === 'recomprar' ? ' 🔴' : ' 🟡') + '</li>').join('') +
        '</ul>'
    };
  }

  function respuestaResumen(p) {
    const st = C.estadisticas(p);
    const alertas = C.alertas(p);
    return {
      tipo: 'compras-resumen',
      html: '<p>📊 <b>Compras de ' + U.mesLargo(st.mes) + '</b></p><ul>' +
        '<li>Total: <b>' + M(st.total) + '</b> en ' + st.n + ' boleta(s) (ticket promedio ' + M(st.ticket) + ')</li>' +
        '<li>Es el <b>' + st.share + '%</b> de los egresos del hogar (' + M(st.egresosHogar) + ')</li>' +
        (st.peorTienda ? '<li>Mayor gasto: <b>' + U.esc(st.peorTienda.nombre) + '</b> (' + M(st.peorTienda.total) + ')</li>' : '') +
        (st.mejorTienda ? '<li>Menor gasto: ' + U.esc(st.mejorTienda.nombre) + ' (' + M(st.mejorTienda.total) + ')</li>' : '') +
        '</ul>' +
        (st.porProductos.length ? '<p><b>Productos que más pesan:</b></p><ol>' +
          st.porProductos.slice(0, 5).map(x => '<li>' + U.esc(x.nombre) + ' — ' + M(x.total) + '</li>').join('') + '</ol>' : '') +
        (st.porCategoria.length ? '<p><b>Por categoría:</b> ' +
          st.porCategoria.slice(0, 5).map(x => U.esc(x.nombre) + ' ' + M(x.total)).join(' · ') + '</p>' : '') +
        (alertas.length ? '<p class="muted">' + alertas.length + ' alerta(s) activa(s) de compra.</p>' : '')
    };
  }

  /* --- registrar desde el chat --- */
  function accionAgregar(p, texto, q) {
    const Auth = global.App && global.App.Auth;
    if (Auth && Auth.esDemo()) return { tipo: 'compras', html: '<p>🔒 Modo demo: no puedo registrar productos.</p>' };

    /* formato: agregar <nombre> [marca X] [a N] [en tienda] */
    const m = texto.match(/(?:agregar|aniadir|adicionar|registrar)\s+(?:producto\s+|viver(?:e|es)?\s+)?(.+)$/i);
    if (!m) return null;
    let resto = m[1].trim();
    const precioM = resto.match(/\b(?:a|a precio de|a \$|en)\s*\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:en|,)?\s*(.*)$/i);
    let precio = null, tiendaNombre = '';
    if (precioM && /\d/.test(precioM[1])) {
      precio = parseFloat(precioM[1].replace(',', '.'));
      resto = resto.replace(precioM[0], '').trim();
      tiendaNombre = (precioM[2] || '').trim();
    }
    const enM = resto.match(/\ben\s+(.+)$/i);
    if (enM) { tiendaNombre = tiendaNombre || enM[1].trim(); resto = resto.replace(enM[0], '').trim(); }
    const marcaM = resto.match(/\b(?:marca\s+)?([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ]+)*)$/);
    let nombre = resto, marca = '';
    if (marcaM && resto.indexOf(' ') > 0) { marca = marcaM[1].trim(); nombre = resto.replace(marcaM[0], '').trim(); }
    if (!nombre) nombre = resto;
    if (!nombre) return null;

    const pr = C.crearProducto(p, { nombre: nombre, marca: marca, categoria: 'Víveres', unidad: 'und' });
    let tienda = tiendaNombre ? buscarTienda(p, tiendaNombre) : null;
    if (!tienda) tienda = C.tiendas(p)[0] || C.crearTienda(p, { nombre: 'Tienda' });
    let precioUsado = precio;
    if (precioUsado === null) precioUsado = 0;
    if (precioUsado > 0) C.registrarPrecio(p, { productoId: pr.id, tiendaId: tienda.id, precio: precioUsado, fecha: hoy() });

    return {
      tipo: 'compras-accion', html: '✅ Registré <b>' + U.esc(pr.nombre) + '</b>' +
        (marca ? ' · ' + U.esc(marca) : '') +
        (precioUsado ? ' a <b>' + M(precioUsado) + '</b> en <b>' + U.esc(tienda.nombre) + '</b>' : ' (sin precio; cargalo desde Catálogo → Precio') +
        '). Ya está en el comparador.'
    };
  }

  function accionPrecio(p, texto, q) {
    const Auth = global.App && global.App.Auth;
    if (Auth && Auth.esDemo()) return { tipo: 'compras', html: '<p>🔒 Modo demo: no puedo modificar precios.</p>' };
    const pr = buscarProducto(p, texto);
    const tienda = C.tiendas(p).find(t => q.indexOf(norm(t.nombre)) >= 0);
    const num = texto.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:usd|\$)?/);
    if (!pr || !tienda || !num) return null;
    const precio = parseFloat(num[1].replace(',', '.'));
    C.actualizarPrecio(p, pr.id, tienda.id, precio, hoy());
    return {
      tipo: 'compras-accion',
      html: '✅ Actualicé el precio de <b>' + U.esc(pr.nombre) + '</b> en <b>' + U.esc(tienda.nombre) +
        '</b> a <b>' + M(precio) + '</b> (' + hoy() + ').'
    };
  }

  /* ============================================================
     7. SEMILLA DEMO (basada en los supermercados del usuario)
     ============================================================ */
  C.semilla = function (p) {
    const c = C.asegurar(p);
    if (c.productos.length || c.tiendas.length) return false;

    const tiendasBase = [
      ['Aki', 'supermercado', '#DC2626', 1.00],
      ['Mi Comisariato', 'supermercado', '#2563EB', 1.06],
      ['Tuti', 'supermercado', '#16A34A', 0.95],
      ['Tía', 'supermercado', '#F97316', 1.10],
      ['Mercado La Kennedy', 'mercado', '#7C3AED', 0.90],
      ['Tienda de la esquina', 'tienda', '#0EA5E9', 1.14],
      ['Carnicería Don José', 'carniceria', '#DB2777', 1.03]
    ];
    const IDS = ['t_aki', 't_mic', 't_tuti', 't_tia', 't_merc', 't_tienda', 't_carn'];
    const tiendas = tiendasBase.map((x, i) => {
      const t = C.crearTienda(p, { nombre: x[0], tipo: x[1], color: x[2] });
      t.id = IDS[i] || t.id;
      t._f = x[3];
      return t;
    });

    /* [nombre, marca, categoría, unidad, precio base, tiendas donde se vende (índice)] */
    const catBase = [
      ['Arroz', 'La Espiga', 'Víveres', 'kg', 1.15, [0, 1, 2, 3, 4, 5]],
      ['Aceite de palma', 'Chef', 'Víveres', 'lt', 3.25, [0, 1, 2, 3, 4, 5]],
      ['Azúcar', 'La Espiga', 'Víveres', 'kg', 1.05, [0, 1, 2, 3, 4, 5]],
      ['Huevos AA', 'Granja Real', 'Lácteos', 'docena', 2.35, [0, 1, 2, 3, 4, 5, 6]],
      ['Leche entera', 'Nido', 'Lácteos', 'lt', 1.19, [0, 1, 2, 3, 4, 5, 6]],
      ['Pan tajado', 'Bimbo', 'Víveres', 'paq', 1.65, [0, 1, 2, 3, 4, 5, 6]],
      ['Pollo entero', 'Frescos', 'Carnes', 'kg', 2.79, [0, 1, 2, 3, 4, 6]],
      ['Lomo de res', 'Frescos', 'Carnes', 'kg', 6.90, [0, 1, 2, 3, 6]],
      ['Tomate', 'A granel', 'Frutas y verduras', 'kg', 1.35, [0, 1, 2, 3, 4, 6]],
      ['Cebolla', 'A granel', 'Frutas y verduras', 'kg', 1.10, [0, 1, 2, 3, 4, 6]],
      ['Detergente en polvo', 'Fab', 'Aseo y limpieza', 'paq', 4.25, [0, 1, 2, 3, 5]],
      ['Papel higiénico', 'Regia', 'Aseo y limpieza', 'paq', 3.99, [0, 1, 2, 3, 5]],
      ['Leche en polvo infantil', 'Nan', 'Bebé', 'lata', 8.95, [0, 1, 2, 3, 5]],
      ['Pañales talla M', 'Huggies', 'Bebé', 'paq', 6.45, [0, 1, 2, 3, 5]],
      ['Agua mineral', 'Cristal', 'Bebidas', 'lt', 0.45, [0, 1, 2, 3, 4, 5, 6]],
      ['Café molido', 'La Colorado', 'Víveres', 'paq', 3.10, [0, 1, 2, 3, 4, 5]]
    ];

    /* variación de temporada: tres mediciones */
    const fechas = [hace(96), hace(58), hace(19)];
    const estacion = [1.00, 1.045, 1.09];

    catBase.forEach((x, i) => {
      const pr = {
        id: uid('pro'), nombre: x[0], marca: x[1], categoria: x[2],
        unidad: x[3], presentacion: '', notas: ''
      };
      c.productos.push(pr);
      x[5].forEach(k => {
        const t = tiendas[k];
        if (!t) return;
        /* jitter determinista para que no siempre gan la misma tienda */
        const j = ((i * 7 + k * 13) % 11 - 5) / 100; /* -0.05 .. +0.05 */
        fechas.forEach((f, fi) => {
          const factor = t._f * (1 + j) * estacion[fi];
          C.registrarPrecio(p, {
            productoId: pr.id, tiendaId: t.id,
            precio: Math.max(0.25, r2(x[4] * factor)),
            fecha: f,
            promo: (fi === 2 && (i + k) % 9 === 0) ? { hasta: hace(-20), texto: 'Oferta de temporada' } : null
          });
        });
      });
    });

    /* boletas de ejemplo (últimas 7 semanas) */
    const patron = [
      [52, 't_tuti', [0, 1, 2, 3, 4, 5, 15]],
      [45, 't_tia', [10, 11, 6, 7, 8, 9]],
      [37, 't_merc', [6, 7, 8, 9, 0, 12]],
      [30, 't_aki', [0, 1, 2, 5, 13, 14, 15]],
      [23, 't_tuti', [3, 4, 5, 10, 11, 14]],
      [16, 't_mic', [12, 13, 1, 10, 0]],
      [11, 't_merc', [6, 7, 8, 9, 3]],
      [6, 't_aki', [0, 1, 2, 4, 5, 11, 15]],
      [3, 't_tuti', [3, 5, 13, 14]]
    ];

    patron.forEach(x => {
      const fecha = hace(x[0]);
      const tid = tiendas.find(t => t.id === x[1]) || tiendas[0];
      const lineas = x[2].map(idx => {
        const pr = c.productos[idx];
        const reg = C.precioVigente(p, pr.id, tid.id, fecha);
        const cantidad = pr.unidad === 'kg' ? (idx % 2 ? 1 : 2) : (idx % 5 === 0 ? 2 : 1);
        if (!reg) return null;
        return { productoId: pr.id, cantidad: cantidad, unidad: pr.unidad, precioUnit: reg.precio, subtotal: r2(cantidad * reg.precio) };
      }).filter(Boolean);
      if (!lineas.length) return;
      const b = { id: uid('bol'), fecha: fecha, tiendaId: tid.id, nota: '', lineas: lineas, egresoId: null };
      b.total = C.totalBoleta(b);
      b.creada = fecha + 'T12:00:00.000Z';
      c.boletas.push(b);
      C.vincularEgreso(p, b);
    });

    tiendas.forEach(t => delete t._f);
    return true;
  };
})(window);
