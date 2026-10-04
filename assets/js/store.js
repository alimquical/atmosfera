/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — store.js
   Persistencia local (localStorage), CRUD de proyectos e
   importación/exportación de datos.
   ============================================================ */
(function (global) {
  'use strict';

  const U = global.Util;
  const E = global.AfEngine;
  const K_LISTA = 'afh.proyectos.v1';
  const K_ACTUAL = 'afh.proyecto.activo.v1';

  const Store = {};
  let cache = null;

  /* ---------- lectura/escritura ---------- */
  function leer() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(K_LISTA);
      cache = raw ? JSON.parse(raw) : {};
    } catch (e) { cache = {}; }
    return cache;
  }

  function escribir() {
    try {
      localStorage.setItem(K_LISTA, JSON.stringify(cache));
    } catch (e) {
      console.error('No se pudo guardar', e);
      Store.errorAlmacen = 'Almacenamiento lleno o bloqueado. Exporta tus datos.';
    }
  }

  Store.listar = function () {
    const c = leer();
    return Object.keys(c).map(k => ({
      id: k,
      nombre: c[k].nombre,
      propietario: c[k].propietario,
      personas: (c[k].personas || []).length,
      actualizado: c[k].actualizado,
      fechaCreacion: c[k].fechaCreacion,
      mesActivo: (c[k].config && c[k].config.mesActivo) || ''
    })).sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));
  };

  Store.get = function (id) {
    const c = leer();
    return c[id] || null;
  };

  Store.guardar = function (proyecto) {
    const c = leer();
    proyecto.actualizado = new Date().toISOString();
    c[proyecto.id] = proyecto;
    escribir();
    return proyecto;
  };

  Store.eliminar = function (id) {
    const c = leer();
    delete c[id];
    escribir();
    if (Store.actual() === id) {
      const resto = Object.keys(c);
      Store.setActual(resto[0] || null);
    }
  };

  Store.actual = function () {
    let id = null;
    try { id = localStorage.getItem(K_ACTUAL); } catch (e) { }
    if (!id) id = Store._activo || null;
    const c = leer();
    if (id && c[id]) return id;
    const lista = Object.keys(c);
    return lista[0] || null;
  };

  Store.setActual = function (id) {
    try {
      if (id) localStorage.setItem(K_ACTUAL, id);
      else localStorage.removeItem(K_ACTUAL);
    } catch (e) { }
    Store._activo = id;
  };

  Store.proyectoActivo = function () {
    const id = Store.actual();
    return id ? Store.get(id) : null;
  };

  Store.mutado = function () {
    const p = Store.proyectoActivo();
    if (p) Store.guardar(p);
  };

  /* ============================================================
     CREAR PROYECTO (nuevo hogar / nueva "atmósfera")
     ============================================================ */
  Store.crear = function (datos) {
    const d = datos || {};
    const id = U.uid('proj');
    const mes = d.mesActivo || U.mesActual();
    const personas = (d.personas && d.personas.length ? d.personas : [{ nombre: 'Miembro 1', ingreso: 0 }])
      .map((x, i) => ({
        id: U.uid('per'),
        nombre: x.nombre || ('Miembro ' + (i + 1)),
        ingreso: U.n(x.ingreso),
        rol: x.rol || '',
        color: x.color || Store.colorPersona(i),
        activo: true,
        notas: ''
      }));

    const p = {
      id: id,
      nombre: d.nombre || 'Nuevo hogar',
      propietario: d.propietario || '',
      direccion: d.direccion || '',
      ciudad: d.ciudad || '',
      pais: d.pais || 'Ecuador',
      moneda: d.moneda || 'USD',
      fechaCreacion: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      notas: d.notas || '',
      config: {
        mesActivo: mes,
        estrategiaGlobal: d.estrategiaGlobal || 'proporcional',
        porcentajes: {},
        alertasActivas: true
      },
      personas: personas,
      categoriasEgreso: d.categoriasEgreso ? d.categoriasEgreso.slice() : E.CATEGORIAS_EGRESO.slice(),
      categoriasIngreso: d.categoriasIngreso ? d.categoriasIngreso.slice() : E.CATEGORIAS_INGRESO.slice(),
      categoriasMov: d.categoriasMov ? d.categoriasMov.slice() : E.CATEGORIAS_MOV.slice(),
      metodos: E.METODOS.slice(),
      egresos: [],
      ingresos: [],
      movimientos: [],
      historial: []
    };

    // Porcentajes iniciales equilibrados
    p.config.porcentajes = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);

    if (d.copiarEgresos) p.egresos = d.copiarEgresos;
    if (d.copiarIngresos) p.ingresos = d.copiarIngresos;

    Store.guardar(p);
    Store.setActual(p.id);
    return p;
  };

  Store.colorPersona = function (i) {
    const paleta = ['#3B82F6', '#F97316', '#10B981', '#EAB308', '#EF4444',
      '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F59E0B'];
    return paleta[i % paleta.length];
  };

  /* Duplicar proyecto existente (para vender la idea a otros hogares) */
  Store.duplicar = function (id) {
    const src = Store.get(id);
    if (!src) return null;
    const copia = U.clona(src);
    copia.id = U.uid('proj');
    copia.nombre = src.nombre + ' (copia)';
    copia.fechaCreacion = new Date().toISOString();
    copia.personas.forEach(x => x.id = U.uid('per'));
    // reasignar referencias de persona
    const mapa = {};
    src.personas.forEach((x, i) => mapa[x.id] = copia.personas[i].id);
    copia.egresos.forEach(e => {
      if (e.distribucion) {
        const nd = {};
        Object.keys(e.distribucion).forEach(k => { if (mapa[k]) nd[mapa[k]] = e.distribucion[k]; });
        e.distribucion = nd;
      }
      if (e.pagos) e.pagos.forEach(pg => { if (mapa[pg.personaId]) pg.personaId = mapa[pg.personaId]; });
    });
    copia.ingresos.forEach(e => { if (e.personaId && mapa[e.personaId]) e.personaId = mapa[e.personaId]; });
    const np = {};
    Object.keys(copia.config.porcentajes || {}).forEach(k => {
      if (mapa[k]) np[mapa[k]] = copia.config.porcentajes[k];
    });
    copia.config.porcentajes = np;
    Store.guardar(copia);
    return copia;
  };

  /* ============================================================
     IMPORTAR / EXPORTAR
     ============================================================ */
  Store.exportarJSON = function (id) {
    const p = Store.get(id);
    if (!p) return null;
    return JSON.stringify({ formato: 'ATMOSFERA-FH', version: 1, proyecto: p }, null, 2);
  };

  Store.importarJSON = function (texto) {
    const obj = JSON.parse(texto);
    const p = obj.proyecto || obj;
    if (!p || !p.personas) throw new Error('El archivo no parece un proyecto válido.');
    p.id = U.uid('proj');
    p.actualizado = new Date().toISOString();
    if (!p.fechaCreacion) p.fechaCreacion = p.actualizado;
    Store.guardar(p);
    return p;
  };

  Store.descargarJSON = function (id) {
    const txt = Store.exportarJSON(id);
    if (!txt) return;
    const p = Store.get(id);
    U.descargar(txt, U.slug(p.nombre) + '.afh.json', 'application/json');
  };

  /* ============================================================
     SERIALIZACIÓN COMPLETA (para la nube / Google Drive)
     ============================================================ */
  Store.serializarTodo = function () {
    const c = leer();
    const Auth = global.App && global.App.Auth;
    return JSON.stringify({
      formato: 'ATMOSFERA-FH-NUBE',
      version: 2,
      sincronizado: new Date().toISOString(),
      activo: Store.actual(),
      usuarios: Auth ? Auth.serializar() : [],
      proyectos: c
    });
  };

  Store.restaurarTodo = function (texto) {
    const obj = typeof texto === 'string' ? JSON.parse(texto) : (texto || {});
    const pr = obj.proyectos || {};
    const n = Object.keys(pr).length;
    if (!n) throw new Error('La copia en la nube no contiene proyectos.');
    const Auth = global.App && global.App.Auth;
    if (Auth && obj.usuarios && obj.usuarios.length) Auth.restaurar(obj.usuarios);
    cache = pr;
    escribir();
    Store.setActual(obj.activo && pr[obj.activo] ? obj.activo : Object.keys(pr)[0]);
    return n;
  };

  /* Exporta a una carpeta elegida por el usuario (File System Access API). */
  Store.exportarACarpeta = async function (id, archivos) {
    if (!window.showDirectoryPicker) return { ok: false, razon: 'nosoportado' };
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    const sub = await dir.getDirectoryHandle(U.slug(Store.get(id).nombre), { create: true });
    for (const f of archivos) {
      const fh = await sub.getFileHandle(f.nombre, { create: true });
      const w = await fh.createWritable();
      await w.write(f.contenido);
      await w.close();
    }
    return { ok: true, ruta: sub.name, carpetas: archivos.length };
  };

  /* ============================================================
     SEED: proyecto de demostración basado en los Excel originales
     ============================================================ */
  Store.crearDemo = function () {
    const p = Store.crear({
      nombre: 'Hogar de Miguel y Katherin',
      propietario: 'Miguel',
      ciudad: 'Quito',
      pais: 'Ecuador',
      moneda: 'USD',
      mesActivo: U.mesActual(),
      estrategiaGlobal: 'proporcional',
      personas: [
        { nombre: 'MIGUEL', ingreso: 1000000 / 100, rol: 'Principal' },
        { nombre: 'KATHERIN', ingreso: 600000 / 100, rol: 'Copartícipe' }
      ]
    });

    p.personas[0].ingreso = 1180;
    p.personas[1].ingreso = 760;
    p.config.porcentajes = E.porcentajesSugeridos(p, p.config.estrategiaGlobal);

    const mes = p.config.mesActivo;
    const egresosBase = [
      ['LUZ', 'Luz', 'fijo', 38.45, 5],
      ['PLAN TELEFONO', 'Internet y teléfono', 'fijo', 25.00, 7],
      ['INTERNET', 'Internet y teléfono', 'fijo', 32.00, 7],
      ['PACIFICARD', 'Deudas y tarjetas', 'deuda', 95.00, 10],
      ['AGUA', 'Agua', 'fijo', 18.60, 12],
      ['BCO GUAYAQUIL', 'Deudas y tarjetas', 'deuda', 210.00, 15],
      ['COMIDA MENSUAL', 'Alimentación', 'fijo', 420.00, 1],
      ['COMIDA DIARIA', 'Alimentación', 'variable', 240.00, 1],
      ['BCO PRODUBANCO', 'Deudas y tarjetas', 'deuda', 165.00, 18],
      ['GAS', 'Servicios públicos', 'fijo', 12.80, 8],
      ['DISCOVER', 'Deudas y tarjetas', 'deuda', 78.00, 20],
      ['MAESTRIA', 'Educación', 'fijo', 180.00, 22],
      ['CADENA', 'Deudas y tarjetas', 'deuda', 60.00, 25],
      ['AGUA POTABLE', 'Agua', 'fijo', 0, 12],
      ['TELEFONO CELULAR', 'Internet y teléfono', 'fijo', 15.00, 6],
      ['Transporte / combustible', 'Transporte', 'variable', 90.00, 3],
      ['Seguro', 'Seguros', 'fijo', 42.00, 14]
    ];

    p.egresos = egresosBase.map((x, i) => ({
      id: U.uid('egr'),
      mes: mes,
      detalle: x[0],
      categoria: x[1],
      tipoGasto: x[2],
      valor: x[3],
      dia: x[4],
      obligatorio: x[2] !== 'variable',
      modo: 'auto',
      distribucion: null,
      notas: '',
      pagos: []
    }));

    const ingresosBase = [
      ['TRABAJO', 1180, 'per0', 'Salario', 1],
      ['CADENA', 260, 'per0', 'Negocio propio', 10],
      ['MONTEPIO', 0, null, 'Préstamo recibido', 12],
      ['SEGURO', 0, null, 'Otros ingresos', 15],
      ['PRESTAMO', 0, null, 'Préstamo recibido', 20],
      ['EXTRA', 150, 'per1', 'Freelance / independiente', 24]
    ];

    p.ingresos = ingresosBase.map(x => ({
      id: U.uid('ing'),
      mes: mes,
      detalle: x[0],
      valor: x[1],
      personaId: x[2] === 'per0' ? p.personas[0].id : (x[2] === 'per1' ? p.personas[1].id : null),
      categoria: x[3],
      dia: x[4],
      lugar: 'Virtual',
      fecha: mes + '-' + String(x[4]).padStart(2, '0'),
      notas: ''
    }));

    /* ---- Movimientos (hoja FINANZAS.xlsx) ---- */
    const movs = [
      ['2021-12-30', 'Empresa', 'Salario', 300000, 'Ingreso', 'Virtual'],
      ['2022-01-03', 'Cuenta bancaria', 'Ahorro', 135000, 'Ingreso', 'Efectivo'],
      ['2022-01-06', 'Parqueadero', 'Vehículo', -12000, 'Egreso', 'Efectivo'],
      ['2022-01-15', 'Empresa', 'Salario', 300000, 'Ingreso', 'Virtual'],
      ['2022-01-16', 'Para amigo (cuota)', 'Otros gastos', -100000, 'Egreso', 'Virtual'],
      ['2022-01-18', 'Ropa', 'Compras', -88000, 'Egreso', 'Virtual'],
      ['2022-01-21', 'De idea 1', 'Otros ingresos', 11000, 'Ingreso', 'Efectivo'],
      ['2022-01-21', 'Salida con mi pareja', 'Entretenimiento', -45000, 'Egreso', 'Virtual'],
      ['2022-01-23', 'Cuenta bancaria', 'Ahorro', -80000, 'Egreso', 'Virtual'],
      ['2022-01-24', 'Mercado semanal', 'Supermercado', -75000, 'Egreso', 'Efectivo'],
      ['2022-01-30', 'Empresa', 'Salario', 300000, 'Ingreso', 'Virtual'],
      ['2022-02-01', 'Compra vehículo', 'Vehículo', 8500000, 'Ingreso', 'Efectivo'],
      ['2022-02-05', 'Arreglo tubería', 'Gastos casa', -45000, 'Egreso', 'Virtual'],
      ['2022-02-06', 'Impuesto predial', 'Impuestos', -230000, 'Egreso', 'Efectivo'],
      ['2022-02-07', 'Empresa', 'Salario', 1000000, 'Ingreso', 'Virtual'],
      ['2022-02-07', 'Empresa', 'Salario', -1000000, 'Ingreso', 'Virtual']
    ];
    p.movimientos = movs.map(m => ({
      id: U.uid('mov'),
      fecha: m[0], descripcion: m[1], categoria: m[2],
      cantidad: m[3], tipo: m[4], lugar: m[5]
    }));

    Store.guardar(p);
    Store.setActual(p.id);
    return p;
  };

  Store.asegurarDatos = function () {
    if (Store.listar().length === 0) Store.crearDemo();
    if (!Store.actual()) Store.setActual(Store.listar()[0].id);
  };

  Store.coloresPersonas = Store.colorPersona;

  global.AfStore = Store;
})(window);
