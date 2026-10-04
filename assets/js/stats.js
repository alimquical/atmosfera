/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — stats.js
   Estadística descriptiva y análisis cuantitativo.
   ============================================================ */
(function (global) {
  'use strict';

  const U = global.Util;
  const S = {};

  /* ---------- fundamentos ---------- */
  S.n = function (arr) { return arr.length; };
  S.suma = function (arr) { return U.sum(arr); };
  S.media = function (arr) {
    if (!arr.length) return 0;
    return U.round2(U.sum(arr) / arr.length);
  };

  S.ordena = function (arr) {
    return arr.slice().map(Number).sort((a, b) => a - b);
  };

  S.mediana = function (arr) {
    if (!arr.length) return 0;
    const a = S.ordena(arr), m = Math.floor(a.length / 2);
    return U.round2(a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2);
  };

  S.moda = function (arr) {
    if (!arr.length) return null;
    const frec = {};
    arr.forEach(v => { const k = String(v); frec[k] = (frec[k] || 0) + 1; });
    let mejor = null, max = 0;
    Object.keys(frec).forEach(k => {
      if (frec[k] > max) { max = frec[k]; mejor = k; }
    });
    const esUnico = Object.keys(frec).filter(k => frec[k] === max).length === arr.length;
    return {
      valor: esUnico && arr.length > 1 ? null : Number(mejor),
      frecuencia: max,
      sinModa: esUnico && arr.length > 1
    };
  };

  S.modaNombres = function (pares) {
    // pares: [{etiqueta, valor}] -> moda por frecuencia de etiqueta
    const frec = {};
    pares.forEach(x => { frec[x.etiqueta] = (frec[x.etiqueta] || 0) + 1; });
    let mejor = null, max = 0;
    Object.keys(frec).forEach(k => { if (frec[k] > max) { max = frec[k]; mejor = k; } });
    return mejor;
  };

  S.varianza = function (arr, muestral) {
    if (arr.length < 2) return 0;
    const m = U.sum(arr) / arr.length;
    const sq = arr.reduce((a, v) => a + Math.pow(v - m, 2), 0);
    return sq / (arr.length - (muestral === false ? 0 : 1));
  };

  S.desviacion = function (arr) { return Math.sqrt(S.varianza(arr)); };

  S.rango = function (arr) {
    if (!arr.length) return 0;
    return Math.max.apply(null, arr) - Math.min.apply(null, arr);
  };

  S.min = function (arr) { return arr.length ? Math.min.apply(null, arr) : 0; };
  S.max = function (arr) { return arr.length ? Math.max.apply(null, arr) : 0; };

  S.percentil = function (arr, p) {
    if (!arr.length) return 0;
    const a = S.ordena(arr);
    const k = (a.length - 1) * (p / 100);
    const f = Math.floor(k), c = Math.ceil(k);
    if (f === c) return U.round2(a[f]);
    return U.round2(a[f] + (k - f) * (a[c] - a[f]));
  };

  S.cuartiles = function (arr) {
    return {
      min: S.min(arr),
      q1: S.percentil(arr, 25),
      mediana: S.mediana(arr),
      q3: S.percentil(arr, 75),
      max: S.max(arr),
      ric: U.round2(S.percentil(arr, 75) - S.percentil(arr, 25))
    };
  };

  /* Coeficiente de variación (%) */
  S.cv = function (arr) {
    const m = S.media(arr);
    if (!m) return 0;
    return (S.desviacion(arr) / Math.abs(m)) * 100;
  };

  /* Asimetría de Fisher-Pearson (sesgo) */
  S.sesgo = function (arr) {
    const n = arr.length;
    if (n < 3) return 0;
    const m = U.sum(arr) / n;
    const s = Math.sqrt(U.sum(arr.map(v => Math.pow(v - m, 2))) / n);
    if (!s) return 0;
    return (n / ((n - 1) * (n - 2))) * U.sum(arr.map(v => Math.pow((v - m) / s, 3)));
  };

  /* Curtosis (apuntamiento) */
  S.curtosis = function (arr) {
    const n = arr.length;
    if (n < 4) return 0;
    const m = U.sum(arr) / n;
    const s = Math.sqrt(U.sum(arr.map(v => Math.pow(v - m, 2))) / n);
    if (!s) return 0;
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) *
      U.sum(arr.map(v => Math.pow((v - m) / s, 4))) -
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  };

  /* Desviación media absoluta */
  S.desvMediaAbs = function (arr) {
    if (!arr.length) return 0;
    const m = U.sum(arr) / arr.length;
    return U.round2(U.sum(arr.map(v => Math.abs(v - m))) / arr.length);
  };

  /* Cuántos valores son atípicos (rango intercuartílico) */
  S.atipicos = function (arr) {
    const q = S.cuartiles(arr);
    const li = q.q1 - 1.5 * q.ric;
    const ls = q.q3 + 1.5 * q.ric;
    return arr.filter(v => v < li || v > ls);
  };

  /* Correlación de Pearson entre dos series */
  S.correlacion = function (a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    const ma = U.sum(a) / n, mb = U.sum(b) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      num += (a[i] - ma) * (b[i] - mb);
      da += Math.pow(a[i] - ma, 2);
      db += Math.pow(b[i] - mb, 2);
    }
    if (!da || !db) return 0;
    return num / Math.sqrt(da * db);
  };

  /* Pendiente de regresión lineal mínimos cuadrados */
  S.tendencia = function (arr) {
    const n = arr.length;
    if (n < 2) return 0;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    arr.forEach((y, x) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
    const den = n * sxx - sx * sx;
    if (!den) return 0;
    return (n * sxy - sx * sy) / den;
  };

  /* ============================================================
     Informe estadístico completo de una serie
     ============================================================ */
  S.perfil = function (arr, decimales) {
    const d = decimales === undefined ? 2 : decimales;
    const a = (arr || []).map(Number).filter(v => isFinite(v));
    if (!a.length) {
      return { n: 0, vacio: true };
    }
    const c = S.cuartiles(a);
    const moda = S.moda(a);
    const red = v => U.round2(v);
    return {
      vacio: false,
      n: a.length,
      suma: red(U.sum(a)),
      media: red(U.sum(a) / a.length),
      mediana: S.mediana(a),
      moda: moda,
      min: red(S.min(a)),
      max: red(S.max(a)),
      rango: red(S.rango(a)),
      q1: c.q1, q3: c.q3, ric: c.ric,
      p10: S.percentil(a, 10),
      p90: S.percentil(a, 90),
      varianza: red(S.varianza(a)),
      desviacion: red(S.desviacion(a)),
      cv: U.round2(S.cv(a)),
      sesgo: U.round2(S.sesgo(a)),
      curtosis: U.round2(S.curtosis(a)),
      desvMediaAbs: S.desvMediaAbs(a),
      atipicos: S.atipicos(a).map(red),
      nAtipicos: S.atipicos(a).length
    };
  };

  /* ============================================================
     Estadísticas del proyecto
     ============================================================ */
  S.analizarProyecto = function (p, mes) {
    const E = global.AfEngine;
    mes = mes || E.mesActivo(p);
    const egresos = E.egresosDe(p, mes);
    const ingresos = E.ingresosDe(p, mes);
    const movs = E.movimientosDe(p, mes);

    const valoresEgreso = egresos.map(e => U.n(e.valor));
    const valoresIngreso = ingresos.map(e => U.n(e.valor));
    const montosMov = movs.map(m => Math.abs(U.n(m.cantidad)));

    // Cuotas por persona
    const bp = E.balancePersonas(p, mes);
    const personas = E.personasActivas(p);
    const cuotasPorPersona = personas.map(x => ({
      etiqueta: x.nombre,
      valor: bp[x.id] ? bp[x.id].debe : 0
    }));

    // Gastos por categoría
    const porCat = E.resumen(p, mes).porCategoria;
    const gastosPorCategoria = Object.keys(porCat).map(k => ({ etiqueta: k, valor: porCat[k] }))
      .sort((a, b) => b.valor - a.valor);

    // Serie mensual (12 meses)
    const serie = E.serieMensual(p, 12);
    const serieEgresos = serie.map(s => s.egresos);
    const serieIngresos = serie.map(s => s.ingresos);
    const serieBalance = serie.map(s => s.balance);

    return {
      mes: mes,
      egresos: S.perfil(valoresEgreso),
      ingresos: S.perfil(valoresIngreso),
      movimientos: S.perfil(montosMov),
      cuotas: S.perfil(cuotasPorPersona.map(x => x.valor)),
      categorias: gastosPorCategoria,
      cuotasPorPersona: cuotasPorPersona,
      serie: serie,
      tendenciaEgresos: U.round2(S.tendencia(serieEgresos)),
      tendenciaIngresos: U.round2(S.tendencia(serieIngresos)),
      correlacionIngEgr: U.round2(S.correlacion(serieIngresos, serieEgresos)),
      variacionMensual: serie.length > 1 && serieEgresos[0] > 0
        ? U.round2((serieEgresos[serieEgresos.length - 1] - serieEgresos[0]) / serieEgresos[0] * 100)
        : 0,
      concentracion: (function () {
        const tot = U.sum(gastosPorCategoria, x => x.valor);
        if (!tot) return { top1: 0, top3: 0, hhi: 0 };
        const ps = gastosPorCategoria.map(x => x.valor / tot);
        const top1 = ps[0] || 0;
        const top3 = ps.slice(0, 3).reduce((a, b) => a + b, 0);
        const hhi = U.round2(ps.reduce((a, v) => a + v * v, 0) * 10000);
        return { top1: U.round2(top1), top3: U.round2(top3), hhi: hhi };
      })()
    };
  };

  global.AfStats = S;
})(window);
